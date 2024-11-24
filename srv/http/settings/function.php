<?php
/*
$id_data = [ 'ID' => [               // REQUIRED
	  'label'   => 'LABEL'
	, 'sub'     => 'SUBLABEL'
	, 'setting' => 'TYPE'
	, 'status'  => 'SCRIPTCOMMAND'
];
$head = [
	  'title'   => 'TITLE'           // REQUIRED
	, 'subhead' => true/false        // with no help icon
	, 'status'  => 'COMMAND'         // include status icon and status box
	, 'button'  => [ 'ICON', ... ]   // icon button
	, 'back'    => true/false        // back button
	, 'help'    => 'HELP'
];
$body = [
	 'HTML'                          // for non-switch section
	, [
		  'id'       => 'ID'         // REQUIRED
		, 'input'    => 'HTML/ID'    // alternative - if not switch (ID - select)
		, 'disabled' => 'MESSAGE'    // set data-diabled - prompt on click setting
		                             // 'js'     = set by js condition
		, 'help'     => 'HELP'
		, 'exist'    => 'COMMAND'    // hide if COMMAND = false
	]
	, ...
];
htmlSection( $head, $body[, $id] );
*/
function commonVariables( $list ) {
	global $B, $L, $M, $T;
	extract( $list );
	if ( isset( $buttons ) ) {
		$B = ( object )[];
		foreach( $buttons as $b ) $B->$b = i( $b.' btn' );
	}
	if ( isset( $labels ) ) {
		$L = ( object )[];
		foreach( $labels as $l ) {
			$icon     = isset( $l[ 1 ] ) ? i( $l[ 1 ] ) : ' &emsp;';
			$l        = $l[ 0 ];
			$name     = strtolower( preg_replace( '/ |-/', '', $l ) );
			$L->$name = '<a class="helpmenu label">'.$l.$icon.'</a>';
		}
	}
	if ( isset( $menus ) ) {
		$M = ( object )[];
		foreach( $menus as $m ) {
			$name     = $m[ 2 ];
			$M->$name = '<a class="helpmenu">'.i( $m[ 0 ] ).' '.$m[ 1 ].i( $name.' sub' ).'</a>';
		}
	}
	if ( isset( $tabs ) ) {
		$T = ( object )[];
		foreach( $tabs as $t ) $T->$t = '<a class="helpmenu tab">'.i( $t ).' '.ucfirst( $t ).'</a>';
	}
}

function htmlHead( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	$id      = isset( $data[ 'id' ] ) ? ' id="'.$data[ 'id' ].'"' : '';
	$status  = $data[ 'status' ] ?? '';
	$class   = $status ? ' class="status"' : '';
	$dstatus = $status ? ' data-status="'.$status.'"' : '';
	$iback   = isset( $data[ 'back' ] ) ? i( 'back back' ) : '';
	$ihelp   = $iback ? '' : i( 'help help' );
	
	$html    = '<heading '.$id.$class.'><span class="headtitle"'.$dstatus.'>'.$data[ 'title' ].'</span>';
	if ( isset( $data[ 'button' ] ) ) {
		$button = $data[ 'button' ];
		if ( is_Array( $button ) ) {
			foreach( $button as $icon ) $html.= i( $icon );
		} else {
			$html.= i( $button );
		}
	}
	$html   .= $ihelp.$iback.'</heading>';
	$html   .= isset( $data[ 'help' ] ) ? '<span class="helpblock hide">'.$data[ 'help' ].'</span>' : '';
	$html   .= $status ? '<pre id="code'.$status.'" class="status hide"></pre>' : '';
	echo str_replace( '|', '<g>|</g>', $html );
}
function htmlMenu( $menu ) {
	$menuhtml = '';
	foreach( $menu as $class => $icon ) $menuhtml.= '<a class="'.$class.'" tabindex="0">'.i( $icon ).ucfirst( $class ).'</a>';
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
	global $id_data;
	$id          = $data[ 'id' ];
	$iddata      = $id_data[ $id ];
	if ( isset( $iddata[ 'exist' ] ) && ! file_exists( '/usr/bin/'.$iddata[ 'exist' ] ) ) return;
	
	if ( isset( $data[ 'html' ] ) ) {
		echo str_replace( '|', '<g>|</g>', $data[ 'html' ] );
		return;
	}
	
	global $iconlabel;
	$id          = $data[ 'id' ];
	$iddata      = $id_data[ $id ];
	$label       = $iddata[ 'label' ];
	$sublabel    = $iddata[ 'sub' ] ?? false;
	$status      = $iddata[ 'status' ] ?? false;
	$label       = '<span class="label">'.$label.'</span>';
	$input       = $data[ 'input' ] ?? false;
	$help        = $data[ 'help' ] ?? false;
	$icon        = $iconlabel ? $id : '';
	$dstatus     = $status ? ' status" data-status="'.$id : '';
	
	$html        = '<div id="div'.$id.'" class="row">';
	// col-l
	$html       .= '<div class="col-l'.( $sublabel ? '' : ' single' ).$dstatus.'">';
	$html       .= $sublabel ? '<a>'.$label.'<gr>'.$sublabel.'</gr></a>' : $label;
	$html       .= $icon ? i( $icon ) : ''; // icon
	$html       .= '</div>';
	// col-r
	$html       .= '<div class="col-r">';
	if ( ! $input ) {
		$disabled = isset( $data[ 'disabled' ] ) ? '<span class="hide">'.$data[ 'disabled' ].'</span>' : '';
		$html    .= '<label>'.$disabled.'<input type="checkbox" id="'.$id.'" class="switch">';
		$html    .= '<div class="switchlabel"></div></label>';
	} else {
		if ( ltrim( $input )[ 0 ] == '<' ) {
			$html.= $input;
		} else { // select
			$html.= '<select id="'.$input.'"></select>';
		}
	}
	$html       .= i( 'gear setting', 'setting-'.$id );
	// help
	$html       .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html       .= '</div>
					</div>';
	// status
	$html       .= $status ? '<pre id="code'.$id.'" class="status hide"></pre>' : '';
	if ( isset( $data[ 'returnhtml' ] ) ) return $html;
	
	echo $html;
}
