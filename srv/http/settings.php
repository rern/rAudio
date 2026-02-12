<?php
include 'common.php';

if ( $guide ) {
	$helphead  = '';
	$container = '';
} else {
	$helphead  = icon(  'help helphead' );
	$container = '<div class="container hide" tabindex="-1">';
}
echo '
<div class="head hide">'.icon(  $icon.' page-icon pagerefresh' ).'<span class="title">'.$title.'</span>
'.icon(  'close close', 'close' ).$helphead.icon(  'gear' ).'
</div>
'.$container;

if ( $addonsprogress ) {
	include 'settings/'.$page.'.php';
	exit;
//----------------------------------------------------------------------------------
}

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
foreach ( $tabs as $tab ) $htmlbar.= '<div id="'.$prefix.$tab.'">'.icon(  $tab ).'<span>'.ucfirst( $tab ).'</span></div>';
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
htmlEnd( $htmlbar );
