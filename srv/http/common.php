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
$hash      = '?v='.time();
$page      = $_GET[ 'p' ] ?? '';
$css       = [ 'colors', 'common' ];
$logosvg   = file_get_contents( '/srv/http/assets/img/icon.svg' );
if ( file_exists( '/srv/http/data/system/login' ) ) {
	foreach( $css as $c ) echo '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
	session_start();
	if ( ! isset( $_SESSION[ 'login' ] ) ) {
		$page ? header( 'Location: /' ) : include 'login.php';
		exit;
//----------------------------------------------------------------------------------
	}
}
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );

// css / js filename with version
$cssfiles  = array_slice( scandir( '/srv/http/assets/css/plugin' ), 2 );
foreach( $cssfiles as $file ) {
	$name            = explode( '-', $file )[ 0 ];
	$cfiles[ $name ] = $file;
}
$jsfiles   = array_slice( scandir( '/srv/http/assets/js/plugin' ), 2 );
foreach( $jsfiles as $file ) {
	$name            = explode( '-', $file )[ 0 ];
	$jfiles[ $name ] = $file;
}
if ( ! $page ) { // main
	$cssp  = [ 'roundslider' ];
	$css   = [ ...$css, 'main', 'hovercursor' ];
	$jsp   = [ 'jquery', 'lazysizes', 'roundslider', 'Sortable' ]; // loaded with $.getScript: html5colorpicker, pica, qrcode
	$js    = [ 'common', 'context', 'function', 'main', 'passive', 'shortcut' ];
	if ( $equalizer ) {
		$cssp[] = 'select2';
		$css    = [ ...$css, 'select2', 'equalizer' ];
		$jsp[]  = 'select2';
		$js[]   = 'equalizer';
	}
	$title = 'STATUS';
} else {         // settings
	$pages = [ 'features', 'player', 'networks', 'system', 'addons', 'addonsprogress', 'camilla', 'guide' ];
	foreach( $pages as $p ) $$p = false;
	$$page = true;
	$cssp  = [];
	$css[] = 'settings';
	$jsp   = [ 'jquery', $networks ? 'qrcode' : 'select2' ];       // loaded with $.getScript: d3, pipelineplotter, plotly, qrcode
	$js    = [ 'common', 'settings', $page ];
	if ( ! $guide && ! $networks && ! $addonsprogress ) {
		$cssp[] = 'select2';
		$css[]  = 'select2';
	}
	if ( $addons ) $css[]  = 'addons';
	$icon      = $page;
	$pagetitle = strtoupper( $page );
	if ( $addonsprogress ) {
		$icon      = 'addons';
		$pagetitle = 'Addons-Progress';
	} else if ( $camilla ) {
		$icon      = 'camilladsp';
		$pagetitle = 'Camilla DSP';
		$css       = [ ...$css, 'camilla','equalizer' ];
		$jsp[]     = 'Sortable';
	} else if ( $guide ) {
		$icon      = 'help';
		$pagetitle = 'User Guide';
	}
	$title = $pagetitle;
}
$addon_guide = $guide || $addonsprogress;
$keyboard    = $localhost && ! $addon_guide;
if ( $keyboard ) foreach( [ 'cssp', 'css', 'jsp', 'js' ] as $ea ) $$ea[] = 'simplekeyboard';

$html = '';
foreach( $cssp as $c ) $html.= '<link rel="stylesheet" href="/assets/css/plugin/'.$cfiles[ $c ].'">';
foreach( $css as $c )  $html.= '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
$html.= '
</head>
<body>
	<div id="infoOverlay" class="hide" tabindex="-1"></div>';
if ( ! $addon_guide )  $html.= '
	<div id="loader">'.$logosvg.'</div>
	<div id="banner" class="hide"></div>
	<div id="button-data" class="head hide"><i class="i-close"></i><span class="title">'.$title.'-DATA</span></div>
	<pre id="data" class="hide"></pre>
	<div id="debug"></div>
';
if ( $keyboard )       $html.= '
	<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>
';
echo $html;

$scripts = '';
foreach( $jsp as $j )      $scripts.= '<script src="/assets/js/plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )       $scripts.= '<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
if ( ! $page || $camilla ) $scripts.= '<script>var jfiles = '.json_encode( $jfiles ).'</script>';
$scripts.='
</body>
</html>
';

function i( $icon, $id = '', $cmd = '' ) {
	$htmlid  = $id ? ' id="'.$id.'"' : '';
	$htmlcmd = $cmd ? ' data-cmd="'.$cmd.'"' : '';
	return '<i'.$htmlid.' class="i-'.$icon.'"'.$htmlcmd.'></i>';
}

