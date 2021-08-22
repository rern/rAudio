<?php
include '/srv/http/indexbar.php';

$cmd = $_POST[ 'cmd' ] ?? $argv[ 1 ];
$dirplaylists = '/srv/http/data/playlists/';
$dirtmp = '/srv/http/data/shm';
$headers = [ 'http', 'rtmp', 'rtp:', 'rtsp' ];

// current, delete, edit, get, list, load, save
switch( $cmd ) {
	
case 'current':
	$lists = playlist();
	$array = htmlPlaylist( $lists );
	echo json_encode( $array );
	break;
case 'delete':
	unlink( $dirplaylists.$_POST[ 'name' ] );
	break;
case 'edit':
	$name = $_POST[ 'name' ];
	$file = $dirplaylists.$name;
	$contents = file_get_contents( $file );
	$list = json_decode( $contents );
	
	$remove = $_POST[ 'remove' ] ?? null;
	$index = $_POST[ 'index' ] ?? null;
	if ( $remove !== null ) { // remove
		array_splice( $list, $remove, 1 );
	} else if ( $index !== null ) { // insert
		$trackdata = playlistInfo( $index );
		$indextarget = $_POST[ 'indextarget' ];
		if ( $indextarget === 'first' ) {
			array_unshift( $list, $trackdata[ 0 ] );
		} else if ( $indextarget === 'last' ) {
			$list[] = $trackdata[ 0 ];
		} else {
			array_splice( $list, $indextarget, 0, $trackdata );
		}
	} else { // arrange
		$data = array_splice( $list, $_POST[ 'old' ], 1 );
		array_splice( $list, $_POST[ 'new' ], 0, $data );
	}
	$newlist = json_encode( $list, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT );
	file_put_contents( $file, $newlist );
	pushstream( 'playlist', [ 'playlist' => $name ] );
	break;
case 'get':
	$name = str_replace( '"', '\"', $_POST[ 'name' ] );
	$lists = json_decode( file_get_contents( $dirplaylists.$name ) );
	$array = htmlPlaylist( $lists, $name );
	echo json_encode( $array );
	break;
case 'list':
	include '/srv/http/bash/cmd-listsort.php';
	$lists = array_slice( scandir( $dirplaylists ), 2 );
	$count = count( $lists );
	if ( !$count ) exit( '-1' );
	
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
					.'<i class="fa fa-playlist pl-icon" data-target="#menu-playlist">'
					.'<a class="liname">'.$each->name.'</a></i>'
					.'<a class="lipath">'.$each->name.'</a></i>'
					.'<span class="plname">'.$each->name.'</span>'
			 	.'</li>';
	}
	$indexbar = indexbar( array_keys( array_flip( $indexes ) ) );
	$counthtml = '&emsp;<span class="pl-title spaced">PLAYLISTS</span> &emsp; '
				.'<whl id="pl-savedlist-count">'.number_format( $count ).'</whl>'
				.'<i class="fa fa-file-playlist"></i>';
	echo json_encode( [
		  'html'      => $html
		, 'index'     => $indexbar
		, 'counthtml' => $counthtml
		, 'indexes'   => $indexes
	] );
	break;
case 'load': // load saved playlist to current
	// load normal and individual cue tracks - use only file and track
	// 1. alternate cue <-> normal
	// 2. exec cumulative commands
	// 3. append commands while in the same type
	//   3.1  cue:
	//     change file extension to cue
	//     mpc --range=RANGE load mpd/path/file.cue (N = track# - 1)
	//     $RANGE = 'N0:N1'; - increment consecutive tracks to single command
	//     $RANGE = N;       - each track per command
	//   3.2  normal:
	//     echo -e $FILES | mpd add
	//     $FILES = 'mpd/path/file.ext\n'; - each track per line
	// 4. increment exec if cumulative commands reach limit to avoid errors
	
	if ( $_POST[ 'replace' ] ) exec( 'mpc clear' );
	
	$name = $_POST[ 'name' ] ?? $argv[ 2 ]; // $argv - by import playlists
	$lines = file_get_contents( $dirplaylists.$name );
	$lines = json_decode( $lines );
	$list = $range = $fileprev = '';
	$track0prev = $trackprev = $i = $j = 0;
	foreach( $lines as $line ) {
		$file = $line->file;
		if ( !empty( $line->Range ) ) { // cue
			if ( $list ) { // alternate exec cumulative commands
				exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
				$list = '';
				$i = 0;
			}
			$file = substr_replace( $file , 'cue', strrpos( $file , '.' ) + 1 ); // replace ext
			$track = $line->Track;
			if ( $track === $trackprev + 1 && $file === $fileprev ) {
				$track0 = $track0prev;
				$ranges = explode( ';', $range );
				array_pop( $ranges );
				$range = implode( ';', $ranges );
			} else {
				$track0 = $track - 1;
			}
			$rangetrack = $track0 === $track - 1 ? $track0 : "$track0:$track";
			$range.= ';mpc --range='.$rangetrack.' load "'.$file.'"';
			$track0prev = $track0;
			$trackprev = $track;
			$fileprev = $file;
			$j++;
			if ( $j === 100 ) { // limit exec commands length
				exec( ltrim( $range, ';' ) );
				$range = $fileprev = '';
				$track0prev = $trackprev = 0;
				$j = 0;
			}
		} else {
			if ( $range ) { // alternate exec cumulative commands
				exec( ltrim( $range, ';' ) );
				$range = $fileprev = '';
				$track0prev = $trackprev = $j = 0;
			}
			$list.= $file.'\n';
			$i++;
			if ( $i === 500 ) { // limit list commands length
				exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
				$list = '';
				$i = 0;
			}
		}
	}
	if( $list ) exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
	if ( $range ) exec( ltrim( $range, ';' ) );
	
	if ( $_POST[ 'play' ] ) exec( 'sleep 1; mpc play' );
	if ( isset( $_POST[ 'name' ] ) ) echo exec( 'mpc playlist | wc -l' );  // not by import playlists
	break;
case 'save':
	$name = $_POST[ 'name' ] ?? $argv[ 2 ];
	$file = $dirplaylists.$name;
	if ( file_exists( $file ) ) exit( '-1' );
	
	$list = json_encode( playlistInfo(), JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT );
	file_put_contents( $file, $list );
	pushstream( 'playlist', [ 'playlist' => 'save' ] );
	break;
	
}

//-------------------------------------------------------------------------------------
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
			$li2 = $i.' • ';
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
				$thumbsrc = '/mnt/MPD/'.$path.'/thumb.'.$time.'.jpg'; // replaced with icon on load error(faster than existing check)
			} else {
				$class = 'audiocd';
				$discid = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
				$thumbsrc = '/data/audiocd/'.$discid.'.'.$time.'.jpg';
			}
			$html.= '<li class="'.$class.'" '.$datatrack.'>'
						.'<img class="lazyload iconthumb pl-icon" data-src="'.rawurlencode( $thumbsrc ).'" data-target="#menu-filesavedpl">'
						.'<a class="lipath">'.$file.'</a>'
						.'<div class="li1"><span class="name">'.$list->Title.'</span>'
						.'<span class="duration"><a class="elapsed"></a><a class="time" data-time="'.$sec.'">'.$list->Time.'</a></span></div>'
						.'<div class="li2">'.$li2.'</div>'
					.'</li>';
			$countsong++;
			$counttime += $sec;
		} else if ( substr( $file, 0, 14 ) === 'http://192.168' ) {
			$li2 = $i.' • ';
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
			$stationname = $list->Name;
			$notsaved = $stationname === '';
			$file = preg_replace( '/\?.*$/', '', $file );
			$urlname = str_replace( '/', '|', $file );
			if ( !$notsaved ) {
				$thumbsrc = '/data/webradiosimg/'.$urlname.'-thumb.'.$time.'.jpg';
				$icon = '<img class="lazyload webradio iconthumb pl-icon" data-src="'.$thumbsrc.'" data-target="#menu-filesavedpl">';
			} else {
				$icon = '<i class="fa fa-save savewr"></i><i class="fa fa-webradio pl-icon" data-target="#menu-filesavedpl"></i>';
			}
			$html.= '<li class="webradio'.( $notsaved ? ' notsaved' : '' ).'">'
						.$icon
						.'<a class="lipath">'.$file.'</a>'
						.'<a class="liname">'.$stationname.'</a>'
						.'<div class="li1"><span class="name">'.$stationname.'</span>'
						.'<span class="duration"><a class="elapsed"></a><a class="time"></a></span></div>'
						.'<div class="li2">'.$i.' • <span class="stationname hide">'.( $notsaved ? '' : $stationname.' • ' ).'</span>'.$file.'</div>'
					.'</li>';
			$countradio++;
		}
	}
	$counthtml = '';
	if ( $plname ) $counthtml.= '<a class="lipath">'.$plname.'</a><span class="pl-title name">&ensp;'.$plname.'&ensp;<gr> · </gr></span>';
	if ( $countsong ) {
		$counthtml.= '<whl id="pl-trackcount">'.number_format( $countsong ).'</whl><i class="fa fa-music"></i>'
					.'<grl id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</grl>';
	}
	if ( $countradio ) $counthtml.= '<i class="fa fa-webradio"></i><whl id="pl-radiocount">'.$countradio.'</whl>';
	if ( $countupnp ) $counthtml.= '&emsp;<i class="fa fa-upnp"></i>';
	return [ 'html' => $html, 'counthtml' => $counthtml, 'playlistlength' => $count ];
}
function playlist() { // current playlist
	global $headers;
	$f = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
	$format = '%'.implode( '%^^%', $f ).'%';
	exec( 'mpc playlist -f '.$format, $lists ); // avoid json literal issue with escape double quotes
	if ( !count( $lists ) ) {
		@unlink( '/srv/http/data/shm/playlist' );
		exit( '-1' );
	}
	
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
			$radiofile = '/srv/http/data/webradios/'.str_replace( '/', '|', $each->file );
			$name = file( $radiofile, FILE_IGNORE_NEW_LINES )[ 0 ];
			$each->Name = explode( '^^', $name )[ 0 ];
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
		.' | grep "^Album:\|^Artist\|^file\|^Range\|^Time\|^Title\|^Track"'
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
