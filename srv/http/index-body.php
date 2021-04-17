<?php
$svg = preg_grep( '/<rect|<path/', file( '/srv/http/assets/img/icon.svg' ) );
$logo = '<svg viewBox="0 0 180 180">'.implode( '', $svg ).'</svg>';

if ( $login && !$_SESSION[ 'login' ] ) { ?>
<style>
	#divlogin rect { fill: var( --cm ); }
	#divlogin path { fill: var( --cg75 ); }
</style>
<div id="divlogin">
	<?=$logo?><br>
	<input type="password" id="pwd"><i class="fa fa-eye"></i>
	<a id="login" class="btn btn-primary">Login</a>
</div>
<script src="assets/js/plugin/jquery-2.2.4.min.js"></script>
<script src="assets/js/info.<?=$time?>.js"></script>
<script>
$( '#pwd' ).focus();
$( '#divlogin i' ).click( function() {
	$this = $( this );
	$pwd = $( '#pwd' );
	if ( $pwd.prop( 'type' ) === 'text' ) {
		$this.removeClass( 'eyeactive' );
		$pwd.prop( 'type', 'password' );
	} else {
		$this.addClass( 'eyeactive' );
		$pwd.prop( 'type', 'text' );
	}
} );
$( '#login' ).click( function() {
	$.post( 'cmd.php', { cmd: 'login', password: $( '#pwd' ).val() }, function( data ) {
		if ( data != -1 ) {
			location.reload();
		} else {
			info( {
				  icon    : 'lock'
				, title   : 'Login'
				, message : 'Wrong password'
			} );
		}
	} );
} );
$( '#pwd' ).keypress( function( e ) {
	if ( e.which == 13 ) $( '#login' ).click();
});
</script>

</body>
</html>
<?php
	exit;
}
$dirdata = '/srv/http/data/';
$dirsystem = '/srv/http/data/system/';
$color = file_exists( $dirsystem.'color' );
// counts
$filecounts = $dirdata.'mpd/counts';
$counts = file_exists( $filecounts ) ? json_decode( file_get_contents( $filecounts ) ) : '';
// library home blocks
$modes = [ 'SD', 'USB', 'NAS', 'WebRadio', 'Album', 'Artist', 'AlbumArtist', 'Composer', 'Conductor', 'Date', 'Genre' ];
$modehtml = '';
foreach( $modes as $mode ) {
    $modeLC = strtolower( $mode );
	$modehtml.= '
		<div class="lib-mode">
			<div id="mode-'.$modeLC.'" class="mode" data-mode="'.$modeLC.'">
				<a class="lipath">'.$mode.'</a>
				<i class="fa fa-'.$modeLC.'"></i>
				'.( $counts && $counts->$modeLC ? '<grl>'.number_format( $counts->$modeLC ).'</grl>' : '<grl></grl>' ).'
				<a class="label">'.$mode.'</a>
			</div>
		</div>
	';
}
// bookmarks
$dir = $dirdata.'bookmarks';
$files = array_slice( scandir( $dir ), 2 ); // remove ., ..
if ( count( $files ) ) {
	foreach( $files as $name ) {
		$mpdpath = rtrim( file_get_contents( "$dir/$name" ) );
		$path = '/mnt/MPD/'.$mpdpath;
		$pathcoverart = $path.'/coverart.';
		$ext = '';
		$dataalbum = '';
		if ( file_exists( $pathcoverart.'gif' ) ) {
			$ext = '.gif';
		} else if ( file_exists( $pathcoverart.'jpg' ) ) {
			$ext = '.jpg';
		}
		if ( $ext ) {
			$iconhtml = '<img class="bkcoverart" src="'.rawurlencode( $pathcoverart ).time().$ext.'">';
			if ( file_exists( $path.'/thumb'.$ext ) ) $dataalbum = 'data-album="1"';
		} else {
			$iconhtml = '<i class="fa fa-bookmark"></i>'
					   .'<div class="divbklabel"><span class="bklabel label">'.str_replace( '|', '/', $name ).'</span></div>';
		}
		$modehtml.= '
			<div class="lib-mode bookmark">
				<div class="mode mode-bookmark" data-mode="bookmark" '.$dataalbum.'>
					<a class="lipath">'.$mpdpath.'</a>
					'.$iconhtml.'
				</div>
			</div>
		';
	}
}
// context menus
function menuli( $command, $icon, $label ) {
	return '<a data-cmd="'.$command.'" class="'.$command.'"><i class="fa fa-'.$icon.'"></i>'.$label.'</a>';
}
function menudiv( $id, $html ) {
	return '<div id="menu-'.$id.'" class="menu contextmenu hide">'.$html.'</div>';
}
function menucommon( $add, $replace ) {
	$htmlcommon = '<a data-cmd="'.$add.'" class="add sub"><i class="fa fa-plus-o"></i>Add</a><i class="fa fa-play-plus submenu" data-cmd="'.$add.'play"></i>';
	$htmlcommon.= '<a data-cmd="'.$replace.'" class="replace sub"><i class="fa fa-replace"></i>Replace</a><i class="fa fa-play-replace submenu" data-cmd="'.$replace.'play"></i>';
	return $htmlcommon;
}

$kid3 = file_exists( '/usr/bin/kid3-cli' );
$menulisimilar = '<a data-cmd="similar" class="similar sub"><i class="fa fa-lastfm"></i>Add similar</a><i class="fa fa-play-plus submenu" data-cmd="similar"></i>';
$menu = '<div id="contextmenu">';

$htmlcommon = menucommon( 'add', 'replace' );

$html = menuli( 'play',       'play',         'Play' );
$html.= menuli( 'pause',      'pause',        'Pause' );
$html.= menuli( 'stop',       'stop',         'Stop' );
$html.= menuli( 'current',    'check',        'Current' );
$html.= menuli( 'savedpladd', 'save-plus',    'Add to a playlist' );
$html.= menuli( 'remove',     'minus-circle', 'Remove' );
$html.= $menulisimilar;
$html.= menuli( 'tag',        'info-circle',  'Track Info' );
$menu.= menudiv( 'plaction', $html );

$menudiv = '';
$html = $htmlcommon;
$html.= menuli( 'bookmark',  'star',            'Bookmark' );
$html.= menuli( 'exclude',   'folder-forbid',   'Exclude directory' );
$html.= menuli( 'update',    'refresh-library', 'Update database' );
$html.= menuli( 'thumb',     'coverart',        'Update thumbnails' );
if ( $kid3 ) $html.= menuli( 'tag', 'tag', 'Tag Editor' );
$menu.= menudiv( 'folder', $html );

$menudiv = '';
$html = menucommon( 'add', 'replace' );
$html.= $menulisimilar;
if ( $kid3 ) $html.= menuli( 'tag', 'tag', 'Tag Editor' );
$menu.= menudiv( 'file', $html );

$menudiv = '';
$html = $htmlcommon;
$menu.= menudiv( 'filepl', $html );

$menudiv = '';
$html = $htmlcommon;
$html.= menuli( 'similar',       'lastfm',       'Add similar' );
$html.= menuli( 'savedplremove', 'minus-circle', 'Remove' );
if ( $kid3 ) $html.= menuli( 'tag', 'tag', 'Tag Editor' );
$menu.= menudiv( 'filesavedpl', $html );

$menudiv = '';
$html = menucommon( 'add', 'replace' );
$menu.= menudiv( 'radio', $html );

$menudiv = '';
$html = menucommon( 'wradd', 'wrreplace' );
$html.= menuli( 'wredit',     'edit-circle',  'Edit' );
$html.= menuli( 'wrcoverart', 'coverart',     'Change coverart' );
$html.= menuli( 'wrdelete',   'minus-circle', 'Delete' );
$menu.= menudiv( 'webradio', $html );

$menudiv = '';
$html = menucommon( 'pladd', 'plreplace' );
$html.= menuli( 'plrename', 'edit-circle',  'Rename' );
$html.= menuli( 'pldelete', 'minus-circle', 'Delete' );
$menu.= menudiv( 'playlist', $html );

foreach( [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ] as $mode ) {
	$menudiv = '';
	$html = menucommon( $mode.'add', $mode.'replace' );
	$menu.= menudiv( $mode, $html );
}

$menu.= '</div>';
$libraryicon = $localhost ? 'fa-refresh-library' : 'fa-library blink';
?>
<pre id="data" class="hide"></pre>
<div id="loader" class="splash">
	<?=$logo?>
</div>
<div id="bar-top" class="hide">
	<i id="logo" class="fa fa-plus-r-nobox"></i>
	<i id="button-settings" class="fa fa-gear"></i>
	<div id="playback-controls">
		<i id="previous" class="btn btn-default btn-cmd fa fa-previous"></i>
		<i id="stop" class="btn btn-default btn-cmd fa fa-stop"></i>
		<i id="play" class="btn btn-default btn-cmd fa fa-play"></i>
		<i id="pause" class="btn btn-default btn-cmd fa fa-pause"></i>
		<i id="next" class="btn btn-default btn-cmd fa fa-next"></i>
	</div>
</div>
<div id="settings" class="menu hide">
	<a id="features" class="settings"><i class="fa fa-sliders"></i>Features</a>
	<a id="player" class="settings"><i class="fa fa-player"></i>Player</a>
	<a id="networks" class="settings"><i class="fa fa-networks"></i>Networks</a>
	<a id="system" class="settings"><i class="fa fa-plus-r"></i>System</a>
	<a id="power"><i class="fa fa-power"></i>Power</a>
	<a id="displaylibrary" class="sub"><i class="fa fa-library"></i>Library</a>
		<i id="displaylibrary2" class="hide"></i>
		<i id="update" class="fa fa-refresh-library submenu"></i>
	<a id="displayplayback" class="sub"><i class="fa fa-play-circle"></i>Playback</a>
		<i id="displaycolor" class="submenu"><canvas id="iconrainbow"></i>
	<a id="addons" class="sub"><i class="fa fa-jigsaw"></i>Addons</a>
		<i id="guide" class="fa fa-question-circle submenu"></i>
</div>

<div id="page-playback" class="page">
	<i id="button-data" class="fa fa-redo transparent"></i>
	<div class="emptyadd hide"><i class="fa fa-plus-circle"></i></div>
	<i id="guide-bio" class="map guide fa fa-bio"></i>
	<i id="guide-lyrics" class="map guide fa fa-lyrics"></i>
	<i id="guide-album" class="map guide fa fa-album"></i>
	<div id="info">
		<div id="divartist">
			<span id="artist"></span>
		</div>
		<div id="divsong">
			<span id="song"></i></span>
		</div>
		<div id="divalbum">
			<span id="album"></span>
		</div>
		<div id="infoicon">
			<i id="i-airplay" class="fa fa-airplay wh hide"></i>
			<i id="i-bluetooth" class="fa fa-bluetooth wh hide"></i>
			<i id="i-snapclient" class="fa fa-snapclient wh hide"></i>
			<i id="i-spotify" class="fa fa-spotify wh hide"></i>
			<i id="i-upnp" class="fa fa-upnp wh hide"></i>
			<i id="i-webradio" class="fa fa-webradio wh hide"></i>
			<span id="progress"></span>
			<span id="modeicon">
				<i id="i-random" class="fa fa-random hide"></i>
				<i id="i-repeat" class="fa fa-repeat hide"></i>
				<i id="i-repeat1" class="fa fa-repeat-single hide"></i>
				<i id="i-consume" class="fa fa-flash hide"></i>
				<i id="i-librandom" class="fa fa-dice hide"></i>
				<i id="i-mute" class="fa fa-mute hide"></i>
				<i id="i-btclient" class="fa fa-bluetooth-client hide"></i>
				<i id="i-update" class="fa <?=$libraryicon?> hide"></i>
				<i id="i-addons" class="fa fa-jigsaw hide"></i>
				<i id="i-relays" class="fa fa-relays hide"></i>
			</span>
		</div>
		<div id="sampling"></div>
	</div>
	<div id="playback-row" class="row">
		<div id="time-knob">
			<div id="time"></div>
			<div id="timeicon">
				<i id="ti-random" class="fa fa-random hide"></i>
				<i id="ti-repeat" class="fa fa-repeat hide"></i>
				<i id="ti-repeat1" class="fa fa-repeat-single hide"></i>
				<i id="ti-consume" class="fa fa-flash hide"></i>
				<i id="ti-librandom" class="fa fa-dice hide"></i>
				<i id="ti-mute" class="fa fa-mute hide"></i>
				<i id="ti-btclient" class="fa fa-bluetooth-client hide"></i>
				<i id="ti-update" class="fa <?=$libraryicon?> hide"></i>
				<i id="ti-addons" class="fa fa-jigsaw hide"></i>
				<i id="ti-relays" class="fa fa-relays hide"></i>
			</div>
			<span id="elapsed" class="controls1"></span>
			<span id="total" class="controls1"></span>
			<div id="timemap">
				<i id="timeTL" class="map timemap fa fa-coverart"></i>
				<i id="timeT" class="map timemap fa fa-guide"></i>
				<i id="timeTR" class="map timemap fa fa-gear"></i>
				<i id="timeL" class="map timemap fa fa-previous"></i>
				<div id="timeM" class="map timemap"><i class="fa fa-play"></i>&nbsp;<i class="fa fa-pause"></i></div>
				<i id="timeR" class="map timemap fa fa-next"></i>
				<i id="timeBL" class="map timemap fa fa-random"></i>
				<i id="timeB" class="map timemap fa fa-stop"></i>
				<i id="timeBR" class="map timemap fa fa-repeat"></i>
			</div>
			<div id="play-group">
				<div class="btn-group">
					<i id="repeat" class="btn btn-default btn-cmd btn-toggle fa fa-repeat"></i>
					<i id="random" class="btn btn-default btn-cmd btn-toggle fa fa-random"></i>
					<i id="single" class="btn btn-default btn-cmd btn-toggle fa fa-single"></i>
				</div>
			</div>
		</div>
		<div id="coverart-block">
			<div id="divcover" class="cover">
				<div id="time-bar"></div>
				<div id="time-band" class="band transparent"></div>
				<img id="coverart" class="cover hide">
				<div id="vu" class="hide">
					<svg viewBox="0 0 230 230">
					<filter id="vushadow"><feDropShadow dx="-3" dy="3" stdDeviation="4"/></filter>
					<rect class="cls-1" width="230" height="125"/>

					<path class="cls-3" d="M147.19,53.55a168.5,168.5,0,0,1,50.93,18.7" transform="translate(0 0)"/><line class="cls-4" x1="154.41" y1="57.16" x2="156.09" y2="50.37"/><line class="cls-5" x1="162.44" y1="59.31" x2="165.13" y2="50.2"/><line class="cls-5" x1="179.48" y1="65.36" x2="183" y2="56.53"/><line class="cls-5" x1="197.04" y1="73.93" x2="201.7" y2="65.65"/>
					
					<line class="cls-2" x1="139.63" y1="54.3" x2="140.66" y2="47.37"/><line class="cls-7" x1="32.97" y1="73.93" x2="28.32" y2="65.64"/><line class="cls-2" x1="98.71" y1="53.19" x2="98.04" y2="46.31"/><line class="cls-2" x1="81.98" y1="55.75" x2="80.6" y2="48.89"/><line class="cls-7" x1="58.68" y1="62.2" x2="55.49" y2="53.25"/><line class="cls-7" x1="74.94" y1="57.32" x2="72.67" y2="48.09"/><line class="cls-7" x1="89.81" y1="54.38" x2="88.38" y2="44.99"/><line class="cls-7" x1="108.81" y1="52.66" x2="108.46" y2="43.12"/><line class="cls-7" x1="120.11" y1="52.58" x2="120.4" y2="43.08"/><line class="cls-7" x1="132.7" y1="53.42" x2="133.71" y2="43.98"/><line class="cls-7" x1="146.81" y1="55.52" x2="148.62" y2="46.19"/><path class="cls-13" d="M156.06,50.5" transform="translate(0 0)"/><path class="cls-13" d="M154.39,57.27" transform="translate(0 0)"/>
					
					<path class="cls-14" d="M70.26,63.06h0" transform="translate(0 0)"/><path class="cls-14" d="M95.2,58.1h0" transform="translate(0 0)"/><path class="cls-14" d="M120.63,57.13h0" transform="translate(0 0)"/><path class="cls-14" d="M145.92,60.09h0" transform="translate(0 0)"/><path class="cls-17" d="M35.08,77.65h0" transform="translate(0 0)"/><path class="cls-17" d="M58.15,67h0" transform="translate(0 0)"/><path class="cls-17" d="M82.65,60.09h0" transform="translate(0 0)"/><path class="cls-17" d="M107.89,57.13h0" transform="translate(0 0)"/><path class="cls-17" d="M133.32,58.1h0" transform="translate(0 0)"/><path class="cls-14" d="M46.39,71.86h0" transform="translate(0 0)"/>
					
					<text class="cls-8" transform="translate(20.51 65.27) rotate(-29.25)">20</text><text class="cls-8" transform="translate(45.98 52.11) rotate(-19.52)">10</text><text class="cls-9" transform="matrix(0.97, -0.24, 0.24, 0.97, 68.42, 44.79)">7</text><text class="cls-8" transform="translate(84.2 41.37) rotate(-8.62)">5</text><text class="cls-10" transform="matrix(1, -0.03, 0.03, 1, 104.8, 39.21)">3</text><text class="cls-8" transform="translate(117.42 38.94) rotate(1.99)">2</text><text class="cls-8" transform="translate(130.78 39.64) rotate(6.36)">1</text><text class="cls-8" transform="translate(146.12 41.64) rotate(11.25)">0</text>
					
					<text class="cls-11" transform="matrix(0.96, 0.29, -0.29, 0.96, 163.17, 45.63)">1</text><text class="cls-12" transform="translate(181.98 52.11) rotate(22.97)">2</text><text class="cls-12" transform="translate(201.02 61.25) rotate(29.82)">3</text>
					
					<text class="cls-15" transform="translate(46.55 83.44) rotate(-24.78)">20</text><text class="cls-16" transform="matrix(0.96, -0.27, 0.27, 0.96, 68.42, 74.4)">40</text><text class="cls-15" transform="translate(91.85 68.91) rotate(-6.75)">60</text><text class="cls-15" transform="translate(115.33 67.27) rotate(2.25)">80</text><text class="cls-15" transform="translate(135.59 68.61) rotate(11.25)">100</text>
					
					<path class="cls-23" d="M108.3,85.9h13.5c0.4,0,0.8,0.3,0.8,0.8v13.5c0,0.4-0.3,0.8-0.8,0.8h-13.5c-0.4,0-0.8-0.3-0.8-0.8V86.7C107.5,86.3,107.8,85.9,108.3,85.9z"/>
					<path class="cls-1" d="M116.5,93.9c2.1-0.8,3.1-3.2,2.3-5.4c-0.6-1.6-2.1-2.6-3.8-2.6v6.8h-3v-3h-1.5v3h-3v1.5h3v3h1.5v-3h3v6.8h1.5V96l4.9,4.9h0.3c0.4,0,0.8-0.3,0.8-0.8v-0.3L116.5,93.9z M116.5,87.9c1.2,0.8,1.5,2.5,0.7,3.7c-0.2,0.3-0.4,0.5-0.7,0.7V87.9z"/>
					
					<g id="vuneedle"><line class="cls-18" x1="114" y1="221" x2="114" y2="44"/><line class="cls-19" x1="115" y1="220" x2="115" y2="43"/></g>
					
					<rect x="10" y="10" class="cls-20" width="210" height="105"/>
					<polygon class="cls-21" points="220.06 115.02 10 115.02 10 9.99 14.03 14 14.03 111 216.03 111 220.06 115.02"/><polygon class="cls-22" points="220.06 115.02 216.03 111 216.03 14 14.03 14 10 9.99 220.06 9.99 220.06 115.02"/>
					
					<line class="cls-24" x1="216" y1="14" x2="220" y2="10"/><line class="cls-24" x1="10" y1="115" x2="14" y2="111"/>
					
					<path d="M0,0V230H230V0ZM220,115H10V10H220Z"/>
					</svg>
				</div>
				<div id="qrwebui"></div>
				<div id="qrip"></div>
				<div id="covermap">
					<i id="coverTL" class="map covermap r1 c1 ws hs fa fa-scale-dn"></i>
					<i id="coverT" class="map covermap r1 c2 wl hs fa fa-guide"></i>
					<i id="coverTR" class="map covermap r1 c3 ws hs fa fa-gear"></i>
					<i id="coverL" class="map covermap r2 c1 ws hl fa fa-previous"></i>
					<div id="coverM" class="map covermap r2 c2 wl hl"><i class="fa fa-play"></i>&emsp;<i class="fa fa-pause"></i></div>
					<i id="coverR" class="map covermap r2 c3 ws hl fa fa-next"></i>
					<i id="coverBL" class="map covermap r3 c1 ws hs fa fa-random"></i>
					<i id="coverB" class="map covermap r3 c2 wl hs fa fa-stop"></i>
					<i id="coverBR" class="map covermap r3 c3 ws hs fa fa-repeat"></i>
				</div>
				<div id="volume-bar" class="hide"></div>
				<i id="volume-band" class="volumeband band fa fa-volume transparent"></i>
				<i id="volume-band-dn" class="volumeband band fa fa-minus transparent"></i>
				<i id="volume-band-up" class="volumeband band fa fa-plus transparent"></i>
				<div id="volume-text" class="hide"></div>
			</div>
		</div>
		<div id="volume-knob">
			<div id="volume"></div>
			<div id="volmap">
				<i id="volT" class="map volmap fa fa-plus"></i>
				<i id="volL" class="map volmap fa fa-minus"></i>
				<i id="volM" class="map volmap fa fa-volume"></i>
				<i id="volR" class="map volmap fa fa-plus"></i>
				<i id="volB" class="map volmap fa fa-minus"></i>
			</div>
			<div id="vol-group">
				<div class="btn-group">
					<i id="voldn" class="btn btn-default fa fa-minus"></i>
					<i id="volmute" class="btn btn-default fa fa-volume"></i>
					<i id="volup" class="btn btn-default fa fa-plus"></i>
				</div>
			</div>
		</div>
	</div>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<i id="button-library" class="fa fa-library active"></i>
		<i id="button-lib-search" class="fa fa-search"></i>
		<div id="lib-search" class="hide">
			<div class="input-group">
				<input id="lib-search-input" class="form-control input" type="text">
				<span class="input-group-btn">
					<button id="lib-search-btn" class="btn btn-default"><i class="fa fa-search"></i></button>
				</span>
			</div>
		</div>
		<div id="lib-search-close"></div>
		<div id="lib-path">
			<i id="button-lib-back" class="fa fa-arrow-left"></i>
			<div id="lib-title"><span class="title">LIBRARY</span><span id="li-count"><?=( number_format( $counts->song ) )?></span><i class="fa fa-music gr"></i></div>
			<div id="lib-breadcrumbs">
			</div>
			<span class="lipath"></span>
		</div>
	</div>
	<div id="lib-mode-list"><?=$modehtml?></div>
	<ul id="lib-list" class="list"></ul>
	<div id="lib-index" class="index index0"></div>
	<div id="lib-index1" class="index index1"></div>
</div>

<div id="page-playlist" class="page hide">
	<div class="emptyadd hide"><i class="fa fa-plus-circle"></i></div>
	<div class="content-top">
		<span id="pl-path"></span>
		<i id="button-playlist" class="fa fa-list-ul active"></i>
		<i id="button-pl-back" class="fa fa-arrow-left hide"></i>
		<i id="button-pl-search" class="fa fa-search pllength"></i>
		<form id="pl-search" class="hide" method="post" onSubmit="return false;">
			<div class="input-group">
				<input id="pl-search-input" class="form-control input" type="text">
				<span class="input-group-btn">
					<button id="pl-search-btn" class="btn btn-default" type="button"><i class="fa fa-search"></i></button>
				</span>
			</div>
		</form>
		<button id="pl-search-close" class="btn hide" type="button"></button>
		<div id="pl-manage" class="playlist">
			<i id="button-pl-open" class="fa fa-folder-open"></i>
			<i id="button-pl-save" class="fa fa-save pllength"></i>
			<i id="button-pl-consume" class="fa fa-flash"></i>
			<i id="button-pl-librandom" class="fa fa-dice"></i>
			<i id="button-pl-shuffle" class="fa fa-shuffle pllength"></i>
			<i id="button-pl-clear" class="fa fa-minus-circle pllength"></i>
		</div>
	</div>
	<ul id="pl-list" class="list playlist"></ul>
	<ul id="pl-savedlist" class="list hide"></ul>
	<div id="pl-index" class="index index0"></div>
	<div id="pl-index1" class="index index1"></div>
</div>

<?=$menu?>

<div id="colorpicker" class="hide">
	<div id="divcolor">
	<i id="colorcancel" class="fa fa-times"></i>
	<canvas id="canvascolor"></canvas><br>
<?php if ( file_exists( $dirsystem.'color' ) ) { ?>
	<a id="colorreset" class="btn">Default</a>&ensp;
<?php } ?>
	<a id="colorok" class="btn btn-primary">Set</a>
	</div>
</div>
<div id="bio" class="hide">
	<div class="container">
		<img id="biobanner">
		<div id="bioimg"></div>
		<div id="biocontent"></div>
	</div>
</div>
<div id="lyrics" class="hide">
	<div id="divlyricstitle">
		<span id="lyricstitle"></span>
		<i id="lyricsclose" class="fa fa-times"></i>
	</div>
	<div id="divlyricsartist">
		<span id="lyricsartist"></span><i id="lyricsedit" class="fa fa-edit-circle"></i>
		<div id="lyricseditbtngroup" class="hide">
			<i id="lyricsundo" class="fa fa-undo hide"></i>
			<i id="lyricssave" class="fa fa-save hide"></i>
			<i id="lyricsdelete" class="fa fa-minus-circle"></i>
			<i id="lyricsback" class="fa fa-arrow-left"></i>
		</div>
	</div>
	<div id="lyricstextoverlay">
		<div id="lyricstext" class="lyricstext"></div>
	</div>
	<textarea id="lyricstextarea" class="lyricstext"></textarea>
	<div id="lyricsfade"></div>
</div>
<div id="bar-bottom"> <!-- keep single line to suppress spaces -->
	<i id="tab-library" class="fa fa-library"></i><i id="tab-playback" class="fa fa-mpd"></i><i id="tab-playlist" class="fa fa-list-ul"></i>
</div>

<?php if ( $localhost ) { ?>
<input class="input hide">
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>
<?php } ?>
