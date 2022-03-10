<?php
include '/srv/http/indexbar.php';

$cmd = $_POST[ 'cmd' ] ?? $argv[ 1 ];
$dirplaylists = '/srv/http/data/playlists/';
$headers = [ 'http', 'rtmp', 'rtp:', 'rtsp' ];

// current playlist
// saved playlists: delete, edit, get, list, load, rename, save
switch( $cmd ) {
	
case 'current':
	$lists = playlist();
	$array = htmlPlaylist( $lists );
	$elapsed = exec( '{ echo status; sleep 0.05; } | telnet 127.0.0.1 6600 2> /dev/null | grep ^elapsed' );
	$array[ 'elapsed' ] = $elapsed !== '' ? round( substr( $elapsed, 9 ) ) : false;
	echo json_encode( $array );
	break;
case 'delete':
	$name = str_replace( '"', '\"', $_POST[ 'name' ] );
	exec( 'mpc -q rm "'.$name.'"; /srv/http/bash/cmd.sh plcount' );
	$array = listPlaylists();
	$array[ 'delete' ] = $name;
	pushstream( 'playlists', $array );
	break;
case 'edit':
	$file = $_POST[ 'file' ] ?? '';
	$name = str_replace( '"', '\"', $_POST[ 'name' ] );
	$plfile = $dirplaylists.$name.'.m3u';
	$remove = $_POST[ 'remove' ] ?? '';
	$indextarget = $_POST[ 'indextarget' ] ?? '';
	if ( $remove ) { // remove
		exec( 'sed -i "'.$remove.'d" "'.$plfile.'"' );
	} else if ( $indextarget ) { // insert
		if ( $indextarget === 'first' ) {
			exec( 'sed -i "1 i'.$file.'" "'.$plfile.'"' );
		} else if ( $indextarget === 'last' ) {
			file_put_contents( $plfile, $file, FILE_APPEND );
		} else {
			exec( 'sed -i "'.$indextarget.' i'.$file.'" "'.$plfile.'"' );
		}
	} else { // arrange
		$from = $_POST[ 'from' ] + 1;
		$to = $_POST[ 'to' ];
		$file = exec( 'sed -n '.$from.'p "'.$plfile.'"' );
		exec( 'sed -i "'.$from.'d" "'.$plfile.'"; sed -i "'.$to.'a'.$file.'" "'.$plfile.'"' );
	}
	pushstream( 'playlist', [ 'playlist' => $name ] );
	break;
case 'get':
	$name = str_replace( '"', '\"', $_POST[ 'name' ] );
	exec( 'mpc -f "%file%^^%title%^^%artist%^^%album%^^%track%^^%time%" playlist "'.$name.'"', $values );
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
	$array = htmlPlaylist( $lists, $name );
	echo json_encode( $array );
	break;
case 'list':
	$array = listPlaylists();
	echo json_encode( $array );
	break;
case 'load': // load saved playlist to current
	if ( $_POST[ 'replace' ] ) exec( 'mpc clear' );
	
	$name = $_POST[ 'name' ] ?? $argv[ 2 ]; // $argv - by import playlists
	exec( 'mpc -q load "'.$name.'"' );
	if ( $_POST[ 'play' ] ) exec( 'sleep 1; mpc play' );
	if ( isset( $_POST[ 'name' ] ) ) echo exec( 'mpc playlist | wc -l' );  // not by import playlists
	break;
case 'rename':
	exec( 'mv /srv/http/data/playlists/{"'.$_POST[ 'oldname' ].'","'.$_POST[ 'name' ].'"}.m3u' );
	pushstream( 'playlists', listPlaylists() );
	break;
case 'save':
	$name = $_POST[ 'name' ] ?? $argv[ 2 ];
	$file = $dirplaylists.$name;
	if ( file_exists( $file ) ) exit( '-1' );
	
	exec( 'mpc -q save "'.$name.'"; /srv/http/bash/cmd.sh plcount' );
	pushstream( 'playlists', listPlaylists() );
	break;
case 'track':
	$array = playlistInfo( $_POST[ 'track' ] );
	echo json_encode( $array );
	break;
	
}

//-------------------------------------------------------------------------------------
function listPlaylists() {
	include '/srv/http/bash/cmd-listsort.php';
	global $dirplaylists;
	exec( 'mpc lsplaylists', $lists );
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
		$html.= '<li class="pl-folder" data-index="'.$index.'">'
					.'<i class="fa fa-playlists pl-icon" data-target="#menu-playlist">'
					.'<a class="liname">'.$each->name.'</a></i>'
					.'<a class="lipath">'.$each->name.'</a></i>'
					.'<span class="plname">'.$each->name.'</span>'
			 	.'</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$counthtml = '&emsp;<span class="pl-title spaced">PLAYLISTS</span> &emsp; '
				.'<wh id="pl-savedlist-count">'.number_format( $count ).'</wh>'
				.'<i class="fa fa-file-playlist"></i>';
	return [
		  'html'      => $html
		, 'index'     => $indexbar
		, 'counthtml' => $counthtml
		, 'indexes'   => $indexes
		, 'count'     => $count
	];
}
function htmlPlaylist( $lists, $plname = '' ) {
	global $headers;
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
				$thumbsrc = '/mnt/MPD/'.rawurlencode( $path ).'/thumb.'.$time.'.jpg' ; // replaced with icon on load error(faster than existing check)
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
			$html.= '<li class="'.$class.'" '.$datatrack.'>'
						.$htmlicon
						.'<a class="lipath">'.$file.'</a>'
						.'<div class="li1"><span class="name">'.$list->Title.'</span>'
						.'<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$list->Time.'</a></span></div>'
						.'<div class="li2">'.$li2.'</div>'
					.'</li>';
			$countsong++;
			$counttime += $sec;
		} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
			$li2 = '<a class="pos">'.$i.'</a> • ';
			$artist = $list->Artist;
			$album = $list->Album;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $album ) $li2.= '<a class="album">'.$album.'</a>';
			if ( !$artist && !$album ) $li2.= $file;
			$html.= '<li class="upnp">'
						.'<i class="fa fa-upnp fa-lg pl-icon" data-target="#menu-filesavedpl"></i>'
						.'<div class="li1"><span class="name">'.$list->Title.'</span>'
						.'<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>'
						.'<div class="li2">'.$li2.'</div>'
					.'</li>';
			$countupnp++;
		} else {
			if ( substr( $file, 0, 4 ) === 'http' ) { // webradio
				$urlname = str_replace( '/', '|', $file );
				$fileradio = '/srv/http/data/webradios/'.$urlname;
				if ( file_exists( $fileradio ) ) $stationname = exec( 'head -1 "'.$fileradio.'"' );
			} else {
				$urlname = str_replace( '#', '%23', $list->urlname );
				$stationname = '';
			}
			if ( $stationname !== '' ) {
				$notsaved = 0;
				$icon = '<img class="lazyload webradio iconthumb pl-icon" data-src="/data/webradiosimg/'.$urlname.'-thumb.'.$time.'.jpg"'
						.' data-icon="webradio" data-target="#menu-filesavedpl">';
			} else {
				$notsaved = 1;
				$icon = '<i class="fa fa-save savewr"></i><i class="fa fa-webradio pl-icon" data-target="#menu-filesavedpl"></i>';
			}
			$html.= '<li class="webradio'.( $notsaved ? ' notsaved' : '' ).'">'
						.$icon
						.'<a class="lipath">'.preg_replace( '/\?.*$/', '', $file ).'</a>'
						.'<a class="liname">'.$stationname.'</a>'
						.'<div class="li1"><span class="name">'.$stationname.'</span>'
						.'<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>'
						.'<div class="li2"><a class="pos">'.$i.'</a> • <span class="stationname hide">'.( $notsaved ? '' : $stationname.' • ' ).'</span>'.preg_replace( '/#charset=.*/', '', $file ).'</div>'
					.'</li>';
			$countradio++;
		}
	}
	$counthtml = '';
	if ( $plname ) $counthtml.= '<a class="lipath">'.$plname.'</a><span class="pl-title name">&ensp;'.$plname.'&ensp;<gr> · </gr></span>';
	if ( $countsong ) {
		$counthtml.= '<wh id="pl-trackcount">'.number_format( $countsong ).'</wh><i class="fa fa-music"></i>'
					.'<gr id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</gr>';
	}
	if ( $countradio ) $counthtml.= '<i class="fa fa-webradio"></i><wh id="pl-radiocount">'.$countradio.'</wh>';
	if ( $countupnp ) $counthtml.= '&emsp;<i class="fa fa-upnp"></i>';
	return [ 'html' => $html, 'counthtml' => $counthtml, 'playlistlength' => $count ];
}
function playlist() { // current playlist
	global $headers;
	$f = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
	$format = '%'.implode( '%^^%', $f ).'%';
	exec( 'mpc playlist -f '.$format, $lists ); // avoid json literal issue with escape double quotes
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
			$radiofile = '/srv/http/data/webradios/'.$urlname;
			if ( !file_exists( $radiofile ) ) {
				$radiofile = '';
				$radiofile = exec( 'find /srv/http/data/webradios -name "'.$urlname.'"' );
			}
			$each->Name = $radiofile ? exec( 'head -1 "'.$radiofile.'"' ) : '';
			$each->urlname = $urlname;
		}
		$array[] = $each;
	}
	return $array;
}
function playlistInfo( $index = '' ) { // mpd protocol
	// 2nd sleep: varied with length, 1000track/0.1s
	exec( '{ sleep 0.05'
		.'; echo playlistinfo '.$index
		.'; sleep $( awk "BEGIN { printf \"%.1f\n\", $( mpc playlist | wc -l ) / 10000 + 0.1 }" ); }'
		.' | telnet 127.0.0.1 6600 2> /dev/null'
		.' | grep "^Album\|^Artist\|^Composer\|^Conductor\|^Date\|^file\|^Genre\|^Range\|^Time\|^Title\|^Track"'
		.' |  sed "s/^\(file:\)/---\n\1/"' // file: as start track set
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
				$name = file( '/srv/http/data/webradios/'.$urlname, FILE_IGNORE_NEW_LINES )[ 0 ];
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
	return $array;
}
function pushstream( $channel, $data ) {
	$ch = curl_init( 'http://127.0.0.1/pub?id='.$channel );
	curl_setopt( $ch, CURLOPT_HTTPHEADER, [ 'Content-Type:application/json' ] );
	curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $data, JSON_NUMERIC_CHECK ) );
	curl_exec( $ch );
	curl_close( $ch );
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
function second2HMS( $second ) {
	$hh = floor( $second / 3600 );
	$mm = floor( ( $second % 3600 ) / 60 );
	$ss = $second % 60;
	
	$hh = $hh ? $hh.':' : '';
	$mm = $hh ? ( $mm > 9 ? $mm.':' : '0'.$mm.':' ) : ( $mm ? $mm.':' : '' );
	$ss = $mm ? ( $ss > 9 ? $ss : '0'.$ss ) : $ss;
	return $hh.$mm.$ss;
}
