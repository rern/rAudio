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
$hash = '?v='.time();
$page = $_GET[ 'p' ] ?? '';
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$css = [ 'colors', 'common' ];
// login
if ( file_exists( '/srv/http/data/system/login' ) ) {
	foreach( [ 'colors', 'common' ] as $c ) echo '<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';
	session_start();
	if ( ! isset( $_SESSION[ 'login' ] ) ) {
		$page ? header( 'Location: /' ) : include 'login.php';
		exit;
	}
}

$cnames  = [];
if ( ! $page ) { // main
	$equalizer = file_exists( '/srv/http/data/system/equalizer' );
	array_push( $css, ...[ 'roundslider', 'main' ] );
	if ( $equalizer ) array_push( $css, ...[ 'equalizer',      'selectric' ] );
	if ( $localhost ) array_push( $css, ...[ 'simplekeyboard', 'keyboard' ] );
	exec( 'basename -a /srv/http/assets/css/*.min.*', $cssfiles );
	$cfiles    = [];
	foreach( $cssfiles as $file ) {
		$name            = explode( '-', $file )[ 0 ];
		$cfiles[ $name ] = $file;
		$cnames[]        = $name;
	}
} else { // settings
	$icon      = $page;
	if ( $page === 'guide' ) {
		$icon     = 'help';
		$pagehead = 'user guide';
	} else if ( $page === 'relays' ) {
		$pagehead = 'system';
	} else {
		$pagehead = $page;
	}
	$title     = strtoupper( $pagehead );
	$addons    = $page === 'addons';
	$progress  = $page === 'addons-progress';
	$guide     = $page === 'guide';
	$networks  = $page === 'networks';
	$relays    = $page === 'relays';
	$css[]     = 'settings';
	if ( $addons || $progress ) $css[] = 'addons';
	if ( ! $networks )          $css[] = 'selectric';
	if ( $relays )              $css[] = 'relays';
}
// <style> -----------------------------------------------------
foreach( $css as $c ) { 
	$cssname = in_array( $c, $cnames ) ? $cfiles[ $c ] : $c.'.css'.$hash;
	$style.= '<link rel="stylesheet" href="/assets/css/'.$cssname.'">';
}
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

<pre id="data" class="hide"></pre>

<?php if ( isset( $page ) ) echo '
<div id="button-data" class="hide"><i class="fa fa-times"></i><span class="title wh">'.$title.'-DATA</span></div>
';
// js plugin version from filenames
$jsfiles = array_slice( scandir( '/srv/http/assets/js/plugin' ), 2 );
$jfiles  = [];
foreach( $jsfiles as $file ) {
	$name            = explode( '-', $file )[ 0 ];
	$jfiles[ $name ] = $file;
}
?>
