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
	mpc ls $path
			track list: mpc ls -f %*% $path
search
			track list: mpc search -f %*% any $keyword
*/
include 'function.php';

$QUERY     = $_POST[ 'query' ];
$GMODE     = $_POST[ 'gmode' ] ?? null;
$MODE      = $_POST[ 'mode' ] ?? null;
$STRING    = isset( $_POST[ 'string' ] ) ? escape( $_POST[ 'string' ] ) : null;
$formatall = [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'date', 'file', 'genre', 'time', 'title', 'track' ];
$f         = $_POST[ 'format' ] ?? $formatall;
$format    = '%'.implode( '%^^%', $f ).'%';
$html      = '<ul id="lib-list" class="list">';
$index0    = '';
$indexes   = [];
foreach( [ 'mpd', 'system', 'webradio' ] as $k ) ${'dir'.$k} = '/srv/http/data/'.$k.'/';

switch( $QUERY ) {

case 'find':
	$format = str_replace( '%artist%', '[%albumartist%|%artist%]', $format );
	if ( is_array( $MODE ) ) {
		exec( 'mpc find '.$MODE[ 0 ].' "'.$STRING[ 0 ].'" '.$MODE[ 1 ].' "'.$STRING[ 1 ].'" 2> /dev/null '
				."| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}'"
				."| sort -u"
			, $dirs );
		if ( count( $dirs ) > 1 ) {
			htmlDirectory( $dirs );
			exit;
//----------------------------------------------------------------------------------
		}
		$file = $dirs[ 0 ];
		if ( substr( $file, -14, 4 ) !== '.cue' ) {
			exec( 'mpc find -f "'.$format.'" '.$MODE[ 0 ].' "'.$STRING[ 0 ].'" '.$MODE[ 1 ].' "'.$STRING[ 1 ].'" 2> /dev/null '
					."| awk 'NF && !a[$0]++'"
				, $lists );
			if ( ! count( $lists ) ) { // find with albumartist
				exec( 'mpc find -f "'.$format.'" '.$MODE[ 0 ].' "'.$STRING[ 0 ].'" albumartist "'.$STRING[ 1 ].'" 2> /dev/null '
						."| awk 'NF && !a[$0]++'"
					, $lists );
			}
		} else { // $file = '/path/to/file.cue/track0001'
			$format = '%'.implode( '%^^%', $f ).'%';
			exec( 'mpc -f "'.$format.'" playlist "'.dirname( $file ).'"'
				, $lists );
		}
	} else if ( $MODE === 'album' ) {
		exec( 'mpc find -f "'.$format.'" album "'.$STRING.'" 2> /dev/null '
				."| awk 'NF && !a[$0]++'"
			, $lists );
	} else {
		exec( 'mpc find -f "'.$format.'" '.$MODE.' "'.$STRING.'" 2> /dev/null '
				."| awk 'NF && !a[$0]++'"
			, $lists );
	}
	if ( ! count( $lists ) ) exit;
//----------------------------------------------------------------------------------
	if ( count( $f ) > 3 ) {
		htmlTrack( $lists, $f );
	} else { // modes - album, artist, albumartist, composer, conductor, date, genre
		htmlFind( $lists, $f );
	}
	break;
case 'home':
	$modes    = [ 'Album',  'Artist', 'Album Artist', 'Composer',  'Conductor', 'Date',      'Genre'
				, 'Latest', 'NAS',    'SD',           'USB',       'Playlists', 'Web Radio', 'DAB Radio' ];
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
	$dir      = '/srv/http/data/bookmarks';
	$files    = array_slice( scandir( $dir ), 2 ); // remove ., ..
	if ( count( $files ) ) {
		foreach( $files as $name ) {
			$bkpath   = trim( file_get_contents( $dir.'/'.$name ) );
			$prefix   = substr( $bkpath, 0, 4 );
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
	$order    = file_exists( $dirsystem.'order.json' ) ? json_decode( file_get_contents( $dirsystem.'order.json' ) ) : false;
	$updating = exec( '[[ -e '.$dirmpd.'listing ]] || mpc | grep -q ^Updating && echo 1' ) ? true : false;
	echo json_encode( [
		  'html'     => $htmlmode
		, 'order'    => $order
		, 'updating' => $updating
	] );
	break;
case 'list':
	$filemode = $dirmpd.$MODE;
	if ( $MODE === 'album' ) {
		$display = json_decode( file_get_contents( $dirsystem.'display.json' ) );
		if ( $display->albumbyartist ) $filemode.= 'byartist';
		if ( $display->albumyear ) $filemode.= '-year';
	}
	$lists = file( $filemode, FILE_IGNORE_NEW_LINES );
	if ( count( $lists ) ) htmlList( $lists );
	break;
case 'ls':
	if ( in_array( $STRING, [ 'NAS', 'SD', 'USB' ] ) ) { // file modes - show all dirs in root
		exec( 'ls -1d /mnt/MPD/'.$STRING.'/* | sed -E -e "s|^/mnt/MPD/||" -e "/NAS\/data$/ d"', $ls );
		htmlDirectory( $ls );
		exit;
//----------------------------------------------------------------------------------
	}
	exec( 'mpc ls "'.$STRING.'" 2> /dev/null'
		, $mpcls );
	if ( ! count( $mpcls ) ) exit;
//----------------------------------------------------------------------------------
	if ( $MODE !== 'album' ) {
		foreach( $mpcls as $mpdpath ) {
			if ( is_dir( '/mnt/MPD/'.$mpdpath ) ) {
				htmlDirectory( $mpcls );
				exit;
//----------------------------------------------------------------------------------
			}
		}
	}
	// parse if cue|m3u,|pls files (sort -u: mpc ls list *.cue twice)
	$plfiles = preg_grep( '/.cue$|.m3u$|.m3u8$|.pls$/', $mpcls );
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
		exec( 'mpc ls -f "'.$format.'" "'.$STRING.'" 2> /dev/null'
			, $lists );
		if ( strpos( $lists[ 0 ],  '.wav^^' ) ) { // MPD not sort *.wav
			$lists = '';
			exec( 'mpc ls -f "%track%__'.$format.'" "'.$STRING.'" 2> /dev/null '
					.'| sort -h '
					.'| sed "s/^.*__//"'
				, $lists );
		}
		htmlTrack( $lists, $f, $MODE !== 'album' ? 'file' : '' );
	}
	break;
case 'radio':
	$dir     = '/srv/http/data/'.$GMODE.'/'.$STRING;
	$subdirs = [];
	$files   = [];
	exec( 'ls -1 "'.$dir.'" | grep -E -v "^img|\.jpg$|\.gif$"'
		, $lists );
	foreach( $lists as $list ) {
		$path = $dir.'/'.$list;
		if ( is_dir( $path ) ) {
			$subdirs[] = $path;
		} else {
			$files[] = $path;
		}
	}
	htmlRadio( $files, $subdirs, $dir );
	break;
case 'search':
	$i          = 0;
	$htmlsearch = '';
	exec( "grep -m1 -rin '$STRING' /srv/http/data/*radio --exclude-dir img | sed -n '/:1:/ {s/:1:.*//; p}'"
		, $files );
	$count      = count( $files );
	$htmlsearch.= $count ? htmlRadio( $files ) : '';
	$i         += $count;
	foreach( [ 'title', 'albumartist', 'artist', 'album' ] as $tag ) {
		exec( 'mpc search -f "'.$format.'" '.$tag.' "'.$STRING.'" | awk NF'
			, $lists );
	}
	$count      = count( $lists );
	$htmlsearch.= $count ? htmlTrack( $lists, $f, '', $STRING ) : '';
	$i         += $count;
	if ( ! $i ) {
		echo -1;
		exit;
//----------------------------------------------------------------------------------
	}
	$html = str_replace( 'lib', 'search', $html ).$htmlsearch.'</ul>';
	echo json_encode( [ 'html' => $html, 'count' => $i ] );
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

function escape( $string ) { // for passing bash arguments
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
function htmlDirectory( $lists ) {
	global $GMODE, $html, $index0, $indexes;
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
	$htmlf = '';
	foreach( $array as $each ) {
		$path      = $each->path;
		$dataindex = dataIndex( $each->sort );
		$name      = in_array( $GMODE, [ 'nas', 'sd', 'usb' ] ) ? basename( $path ) : $path;
		$dir       = is_dir( '/mnt/MPD/'.$path );
		if ( $dir ) {
			$mode = strtolower( explode( '/', $path )[ 0 ] );
			$icon = imgIcon( rawurlencode( '/mnt/MPD/'.$path.'/thumb.jpg' ), 'folder' );
		} else {
			$mode = $GMODE;
			$icon = i( 'music ', 'file' );
		}
		$htmlli   = '<li data-mode="'.$mode.'"'.$dataindex.'>'.$icon.
'<a class="lipath">'.$path.'</a>
<span class="single name">'.$name.'</span>
</li>';
		$dir ? $html.= $htmlli : $htmlf.= $htmlli;
	}
	$html .= $htmlf.indexBar( $indexes );
	echo $html;
}
function htmlFind( $lists, $f ) { // non-file 'find' command
	global $MODE, $GMODE, $html, $index0, $indexes;
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
	$modeartist     = in_array( $GMODE, [ 'artist', 'albumartist' ] );
	$modedate_genre = in_array( $GMODE, [ 'date', 'genre' ] );
	foreach( $array as $each ) {
		$val0       = $each->$key0;
		if ( ! $val0 ) continue;
		
		$icon      = '<i class="li-icon i-album" data-menu="'.$GMODE.'"></i>';
		$name      = '<a class="name">'.$val0.'</a>';
		if ( ! $modeartist && $key1 ) {
			$val1 = $each->$key1;
			$name.= '<gr> • </gr>'.$val1;
		}
		$dataindex = dataIndex( $each->sort );
		$datamode  = property_exists( $each, 'path' ) ? $MODE : 'album'; // cue //////////////////////////////////////////////////////////////////
		$liname    = $modedate_genre ? $val1 : $val0;
		$html     .=
'<li data-mode="'.$datamode.'"'.$dataindex.'">
	<a class="liname">'.$liname.'</a>
	'.$icon.'<span class="single">'.$name.'</span>
</li>';
	}
	$html          .= indexBar( $indexes );
	echo $html;
}
function htmlList( $lists ) { // non-file 'list' command
	global $MODE, $GMODE, $html, $index0, $indexes;
	if ( $MODE !== 'album' && $MODE !== 'latest' ) {
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$dataindex = dataIndex( $data[ 0 ] );
			$name      = $data[ 1 ];
			$html     .=
'<li data-mode="'.$MODE.'"'.$dataindex.'>
	<a class="lipath">'.$name.'</a>
	'.i( $GMODE, $MODE ).'<span class="single name">'.$name.'</span>
</li>';
		}
	} else {
		global $display;
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$dataindex = dataIndex( $data[ 0 ] );
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
'<div class="coverart"'.$dataindex.'>
	<a class="lipath">'.$path.'</a>
	<a class="liname">'.$name.'</a>
	<div><img class="lazyload" data-src="'.$coverfile.'^^^"></div>
	<a class="coverart1">'.$l1.'</a>
	<a class="coverart2">'.$l2.'</a>
</div>';
		}
	}
	$html    .= indexBar( $indexes );
	echo $html;
}
function htmlRadio( $files, $subdirs = [], $dir = '' ) {
	global $MODE, $GMODE, $html, $index0, $indexes, $QUERY, $STRING;
	$search = $QUERY === 'search';
	if ( count( $subdirs ) ) {
		foreach( $subdirs as $subdir ) {
			$each          = ( object )[];
			$dirname       = basename( $subdir );
			$each->dir     = dirname( $subdir );
			$each->dirname = $dirname;
			$each->sort    = stripSort( $dirname );
			$array[]       = $each;
		}
		usort( $array, function( $a, $b ) {
			return strnatcasecmp( $a->sort, $b->sort );
		} );
		foreach( $array as $each ) {
			if ( count( $files ) ) {
				$html     .=
'<li class="dir">';
			} else {
				$dataindex = dataIndex( $each->sort );
				$html     .=
'<li class="dir"'.$dataindex.'>';
			}
			$html.=
	imgIcon( str_replace( '/srv/http', '', $each->dir ).'/thumb.jpg', 'wrdir' ).'
	<a class="lidir">'.$each->dir.'</a>
	<a class="lipath">'.$each->dirname.'</a>
	<span class="single name">'.$each->dirname.'</span>
</li>';
		}
	}
	if ( count( $files ) ) {
		unset( $array );
		foreach( $files as $file ) {
			$each          = ( object )[];
			$data          = file( $file, FILE_IGNORE_NEW_LINES );
			$name          = $data[ 0 ] ?? '';
			$each->charset = $data[ 2 ] ?? '';
			$each->file    = $file;
			$each->name    = $name;
			$each->sort    = stripSort( $name );
			$array[]       = $each;
		}
		usort( $array, function( $a, $b ) {
			return strnatcasecmp( $a->sort, $b->sort );
		} );
		$i = 0;
		foreach( $array as $each ) {
			$dataindex   = dataIndex( $each->sort );
			$datacharset = $each->charset ? ' data-charset="'.$each->charset.'"' : '';
			$filename    = basename( $each->file );
			$url         = str_replace( '|', '/', $filename );
			$thumbsrc    = substr( $each->file, 9, 14 ).'/img/'.$filename.'-thumb.jpg';
			$name      = $each->name;
			$html       .=
'<li class="file"'.$datacharset.$dataindex.'>
	'.imgIcon( $thumbsrc, 'webradio' ).'
	<a class="lidir">'.dirname( $each->file ).'</a>
	<a class="lipath">'.$url.'</a>
	<a class="liname">'.$name.'</a>';
			if ( $search ) $name = preg_replace( "/($STRING)/i", '<bll>$1</bll>', $name );
			if ( $GMODE === 'webradio' ) {
				$html.=
	'<div class="li1 name">'.$name.'</div>
	<div class="li2">'.$url.'</div>';
			} else {
				$html.=
	'<span class="single name">'.$name.'</span>';
			}
			$i++;
			$html.=
'</li>';
		}
	}
	if ( $search ) return $html;
	
	$html.= '</ul>'.indexBar( $indexes );
	echo $html;
}
function htmlTrack( $lists, $f, $filemode = '', $string = '' ) { // track list - no sort ($string: cuefile or search)
	if ( ! count( $lists ) ) {
		echo -1;
		exit;
//----------------------------------------------------------------------------------
	}
	global $GMODE, $html, $QUERY, $STRING;
	$search = $QUERY === 'search';
	if ( ! $search ) $html = str_replace( '">', ' track">' , $html );
	$fL         = count( $f );
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
	
	$hidecover  = exec( 'grep "hidecover.*true" '.$dirsystem.'display.json' );
	$cuefile    = preg_replace( "/\.[^.]+$/", '.cue', $file0 );
	if ( file_exists( '/mnt/MPD/'.$cuefile ) ) {
		$cue       = true;
		$cuename   = pathinfo( $cuefile, PATHINFO_BASENAME );
		$musicfile = exec( 'mpc ls "'.dirname( $cuefile ).'" | grep -v ".cue$" | head -1' );
		$ext       = pathinfo( $musicfile, PATHINFO_EXTENSION );
	} else {
		$cue = false;
	}
	if ( ! $hidecover && ! $search ) {
		if ( $ext !== 'wav' ) {
			$albumartist = $each0->albumartist;
		} else { // fix - mpd cannot read albumartist from *.wav
			$albumartist = exec( 'kid3-cli -c "get albumartist" "/mnt/MPD/'.$file0.'"' );
		}
		$album  = $each0->album;
		$artist = $albumartist ?: '';
		$iconartist   = 'albumartist';
		if ( ! $artist ) {
			$artist     = $each0->artist;
			$iconartist = 'artist';
		}
		$hidealbum     = $album && $GMODE !== 'album' ? '' : ' hide';
		$hideartist    = $artist && $GMODE !== 'artist' && $GMODE !== 'albumartist' ? '' : ' hide';
		$hidecomposer  = $each0->composer && $GMODE !== 'composer' ? '' : ' hide';
		$hideconductor = $each0->conductor && $GMODE !== 'conductor' ? '' : ' hide';
		$hidegenre     = $each0->genre && $GMODE !== 'genre' ? '' : ' hide';
		$hidedate      = $each0->date && $GMODE !== 'date' ? '' : ' hide';
		$mpdpath       = dirname( $file0 );
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
'<li data-mode="'.$GMODE.'" class="licover">
	<a class="lipath">'.$mpdpath.'</a>
	<div class="licoverimg"><img id="liimg" src="'.$coverart.'^^^"></div>
	<div class="liinfo '.$GMODE.'">
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
		if ( $search ) {
			$name      = $artist.' - '.$album;
			$title     = preg_replace( "/($string)/i", '<bll>$1</bll>', $title );
			$trackname = preg_replace( "/($string)/i", '<bll>$1</bll>', $name );
			$icon      = imgIcon( rawurlencode( '/mnt/MPD/'.dirname( $path ).'/thumb.jpg' ), 'music' );
		} else {
			$trackname = $cue ? $cuename.'/' : '';
			$trackname.= basename( $path );
		}
		if ( ! $title ) $title = pathinfo( $each->file, PATHINFO_FILENAME );
		$track1 = ( $i || $search || $hidecover ) ? '' : ' class="track1"';
		$i++;
		$html  .=
'<li data-mode="'.$GMODE.'" '.$track1.'>
	<a class="lipath">'.$path.'</a>
	'.$icon.'<div class="li1"><a class="name">'.$title.'</a><a class="time">'.$each->time.'</a></div>
	<div class="li2">'.$i.' • '.$trackname.'</div>
</li>';
	}
	if ( $search ) return $html;
	
	echo $html.'</ul>';
}
