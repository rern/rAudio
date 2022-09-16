<?php
include '/srv/http/common.php';

$cmd = $_POST[ 'cmd' ] ?? $argv[ 1 ];
$add = $argv[ 2 ] ? true : false;
$dirplaylists = '/srv/http/data/playlists/';
$headers = [ 'http', 'rtmp', 'rtp:', 'rtsp' ];

// current playlist
// saved playlists: delete, edit, get, list, load, rename, save
switch( $cmd ) {
	
case 'current':
	currentPlaylist();
	break;
case 'get':
	$name = $_POST[ 'name' ];
	$nameesc = str_replace( '"', '\"', $name );
	exec( 'mpc -f "%file%^^%title%^^%artist%^^%album%^^%track%^^%time%" playlist "'.$nameesc.'"'
		, $values );
	foreach( $values as $value ) {
		$v = explode( '^^', $value );
		$each = ( object )[];
		$each->file   = $v[ 0 ];
		$each->Title  = $v[ 1 ];
		$each->Artist = $v[ 2 ];
		$each->Album  = $v[ 3 ];
		$each->Track  = $v[ 4 ];
		$each->Time   = $v[ 5 ];
		$lists[] = $each;
	}
	htmlTrack( $lists, $name );
	break;
case 'list':
	htmlSavedPlaylist();
	break;
case 'load': // load saved playlist to current
	if ( $_POST[ 'replace' ] ) exec( 'mpc clear' );
	
	$name = $_POST[ 'name' ] ?? $argv[ 2 ]; // $argv - by import playlists
	exec( 'mpc -q load "'.$name.'"' );
	if ( $_POST[ 'play' ] ) exec( 'sleep 1; mpc play' );
	if ( isset( $_POST[ 'name' ] ) ) echo exec( 'mpc playlist | wc -l' ); // not by import playlists
	break;
case 'track':
	playlistInfo( $_POST[ 'track' ] );
	break;
	
}

//-------------------------------------------------------------------------------------

function currentPlaylist() {
	global $headers;
	$f = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
	$format = '%'.implode( '%^^%', $f ).'%';
	exec( 'mpc playlist -f '.$format
		, $lists ); // avoid json literal issue with escape double quotes
	if ( !count( $lists ) ) exit( '-1' );
	
	$fL = count( $f );
	foreach( $lists as $list ) {
		$list = explode( '^^', $list );
		if ( substr( $list[ 3 ], 0, 4 ) === 'cdda' ) {
			$each = ( object )[];
			$file = $list[ 3 ];
			$id = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$track = substr( $file, 8 );
			$content = file( '/srv/http/data/audiocd/'.$id, FILE_IGNORE_NEW_LINES );
			$data = $content[ $track - 1 ];
			$audiocd = explode( '^', $data );
			$each->Artist = $audiocd[ 0 ];
			$each->Album = $audiocd[ 1 ];
			$each->Title = $audiocd[ 2 ];
			$each->Time = second2HMS( $audiocd[ 3 ] );
			$each->file = $file;
			$each->Track = $track;
			$array[] = $each;
			continue;
		}
		
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			$val = $list[ $i ];
			if ( $key !== 'file' ) $key = ucfirst( $key ); // mpd protocol keys
			$each->$key = $val;
		}
		$fileheader = strtolower( substr( $each->file, 0, 4 ) );
		if ( in_array( $fileheader, $headers ) ) {
			$file = preg_replace( '/#charset=.*/', '', $each->file );
			$urlname = str_replace( '/', '|', $file );
			$radiofile = '/srv/http/data/webradio/'.$urlname;
			if ( !file_exists( $radiofile ) ) {
				$radiofile = '';
				$radiofile = exec( 'find /srv/http/data/webradio -name "'.$urlname.'"' );
			}
			$each->Name = $radiofile ? exec( 'head -1 "'.$radiofile.'"' ) : '';
			$each->urlname = $urlname;
		}
		$array[] = $each;
	}
	htmlTrack( $array );
}
function htmlSavedPlaylist() {
	include '/srv/http/bash/cmd-listsort.php';
	global $dirplaylists;
	exec( 'mpc lsplaylists'
		, $lists );
	$count = count( $lists );
	if ( !$count ) return [ 'count' => 0 ];
	
	foreach( $lists as $list ) {
		$each = ( object )[];
		$each->name = $list;
		$each->sort = stripSort( $list );
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$index = strtoupper( mb_substr( $each->sort, 0, 1, 'UTF-8' ) );
		$indexes[] = $index;
		$html.= '<li class="pl-folder" data-index="'.$index.'">
					<i class="fa fa-playlists pl-icon" data-target="#menu-playlist">
					<a class="liname">'.$each->name.'</a></i>
					<a class="lipath">'.$each->name.'</a></i>
					<span class="plname">'.$each->name.'</span>
			 	</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$counthtml = '&emsp;<span class="pl-title spaced">PLAYLISTS</span> &emsp; 
				<wh id="pl-savedlist-count">'.number_format( $count ).'</wh>
				<i class="fa fa-file-playlist"></i>';
	echo json_encode( [
		  'html'      => $html
		, 'index'     => $indexbar
		, 'counthtml' => $counthtml
		, 'indexes'   => $indexes
		, 'count'     => $count
	], JSON_NUMERIC_CHECK );
}
function htmlTrack( $lists, $plname = '' ) {
	global $headers;
	global $add;
	$count = count( $lists );
	if ( !$count ) exit( '-1' );
	
	$time = time();
	$countradio = 0;
	$countsong = 0;
	$counttime = 0;
	$countupnp = 0;
	$i = 0;
	$html = '';
	foreach( $lists as $list ) {
		$sec = 0;
		$i++;
		$file = $list->file;
		$fileheader = strtolower( substr( $file, 0, 4 ) );
		if ( !in_array( $fileheader, $headers ) ) {
			$sec = HMS2Second( $list->Time );
			$track = preg_replace( '/^#*0*/', '', $list->Track );
			$li2 = '<a class="pos">'.$i.'</a> • ';
			if ( $track ) $li2.= '<a class="track">'.$track.'</a> - ';
			$artist = $list->Artist ?: $list->Albumartist;
			$album = $list->Album;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
			if ( !$artist && !$album ) $li2.= $file;
			$datatrack = '';
			if ( strpos( $file, '.cue/track' ) ) {
				$datatrack = 'data-track="'.$track.'"'; // for cue in edit
				$file = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
			}
			$title = $list->Title ?: pathinfo( $file, PATHINFO_FILENAME );
			$ext = '';
			if ( substr( $file, 0, 4 ) !== 'cdda' ) {
				$class = 'file';
				$discid = '';
				$path = pathinfo( $file, PATHINFO_DIRNAME );
				$thumbsrc = '/mnt/MPD/'.rawurlencode( $path ).'/thumb.jpg' ; // replaced with icon on load error(faster than existing check)
				$icon = 'music';
				$htmlicon = '<img class="lazyload iconthumb pl-icon" data-icon="'.$icon.'" data-src="'.$thumbsrc.'" data-target="#menu-filesavedpl">';
			} else {
				$class = 'audiocd';
				$discid = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
				$thumbsrc = '/data/audiocd/'.$discid.'.'.$time.'.jpg';
				$icon = 'audiocd';
				$htmlicon = '<i class="fa fa-audiocd pl-icon" data-target="#menu-filesavedpl"></i>';
			}
			$html.= '<li class="'.$class.'" '.$datatrack.'>
						'.$htmlicon.'
						<a class="lipath">'.$list->file.'</a>
						<div class="li1"><span class="name">'.$list->Title.'</span>
						<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$list->Time.'</a></span></div>
						<div class="li2">'.$li2.'</div>
					</li>';
			$countsong++;
			$counttime += $sec;
		} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
			$li2 = '<a class="pos">'.$i.'</a> • ';
			$artist = $list->Artist;
			$album = $list->Album;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
			if ( !$artist && !$album ) $li2.= $file;
			$html.= '<li class="upnp">
						<i class="fa fa-upnp fa-lg pl-icon" data-target="#menu-filesavedpl"></i>
						<div class="li1"><span class="name">'.$list->Title.'</span>
						<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>
						<div class="li2">'.$li2.'</div>
					</li>';
			$countupnp++;
		} else {
			if ( str_contains( $file, '://' ) ) { // webradio / dabradio
				$urlname = str_replace( '/', '|', $file );
				$type = str_contains( $file, ':8554' ) ? 'dabradio' : 'webradio';
				$fileradio = '/srv/http/data/'.$type.'/'.$urlname;
				if ( !file_exists( $fileradio ) ) $fileradio = exec( 'find /srv/http/data/'.$type.' -name "'.$urlname.'" | head -1' );
				$stationname = $fileradio ? exec( 'head -1 "'.$fileradio.'"' ) : '';
			} else {
				$urlname = str_replace( '#', '%23', $list->urlname );
				$stationname = '';
			}
			if ( $stationname !== '' ) {
				$notsaved = 0;
				$icon = '<img class="lazyload webradio iconthumb pl-icon" data-src="/data/'.$type.'/img/'.$urlname.'-thumb.jpg" data-icon="webradio" data-target="#menu-filesavedpl">';
			} else {
				$notsaved = 1;
				$icon = '<i class="fa fa-save savewr"></i><i class="fa fa-webradio pl-icon" data-target="#menu-filesavedpl"></i>';
			}
			$html.= '<li class="webradio'.( $notsaved ? ' notsaved' : '' ).'">
						'.$icon.'
						<a class="lipath">'.preg_replace( '/\?.*$/', '', $file ).'</a>
						<a class="liname">'.$stationname.'</a>
						<div class="li1"><span class="name">'.$stationname.'</span>
						<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>
						<div class="li2"><a class="pos">'.$i.'</a> • <span class="stationname hide">'.( $notsaved ? '' : $stationname.' • ' ).'</span>'.preg_replace( '/#charset=.*/', '', $file ).'</div>
					</li>';
			$countradio++;
		}
	}
	$counthtml = '';
	if ( $plname ) $counthtml.= '<a class="lipath">'.$plname.'</a><span class="pl-title name">&ensp;'.$plname.'&ensp;<gr> · </gr></span>';
	if ( $countsong ) {
		$counthtml.= '<wh id="pl-trackcount">'.number_format( $countsong ).'</wh><i class="fa fa-music"></i><gr id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</gr>';
	}
	if ( $countradio ) $counthtml.= '<i class="fa fa-webradio"></i><wh id="pl-radiocount">'.$countradio.'</wh>';
	if ( $countupnp ) $counthtml.= '&emsp;<i class="fa fa-upnp"></i>';
	exec( "{ echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| grep -E '^song:|^elapsed:'"
		, $song_elapsed );
	$elapsed = '';
	foreach( $song_elapsed as $se ) {
		if ( substr( $se, 0, 4 ) === 'song' ) {
			$song = str_replace( 'song: ', '', $se );
		} else {
			$elapsed = round( str_replace( 'elapsed: ', '', $se ) );
		}
	}
	echo json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'song'      => $song
		, 'elapsed'   => $elapsed
		, 'add'       => $add
	], JSON_NUMERIC_CHECK );
}
function playlistInfo( $index = '' ) { // mpd protocol
	// 2nd sleep: varied with length, 1000track/0.1s
	exec( '{ sleep 0.05;
				echo playlistinfo '.$index.';
				sleep $( awk "BEGIN { printf \"%.1f\n\", $( mpc playlist | wc -l ) / 10000 + 0.1 }" ); } \
			| telnet 127.0.0.1 6600 2> /dev/null \
			| grep -E "^Album|^Artist|^Composer|^Conductor|^Date|^file|^Genre|^Range|^Time|^Title|^Track" \
			| sed "s/^\(file:\)/---\n\1/"' // file: as start track set
		, $lists );
	if ( !count( $lists ) ) exit( '-1' );
	
	global $headers;
	array_shift( $lists ); // remove 1st track delimiter
	$lists[] = '---';      // append last track delimiter
	$each = ( object )[];
	foreach( $lists as $line ) {
		if ( $line === '---' ) {
			$fileheader = strtolower( substr( $each->file, 0, 4 ) );
			if ( in_array( $fileheader, $headers ) ) {
				$urlname = str_replace( '/', '|', $each->file );
				$name = file( '/srv/http/data/webradio/'.$urlname, FILE_IGNORE_NEW_LINES )[ 0 ];
				$each->Name = explode( '^^', $name )[ 0 ];
				unset( $each->Title );
			}
			$array[] = $each;
			$each = ( object )[];
			continue;
		}
		$kv = explode( ': ', $line );
		$key = $kv[ 0 ];
		$val = $kv[ 1 ];
		$value = $key === 'Time' ? second2HMS( $val ) : $val;
		$each->$key = $value;
	}
	echo json_encode( $array, JSON_NUMERIC_CHECK );
}
