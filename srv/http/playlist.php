<?php
$post         = ( object ) $_POST;
$CMD          = $post->playlist ?? $argv[ 1 ];
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
	echo json_encode( [
		  'html'    => $html
		, 'indexes' => $indexes
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
	if ( in_array( $file[ 0 ], [ 'U', 'N', 'S' ] ) ) { // USB, NAS, SD
		$sec       = HMS2second( $time );
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
			}
			$class     = 'audiocd';
			$datatrack = 'data-discid="'.$discid.'"'; // for cd tag editor
			$thumbsrc  = '/data/audiocd/'.$discid.'.jpg';
			$icon      = imgIcon( $thumbsrc, 'filesavedpl', 'audiocd' );
		} else {
			if ( $track ) $track = preg_replace( '/^#*0*/', '', $track );
			if ( ! $artist ) $artist = $albumartist;
			$datatrack = '';
			if ( strpos( $file, '.cue/track' ) ) {
				$datatrack = 'data-track="'.$track.'"'; // for cue in edit
				$file      = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
			}
			$title     = $title ?: pathinfo( $file, PATHINFO_FILENAME );
			$class     = 'file';
			$discid    = '';
			$path      = pathinfo( $file, PATHINFO_DIRNAME );
			$thumbsrc  = '/mnt/MPD/'.$path.'/thumb.jpg'; // replaced with icon on load error(faster than existing check)
			$icon      = imgIcon( $thumbsrc, 'filesavedpl', 'music' );
		}
		$li2       = $pos.' • '.$track.' - '.artistAlbum( $artist, $album, $file );
		$html     .=
'<li class="'.$class.'" '.$datatrack.'>'.
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
	
	if ( substr( $file, 0, 14 ) === 'http://192.168' ) { // upnp
		$li2       = $pos.' • '.artistAlbum( $artist, $album, $file );
		$html     .=
'<li class="upnp">'.
	i( 'upnp', 'filesavedpl' ).
	'<div class="li1"><a class="name">'.$title.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
		$count->upnp++;
		continue;
	}
	// webradio / dabradio
	if ( str_contains( $file, '://' ) ) {
		$urlname   = str_replace( '/', '|', $file );
		$radio     = str_contains( $file, ':8554' ) ? 'dabradio' : 'webradio';
		$fileradio = '/srv/http/data/'.$radio.'/'.$urlname;
		if ( ! file_exists( $fileradio ) ) $fileradio = exec( 'find /srv/http/data/'.$radio.'/ -name "'.$urlname.'" | head -1' );
		$station   = $fileradio ? exec( 'head -1 "'.$fileradio.'"' ) : '';
	} else {
		$urlname   = str_replace( '#', '%23', $urlname );
		$station   = '';
	}
	$li2           = $pos.'<a class="artist hide"></a><a class="station hide">';
	if ( $station !== '' ) {
		$notsaved = '';
		$li2     .= $station;
		$thumbsrc = '/data/'.$radio.'/img/'.$urlname.'-thumb.jpg';
		$icon     = imgIcon( $thumbsrc, 'filesavedpl', $radio );
	} else {
		$notsaved = ' notsaved';
		$icon     = i( 'save savewr' ).i( 'webradio', 'filesavedpl' );
		$station  = '. . .';
	}
	$li2          .= '</a><a class="url">'.preg_replace( '/#charset=.*/', '', $file ).'</a>';
	$html         .=
'<li class="webradio '.$notsaved.'">'.
	'<a class="lipath">'.preg_replace( '/\?.*$/', '', $file ).'</a>'.
	$icon.
	'<div class="li1"><a class="name">'.$station.'</a><a class="elapsed"></a></div>'.
	'<div class="li2">'.$li2.'</div>'.
'</li>
';
	$count->radio++;
}
$counthtml = '';
if ( $name ) {
	$counthtml.='<a class="lipath">'.$name.'</a><span class="name">'.i( 'playlists savedlist' ).$name.'</span> <gr>·</gr>';
}
if ( $count->song ) {
	$counthtml.= '<a id="pl-trackcount">'.number_format( $count->song ).'</a>'.i( 'music' ).'<a id="pl-time" data-time="'.$count->time.'">'.second2HMS( $count->time ).'</a>';
}
if ( $count->radio ) $counthtml.= i( 'webradio' ).'<a id="pl-radiocount">'.$count->radio.'</a>';
if ( $count->upnp )  $counthtml.= '&emsp;'.i( 'upnp' );
output();
