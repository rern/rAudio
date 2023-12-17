<?php
if ( isset( $argv[ 1 ] ) ) {
	$playlist = $argv[ 1 ];
	unset( $argv );
} else {
	$playlist = $_POST[ 'playlist' ];
}
$add      = $playlist === 'add' ? true : false;
$headers  = [ 'http', 'rtmp', 'rtp:', 'rtsp' ];

include '/srv/http/function.php';

// current playlist
// saved playlists: delete, edit, get, list, load, rename, save
switch( $playlist ) {
	
case 'add':
case 'current':
	currentPlaylist();
	break;
case 'get':
	$name    = $_POST[ 'name' ];
	$nameesc = str_replace( '"', '\"', $name );
	exec( 'mpc -f "%file%^^%title%^^%artist%^^%album%^^%track%^^%time%" playlist "'.$nameesc.'"'
		, $values );
	foreach( $values as $value ) {
		$v            = explode( '^^', $value );
		$each         = ( object )[];
		$each->file   = $v[ 0 ];
		$each->Title  = $v[ 1 ];
		$each->Artist = $v[ 2 ];
		$each->Album  = $v[ 3 ];
		$each->Track  = $v[ 4 ];
		$each->Time   = $v[ 5 ];
		$lists[]      = $each;
	}
	htmlTrack( $lists, $name );
	break;
case 'list':
	htmlSavedPlaylist();
	break;
	
}

//-------------------------------------------------------------------------------------

function currentPlaylist() {
	global $headers;
	$f      = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
	$format = '%'.implode( '%^^%', $f ).'%';
	exec( 'mpc playlist -f '.$format
		, $lists ); // avoid json literal issue with escape double quotes
	if ( ! count( $lists ) ) exit( '-1' );
	
	if ( substr( $lists[ 3 ], 0, 4 ) === 'cdda' ) {
		foreach( $lists as $list ) {
			$list = explode( '^^', $list );
				$each         = ( object )[];
				$file         = $list[ 3 ];
				$id           = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$track        = substr( $file, 8 );
				$content      = file( '/srv/http/data/audiocd/'.$id, FILE_IGNORE_NEW_LINES );
				$data         = $content[ $track - 1 ];
				$audiocd      = explode( '^', $data );
				$each->Artist = $audiocd[ 0 ];
				$each->Album  = $audiocd[ 1 ];
				$each->Title  = $audiocd[ 2 ];
				$each->Time   = second2HMS( $audiocd[ 3 ] );
				$each->file   = $file;
				$each->Track  = $track;
				$array[]      = $each;
		}
	} else {
		$fL = count( $f );
		foreach( $lists as $list ) {
			$list = explode( '^^', $list );
			$each = ( object )[];
			for ( $i = 0; $i < $fL; $i++ ) {
				$key        = $f[ $i ];
				$val        = $list[ $i ];
				if ( $key !== 'file' ) $key = ucfirst( $key ); // mpd protocol keys
				$each->$key = $val;
			}
			$fileheader = strtolower( substr( $each->file, 0, 4 ) );
			if ( in_array( $fileheader, $headers ) ) {
				$file          = preg_replace( '/#charset=.*/', '', $each->file );
				$urlname       = str_replace( '/', '|', $file );
				$radiofile     = '/srv/http/data/webradio/'.$urlname;
				if ( ! file_exists( $radiofile ) ) {
					$radiofile = '';
					$radiofile = exec( 'find /srv/http/data/webradio/ -name "'.$urlname.'"' );
				}
				$each->Name    = $radiofile ? exec( 'head -1 "'.$radiofile.'"' ) : '';
				$each->urlname = $urlname;
			}
			$array[] = $each;
		}
	}
	htmlTrack( $array );
}
function htmlSavedPlaylist() {
	exec( 'mpc lsplaylists'
		, $lists );
	$count = count( $lists );
	if ( ! $count ) {
		echo json_encode( [ 'count' => 0 ] );
		exit;
	}
	
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
	$indexbar  = indexbar( array_keys( array_flip( $indexes ) ) );
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
}
function htmlTrack( $lists, $plname = '' ) {
	global $headers, $add;
	$count      = count( $lists );
	if ( ! $count ) exit( '-1' );
	
	$countradio = 0;
	$countsong  = 0;
	$counttime  = 0;
	$countupnp  = 0;
	$i = 0;
	$html = '';
	foreach( $lists as $list ) {
		$sec        = 0;
		$i++;
		$file       = $list->file;
		$fileheader = strtolower( substr( $file, 0, 4 ) );
		if ( ! in_array( $fileheader, $headers ) ) {
			$sec       = HMS2Second( $list->Time );
			$track     = preg_replace( '/^#*0*/', '', $list->Track );
			$li2       = '';
			if ( $track ) $li2.= '<a class="track">'.$track.'</a> - ';
			$artist    = $list->Artist ?: $list->Albumartist;
			$album     = $list->Album;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $album )  $li2.= '<a class="album">'.$album.'</a>';
			if ( ! $artist && ! $album ) $li2.= $file;
			$datatrack = '';
			if ( strpos( $file, '.cue/track' ) ) {
				$datatrack = 'data-track="'.$track.'"'; // for cue in edit
				$file      = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
			}
			$title     = $list->Title ?: pathinfo( $file, PATHINFO_FILENAME );
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
	<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$list->Time.'</a></span></div>
	<div class="li2"><a class="pos">'.$i.'</a> • <span class="name">'.$li2.'</span></div>
</li>';
			$countsong++;
			$counttime += $sec;
		} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
			$li2    = '';
			$artist = $list->Artist;
			$album  = $list->Album;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
			if ( ! $artist && ! $album ) $li2.= $file;
			$html  .=
'<li class="upnp">
	'.i( 'upnp i-lg', 'filesavedpl' ).'
	<div class="li1"><span class="name">'.$list->Title.'</span>
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
	if ( $plname ) {
		$counthtml.='<a class="lipath">'.$plname.'</a><span class="pl-title name">'.i( 'file-playlist savedlist wh' ).$plname.'&ensp;<gr> · </gr></span>';
	}
	if ( $countsong ) {
		$counthtml.='<wh id="pl-trackcount">'.number_format( $countsong ).'</wh>'.i( 'music' ).'<gr id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</gr>';
	}
	if ( $countradio ) $counthtml.= i( 'webradio' ).'<wh id="pl-radiocount">'.$countradio.'</wh>';
	if ( $countupnp )  $counthtml.= '&emsp;'.i( 'upnp' );
	$time_song = exec( 'mpc status %currenttime%^^%songpos%' );
	$time_song = explode( '^^', $time_song );
	$mmss = $time_song[ 0 ];
	$mmss = explode( ':', $mmss );
	$elapsed = $mmss[ 0 ] * 60 + $mmss[ 1 ];
	$song = $time_song[ 1 ] - 1;
	if ( $song < 0 ) $song = 0;
	echo json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'elapsed'   => $elapsed
		, 'song'      => $song
		, 'add'       => $add
	], JSON_NUMERIC_CHECK );
}
