<?php
include 'common.php';

$iconhead  = '';
if ( $addons ) {
	$iconhead  = i( 'gear' );
} else if ( ! $addonsprogress ) {
	$iconhead  = i( 'help helphead' ).i( 'gear' );
}
echo '
<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>
'.i( 'close close', 'close' ).$iconhead.'
</div>
<div class="container '.$page.' hide" tabindex="-1">
';
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
foreach ( $tabs as $tab ) $htmlbar.= '<div id="'.$prefix.$tab.'">'.i( $tab ).' <a>'.ucfirst( $tab ).'</a></div>';
if ( $guide ) {
	$htmlbar.= i( 'back', 'prev' ).i( 'arrow-right', 'next' );
	echo '
</div>
<img id="guideimg" src="/assets/img/guide/1.jpg'.$hash.'">
';
} else if ( ! $addons ) {
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
htmlBottom();
