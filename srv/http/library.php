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

$post    = ( object ) $_POST;
$GMODE   = $post->gmode ?? null;
$MODE    = $post->mode ?? null;
$STRING  = isset( $post->string ) ? escape( $post->string ) : null;
$f       = $post->format ?? [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'date', 'file', 'genre', 'time', 'title', 'track' ];
$format  = '%'.implode( '%^^%', $f ).'%';
$html    = '<ul id="lib-list" class="list">';
$index0  = '';
$indexes = [];
foreach( [ 'mpd', 'system', 'webradio' ] as $k ) ${'dir'.$k} = '/srv/http/data/'.$k.'/'; // $dirmpd $dirsystem $dirwebradio

switch( $post->library ) {

case 'find':
	$format = str_replace( '%artist%', '[%albumartist%|%artist%]', $format );
	if ( is_array( $MODE ) ) {
		exec( 'mpc find '.$MODE[ 0 ].' "'.$STRING[ 0 ].'" '.$MODE[ 1 ].' "'.$STRING[ 1 ].'" 2> /dev/null '
				."| sed 's|/[^/]*$||' "
				."| sort -u "
				."| awk 'NF && !a[$0]++'"
			, $lists );
		htmlDirectory();
		exit;
//----------------------------------------------------------------------------------
		$file = $lists[ 0 ];
		unset( $lists );
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
	if ( count( $f ) > 3 ) {
		htmlTrack();
	} else { // modes - album, composer, conductor, date, genre
		htmlFind();
	}
	break;
case 'findartist': // artist, albumartist
	exec( 'mpc find -f "'.$format.'" '.$MODE.' "'.$STRING.'" 2> /dev/null '
			."| sed 's|/[^/]*$||' "
			."| sort -u "
			."| awk 'NF && !a[$0]++'"
		, $lists );
	foreach( $lists as $list ) {
		$list       = explode( '^^', $list ); // album^^artist
		$each       = ( object ) [];
		$name       = $list[ 0 ];
		$each->name = $name;
		$each->sort = stripSort( $name );
		$each->path = $list[ 1 ];
		$array[]    = $each;
	}
	sortList( $array );
	foreach( $array as $each ) {
		$mode      = strtolower( explode( '/', $each->path )[ 0 ] );
		$dataindex = dataIndex( $each->sort );
		$icon      = imgIcon( rawurlencode( '/mnt/MPD/'.$each->path.'/thumb.jpg' ), 'folder' );
		$html     .= '
<li data-mode="'.$mode.'"'.$dataindex.'>'.$icon.'
<a class="lipath">'.$each->path.'</a>
<span class="single name">'.$each->name.'<gr> • '.$each->path.'</gr></span>
</li>';
	}
	$html.= indexBar( $indexes );
	echo $html;
	exit;
//----------------------------------------------------------------------------------
case 'home':
	$modes    = [ 'Album',  'Artist', 'Album Artist', 'Composer',  'Conductor', 'Date',      'Genre'
				, 'Latest', 'NAS',    'SD',           'USB',       'Playlists', 'Web Radio', 'DAB Radio' ];
	$htmlmode = '';
	foreach( $modes as $mode ) {
		$lipath   = str_replace( ' ', '', $mode );
		$modeLC   = strtolower( $lipath );
		$htmlmode.= '
<div class="mode '.$modeLC.'" data-mode="'.$modeLC.'">
	<i class="i-'.$modeLC.'"></i><gr></gr><a class="label">'.$mode.'</a>
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
			$htmlmode.= '
<div class="mode bookmark '.$bkradio.'">
	<a class="lipath">'.$bkpath.'</a>
	<a class="bkname hide">'.$name.'</a>
	<img class="bkcoverart" src="'.$src.'^^^">
</div>';
		}
	}
	$order    = file_exists( $dirsystem.'order.json' ) ? json_decode( file_get_contents( $dirsystem.'order.json' ) ) : false;
	echo json_encode( [
		  'html'  => $htmlmode
		, 'order' => $order
	] );
	break;
case 'list':
	$filemode = $dirmpd.$MODE;
	if ( in_array( $MODE, [ 'album', 'latest' ] ) ) {
		$display = json_decode( file_get_contents( $dirsystem.'display.json' ) );
		if ( $display->albumbyartist ) $filemode.= 'byartist';
		if ( $display->albumyear ) $filemode.= '-year';
	}
	$lists = file( $filemode, FILE_IGNORE_NEW_LINES );
	if ( count( $lists ) ) htmlList();
	break;
case 'ls':
	if ( in_array( $STRING, [ 'NAS', 'SD', 'USB' ] ) ) { // file modes - show all dirs in root
		exec( 'ls -d /mnt/MPD/'.$STRING.'/* | sed -E -e "s|^/mnt/MPD/||" -e "/NAS\/data$/ d"', $lists );
		htmlDirectory();
		exit;
//----------------------------------------------------------------------------------
	}
	exec( 'mpc ls "'.$STRING.'" 2> /dev/null'
		, $lists );
	if ( ! count( $lists ) ) exit;
//----------------------------------------------------------------------------------
	if ( $MODE !== 'album' ) {
		foreach( $lists as $mpdpath ) {
			if ( is_dir( '/mnt/MPD/'.$mpdpath ) ) {
				htmlDirectory();
				exit;
//----------------------------------------------------------------------------------
			}
		}
	}
	$plfiles = preg_grep( '/.cue$|.m3u$|.m3u8$|.pls$/', $lists ); // parse if cue|m3u,|pls files
	unset( $lists );
	if ( count( $plfiles ) ) {
		$plfiles = array_unique( $plfiles ); // fix: ls lists *.cue twice
		$cue     = substr( $plfiles[ 0 ], -3 ) === 'cue';
		$type    = $cue ? 'ls' : 'playlist';
		foreach( $plfiles as $file ) {
			exec( 'mpc -f "'.$format.'" '.$type.' "'.$file.'" 2> /dev/null'
				, $lists );
		}
	} else {
		exec( 'mpc ls -f "'.$format.'" "'.$STRING.'" 2> /dev/null'
			, $lists );
		if ( strpos( $lists[ 0 ],  '.wav^^' ) ) { // MPD not sort *.wav
			unset( $lists );
			exec( 'mpc ls -f "%track%__'.$format.'" "'.$STRING.'" 2> /dev/null '
					.'| sort -h '
					.'| sed "s/^.*__//"'
				, $lists );
		}
	}
	htmlTrack();
	break;
case 'radio':
	$dir     = '/srv/http/data/'.$GMODE.'/'.$STRING;
	$subdirs = [];
	$files   = [];
	exec( 'ls "'.$dir.'" | grep -E -v "^img|\.jpg$|\.gif$"'
		, $lists );
	foreach( $lists as $list ) {
		$path = $dir.'/'.$list;
		if ( is_dir( $path ) ) {
			$subdirs[] = $path;
		} else {
			$files[] = $path;
		}
	}
	htmlRadio();
	break;
case 'search':
	$search = true;
	$html   = str_replace( 'lib', 'search', $html );
	$count  = 0;
	foreach( [ 'title', 'albumartist', 'artist', 'album', 'composer', 'conductor' ] as $tag ) {
		unset( $lists );
		if ( $tag === 'title' ) {
			$f      = [ 'album', 'albumartist', 'artist', 'file', 'title', 'time', 'track' ];
			$format = '%'.implode( '%^^%', $f ).'%';
			exec( 'mpc search -f "'.$format.'" '.$tag.' "'.$STRING.'" | awk NF'
				, $lists );
		} else {
			$suffix = $tag === 'album' ? '.*^^.*^^' : '';
			exec( 'grep -i "^.^^.*'.$STRING.$suffix.'" '.$dirmpd.$tag
				, $lists );
		}
		$c     = count( $lists );
		if ( ! $c ) continue;
		
		$count+= $c;
		if ( $tag === 'title' ) {
			$GMODE  = 'file';
			htmlTrack();
		} else {
			foreach( $lists as $list ) {
				$data = explode( '^^', $list );
				$name = $data[ 1 ];
				$path = $tag === 'album' ? end( $data ) : $name;
				$html.= '
<li data-mode="'.$tag.'">
	<a class="lipath">'.$path.'</a>
	'.i( $tag, $tag ).'<span class="single name">'.preg_replace( "/($STRING)/i", '<bll>$1</bll>', $name ).'</span>
</li>';
			}
		}
	}
	exec( "grep -m1 -rin '$STRING' /srv/http/data/*radio --exclude-dir img | sed -n '/:1:/ {s/:1:.*//; p}'"
		, $files );
	$c     = count( $files );
	if ( $c ) htmlRadio();
	$count+= $c;
	if ( $count ) {
		echo json_encode( [ 'html' => $html.'</ul>', 'count' => $count ] );
	} else {
		echo -1;
	}
	break;
case 'track': // for tag editor
	$file  = escape( $post->file );
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
function htmlDirectory() {
	global $GMODE, $html, $index0, $indexes, $lists;
	foreach( $lists as $list ) {
		$dir        = basename( $list );
		$each       = ( object ) [];
		$each->path = $list;
		$each->dir  = $dir;
		$each->sort = stripSort( $dir );
		$array[]    = $each;
	}
	sortList( $array );
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
		$htmlli   = '
<li data-mode="'.$mode.'"'.$dataindex.'>'.$icon.'
	<a class="lipath">'.$path.'</a>
	<span class="single name">'.$name.'</span>
</li>';
		$dir ? $html.= $htmlli : $htmlf.= $htmlli;
	}
	$html .= $htmlf.indexBar( $indexes );
	echo $html;
}
function htmlFind() { // non-file 'find' command
	global $f, $lists, $MODE, $GMODE, $html, $index0, $indexes;
	$fL = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list ); // album^^artist
		$each = ( object ) [];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key        = $f[ $i ];
			$each->$key = $list[ $i ];
			$each->sort = stripSort( $list[ 0 ] ).stripSort( $list[ 1 ] );
		}
		if ( isset( $list[ $fL ] ) ) $each->path = $list[ $fL ];
		$array[] = $each;
	}
	sortList( $array );
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
		$html     .= '
<li data-mode="'.$datamode.'"'.$dataindex.'">
	<a class="liname">'.$liname.'</a>
	'.$icon.'<span class="single">'.$name.'</span>
</li>';
	}
	$html          .= indexBar( $indexes );
	echo $html;
}
function htmlList() { // non-file 'list' command
	global $lists, $MODE, $GMODE, $html, $index0, $indexes;
	if ( ! in_array( $MODE, [ 'album', 'latest' ] ) ) {
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$dataindex = dataIndex( $data[ 0 ] );
			$name      = $data[ 1 ];
			$html     .= '
<li data-mode="'.$MODE.'"'.$dataindex.'>
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
			if ( $display->albumbyartist ) {
				$artist = $data[ 1 ];
				$l1     = $artist;
				if ( $display->albumyear ) {
					$year  = $data[ 2 ];
					$album = $data[ 3 ];
					$l2    = $year ? ( strlen( $year ) < 5 ? $year : date( 'Y', strtotime( $year ) ) ) : '...';
					$l2   .= '<br>'.$album;
				} else {
					$album = $data[ 2 ];
					$l2    = $album;
				}
			} else {
				$album  = $data[ 1 ];
				$artist = $data[ 2 ];
				$l1     = $album;
				$l2     = $artist;
			}
			$html     .= '
<div class="coverart"'.$dataindex.'>
	<a class="lipath">'.$path.'</a>
	<a class="liname">'.$album.'</a>
	<div><img class="lazyload" data-src="'.$coverfile.'^^^"></div>
	<a class="coverart1">'.$l1.'</a>
	<a class="coverart2">'.$l2.'</a>
</div>';
		}
	}
	$html    .= indexBar( $indexes );
	echo $html;
}
function htmlRadio() {
	global $dir, $files, $html, $index0, $indexes, $search, $STRING, $subdirs;
	if ( ! $search && count( $subdirs ) ) {
		foreach( $subdirs as $subdir ) {
			$each          = ( object ) [];
			$dirname       = basename( $subdir );
			$each->dir     = $subdir;
			$each->dirname = $dirname;
			$each->sort    = stripSort( $dirname );
			$array[]       = $each;
		}
		sortList( $array );
		foreach( $array as $each ) {
			$dataindex = count( $files ) ? '' : dataIndex( $each->sort );
			$html.= '
<li class="dir"'.$dataindex.'>
	'.imgIcon( str_replace( '/srv/http', '', $each->dir ).'/thumb.jpg', 'wrdir' ).'
	<a class="lidir">'.$each->dir.'</a>
	<a class="lipath">'.$each->dirname.'</a>
	<span class="single name">'.$each->dirname.'</span>
</li>';
		}
	}
	if ( count( $files ) ) {
		unset( $array );
		foreach( $files as $file ) {
			$each          = ( object ) [];
			$data          = file( $file, FILE_IGNORE_NEW_LINES );
			$name          = $data[ 0 ] ?? '';
			$each->charset = $data[ 2 ] ?? '';
			$each->file    = $file;
			$each->name    = $name;
			$each->sort    = stripSort( $name );
			$array[]       = $each;
		}
		sortList( $array );
		$i = 0;
		foreach( $array as $each ) {
			$dataindex   = $search ? '' : dataIndex( $each->sort );
			$datacharset = $each->charset ? ' data-charset="'.$each->charset.'"' : '';
			$filename    = basename( $each->file );
			$url         = str_replace( '|', '/', $filename );
			$thumbsrc    = substr( $each->file, 9, 14 ).'/img/'.$filename.'-thumb.jpg';
			$icon        = $search ? i( 'webradio', 'webradio' ) : imgIcon( $thumbsrc, 'webradio' );
			$name        = $each->name;
			$html       .= '
<li class="file"'.$datacharset.$dataindex.'>
	'.$icon.'
	<a class="lidir">'.dirname( $each->file ).'</a>
	<a class="lipath">'.$url.'</a>
	<a class="liname">'.$name.'</a>';
			if ( $search ) $name = preg_replace( "/($STRING)/i", '<bll>$1</bll>', $name );
			if ( substr( $each->file, 15, 8 ) === 'webradio' ) {
				$html.=
	'<div class="li1 name">'.$name.'</div>
	<div class="li2">'.$url.'</div>';
			} else {
				$html.=
	'<span class="single name">'.$name.'</span>';
			}
			$i++;
			$html.= '
</li>';
		}
	}
	if ( $search ) return $html;
	
	$html.= '</ul>'.indexBar( $indexes );
	echo $html;
}
function htmlTrack() { // track list - no sort ($string: cuefile or search)
	global $lists;
	if ( ! count( $lists ) ) {
		echo -1;
		exit;
//----------------------------------------------------------------------------------
	}
	global $cue, $f, $GMODE, $html, $search, $STRING, $tag;
	if ( ! $search ) $html = str_replace( '">', ' track">' , $html );
	$fL         = count( $f );
	foreach( $lists as $list ) {
		if ( $list === '' ) continue;
		
		$list = explode( '^^', $list );
		$each = ( object ) [];
		for ( $i = 0; $i < $fL; $i++ ) $each->{$f[ $i ]} = $list[ $i ];
		$array[] = $each;
	}
	$each0      = $array[ 0 ];
	$file0      = $each0->file;
	$ext        = pathinfo( $file0, PATHINFO_EXTENSION );
	$hidecover  = exec( 'grep "hidecover.*true" '.$dirsystem.'display.json' );
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
		$hhmmss        = array_column( $array, 'time' );
		$seconds       = 0;
		foreach( $hhmmss as $hms ) $seconds += HMS2second( $hms ); // hh:mm:ss > seconds
		$totaltime     = second2HMS( $seconds );
		$file0         = $cue ? dirname( $each0->file ) : $each0->file;
		$args          = escape( implode( "\n", [ 'cmd', $artist, $album, $file0, 'CMD ARTIST ALBUM FILE' ] ) );
		$coverart      = exec( '/usr/bin/sudo /srv/http/bash/status-coverart.sh "'.$args.'"' );
		if ( ! $coverart ) $coverart = '/assets/img/coverart.svg';
		$br            = ! $hidegenre || !$hidedate ? '<br>' : '';
		$mpdpath       = str_replace( '\"', '"', $mpdpath );
		$count         = count( $array );
		if ( $cue || $plfile ) {
			$ext     = $cue ? 'cue' : pathinfo( $plfile, PATHINFO_EXTENSION );
			$exticon = i( 'playlists' );
		} else {
			$exticon = '';
		}
		$icon          = i( 'music', 'folder' );
		$html         .= '
<li data-mode="'.$GMODE.'" class="licover">
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
	'.$icon.$count.'<gr> • </gr>'.$totaltime.'&emsp;<c>'.strtoupper( $ext ).'</c>'.$exticon.'
	</div>
</li>';
	}
	$i    = 0;
	foreach( $array as $each ) {
		if ( ! $each->time ) continue;
		
		$path   = $each->file;
		$album  = $each->album;
		$artist = $each->artist;
		$title  = $each->title;
		if ( ! $title ) $title = pathinfo( $each->file, PATHINFO_FILENAME );
		if ( $search ) {
			$datamode  = '';
			$icon      = i( $tag, 'file' );
			$$tag      = preg_replace( "/($STRING)/i", '<bll>$1</bll>', $each->$tag );
			$trackname = $tag === 'albumartist' ? $albumartist : $artist;
			$trackname.= ' - '.$album;
		} else {
			$datamode  = ' data-mode="'.$GMODE.'"';
			$icon      = i( 'music', 'file' );
			$trackname = $cue ? $artist.' - '.$album : basename( $path );
		}
		$track1 = ( $i || $search || $hidecover ) ? '' : ' class="track1"';
		$i++;
		$html  .= '
<li'.$datamode.$track1.'>
	<a class="lipath">'.$path.'</a>
	'.$icon.'<div class="li1"><a class="name">'.$title.'</a><a class="time">'.$each->time.'</a></div>
	<div class="li2">'.$i.' • '.$trackname.'</div>
</li>';
	}
	if ( $search ) return $html;
	
	echo $html.'</ul>';
}
