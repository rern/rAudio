<?php
include 'common.php';

echo '
	<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>'.i( 'close close', 'close' ).i( 'help helphead' ).i( 'gear' ).'</div>
	<div class="container '.$page.' hide" tabindex="-1">
';
if ( $addonsprogress || $guide ) {
	include 'settings/'.$page.'.php';
	echo '
	</div>
</body>
</html>
';
	exit;
//----------------------------------------------------------------------------------
}

$htmlbar = '';
if ( $camilla ) {
	$tabs   = [ 'Filters', 'Mixers', 'Processors', 'Pipeline', 'Devices' ];
	$prefix = 'tab';
} else {
	$tabs   = [ 'Features', 'Player', 'Networks', 'System', 'Addons' ];
	$prefix = '';
}
foreach ( $tabs as $tab ) {
	$id      = strtolower( $tab );
	$htmlbar.= '<div id="'.$prefix.$id.'">'.i( $id ).' <a>'.$tab.'</a></div>';
	if ( ! $camilla ) ${'t_'.$id} = '<a class="helpmenu tab">'.i( $id ).' '.$tab.'</a>';
}
if ( ! $addons ) {
	$btn     = [ 'add',     'bluetooth', 'btsender', 'code',    'gear',     'lan',    'lastfm',   'microsd', 'networks'
				,'pause',   'play',      'power',    'refresh', 'search',   'stop',   'usbdrive', 'volume',  'wifi' ];
	$btnc    = [ 'filters', 'flowchart', 'graph',    'input',   'inverted', 'linear', 'mixers',   'output',  'set0' ];
	if ( $camilla ) $btn = array_merge( $btn, $btnc );
	foreach( $btn as $b ) ${'b_'.$b} = i( $b.' btn' ); // btn
	if ( $features ) {
		$labels = [
			  [ 'Equalizer',     'equalizer' ]
			, [ 'DSP',           'camilladsp' ]
			, [ 'Server rAudio', 'rserver' ]
			, [ 'Shared Data',   'networks' ]
			, [ 'Wi-Fi',         'wifi' ]
		];
		$menus = [
			  [ 'features', 'Features', 'camilladsp' ]
			, [ 'features', 'Features', 'equalizer' ]
			, [ 'playlist', 'Playlist', 'multiraudio' ]
			, [ 'player',   'Player',   'lock' ]
			, [ 'power',    'Power',    'screenoff' ]
		];
	} else if ( $player ) {
		$labels = [
			  [ 'DAB Radio',   'dabradio' ]
			, [ 'Device' ]
			, [ 'Shared Data', 'networks' ]
			, [ 'SoX Resampler' ]
			, [ 'Volume Control' ]
		];
		$menus = '';
	} else if ( $networks ) {
		$labels = [
			  [ 'Access Point', 'ap' ]
			, [ 'Bluetooth', 'bluetooth' ]
		];
		$menus = '';
	} else if ( $system ) {
		$labels = [
			  [ 'Device' ]
			, [ 'Output' ]
			, [ 'Server rAudio', 'rserver' ]
			, [ 'Shared Data',   'networks' ]
			, [ 'Storage' ]
		];
		$menus = [
			  [ 'library', 'Library', 'refresh-library' ]
			, [ 'raudio',  'System',  'relays' ]
		];
	}
	foreach( $labels as $l ) { // switch label
		$icon = isset( $l[ 1 ] ) ? i( $l[ 1 ] ) : ' &emsp;';
		$l    = $l[ 0 ];
		$name = strtolower( preg_replace( '/ |-/', '', $l ) );
		${'l_'.$name} = '<a class="helpmenu label">'.$l.$icon.'</a>';
	}
	foreach( $menus as $m ) { // menu
		$name = str_replace( '-', '', $m[ 2 ] );
		${'m_'.$name} = '<a class="helpmenu">'.i( $m[ 0 ] ).' '.$m[ 1 ].i( $m[ 2 ].' sub' ).'</a>';
	}
	
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
echo '
	</div>
	<div id="fader" class="hide"></div>
	<div id="bar-bottom">'.$htmlbar.'</div>
';
// <script> -----------------------------------------------------
echo $scripts;
