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
function iconSet( $array, $class = '', $prefix = '' ) {
	$icons = '';
	foreach( $array as $a ) {
		if ( $a[ 0 ] === '<' ) {
			$icons.= $a;
		} else if ( is_string( $a ) ) {
			$icons.= '<i id="'.$prefix.$a.'" class="i-'.$a.' '.$class.'"></i>';
		} else {
			$cl    = $a[ 0 ].' '.$class;
			$id    = $prefix.$a[ 1 ];
			$icons.= '<i id="'.$id.'" class="i-'.$cl.'"></i>';
		}
	}
	return $icons;
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
foreach( $settinglist as $l ) {
	$htmlsettings.= '<a id="'.$l[ 0 ].'" class="'.$l[ 1 ].'">'.i( $l[ 2 ] ).$l[ 3 ].'</a>'.i( $l[ 5 ].' submenu', $l[ 4 ] );
}
if ( file_exists( '/srv/http/data/system/vumeter' ) ) {
	$htmlvumeter = '<div id="vu" class="hide">'.file_get_contents( '/srv/http/assets/img/vu.svg' ).'</div>';
} else {
	$htmlvumeter = '';
}
$htmlinfo     = '';
foreach( [ 'artist', 'title', 'album', 'composer', 'conductor' ] as $id ) {
	$hide     = $id[ 0 ] === 'c' ? ' class="hide"' : '';
	$htmlinfo.= '<div id="div'.$id.'"'.$hide.'><span id="'.$id.'" class="info"></span></div>';
}
$htmlsearch   = '
<div id="lib-search" class="search hide">
	<div id="lib-search-close" class="searchclose"></div>
	<input id="lib-search-input" type="text" spellcheck="false">
</div>
';
?>

<div id="refresh" class="page-icon"></div>

<div id="bar-top" class="hide">
	<?=i( 'raudio-nobg page-icon', 'logo' )
	  .'<div id="playback-controls">'
	  .iconSet( [ 'previous', 'stop', 'play', 'pause', 'next' ], 'btn btn-default btn-cmd' )
	  .'</div>'.i( 'gear', 'button-settings' )?>
</div>
<div id="settings" class="menu hide">
	<?=$htmlsettings?>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<?=iconSet( [
			  i( 'library page-icon', 'button-library' )
			, [ 'search',             'search' ]
			, [ 'back',               'back' ]
			, [ 'refresh-library',    'update' ]
		], '', 'button-lib-' )
		.$htmlsearch?>
		<div id="lib-path">
			<div id="lib-title"><span class="title">LIBRARY</span><span id="li-count"></span></div>
			<div id="lib-breadcrumbs"></div>
			<span class="lipath"></span>
		</div>
	</div>
	<div id="lib-mode-list"></div>
</div>

<div id="page-playback" class="page">
	<?=i( 'plus-o emptyadd hide' )
		.iconset( [ 'bio', 'lyrics', 'booklet' ], 'map guide hide', 'guide-' )?>
	<div id="info">
		<?=$htmlinfo?>
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
				<?=iconSet( [
					  [ 'scale',    'TL' ]
					, [ 'guide',    'T' ]
					, [ 'gear',     'TR' ]
					, [ 'previous', 'L' ]
					, '<div id="timeM" class="map maptime">'.i( 'play' ).'&emsp;'.i( 'pause' ).'</div>'
					, [ 'next',     'R' ]
					, [ 'random',   'BL' ]
					, [ 'stop',     'B' ]
					, [ 'repeat',   'BR' ]
				], 'map maptime', 'time' )?>
			</div>
			<div id="button-time" class="btn-group">
				<?=iconSet( [ 'random', 'single', 'repeat' ], 'btn btn-default btn-cmd btn-toggle' )?>
			</div>
		</div>
		<div id="coverart-block" class="hide">
			<div id="divcover" class="cover">
				<div id="time-bar"></div>
				<div id="time-band" class="band transparent"></div>
				<img id="coverart" src="" class="cover hide">
				<?=$htmlvumeter?>
				<div id="map-cover">
					<?=iconSet( [
						  [ 'scale r1 c1 ws hs',    'TL' ]
						, [ 'guide r1 c2 wl hs',    'T' ]
						, [ 'gear r1 c3 ws hs',     'TR' ]
						, [ 'previous r2 c1 ws hl', 'L' ]
						, '<div id="coverM" class="map mapcover r2 c2 wl hl">'.i( 'play' ).'&emsp;'.i( 'pause' ).'</div>'
						, [ 'next r2 c3 ws hl',     'R' ]
						, [ 'random r3 c1 ws hs',   'BL' ]
						, [ 'stop r3 c2 wl hs',     'B' ]
						, [ 'repeat r3 c3 ws hs',   'BR' ]
					], 'map mapcover', 'cover' )?>
				</div>
				<div id="volume-bar" class="hide"></div>
				<?=iconSet( [
					  [ 'volume',   '' ]
					, [ 'minus dn', '-dn' ]
					, [ 'plus up',  '-up' ]
				], 'transparent volumeband band', 'volume-band' )?>
				<div id="volume-text" class="hide"></div>
			</div>
		</div>
		<div id="volume-knob" class="hide">
			<div id="volume"></div>
			<div id="map-volume">
				<?=iconSet( [
					  [ 'plus up',  'T' ]
					, [ 'minus dn', 'L' ]
					, [ 'volume',   'M' ]
					, [ 'plus up',  'R' ]
					, [ 'minus dn', 'B' ]
				], 'map mapvolume', 'vol' )?>
			</div>
			<div id="button-volume" class="btn-group">
				<?=iconSet( [
					  [ 'minus dn', 'dn' ]
					, [ 'volume',   'mute' ]
					, [ 'plus up',  'up' ]
				], 'btn btn-default', 'vol' )?>
			</div>
		</div>
	</div>
</div>

<div id="page-playlist" class="page hide">
	<?=i( 'plus-o emptyadd hide' )?>
	<div class="content-top">
		<span id="pl-path"></span>
		<span id="savedpl-path"></span>
		<?=iconSet( [
			  [ 'playlist page-icon', 'playlist' ]
			, [ 'back',               'pl-back' ]
			, [ 'search pllength',    'pl-search' ]
		], '', 'button-' )?>
		<div id="pl-manage" class="playlist">
			<?=iconSet( [
				  [ 'flash',                 'consume' ]
				, [ 'librandom',             'librandom' ]
				, [ 'shuffle pllength',      'shuffle' ]
				, [ 'minus-circle pllength', 'clear' ]
				, [ 'save-plus pllength',    'save' ]
				, [ 'playlists',             'playlists' ]
			], '', 'button-pl-' )?>
		</div>
		<?=str_replace( 'lib-', 'pl-', $htmlsearch )?>
	</div>
	<ul id="pl-list" class="list playlist"></ul>
	<ul id="pl-savedlist" class="list"></ul>
</div>

<?=$menu?>

<div id="lyrics" class="hide">
	<div id="divlyricstitle">
		<img src=""><span id="lyricstitle"></span><?=i( 'close', 'lyricsclose' )?>
	</div>
	<div id="divlyricsartist">
		<span id="lyricsartist"></span><?=iconSet( [ 'refresh', 'edit' ], '', 'lyrics' )?>
		<div id="lyricseditbtngroup" class="hide">
			<?=iconSet( [
				  [ 'undo hide', 'undo' ]
				, [ 'save hide', 'save' ]
				, [ 'remove',    'delete' ]
				, [ 'back bl',   'back' ]
			], '', 'lyrics' )?>
		</div>
	</div>
	<div id="lyricstext" class="lyricstext" tabindex="0"></div>
	<textarea id="lyricstextarea" class="lyricstext"></textarea>
	<div id="lyricsfade"></div>
</div>
<div id="bio" class="hide"></div>
<?php
$htmlbar = iconSet( [ 'library', 'playback', 'playlist' ] );
htmlBottom();
