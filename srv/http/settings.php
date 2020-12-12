<?php
$logo = '
<svg viewBox="0 0 180 180">
	<rect width="180" height="180" rx="9"/>'
	.exec( 'grep "<path" /srv/http/assets/img/icon.svg' )
.'</svg>';

if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( !isset( $_SESSION[ 'login' ] ) ) header( 'Location: /' );
}
$time = time();
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="msapplication-tap-highlight" content="no">
	<link rel="icon" href="/assets/img/icon.<?=$time?>.png">
	<style>
		@font-face {
			font-family: enhance;
			src        : url( '/assets/fonts/enhance.<?=$time?>.woff' ) format( 'woff' ),
			             url( '/assets/fonts/enhance.<?=$time?>.ttf' ) format( 'truetype' );
			font-weight: normal;
			font-style : normal;
		}
	</style>
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
		<?php if ( $localhost ) { ?> 
	<link rel="stylesheet" href="/assets/css/simple-keyboard.min.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/keyboard.<?=$time?>.css">
		<?php } ?>
	<link rel="stylesheet" href="/assets/css/selectric.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/banner.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/settings.<?=$time?>.css">
</head>
<body>
<?php
$page = $_GET[ 'p' ];
$sudo = '/usr/bin/sudo /usr/bin';
$help = '<i class="help fa fa-question-circle"></i>';
?>
<div id="loader">
	<?=$logo?>
</div>
<div class="head hide">
	<i class="page-icon fa fa-<?=$page?>"></i><span class='title'><?=( strtoupper( $page ) )?></span>
	<i id="close" class="fa fa-times"></i><i id="help" class="fa fa-question-circle"></i>
</div>
<pre class="codepage hide"></pre>
<div class="container hide">
<?php
include "settings/$page.php";
$htmlbar = '';
foreach ( [ 'features', 'mpd', 'networks', 'sources', 'system' ] as $name ) {
	$htmlbar.= '<div id="'.$name.'"><i class="fa fa-'.$name.'"></i><a> '.ucfirst( $name ).'</a></div>';
}
?>
</div>
<div id="bar-bottom">
	<?=$htmlbar?>
</div>
	<?php if ( $localhost ) { ?>
<input class="input hide">
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>
	<?php } ?>
<script src="/assets/js/plugin/jquery-2.2.4.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/pushstream.min.<?=$time?>.js"></script>
<script src="/assets/js/info.<?=$time?>.js"></script>
<script src="/assets/js/banner.<?=$time?>.js"></script>
<script src="/assets/js/settings.<?=$time?>.js"></script>
	<?php if ( $page !== 'guide' ) { ?>
<script src="/assets/js/<?=$page?>.<?=$time?>.js"></script>
	<?php	if ( in_array( $page, [ 'features', 'mpd', 'system' ] ) ) { ?>
<script src="/assets/js/plugin/jquery.selectric.min.<?=$time?>.js"></script>
	<?php	} else if ( $page === 'networks' ) { ?>
<script src="/assets/js/plugin/qrcode.min.<?=$time?>.js"></script>
	<?php	}
		  } ?>
	<?php if ( $localhost ) { ?>
<script src="/assets/js/plugin/simple-keyboard.min.<?=$time?>.js"></script>
<script src="/assets/js/keyboard.<?=$time?>.js"></script>
	<?php } ?>
	
</body>
</html>
