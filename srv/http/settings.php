<?php
include 'common.php';

echo '<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>'.i( 'close close', 'close' );
if ( $guide ) {
	echo '</div>';
} else {
	echo i( 'help helphead' ).i( 'gear' ).'
</div>
<div class="container '.$page.' hide" tabindex="-1">
';
}
if ( $addonsprogress ) {
	include 'settings/'.$page.'.php';
	exit;
//----------------------------------------------------------------------------------
}

$prefix = '';
$htmlbar = '';
if ( $camilla ) {
	$tabs   = [ 'Filters', 'Mixers', 'Processors', 'Pipeline', 'Devices' ];
	$prefix = 'tab';
} else if ( $guide ) {
	$tabs   = [ 'Library', 'Playback', 'Playlist', 'Settings' ];
} else {
	$tabs   = [ 'Features', 'Player', 'Networks', 'System', 'Addons' ];
}
foreach ( $tabs as $tab ) {
	$id      = strtolower( $tab );
	$htmlbar.= '<div id="'.$prefix.$id.'">'.i( $id ).' <a>'.$tab.'</a></div>';
}
if ( $guide ) {
	echo '<img id="guideimg" src="/assets/img/guide/1.jpg'.$hash.'">';
	$htmlbar.= i( 'back', 'guideprev' ).i( 'arrow-right', 'guidenext' );
} else if ( ! $addons ) {
	$btn     = [ 'add',     'bluetooth', 'btsender', 'code',    'gear',     'lan',    'lastfm',   'microsd', 'networks'
				,'pause',   'play',      'power',    'refresh', 'search',   'stop',   'usbdrive', 'volume',  'wifi' ];
	$btnc    = [ 'filters', 'flowchart', 'graph',    'input',   'inverted', 'linear', 'mixers',   'output',  'set0' ];
	if ( $camilla ) $btn = array_merge( $btn, $btnc );
	foreach( $btn as $b ) ${'B_'.$b} = i( $b.' btn' ); // $B_xxx - button
	
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
htmlBottom();
