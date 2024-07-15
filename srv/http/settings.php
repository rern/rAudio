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
