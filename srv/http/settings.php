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
	if ( ! $camilla ) ${'T_'.$id} = '<a class="helpmenu tab">'.i( $id ).' '.$tab.'</a>';
}
if ( ! $addons ) {
	$btn     = [ 'add',     'bluetooth', 'btsender', 'code',    'gear',     'lan',    'lastfm',   'microsd', 'networks'
				,'pause',   'play',      'power',    'refresh', 'search',   'stop',   'usbdrive', 'volume',  'wifi' ];
	$btnc    = [ 'filters', 'flowchart', 'graph',    'input',   'inverted', 'linear', 'mixers',   'output',  'set0' ];
	if ( $camilla ) $btn = array_merge( $btn, $btnc );
	foreach( $btn as $b ) ${'b_'.$b} = i( $b.' btn' ); // $b_xxx - button
	
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
