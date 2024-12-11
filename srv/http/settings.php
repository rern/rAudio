<?php
include 'common.php';

if ( $addons ) {
	$iconhead  = i( 'gear' );
} else if ( $addonsprogress ) {
	$iconhead  = '';
} else {
	$iconhead  = i( 'help helphead' ).i( 'gear' );
}
$container = $guide ? '' : '<div class="container hide" tabindex="-1">';
$htmlhead  = '
<div class="head hide">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>
'.i( 'close close', 'close' ).$iconhead.'
</div>';
if ( ! $guide ) $htmlhead.= '
<div class="container hide" tabindex="-1">
';
echo $htmlhead;
if ( $addonsprogress ) {
	include 'settings/'.$page.'.php';
	exit;
//----------------------------------------------------------------------------------
}

$iconlabel = $features || $system;
$prefix    = '';
$htmlbar   = '';
if ( $camilla ) {
	$tabs   = [ 'filters', 'mixers', 'processors', 'pipeline', 'devices' ];
	$prefix = 'tab';
} else if ( $guide ) {
	$tabs   = [ 'library', 'playback', 'playlist', 'settings' ];
} else {
	$tabs   = [ 'features', 'player', 'networks', 'system', 'addons' ];
}
foreach ( $tabs as $tab ) $htmlbar.= '<div id="'.$prefix.$tab.'">'.i( $tab ).'<span>'.ucfirst( $tab ).'</span></div>';
if ( $guide ) {
	$htmlbar.= i( 'back', 'prev' ).i( 'arrow-right', 'next' );
	echo '
<img id="guideimg" src="/assets/img/guide/1.jpg'.$hash.'">
';
} else {
	if ( ! $addons ) {
		include 'settings/function.php';
		include 'settings/'.$page.'.php'; // addons: by addons.js
	}
	echo '
</div>
';
}
htmlBottom();
