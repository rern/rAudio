<?php
$svg = preg_grep( '/<rect|<path/', file( '/srv/http/assets/img/icon.svg' ) );
$logo = '<svg viewBox="0 0 180 180">'.implode( '', $svg ).'</svg>';

if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( !isset( $_SESSION[ 'login' ] ) ) header( 'Location: /' );
}
$time = time();
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
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
	<link rel="icon" href="/assets/img/icon.png">
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/common.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/settings.<?=$time?>.css">
		<?php if ( in_array( $page, [ 'features', 'player', 'relays', 'system' ] ) ) { ?> 
	<link rel="stylesheet" href="/assets/css/selectric.<?=$time?>.css">
		<?php }
			  if ( $page === 'relays' ) { ?>
	<link rel="stylesheet" href="/assets/css/relays.<?=$time?>.css">
		<?php } ?>
</head>
<body>
<i id="button-data"></i>
<pre id="data" class="hide"></pre>
<div class="head hide">
	<i class="page-icon fa fa-<?=$page?>"></i><span class='title'><?=( strtoupper( $page ) )?></span>
	<i id="close" class="fa fa-times"></i><i id="help" class="fa fa-question-circle"></i>
</div>
<div class="container hide">
<?php
function htmlHead( $data ) {
	$title = $data[ 'title' ];
	$subhead = $data[ 'subhead' ] ?? '';
	$status = $data[ 'status' ] ?? '';
	$button = $data[ 'button' ] ?? '';
	$button1 = $data[ 'button1' ] ?? '';
	$help = $data[ 'help' ] ?? '';
	$html = $status ? '<heading data-status="'.$status.'" class="status' : '<heading class="';
	$html.= $subhead ? ' sub' : '';
	$html.= isset( $data[ 'noline' ] ) ? ' noline">' : '">';
	$html.= $title;
	$html.= $status ? '<i class="fa fa-status"></i>' : '';
	$html.= $button ? '<i id="'.$button[ 0 ].'" class="fa fa-'.$button[ 1 ].'"></i>' : '';
	$html.= $button1 ? '<i id="'.$button1[ 0 ].'" class="fa fa-'.$button1[ 1 ].'"></i>' : '';
	$html.= isset( $data[ 'nohelp' ] ) || $subhead ? '' : '<i class="help fa fa-question-circle"></i>';
	$html.= isset( $data[ 'back' ] ) ? '<i class="help fa fa-fa fa-arrow-left back"></i>' : '';
	$html.= '</heading>';
	$html.= $status ? '<pre id="code'.$status.'" class="hide"></pre>' : '';
	$html.= $help ? '<span class="help-block hide">'.$help.'</span>' : '';
	echo $html;
}
function htmlSetting( $data ) {
	if ( isset( $data[ 'exist' ] ) && !$data[ 'exist' ] ) return;
	// col-l
	$label = $data[ 'label' ];
	$icon = $data[ 'icon' ] ?? '';
	$sublabel = $data[ 'sublabel' ] ?? '';
	$status = $data[ 'status' ] ?? '';
	$id = $data[ 'id' ];
	$input = $data[ 'input' ] ?? '';
	$setting = $data[ 'setting' ] ?? '';
	$settingicon = $data[ 'settingicon' ] ?? 'gear';
	$help = $data[ 'help' ] ?? '';
	$html = '<div id="div'.$id.'"><div class="col-l';
	$html.= $sublabel ? '' : ' single';
	$html.= $status ? ' status" data-status="'.$status.'">' : '">';
	if ( $sublabel ) {
		$html.= '<a>'.$label.'<gr>'.$sublabel;
		$html.= $status ? '<i class="fa fa-status"></i>' : '';
		$html.= '</gr></a>';
	} else {
		$html.= $label;
	}
	$html.= $icon ? '<i class="fa fa-'.$icon.'"></i>' : '';
	$html.= '</div>';
	// col-r
	if ( !$icon ) {
		global $page;
		$icon = $page;
	}
	$html.= '<div class="col-r">';
	if ( !$input ) {
		$html.= '<input type="checkbox" id="'.$id.'" class="switch '. $setting.'" data-label="'.$label.'" data-icon="'.$icon.'">'
			.'<div class="switchlabel" for="'.$id.'"></div>';
	} else {
		$html.= $input;
	}
	$html.= $setting ? '<i id="setting-'.$id.'" class="setting fa fa-'.$settingicon.'"></i>' : '';
	$html.= $help ? '<span class="help-block hide">'.$help.'</span>' : '';
	$html.= '</div>';
	$html.= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	$html.= '</div>';
	echo $html;
}

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
<div id="loader">
	<?=$logo?>
</div>

<script src="/assets/js/plugin/jquery-3.6.0.min.js"></script>
<script src="/assets/js/plugin/pushstream-0.5.4.min.js"></script>
<script src="/assets/js/info.<?=$time?>.js"></script>
<script src="/assets/js/settings.<?=$time?>.js"></script>
	<?php if ( $page !== 'guide' ) { ?>
<script src="/assets/js/<?=$page?>.<?=$time?>.js"></script>
	<?php }
		  if ( in_array( $page, [ 'features', 'player', 'relays', 'system' ] ) ) { ?>
<script src="/assets/js/plugin/jquery.selectric-1.13.0.min.js"></script>
	<?php }
		  if ( $page === 'networks' ) { ?>
<script src="/assets/js/plugin/qrcode.min.js"></script>
	<?php }
		  if ( $page === 'relays' ) { ?>
<script src="/assets/js/relays.<?=$time?>.js"></script>
	<?php }
		  if ( $localhost ) include 'keyboard.php';?>
	
</body>
</html>
