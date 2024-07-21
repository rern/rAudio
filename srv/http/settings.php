<?php
include 'common.php';

echo '
<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>
'.i( 'close close', 'close' ).i( 'help helphead' ).i( 'gear' ).'
</div>
<div class="container '.$page.' hide" tabindex="-1">
';
if ( $addonsprogress ) {
	include 'settings/'.$page.'.php';
	exit;
//----------------------------------------------------------------------------------
}

$prefix = '';
$htmlbar = '';
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
	echo '
</div>
<img id="guideimg" src="/assets/img/guide/1.jpg'.$hash.'">
';
	$htmlbar.= i( 'back', 'prev' ).i( 'arrow-right', 'next' );
} else if ( ! $addons ) {
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
htmlBottom();
