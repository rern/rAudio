<?php
include 'function.php'; // $hash

$post         = ( object ) $_POST;
$CMD          = $post->playlist ?? $argv[ 1 ]; // current / list
$fileplaylist = '/srv/http/data/shm/playlist';
$filecount    = $fileplaylist.'count';

switch( $CMD ) {

case 'current':
	if ( ! file_exists( $fileplaylist ) ) {
		$lists     = mpd( 'queue' );
	} else {
		$html      = file_get_contents( $fileplaylist );
		$counthtml = file_get_contents( $filecount );
		output();
		exit;
//----------------------------------------------------------------------------------
	}
	break;
case 'playlist':
	$name = $post->name;
	$lists = mpd( 'playlist', $name );
	break;
case 'playlists':
	$lists = mpd( 'playlists' );
	if ( ! count( $lists ) ) exit;
//----------------------------------------------------------------------------------
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
	echo json_encode( [
		  'html'    => $html
		, 'indexes' => $indexes
		, 'count'   => count( $lists )
	], JSON_NUMERIC_CHECK );
	exit;
//----------------------------------------------------------------------------------
	break;
}

$count    = ( object ) array_fill_keys( [ 'radio', 'song', 'time', 'upnp' ], 0 );
$song     = 0;
$duration = 0;
$upnp     = file_exists( '/srv/http/data/shm/upnp' );
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
				$discid = file( '/srv/http/data/shm/audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
				$cdfile = '/srv/http/data/audiocd/'.$discid.'/data';
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
if ( isset( $name ) ) {
	$counthtml.='<a class="lipath">'.$name.'</a><span class="name">'.icon(  'file-playlist savedlist' ).$name.'</span> <gr>·</gr>';
}
if ( $count->song ) {
	$counthtml.= '<a id="pl-trackcount">'.number_format( $count->song ).'</a>'.icon(  'music' ).'<a id="pl-time" data-time="'.$count->time.'">'.second2HMS( $count->time ).'</a>';
}
if ( $count->radio ) $counthtml.= icon(  'webradio' ).'<a id="pl-radiocount">'.$count->radio.'</a>';
if ( $count->upnp )  $counthtml.= '&emsp;'.icon(  'upnp' );

output();

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
function output() {
	global $CMD, $counthtml, $filecount, $fileplaylist, $html;
	$status = ( object ) mpd( 'status' );
	$data = json_encode( [
		  'html'      => $html
		, 'counthtml' => $counthtml
		, 'consume'   => $status->consume === 1
		, 'librandom' => file_exists( '/srv/http/data/system/librandom' )
		, 'song'      => $status->song ?? 0
		, 'add'       => $CMD === 'add'
	], JSON_NUMERIC_CHECK );
	echo $data;
	if ( $CMD === 'current' ) {
		if ( $status->playlistlength < 200 ) { // no cache - < 200 tracks
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
