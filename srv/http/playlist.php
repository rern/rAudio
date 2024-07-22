<?php
if ( isset( $argv[ 1 ] ) ) {
	$playlist = $argv[ 1 ];
	unset( $argv );
} else {
	$playlist = $_POST[ 'playlist' ];
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
if ( ! count( $lists ) ) exit( '-1' );
//----------------------------------------------------------------------------------
foreach( $lists as $list ) {
	$v       = explode( '^^', $list );
	$each    = ( object )[];
	for ( $i = 0; $i < $fL; $i++ ) {
		$key        = $f[ $i ];
		$value      = $v[ $i ];
		$each->$key = $value;
		if ( $key !== 'file' ) continue;
		
		$header = strtolower( substr( $value, 0, 4 ) );
		if ( $header === 'cdda' ) {
			if ( ! isset( $cdlist ) ) {
				$id     = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$cdfile = '/srv/http/data/audiocd/'.$id;
				$cdlist = file_exists( $cdfile ) ? file( '/srv/http/data/audiocd/'.$id, FILE_IGNORE_NEW_LINES ) : false;
			}
			if ( $cdlist ) {
				$track        = substr( $each->file, 8 );
				$data         = $cdlist[ $track - 1 ];
				$audiocd      = explode( '^', $data );
				$each->artist = $audiocd[ 0 ];
				$each->album  = $audiocd[ 1 ];
				$each->title  = $audiocd[ 2 ];
				$each->time   = second2HMS( $audiocd[ 3 ] );
				$each->track  = $track;
			}
		} else if ( in_array( $header, $headers ) ) {
			$urlname       = str_replace( '/', '|', $value );
			$radiofile     = '/srv/http/data/webradio/'.$urlname;
			if ( ! file_exists( $radiofile ) ) {
				$radiofile = exec( 'find /srv/http/data/webradio/ -name "'.$urlname.'"' );
				$radioname = $radiofile ? exec( 'sed -n "1 {s/#charset=.*$//; p}" "'.$radiofile.'"' ) : '';
			}
			$each->name    = $radioname;
			$each->urlname = $urlname;
		}
	}
	$array[] = $each;
}
$countradio = 0;
$countsong  = 0;
$counttime  = 0;
$countupnp  = 0;
$i          = 0;
$html       = '';
foreach( $array as $list ) {
	$sec        = 0;
	$i++;
	$file       = $list->file;
	$fileheader = strtolower( substr( $file, 0, 4 ) );
	if ( ! in_array( $fileheader, $headers ) ) {
		$sec       = HMS2second( $list->time );
		$track     = preg_replace( '/^#*0*/', '', $list->track );
		$li2       = '';
		if ( $track ) $li2.= '<a class="track">'.$track.'</a> - ';
		$artist    = $list->artist ?: $list->albumartist;
		$album     = $list->album;
		if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
		if ( $album )  $li2.= '<a class="album">'.$album.'</a>';
		if ( ! $artist && ! $album ) $li2.= $file;
		$datatrack = '';
		if ( strpos( $file, '.cue/track' ) ) {
			$datatrack = 'data-track="'.$track.'"'; // for cue in edit
			$file      = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
		}
		$title     = $list->title ?: pathinfo( $file, PATHINFO_FILENAME );
		$ext       = '';
		if ( substr( $file, 0, 4 ) !== 'cdda' ) {
			$class     = 'file';
			$discid    = '';
			$path      = pathinfo( $file, PATHINFO_DIRNAME );
			$thumbsrc  = '/mnt/MPD/'.rawurlencode( $path ).'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
			$icon      = 'music';
		} else {
			$class     = 'audiocd';
			$discid    = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
			$thumbsrc  = '/data/audiocd/'.$discid.'.jpg';
			$icon      = 'audiocd';
		}
		$icon = imgIcon( $thumbsrc, 'filesavedpl', $icon );
		$html    .=
'<li class="'.$class.'" '.$datatrack.'>
<a class="lipath">'.$file.'</a>
'.$icon.'<div class="li1"><span class="name">'.$title.'</span>
<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$list->time.'</a></span></div>
<div class="li2"><a class="pos">'.$i.'</a> • <span class="name">'.$li2.'</span></div>
</li>';
		$countsong++;
		$counttime += $sec;
	} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
		$li2    = '';
		$artist = $list->artist;
		$album  = $list->album;
		if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
		if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
		if ( ! $artist && ! $album ) $li2.= $file;
		$html  .=
'<li class="upnp">
'.i( 'upnp', 'filesavedpl' ).'
<div class="li1"><span class="name">'.$list->title.'</span>
<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>
<div class="li2"><a class="pos">'.$i.'</a> • <span class="name">'.$li2.'</span></div>
</li>';
		$countupnp++;
	} else {
		if ( str_contains( $file, '://' ) ) { // webradio / dabradio
			$urlname     = str_replace( '/', '|', $file );
			$type        = str_contains( $file, ':8554' ) ? 'dabradio' : 'webradio';
			$fileradio   = '/srv/http/data/'.$type.'/'.$urlname;
			if ( ! file_exists( $fileradio ) ) $fileradio = exec( 'find /srv/http/data/'.$type.'/ -name "'.$urlname.'" | head -1' );
			$stationname = $fileradio ? exec( 'head -1 "'.$fileradio.'"' ) : '';
		} else {
			$urlname     = str_replace( '#', '%23', $list->urlname );
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
<div class="li2"><a class="pos">'.$i.'</a> • <span class="stationname hide">'.$namenotsaved.'</span><span class="name">'.$url.'</span></div>
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
$time_song = exec( 'mpc status %currenttime%^^%songpos%^^%consume%' );
$time_song = explode( '^^', $time_song );
$mmss      = $time_song[ 0 ];
$mmss      = explode( ':', $mmss );
$elapsed   = $mmss[ 0 ] * 60 + $mmss[ 1 ];
$song      = $time_song[ 1 ] - 1;
if ( $song < 0 ) $song = 0;
echo json_encode( [
	  'html'      => $html
	, 'counthtml' => $counthtml
	, 'elapsed'   => $elapsed
	, 'consume'   => $time_song[ 2 ] === 'on'
	, 'librandom' => file_exists( '/srv/http/data/system/librandom' )
	, 'song'      => $song
	, 'add'       => $add
], JSON_NUMERIC_CHECK );
