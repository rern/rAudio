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

// login
if ( file_exists( '/srv/http/data/system/login' ) ) {
	foreach( $css as $c ) echo '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
	session_start();
	if ( ! isset( $_SESSION[ 'login' ] ) ) {
		$page ? header( 'Location: /' ) : include 'login.php';
		exit;
	}
}

$addons    = $page === 'addons';
$progress  = $page === 'addons-progress';
$guide     = $page === 'guide';
$networks  = $page === 'networks';
$relays    = $page === 'relays';
$system    = $page === 'system';
$equalizer = file_exists( '/srv/http/data/system/equalizer' );
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );

// css / js filename with version
$cssfiles   = array_slice( scandir( '/srv/http/assets/css/plugin' ), 2 );
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
	$cssp[] = 'roundslider';
	$css[]  = 'main';
	$jsp    = [ 'jquery', 'html5kellycolorpicker', 'lazysizes', 'pica', 'pushstream', 'roundslider', 'Sortable' ];
	$js     = [ 'common', 'context', 'function', 'main', 'passive' ];
	if ( $equalizer ) {
		$cssp[] = 'select2';
		$css[]  = 'select2';
		$css[]  = 'equalizer';
		$jsp[]  = 'select2';
		$js[]   = 'equalizer';
	}
	if ( $localhost ) {
		$cssp[] = 'simplekeyboard';
		$css[]  = 'simplekeyboard';
		$jsp[]  = 'simplekeyboard';
		$js[]   = 'simplekeyboard';
	}
	// hovercursor.css and shortcut.js included by main.js
	$title = 'STATUS';
} else {         // settings
	$css[] = 'settings';
	$jsp   = [ 'jquery' ];
	$js    = [ 'common' ];
	if ( ! $guide && ! $networks && ! $progress ) {
		$cssp[] = 'select2';
		$css[]  = 'select2';
	}
	if ( $relays ) $css[]  = 'relays';
	if ( $addons ) {
		$css[]  = 'addons';
	} else {
		$jsp[]  = 'pushstream';
		$js[]   = 'settings';
	}
	$jsp[]  = $networks ? 'qrcode' : 'select2';
	$js[]   = $page;
	
	$icon = $pagetitle = $page;
	if ( $guide ) {
		$icon = 'help';
		$pagetitle = 'user guide';
	} else if ( $relays ) {
		$icon = $pagetitle = 'system';
	}
	$title = strtoupper( $pagetitle );
}
// <style> -----------------------------------------------------
foreach( $cssp as $c ) echo '<link rel="stylesheet" href="/assets/css/plugin/'.$cfiles[ $c ].'">';
foreach( $css as $c )  echo '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';

$css = shell_exec( "sed -E -n '/^.fa-.*con/ {s/^.fa-(.*)::.*/\\1/;p}' /srv/http/assets/css/common.css" );
$fa = json_encode( explode( "\n", $css ) );
?>
</head>
<body>

<div id="infoOverlay" class="hide" tabindex="-1"></div>

<div id="banner" class="hide"></div>

<div id="button-data" class="head hide"><i class="fa fa-close"></i><span class="title"><?=$title?>-DATA</span></div>
<pre id="data" class="hide"></pre>

<?php if ( ! $guide && ! $progress && ! $relays ) { ?>
<div id="loader">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
</div>
<?php } ?>
