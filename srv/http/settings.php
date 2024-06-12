<?php
include 'common.php';
if ( ! $addons ) include 'settings-function.php';

echo '
	<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>'.i( 'close close' ).i( 'help helphead' ).'</div>
	<div class="container '.$page.' hide">
';
if ( $addonsprogress || $guide ) {
	echo '
	</div>
</body>
</html>
';
	exit;
//----------------------------------------------------------------------------------
}

$btn     = [ 'add',     'bluetooth', 'btsender', 'code',    'gear',     'lan',    'lastfm',   'microsd', 'networks'
			,'pause',   'play',      'power',    'refresh', 'search',   'stop',   'usbdrive', 'volume',  'wifi' ];
$btnc    = [ 'filters', 'flowchart', 'graph',    'input',   'inverted', 'linear', 'mixers',   'output',  'set0' ];
if ( $camilla ) $btn = array_merge( $btn, $btnc );
foreach( $btn as $b ) {
	$name  = 'b_'.$b;
	$$name = i( $b.' btn' );
}

function iLabel( $label, $icon = '' ) {
	$htmlicon = $icon ? i( $icon ) : '&emsp;';
	return '<a class="helpmenu label">'.$label.$htmlicon.'</a>';
}
function iTab( $tab ) {
	return '<a class="helpmenu tab">'.i( strtolower( $tab ) ).' '.$tab.'</a>';
}
function menu( $icon, $name, $iconsub = '' ) {
	$submenu = $iconsub ? i( $iconsub.' sub' ) : '';
	return '<a class="helpmenu">'.i( $icon ).' '.$name.$submenu.'</a>';
}
// functions for use inside heredoc
$Fi      = 'i';
$FiLabel = 'iLabel';
$FiTab   = 'iTab';
$Fmenu   = 'menu';

if ( ! $addons ) include 'settings/'.$page.'.php'; // addons: by addons.js

// bottom bar
$htmlbar = '';
if ( $camilla ) {
	$tabs   = [ 'Filters', 'Mixers', 'Processors', 'Pipeline', 'Devices', 'Config' ];
	$prefix = 'tab';
} else {
	$tabs   = [ 'Features', 'Player', 'Networks', 'System', 'Addons' ];
	$prefix = '';
}
foreach ( $tabs as $tab ) {
	$id      = strtolower( $tab );
	$htmlbar.= '<div id="'.$prefix.$id.'">'.i( $id ).' <a>'.$tab.'</a></div>';
}
echo '
	</div>
	<div id="bar-bottom">
		'.$htmlbar.'
	</div>
';

// <script> -----------------------------------------------------
echo $scripts;
