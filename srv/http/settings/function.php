<?php
/*
$head = [
	  'title'   => 'TITLE'           // REQUIRED
	, 'subhead' => true              // with no help icon
	, 'status'  => true              // include status icon and status box
	, 'button'  => [ 'ICON', ... ]   // icon button
	, 'back'    => true              // back button
	, 'help'    => 'HELP'
];
$body = [
	 'HTML'                          // for non-switch section
	, [
		  'id'       => 'ID'         // REQUIRED
		, 'label'    => 'LABEL'
		, 'sub'      => 'SUB'
		, 'status'   => true         // include status icon and status box
		, 'input'    => 'HTML/ID'    // alternative - if not switch (ID - select)
		, 'disabled' => 'MESSAGE'    // set data-diabled - prompt on click setting icon
		                             // 'js' = set by js condition
		, 'help'     => 'HELP'
		, 'exist'    => 'FILE'       // hide if file not exist
	]
	, ...
];
htmlSection( $head, $body[, $id] );
*/
function commonVariables( $list ) {
	foreach( [ 'B', 'L', 'M', 'T' ] as $k ) {
		global $$k;
		$$k = ( object ) [];
	}
	$list = ( object ) $list;
	foreach( $list->buttons as $b ) $B->$b = i( $b.' btn' );
	foreach( $list->labels as $label => $icon ) {
		$icon     = $icon ? i( $icon ) : ' &emsp;';
		$name     = strtolower( preg_replace( '/ |-/', '', $label ) );
		$L->$name = '<a class="helpmenu label">'.$label.$icon.'</a>';
	}
	foreach( $list->menus as $name => $icon ) {
		$M->$name = '<a class="helpmenu">'.i( $icon ).' '.ucfirst( $icon ).i( $name.' sub' ).'</a>';
	}
	foreach( $list->tabs as $t ) $T->$t = '<a class="helpmenu tab">'.i( $t ).' '.ucfirst( $t ).'</a>';
}

function htmlHead( $data ) {
	$data    = ( object ) $data;
	if ( isset( $data->exist ) && ! $data->exist ) return;
	
	$id      = isset( $data->id ) ? ' id="'.$data->id.'"' : '';
	$status  = $data->status ?? '';
	$class   = $status ? ' class="status"' : '';
	$dstatus = $status ? ' data-status="'.$status.'"' : '';
	$iback   = isset( $data->back ) ? i( 'back back' ) : '';
	$ihelp   = $iback ? '' : i( 'help help' );
	
	$html    = '<heading '.$id.$class.'><span class="headtitle"'.$dstatus.'>'.$data->title.'</span>';
	if ( isset( $data->button ) ) {
		$button = $data->button;
		if ( is_Array( $button ) ) {
			foreach( $button as $icon ) $html.= i( $icon );
		} else {
			$html.= i( $button );
		}
	}
	$html   .= $ihelp.$iback.'</heading>';
	$html   .= isset( $data->help ) ? '<span class="helpblock hide">'.$data->help.'</span>' : '';
	$html   .= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echo str_replace( '|', '<g>|</g>', $html );
}
function htmlMenu( $menu ) {
	$menuhtml = '';
	foreach( $menu as $cmd => $icon ) $menuhtml.= '<a class="'.$cmd.'" data-cmd="'.$cmd.'"tabindex="0">'.i( $icon ).ucfirst( $cmd ).'</a>';
	echo '<div id="menu" class="menu hide">'.$menuhtml.'</div>';
}
function htmlSection( $head, $body, $id = '' ) {
	echo '<div'.( $id ? ' id="div'.$id.'"' : '' ).' class="section">';
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
	if ( $help ) $help = '<div style="clear: both"></div><div class="helpblock hide"><br>'.$help.'</div>';
	return '
<div id="div'.$id.'" class="row">
<div class="col-l text label gr">'.$labels.'</div>
<div class="col-r text value">'.$values.'</div>
'.$help.'
</div>';
}
function htmlSetting( $data ) {
	$data    = ( object ) $data;
	$id      = $data->id;
	$sub     = $data->sub ?? false;
	$exist   = $data->exist ?? '';
	if ( $exist ) {
		if ( is_bool( $exist ) ) $exist = '/usr/bin/'.$sub;
		if ( ! file_exists( $exist ) ) return;
	}
	
	if ( isset( $data->html ) ) {
		echo str_replace( '|', '<g>|</g>', $data->html );
		return;
	}
	
	global $iconlabel;
	$label   = $data->label;
	$status  = $data->status ?? false;
	$label   = '<span class="label">'.$label.'</span>';
	$input   = $data->input ?? false;
	$help    = $data->help ?? false;
	$icon    = $iconlabel ? $id : '';
	$dstatus = $status ? ' status" data-status="'.$id : '';
	
	$html    = '<div id="div'.$id.'" class="row">';
	// col-l
	$html   .= '<div class="col-l'.( $sub ? '' : ' single' ).$dstatus.'">';
	$html   .= $sub ? '<a>'.$label.'<gr>'.$sub.'</gr></a>' : $label;
	$html   .= $icon ? i( $icon ) : ''; // icon
	$html   .= '</div>';
	// col-r
	$html   .= '<div class="col-r">';
	if ( ! $input ) {
		$disabled = isset( $data->disabled ) ? '<span class="hide">'.$data->disabled.'</span>' : '';
		$html    .= '<label>'.$disabled.'<input type="checkbox" id="'.$id.'" class="switch">';
		$html    .= '<div class="switchlabel"></div></label>';
	} else {
		if ( ltrim( $input )[ 0 ] == '<' ) {
			$html.= $input;
		} else { // select
			$html.= '<select id="'.$input.'"></select>';
		}
	}
	$html   .= i( 'gear setting', 'setting-'.$id );
	// help
	$html   .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html   .= '</div>
					</div>';
	// status
	$html   .= $status ? '<pre id="code'.$id.'" class="status hide"></pre>' : '';
	if ( isset( $data->returnhtml ) ) return $html;
	
	echo $html;
}
