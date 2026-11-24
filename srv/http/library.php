<?php

include 'function.php'; // $hash

$post    = ( object ) $_POST;
$CMD     = $post->library ?? $argv[ 1 ];
$GMODE   = $post->gmode ?? null;
$MODE    = $post->mode ?? null;
$STRING  = $post->string ?? null;
$html    = '<ul id="lib-list" class="list">';
$index0  = '';
$indexes = [];
$dirbash     = '/bin/sudo /srv/http/bash/';
$dirdata     = '/srv/http/data/';
$dirmpd      = $dirdata.'mpd/';
$dirsystem   = $dirdata.'system/';
$filedisplay = $dirsystem.'display.json';

switch( $CMD ) {

case 'find':
	$MPD      = MphpD();
	$lists    = $MPD->db()->find( MphpD_filter( $post->target ) );
	if ( isset( $lists[ 'directories' ] ) ) {
		htmlDirectory();
	} else {
		htmlTrack();
	}
	break;
case 'findmode':
	$MPD      = MphpD();
	$lists    = $MPD->db()->find( MphpD_filter( $post->target ) );
	$dir_prev = '';
	foreach( $lists as $l ) {
		$l           = ( object ) $l;
		$dir_mpd     = dirname( $l->file );
		if ( cueFile( $dir_mpd ) ) $dir_mpd = dirname( $dir_mpd );
		if ( $dir_mpd === $dir_prev ) continue;
		
		$each        = ( object ) [];
		$each->album = $l->album;
		$each->sort  = stripSort( $l->album );
		$each->path  = $dir_mpd;
		$dir_prev    = $dir_mpd;
		$array[]     = $each;
	}
	sortList( $array );
	foreach( $array as $each ) {
		$dataindex = dataIndex( $each->sort );
		$path      = $each->path;
		$icon      = iconThumb( '/mnt/MPD/'.$path.'/thumb.jpg', $GMODE );
		$html     .= '
<li data-mode="album"'.$dataindex.'>
	'.$icon.'
	<a class="lipath">'.$path.'</a>
	<a class="liname">'.$each->album.'</a>
	<span class="single name">'.$each->album.'<gr> • '.$each->path.'</gr></span>
</li>';
	}
	$html.= indexBar( $indexes );
	echo $html;
	break;
case 'home':
	$labels    = [ 'Album', 'Artist', 'Album Artist', 'Composer', 'Conductor', 'Date',      'Genre' ,    'Latest'
				 , 'NAS',   'NVMe',   'SATA',         'SD',       'USB',       'Playlists', 'Web Radio', 'DAB Radio' ];
	$html      = [];
	foreach( $labels as $label ) {
		$mode          = strtolower( str_replace( ' ', '', $label ) );
		$gr            = fileMode( $mode ) ? '' : '<gr></gr>';
		$html[ $mode ] = '
<li class="mode '.$mode.'">
	<i class="i-'.$mode.'"></i>'.$gr.'<a class="label">'.$label.'</a>
	<a class="name hide">'.$mode.'</a>
</li>';
	}
	// bookmarks
	$dirbk     = $dirdata.'bookmarks';
	$files     = array_slice( scandir( $dirbk ), 2 ); // remove ., ..
	if ( count( $files ) ) {
		foreach( $files as $name ) {
			$path  = rtrim( file_get_contents( $dirbk.'/'.$name ), "\n" );
			$path0 = $path[ 0 ];
			if ( $path0 === 'h' || $path0 === 'r' ) {
				$bkradio = ' bkradio';
				$cover   = radioDir( $path ); // http://... > /data/webradio/...
			} else {
				$bkradio = '';
				if ( $path0 !== '/' ) {
					$cover = '/mnt/MPD/'.$path;            // USB/... > /mnt/MPD/USB/...
				} else if ( $path[ 1 ] === 's' ) {
					$cover = substr( $path, 9 );           // /srv/http/... > /data/...
				} else {
					$cover = $path;
				}
			}
			$html[ $name ] = '
<li class="mode bookmark'.$bkradio.'">
	<a class="lipath">'.$path.'</a>
	<a class="name hide">'.$name.'</a>
	<img class="bkcoverart" src="'.$cover.'/coverart.jpg'.$hash.'">
</li>';
		}
	}
	$lsdir     = exec( $dirbash.'cmd.sh countmnt' );
	$lsmnt     = json_decode( $lsdir );
	$htmlhome  = '';
	$fileorder = $dirsystem.'order.json';
	if ( file_exists( $fileorder ) ) {
		$order = json_decode( file_get_contents( $fileorder ) );
		foreach( $order as $o ) $htmlhome.= $html[ $o ];
	} else {
		foreach( $html as $o => $h ) $htmlhome.= $h;
	}
	echo json_encode( [
		  'html'  => $htmlhome
		, 'lsmnt' => $lsmnt
	] );
	break;
case 'list':
	$mode_file  = $dirmpd.$MODE;
	$mode_album = in_array( $MODE, [ 'album', 'latest' ] );
	if ( $mode_album ) {
		$display = json_decode( file_get_contents( $filedisplay ) );
		if ( $display->albumbyartist ) $mode_file.= 'byartist';
		if ( $display->albumyear ) $mode_file.= '-year';
	}
	$lists = file( $mode_file, FILE_IGNORE_NEW_LINES );
	if ( ! count( $lists ) ) exit;
//----------------------------------------------------------------------------------
	if ( ! $mode_album ) {
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$dataindex = dataIndex( $data[ 0 ] );
			$name      = $data[ 1 ];
			$html     .= '
<li data-mode="'.$MODE.'"'.$dataindex.'>
	<a class="lipath">'.$name.'</a>
	'.icon(  $GMODE, $MODE ).'<span class="single name">'.$name.'</span>
</li>';
		}
	} else {
		global $display;
		foreach( $lists as $list ) {
			$data      = explode( '^^', $list );
			$dataindex = dataIndex( $data[ 0 ] );
			$path      = end( $data );
			if ( cueFile( $path ) ) $path = dirname( $path );
			$thumbfile = rawurlencode( '/mnt/MPD/'.$path.'/' ).'coverart.jpg'.$hash;
			if ( $display->albumbyartist ) {
				$artist = $data[ 1 ];
				$l1     = $artist;
				if ( $display->albumyear ) {
					$year  = $data[ 2 ];
					$album = $data[ 3 ];
					$l2    = $year ? ( strlen( $year ) < 5 ? $year : date( 'Y', strtotime( $year ) ) ) : '...';
					$l2   .= '<br>'.$album;
				} else {
					$album = $data[ 2 ];
					$l2    = $album;
				}
			} else {
				$album  = $data[ 1 ];
				$artist = $data[ 2 ];
				$l1     = $album;
				$l2     = $artist;
			}
			$html     .= '
<li class="coverart"'.$dataindex.'>
	<a class="lipath">'.$path.'</a>
	<a class="liname">'.$album.'</a>
	<img loading="lazy" src="'.$thumbfile.'">
	<a class="coverart1">'.$l1.'</a>
	<a class="coverart2">'.$l2.'</a>
</li>';
		}
	}
	$html    .= indexBar( $indexes );
	echo $html;
	break;
case 'ls':
	if ( cueFile( $STRING ) ) $STRING = dirname( $STRING );
	$MPD = MphpD();
	$ls  = $MPD->db()->ls( $STRING, true );
	if ( ! $ls ) exit;
//----------------------------------------------------------------------------------
	if ( isset( $post->count ) ) { // main.js - .li-icon
		echo 1;
		exit;
//----------------------------------------------------------------------------------
	}
	foreach( [ 'directories', 'files', 'playlists' ] as $k ) $$k = count( $ls[ $k ] );
	if ( $directories ) { // keys: last-modified, name
		$lists = [];
		foreach( $ls[ 'directories' ] as $d ) {
			$dir = $d[ 'name' ];
			if ( ! cueFile( $dir ) ) $lists[] = $dir; // *.cue listed as directory + playlist
		}
		if ( count( $lists ) ) {
			if ( $files ) { // keys: last-modified, ...metadata, name
				$file  = array_column( $ls[ 'files' ], 'name' );
				$lists = [ ...$lists, ...$file ]; // name, ...
			}
			htmlDirectory();
			break;
		}
	}
	if ( $files ) {
		$lists = $ls[ 'files' ];  // ...metadata, name
		htmlTrack();
	} else if ( $playlists ) { // keys: last-modified, name
		$lists = [];
		foreach( $ls[ 'playlists' ] as $p ) { // get *.cue only
			$file  = $p[ 'name' ];
			if ( ! cueFile( $file ) ) continue;
			
			$list  =  $MPD->db()->ls( $file, true )[ 'files' ]; // keys: range, ...metadata, 'name'
			$lists = [ ...$lists, ...$list ]; // file, ...metadata
		}
		htmlTrack();
	}
	break;
case 'lsdir': // for including directories not yet in database
	exec( 'ls -d /mnt/MPD/'.$STRING.'/* | sed -E -e "s|^/mnt/MPD/||" -e "/NAS\/data$/ d"', $lists );
	htmlDirectory();
	break;
case 'radio':
	$subdirs = [];
	$dirs    = [];
	exec( 'ls -d "'.$STRING.'"/*/'
		, $lists );
	foreach( $lists as $list ) {
		if ( file_exists( $list.'data' ) ) {
			$dirs[] = $list;
		} else {
			$subdirs[] = $list;
		}
	}
	htmlRadio();
	break;
case 'search':
	$search = true;
	$html   = str_replace( 'lib', 'search', $html );
	$count  = 0;
	$t      = [];
	foreach( [ 'albumartist', 'artist', 'album', 'composer', 'conductor', 'title' ] as $tag ) {
		unset( $lists );
		$TITLE = $tag === 'title';
		if ( ! $TITLE ) {
			$suffix = $tag === 'album' ? '.*^^.*^^' : '';
			exec( 'grep -i "^.^^.*'.$STRING.$suffix.'" '.$dirmpd.$tag
				, $lists );
		} else {
			$MPD   = MphpD();
			$lists = $MPD->db()->search( MphpD_filter( [ 'title', 'contains', $STRING ] ) );
		}
		$c     = count( $lists );
		if ( ! $c ) continue;

		$count+= $c;
		$t[]   = $tag;
		if ( ! $TITLE ) {
			foreach( $lists as $list ) {
				$data = explode( '^^', $list );
				$name = $data[ 1 ];
				$path = $tag === 'album' ? end( $data ) : $name;
				$html.= '
<li data-mode="'.$tag.'">
	<a class="lipath">'.$path.'</a>
	'.icon(  $tag, $tag ).'
	<span class="single name">'.preg_replace( "/($STRING)/i", '<bll>$1</bll>', $name ).'</span>
</li>';
			}
		} else {
			$GMODE  = 'file';
			htmlTrack();
		}
	}
	foreach( [ 'webradio', 'dabradio' ] as $radio ) {
		$dir_radio = $dirdata.$radio;
		if ( ! is_dir( $dir_radio ) ) continue;
		
		unset( $lists );
		exec( 'find '.$dir_radio.' -type d -iname "*'.$STRING.'*" -printf "%p/"'
			, $lists );
		if ( ! count( $lists ) ) continue;
		
		$subdirs = [];
		$dirs    = [];
		foreach( $lists as $list ) if ( file_exists( $list.'data' ) ) $dirs[] = $list;
		$c       = count( $dirs );
		if ( ! $c ) continue;
		
		$count  += $c;
		$t[]     = $radio;
		htmlRadio();
	}
	if ( $count ) {
		$html.= '
</ul>
<div class="index modes">';
		foreach( $t as $mode ) $html.= icon(  $mode );
		$html.= '
</div>';
		echo json_encode( [ 'html' => $html, 'count' => $count ] );
	} else {
		echo -1;
	}
	break;
case 'tag':
	$MPD = MphpD();
	if ( cueFile( $STRING ) ) {
		$lists = $MPD->playlist( $STRING )->get_songs( true );
	} else {
		$lists = $MPD->db()->ls( $STRING, true )[ 'files' ]; // true - metadata
	}
	$data = [];
	$tags = array_map( 'strtolower', $post->tags );
	if ( in_array( 'track', $tags ) ) {
		$lists = $lists[ 0 ];
		foreach( $tags as $tag ) $data[ $tag ] = $lists[ $tag ] ?? '';
	} else {
		$data = albumMeta( $tags );
	}
	$data = array_change_key_case( $data, CASE_UPPER );
	echo json_encode( $data );
	break;

}

function albumMeta( $tags ) {
	global $lists;
	$data = [];
	foreach( $lists as $l ) {
		foreach( $tags as $tag ) $data[ $tag ][] = $l[ $tag ] ?? '';
	}
	$meta = [];
	foreach ( $data as $tag => $values ) {
		$v            = array_unique( $values );
		$meta[ $tag ] = count( $v ) > 1 ? '*' : ( reset( $v ) ?: '' );
	}
	return $meta;
}
function fileMode( $mode ) {
	return in_array( $mode, [ 'nas', 'nvme', 'sata', 'sd', 'usb' ] );
}
function htmlDirectory() {
	global $GMODE, $html, $index0, $indexes, $lists;
	foreach( $lists as $list ) {
		$dir        = basename( $list );
		$each       = ( object ) [];
		$each->path = $list;
		$each->dir  = $dir;
		$each->sort = stripSort( $dir );
		$array[]    = $each;
	}
	sortList( $array );
	$htmld = '';
	$htmlf = '';
	foreach( $array as $each ) {
		$path      = $each->path;
		$dataindex = dataIndex( $each->sort );
		$name      = fileMode( $GMODE ) ? basename( $path ) : $path;
		$fullpath  = '/mnt/MPD/'.$path;
		$dir       = is_dir( $fullpath );
		if ( $dir ) {
			$mode  = strtolower( explode( '/', $path )[ 0 ] );
			$icon  = iconThumb( $fullpath.'/thumb.jpg', 'folder' );
		} else {
			$mode  = $GMODE;
			$icon  = icon(  'music ', 'file' );
		}
		$htmlli   = '
<li data-mode="'.$mode.'"'.$dataindex.'>
	'.$icon.'
	<a class="lipath">'.$path.'</a>
	<span class="single name">'.$name.'</span>
</li>';
		if ( $dir ) {
			$htmld .= $htmlli;
		} else {
			$htmlf.= $htmlli;
		}
	}
	$html .= $htmld.$htmlf.indexBar( $indexes );
	echo $html;
}
function htmlRadio() {
	global $dirs, $html, $index0, $indexes, $search, $STRING, $subdirs;
	if ( count( $subdirs ) ) {
		foreach( $subdirs as $subdir ) {
			$each          = ( object ) [];
			$dirname       = basename( $subdir );
			$each->dir     = $subdir;
			$each->dirname = $dirname;
			$each->sort    = stripSort( $dirname );
			$array[]       = $each;
		}
		sortList( $array );
		foreach( $array as $each ) {
			$dataindex = count( $dirs ) ? '' : dataIndex( $each->sort );
			$thumbsrc  = substr( $each->dir, 9 ).'thumb.jpg'; // /srv/http/data/webradio/... > /data/webradio/STATION/
			$html     .= '
<li class="dir" data-mode="'.$MODE.'" '.$dataindex.'>
	'.iconThumb( $thumbsrc, 'wrdir' ).'
	<a class="lipath">'.rtrim( $each->dir, '/' ).'</a>
	<span class="single name">'.$each->dirname.'</span>
</li>';
		}
	}
	if ( count( $dirs ) ) {
		unset( $array );
		foreach( $dirs as $dir ) {
			$each          = ( object ) [];
			$name          = basename( $dir );
			$data          = file( $dir.'data', FILE_IGNORE_NEW_LINES );
			$each->url     = $data[ 0 ] ?? '';
			$each->charset = $data[ 2 ] ?? '';
			$each->dir     = $dir;
			$each->name    = $name;
			$each->sort    = stripSort( $name );
			$array[]       = $each;
		}
		sortList( $array );
		foreach( $array as $each ) {
			$dataindex = $search ? '' : dataIndex( $each->sort );
			$charset   = $each->charset ? ' data-charset="'.$each->charset.'"' : '';
			$dir       = $each->dir; // /srv/http/data/webradio/STATION/
			$icon      = $search ? icon(  'webradio li-icon' ) : iconThumb( substr( $dir, 9 ).'thumb.jpg', 'webradio' );
			$name      = $each->name;
			$url       = $each->url;
			$li1       = $search ? preg_replace( "/($STRING)/i", '<bll>$1</bll>', $name ) : $name;
			$html     .= '
<li data-mode="webradio" '.$charset.$dataindex.'>
	'.$icon.'
	<a class="lipath">'.$url.'</a>
	<a class="liname">'.$name.'</a>
	<div class="li1 name">'.$li1.'</div>
	<div class="li2">'.$url.'</div>
</li>';
		}
	}
	if ( $search ) return $html;

	$html.= '</ul>'.indexBar( $indexes );
	echo $html;
}
function htmlTrack() { // track list - no sort
	global $lists, $MPD;
	if ( ! count( $lists ) ) {
		echo -1;
		exit;
//----------------------------------------------------------------------------------
	}
	global $dirbash, $filedisplay, $GMODE, $hash, $html, $search, $STRING, $tag;
	if ( ! $search ) $html = str_replace( '">', ' track">' , $html );
	$hide        = ( object ) [];
	$hide->cover = exec( 'grep "hidecover.*true" '.$filedisplay );
	if ( ! $hide->cover && ! $search ) {
		$file     = $lists[ 0 ][ 'name' ] ?? $lists[ 0 ][ 'file' ]; // name: ls, file: find
		$pathinfo = pathinfo( $file );
		$mpdpath  = $pathinfo[ 'dirname' ];
		$tags     = [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ];
		$data     = ( object ) albumMeta( $tags );
		if ( cueFile( $mpdpath ) ) { // ...dir/file.cue
			$licue    = '<a class="licue">'.$mpdpath.'</a>';
			$file_cue = glob( '/mnt/MPD/'.dirname( $mpdpath ).'/*.cue' );
			$icon_cue = icon( 'playlist' );
			$cue_src  = [];
			foreach( $file_cue as $f ) {
				foreach ( file( $f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES ) as $l ) {
					if ( ! str_starts_with( $l, 'FILE' ) ) continue;
					
					$src                       = explode( '"', $l )[ 1 ];
					$cue_src[ basename( $f ) ] = $src.$icon_cue;
					break;
				}
			}
			$ext      = pathinfo( $src, PATHINFO_EXTENSION );
			$pathinfo = pathinfo( $mpdpath );
			$mpdpath  = $pathinfo[ 'dirname' ];
			$exticon  = icon( 'file-playlist' ).'<c>CUE</c>';
		} else {
			$licue    = '';
			$exticon  = '';
			$ext      = $pathinfo[ 'extension' ];
		}
		$coverart = exec( $dirbash.'status -C "/mnt/MPD/'.addcslashes( $mpdpath, '"`' ).'"' );
		if ( ! $coverart ) {
			$coverart = '/assets/img/coverart.svg';
			$args     = implode( "\n", [ 'cmd', $data->album, $data->artist, $mpdpath, 'CMD ALBUM ARTIST LIPATH' ] );
			exec( $dirbash.'status-coverart.sh "'.addcslashes( $args, '"`' ).'" &> /dev/null &' );
		}
		$seconds   = array_sum( array_column( $lists, 'time' ) );
		$totaltime = second2HMS( $seconds );
		$mpdpath   = str_replace( '\"', '"', $mpdpath );
		$html     .= '
<li data-mode="'.$GMODE.'" class="licover">
	<a class="lipath">'.$mpdpath.'</a>
	'.$licue.'
	<div class="licoverimg"><img id="liimg" src="'.rawurlencode( $coverart ).$hash.'"></div>
	<div class="liinfo '.$GMODE.'">';
	if ( $data->albumartist ) array_splice( $tags, 2, 1 );
	foreach( $tags as $t ) {
		if ( ! $data->$t || $GMODE === $t ) continue;
		
		$icon = $t === 'album' ? '' : icon( $t );
		$text = $data->$t === '*' ? '<g>(Various '.$t.'s)</g>' : $data->$t;
		$html.= '<div class="li'.$t.'">'.$icon.$text.'</div>';
	}
	$html.= '<br><div class="liinfopath"><i class="i-folder"></i>'.$mpdpath.'</div>
			'.icon(  'music', 'folder' ).count( $lists ).'<gr> • </gr>'.$totaltime.'&emsp;<c>'.strtoupper( $ext ).'</c>'.$exticon.'
	</div>
</li>';
	}
	$i    = 0;
	foreach( $lists as $each ) {
		if ( ! isset( $each[ 'time' ] ) ) continue;
		
		$each  = ( object ) $each;
		$file  = $each->file ?? $each->name;
		$title = $each->title;
		if ( ! $title ) $title = pathinfo( $each->file, PATHINFO_FILENAME );
		if ( $search ) {
			$datamode  = 'title';
			$icon      = icon(  $tag === 'title' ? 'music' : $tag, 'file' ); // $tag from global
			$title     = preg_replace( "/($STRING)/i", '<bll>$1</bll>', $title );
			$track1    = '';
			$trackname = $each->artist.' - '.$each->album;
		} else {
			$datamode  = $GMODE;
			$icon      = icon(  'music', 'file' );
			$track1    = ( $i || $hide->cover ) ? '' : ' class="track1"';
			if ( $licue ) {
				$datatrack = ' data-track="'.( int )substr( $file, -4 ).'"';
				$trackname = $cue_src[ basename( dirname( $file ) ) ];
			} else {
				$datatrack = '';
				$trackname = basename( $file );
			}
		}
		$i++;
		$html  .= '
<li data-mode="'.$datamode.'" '.$datatrack.$track1.'>
	<a class="lipath">'.$file.'</a>
	'.$icon.'
	<div class="li1"><a class="name">'.$title.'</a><a class="time">'.second2HMS( $each->time ).'</a></div>
	<div class="li2">'.$i.' • '.$trackname.'</div>
</li>';
	}
	if ( $search ) return $html;

	echo $html.'</ul>';
}
