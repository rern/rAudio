<?php
if ( file_exists( '/srv/http/data/system/login' ) ) {
	session_start();
	if ( ! isset( $_SESSION[ 'login' ] ) ) header( 'Location: /' );
}
$localhost = in_array( $_SERVER[ 'REMOTE_ADDR' ], ['127.0.0.1', '::1'] );
$page      = $_GET[ 'p' ];
$icon      = $page;
if ( $page === 'guide' ) {
	$icon     = 'help';
	$pagehead = 'user guide';
} else if ( $page === 'relays' ) {
	$pagehead = 'system';
} else {
	$pagehead = $page;
}
$title    = strtoupper( $pagehead );
$addons   = $page === 'addons';
$progress = $page === 'addons-progress';
$guide    = $page === 'guide';
$networks = $page === 'networks';
$relays   = $page === 'relays';

//   css .............................................................................
$css = [ 'colors', 'common', 'settings' ];
if ( $addons || $progress ) $css[] = 'addons';
if ( ! $networks )          $css[] = 'selectric';
if ( $relays )              $css[] = 'relays';
$style = '';
foreach( $css as $c ) $style.= '
<link rel="stylesheet" href="/assets/css/'.$c.'.css'.$hash.'">';

include 'common.php';      // <!DOCTYPE html> ---------------------------------------------

echo $style;

include 'common-body.php'; // </head><body> -----------------------------------------------
?>
<!-- head ........................................................................... -->
<div class="head">
	<i class="page-icon fa fa-<?=$icon?>"></i><span class='title'><?=$title?></span><?=( i( 'times close' ).i( 'help helphead' ) )?>
</div>
<?php
// container ...................................................................... 
echo '<div class="container hide">';

include "settings/$page.php";

echo '</div>';
// .................................................................................
if ( $progress || $guide ) {
	echo '
</body>
</html>
';
	exit;
}

// bottom bar ......................................................................
if ( ! $addons ) {
	$htmlbar = '<div id="bar-bottom">';
	foreach ( [ 'Features', 'Player', 'Networks', 'System' ] as $name ) {
		$id      = strtolower( $name );
		$active  = $id === $pagehead ? ' class="active"' : '';
		$htmlbar.= '<div id="'.$id.'"'.$active.'>'.i( $id ).'<a> '.$name.'</a></div>';
	}
	$htmlbar.= '</div>';
	echo $htmlbar;
}
//   js ..............................................................................
                   $jsp   = [ 'jquery' ];
				   $js    = [];
if ( ! $addons )   $jsp[] = 'pushstream';
                   $js[]  = 'common';
if ( ! $addons )   $js[]  = 'settings';
                   $js[]  = $page;
if ( ! $networks ) $jsp[] = 'jquery.selectric';
if ( $networks )   $jsp[] = 'qrcode';
if ( $relays )     $js[]  = 'relays';
$script = '';
foreach( $jsp as $j ) $script.= '
<script src="/assets/js/plugin/'.$j.'-'.$jlist[ $j ].'"></script>';
// with cache busting
foreach( $js as $j ) $script.= '
<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
echo $script;
echo '
</body>
</html>
';

if ( $addons ) exit;

/*
$head = [
	  'title'   => 'TITLE'                  // REQUIRED
	, 'subhead' => true                     // with no help icon
	, 'status'  => 'COMMAND'                // include status icon and status box
	, 'button'  => [ 'ID' => 'ICON', ... ]  // icon button
	, 'back'    => true                     // back button
	, 'nohelp'  => true
	, 'help'    => <<< EOF
HELP - PHP heredoc
EOF
];
$body = [
	[
		  'label'       => 'LABEL'      // REQUIRED
		, 'id'          => 'INPUT ID'   // REQUIRED
		, 'sublabel'    => 'SUB LABEL'
		, 'icon'        => 'ICON'
		, 'status'      => 'COMMAND'    // include status icon and status box
		, 'input'       => 'HTML'       // alternative - if not switch
		, 'setting'     => (none)       // default    = '.common'              > $( '.switch' ).click( ... > $( '#setting-'+ id ).click() before enable
		                                // false      = no icon, no setting    > $( '.switch' ).click( ... > [ id, true/false ]
		                                // 'nobanner' = no icon, no setting, no banner
		                                // 'custom'   = custom script / prompt > $( '#id' ).click( ...     > [ command ] (no setting -'settingicon' => false)
		, 'settingicon' => (none)       // default = 'gear' 
		                                // false   = no icon
										// 'icon'  = 'fa-icon'
		, 'disable'     => 'MESSAGE'    // set data-diabled - prompt on click
		, 'help'        => <<< EOF
HELP - PHP heredoc
EOF
		, 'exist'       => EXIST        // return blank if not EXIST
	]
	, [
		...
	]
];
htmlSection( $head, $body[, $id] );
*/
function htmlHead( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	$title   = $data[ 'title' ];
	$subhead = $data[ 'subhead' ] ?? '';
	$status  = $data[ 'status' ] ?? '';
	$button  = $data[ 'button' ] ?? '';
	$help    = $data[ 'help' ] ?? '';
	$class   = $status ? 'status' : '';
	$class  .= $subhead ? ' subhead' : '';
	
	$html    = $status ? '<heading data-status="'.$status.'"' : '<heading';
	$html   .= $class ? ' class="'.$class.'">' : '>';
	$html   .= '<span class="headtitle">'.$title.'</span>';
	if ( $button ) foreach( $button as $id => $icon ) $html.= i( $icon.' '.$id );
	$html   .= isset( $data[ 'nohelp' ] ) || $subhead ? '' : i( 'help help' );
	$html   .= isset( $data[ 'back' ] ) ? i( 'arrow-left back' ) : '';
	$html   .= '</heading>';
	$html   .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html   .= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echoSetIcon( $html );
}
function htmlSetting( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	// col-l
	$label       = $data[ 'label' ];
	$icon        = $data[ 'icon' ] ?? '';
	$sublabel    = $data[ 'sublabel' ] ?? '';
	$status      = $data[ 'status' ] ?? '';
	$id          = $data[ 'id' ] ?? '';
	$input       = $data[ 'input' ] ?? '';
	$settingicon = $data[ 'settingicon' ] ?? 'gear';
	$setting     = $data[ 'setting' ] ?? 'common';
	$disabled    = $data[ 'disabled' ] ?? '';
	$help        = $data[ 'help' ] ?? '';
	$html        = '<div id="div'.$id.'"><div class="col-l';
	$html       .= $sublabel ? '' : ' single';
	$html       .= $status ? ' status" data-status="'.$status.'">' : '">';
	if ( $sublabel ) {
		$html   .= '<a>'.$label.'<gr>'.$sublabel;
		$html   .= '</gr></a>';
	} else {
		$html   .= $label;
	}
	$html       .= $icon ? i( $icon ) : '';
	$html       .= '</div>';
	// col-r
	if ( ! $icon ) {
		global $page;
		$icon    = $page;
	}
	$html       .= '<div class="col-r">';
	if ( ! $input ) {
		$html   .= $disabled ? '<a class="hide">'.$disabled.'</a>' : '';
		$html   .= '<input type="checkbox" id="'.$id.'" class="switch '.$setting.'"';
		$html   .= ' data-label="'.$label.'" data-icon="'.$icon.'"><div class="switchlabel" for="'.$id.'">';
		$html   .= '</div>';
	} else {
		$html   .= $input;
	}
	$html       .= $setting && $settingicon ? i( $settingicon.' setting', $id ) : '';
	$html       .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html       .= '</div>
			 </div>';
	$html       .= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echoSetIcon( $html );
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
function echoSetIcon( $html ) { // only within: htmlHead(), htmlSetting()
	echo str_replace(
		  [ '|',        'I^',               '^I',     'A^',                   '^A'   ]
		, [ '<g>|</g>', '<i class="fa fa-', '"></i>', '<a class="menu-sub">', '</a>' ]
		, $html
	);
}
function i( $icon, $id = '' ) {
	$htmlid = $id ? ' id="setting-'.$id.'"' : '';
	return '<i'.$htmlid.' class="fa fa-'.$icon.'"></i>';
}
