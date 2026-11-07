<?php
include 'function.php'; // $hash

$post         = ( object ) $_POST;
$CMD          = $post->playlist ?? $argv[ 1 ]; // current / list
$dirdata      = '/srv/http/data/';
$dirshm       = $dirdata.'shm/';
$librandom    = file_exists( $dirdata.'system/librandom' );

$MPD          = MphpD();

switch( $CMD ) {

case 'add':
case 'addfind':
case 'load':
case 'move':
case 'playnext':
case 'shuffle':
	$PUSH    = true;
	$action  = $post->action ?? '';
	$target  = $post->target ?? '';
	$replace = str_starts_with( $action, 'replace' );
	$play    = str_ends_with( $action, 'play' );
	if ( $replace ) $MPD->queue()->clear();
	if ( $play ) $pos = $replace ? 1 : $MPD->status()[ 'playlistlength' ];
	switch( $CMD ) {
		case 'add':       $MPD->queue()->add( $target );                               break;
		case 'addfind':   $MPD->queue()->add_find( MphpD_filter( $target ) );             break;
		case 'load':      $MPD->queue()->load( $target );                              break;
		case 'move':      $MPD->queue()->move( ...$target );                           break;
		case 'playnext':  $MPD->queue()->add( $target, $MPD->status()[ 'song' ] + 1 ); break;
		case 'shuffle':   $MPD->queue()->shuffle();                                    break;
	}
	if ( $play ) $MPD->player()->play( $pos );
	$lists   = $MPD->queue()->get();
	break;
case 'crop':
	$PUSH   = true;
	$status = $MPD->status();
	$song   = $status[ 'song' ] ?? 0;
	$last   = $status[ 'playlistlength' ];
	if ( $song + 1 < $last ) $MPD->queue()->delete( [ $song + 1, $last ] );
	if ( $song > 0 )         $MPD->queue()->delete( [ 0, $song ] );
	if ( $librandom ) exec( '/srv/http/bash/cmd.sh libraryrandom' );
	$lists  = $MPD->queue()->get();
	break;
case 'current':
	$lists  = $MPD->queue()->get();
	break;
case 'consume':
case 'random':
case 'repeat':
case 'single':
	$MPD->player()->$CMD( $post->target === 'true' );
	break;
case 'delete':
	$PUSH  = true;
	$MPD->queue()->delete( $post->target );
	$lists = $MPD->queue()->get();
	break;
case 'playlist': // saved playlist
	$lists = $MPD->playlist( $post->name )->get_songs( true ); // true - metadata
	break;
case 'playlists':
	$lists = $MPD->playlists();
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
	icon(  'file-playlist', 'playlist' ).'<a class="lipath">'.$name.'</a><a class="single">'.$name.'</a>'.
'</li>
';
	}
	$html     .= indexBar( $indexes );
	$data      = [
		  'html'    => $html
		, 'indexes' => $indexes
		, 'count'   => count( $lists )
	];
	echo_push( $data, isset( $argv[ 2 ] ) );
	exit;
//----------------------------------------------------------------------------------
	
}
if ( ! isset( $lists ) ) exit;
//----------------------------------------------------------------------------------
$count    = ( object ) array_fill_keys( [ 'radio', 'song', 'time', 'upnp' ], 0 );
$song     = 0;
$duration = 0;
$upnp     = file_exists( $dirshm.'upnp' );
$html     = '';
foreach( $lists as $l ) {
	$song++;
	$pos = '<a class="pos">'.$song.'</a>';
	$l   = ( object ) $l;
// upnp ........................................................................
	if ( $upnp ) {
		$li2       = $pos.' • '.artistAlbum( $l->artist, $l->album, $l->file );
		$html     .=
'<li class="upnp">'.
	icon(  'upnp', 'filesavedpl' ).
	'<div class="li1"><a class="name">'.$l->title.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->upnp++;
		continue;
	}
	
	switch ( $l->file[ 0 ] ) {
		case 'c': // audio cd
			if ( ! isset( $discid ) ) {
				$discid = file( $dirshm.'audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$cdfile = $dirdata.'audiocd/'.$discid.'/data';
				if ( file_exists( $cdfile ) ) {
					$cdlist = file_exists( $cdfile ) ? file( $cdfile, FILE_IGNORE_NEW_LINES ) : false;
					$cdalbum  = $cdlist[ 0 ];
					$cdsrc    = '/data/audiocd/'.$discid.'/cover.jpg';
				}
			}
			if ( isset( $cdlist ) ) {
				$track = explode( '///', $l->file )[ 1 ];
				[ $artist, $title, $duration ] = explode( '^^', $cdlist[ $track + 1 ] );
				$time = second2HMS( $duration );
			}
			$icon      = iconThumb( $cdsrc, 'filesavedpl' );
			$li2       = $pos.' • '.$track.' - '.artistAlbum( $artist, $cdalbum, $l->file );
			$html     .=
'<li class="audiocd">'.
	'<a class="lipath">'.$l->file.'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a><a class="time" data-time="'.$duration.'"></a>'.$time.'</div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
			$count->song++;
			$count->time += $duration;
			break;
		case 'h': // webradio
		case 'r': // dabradio
			$station  = '';
			$dirradio = radioDir( $l->file );
			if ( $dirradio ) {
				$station = basename( $dirradio );
				$icon    = iconThumb( $dirradio.'/thumb.jpg', 'filesavedpl' );
			} else {
				$icon    = icon( $l->file[ 0 ] === 'h' ? 'webradio': 'dabradio' );
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
			$li2    .= '</a><a class="url">'.preg_replace( '/#charset=.*/', '', $l->file ).'</a>';
			$html   .=
'<li class="webradio '.$notsaved.'">'.
	'<a class="lipath">'.preg_replace( '/\?.*$/', '', $l->file ).'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$station.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
			$count->radio++;
			break;
		default: // mpd file
			$track     = isset( $l->track ) ? preg_replace( '/^#*0*/', '', $l->track ) : '';
			$artist    = $l->artist ?? ( $l->albumartist ?? '' );
			$datatrack = '';
			if ( strpos( $l->file, '.cue/track' ) ) {
				$datatrack = 'data-track="'.$track.'"'; // for cue in edit
				$l->file   = dirname( $l->file );
			}
			$title     = isset( $l->title ) ? pathinfo( $l->file, PATHINFO_FILENAME ) : '';
			$path      = pathinfo( $l->file, PATHINFO_DIRNAME );
			$thumbsrc  = '/mnt/MPD/'.$path.'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
			$icon      = iconThumb( $thumbsrc, 'filesavedpl' );
			$duration  = ( int ) round( $l->duration );
			$li2       = $pos.' • '.$track.' - '.artistAlbum( $artist, $l->album ?? '', $l->file );
			$html     .=
'<li class="music" '.$datatrack.'>'.
	'<a class="lipath">'.$l->file.'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a><a class="time" data-time="'.$duration.'">'.second2HMS( $duration ).'</a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
			$count->song++;
			$count->time += $duration;
	}
}

$counthtml = '';
if ( $CMD === 'playlist' ) {
	$counthtml.='<a class="lipath">'.$post->name.'</a><span class="name">'.icon(  'file-playlist savedlist' ).$post->name.'</span> <gr>·</gr>';
}
if ( $count->song ) {
	$counthtml.= '<a id="pl-trackcount">'.number_format( $count->song ).'</a>'.icon(  'music' ).'<a id="pl-time" data-time="'.$count->time.'">'.second2HMS( $count->time ).'</a>';
}
if ( $count->radio ) $counthtml.= icon(  'webradio' ).'<a id="pl-radiocount">'.$count->radio.'</a>';
if ( $count->upnp )  $counthtml.= '&emsp;'.icon(  'upnp' );
$status = ( object ) $MPD->status();
$data = [
	  'html'      => $html
	, 'counthtml' => $counthtml
	, 'consume'   => $status->consume === 1
	, 'librandom' => $librandom
	, 'pllength'  => $status->playlistlength
	, 'position'  => $status->song ?? 0
	, 'add'       => $CMD === 'add'
];
echo_push( $data, isset( $PUSH ), 'playlist' );
file_put_contents( $dirshm.'playlist', $data ); // for bash pushPlaylist

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
function echo_push( $data, $PUSH ) {
	if ( $PUSH ) {
		wsSend( $data );
	} else {
		echo json_encode( $data );
	}
}
function wsSend( $msg )  {
	$ip_port = '//127.0.0.1:8080';
	$fp      = @stream_socket_client( "tcp:$ip_port", $errno, $errstr, 2 );
	if ( ! $fp ) return false;
#...............................................................................
	stream_set_timeout( $fp, 2 );
	// handshake
	$key     = base64_encode( random_bytes( 16 ) );
	fwrite( $fp, "GET / HTTP/1.1\r\n"
				."Host: $ip_port\r\n"
				."Upgrade: websocket\r\n"
				."Connection: Upgrade\r\n"
				."Sec-WebSocket-Key: $key\r\n"
				."Sec-WebSocket-Version: 13\r\n\r\n" );
	$status  = fgets( $fp );
	if ( ! $status || ! str_contains( $status, ' 101 ' )) {
		fclose( $fp );
		return false;
#...............................................................................
	}
	while ( ( $line = fgets( $fp ) ) !== false && $line !== "\r\n" ); // skip headers
	global $CMD;
	$channel = $CMD === 'playlists' ? 'playlists' : 'playlist';
	$msg     = json_encode( [ 'channel' => $channel, 'data' => $msg ] );
	// text frame (client frames must be masked)
	$len     = strlen( $msg );
	$head    = "\x81"; // FIN + text opcode
	if ( $len < 126 )        $head .= chr( 0x80 | $len );
	elseif ( $len < 65536 )  $head .= chr( 0x80 | 126 ) . pack( 'n', $len );
	else                     $head .= chr( 0x80 | 127 ) . pack( 'J', $len );
	$mask    = random_bytes( 4 );
	$masked  = $msg ^ str_repeat( $mask, intdiv( $len, 4 ) + 1 ); // XOR truncates to $len
	fwrite( $fp, $head . $mask . $masked );
	fwrite( $fp, "\x88\x80" . random_bytes( 4 ) ); // close frame
	fclose( $fp );
}
