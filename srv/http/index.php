<?php
include 'common.php';

function buttonSet( $array, $class = '', $prefix = '' ) {
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
function htmlMenu( $menulist, $mode ) {
	global $html;
	global $kid3;
	global $menu;
	if ( ! $kid3 ) array_pop( $menulist );
	foreach( $menulist as $list ) $html.= menuLi( $list );
	$menu.= menuDiv( $mode, $html );
}
// context menus
function menuCommon( $add, $replace ) {
	$list = [
		  [ $add,       'plus-o',  'Add',     'play-plus',    $add.'play' ]
		, [ 'playnext', 'add',     'Play next' ]
		, [ $replace,   'replace', 'Replace', 'play-replace', $replace.'play' ]
	];
	$html = '';
	foreach( $list as $l ) $html.= menuLi( $l );
	return $html;
}
function menuDiv( $id, $html ) {
	return '<div id="menu-'.$id.'" class="menu contextmenu hide">'.$html.'</div>';
}
function menuLi( $list ) {
	$command = $list[ 0 ];
	$icon    = $list[ 1 ];
	$label   = $list[ 2 ];
	if ( isset( $list[ 3 ] ) ) {
		$sub     = ' sub';
		$submenu = i( $list[ 3 ].' submenu', '', $list[ 4 ] );
	} else {
		$sub     = '';
		$submenu = '';
	}
	if ( $icon[ 0 ] !== '<' ) $icon = i( $icon );
	return '<a data-cmd="'.$command.'" class="'.$command.$sub.'">'.$icon.$label.'</a>'.$submenu;
}
$coverart    = '<img class="icoverart" src="/assets/img/coverart.svg">';
$thumbupdate = $coverart.i( 'refresh-overlay' );
$kid3        = file_exists( '/usr/bin/kid3-cli' );
$menu        = '';
$htmlcommon  = menuCommon( 'add', 'replace' );
// file
$html = $htmlcommon;
$menulist = [
	  [ 'similar',    'lastfm',      'Add similar' ]
	, [ 'savedpladd', 'playlists',   'Add to a playlist' ]
	, [ 'directory',  'folder-open', 'Browse folder' ]
	, [ 'tag',        'tag',         'Tag Editor' ]
];
htmlMenu( $menulist, 'file' );
// filepl
$html = $htmlcommon;
$menu.= menuDiv( 'filepl', $html );
// filesavedpl
$html = $htmlcommon;
$menulist = [
	  [ 'similar',       'lastfm',    'Add similar' ]
	, [ 'wrsave',        'save',      'Save to Library' ]
	, [ 'savedpladd',    'playlists', 'Add to a playlist' ]
	, [ 'savedplremove', 'remove',    'Remove' ]
];
htmlMenu( $menulist, 'filesavedpl' );
// folder
$html     = $htmlcommon;
$menulist = [
	  [ 'bookmark',    'star',            'Bookmark' ]
	, [ 'thumbnail',   $coverart,         'Folder thumbnail' ]
	, [ 'thumbupdate', $thumbupdate,      'Update thumbnails' ]
	, [ 'exclude',     'folder-forbid',   'Exclude directory' ]
	, [ 'update',      'refresh-library', 'Update database' ]
	, [ 'directory',   'folder-open',     'Browse folder' ]
	, [ 'tag',         'tag',             'Tag Editor' ]
];
htmlMenu( $menulist, 'folder' );
// plaction
$html     = '';
$menulist = [
	  [ 'play',       'play',      'Play' ]
	, [ 'pause',      'pause',     'Pause' ]
	, [ 'stop',       'stop',      'Stop' ]
	, [ 'current',    'current',   'Current' ]
	, [ 'remove',     'remove',    'Remove', 'track', 'removerange' ]
	, [ 'crop',       'crop',      'Crop' ]
	, [ 'wrsave',     'save',      'Save to Library' ]
	, [ 'savedpladd', 'playlists', 'Add to a playlist' ]
	, [ 'similar',    'lastfm',    'Add similar' ]
	, [ 'tag',        'info',      'Track Info' ]
];
htmlMenu( $menulist, 'plaction' );
// playlist
$html     = menuCommon( 'pladd', 'plreplace' );
$menulist = [
	  [ 'plrename', 'edit',   'Rename' ]
	, [ 'pldelete', 'remove', 'Delete' ]
];
htmlMenu( $menulist, 'playlist' );
// radio bookmark
$html     = menuCommon( 'add', 'replace' );
$menu    .= menuDiv( 'bkradio', $html );
// webradio
$html     = menuCommon( 'wradd', 'wrreplace' );
$menulist = [
	  [ 'bookmark',   'star',      'Bookmark' ]
	, [ 'wredit',     'edit',      'Edit' ]
	, [ 'thumbnail',  $coverart,   'Station art' ]
	, [ 'wrdelete',   'remove',    'Delete' ]
	, [ 'savedpladd', 'playlists', 'Add to a playlist' ]
];
htmlMenu( $menulist, 'webradio' );
// wr folder
$html     = '';
$menulist = [
	  [ 'bookmark',    'star',     'Bookmark' ]
	, [ 'thumbnail',   $coverart,  'Folder thumbnail' ]
	, [ 'wrdirdelete', 'remove',   'Delete' ]
	, [ 'wrdirrename', 'edit',     'Rename' ]
];
htmlMenu( $menulist, 'wrdir' );

foreach( [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ] as $mode ) {
	$html = menuCommon( $mode.'add', $mode.'replace' );
	$menu.= menuDiv( $mode, $html );
}

$ids      = [ 'random', 'repeat',   'single',    'repeat1', 'consume', 'librandom'
			, 'mute',   'btsender', 'libupdate', 'addons',  'relays',  'stoptimer' ];
$modeicon = '';
foreach( $ids as $id ) {
	$blink    = $localhost || $id !== 'libupdate' ? '' : ' blink';
	$modeicon.= i( $id.' hide'.$blink, 'mi-'.$id );
}
$timeicon = str_replace( 'mi-', 'ti-', $modeicon );
$dsp      = $equalizer ? 'equalizer' : 'camilladsp';
$settinglist = [
	  [ 'features',        'settings',     'dsp' ]
	, [ 'player',          'settings',     'lock' ]
	, [ 'networks',        'settings',     'snapclient' ]
	, [ 'system',          'settings',     'relays' ]
	, [ 'addons',          'settings sub', 'help' ]
	, [ 'power',           '',             'screenoff' ]
	, [ 'displaylibrary',  'sub',          'refresh-library' ]
	, [ 'displayplayback', 'sub',          'color' ]
	, [ 'displayplaylist', '',             'multiraudio' ]
];
$htmlsettings = '';
foreach( $settinglist as $l ) {
	$icon  = str_replace( 'display', '', $l[ 0 ] );
	$label = ucfirst( $icon );
	$htmlsettings.= '<a id="'.$l[ 0 ].'" class="'.$l[ 1 ].'">'.i( $icon ).$label.'</a>'.i( $l[ 2 ].' submenu', $l[ 2 ] );
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

<div class="pagerefresh"></div>

<div id="bar-top">
	<?=i( 'raudio-nobg pagerefresh', 'logo' )
	  .'<div id="playback-controls">'
	  .buttonSet( [ 'previous', 'stop', 'play', 'pause', 'next' ], 'btn btn-default btn-cmd' )
	  .'</div>'.i( 'gear', 'button-settings' )?>
</div>
<div id="settings" class="menu hide">
	<?=$htmlsettings?>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<?php echo
			 i( 'library page-icon', 'button-library' )
			.buttonSet( [
				  [ 'search',          'search' ]
				, [ 'back',            'back' ]
				, [ 'refresh-library', 'update' ]
			], '', 'button-lib-' )
			.$htmlsearch;
		?>
		<span id="lib-home-title" class="title"></span>
		<span id="lib-title" class="title"></span>
		<span id="lib-path"></span>
	</div>
	<div id="lib-mode-list"></div>
</div>

<div id="page-playback" class="page">
	<?=i( 'plus-o emptyadd hide' )
		.buttonSet( [ 'bio', 'lyrics', 'booklet' ], 'map guide hide', 'guide-' )?>
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
			<span id="elapsed"></span>
			<span id="total"></span>
			<div id="map-time">
				<?=buttonSet( [
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
				<?=buttonSet( [ 'random', 'single', 'repeat' ], 'btn btn-default btn-cmd btn-toggle' )?>
			</div>
		</div>
		<div id="coverart-block" class="hide">
			<div id="divcover" class="cover">
				<div id="time-bar"></div>
				<div id="time-band" class="band transparent"></div>
				<img id="coverart" src="" class="hide">
				<?=$htmlvumeter?>
				<div id="map-cover">
					<?=buttonSet( [
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
				<?=buttonSet( [
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
				<?=buttonSet( [
					  [ 'plus up',  'T' ]
					, [ 'minus dn', 'L' ]
					, [ 'volume',   'M' ]
					, [ 'plus up',  'R' ]
					, [ 'minus dn', 'B' ]
				], 'map mapvolume', 'vol' )?>
			</div>
			<div id="button-volume" class="btn-group">
				<?=buttonSet( [
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
		<?php echo
			 i( 'playlist page-icon', 'button-playlist' )
			.buttonSet( [
				  [ 'back',            'back' ]
				, [ 'search pllength', 'search' ]
			], '', 'button-pl-' )
			.str_replace( 'lib-', 'pl-', $htmlsearch );
		?>
		<span id="pl-manage" class="playlist">
			<?=buttonSet( [
				  [ 'flash',              'consume' ]
				, [ 'librandom',          'librandom' ]
				, [ 'shuffle pllength',   'shuffle' ]
				, [ 'remove pllength',    'clear' ]
				, [ 'save-plus pllength', 'save' ]
				, [ 'playlists',          'playlists' ]
			], '', 'button-pl-' )?>
		</span>
		<span id="pl-home-title" class="title"></span>
		<span id="pl-title" class="title"></span>
	</div>
	<ul id="pl-list" class="list playlist"></ul>
	<ul id="pl-savedlist" class="list"></ul>
</div>

<div id="menus"><?=$menu?></div>

<div id="lyrics" class="hide">
	<div id="divlyricstitle">
		<img src=""><span id="lyricstitle"></span><?=i( 'close', 'lyricsclose' )?>
	</div>
	<div id="divlyricsartist">
		<span id="lyricsartist"></span><?=buttonSet( [ 'refresh', 'edit' ], '', 'lyrics' )?>
		<div id="lyricseditbtngroup" class="hide">
			<?=buttonSet( [
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

<div id="colorpicker" class="hide">
	<div id="divcolor">
		<i id="colorcancel" class="i-close"></i>
		<div id="pickhue"></div>
		<div id="picknone"></div>
		<div id="picksat"></div>
		<div id="wheel"></div>
		<div id="hue"><div></div></div>
		<div id="sat"></div>
		<canvas id="base" width="230" height="230"></canvas>
		<a id="colorreset" class="infobtn"><i class="i-set0"></i>Default</a>
		<a id="colorok" class="infobtn infobtn-primary">OK</a>
	</div>
</div>

<div id="bio" class="hide"></div>
<?php
$htmlbar = buttonSet( [ 'library', 'playback', 'playlist' ] );
htmlBottom();
