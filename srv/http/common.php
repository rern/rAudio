<?php
$hash      = '?v='.time();
$hreficon  = 'href="/assets/img/icon.png'.$hash.'"';
$dirassets = '/srv/http/assets/';
$dirsystem = '/srv/http/data/system/';
$logosvg   = file_get_contents( $dirassets.'img/icon.svg' );
$divlogo   = '<div id="loader">'.$logosvg.'</div>';
//..................................................................................
$password    = file_exists( '/boot/password' );
$login     = file_exists( $dirsystem.'login' );
$login_set = file_exists( $dirsystem.'loginsetting' );
if ( $login || $login_set ) {
	session_start();
	$login = empty( $_SESSION[ 'login' ] );
	if ( $login_set ) $login = $login && $page;
}
$log_pass = $password || $login;
//..................................................................................
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
	<link rel="apple-touch-icon" sizes="180x180" <?=$hreficon?>>
	<link rel="icon" <?=$hreficon?>>

<?php
$page      = $_GET[ 'p' ] ?? '';
$pages     = [ 'features', 'player', 'networks', 'system', 'addons', 'addonsprogress', 'camilla', 'guide' ];
foreach( $pages as $p ) $$p = false;
$$page     = true;
$css       = [ 'colors', 'common' ];
// plugin/*.js filename with version
$jsfiles   = array_slice( scandir( $dirassets.'js/plugin' ), 2 );
$jsp       = [ 'jquery' ];
foreach( $jsfiles as $file ) {
	$name            = explode( '-', $file )[ 0 ];
	$jfiles[ $name ] = $file;
}
if ( $log_pass ) {
	$css[] = 'login';
	$js    = [ 'login' ];
	if ( $password ) $jsp   = [ ...$jsp, 'qr' ];
} else if ( ! $page ) { // main
	$equalizer = file_exists( $dirsystem.'equalizer' );
	$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
	$css   = [ ...$css, 'main', 'hovercursor' ];
	$jsp   = [ ...$jsp, 'pica', 'qr' ];
	$js    = [ 'common', 'context', 'main', 'function', 'passive', 'shortcut' ];
	if ( $equalizer ) $css[] = 'equalizer';
	$title = 'STATUS';
} else {         // settings
	$css[] = 'settings';
	if ( $networks || $system ) $jsp[] = 'qr';
	$js    = [ 'common', 'settings', $page ];
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
//------------------------------------------------------------------------------------------
if ( $localhost && ! $add_guide ) include 'keyboard.php';
//------------------------------------------------------------------------------------------
$html      = '';
$htmlcss   = '<link rel="stylesheet" href="/assets/css/';
foreach( $css as $c )  $html.= $htmlcss.$c.'.css'.$hash.'">';
echo $html.'
</head>
<body>
';
//------------------------------------------------------------------------------------------
$html_end  = '';
if ( ! $add_guide && ! $log_pass )  {
	$pageicon = $page ? icon(  $page.' page-icon' ) : '';
	$html_end.= '
	<div id="infoOverlay" class="hide" tabindex="-1"></div>
	'.( $keyboard ?? '' ).'
	<pre id="data" class="hide"></pre>
	<i id="debug" class="i-pause"></i>
	'.$divlogo.'
	<div id="banner" class="hide"></div>
';
}
$htmljs    = '<script src="/assets/js/';
foreach( $jsp as $j ) $html_end.= $htmljs.'plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )  $html_end.= $htmljs.$j.'.js'.$hash.'"></script>';

function htmlEnd( $htmlbar ) {
	global $html_end;
	if ( $htmlbar ) $html_end.= '
	<div id="bar-bottom">'.$htmlbar.'</div>
';
	echo $html_end.'
</body>
</html>
';
}
if ( $log_pass ) {
	include 'login.php';
	htmlEnd( '' );
	exit;
}
//------------------------------------------------------------------------------------------
function icon(  $icon, $id = '', $cmd = '' ) {
	$htmlid  = $id ? ' id="'.$id.'"' : '';
	$htmlcmd = $cmd ? ' data-cmd="'.$cmd.'"' : '';
	return '<i'.$htmlid.' class="i-'.$icon.'"'.$htmlcmd.'></i>';
}
