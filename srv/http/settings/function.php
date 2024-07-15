<?php
// <btn>
$btn     = [ 'add',     'bluetooth', 'btsender', 'code',    'gear',     'lan',    'lastfm',   'microsd', 'networks'
			,'pause',   'play',      'power',    'refresh', 'search',   'stop',   'usbdrive', 'volume',  'wifi' ];
$btnc    = [ 'filters', 'flowchart', 'graph',    'input',   'inverted', 'linear', 'mixers',   'output',  'set0' ];
if ( $camilla ) $btn = array_merge( $btn, $btnc );
foreach( $btn as $b ) ${'b_'.$b} = i( $b.' btn' );
// label
if ( $features ) {
	$labels = [
		  [ 'Equalizer',     'equalizer' ]
		, [ 'DSP',           'camilladsp' ]
		, [ 'Server rAudio', 'rserver' ]
		, [ 'Shared Data',   'networks' ]
		, [ 'Wi-Fi',         'wifi' ]
	];
	$menus = [
		  [ 'features', 'Features', 'camilladsp' ]
		, [ 'features', 'Features', 'equalizer' ]
		, [ 'playlist', 'Playlist', 'multiraudio' ]
		, [ 'player',   'Player',   'lock' ]
		, [ 'power',    'Power',    'screenoff' ]
	];
} else if ( $player ) {
	$labels = [
		  [ 'DAB Radio',   'dabradio' ]
		, [ 'Device' ]
		, [ 'Shared Data', 'networks' ]
		, [ 'SoX Resampler' ]
		, [ 'Volume Control' ]
	];
	$menus = '';
} else if ( $networks ) {
	$labels = [
		  [ 'Access Point', 'ap' ]
		, [ 'Bluetooth', 'bluetooth' ]
	];
	$menus = '';
} else if ( $system ) {
	$labels = [
		  [ 'Device' ]
		, [ 'Output' ]
		, [ 'Server rAudio', 'rserver' ]
		, [ 'Shared Data',   'networks' ]
		, [ 'Storage' ]
	];
	$menus = [
		  [ 'library', 'Library', 'refresh-library' ]
		, [ 'raudio',  'System',  'relays' ]
	];
}
foreach( $labels as $l ) {
	$icon = isset( $l[ 1 ] ) ? i( $l[ 1 ] ) : ' &emsp;';
	$l    = $l[ 0 ];
	$name = strtolower( preg_replace( '/ |-/', '', $l ) );
	${'l_'.$name} = '<a class="helpmenu label">'.$l.$icon.'</a>';
}
foreach( $menus as $m ) {
	$name = str_replace( '-', '', $m[ 2 ] );
	${'m_'.$name} = '<a class="helpmenu">'.i( $m[ 0 ] ).' '.$m[ 1 ].i( $m[ 2 ].' sub' ).'</a>';
}
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
	, 'nohelp'  => true/false
	, 'help'    => 'HELP'
];
$body = [
	 'HTML'                          // for non-switch section
	, [
		  'id'       => 'ID'         // REQUIRED
		, 'input'    => 'HTML/ID'    // alternative - if not switch (ID - select)
		, 'setting'  => TYPE         // default  = $( '#setting-'+ id ).click() before enable
		                             // false    = no setting
		                             // 'custom' = custom setting
		                             // 'none'   = no setting - custom enable
		, 'disabled' => 'MESSAGE'    // set data-diabled - prompt on click setting
		                             // 'js'     = set by js condition
		, 'help'     => 'HELP'
		, 'exist'    => 'COMMAND'    // hide if COMMAND = false
	]
	, ...
];
htmlSection( $head, $body[, $id] );
*/
function htmlHead( $data ) {
	if ( isset( $data[ 'exist' ] ) && ! $data[ 'exist' ] ) return;
	
	$title   = $data[ 'title' ];
	$id      = $data[ 'id' ] ?? false;
	$status  = $data[ 'status' ] ?? false;
	$button  = $data[ 'button' ] ?? false;
	$help    = $data[ 'help' ] ?? false;
	$class   = $status ? 'status' : '';
	
	$html    = '<heading '.( $id ? ' id="'.$id.'"' : '' ).( $status ? ' data-status="'.$status.'"' : '' );
	$html   .= $class ? ' class="'.$class.'">' : '>';
	$html   .= '<span class="headtitle">'.$title.'</span>';
	if ( $button ) {
		if ( is_Array( $button ) ) {
			foreach( $button as $icon ) $html.= i( $icon );
		} else {
			$html.= i( $button );
		}
	}
	$html   .= isset( $data[ 'nohelp' ] ) ? '' : i( 'help help' );
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
	
	global $features, $system;
	$id          = $data[ 'id' ];
	$iddata      = $id_data[ $id ];
	$label       = $iddata[ 'label' ];
	$sublabel    = $iddata[ 'sub' ] ?? false;
	$status      = $iddata[ 'status' ] ?? false;
	$setting     = $iddata[ 'setting' ] ?? 'common';
	$label       = '<span class="label">'.$label.'</span>';
	$input       = $data[ 'input' ] ?? false;
	$settingicon = ! $setting || $setting === 'none' ? false : 'gear';
	$help        = $data[ 'help' ] ?? false;
	$icon        = $data[ 'icon' ] ?? false;
	if ( $features || $system ) {
		$icon = $id;
	} else {
		$icon = $data[ 'icon' ] ?? false;
	}
	
	$html        = '<div id="div'.$id.'" class="row">';
	// col-l
	$html       .= '<div class="col-l';
	$html       .= $sublabel ? '' : ' single';
	$html       .= $status ? ' status" data-status="'.$id.'">' : '">';
	$html       .= $sublabel ? '<a>'.$label.'<gr>'.$sublabel.'</gr></a>' : $label;
	$html       .= $icon ? i( $icon ) : ''; // icon
	$html       .= '</div>';
	// col-r
	$html       .= '<div class="col-r">';
	if ( ! $input ) {
		$disabled = isset( $data[ 'disabled' ] ) ? '<span class="hide">'.$data[ 'disabled' ].'</span>' : '';
		$html    .= '<label>'.$disabled.'<input type="checkbox" id="'.$id.'" class="switch '.$setting.'"><div class="switchlabel"></div></label>';
	} else {
		if ( ltrim( $input )[ 0 ] == '<' ) {
			$html.= $input;
		} else { // select
			$html.= '<select id="'.$input.'"></select>';
		}
	}
	// setting
	$html       .= $settingicon ? i( $settingicon.' setting', 'setting-'.$id ) : '';
	// help
	$html       .= $help ? '<span class="helpblock hide">'.$help.'</span>' : '';
	$html       .= '</div>
					</div>';
	// status
	$html       .= $status ? '<pre id="code'.$id.'" class="status hide"></pre>' : '';
	if ( isset( $data[ 'returnhtml' ] ) ) return $html;
	
	echo $html;
}
