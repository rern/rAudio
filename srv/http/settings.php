<?php
$svg = preg_grep( '/<rect|<path/', file( '/srv/http/assets/img/icon.svg' ) );
$logo = '<svg viewBox="0 0 180 180">'.implode( '', $svg ).'</svg>';

if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( !isset( $_SESSION[ 'login' ] ) ) header( 'Location: /' );
}
$time = time();
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$istatus = '<i class="fa fa-status"></i>';
$ihelp = '<i class="help fa fa-question-circle"></i>';
$chkenable = 'class="enable" type="checkbox"';
$chknoset = 'class="enablenoset" type="checkbox"';
$classhelp = 'class="help-block hide"';
$classstatus = 'class="col-l double status"';
$classsetting = 'class="setting fa fa-gear"';
$page = $_GET[ 'p' ];
$sudo = '/usr/bin/sudo /usr/bin';
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
			font-family: rern; font-display: block; font-style: normal; font-weight: normal;
			src: url( "/assets/fonts/rern.<?=$time?>.woff" ) format( 'woff' ), url( "/assets/fonts/rern.<?=$time?>.ttf" ) format( 'truetype' );
		}
	</style>
	<link rel="stylesheet" href="/assets/css/common.<?=$time?>.css">
		<?php if ( $localhost ) { ?> 
	<link rel="stylesheet" href="/assets/css/simple-keyboard.min.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/keyboard.<?=$time?>.css">
		<?php }
			  if ( in_array( $page, [ 'features', 'player', 'system' ] ) ) { ?> 
	<link rel="stylesheet" href="/assets/css/selectric.<?=$time?>.css">
		<?php } ?>
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/banner.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/settings.<?=$time?>.css">
</head>
<body>
<i id="button-data"></i>
<pre id="data" class="hide"></pre>
<div id="loader">
	<?=$logo?>
</div>
<div class="head hide">
	<i class="page-icon fa fa-<?=$page?>"></i><span class='title'><?=( strtoupper( $page ) )?></span>
	<i id="close" class="fa fa-times"></i><i id="help" class="fa fa-question-circle"></i>
</div>
<div class="container hide">
<?php
include "settings/$page.php";
$htmlbar = '';
foreach ( [ 'Features', 'Player', 'Networks', 'System' ] as $name ) {
	$id = strtolower( $name );
	$htmlbar.= '<div id="'.$id.'"><i class="fa fa-'.$id.'"></i><a> '.$name.'</a></div>';
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
	<?php }
		  if ( in_array( $page, [ 'features', 'player', 'system' ] ) ) { ?>
<script src="/assets/js/plugin/jquery.selectric.min.<?=$time?>.js"></script>
	<?php }
		  if ( $page === 'networks' ) { ?>
<script src="/assets/js/plugin/qrcode.min.<?=$time?>.js"></script>
	<?php }
		  if ( $localhost ) { ?>
<script src="/assets/js/plugin/simple-keyboard.min.<?=$time?>.js"></script>
<script src="/assets/js/keyboard.<?=$time?>.js"></script>
	<?php } ?>
	
</body>
</html>
