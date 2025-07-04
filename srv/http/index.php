<?php
include 'common.php';

function buttonSet( $array, $class = '', $prefix = '' ) {
	$icons = '';
	foreach( $array as $a ) {
		if ( is_string( $a ) ) {
			$icons.= '<i id="'.$prefix.$a.'" class="i-'.$a.' '.$class.'"></i>';
		} else {
			$icons.= '<i id="'.$prefix.$a[ 1 ].'" class="i-'.$a[ 0 ].' '.$class.'"></i>';
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
		$submenu = icon(  $list[ 3 ].' submenu', '', $list[ 4 ] );
	} else {
		$sub     = '';
		$submenu = '';
	}
	if ( $icon[ 0 ] !== '<' ) $icon = icon(  $icon );
	return '<a data-cmd="'.$command.'" class="'.$command.$sub.'">'.$icon.$label.'</a>'.$submenu;
}
$coverart    = '<img class="icoverart" src="/assets/img/coverart.svg">';
$thumbupdate = $coverart.icon(  'refresh-overlay' );
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
	$modeicon.= icon(  $id.' hide'.$blink, 'mi-'.$id );
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
	$htmlsettings.= '<a id="'.$l[ 0 ].'" class="'.$l[ 1 ].'">'.icon(  $icon ).$label.'</a>'.icon(  $l[ 2 ].' submenu', $l[ 2 ] );
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
$mapcover     = [
	  [ 'scale r1 c1 ws hs',    'TL' ]
	, [ 'guide r1 c2 wl hs',    'T'  ]
	, [ 'gear r1 c3 ws hs',     'TR' ]
	, [ 'previous r2 c1 ws hl', 'L'  ]
	, [ 'play r2 c2 wl hl',     'M'  ]
	, [ 'next r2 c3 ws hl',     'R'  ]
	, [ 'random r3 c1 ws hs',   'BL' ]
	, [ 'stop r3 c2 wl hs',     'B'  ]
	, [ 'repeat r3 c3 ws hs',   'BR' ]
];
$maptime      = [];
foreach( $mapcover as $a ) $maptime[] = preg_replace( '/ .*/', '', $a );
?>

<div class="pagerefresh"></div>

<div id="bar-top">
	<?=icon(  'raudio-nobg pagerefresh', 'logo' )
	  .'<div id="playback-controls">'
	  .buttonSet( [ 'previous', 'stop', 'play', 'pause', 'next' ], 'btn btn-default btn-cmd' )
	  .'</div>'.icon(  'gear', 'button-settings' )?>
</div>
<div id="settings" class="menu hide">
	<?=$htmlsettings?>
</div>

<div id="page-library" class="page hide">
	<div class="content-top">
		<?php echo
			 icon(  'library page-icon', 'button-library' )
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
	<ul id="lib-mode-list"></ul>
</div>

<div id="page-playback" class="page">
	<?=icon(  'plus-o emptyadd hide' )?>
	<div id="info">
		<?=$htmlinfo?>
		<div id="infoicon">
			<i id="playericon"></i>
			<span id="progress"></span>
			<span id="modeicon"><?=$modeicon?></span>
		</div>
		<div id="sampling"></div>
		<div id="map-info" class="divmap"><?=buttonSet( [ 'bio', 'lyrics', 'booklet' ], 'hide', 'info-' )?></div>
	</div>
	<div id="playback-row" class="row">
		<div id="time-knob" class="hide">
			<div id="time" class="knob">
				<svg>               <!-- x   y              x   y               x   y -->
					<path id="arc" d="M 115 11 A 1 1 0 0 1 115 219 A 1 1 0 0 1 115 11"></path>
				</svg>              <!-- top    arc         bottom  src         top   -->
				<div class="container">
					<span id="elapsed"></span>
					<span id="total"></span>
					<div id="timeicon"><?=$timeicon?></div>
				</div>
			</div>
			<div id="map-time" class="divmap">
				<?=buttonSet( $maptime, '', 'time' )?>
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
				<div id="map-cover" class="divmap">
					<?=buttonSet( $mapcover, '', 'cover' )?>
					<div id="offset-l"></div>
					<div id="offset-r"></div>
				</div>
				<div id="volume-band-level" class="hide"></div>
				<div id="volume-bar" class="hide"></div>
				<div id="volume-bar-point" class="point hide"></div>
				<?=buttonSet( [
					  [ 'volume',   '' ]
					, [ 'minus dn', '-dn' ]
					, [ 'plus up',  '-up' ]
				], 'transparent volumeband band', 'volume-band' )?>
			</div>
		</div>
		<div id="volume-knob" class="hide">
			<div id="volume" class="knob">
				<div class="container">
					<div id="vol"><div class="point"></div></div>
				</div>
				<span id="volume-mute" class="hide">0</span>
				<span id="volume-level"></span>
			</div>
			<div id="map-volume" class="divmap">
				<?=buttonSet( [
					  [ 'plus up',  'T' ]
					, [ 'minus dn', 'L' ]
					, [ 'volume',   'M' ]
					, [ 'plus up',  'R' ]
					, [ 'minus dn', 'B' ]
				], '', 'vol' )?>
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
	<?=icon(  'plus-o emptyadd hide' )?>
	<div class="content-top">
		<?php echo
			 icon(  'playlist page-icon', 'button-playlist' )
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
		<img src=""><span id="lyricstitle"></span><?=icon(  'close', 'lyricsclose' )?>
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
		<div id="wheel"></div>
		<canvas id="box" width="130" height="130"></canvas>
		<div id="pickhue"></div>
		<div id="picknone"></div>
		<div id="picksat"></div>
		<div id="sat"></div>
		<div id="hue"><div></div></div>
		<a id="colorreset" class="infobtn"><i class="i-set0"></i>Default</a>
		<a id="colorok" class="infobtn infobtn-primary">OK</a>
	</div>
</div>

<div id="bio" class="hide"></div>
<?php
$htmlbar = buttonSet( [ 'library', 'playback', 'playlist' ] );
htmlEnd( $htmlbar );
