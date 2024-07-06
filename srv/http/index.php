<?php
include 'common.php';

function htmlmenu( $menulist, $mode ) {
	global $html;
	global $kid3;
	global $menu;
	if ( ! $kid3 ) array_pop( $menulist );
	foreach( $menulist as $list ) $html.= menuli( $list );
	$menu.= menudiv( $mode, $html );
}
// context menus
function menucommon( $add, $replace ) {
	$htmlcommon = '<a data-cmd="'.$add.'" class="add sub">'.i( 'plus-o' ).'Add</a>'.i( 'play-plus submenu', '', $add.'play' );
	$htmlcommon.= '<a data-cmd="playnext" class="playnext">'.i( 'add' ).'Play next</a>';
	$htmlcommon.= '<a data-cmd="'.$replace.'" class="replace sub">'.i( 'replace' ).'Replace</a>'.i( 'play-replace submenu', '', $replace.'play' );
	return $htmlcommon;
}
function menudiv( $id, $html ) {
	return '<div id="menu-'.$id.'" class="menu contextmenu hide">'.$html.'</div>';
}
function menuli( $list ) {
	$command = $list[ 0 ];
	$icon    = $list[ 1 ];
	$label   = $list[ 2 ];
	$icon    = i( $icon );
	return '<a data-cmd="'.$command.'" class="'.$command.'">'.$icon.$label.'</a>';
}
$kid3       = file_exists( '/usr/bin/kid3-cli' );
$menu       = '';
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
	, [ 'savedplremove', 'remove',        'Remove' ]
];
htmlmenu( $menulist, 'filesavedpl' );
// folder
$html     = $htmlcommon;
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
$html     = '';
$menulist = [
	  [ 'play',       'play',          'Play' ]
	, [ 'pause',      'pause',         'Pause' ]
	, [ 'stop',       'stop',          'Stop' ]
	, [ 'current',    'current',       'Current' ]
	, [ 'remove',     'remove',        'Remove' ]
	, [ 'wrsave',     'save',          'Save to Library' ]
	, [ 'savedpladd', 'file-playlist', 'Add to a playlist' ]
	, [ 'similar',    'lastfm',        'Add similar' ]
	, [ 'tag',        'info',          'Track Info' ]
];
htmlmenu( $menulist, 'plaction' );
// playlist
$html     = menucommon( 'pladd', 'plreplace' );
$menulist = [
	  [ 'plrename', 'edit',   'Rename' ]
	, [ 'pldelete', 'remove', 'Delete' ]
];
htmlmenu( $menulist, 'playlist' );
// radio bookmark
$html     = menucommon( 'wradd', 'wrreplace' );
$menu    .= menudiv( 'bkradio', $html );
// webradio
$html     = menucommon( 'wradd', 'wrreplace' );
$menulist = [
	  [ 'bookmark',   'star',          'Bookmark' ]
	, [ 'wredit',     'edit',          'Edit' ]
	, [ 'wrcoverart', 'coverart',      'Change cover art' ]
	, [ 'wrdelete',   'remove',        'Delete' ]
	, [ 'savedpladd', 'file-playlist', 'Add to a playlist' ]
];
htmlmenu( $menulist, 'webradio' );
// wrdir
$html     = '';
$menulist = [
	  [ 'bookmark',    'star',   'Bookmark' ]
	, [ 'wrdirdelete', 'remove', 'Delete' ]
	, [ 'wrdirrename', 'edit',   'Rename' ]
];
htmlmenu( $menulist, 'wrdir' );

foreach( [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ] as $mode ) {
	$html = menucommon( $mode.'add', $mode.'replace' );
	$menu.= menudiv( $mode, $html );
}

$menu     = '<div id="contextmenu">'.$menu.'</div>';
$ids      = [ 'random',   'repeat',    'single',    'repeat1', 'consume', 'librandom', 'mute'
			, 'btsender', 'libupdate', 'dabupdate', 'addons',  'relays',  'stoptimer' ];
$modeicon = '';
foreach( $ids as $id ) $modeicon.= i( $id.' hide', 'mi-'.$id );
if ( $localhost ) str_replace( 'library blink', 'refresh-library', $modeicon );
$timeicon = str_replace( 'mi-', 'ti-', $modeicon );
$dsp      = $equalizer ? 'equalizer' : 'camilladsp';
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
$htmlsettings = '';
foreach( $settinglist as $l ) $htmlsettings.= '<a id="'.$l[ 0 ].'" class="'.$l[ 1 ].'">'.i( $l[ 2 ] ).$l[ 3 ].'</a>'.i( $l[ 5 ].' submenu', $l[ 4 ] );
$htmlcontrols = '';
foreach( [ 'previous', 'stop', 'play', 'pause', 'next' ] as $l ) $htmlcontrols.= i( $l.' btn btn-default btn-cmd', $l );
if ( file_exists( '/srv/http/data/system/vumeter' ) ) {
	$htmlvumeter = '<div id="vu" class="hide">'.file_get_contents( '/srv/http/assets/img/vu.svg' ).'</div>';
} else {
	$htmlvumeter = '';
}
?>

<div id="refresh" class="page-icon"></div>

<div id="bar-top" class="hide">
	<?=i( 'raudio-nobg page-icon', 'logo' )?><div id="playback-controls"><?=$htmlcontrols?></div><?=i( 'gear', 'button-settings' )?>
</div>
<div id="settings" class="menu hide">
	<?=$htmlsettings?>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<?=i( 'library active page-icon', 'button-library' )
		  .i( 'search',                   'button-lib-search' )
		  .i( 'back',                     'button-lib-back' )
		  .i( 'refresh-library',          'button-lib-update' )?>
		<div id="lib-search" class="search hide">
			<div class="input-group">
				<input id="lib-search-input" type="text">
				<?=i( 'search btn btn-default input-group-btn', 'lib-search-btn' )?>
			</div>
		</div>
		<div id="lib-search-close" class="searchclose"></div>
		<div id="lib-path">
			<div id="lib-title"><span class="title">LIBRARY</span><span id="li-count"></span></div>
			<div id="lib-breadcrumbs"></div>
			<span class="lipath"></span>
		</div>
	</div>
	<div id="lib-mode-list"></div>
</div>

<div id="page-playback" class="page">
	<?=i( 'plus-o emptyadd hide' )?>
	<?=i( 'bio map guide hide',     'guide-bio' )
	  .i( 'lyrics map guide hide',  'guide-lyrics' )
	  .i( 'booklet map guide hide', 'guide-booklet' )?>
	<div id="info">
		<div id="divartist"><span id="artist" class="info"></span></div>
		<div id="divtitle"><span id="title" class="info"></i></span></div>
		<div id="divalbum"><span id="album" class="info"></span></div>
		<div id="divcomposer"><span id="composer" class="info hide"></span></div>
		<div id="divconductor"><span id="conductor" class="info hide"></span></div>
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
				<?=i( 'map maptime',          'timeTL' )
				  .i( 'guide map maptime',    'timeT' )
				  .i( 'gear map maptime',     'timeTR' )
				  .i( 'previous map maptime', 'timeL' )?>
				<div id="timeM" class="map maptime"><?=i( 'play' ).'&emsp;'.i( 'pause' )?></div>
				<?=i( 'next map maptime',     'timeR' )
				  .i( 'random map maptime',   'timeBL' )
				  .i( 'stop map maptime',     'timeB' )
				  .i( 'repeat map maptime',   'timeBR' )?>
			</div>
			<div id="button-time" class="btn-group">
				<?=i( 'random btn btn-default btn-cmd btn-toggle', 'random' )
				  .i( 'single btn btn-default btn-cmd btn-toggle', 'single' )
				  .i( 'repeat btn btn-default btn-cmd btn-toggle', 'repeat' )?>
			</div>
		</div>
		<div id="coverart-block" class="hide">
			<div id="divcover" class="cover">
				<div id="time-bar"></div>
				<div id="time-band" class="band transparent"></div>
				<img id="coverart" src="" class="cover hide">
				<?=$htmlvumeter?>
				<div id="map-cover">
					<?=i( 'scale-dn map mapcover r1 c1 ws hs', 'coverTL' )
					  .i( 'guide map mapcover r1 c2 wl hs',    'coverT' )
					  .i( 'gear map mapcover r1 c3 ws hs',     'coverTR' )
					  .i( 'previous map mapcover r2 c1 ws hl', 'coverL' )?>
					<div id="coverM" class="map mapcover r2 c2 wl hl"><?=i( 'play' ).'&emsp;'.i( 'pause' )?></div>
					<?=i( 'next map mapcover r2 c3 ws hl',     'coverR' )
					  .i( 'random map mapcover r3 c1 ws hs',   'coverBL' )
					  .i( 'stop map mapcover r3 c2 wl hs',     'coverB' )
					  .i( 'repeat map mapcover r3 c3 ws hs',   'coverBR' )?>
				</div>
				<div id="volume-bar" class="hide"></div>
				<?=i( 'volume transparent volumeband band',   'volume-band' )
				  .i( 'minus transparent volumeband band dn', 'volume-band-dn' )
				  .i( 'plus transparent volumeband band up',  'volume-band-up' )?>
				<div id="volume-text" class="hide"></div>
			</div>
		</div>
		<div id="volume-knob" class="hide">
			<div id="volume"></div>
			<div id="map-volume">
				<?=i( 'plus map mapvolume up',  'volT' )
				  .i( 'minus map mapvolume dn', 'volL' )
				  .i( 'volume map mapvolume',   'volM' )
				  .i( 'plus map mapvolume up',  'volR' )
				  .i( 'minus map mapvolume dn', 'volB' )?>
			</div>
			<div id="button-volume" class="btn-group">
				<?=i( 'minus btn btn-default dn', 'voldn' )
				  .i( 'volume btn btn-default',   'volmute' )
				  .i( 'plus btn btn-default up',  'volup' )?>
			</div>
		</div>
	</div>
</div>

<div id="page-playlist" class="page hide">
	<?=i( 'plus-o emptyadd hide' )?>
	<div class="content-top">
		<span id="pl-path"></span>
		<span id="savedpl-path"></span>
		<?=i( 'playlist active page-icon', 'button-playlist' )
		  .i( 'back hide',                 'button-pl-back' )?>
		<div id="pl-manage" class="playlist">
			<?=i( 'flash',                 'button-pl-consume' )
			  .i( 'librandom',             'button-pl-librandom' )
			  .i( 'shuffle pllength',      'button-pl-shuffle' )
			  .i( 'minus-circle pllength', 'button-pl-clear' )
			  .i( 'save-plus pllength',    'button-pl-save' )
			  .i( 'search pllength',       'button-pl-search' )
			  .i( 'playlists',             'button-pl-playlists' )?>
		</div>
		<form id="pl-search" class="search hide" method="post" onSubmit="return false;">
			<div class="input-group">
				<input id="pl-search-input" type="text">
				<?=i( 'search btn btn-default input-group-btn', 'pl-search-btn' )?>
			</div>
		</form>
		<div id="pl-search-close" class="searchclose hide"></div>
	</div>
	<ul id="pl-list" class="list playlist"></ul>
	<ul id="pl-savedlist" class="list hide"></ul>
	<div id="pl-index" class="index index0"></div>
	<div id="pl-index1" class="index index1"></div>
</div>

<?=$menu?>

<div id="lyrics" class="hide">
	<div id="divlyricstitle">
		<img src=""><span id="lyricstitle"></span><?=i( 'close', 'lyricsclose' )?>
	</div>
	<div id="divlyricsartist">
		<span id="lyricsartist"></span><?=i( 'refresh', 'lyricsrefresh' ).i( 'edit', 'lyricsedit' )?>
		<div id="lyricseditbtngroup" class="hide">
			<?=i( 'undo hide', 'lyricsundo',    )
			  .i( 'save hide', 'lyricssave' )
			  .i( 'remove',    'lyricsdelete' )
			  .i( 'back bl',   'lyricsback' )?>
		</div>
	</div>
	<div id="lyricstext" class="lyricstext" tabindex="0"></div>
	<textarea id="lyricstextarea" class="lyricstext"></textarea>
	<div id="lyricsfade"></div>
</div>
<div id="fader" class="hide"></div>
<div id="bar-bottom">
	<?=i( 'library', 'library' ).i( 'playback', 'playback' ).i( 'playlist', 'playlist' )?>
</div>
<div id="bio" class="hide"></div>

<?php
// <script> -----------------------------------------------------
echo $scripts;
