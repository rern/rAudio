<?php
/*
find, list, ls, search, track, webradio

Album
	/srv/http/data/mpd/album: album-artist^-file
	/srv/http/data/mpd/albumbyartist: artist-album-file
			track list: mpc ls -f %*% $path
Artist
	mpc list artist > /srv/http/data/mpd/artist
		album list: mpc find -f %artist%^^%album% artist $artist
			track list: mpc find -f %*% album $album artist $artist
AlbumArtist
	mpc list albumartist > /srv/http/data/mpd/albumartist
		album list: mpc find -f %albumartist%^^%album% albumartist $albumartist
			track list: mpc find -f %*% album $album albumartist $albumartist
Composer
	mpc list composer > /srv/http/data/mpd/composer
		album list: mpc find -f %composer%^^%album% composer $composer
			track list: mpc find -f %*% album $album composer $composer
Conductor
	mpc list conductor > /srv/http/data/mpd/conductor
		album list: mpc find -f %conductor%^^%album% conductor $conductor
			track list: mpc find -f %*% album $album conductor $conductor
Genre
	mpc list genre > /srv/http/data/mpd/genre
		artist-album list: mpc find -f %artist%^^%album% genre $genre
			track list: mpc find -f %*% album $album artist $artist
Date
	mpc list date > /srv/http/data/mpd/date
		artist-album list: mpc find -f %artist%^^%album% date $date
			track list: mpc find -f %*% album $album artist $artist
File
	mpc ls -f %file% $path
			track list: mpc ls -f %*% $path
search
			track list: mpc search -f %*% any $keyword
*/
include '/srv/http/bash/cmd-listsort.php';
include '/srv/http/indexbar.php';

$gmode = $_POST[ 'gmode' ] ?? null;
$mode = $_POST[ 'mode' ] ?? null;
$string = $_POST[ 'string' ] ?? null;
$string = escape( $string );
$formatall = [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'date', 'file', 'genre', 'time', 'title', 'track' ];
$f = $_POST[ 'format' ] ?? $formatall;
$format = '%'.implode( '%^^%', $f ).'%';

switch( $_POST[ 'query' ] ) {

case 'find':
	$format = str_replace( '%artist%', '[%artist%|%albumartist%]', $format );
	if ( is_array( $mode ) ) {
		exec( 'mpc -f %file% find '.$mode[ 0 ].' "'.$string[ 0 ].'" '.$mode[ 1 ].' "'.$string[ 1 ].'" 2> /dev/null'." | awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' | sort -u", $dirs );
		if ( count( $dirs ) > 1 ) {
			$array = directoryList( $dirs );
			break;
			
		} else {
			$file = $dirs[ 0 ];
			if ( substr( $file, -14, 4 ) !== '.cue' ) {
				exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" '.$mode[ 1 ].' "'.$string[ 1 ].'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
					, $lists );
				if ( !count( $lists ) ) { // find with albumartist
					exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" albumartist "'.$string[ 1 ].'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
					, $lists );
				}
			} else { // $file = '/path/to/file.cue/track0001'
				$format = '%'.implode( '%^^%', $f ).'%';
				exec( 'mpc -f "'.$format.'" playlist "'.dirname( $file ).'"'
						, $lists );
			}
		}
	} else {
		exec( 'mpc find -f "'.$format.'" '.$mode.' "'.$string.'" 2> /dev/null'." | awk 'NF && !a[$0]++'", $lists );
	}
	if ( count( $f ) > 2 ) {
		$array = htmlTracks( $lists, $f );
	} else { // modes - album, artist, albumartist, composer, conductor, genre: 2 fields format
		$array = htmlFind( $lists, $f );
	}
	break;
case 'list':
	$filemode = '/srv/http/data/mpd/'.$mode;
	if ( $mode === 'album' && exec( 'grep "albumbyartist.*true" /srv/http/data/system/display' ) ) $filemode.= 'byartist';
	$lists = file( $filemode, FILE_IGNORE_NEW_LINES );
	$array = htmlList( $lists );
	break;
case 'ls':
	if ( $mode !== 'album' ) {
		exec( 'mpc ls "'.$string.'"', $mpcls );
		foreach( $mpcls as $mpdpath ) {
			if ( is_dir( '/mnt/MPD/'.$mpdpath ) ) {
				$subdirs = 1;
				break;
			}
		}
	}
	if ( isset( $subdirs ) ) {
		exec( 'mpc ls -f %file% "'.$string.'" 2> /dev/null'
			, $lists );
		$count = count( $lists );
		if ( !$count ) exit( '-1' );
		
		$array = directoryList( $lists );
	} else {
		$f = $formatall; // set format for directory with files only - track list
		$format = '%'.implode( '%^^%', $f ).'%';
		// parse if cue|m3u,|pls files (sort -u: mpc ls list *.cue twice)
		exec( 'mpc ls "'.$string.'" | grep ".cue$\|.m3u$\|.m3u8$\|.pls$" | sort -u'
			, $plfiles );
		if ( count( $plfiles ) ) {
			asort( $plfiles );
			$path = explode( '.', $plfiles[ 0 ] );
			$ext = end( $path );
			$lists = [];
			foreach( $plfiles as $file ) {
				exec( 'mpc -f "'.$format.'" playlist "'.$file.'"'
					, $lists ); // exec appends to existing array
			}
			$array = htmlTracks( $lists, $f, $ext, $file );
		} else {
			exec( 'mpc ls -f "'.$format.'" "'.$string.'" 2> /dev/null'
				, $lists );
			if ( strpos( $lists[ 0 ],  '.wav^^' ) ) { // MPD not sort *.wav
				$lists = '';
				exec( 'mpc ls -f "%track%__'.$format.'" "'.$string.'" 2> /dev/null | sort -h | sed "s/^.*__//"'
					, $lists );
			}
			$array = htmlTracks( $lists, $f, $mode !== 'album' ? 'file' : '' );
		}
	}
	break;
case 'search':
	exec( 'mpc search -f "'.$format.'" any "'.$string.'" | awk NF'
		, $lists );
	$array = htmlTracks( $lists, $f, 'search', $string );
	break;
case 'track': // for tag editor
	$track = $_POST[ 'track' ] ?? '';
	$file = escape( $_POST[ 'file' ] );
	if ( $track ) { // cue
		if ( $track === 'cover' ) {
			$filter = 'head -1';
		} else {
			$filter = 'grep "\^\^'.$track.'"';
		}
		$lists = exec( 'mpc playlist -f "'.$format.'" "'.$file.'" | '.$filter );
		$array = explode( '^^', $lists );
	} else {
		if ( is_dir( '/mnt/MPD/'.$file ) ) {
			$wav = exec( 'mpc ls "'.$file.'" | grep .wav$ | head -1' ); // MPD not read albumartist in *.wav
			if ( $wav ) {
				$albumartist = exec( 'kid3-cli -c "get albumartist" "'.$wav.'"' );
				if ( $albumartist ) $format = str_replace( '%albumartist%', $albumartist, $format );
			}
			exec( 'mpc ls -f "'.$format.'" "'.$file.'"'
				, $lists );
			// format: [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ]
			foreach( $lists as $list ) {
				$each = explode( '^^', $list );
				$artist[]    = $each[ 2 ];
				$composer[]  = $each[ 3 ];
				$conductor[] = $each[ 4 ];
				$genre[]     = $each[ 5 ];
				$date[]      = $each[ 6 ];
				$array[]     = $each;
			}
			$array = $array[ 0 ];
			if ( count( array_unique( $artist ) )    > 1 ) $array[ 2 ] = '*';
			if ( count( array_unique( $composer ) )  > 1 ) $array[ 3 ] = '*';
			if ( count( array_unique( $conductor ) ) > 1 ) $array[ 4 ] = '*';
			if ( count( array_unique( $genre ) )     > 1 ) $array[ 5 ] = '*';
			if ( count( array_unique( $date ) )      > 1 ) $array[ 6 ] = '*';
		} else {
			// MPD not read albumartist in *.wav
			if ( substr( $file, -3 ) === 'wav' ) {
				$albumartist = exec( 'kid3-cli -c "get albumartist" "/mnt/MPD/'.$file.'"' );
				if ( $albumartist ) $format = str_replace( '%albumartist%', $albumartist, $format );
			}
			$lists = exec( 'mpc ls -f "'.$format.'" "'.$file.'"' );
			$array = explode( '^^', $lists );
		}
	}
	break;
case 'webradio':
	$dirwebradios = '/srv/http/data/webradios';
	$lists = array_slice( scandir( $dirwebradios ), 2 );
	if ( !count( $lists ) ) exit( '-1' );
	
	foreach( $lists as $list ) {
		$each = ( object )[];
		$name = exec( "sed -n 1p '$dirwebradios/$list'" );
		$each->name  = $name;
		$each->url   = str_replace( '|', '/', $list );
		$each->sort  = stripSort( $name );
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$time = time();
	$html = '';
	foreach( $array as $each ) {
		$index = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$name = str_replace( '/', '|', $each->url );
		$thumbsrc = '/data/webradiosimg/'.$name.'-thumb.'.$time.'.jpg';
		$html.= '<li class="file" data-index="'.$index.'">'
					.'<img class="lazy iconthumb lib-icon" data-src="'.$thumbsrc.'" data-target="#menu-webradio">'
					.'<a class="lipath">'.$each->url.'</a>'
					.'<a class="liname">'.$each->name.'</a>'
					.'<span class="li1">'.$each->name.'</span>'
					.'<span class="li2">'.$each->url.'</span>'
				.'</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$array = [ 'html' => $html, 'index' => $indexbar ];
	break;
}

echo json_encode( $array );

//-------------------------------------------------------------------------------------
function directoryList( $lists ) {
	global $gmode;
	global $mode;
	foreach( $lists as $list ) {
		$dir = basename( $list );
		$each = ( object )[];
		$each->path = $list;
		$each->dir  = $dir;
		$each->sort = stripSort( $dir );
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$time = time();
	$html = '';
	foreach( $array as $each ) {
		$path = $each->path;
		$index = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$thumbsrc = rawurlencode( '/mnt/MPD/'.$path.'/thumb.'.$time.'.jpg' );
		$html.=  '<li data-mode="file" data-index="'.$index.'">'
				.'<img class="lazy iconthumb lib-icon" data-src="'.$thumbsrc.'" data-target="#menu-folder">'
				.'<a class="lipath">'.$path.'</a>'
				.'<span class="single">'.$each->dir.'</span>'
				.'</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	return [ 'html' => $html, 'index' => $indexbar ];
}
function escape( $string ) { // for passing bash arguments
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
function HMS2second( $time ) {
	$HMS = explode( ':', $time );
	$count = count( $HMS );
	switch( $count ) {
		case 1: return $HMS[ 0 ]; break;
		case 2: return $HMS[ 0 ] * 60 + $HMS[ 1 ]; break;
		case 3: return $HMS[ 0 ] * 60 * 60 + $HMS[ 1 ] * 60 + $HMS[ 0 ]; break;
	}
}
function htmlFind( $lists, $f ) { // non-file 'find' command
	if ( !count( $lists ) ) exit( '-1' );
	
	global $gmode;
	global $mode;
	$fL = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list ); // album^^artist 
		$sort = in_array( $mode, [ 'artist', 'albumartist' ] ) ? $list[ 0 ] : $list[ 1 ]; // sort by artist
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			$each->$key = $list[ $i ];
			$each->sort = stripSort( $sort );
		}
		if ( isset( $list[ $fL ] ) ) $each->path = $list[ $fL ];
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$key0 = $f[ 0 ];
		$val0 = $each->$key0;
		if ( count( $f ) > 1 ) {
			$key1 = $f[ 1 ];
			$val1 = $each->$key1;
		} else {
			$key1 = '';
			$val1 = '';
		}
		$index = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		if ( !$val0 && !$val1 ) continue;
		
		if ( in_array( $mode, [ 'artist', 'albumartist' ] ) ) { // display as artist - album
			$name = $fL > 1 ? $val0.'<gr> • </gr>'.$val1 : $val0;
		} else {
			$name = $fL > 1 && $mode !== 'conductor' ? $val1.'<gr> • </gr>'.$val0 : $val0;
		}
		if ( property_exists( $each, 'path' ) ) { // cue //////////////////////////
			$path = $each->path;
			$datamode = 'file';
		} else {
			$path = $val1;
			$datamode = 'album';
		} // cue //////////////////////////////////////////////////////////////////
		$html.= '<li data-mode="'.$datamode.'" data-index="'.$index.'">'
					.'<a class="liname">'.$val0.'</a>'
					.'<i class="fa fa-'.$mode.' lib-icon" data-target="#menu-album"></i>'
					.'<span class="single">'.$name.'</span>'
				.'</li>';
	}
	$indexes = array_keys( array_flip( $indexes ) );
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	return [ 'html' => $html, 'index' => $indexbar ];
}
function htmlList( $lists ) { // non-file 'list' command
	if ( !count( $lists ) ) exit( '-1' );
	
	global $mode;
	$html = '';
	if ( $mode !== 'album' ) {
		foreach( $lists as $list ) {
			$data = explode( '^^', $list );
			$index = strtoupper( $data[ 0 ] );
			$indexes[] = $index;
			$name = $data[ 1 ];
			$html.= '<li data-mode="'.$mode.'" data-index="'.$index.'">'
						.'<a class="lipath">'.$name.'</a>'
						.'<i class="fa fa-'.$mode.' lib-icon" data-target="#menu-'.$mode.'"></i>'
						.'<span class="single">'.$name.'</span>'
					.'</li>';
		}
	} else {
		$time = time();
		foreach( $lists as $list ) {
			$data = explode( '^^', $list );
			$index = strtoupper( $data[ 0 ] );
			$indexes[] = $index;
			$path = $data[ 3 ];
			$coverfile = rawurlencode( '/mnt/MPD/'.$path.'/coverart.'.$time.'.jpg' ); // replaced with icon on load error(faster than existing check)
			$html.= '<div class="coverart" data-index="'.$index.'">
						<a class="lipath">'.$path.'</a>
						<div><img class="lazy" data-src="'.$coverfile.'"></div> 
						<span class="coverart1">'.$data[ 1 ].'</span>
						<gr class="coverart2">'.( $data[ 2 ] ?: '&nbsp;' ).'</gr>
					</div>';
		}
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) ); // faster than array_unique
	return [ 'html' => $html, 'index' => $indexbar ];
}
function htmlTracks( $lists, $f, $filemode = '', $string = '', $dirs = '' ) { // track list - no sort ($string: cuefile or search)
	if ( !count( $lists ) ) exit( '-1' );
	
	global $mode;
	global $gmode;
	$fL = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list );
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			$each->$key = $list[ $i ];
		}
		$array[] = $each;
	}
	$each0 = $array[ 0 ];
	$file0 = $each0->file;
	$ext = pathinfo( $file0, PATHINFO_EXTENSION );
	$litime = 0;
	
	$hidecover = exec( 'grep "hidecover.*true" /srv/http/data/system/display' );
	$searchmode = $filemode === 'search';
//	$cue = exec( 'mpc ls "'.dirname( $file0 ).'" | grep ".cue$" | wc -l' )
//			|| substr( $file0, -14, 4 ) === '.cue'; // $file0 = '/path/to/file.cue/track0001'
	$cuefile = exec( 'mpc ls "'.dirname( $file0 ).'" | grep ".cue$" | head -1' );
	if ( $cuefile ) {
		$cue = true;
		$file0 = $cuefile;
	} else if ( substr( $file0, -14, 4 ) === '.cue' ) { // $file0 = '/path/to/file.cue/track0001'
		$cue = true;
		$file0 = dirname( $file0 );
		$musicfile = exec( 'mpc ls "'.dirname( $file0 ).'" | grep -v ".cue$" | head -1' );
		$ext = pathinfo( $musicfile, PATHINFO_EXTENSION );
	} else {
		$cue = false;
	}
	$time = time();
	$i = 0;
	$html = '';
	foreach( $array as $each ) {
		$path = $cue ? $file0 : $each->file;
		$litime += HMS2second( $each->time );
		$title = $each->title;
		$datatrack = $cue ? 'data-track="'.$each->track.'"' : '';
		if ( $searchmode ) {
			$title = preg_replace( "/($string)/i", '<bl>$1</bl>', $title );
			$name = $each->artist.' - '.$each->album;
			$trackname = preg_replace( "/($string)/i", '<bl>$1</bl>', $name );
		} else {
			$trackname = basename( $path );
		}
		if ( !$title ) $title = pathinfo( $each->file, PATHINFO_FILENAME );
		$li0 = ( $i || $searchmode || $hidecover ) ? '' : ' class="track1"';
		$i++;
		$html.= '<li data-mode="file" '.$datatrack.$li0.'>'
					.'<a class="lipath">'.$path.'</a>'
					.'<i class="fa fa-music lib-icon" data-target="#menu-file"></i>'
					.'<span class="li1">'.$title.'<span class="time">'.$each->time.'</span></span>'
					.'<span class="li2">'.$i.' • '.$trackname.'</span>'
				.'</li>';
	}
	if ( $searchmode ) return [ 'html' => $html, 'count' => count( $array ) ];
	
	if ( $hidecover ) {
		$coverhtml = '';
	} else {
		// fix - mpd cannot read albumartist from *.wav
		if ( $ext === 'wav' ) $albumartist = exec( 'kid3-cli -c "get albumartist" "/mnt/MPD/'.$file0.'"' );
		$album = $each0->album;
		$artist = $each0->albumartist ?: ( $albumartist ?? '' );
		$icon = 'albumartist';
		if ( !$artist ) {
			$artist = $each0->artist;
			$icon = 'artist';
		}
		$hidealbum = $album && $gmode !== 'album' ? '' : ' hide';
		$hideartist = $artist && $gmode !== 'artist' && $gmode !== 'albumartist' ? '' : ' hide';
		$hidecomposer = $each0->composer && $gmode !== 'composer' ? '' : ' hide';
		$hideconductor = $each0->conductor && $gmode !== 'conductor' ? '' : ' hide';
		$hidegenre = $each0->genre && $gmode !== 'genre' ? '' : ' hide';
		$hidedate = $each0->date && $gmode !== 'date' ? '' : ' hide';
		$mpdpath = $dirs ? dirname( $dirs[ 0 ] ) : dirname( $file0 );
		$plfile = exec( 'mpc ls "'.$mpdpath.'" 2> /dev/null | grep ".cue$\|.m3u$\|.m3u8$\|.pls$"' );
		$args = escape( implode( "\n", [ $artist, $album, $file0, 'licover' ] ) );
		$script = '/usr/bin/sudo /srv/http/bash/status-coverart.sh "'.$args.'"';
		$coverart = exec( $script );
		if ( !$coverart ) $coverart = '/assets/img/coverart.'.$time.'.svg';
		$coverhtml = '<li data-mode="file" class="licover">'
					.'<a class="lipath">'.( $cue ? $file0 : $mpdpath ).'</a>'
					.'<div class="licoverimg"><img id="liimg" src="'.$coverart.'"></div>'
					.'<div class="liinfo '.$mode.'">'
					.'<div class="lialbum'.$hidealbum.'">'.$album.'</div>'
					.'<div class="liartist'.$hideartist.'"><i class="fa fa-'.$icon.'"></i>'.$artist.'</div>'
					.'<div class="licomposer'.$hidecomposer.'"><i class="fa fa-composer"></i>'.$each0->composer.'</div>'
					.'<div class="liconductor'.$hideconductor.'"><i class="fa fa-conductor"></i>'.$each0->conductor.'</div>'
					.'<span class="ligenre'.$hidegenre.'"><i class="fa fa-genre"></i>'.$each0->genre.'&emsp;</span>'
					.'<span class="lidate'.$hidedate.'"><i class="fa fa-date"></i>'.$each0->date.'</span>'
					.( !$hidegenre || !$hidedate ? '<br>' : '' )
					.'<div class="liinfopath"><i class="fa fa-folder"></i>'.str_replace( '\"', '"', $mpdpath ).'</div>'
					.'<i class="fa fa-music lib-icon" data-target="#menu-folder"></i>'.( count( $array ) )
					.'<gr> • </gr>'.second2HMS( $litime )
					.'<gr> • </gr>'.strtoupper( $ext )
					.( $plfile ? '&emsp;<i class="fa fa-file-playlist"></i><gr>'.pathinfo( $plfile, PATHINFO_EXTENSION ).'</gr>' : '' )
					.'</div></li>';
	}
	return [ 'html' => $coverhtml.$html ];
}
function second2HMS( $second ) {
	$hh = floor( $second / 3600 );
	$mm = floor( ( $second % 3600 ) / 60 );
	$ss = $second % 60;
	
	$hh = $hh ? $hh.':' : '';
	$mm = $hh ? ( $mm > 9 ? $mm.':' : '0'.$mm.':' ) : ( $mm ? $mm.':' : '' );
	$ss = $mm ? ( $ss > 9 ? $ss : '0'.$ss ) : $ss;
	return $hh.$mm.$ss;
}
