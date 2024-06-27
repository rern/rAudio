<?php
include 'common.php';

echo '
	<div class="head">'.i( $icon.' page-icon' ).'<span class="title">'.$title.'</span>'.i( 'close close' ).i( 'help helphead' ).'</div>
	<div class="container '.$page.' hide">
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

if ( ! $addons ) {
	include 'settings/function.php';
	include 'settings/'.$page.'.php'; // addons: by addons.js
}
$htmlbar = '';
if ( $camilla ) {
	$tabs   = [ 'Filters', 'Mixers', 'Processors', 'Pipeline', 'Devices' ];
	$prefix = 'tab';
	$fader  = '';
} else {
	$tabs   = [ 'Features', 'Player', 'Networks', 'System', 'Addons' ];
	$prefix = '';
	$fader  = '<div id="fader" class="hide"></div>';
}
foreach ( $tabs as $tab ) {
	$id      = strtolower( $tab );
	$htmlbar.= '<div id="'.$prefix.$id.'">'.i( $id ).' <a>'.$tab.'</a></div>';
}
echo '
	</div>
	'.$fader.'
	<div id="bar-bottom">'.$htmlbar.'</div>
';
// <script> -----------------------------------------------------
echo $scripts;
