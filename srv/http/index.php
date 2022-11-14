<?php
include 'common.php'; // <!DOCTYPE html>

$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
$css       = [ 'roundslider-1.6.1.min', 'main' ];
if ( $equalizer ) array_push( $css, ...[ 'equalizer', 'selectric' ] );
if ( $localhost ) array_push( $css, ...[ 'simple-keyboard-3.4.139.min', 'keyboard' ] );                                     
$style     = '';
foreach( $css as $c ) $style.= '
<link rel="stylesheet" href="/assets/css/'.$c.'.css?v='.$time.'">';
echo $style;
?>
</head>
<body>

<div id="infoOverlay" class="hide"></div>

<div id="banner" class="hide"></div>

<div id="loader">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
</div>

<?php
if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( ! $_SESSION[ 'login' ] ) {
		include 'login.php';
		exit;
	}
}

include 'main.php';

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
?>

</body>
</html>

