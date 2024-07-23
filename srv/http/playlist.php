<?php
function output( $file = '' ) {
	global $add, $filecurrent, $html, $counthtml;
	if ( $file ) {
		$content   = file_get_contents( $filecurrent );
		$current   = json_decode( $content );
		$html      = $current->html;
		$counthtml = $current->counthtml;
	}
	$ces  = exec( 'mpc status %currenttime%^^%songpos%^^%consume%' );
	$ces  = explode( '^^', $ces );
	$mmss = explode( ':', $ces[ 0 ] );
	$data      = json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'elapsed'   => $mmss[ 0 ] * 60 + $mmss[ 1 ]
		, 'consume'   => $ces[ 2 ] === 'on'
		, 'librandom' => file_exists( '/srv/http/data/system/librandom' )
		, 'song'      => $ces[ 1 ] ? $ces[ 1 ] - 1 : 0
		, 'add'       => $add
	], JSON_NUMERIC_CHECK );
	echo $data;
	if ( ! $file ) file_put_contents( $filecurrent, $data );
}

if ( isset( $argv[ 1 ] ) ) {
	$playlist = $argv[ 1 ];
	unset( $argv );
} else {
	$playlist = $_POST[ 'playlist' ];
}
$filecurrent = '/srv/http/data/shm/playlist';
if ( $playlist === 'current' && file_exists( $filecurrent ) ) {
	output( 'filecurrent' );
	exit;
}

$add      = $playlist === 'add' ? true : false;
$headers  = [ 'http', 'rtmp', 'rtp:', 'rtsp' ];

include 'function.php';

if ( $playlist === 'list' ) {
	exec( 'mpc lsplaylists'
		, $lists );
	foreach( $lists as $list ) {
		$each       = ( object )[];
		$each->name = $list;
		$each->sort = stripSort( $list );
		$array[]    = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$index     = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$name      = $each->name;
		$html     .=
'<li class="pl-folder" data-index="'.$index.'">
	'.i( 'playlists', 'playlist' ).'
	<a class="liname">'.$name.'</a></i>
	<a class="lipath">'.$name.'</a></i>
	<span class="plname">'.$name.'</span>
</li>';
	}
	$indexbar  = indexBar( array_keys( array_flip( $indexes ) ) );
	$count     = count( $lists );
	$counthtml = '
&emsp;<span class="pl-title spaced">PLAYLISTS</span> &emsp; 
<wh id="pl-savedlist-count">'.number_format( $count ).'</wh>
'.i( 'file-playlist' );
	echo json_encode( [
		  'html'      => $html
		, 'index'     => $indexbar
		, 'counthtml' => $counthtml
		, 'indexes'   => $indexes
		, 'count'     => $count
	], JSON_NUMERIC_CHECK );
	exit;
//----------------------------------------------------------------------------------
}

$f      = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
$fL     = count( $f );
$format = '%'.implode( '%^^%', $f ).'%';
$cmd = 'mpc -f '.$format.' playlist';
if ( $playlist === 'get' ) {
	$name = $_POST[ 'name' ];
	$cmd .= ' "'.str_replace( '"', '\"', $name ).'"';
} else {
	$name = '';
}
exec( $cmd, $lists );
//----------------------------------------------------------------------------------
$countradio = 0;
$countsong  = 0;
$counttime  = 0;
$countupnp  = 0;
$pos        = 0;
$sec        = 0;
$html       = '';
foreach( $lists as $list ) {
	$pos++;
	$v = explode( '^^', $list );
	for ( $i = 0; $i < $fL; $i++ ) ${$f[ $i ]} = $v[ $i ];
	$fileheader = strtolower( substr( $file, 0, 4 ) );
	if ( ! in_array( $fileheader, $headers ) ) {
		$sec       = HMS2second( $time );
		$track     = preg_replace( '/^#*0*/', '', $list[ 6 ] );
		$li2       = '';
		if ( $track ) $li2.= '<a class="track">'.$track.'</a> - ';
		$artist    = $artist ?: $albumartist;
		$album     = $album;
		if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
		if ( $album )  $li2.= '<a class="album">'.$album.'</a>';
		if ( ! $artist && ! $album ) $li2.= $file;
		$datatrack = '';
		if ( strpos( $file, '.cue/track' ) ) {
			$datatrack = 'data-track="'.$track.'"'; // for cue in edit
			$file      = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
		}
		$title     = $title ?: pathinfo( $file, PATHINFO_FILENAME );
		$ext       = '';
		if ( substr( $file, 0, 4 ) === 'cdda' ) {
			if ( ! isset( $cdlist ) ) {
				$id     = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$cdfile = '/srv/http/data/audiocd/'.$id;
				$cdlist = file_exists( $cdfile ) ? file( '/srv/http/data/audiocd/'.$id, FILE_IGNORE_NEW_LINES ) : false;
			}
			if ( $cdlist ) {
				$track   = substr( $each->file, 8 );
				$data    = $cdlist[ $track - 1 ];
				$audiocd = explode( '^', $data );
				$artist  = $audiocd[ 0 ];
				$album   = $audiocd[ 1 ];
				$title   = $audiocd[ 2 ];
				$time    = second2HMS( $audiocd[ 3 ] );
				$track   = $track;
			}
			$class     = 'audiocd';
			$discid    = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
			$thumbsrc  = '/data/audiocd/'.$discid.'.jpg';
			$icon      = 'audiocd';
		} else {
			$class     = 'file';
			$discid    = '';
			$path      = pathinfo( $file, PATHINFO_DIRNAME );
			$thumbsrc  = '/mnt/MPD/'.rawurlencode( $path ).'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
			$icon      = 'music';
		}
		$icon = imgIcon( $thumbsrc, 'filesavedpl', $icon );
		$html    .=
'<li class="'.$class.'" '.$datatrack.'>
<a class="lipath">'.$file.'</a>
'.$icon.'<div class="li1"><span class="name">'.$title.'</span>
<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$time.'</a></span></div>
<div class="li2"><a class="pos">'.$pos.'</a> • <span class="name">'.$li2.'</span></div>
</li>';
		$countsong++;
		$counttime += $sec;
	} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
		$li2    = '';
		$artist = $artist;
		$album  = $album;
		if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
		if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
		if ( ! $artist && ! $album ) $li2.= $file;
		$html  .=
'<li class="upnp">
'.i( 'upnp', 'filesavedpl' ).'
<div class="li1"><span class="name">'.$title.'</span>
<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>
<div class="li2"><a class="pos">'.$pos.'</a> • <span class="name">'.$li2.'</span></div>
</li>';
		$countupnp++;
	} else {
		$urlname       = str_replace( '/', '|', $value );
		if ( str_contains( $file, '://' ) ) { // webradio / dabradio
			$urlname     = str_replace( '/', '|', $file );
			$type        = str_contains( $file, ':8554' ) ? 'dabradio' : 'webradio';
			$fileradio   = '/srv/http/data/'.$type.'/'.$urlname;
			if ( ! file_exists( $fileradio ) ) $fileradio = exec( 'find /srv/http/data/'.$type.'/ -name "'.$urlname.'" | head -1' );
			$stationname = $fileradio ? exec( 'head -1 "'.$fileradio.'"' ) : '';
		} else {
			$urlname     = str_replace( '#', '%23', $urlname );
			$stationname = '';
		}
		if ( $stationname !== '' ) {
			$notsaved    = 0;
			$thumbsrc    = '/data/'.$type.'/img/'.$urlname.'-thumb.jpg';
			$icon        = imgIcon( $thumbsrc, 'filesavedpl', 'webradio' );
		} else {
			$notsaved    = 1;
			$icon        = i( 'save savewr' ).i( 'webradio', 'filesavedpl' );
		}
		$classnotsaved = $notsaved ? ' notsaved' : '';
		$namenotsaved  = $notsaved ? '' : $stationname.' • ';
		$url           = preg_replace( '/#charset=.*/', '', $file );
		$path          = preg_replace( '/\?.*$/', '', $file );
		$html         .=
'<li class="webradio '.$classnotsaved.'">
<a class="lipath">'.$path.'</a>
'.$icon.'<a class="liname">'.$stationname.'</a><div class="li1"><span class="name">'.( $notsaved ? '. . .' : $stationname ).'</span>
<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>
<div class="li2"><a class="pos">'.$pos.'</a> • <span class="stationname hide">'.$namenotsaved.'</span><span class="name">'.$url.'</span></div>
</li>';
		$countradio++;
	}
}
$counthtml = '';
if ( $name ) {
	$counthtml.='<a class="lipath">'.$name.'</a><span class="pl-title name">'.i( 'file-playlist savedlist wh' ).$name.'&ensp;<gr> · </gr></span>';
}
if ( $countsong ) {
	$counthtml.='<wh id="pl-trackcount">'.number_format( $countsong ).'</wh>'.i( 'music' ).'<gr id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</gr>';
}
if ( $countradio ) $counthtml.= i( 'webradio' ).'<wh id="pl-radiocount">'.$countradio.'</wh>';
if ( $countupnp )  $counthtml.= '&emsp;'.i( 'upnp' );
output();
