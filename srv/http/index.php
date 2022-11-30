<?php
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
$css       = [ 'roundslider', 'main' ];
if ( $equalizer ) array_push( $css, ...[ 'equalizer',      'selectric' ] );
if ( $localhost ) array_push( $css, ...[ 'simplekeyboard', 'keyboard' ] );
$cssver    =  json_decode( exec( '/srv/http/bash/cmd.sh cssversion' ) );
$style     = '';
foreach( $css as $c ) {
	if ( $c === 'roundslider' || $c === 'simplekeyboard' ) {
		$style.= '<link rel="stylesheet" href="/assets/css/'.$cssver->$c.'">';
	} else {
		$style.= '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
	}
}

include 'common.php';      // <!DOCTYPE html> ---------------------------------------------

echo $style;

include 'common-body.php'; // </head><body> -----------------------------------------------

if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( ! $_SESSION[ 'login' ] ) {
		include 'login.php';
		exit;
	}
}

include 'main.php';

$jsp       = [ 'jquery', 'html5kellycolorpicker', 'lazysizes', 'pica', 'pushstream', 'qrcode', 'roundslider', 'Sortable' ];
$js        = [ 'common', 'context', 'function', 'main', 'passive' ];
if ( $equalizer ) {
	$jsp[] = 'jquery.selectric';
	$js[]  = 'equalizer';
}
if ( $localhost ) {
	$jsp[] = 'simplekeyboard';
	$js[]  = 'keyboard';
	echo '
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';
}
$script    = '';
foreach( $jsp as $j ) $script.= '
<script src="/assets/js/plugin/'.$jlist[ $j ].'"></script>';
// with cache busting
foreach( $js as $j ) $script.= '
<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
echo $script;
?>

</body>
</html>

