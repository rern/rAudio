<?php include 'common.php';?>

<div class="head">
	<i class="page-icon i-<?=$icon?>"></i><span class='title'><?=$title?></span><?=( i( 'close close' ).i( 'help helphead' ) )?>
</div>
<?php
function i( $icon, $id = '' ) {
	$htmlid = $id ? ' id="setting-'.$id.'"' : '';
	if ( $icon === 'localbrowser' && file_exists( '/usr/bin/firefox' ) ) $icon = 'firefox';
	return '<i'.$htmlid.' class="i-'.$icon.'"></i>';
}
function labelIcon( $name, $icon ) {
	return '<a class="helpmenu label">'.$name.'<i class="i-'.$icon.'"></i></a>';
}
function menu( $icon, $name, $iconsub = '' ) {
	$submenu = $iconsub ? '<i class="i-'.$iconsub.' sub"></i>' : '';
	return '<a class="helpmenu"><i class="i-'.$icon.'"></i> '.$name.$submenu.'</a>';
}
function tab( $icon, $name ) {
	return '<a class="helpmenu tab"><i class="i-'.$icon.'"></i> '.$name.'</a>';
}
// functions for use inside heredoc
$Fi         = 'i';
$FlabelIcon = 'labelIcon';
$Fmenu      = 'menu';
$Ftab       = 'tab';

echo '<div class="container hide">';

include 'settings/'.$page.'.php';

echo '</div>';

if ( $addonsprogress || $guide ) {
	echo '
</body>
</html>
';
	exit;
}
// .................................................................................

// bottom bar
if ( ! $addons ) {
	$htmlbar = '<div id="bar-bottom">';
	foreach ( [ 'Features', 'Player', 'Networks', 'System' ] as $name ) {
		$id      = strtolower( $name );
		$active  = $id === $pagetitle ? ' class="active"' : '';
		$htmlbar.= '<div id="'.$id.'"'.$active.'>'.i( $id ).'<a> '.$name.'</a></div>';
	}
	$htmlbar.= '</div>';
	echo $htmlbar;
}
if ( $localhost ) echo '<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';

// <script> -----------------------------------------------------
foreach( $jsp as $j ) echo '<script src="/assets/js/plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )  echo '<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
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
		, 'sublabel'    => 'SUB LABEL'
		, 'id'          => 'INPUT ID'   // REQUIRED
		, 'status'      => 'COMMAND'    // include status icon and status box
		, 'input'       => 'HTML'       // alternative - if not switch
		, 'setting'     => (none)       // default    = '.common'              > $( '.switch' ).click( ... > $( '#setting-'+ id ).click() before enable
		                                // false      = no icon, no setting    > $( '.switch' ).click( ... > [ id, true/false ]
		                                // 'nobanner' = no icon, no setting, no banner
		                                // 'custom'   = custom script / prompt > $( '#id' ).click( ...     > [ command ] (no setting -'settingicon' => false)
		, 'settingicon' => (none)       // default = 'gear' 
		                                // false   = no icon
										// 'icon'  = 'i-icon'
		, 'disabled'    => 'MESSAGE'    // set data-diabled - prompt on click
										// 'js' = set by js condition
		, 'help'        => <<< EOF
HELP
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
	echo str_replace( '|', '<g>|</g>', $html );
}
function htmlSetting( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	if ( isset( $data[ 'html' ] ) ) {
		echo str_replace( '|', '<g>|</g>', $data[ 'html' ] );
		return;
	}
	
	global $page;
	// col-l
	$label       = '<span>'.$data[ 'label' ].'</span>';
	$sublabel    = $data[ 'sublabel' ] ?? '';
	$status      = $data[ 'status' ] ?? false;
	$id          = $data[ 'id' ] ?? '';
	$input       = $data[ 'input' ] ?? '';
	$settingicon = $data[ 'settingicon' ] ?? 'gear';
	$setting     = $data[ 'setting' ] ?? 'common';
	$disabled    = $data[ 'disabled' ] ?? '';
	$help        = $data[ 'help' ] ?? '';
	$html        = '<div id="div'.$id.'"><div class="col-l';
	$html       .= $sublabel ? '' : ' single';
	$html       .= $status ? ' status" data-status="'.$id.'">' : '">';
	$html       .= $sublabel ? '<a>'.$label.'<gr>'.$sublabel.'</gr></a>' : $label;
	$html       .= $page === 'features' || $page === 'system' ? i( $id ) : ''; // icon
	$html       .= '</div>';
	// col-r
	$html       .= '<div class="col-r">';
	if ( ! $input ) {
		$html   .= $disabled ? '<span class="hide">'.$disabled.'</span>' : '';
		$html   .= '<input type="checkbox" id="'.$id.'" class="switch '.$setting.'"><div class="switchlabel" for="'.$id.'">';
		$html   .= '</div>';
	} else {
		$html   .= $input;
	}
	$html       .= $setting && $settingicon ? i( $settingicon.' setting', $id ) : '';
	$html       .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html       .= '</div>
			 </div>';
	$html       .= $status ? '<pre id="code'.$id.'" class="status hide"></pre>' : '';
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
