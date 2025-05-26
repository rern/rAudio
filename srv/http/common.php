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
	<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/icon.png?v=1748155501">
	<link rel="icon" href="/assets/img/icon.png?v=1748155501">

<?php
$page      = $_GET[ 'p' ] ?? '';
$pages     = [ 'features', 'player', 'networks', 'system', 'addons', 'addonsprogress', 'camilla', 'guide' ];
foreach( $pages as $p ) $$p = false;
$$page     = true;
$hash      = '?v='.time();
$css       = [ 'colors', 'common' ];
$logosvg   = file_get_contents( '/srv/http/assets/img/icon.svg' );
$filelogin = '/srv/http/data/system/login';
if ( file_exists( $filelogin ) && ! file_exists( $filelogin.'setting' ) ) {
	session_start();
	if ( ! isset( $_SESSION[ 'login' ] ) ) {
		foreach( $css as $c ) echo '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
		include 'login.php';
		exit;
//----------------------------------------------------------------------------------
	}
}
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );

// plugin: css / js filename with version
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
	$cssp  = [];
	$css   = [ ...$css, 'main', 'hovercursor' ];
	$jsp   = [ 'jquery', 'pica', 'qrcode' ];
	$js    = [ 'common', 'context', 'main', 'function', 'passive', 'shortcut' ];
	if ( $equalizer ) {
		$cssp[] = 'select2';
		$css    = [ ...$css, 'select2', 'equalizer' ];
		$jsp[]  = 'select2';
	}
	$title = 'STATUS';
} else {         // settings
	$cssp  = [];
	$css[] = 'settings';
	$jsp   = [ 'jquery', $networks ? 'qrcode' : 'select2' ];
	$js    = [ 'common', 'settings', $page ];
	if ( ! $guide && ! $networks && ! $addonsprogress ) {
		$cssp[] = 'select2';
		$css[]  = 'select2';
	}
	if ( $addons ) $css[] = 'addons';
	$icon      = $page;
	$pagetitle = strtoupper( $page );
	if ( $addonsprogress ) {
		$icon      = 'addons';
		$pagetitle = 'Addons-Progress';
	} else if ( $camilla ) {
		$icon      = 'camilladsp';
		$pagetitle = 'CamillaDSP';
		$css       = [ ...$css, 'camilla', 'equalizer' ];
		$jsp       = [ ...$jsp, 'camilladsp_plot', 'complex', 'plotly' ];
	} else if ( $guide ) {
		$icon      = 'help';
		$pagetitle = 'User Guide';
		$jsp       = [];
		$js        = [ 'guide' ];
	}
	$title = $pagetitle;
}
$add_guide = $addonsprogress || $guide;
$keyboard  = $localhost && ! $add_guide;
if ( $keyboard ) foreach( [ 'cssp', 'css', 'jsp', 'js' ] as $ea ) $$ea[] = 'simplekeyboard';

$html      = '';
$htmlcss   = '<link rel="stylesheet" href="/assets/css/';
foreach( $cssp as $c ) $html.= $htmlcss.'plugin/'.$cfiles[ $c ].'">';
foreach( $css as $c )  $html.= $htmlcss.$c.'.css'.$hash.'">';
$html     .= '
</head>
<body>
';
if ( ! $add_guide )  {
	$pageicon = $page ? icon(  $page.' page-icon' ) : '';
	$html    .= '
	<div id="infoOverlay" class="hide" tabindex="-1"></div>
	<div id="loader">'.$logosvg.'</div>
	<div id="banner" class="hide"></div>
';
}
if ( $keyboard )       $html.= '
	<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>
';
echo $html;

$scripts   = '';
$htmljs    = '<script src="/assets/js/';
foreach( $jsp as $j ) $scripts.= $htmljs.'plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )  $scripts.= $htmljs.$j.'.js'.$hash.'"></script>';

function htmlBottom() {
	global $htmlbar, $scripts;
	echo '
	<div id="bar-bottom">'.$htmlbar.'</div>
	<i id="debug" class="i-info"></i>
	'.$scripts.'
</body>
</html>
';
}
function icon(  $icon, $id = '', $cmd = '' ) {
	$htmlid  = $id ? ' id="'.$id.'"' : '';
	$htmlcmd = $cmd ? ' data-cmd="'.$cmd.'"' : '';
	return '<i'.$htmlid.' class="i-'.$icon.'"'.$htmlcmd.'></i>';
}
