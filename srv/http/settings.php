<?php
if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( !isset( $_SESSION[ 'login' ] ) ) header( 'Location: /' );
}
$time = time();
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
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/common.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/info.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/settings.<?=$time?>.css">
</head>
<body>
<i id="button-data"></i>
<pre id="data" class="hide"></pre>
<div class="head hide">
	<?php $pagehead = $page !== 'relays' ? $page : 'system';?>
	<i class="page-icon fa fa-<?=$pagehead?>"></i><span class='title'><?=( strtoupper( $pagehead ) )?></span>
	<?=( i( 'times close' ).i( 'help help-head' ) )?>
</div>
<div class="container hide">
<?php
/*
$head = [
	  'title'   => 'TITLE'                  // REQUIRED
	, 'subhead' => true                     // with no help icon
	, 'status'  => 'COMMAND'                // include status icon and status box
	, 'button'  => [ 'ID' => 'ICON', ... ]  // icon button
	, 'back'    => true                     // back button
	, 'nohelp'  => true
	, 'help'    => <<<html
HELP
html
];
$body = [
	[
		  'label'       => 'LABEL'      // REQUIRED
		, 'id'          => 'INPUT ID'   // REQUIRED
		, 'sublabel'    => 'SUB LABEL'
		, 'icon'        => 'ICON'
		, 'status'      => 'COMMAND'    // include status icon and status box
		, 'input'       => 'HTML'       // alternative - if not switch
		, 'setting'     => (none)       // default  = '.common'           > $( '.switch' ).click( ... > $( '#setting-'+ id ).click() before enable > [ id/iddisable ]
		                                // false    = no icon, no setting > $( '.switch' ).click( ... > [ id, true/false ]
		                                // 'custom' = custom script       > $( '#id' ).click( ...     > [ command ]
		, 'settingicon' => (none)       // default = 'gear' 
		                                // false   = omit
										// 'icon'  = 'fa-icon'
		, 'disable'     => 'MESSAGE'    // set data-diabled
		, 'help'        => <<<html
HELP - PHP heredoc
html
		, 'exist'       => EXIST        // return blank if not EXIST
	]
	, [
		...
	]
];
htmlSection( $head, $body[, $id] );
*/
function htmlHead( $data ) {
	if ( isset( $data[ 'exist' ] ) && !$data[ 'exist' ] ) return;
	
	$title = $data[ 'title' ];
	$subhead = $data[ 'subhead' ] ?? '';
	$status = $data[ 'status' ] ?? '';
	$button = $data[ 'button' ] ?? '';
	$help = $data[ 'help' ] ?? '';
	$class = $status ? 'status' : '';
	$class.= $subhead ? ' sub' : '';
	
	$html = $status ? '<heading data-status="'.$status.'"' : '<heading';
	$html.= $class ? ' class="'.$class.'">' : '>';
	$html.= '<span class="headtitle">'.$title.'</span>';
	if ( $button ) foreach( $button as $id => $icon ) $html.= i( $icon, $id );
	$html.= isset( $data[ 'nohelp' ] ) || $subhead ? '' : i( 'help help' );
	$html.= isset( $data[ 'back' ] ) ? i( 'arrow-left back' ) : '';
	$html.= '</heading>';
	$html.= $help ? '<span class="help-block hide">'.$help.'</span>' : '';
	$html.= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	
	echo $html;
}
function htmlSetting( $data ) {
	if ( isset( $data[ 'exist' ] ) && !$data[ 'exist' ] ) return;
	// col-l
	$label = $data[ 'label' ];
	$icon = $data[ 'icon' ] ?? '';
	$sublabel = $data[ 'sublabel' ] ?? '';
	$status = $data[ 'status' ] ?? '';
	$id = $data[ 'id' ] ?? '';
	$input = $data[ 'input' ] ?? '';
	$settingicon = $data[ 'settingicon' ] ?? 'gear';
	$setting = $data[ 'setting' ] ?? 'common';
	$disabled = $data[ 'disabled' ] ?? '';
	$help = $data[ 'help' ] ?? '';
	$html = '<div id="div'.$id.'"><div class="col-l';
	$html.= $sublabel ? '' : ' single';
	$html.= $status ? ' status" data-status="'.$status.'">' : '">';
	if ( $sublabel ) {
		$html.= '<a>'.$label.'<gr>'.$sublabel;
		$html.= '</gr></a>';
	} else {
		$html.= $label;
	}
	$html.= $icon ? i( $icon ) : '';
	$html.= '</div>';
	// col-r
	if ( !$icon ) {
		global $page;
		$icon = $page;
	}
	$html.= '<div class="col-r">';
	if ( !$input ) {
		$html.= $disabled ? '<a class="hide">'.$disabled.'</a>' : '';
		$html.= '<input type="checkbox" id="'.$id.'" class="switch '.$setting.'"';
		$html.= ' data-label="'.$label.'" data-icon="'.$icon.'"><div class="switchlabel" for="'.$id.'">';
		$html.= '</div>';
	} else {
		$html.= $input;
	}
	$html.= $setting && $settingicon ? i( $settingicon.' setting', $id ) : '';
	$html.= $help ? '<span class="help-block hide">'.$help.'</span>' : '';
	$html.= '</div>
			 <div style="clear:both"></div>
			 </div>';
	$html.= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echo $html;
}
function htmlSection( $head, $body, $id = '' ) {
	$html = '<div';
	$html.= $id ? ' id="div'.$id.'"' : '';
	$html.= ' class="section">';
	echo $html;
	htmlHead( $head );
	foreach( $body as $data ) htmlSetting( $data );
	echo '</div>';
}
function i( $icon, $id = '' ) {
	$htmlid = $id ? ' id="setting-'.$id.'"' : '';
	return '<i'.$htmlid.' class="fa fa-'.$icon.'"></i>';
}
$hd = function( $fn ) {
	return '&ensp;'.$fn;
};


include "settings/$page.php";
$htmlbar = '';
foreach ( [ 'Features', 'Player', 'Networks', 'System' ] as $name ) {
	$id = strtolower( $name );
	$active = $id === $pagehead ? ' class="active"' : '';
	$htmlbar.= '<div id="'.$id.'"'.$active.'>'.i( $id ).'<a> '.$name.'</a></div>';
}
?>
</div>
<div id="bar-bottom">
	<?=$htmlbar?>
</div>

<script src="/assets/js/plugin/jquery-3.6.1.min.js"></script>
<script src="/assets/js/plugin/pushstream-20211210.min.js"></script>
<script src="/assets/js/info.<?=$time?>.js"></script>
<script src="/assets/js/<?=$page?>.<?=$time?>.js"></script>
	<?php if ( $page === 'relays' ) { ?>
<link rel="stylesheet" href="/assets/css/relays.<?=$time?>.css">
<script src="/assets/js/relays.<?=$time?>.js"></script>
	<?php } else if ( $page === 'networks' ) { ?>
<script src="/assets/js/plugin/qrcode.min.js"></script>
	<?php }
		  if ( $page !== 'networks' ) { ?>
<link rel="stylesheet" href="/assets/css/selectric.<?=$time?>.css">
<script src="/assets/js/plugin/jquery.selectric-1.13.1.min.js"></script>
	<?php }
		  if ( in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] ) ) include 'keyboard.php';?>
<script src="/assets/js/settings.<?=$time?>.js"></script>
	
</body>
</html>
