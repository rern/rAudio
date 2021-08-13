<?php
$login = file_exists( '/srv/http/data/system/login' );
if ( $login ) session_start();
$time = time();  // for cache busting
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$desktop = isset( $_SERVER[ 'HTTP_USER_AGENT' ] )
			&& !preg_match( 
				  '/(Mobile|Android|Tablet|GoBrowser|[0-9]x[0-9]*|uZardWeb\/|Mini|Doris\/|Skyfire\/|iPhone|Fennec\/|Maemo|Iris\/|CLDC\-|Mobi\/)/uis'
				, $_SERVER[ 'HTTP_USER_AGENT' ]
			);
?>

<!DOCTYPE html>
<html>
<head>
	<title>rAudio</title>
	<meta name="apple-mobile-web-app-title" content="rAudio">
	<meta name="application-name" content="rAudio">
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="msapplication-tap-highlight" content="no">
	<link rel="icon" href="/assets/img/icon.<?=$time?>.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/icon.<?=$time?>.png">
	<style>
		@font-face {
			font-family: rern; font-display: block; font-style: normal; font-weight: normal;
			src: url( "/assets/fonts/rern.<?=$time?>.woff2" ) format( 'woff2' );
		}
	</style>
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/common.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/roundslider.min.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/main.<?=$time?>.css">
</head>
<body>

<?php include 'index-body.php';?>

<script src="/assets/js/plugin/jquery-3.6.0.min.js"></script>
<script src="/assets/js/plugin/Tocca.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/pushstream.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/html5kellycolorpicker.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/lazyload.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/pica.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/qrcode.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/roundslider.min.<?=$time?>.js"></script>
<script src="/assets/js/plugin/Sortable.min.<?=$time?>.js"></script>
<script src="/assets/js/info.<?=$time?>.js"></script>
<script src="/assets/js/context.<?=$time?>.js"></script>
<script src="/assets/js/function.<?=$time?>.js"></script>
<script src="/assets/js/main.<?=$time?>.js"></script>
<script src="/assets/js/passive.<?=$time?>.js"></script>
	<?php if ( $desktop ) { ?>
<link rel="stylesheet" href="/assets/css/desktop.<?=$time?>.css">
<script src="/assets/js/shortcut.<?=$time?>.js"></script>
	<?php }
		  if ( $localhost ) include 'keyboard.php';?>
	
</body>
</html>
