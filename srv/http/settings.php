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
function tab( $icon ) {
	return '<a class="helpmenu tab"><i class="i-'.$icon.'"></i> '.ucfirst( $icon ).'</a>';
}
// functions for use inside heredoc
$Fi         = 'i';
$FlabelIcon = 'labelIcon';
$Fmenu      = 'menu';
$Ftab       = 'tab';

echo '<div class="container '.$page.' hide">';

if ( $page !== 'addons' ) include 'settings/'.$page.'.php';

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
$htmlbar = '<div id="bar-bottom">';
$prefix  = '';
if ( $camilla ) {
	$tabs   = [ 'Filters', 'Mixers', 'Pipeline', 'Devices' ];
	$prefix = 'tab';
} else {
	$tabs   = [ 'Features', 'Player', 'Networks', 'System', 'Addons' ];
}
foreach ( $tabs as $tab ) {
	$id      = strtolower( $tab );
	$htmlbar.= '<div id="'.$prefix.$id.'">'.i( $id ).'<a> '.$tab.'</a></div>';
}
$htmlbar.= '</div>
<div id="debug"></div>';
echo $htmlbar;
if ( $localhost ) echo '<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';

// <script> -----------------------------------------------------
foreach( $jsp as $j ) echo '<script src="/assets/js/plugin/'.$jfiles[ $j ].'"></script>';
foreach( $js as $j )  echo '<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
if ( $camilla ) {
	echo '
<script>
var jfiles = '.json_encode( $jfiles ).';
</script>
';
}
echo '
</body>
</html>
';

if ( $addons ) exit;

/*
$head = [
	  'title'   => 'TITLE'                  // REQUIRED
	, 'subhead' => true/false               // with no help icon
	, 'status'  => 'COMMAND'                // include status icon and status box
	, 'button'  => [ 'ID' => 'ICON', ... ]  // icon button
	, 'back'    => true/false               // back button
	, 'nohelp'  => true/false
	, 'help'    => 'HELP'
];
$body = [
	 'HTML'                             // for status section
	, [
		  'label'       => 'LABEL'      // REQUIRED
		, 'sublabel'    => 'SUB LABEL'
		, 'id'          => 'ID'         // REQUIRED
		, 'status'      => 'COMMAND'    // include status icon and status box
		, 'input'       => 'HTML'       // alternative - if not switch
		, 'setting'     =>  ***         // default  = $( '#setting-'+ id ).click() before enable
		                                // false    = no setting
		                                // 'custom' = custom setting
		                                // 'none'   = no setting - custom enable
		, 'settingicon' => 'ICON'       // default = 'gear' 
		                                // false   = no icon
		, 'disabled'    => 'MESSAGE'    // set data-diabled - prompt on setting
		                                // 'js' = set by js condition
		, 'help'        => 'HELP'
		, 'exist'       => ***          // omit if not exist
	]
	, ...
];
htmlSection( $head, $body[, $id] );
*/
function htmlHead( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	$title   = $data[ 'title' ];
	$subhead = $data[ 'subhead' ] ?? false;
	$status  = $data[ 'status' ] ?? false;
	$button  = $data[ 'button' ] ?? false;
	$help    = $data[ 'help' ] ?? false;
	$class   = $status ? 'status' : '';
	$class  .= $subhead ? ' subhead' : '';
	
	$html    = '<heading '.( $status ? ' data-status="'.$status.'"' : '' );
	$html   .= $class ? ' class="'.$class.'">' : '>';
	$html   .= '<span class="headtitle">'.$title.'</span>';
	if ( $button ) foreach( $button as $btnid => $icon ) $html.= i( $icon.' '.$btnid );
	$html   .= isset( $data[ 'nohelp' ] ) || $subhead ? '' : i( 'help help' );
	$html   .= isset( $data[ 'back' ] ) ? i( 'back back' ) : '';
	$html   .= '</heading>';
	$html   .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html   .= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echo str_replace( '|', '<g>|</g>', $html );
}
function htmlSection( $head, $body, $id = '' ) {
	$html = '<div';
	$html.= $id ? ' id="div'.$id.'"' : '';
	$html.= ' class="section">';
	echo $html;
	if ( $head ) htmlHead( $head );
	foreach( $body as $data ) {
		if ( is_array( $data ) ) {
			htmlSetting( $data );
		} else {
			echo $data;
		}
	}
	echo '</div>';
}
function htmlSectionStatus( $id, $labels = '', $values = '', $help = '' ) {
	if ( ! $labels ) $labels = '&nbsp;';
	if ( $help ) $help = '<div class="helpblock hide">'.$help.'</div>';
	return '
<div id="div'.$id.'">
<div class="col-l text label gr">'.$labels.'</div>
<div class="col-r text value">'.$values.'</div>
<div style="clear:both"></div>
'.$help.'
</div>';
}
function htmlSetting( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	if ( isset( $data[ 'html' ] ) ) {
		echo str_replace( '|', '<g>|</g>', $data[ 'html' ] );
		return;
	}
	
	global $page, $id_data;
	$id          = $data[ 'id' ];
	$iddata      = $id_data[ $id ];
	$name        = $iddata[ 'name' ];
	$sublabel    = $iddata[ 'sub' ] ?? false;
	$status      = $iddata[ 'status' ] ?? false;
	$setting     = $iddata[ 'setting' ] ?? 'common';
	$label       = '<span class="name">'.$name.'</span>';
	$input       = $data[ 'input' ] ?? false;
	$settingicon = ! $setting || $setting === 'none' ? false : $data[ 'settingicon' ] ?? 'gear';
	$disabled    = $data[ 'disabled' ] ?? false;
	$help        = $data[ 'help' ] ?? false;
	$icon        = $data[ 'icon' ] ?? false;
	
	$html        = '<div id="div'.$id.'">';
	// col-l
	$html       .= '<div class="col-l';
	$html       .= $sublabel ? '' : ' single';
	$html       .= $status ? ' status" data-status="'.$id.'">' : '">';
	$html       .= $sublabel ? '<a>'.$label.'<gr>'.$sublabel.'</gr></a>' : $label;
	$html       .= $page === 'features' || $page === 'system' || $data[ 'icon' ] ? i( $id ) : ''; // icon
	$html       .= '</div>';
	// col-r
	$html       .= '<div class="col-r">';
	if ( ! $input ) {
		$html   .= $disabled ? '<span class="hide">'.$disabled.'</span>' : '';
		$html   .= '<input type="checkbox" id="'.$id.'" class="switch '.$setting.'"><div class="switchlabel"></div>';
	} else {
		$html   .= $input;
	}
	// setting
	$html       .= $settingicon ? i( $settingicon.' setting', $id ) : '';
	// help
	$html       .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html       .= '</div>
					</div>';
	// status
	$html       .= $status ? '<pre id="code'.$id.'" class="status hide"></pre>' : '';
	if ( $data[ 'returnhtml' ] ) return $html;
	
	echo $html;
}
