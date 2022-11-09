<?php
$login     = file_exists( '/srv/http/data/system/login' );
if ( $login ) session_start();
$time      = time();  // for cache busting
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
?>

<!DOCTYPE html>
<html>
<head>

<title>rAudio</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="rAudio">
<meta name="application-name" content="rAudio">
<meta name="msapplication-tap-highlight" content="no">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/icon.png">
<link rel="icon" href="/assets/img/icon.png">
<?php
$css    = [ 'colors', 'common', 'roundslider-1.6.1.min', 'main' ];
if ( $equalizer ) array_push( $css, ...[ 'equalizer', 'selectric' ] );
if ( $localhost ) array_push( $css, ...[ 'simple-keyboard-3.4.139.min', 'keyboard' ] );                                     
$style  = '';
foreach( $css as $c ) $style.= '
<link rel="stylesheet" href="/assets/css/'.$c.'.css?v='.$time.'">';
echo $style;
echo '
</head>
<body>
';

include 'index-body.php';

$jsp       = [
	  'jquery-3.6.1',          'html5kellycolorpicker-1.21', 'lazysizes-5.3.2',   'pica-9.0.1'
	, 'pushstream-20211210',   'qrcode',                     'roundslider-1.6.1', 'Sortable-1.15.0'
];
$js        = [ 'common', 'context', 'function', 'main', 'passive' ];
if ( $equalizer ) {
	$jsp[] = 'jquery.selectric-1.13.1';
	$js[]  = 'equalizer';
}
if ( $localhost ) {
	$jsp[] = 'simple-keyboard-3.4.139';
	$js[]  = 'keyboard';
	echo '
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';
}
$script    = '';
foreach( $jsp as $j ) $script.= '
<script src="/assets/js/plugin/'.$j.'.min.js"></script>';
// with cache busting
foreach( $js as $j ) $script.= '
<script src="/assets/js/'.$j.'.js?v='.$time.'"></script>';
echo $script;
echo '
</body>
</html>
';
