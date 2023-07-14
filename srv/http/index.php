<?php
// <!DOCTYPE html> ---------------------------------------------
include 'common.php';

function i( $id = '', $class ) {
	$htmlid = $id ? ' id="'.$id.'"' : '';
	return '<i'.$htmlid.' class="i-'.$class.'"></i>';
}
// context menus
function menucommon( $add, $replace ) {
	$htmlcommon = '<a data-cmd="'.$add.'" class="add sub">'.i( '', 'plus-o' ).'Add</a><i class="i-play-plus submenu" data-cmd="'.$add.'play"></i>';
	$htmlcommon.= '<a data-cmd="playnext" class="playnext">'.i( '', 'add' ).'Play next</a>';
	$htmlcommon.= '<a data-cmd="'.$replace.'" class="replace sub">'.i( '', 'replace' ).'Replace</a><i class="i-play-replace submenu" data-cmd="'.$replace.'play"></i>';
	return $htmlcommon;
}
function menuli( $list ) {
	$command = $list[ 0 ];
	$icon = $list[ 1 ];
	$label = $list[ 2 ];
	$icon = i( '', $icon );
	return '<a data-cmd="'.$command.'" class="'.$command.'">'.$icon.$label.'</a>';
}
function menudiv( $id, $html ) {
	return '<div id="menu-'.$id.'" class="menu contextmenu hide">'.$html.'</div>';
}
$kid3 = file_exists( '/usr/bin/kid3-cli' );
function htmlmenu( $menulist, $mode ) {
	global $html;
	global $kid3;
	global $menu;
	if ( ! $kid3 ) array_pop( $menulist );
	foreach( $menulist as $list ) $html.= menuli( $list );
	$menu.= menudiv( $mode, $html );
}

$menu = '';
$htmlcommon = menucommon( 'add', 'replace' );
// file
$html = $htmlcommon;
$menulist = [
	  [ 'similar',    'lastfm',        'Add similar' ]
	, [ 'savedpladd', 'file-playlist', 'Add to a playlist' ]
	, [ 'directory',  'folder-open',   'Browse folder' ]
	, [ 'tag',        'tag',           'Tag Editor' ]
];
htmlmenu( $menulist, 'file' );
// filepl
$html = $htmlcommon;
$menu.= menudiv( 'filepl', $html );
// filesavedpl
$html = $htmlcommon;
$menulist = [
	  [ 'similar',       'lastfm',        'Add similar' ]
	, [ 'wrsave',        'save',          'Save to Library' ]
	, [ 'savedpladd',    'file-playlist', 'Add to a playlist' ]
	, [ 'savedplremove', 'remove',  'Remove' ]
	, [ 'tag',           'tag',           'Tag Editor' ]
];
htmlmenu( $menulist, 'filesavedpl' );
// folder
$html = $htmlcommon;
$menulist = [
	  [ 'bookmark',  'star',            'Bookmark' ]
	, [ 'exclude',   'folder-forbid',   'Exclude directory' ]
	, [ 'update',    'refresh-library', 'Update database' ]
	, [ 'thumb',     'coverart',        'Update thumbnails' ]
	, [ 'directory', 'folder-open',     'Browse folder' ]
	, [ 'tag',       'tag',             'Tag Editor' ]
];
htmlmenu( $menulist, 'folder' );
// plaction
$html = '';
$menulist = [
	  [ 'play',       'play',          'Play' ]
	, [ 'pause',      'pause',         'Pause' ]
	, [ 'stop',       'stop',          'Stop' ]
	, [ 'current',    'current',         'Current' ]
	, [ 'wrsave',     'save',          'Save to Library' ]
	, [ 'savedpladd', 'file-playlist', 'Add to a playlist' ]
	, [ 'remove',     'remove',  'Remove' ]
	, [ 'similar',    'lastfm',        'Add similar' ]
	, [ 'tag',        'info-circle',   'Track Info' ]
];
htmlmenu( $menulist, 'plaction' );
// playlist
$html = menucommon( 'pladd', 'plreplace' );
$menulist = [
	  [ 'plrename', 'edit-circle',  'Rename' ]
	, [ 'pldelete', 'remove', 'Delete' ]
];
htmlmenu( $menulist, 'playlist' );
// radio bookmark
$html = menucommon( 'wradd', 'wrreplace' );
$menu.= menudiv( 'bkradio', $html );
// webradio
$html = menucommon( 'wradd', 'wrreplace' );
$menulist = [
	  [ 'bookmark',   'star',         'Bookmark' ]
	, [ 'wredit',     'edit-circle',  'Edit' ]
	, [ 'wrcoverart', 'coverart',     'Change cover art' ]
	, [ 'wrdelete',   'remove', 'Delete' ]
];
htmlmenu( $menulist, 'webradio' );
// wrdir
$html = '';
$menulist = [
	  [ 'bookmark',      'star',         'Bookmark' ]
	, [ 'wrdirdelete',   'remove', 'Delete' ]
	, [ 'wrdirrename',   'edit-circle',  'Rename' ]
];
htmlmenu( $menulist, 'wrdir' );

foreach( [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ] as $mode ) {
	$html = menucommon( $mode.'add', $mode.'replace' );
	$menu.= menudiv( $mode, $html );
}

$menu = '<div id="contextmenu">'.$menu.'</div>';
$ids = [ 'random',   'repeat',    'single',    'repeat1', 'consume', 'librandom', 'mute'
	   , 'btsender', 'libupdate', 'dabupdate', 'addons',  'relays',  'stoptimer' ];
$modeicon = '';
foreach( $ids as $id ) {
	$modeicon.= i( 'mi-'.$id, $id.' hide' );
}
if ( $localhost ) str_replace( 'library blink', 'refresh-library', $modeicon );
$timeicon = str_replace( 'mi-', 'ti-', $modeicon );
$dsp = $equalizer ? 'equalizer' : 'camilladsp';
$settinglist = [
	  [ 'features',        'settings',     'features', 'Features', 'dsp',          'equalizer' ]
	, [ 'player',          'settings',     'player',   'Player',   'logout',       'lock' ]
	, [ 'networks',        'settings',     'networks', 'Networks', 'snapclient',   'snapclient' ]
	, [ 'system',          'settings',     'raudio',   'System',   'relays',       'relays' ]
	, [ 'addons',          'settings sub', 'jigsaw',   'Addons',   'guide',        'help' ]
	, [ 'power',           '',             'power',    'Power',    'screenoff',    'screenoff' ]
	, [ 'displaylibrary',  'sub',          'library',  'Library',  'update',       'refresh-library' ]
	, [ 'displayplayback', 'sub',          'playback', 'Playback', 'displaycolor', 'color' ]
	, [ 'displayplaylist', '',             'playlist', 'Playlist', 'multiraudio',  'multiraudio' ]
];
$htmlsettings     = '';
foreach( $settinglist as $l ) {
	$htmlsettings.= '<a id="'.$l[ 0 ].'" class="'.$l[ 1 ].'">'.i( '', $l[ 2 ] ).$l[ 3 ].'</a>'.i( $l[ 4 ], $l[ 5 ].' submenu' );
}
$htmlcontrols     = '';
foreach( [ 'previous', 'stop', 'play', 'pause', 'next' ] as $l ) {
	$htmlcontrols.= i( $l, $l.' btn btn-default btn-cmd' );
}
if ( file_exists( '/srv/http/data/system/vumeter' ) ) {
	$htmlvumeter = '<div id="vu" class="hide">'.file_get_contents( '/srv/http/assets/img/vu.svg' ).'</div>';
} else {
	$htmlvumeter = '';
}
?>

<div id="refresh"></div><div id="status"></div>

<div id="bar-top" class="hide">
	<?=i( 'logo', 'raudio-nobg' )?><div id="playback-controls"><?=$htmlcontrols?></div><?=i( 'button-settings', 'gear' )?>
</div>
<div id="settings" class="menu hide">
	<?=$htmlsettings?>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<?=i( 'button-library',    'library active' )
		  .i( 'button-lib-search', 'search' )?>
		<div id="lib-search" class="hide">
			<div class="input-group">
				<input id="lib-search-input" type="text">
				<?=i( 'lib-search-btn', 'search btn btn-default input-group-btn' )?>
			</div>
		</div>
		<div id="lib-search-close"></div>
		<div id="lib-path">
			<?=i( 'button-lib-back', 'arrow-left' )?>
			<div id="lib-title"><span class="title">LIBRARY</span><span id="li-count"></span></div>
			<div id="lib-breadcrumbs"></div>
			<span class="lipath"></span>
		</div>
	</div>
	<div id="lib-mode-list"></div>
</div>

<div id="page-playback" class="page">
	<div class="emptyadd hide"><?=i( '', 'add' )?></div>
	<?=i( 'guide-bio',    'bio map guide hide' )
	  .i( 'guide-lyrics', 'lyrics map guide hide' )
	  .i( 'guide-booklet',  'booklet map guide hide' )?>
	<div id="info">
		<div id="divartist"><span id="artist"></span></div>
		<div id="divtitle"><span id="title"></i></span></div>
		<div id="divalbum"><span id="album"></span></div>
		<div id="infoicon">
			<i id="playericon"></i>
			<span id="progress"></span>
			<span id="modeicon"><?=$modeicon?></span>
		</div>
		<div id="sampling"></div>
	</div>
	<div id="playback-row" class="row">
		<div id="time-knob" class="hide">
			<div id="time"></div>
			<div id="timeicon"><?=$timeicon?></div>
			<span id="elapsed" class="controls1"></span>
			<span id="total" class="controls1"></span>
			<div id="map-time">
				<i id="timeTL" class="map maptime"></i>
				<?=i( 'timeT',  'guide map maptime' )
				  .i( 'timeTR', 'gear map maptime' )
				  .i( 'timeL',  'previous map maptime' )?>
				<div id="timeM" class="map maptime"><?=i( '', 'play' ).'&emsp;'.i( '', 'pause' )?></div>
				<?=i( 'timeR',  'next map maptime' )
				  .i( 'timeBL', 'random map maptime' )
				  .i( 'timeB',  'stop map maptime' )
				  .i( 'timeBR', 'repeat map maptime' )?>
			</div>
			<div id="button-time" class="btn-group">
				<?=i( 'random', 'random btn btn-default btn-cmd btn-toggle' )
				  .i( 'single', 'single btn btn-default btn-cmd btn-toggle' )
				  .i( 'repeat', 'repeat btn btn-default btn-cmd btn-toggle' )?>
			</div>
		</div>
		<div id="coverart-block" class="hide">
			<div id="divcover" class="cover">
				<div id="time-bar"></div>
				<div id="time-band" class="band transparent"></div>
				<img id="coverart" src="" class="cover hide">
				<?=$htmlvumeter?>
				<div id="map-cover">
					<?=i( 'coverTL', 'scale-dn map mapcover r1 c1 ws hs' )
					  .i( 'coverT',  'guide map mapcover r1 c2 wl hs' )
					  .i( 'coverTR', 'gear map mapcover r1 c3 ws hs' )
					  .i( 'coverL',  'previous map mapcover r2 c1 ws hl' )?>
					<div id="coverM" class="map mapcover r2 c2 wl hl"><?=i( '', 'play' ).'&emsp;'.i( '', 'pause' )?></div>
					<?=i( 'coverR',  'next map mapcover r2 c3 ws hl' )
					  .i( 'coverBL', 'random map mapcover r3 c1 ws hs' )
					  .i( 'coverB',  'stop map mapcover r3 c2 wl hs' )
					  .i( 'coverBR', 'repeat map mapcover r3 c3 ws hs' )?>
				</div>
				<div id="volume-bar" class="hide"></div>
				<?=i( 'volume-band',    'volume transparent volumeband band' )
				  .i( 'volume-band-dn', 'minus transparent volumeband band dn' )
				  .i( 'volume-band-up', 'plus transparent volumeband band up' )?>
				<div id="volume-text" class="hide"></div>
			</div>
		</div>
		<div id="volume-knob" class="hide">
			<div id="volume"></div>
			<div id="map-volume">
				<?=i( 'volT', 'plus map mapvolume up' )
				  .i( 'volL', 'minus map mapvolume dn' )
				  .i( 'volM', 'volume map mapvolume' )
				  .i( 'volR', 'plus map mapvolume up' )
				  .i( 'volB', 'minus map mapvolume dn' )?>
			</div>
			<div id="button-volume" class="btn-group">
				<?=i( 'voldn',   'minus btn btn-default dn' )
				  .i( 'volmute', 'volume btn btn-default' )
				  .i( 'volup',   'plus btn btn-default up' )?>
			</div>
		</div>
	</div>
</div>

<div id="page-playlist" class="page hide">
	<div class="emptyadd hide"><?=i( '', 'add' )?></div>
	<div class="content-top">
		<span id="pl-path"></span>
		<span id="savedpl-path"></span>
		<?=i( 'button-playlist', 'playlist active' )
		  .i( 'button-pl-back',  'arrow-left hide' )?>
		<div id="pl-manage" class="playlist">
			<?=i( 'button-pl-playlists', 'playlists' )
			  .i( 'button-pl-save',      'save-plus pllength' )
			  .i( 'button-pl-consume',   'flash' )
			  .i( 'button-pl-librandom', 'librandom' )
			  .i( 'button-pl-shuffle',   'shuffle pllength' )
			  .i( 'button-pl-clear',     'remove pllength' )
			  .i( 'button-pl-search',    'search pllength' )?>
		</div>
		<form id="pl-search" class="hide" method="post" onSubmit="return false;">
			<div class="input-group">
				<input id="pl-search-input" type="text">
				<?=i( 'pl-search-btn', 'search btn btn-default input-group-btn' )?>
			</div>
		</form>
		<div id="pl-search-close" class="hide"></div>
	</div>
	<ul id="pl-list" class="list playlist"></ul>
	<ul id="pl-savedlist" class="list hide"></ul>
	<div id="pl-index" class="index index0"></div>
	<div id="pl-index1" class="index index1"></div>
</div>

<?=$menu?>

<div id="lyrics" class="hide">
	<div id="divlyricstitle">
		<img src=""><span id="lyricstitle"></span><?=i( 'lyricsclose', 'close' )?>
	</div>
	<div id="divlyricsartist">
		<span id="lyricsartist"></span><?=i( 'lyricsrefresh', 'refresh' ),i( 'lyricsedit', 'edit-circle' )?>
		<div id="lyricseditbtngroup" class="hide">
			<?=i( 'lyricsundo',   'undo hide' )
			  .i( 'lyricssave',   'save hide' )
			  .i( 'lyricsdelete', 'remove' )
			  .i( 'lyricsback',   'arrow-left bl' )?>
		</div>
	</div>
	<div id="lyricstext" class="lyricstext"></div>
	<textarea id="lyricstextarea" class="lyricstext"></textarea>
	<div id="lyricsfade"></div>
</div>
<div id="bar-bottom" class="transparent"> <!-- keep single line to suppress spaces (or display: flex) -->
	<?=i( 'library', 'library' ).i( 'playback', 'playback' ).i( 'playlist', 'playlist' )?>
</div>
<div id="bio" class="hide"></div>
<div id="debug"></div>

<?php
if ( $localhost ) echo '<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';

// <script> -----------------------------------------------------
$script = '';
foreach( $jsp as $j ) $script.= '<script src="/assets/js/plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )  $script.= '<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
if ( ! $page )        $script.= '<script id="shortcut" src="/assets/js/shortcut.js'.$hash.'"></script>';
echo $script;
?>
<script>
var jfiles = <?=json_encode( $jfiles )?>;
</script>

</body>
</html>
