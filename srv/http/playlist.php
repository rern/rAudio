<?php
$post         = ( object ) $_POST;
$CMD          = $post->playlist ?? $argv[ 1 ];
$fileplaylist = '/srv/http/data/shm/playlist';

function output( $fromfile = '' ) {
	global $CMD, $counthtml, $fileplaylist, $html;
	if ( $fromfile ) {
		$html      = file_get_contents( $fileplaylist );
		$counthtml = file_get_contents( $fileplaylist.'count' );
	}
	$csc  = exec( 'mpc status %currenttime%^^%songpos%^^%consume%' );
	$csc  = explode( '^^', $csc );
	$mmss = explode( ':', $csc[ 0 ] );
	$data = json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'elapsed'   => $mmss[ 0 ] * 60 + $mmss[ 1 ]
		, 'consume'   => $csc[ 2 ] === 'on'
		, 'librandom' => file_exists( '/srv/http/data/system/librandom' )
		, 'song'      => $csc[ 1 ] ? $csc[ 1 ] - 1 : 0
		, 'add'       => $CMD === 'add'
	], JSON_NUMERIC_CHECK );
	echo $data;
	if ( ! $fromfile && $CMD !== 'get' ) {
		file_put_contents( $fileplaylist, $html );
		file_put_contents( $fileplaylist.'count', $counthtml );
	}
}

if ( $CMD === 'current' && file_exists( $fileplaylist ) ) {
	output( 'fromfile' );
	exit;
}

include 'function.php';

if ( $CMD === 'list' ) {
	exec( 'mpc lsplaylists'
		, $lists );
	foreach( $lists as $list ) {
		$each       = ( object ) [];
		$each->name = $list;
		$each->sort = stripSort( $list );
		$array[]    = $each;
	}
	sortList( $array );
	$html      = '<ul id="pl-savedlist" class="list">';
	$index0    = '';
	$indexes   = [];
	foreach( $array as $each ) {
		$dataindex = dataIndex( $each->sort );
		$name      = $each->name;
		$html     .=
'<li class="pl-folder"'.$dataindex.'>'.
	i( 'playlists', 'playlist' ).'<a class="lipath">'.$name.'</a><a class="single">'.$name.'</a>'.
'</li>
';
	}
	$html     .= indexBar( $indexes );
	$count     = count( $lists );
	$counthtml = 'PLAYLISTS&emsp;<a id="pl-savedlist-count">'.number_format( $count ).'</a>'.i( 'file-playlist' );
	echo json_encode( [
		  'html'      => $html
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
$cmd    = 'mpc -f '.$format.' playlist';
if ( $CMD === 'get' ) {
	$name = $post->name;
	$cmd .= ' "'.str_replace( '"', '\"', $name ).'"';
} else {
	$name = '';
}
exec( $cmd, $lists );
//----------------------------------------------------------------------------------
$count  = ( object ) [];
foreach( [ 'radio', 'song', 'time', 'upnp' ] as $c ) $count->$c = 0;
$pos    = 0;
$sec    = 0;
$html   = '';
foreach( $lists as $list ) {
	$pos++;
	$v      = explode( '^^', $list );
	for ( $i = 0; $i < $fL; $i++ ) ${$f[ $i ]} = $v[ $i ];
	$header = strtolower( substr( $file, 0, 4 ) );
	if ( ! in_array( $header, [ 'http', 'rtmp', 'rtp:', 'rtsp' ] ) ) {
		$sec       = HMS2second( $time );
		$li2       = '';
		if ( $track ) {
			$track = preg_replace( '/^#*0*/', '', $track );
			$li2  .= '<a class="track">'.$track.'</a> - ';
		}
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
			$discid    = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$cdfile    = '/srv/http/data/audiocd/'.$discid;
			if ( ! isset( $cdlist ) ) {
				$cdlist = file_exists( $cdfile ) ? file( $cdfile, FILE_IGNORE_NEW_LINES ) : false;
			}
			if ( $cdlist ) {
				$track   = substr( $file, 8 );
				$data    = $cdlist[ $track - 1 ];
				$audiocd = explode( '^', $data );
				$artist  = $audiocd[ 0 ];
				$album   = $audiocd[ 1 ];
				$title   = $audiocd[ 2 ];
				$time    = second2HMS( $audiocd[ 3 ] );
				$track   = $track;
				$li2     = '<a class="track">'.$track.'</a> - <a class="artist">'.$artist.'</a> - <a class="album">'.$album.'</a>';
			}
			$class     = 'audiocd';
			$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
			$thumbsrc  = '/data/audiocd/'.$discid.'.jpg';
			$icon      = imgIcon( $thumbsrc, 'filesavedpl', 'audiocd' );
		} else {
			$class     = 'file';
			$discid    = '';
			$path      = pathinfo( $file, PATHINFO_DIRNAME );
			$thumbsrc  = '/mnt/MPD/'.rawurlencode( $path ).'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
			$icon      = imgIcon( $thumbsrc, 'filesavedpl', 'music' );
		}
		$html     .=
'<li class="'.$class.'" '.$datatrack.'>'.
	'<a class="lipath">'.$file.'</a>'.
	$icon.'<div class="li1"><a class="name">'.$title.'</a>'.
	'<a class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$time.'</a></a></div>'.
	'<div class="li2"><a class="pos">'.$pos.'</a> • <a class="name">'.$li2.'</a></div>'.
'</li>
';
		$count->song++;
		$count->time += $sec;
	} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
		$li2    = '';
		$artist = $artist;
		$album  = $album;
		if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
		if ( $album )  $li2.= '<a class="album">'.$album.'</a>';
		if ( ! $artist && ! $album ) $li2.= $file;
		$html  .=
'<li class="upnp">'.
	i( 'upnp', 'filesavedpl' ).
	'<div class="li1"><a class="name">'.$title.'</a>'.
	'<a class="duration"><a class="elapsed"></a><a class="time"></a></a></div>'.
	'<div class="li2"><a class="pos">'.$pos.'</a> • <a class="name">'.$li2.'</a></div>'.
'</li>
';
		$count->upnp++;
	} else {
		if ( str_contains( $file, '://' ) ) { // webradio / dabradio
			$urlname     = str_replace( '/', '|', $file );
			$radio       = str_contains( $file, ':8554' ) ? 'dabradio' : 'webradio';
			$fileradio   = '/srv/http/data/'.$radio.'/'.$urlname;
			if ( ! file_exists( $fileradio ) ) $fileradio = exec( 'find /srv/http/data/'.$radio.'/ -name "'.$urlname.'" | head -1' );
			$stationname = $fileradio ? exec( 'head -1 "'.$fileradio.'"' ) : '';
		} else {
			$urlname     = str_replace( '#', '%23', $urlname );
			$stationname = '';
		}
		if ( $stationname !== '' ) {
			$notsaved    = 0;
			$thumbsrc    = '/data/'.$radio.'/img/'.$urlname.'-thumb.jpg';
			$icon        = imgIcon( $thumbsrc, 'filesavedpl', $radio );
		} else {
			$notsaved    = 1;
			$icon        = i( 'save savewr' ).i( 'webradio', 'filesavedpl' );
		}
		$classnotsaved = $notsaved ? ' notsaved' : '';
		$namenotsaved  = $notsaved ? '' : $stationname.' • ';
		$url           = preg_replace( '/#charset=.*/', '', $file );
		$path          = preg_replace( '/\?.*$/', '', $file );
		$html         .=
'<li class="webradio '.$classnotsaved.'">'.
	'<a class="lipath">'.$path.'</a>'.
	$icon.'<a class="liname">'.$stationname.'</a><div class="li1"><a class="name">'.( $notsaved ? '. . .' : $stationname ).'</a>'.
	'<a class="duration"><a class="elapsed"></a><a class="time"></a></a></div>'.
	'<div class="li2"><a class="pos">'.$pos.'</a> • <a class="stationname hide">'.$namenotsaved.'</a><a>'.$url.'</a></div>'.
'</li>
';
		$count->radio++;
	}
}
$counthtml = '';
if ( $name ) {
	$counthtml.='<a class="lipath">'.$name.'</a><a class="title name">'.i( 'file-playlist savedlist' ).$name.'&ensp;<gr> · </gr></a>';
}
if ( $count->song ) {
	$counthtml.= '<a id="pl-trackcount">'.number_format( $count->song ).'</a>'.i( 'music' ).'<gr id="pl-time" data-time="'.$count->time.'">'.second2HMS( $count->time ).'</gr>';
}
if ( $count->radio ) $counthtml.= i( 'webradio' ).'<a id="pl-radiocount">'.$count->radio.'</a>';
if ( $count->upnp )  $counthtml.= '&emsp;'.i( 'upnp' );
output();
