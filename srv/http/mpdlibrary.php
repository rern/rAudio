<?php
/*
find, list, ls, search, track, webradio

Album
	/srv/http/data/mpd/album: album-artist-file
	/srv/http/data/mpd/albumbyartist: artist-date-album-file
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
include '/srv/http/function.php';

$gmode     = $_POST[ 'gmode' ] ?? null;
$mode      = $_POST[ 'mode' ] ?? null;
$string    = $_POST[ 'string' ] ?? null;
$string    = escape( $string );
$formatall = [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'date', 'file', 'genre', 'time', 'title', 'track' ];
$f         = $_POST[ 'format' ] ?? $formatall;
$format    = '%'.implode( '%^^%', $f ).'%';
$html      = '<ul id="lib-list" class="list">';

switch( $_POST[ 'query' ] ) {

case 'find':
	$format = str_replace( '%artist%', '[%albumartist%|%artist%]', $format );
	if ( is_array( $mode ) ) {
		exec( 'mpc -f %file% find '.$mode[ 0 ].' "'.$string[ 0 ].'" '.$mode[ 1 ].' "'.$string[ 1 ].'" 2> /dev/null '
				."| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}'"
				."| sort -u"
			, $dirs );
		if ( count( $dirs ) > 1 ) {
			htmlDirectory( $dirs );
			break;
			
		} else {
			$file = $dirs[ 0 ];
			if ( substr( $file, -14, 4 ) !== '.cue' ) {
				exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" '.$mode[ 1 ].' "'.$string[ 1 ].'" 2> /dev/null '
						."| awk 'NF && !a[$0]++'"
					, $lists );
				if ( ! count( $lists ) ) { // find with albumartist
					exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" albumartist "'.$string[ 1 ].'" 2> /dev/null '
							."| awk 'NF && !a[$0]++'"
						, $lists );
				}
			} else { // $file = '/path/to/file.cue/track0001'
				$format = '%'.implode( '%^^%', $f ).'%';
				exec( 'mpc -f "'.$format.'" playlist "'.dirname( $file ).'"'
					, $lists );
			}
		}
	} else {
		exec( 'mpc find -f "'.$format.'" '.$mode.' "'.$string.'" 2> /dev/null '
				."| sed 's:[^/]*$::'"
				."| awk 'NF && !a[$0]++'"
			, $lists );
	}
	if ( count( $f ) > 3 ) {
		htmlTrack( $lists, $f );
	} else { // modes - album, artist, albumartist, composer, conductor, date, genre
		htmlFind( $lists, $f );
	}
	break;
case 'home':
	$modes    = [ 'Album', 'Artist', 'Album Artist', 'Composer', 'Conductor', 'Date', 'Genre', 'Latest'
				, 'NAS', 'SD', 'USB', 'Playlists', 'Web Radio', 'DAB Radio' ];
	$htmlmode = '';
	foreach( $modes as $mode ) {
		$lipath   = str_replace( ' ', '', $mode );
		$modeLC   = strtolower( $lipath );
		$htmlmode.=
'<div class="lib-mode">
	<div id="mode-'.$modeLC.'" class="mode" data-mode="'.$modeLC.'">
	<a class="lipath">'.$modeLC.'</a>
	<i class="i-'.$modeLC.'"></i><gr></gr><a class="label">'.$mode.'</a>
	</div>
</div>';
	}
	// bookmarks
	$dir   = '/srv/http/data/bookmarks';
	$files = array_slice( scandir( $dir ), 2 ); // remove ., ..
	if ( count( $files ) ) {
		foreach( $files as $name ) {
			$bkpath   = trim( file_get_contents( $dir.'/'.$name ) );
			$prefix = substr( $bkpath, 0, 4 );
			if ( in_array( $prefix, [ 'http', 'rtsp' ] ) ) {
				$bkradio  = 'bkradio';
				$dirradio = $prefix === 'http' ? 'webradio' : 'dabradio';
				$src      = '/data/'.$dirradio.'/img/'.str_replace( '/', '|', $bkpath ).'.jpg';
			} else {
				$bkradio  = '';
				$src      = substr( $bkpath, 0, 8 ) === 'webradio' ? '/data/' : '/mnt/MPD/';
				$src     .= $bkpath.'/coverart.jpg';
			}
			$htmlmode.=
'<div class="lib-mode bookmark">
	<div class="mode mode-bookmark '.$bkradio.'" data-mode="bookmark">
	<a class="lipath li2">'.$bkpath.'</a>
	<a class="bkname name hide">'.$name.'</a>
	<img class="bkcoverart" src="'.$src.'^^^">
	</div>
</div>';
		}
	}
	$counts = json_decode( file_get_contents( '/srv/http/data/mpd/counts' ) );
	$order  = file_exists( '/srv/http/data/system/order.json' ) ? json_decode( file_get_contents( '/srv/http/data/system/order.json' ) ) : false;
	echo json_encode( [
		  'html'   => $htmlmode
		, 'counts' => $counts
		, 'order'  => $order
	] );
	break;
case 'list':
	$filemode = '/srv/http/data/mpd/'.$mode;
	if ( $mode === 'album' ) {
		$display = json_decode( file_get_contents( '/srv/http/data/system/display.json' ) );
		if ( $display->albumbyartist ) $filemode.= 'byartist';
		if ( $display->albumyear ) $filemode.= '-year';
	}
	$lists = file( $filemode, FILE_IGNORE_NEW_LINES );
	if ( count( $lists ) ) htmlList( $lists );
	break;
case 'ls':
	if ( $mode !== 'album' ) {
		$multiline = implode( "\n", [ 'librarylistdirs', $string, 'CMD DIR' ] );
		exec( '/srv/http/bash/cmd.sh "'.$multiline.'"', $lists );
		if ( $lists[ 0 ] ) {
			htmlDirectory( $lists );
			break;
		}
	}
	$f      = $formatall; // set format for directory with files only - track list
	$format = '%'.implode( '%^^%', $f ).'%';
	// parse if cue|m3u,|pls files (sort -u: mpc ls list *.cue twice)
	exec( 'mpc ls "'.$string.'" '
			.'| grep -E ".cue$|.m3u$|.m3u8$|.pls$" '
			.'| sort -u'
		, $plfiles );
	if ( count( $plfiles ) ) {
		asort( $plfiles );
		$path  = explode( '.', $plfiles[ 0 ] );
		$ext   = end( $path );
		$lists = [];
		foreach( $plfiles as $file ) {
			$type = $ext === 'cue' ? 'ls' : 'playlist';
			exec( 'mpc -f "'.$format.'" '.$type.' "'.$file.'"'
				, $lists ); // exec appends to existing array
		}
		htmlTrack( $lists, $f, $ext, $file );
	} else {
		exec( 'mpc ls -f "'.$format.'" "'.$string.'" 2> /dev/null'
			, $lists );
		if ( strpos( $lists[ 0 ],  '.wav^^' ) ) { // MPD not sort *.wav
			$lists = '';
			exec( 'mpc ls -f "%track%__'.$format.'" "'.$string.'" 2> /dev/null '
					.'| sort -h '
					.'| sed "s/^.*__//"'
				, $lists );
		}
		htmlTrack( $lists, $f, $mode !== 'album' ? 'file' : '' );
	}
	break;
case 'radio':
	$dir     = '/srv/http/data/'.$gmode.'/';
	$subdirs = [];
	$files   = [];
	$indexes = [];
	if ( $mode === 'search' ) {
		exec( "grep -ril --exclude-dir=img '".$string."' ".$dir." | sed 's|^".$dir."||'"
			, $files );
	} else {
		$dir.= $string;
		exec( 'ls -1 "'.$dir.'" | grep -E -v "^img|\.jpg$|\.gif$"'
			, $lists );
		if ( ! count( $lists ) ) exit();
		
		foreach( $lists as $list ) {
			if ( is_dir( $dir.'/'.$list ) ) {
				$subdirs[] = $list;
			} else {
				$files[] = $list;
			}
		}
	}
	htmlRadio( $subdirs, $files, $dir );
	break;
case 'search':
	exec( 'mpc search -f "'.$format.'" any "'.$string.'" | awk NF'
		, $lists );
	htmlTrack( $lists, $f, 'search', $string );
	break;
case 'track': // for tag editor
	$file  = escape( $_POST[ 'file' ] );
	if ( is_dir( '/mnt/MPD/'.$file ) ) {
		$wav = exec( 'mpc ls "'.$file.'" | grep -m1 "\.wav$"' ); // MPD not read albumartist in *.wav
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
	$tag = [];
	$fL  = count( $f );
	for ( $i = 0; $i < $fL; $i++ ) $tag[ strtoupper( $f[ $i ] ) ] = $array[ $i ];
	echo json_encode( $tag, JSON_NUMERIC_CHECK );
	break;
}

//-------------------------------------------------------------------------------------
function escape( $string ) { // for passing bash arguments
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
function htmlDirectory( $lists ) {
	global $gmode, $html;
	foreach( $lists as $list ) {
		$dir        = basename( $list );
		$each       = ( object )[];
		$each->path = $list;
		$each->dir  = $dir;
		$each->sort = stripSort( $dir );
		$array[]    = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	foreach( $array as $each ) {
		$path      = $each->path;
		$index     = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$nodata   = '';
		if ( is_dir( '/mnt/MPD/'.$path ) ) {
			$mode     = strtolower( explode( '/', $path )[ 0 ] );
			$thumbsrc = rawurlencode( '/mnt/MPD/'.$path.'/thumb.jpg' );
			$htmlicon = imgIcon( $thumbsrc, 'folder' );
			if ( substr( $path, -1 ) === '/' ) {
				$nodata = ' class="nodata"';
				$path   = rtrim( $path, '/' );
			}
		} else {
			$mode     = $gmode;
			$htmlicon = i( 'music ', 'file' );
		}
		$html.=
'<li data-mode="'.$mode.'" data-index="'.$index.'"'.$nodata.'>'.$htmlicon.'
<a class="lipath">'.$path.'</a>
<span class="single name">'.basename( $path ).'</span>
</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$html    .=
'</ul>
<div id="lib-index" class="index index0">'.$indexbar[ 0 ].'</div>
<div id="lib-index1" class="index index1">'.$indexbar[ 1 ].'</div>';
	echo $html;
}
function htmlFind( $lists, $f ) { // non-file 'find' command
	if ( ! count( $lists ) ) exit;
	
	global $mode, $gmode, $html;
	$fL = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list ); // album^^artist 
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key        = $f[ $i ];
			$each->$key = $list[ $i ];
			$each->sort = stripSort( $list[ 0 ] ).stripSort( $list[ 1 ] );
		}
		if ( isset( $list[ $fL ] ) ) $each->path = $list[ $fL ];
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$key0           = $f[ 0 ];
	$key1           = $fL > 1 ? $f[ 1 ] : '';
	$modeartist     = in_array( $gmode, [ 'artist', 'albumartist' ] );
	$modedate_genre = in_array( $gmode, [ 'date', 'genre' ] );
	foreach( $array as $each ) {
		$val0       = $each->$key0;
		if ( ! $val0 ) continue;
		
		$icon = '<img class="iconthumb li-icon lazyload" data-src="/mnt/MPD/'.$each->file.'thumb.jpg^^^" data-menu="album">';
		$name = '<a class="name">'.$val0.'</a>';
		if ( ! $modeartist && $key1 ) {
			$val1 = $each->$key1;
			$name.= '<gr> • </gr>'.$val1;
		}
		
		$index     = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$datamode  = property_exists( $each, 'path' ) ? $mode : 'album'; // cue //////////////////////////////////////////////////////////////////
		$liname    = $modedate_genre ? $val1 : $val0;
		$html     .=
'<li data-mode="'.$datamode.'" data-index="'.$index.'">
	<a class="liname">'.$liname.'</a>
	'.$icon.'<span class="single">'.$name.'</span>
</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$html    .=
'</ul>
<div id="lib-index" class="index index0">'.$indexbar[ 0 ].'</div>
<div id="lib-index1" class="index index1">'.$indexbar[ 1 ].'</div>';
	echo $html;
}
function htmlList( $lists ) { // non-file 'list' command
	global $mode, $gmode, $html;
	if ( $mode !== 'album' && $mode !== 'latest' ) {
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$index     = strtoupper( $data[ 0 ] );
			$indexes[] = $index;
			$name      = $data[ 1 ];
			$html     .=
'<li data-mode="'.$mode.'" data-index="'.$index.'">
	<a class="lipath">'.$name.'</a>
	'.i( $gmode, $mode ).'<span class="single name">'.$name.'</span>
</li>';
		}
	} else {
		global $display;
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$index     = strtoupper( $data[ 0 ] );
			$indexes[] = $index;
			$path      = end( $data );
			if ( substr( $path, -4 ) === '.cue' ) $path = dirname( $path );
			$coverfile = rawurlencode( '/mnt/MPD/'.$path.'/coverart.jpg' ); // replaced with icon on load error(faster than existing check)
			$l1        = $data[ 1 ];
			$l2        = $data[ 2 ];
			$name      = $l1;
			if ( $display->albumyear ) {
				$name = $data[ 3 ];
				$l2   = $l2 ? ( strlen( $l2 ) < 5 ? $l2 : date( 'Y', strtotime( $l2 ) ) ) : '...';
				$l2  .= '<br>'.$name;
			} else if ( $display->albumbyartist ) {
				$name = $l2;
			}
			$html     .=
'<div class="coverart" data-index="'.$index.'">
	<a class="lipath">'.$path.'</a>
	<a class="liname">'.$name.'</a>
	<div><img class="lazyload" data-src="'.$coverfile.'^^^"></div>
	<a class="coverart1">'.$l1.'</a>
	<a class="coverart2">'.$l2.'</a>
</div>';
		}
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) ); // faster than array_unique
	$html    .=
'</ul>
<div id="lib-index" class="index index0">'.$indexbar[ 0 ].'</div>
<div id="lib-index1" class="index index1">'.$indexbar[ 1 ].'</div>';
	echo $html;
}
function htmlRadio( $subdirs, $files, $dir ) {
	global $mode, $gmode, $html;
	$searchmode = $mode === 'search';
	if ( count( $subdirs ) ) {
		foreach( $subdirs as $subdir ) {
			$each         = ( object )[];
			$each->subdir = $subdir;
			$each->sort   = stripSort( $subdir );
			$array[]      = $each;
		}
		usort( $array, function( $a, $b ) {
			return strnatcasecmp( $a->sort, $b->sort );
		} );
		$path = str_replace( '/srv/http/data/'.$gmode.'/', '', $dir ); // /srv/http/data/webradio/path/to > path/to 
		if ( $path ) $path.= '/';
		foreach( $array as $each ) {
			$subdir = $each->subdir;
			if ( count( $files ) ) {
				$html     .=
'<li class="dir">';
			} else {
				$index     = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
				$indexes[] = $index;
				$html     .=
'<li class="dir" data-index="'.$index.'">';
			}
			$html    .=
	imgIcon( '/data/'.$gmode.'/'.$subdir.'/thumb.jpg', 'wrdir' ).'
	<a class="lipath">'.$path.$subdir.'</a>
	<span class="single name">'.$subdir.'</span>
</li>';
		}
	}
	if ( count( $files ) ) {
		unset( $array );
		foreach( $files as $file ) {
			$each          = ( object )[];
			$data          = file( "$dir/$file", FILE_IGNORE_NEW_LINES );
			$name          = $data[ 0 ];
			$each->charset = $data[ 2 ] ?? '';
			$each->file    = $file;
			$each->name    = $name;
			$each->sort    = stripSort( $name );
			$array[]       = $each;
		}
		usort( $array, function( $a, $b ) {
			return strnatcasecmp( $a->sort, $b->sort );
		} );
		foreach( $array as $each ) {
			$index       = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
			$indexes[]   = $index;
			$datacharset = $each->charset ? ' data-charset="'.$each->charset.'"' : '';
			$url         = str_replace( '|', '/', $each->file );
			$thumbsrc    = '/data/'.$gmode.'/img/'.$each->file.'-thumb.jpg';
			$liname      = $each->name;
			$name        = $searchmode ? preg_replace( "/($string)/i", '<bl>$1</bl>', $liname ) : $liname;
			$html       .=
'<li class="file"'.$datacharset.' data-index="'.$index.'">
	'.imgIcon( $thumbsrc, 'webradio' ).'
	<a class="lipath">'.$url.'</a>
	<a class="liname">'.$liname.'</a>';
			if ( $gmode === 'webradio' ) {
				$html.=
	'<div class="li1 name">'.$name.'</div><div class="li2">'.$url.'</div>';
			} else {
				$html.=
	'<span class="single name">'.$name.'</span>';
			}
			$html.=
'</li>';
		}
	}
	$html.=
'</ul>';
	if ( $mode !== 'search' ) {
		$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
		$html.=
'<div id="lib-index" class="index index0">'.$indexbar[ 0 ].'</div>
<div id="lib-index1" class="index index1">'.$indexbar[ 1 ].'</div>';
	}
	echo $html;
}
function htmlTrack( $lists, $f, $filemode = '', $string = '', $dirs = '' ) { // track list - no sort ($string: cuefile or search)
	if ( ! count( $lists ) ) exit;
	
	global $mode, $gmode, $html;
	$searchmode = $filemode === 'search';
	if ( ! $searchmode ) $html = str_replace( '">', ' track">' , $html );
	$fL = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list );
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key        = $f[ $i ];
			$each->$key = $list[ $i ];
		}
		$array[] = $each;
	}
	$each0      = $array[ 0 ];
	$file0      = $each0->file;
	$ext        = pathinfo( $file0, PATHINFO_EXTENSION );
	
	$hidecover  = exec( 'grep "hidecover.*true" /srv/http/data/system/display.json' );
	$cuefile    = preg_replace( "/\.[^.]+$/", '.cue', $file0 );
	if ( file_exists( '/mnt/MPD/'.$cuefile ) ) {
		$cue       = true;
		$cuename   = pathinfo( $cuefile, PATHINFO_BASENAME );
		$musicfile = exec( 'mpc ls "'.dirname( $cuefile ).'" | grep -v ".cue$" | head -1' );
		$ext       = pathinfo( $musicfile, PATHINFO_EXTENSION );
	} else {
		$cue = false;
	}
	if ( ! $hidecover && ! $searchmode ) {
		if ( $ext !== 'wav' ) {
			$albumartist = $each0->albumartist;
		} else { // fix - mpd cannot read albumartist from *.wav
			$albumartist = exec( 'kid3-cli -c "get albumartist" "/mnt/MPD/'.$file0.'"' );
		}
		$album  = $each0->album;
		$artist = $albumartist ?: '';
		$iconartist   = 'albumartist';
		if ( ! $artist ) {
			$artist = $each0->artist;
			$iconartist = 'artist';
		}
		$hidealbum     = $album && $gmode !== 'album' ? '' : ' hide';
		$hideartist    = $artist && $gmode !== 'artist' && $gmode !== 'albumartist' ? '' : ' hide';
		$hidecomposer  = $each0->composer && $gmode !== 'composer' ? '' : ' hide';
		$hideconductor = $each0->conductor && $gmode !== 'conductor' ? '' : ' hide';
		$hidegenre     = $each0->genre && $gmode !== 'genre' ? '' : ' hide';
		$hidedate      = $each0->date && $gmode !== 'date' ? '' : ' hide';
		$mpdpath       = $dirs ? dirname( $dirs[ 0 ] ) : dirname( $file0 );
		$plfile        = exec( 'mpc ls "'.$mpdpath.'" 2> /dev/null | grep -E ".m3u$|.m3u8$|.pls$"' );
		if ( $cue || $plfile ) {
			$plicon = '&emsp;'.i( 'file-playlist' ).'<gr>'
					 .( $cue ? 'cue' : pathinfo( $plfile, PATHINFO_EXTENSION ) ).'</gr>';
		} else {
			$plicon = '';
		}
		$hhmmss        = array_column( $array, 'time' );
		$seconds       = 0;
		foreach( $hhmmss as $hms ) $seconds += HMS2second( $hms ); // hh:mm:ss > seconds
		$totaltime     = second2HMS( $seconds );
		$args          = escape( implode( "\n", [ 'cmd', $artist, $album, $each0->file, 'CMD ARTIST ALBUM FILE' ] ) );
		$coverart      = exec( '/usr/bin/sudo /srv/http/bash/status-coverart.sh "'.$args.'"' );
		if ( ! $coverart ) $coverart = '/assets/img/coverart.svg';
		$br            = ! $hidegenre || !$hidedate ? '<br>' : '';
		$mpdpath       = str_replace( '\"', '"', $mpdpath );
		$count         = count( $array );
		$ext           = strtoupper( $ext ).$plicon;
		$icon          = i( 'music', 'folder' );
		$html         .=
'<li data-mode="'.$gmode.'" class="licover">
	<a class="lipath">'.$mpdpath.'</a>
	<div class="licoverimg"><img id="liimg" src="'.$coverart.'^^^"></div>
	<div class="liinfo '.$gmode.'">
	<div class="lialbum name'.$hidealbum.'">'.$album.'</div>
	<div class="liartist'.$hideartist.'">'.i( $iconartist ).$artist.'</div>
	<div class="licomposer'.$hidecomposer.'">'.i( 'composer' ).$each0->composer.'</div>
	<div class="liconductor'.$hideconductor.'">'.i( 'conductor' ).$each0->conductor.'</div>
	<span class="ligenre'.$hidegenre.'">'.i( 'genre' ).$each0->genre.'&emsp;</span>
	<span class="lidate'.$hidedate.'"><i class="i-date"></i>'.$each0->date.'</span>
	'.$br.'
	<div class="liinfopath"><i class="i-folder"></i>'.$mpdpath.'</div>
	'.$icon.$count.'<gr> • </gr>'.$totaltime.'<gr> • </gr>'.$ext.'
	</div>
</li>';
	}
	$icon = i( 'music', 'file' );
	$i    = 0;
	foreach( $array as $each ) {
		if ( ! $each->time ) continue;
		
		$path   = $each->file;
		$album  = $each->album;
		$artist = $each->artist;
		$title  = $each->title;
		if ( $searchmode ) {
			$name      = $artist.' - '.$album;
			$title     = preg_replace( "/($string)/i", '<bll>$1</bll>', $title );
			$trackname = preg_replace( "/($string)/i", '<bll>$1</bll>', $name );
		} else {
			$trackname = $cue ? $cuename.'/' : '';
			$trackname.= basename( $path );
		}
		if ( ! $title ) $title = pathinfo( $each->file, PATHINFO_FILENAME );
		$li0    = ( $i || $searchmode || $hidecover ) ? '' : ' class="track1"';
		$i++;
		$html  .=
'<li data-mode="'.$gmode.'" '.$li0.'>
	<a class="lipath">'.$path.'</a>
	'.$icon.'<div class="li1"><a class="name">'.$title.'</a><a class="time">'.$each->time.'</a></div>
	<div class="li2">'.$i.' • '.$trackname.'</div>
</li>';
	}
	$html.=
'</ul>';
	if ( $searchmode ) {
		echo json_encode( [ 'html' => $html, 'count' => $i, 'librarytrack' => true ] );
	} else {
		echo $html;
	}
}
