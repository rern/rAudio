<?php
include 'function.php'; // $hash

$post         = ( object ) $_POST;
$CMD          = $post->playlist ?? $argv[ 1 ]; // current / list
$fileplaylist = '/srv/http/data/shm/playlist';
$filecount    = $fileplaylist.'count';

function output() {
	global $CMD, $counthtml, $filecount, $fileplaylist, $html;
	$cscl = exec( 'mpc status %currenttime%^^%songpos%^^%consume%^^%length%' );
	$cscl = explode( '^^', $cscl );
	$mmss = explode( ':', $cscl[ 0 ] );
	$data = json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'elapsed'   => $mmss[ 0 ] * 60 + $mmss[ 1 ]
		, 'consume'   => $cscl[ 2 ] === 'on'
		, 'librandom' => file_exists( '/srv/http/data/system/librandom' )
		, 'song'      => $cscl[ 1 ] ? $cscl[ 1 ] - 1 : 0
		, 'add'       => $CMD === 'add'
	], JSON_NUMERIC_CHECK );
	echo $data;
	if ( $CMD === 'current' ) {
		if ( $cscl[ 3 ] < 200 ) { // no cache - < 200 tracks
			if ( file_exists( $fileplaylist ) ) {
				unlink( $fileplaylist );
				unlink( $filecount );
			}
		} else if ( ! file_exists( $fileplaylist ) ) {
			file_put_contents( $fileplaylist, $html );
			file_put_contents( $filecount, $counthtml );
		}
	}
}

if ( $CMD === 'current' && file_exists( $fileplaylist ) ) {
	$html      = file_get_contents( $fileplaylist );
	$counthtml = file_get_contents( $filecount );
	output();
	exit;
}

if ( $CMD === 'list' ) {
	exec( 'mpc lsplaylists'
		, $lists );
	if ( ! count( $lists ) ) exit;
	
	foreach( $lists as $list ) {
		$each       = ( object ) [];
		$each->name = $list;
		$each->sort = stripSort( $list );
		$array[]    = $each;
	}
	sortList( $array );
	$html      = '';
	$index0    = '';
	$indexes   = [];
	foreach( $array as $each ) {
		$dataindex = dataIndex( $each->sort );
		$name      = $each->name;
		$html     .=
'<li '.$dataindex.'>'.
	icon(  'playlists', 'playlist' ).'<a class="lipath">'.$name.'</a><a class="single">'.$name.'</a>'.
'</li>
';
	}
	$html     .= indexBar( $indexes );
	echo json_encode( [
		  'html'    => $html
		, 'indexes' => $indexes
		, 'count'   => count( $lists )
	], JSON_NUMERIC_CHECK );
	exit;
//----------------------------------------------------------------------------------
}

function artistAlbum( $artist, $album, $file ) {
	$ar_al = '';
	if ( $artist || $album ) {
		if ( $artist )           $ar_al.= $artist;
		if ( $artist && $album ) $ar_al.= ' - ';
		if ( $album )            $ar_al.= $album;
		return '<a class="ar_al">'.$ar_al.'</a>';
	} else {
		return $file;
	}
}

$f      = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
$fL     = count( $f );
$format = '%'.implode( '%^^%', $f ).'%';
$cmd    = 'mpc -f '.$format.' playlist';
if ( $CMD === 'get' ) {
	$name = $post->name;
	$cmd .= ' "'.str_replace( '"', '\"', $name ).'"';
} else {
	$name = '';
}
exec( $cmd, $lists );
//..............................................................................
$count  = ( object ) [];
foreach( [ 'radio', 'song', 'time', 'upnp' ] as $c ) $count->$c = 0;
$song   = 0;
$sec    = 0;
$ip     = exec( '/srv/http/bash/status -I' );
$upnp   = 'http://'.substr( $ip, 0, strrpos( $ip, '.' ) );
$html   = '';
foreach( $lists as $list ) {
	$song++;
	$pos     = '<a class="pos">'.$song.'</a>';
	$v       = explode( '^^', $list );
	for ( $i = 0; $i < $fL; $i++ ) ${$f[ $i ]} = $v[ $i ];
	$file0   = $file[ 0 ];
// file ........................................................................
	if ( isMpdPath( $file0 ) ) { // USB/...
		$sec  = HMS2second( $time );
		if ( $track ) $track = preg_replace( '/^#*0*/', '', $track );
		if ( ! $artist ) $artist = $albumartist;
		$datatrack = '';
		if ( strpos( $file, '.cue/track' ) ) {
			$datatrack = 'data-track="'.$track.'"'; // for cue in edit
			$file      = dirname( $file );
		}
		$title     = $title ?: pathinfo( $file, PATHINFO_FILENAME );
		$path      = pathinfo( $file, PATHINFO_DIRNAME );
		$thumbsrc  = '/mnt/MPD/'.$path.'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
		$icon      = iconThumb( $thumbsrc, 'filesavedpl' );
		$li2       = $pos.' • '.$track.' - '.artistAlbum( $artist, $album, $file );
		$html     .=
'<li class="music" '.$datatrack.'>'.
	'<a class="lipath">'.$file.'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$time.'</a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->song++;
		$count->time += $sec;
		continue;
	}
// upnp ........................................................................
	if ( str_starts_with( $file, $upnp ) ) { // http://192...
		$li2       = $pos.' • '.artistAlbum( $artist, $album, $file );
		$html     .=
'<li class="upnp">'.
	icon(  'upnp', 'filesavedpl' ).
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->upnp++;
		continue;
	}
// webradio ....................................................................
	if ( $file0 === 'h' || $file0 === 'r' ) { // http://... or rtsp://...
		$station  = '';
		$dirradio = radioDir( $file );
		if ( $dirradio ) {
			$station = basename( $dirradio );
			$icon    = iconThumb( $dirradio.'/thumb.jpg', 'filesavedpl' );
		} else {
			$icon    = icon( $file[ 0 ] === 'h' ? 'webradio': 'dabradio' );
		}
		$li2     = $pos.'<a class="artist hide"></a><a class="station hide">';
		if ( $station ) {
			$notsaved = '';
			$li2     .= $station;
		} else {
			$notsaved = ' notsaved';
			$icon     = icon( 'save savewr' ).icon( 'webradio', 'filesavedpl' );
			$station  = '. . .';
		}
		$li2    .= '</a><a class="url">'.preg_replace( '/#charset=.*/', '', $file ).'</a>';
		$html   .=
'<li class="webradio '.$notsaved.'">'.
	'<a class="lipath">'.preg_replace( '/\?.*$/', '', $file ).'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$station.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->radio++;
		continue;
	}
// audio cd ....................................................................
	if ( $file0 === 'c' ) { // cdda://...
		if ( ! isset( $discid ) ) {
			$discid = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$cdfile = '/srv/http/data/audiocd/'.$discid.'/data';
			if ( file_exists( $cdfile ) ) {
				$cdlist = file_exists( $cdfile ) ? file( $cdfile, FILE_IGNORE_NEW_LINES ) : false;
				$cdalbum  = $cdlist[ 0 ];
				$cdsrc    = '/data/audiocd/'.$discid.'/cover.jpg';
			}
		}
		if ( isset( $cdlist ) ) {
			$track = explode( '///', $file )[ 1 ];
			[ $artist, $title, $sec ] = explode( '^^', $cdlist[ $track + 1 ] );
			$time = second2HMS( $sec );
		}
		$icon      = iconThumb( $cdsrc, 'filesavedpl' );
		$li2       = $pos.' • '.$track.' - '.artistAlbum( $artist, $cdalbum, $file );
		$html     .=
'<li class="audiocd">'.
	'<a class="lipath">'.$file.'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$time.'</a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->song++;
		$count->time += $sec;
	}
}

$counthtml = '';
if ( $name ) {
	$counthtml.='<a class="lipath">'.$name.'</a><span class="name">'.icon(  'playlists savedlist' ).$name.'</span> <gr>·</gr>';
}
if ( $count->song ) {
	$counthtml.= '<a id="pl-trackcount">'.number_format( $count->song ).'</a>'.icon(  'music' ).'<a id="pl-time" data-time="'.$count->time.'">'.second2HMS( $count->time ).'</a>';
}
if ( $count->radio ) $counthtml.= icon(  'webradio' ).'<a id="pl-radiocount">'.$count->radio.'</a>';
if ( $count->upnp )  $counthtml.= '&emsp;'.icon(  'upnp' );
output();
