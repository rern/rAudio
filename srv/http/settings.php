<?php
include 'common.php';

$htmlhead  = '
<div class="head hide">'.i( $icon.' page-icon pagerefresh' ).'<span class="title">'.$title.'</span>
'.i( 'close close', 'close' ).i( 'help helphead' ).i( 'gear' ).'
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
$isenabled = ' is currently enabled.';
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
	include 'settings/guide.php';
	exit;
//----------------------------------------------------------------------------------
}
if ( ! $addons ) {
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
echo '
</div>
';
htmlBottom();
