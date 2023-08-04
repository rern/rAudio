<?php
$id_data = [
	'configuration' => [ 'name' => 'Configuration', 'setting' => 'custom' ]
];
$options = [
	  'Rate Adjust'         => 'enable_rate_adjust'
	, 'Resampling'          => 'enable_resampling'
	, 'Stop on Rate Change' => 'stop_on_rate_change'
];
$htmloptions = '';
foreach( $options as $label => $id ) {
	$input       = '<input id="'.$id.'" type="checkbox" class="switch custom">'
				  .'<div class="switchlabel"></div>';
	if ( $id !== 'stop_on_rate_change' ) $input.= '<i id="setting-'.$id.'" class="i-gear setting"></i>';
	$htmloptions.= '<div id="div'.$id.'">'
				  .'<div class="col-l single name">'.$label.'</div><div class="col-r">'.$input
				  .'</div><div style="clear:both"></div>'
				  .'</div>';
}
$htmldevices = '';
foreach( [ 'Sampling', 'Options', 'Capture', 'Playback' ] as $title ) {
	$id      = lcFirst( str_replace( ' ', '', $title ) );
	$html    = '<div class="entries main"></div>';
	$setting = $title === 'Capture' || $title === 'Playback';
	$head    = '';
	if ( $title === 'Options' ) {
		$html .= $htmloptions;
	} else if ( $setting ) {
		$head  = '<heading class="subhead"><span class="headtitle">'.$title.i( 'gear', $id ).'</span></heading>';
	}
	$htmldevices.= '
<div id="div'.$id.'" class="section">
'.$head.'
'.$html.'
</div>
';
}
$htmltabs = '<div id="divtabs">';
foreach( [ 'devices', 'filters', 'mixers', 'pipeline' ] as $id ) {
	$htmltabs.= '<div id="'.$id.'" class="tab">';
	if ( $id === 'devices' ) {
		$htmltabs.= $htmldevices;
	} else {
		if ( $id === 'pipeline' ) $htmltabs.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
		$htmltabs.= '<ul class="entries main"></ul><ul class="entries sub"></ul>';
	}
	$htmltabs.= '</div>';
}

$htmltabs.= '</div>';
$htmlvolume = '
<input id="volume" type="range" min="-51" max="0" step="0.1">
<i id="dn" class="i-minus gr setting"></i>
<i id="mute" class="i-volume setting"></i>
<i id="up" class="i-plus gr setting"></i>
';

//////////////////////////////////
$head = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'log' => 'file' ]
	, 'nohelp' => true
];
$body = [
	  '<pre id="codelog" class="hide"></pre>'
	, htmlSectionStatus( 'vu' )
	, htmlSectionStatus( 'volume', '<code id="gain">0</code>', $htmlvolume )
	, [
		  'id'    => 'configuration'
		, 'input' => '<select id="configuration"></select>'
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$body = [ htmlSectionStatus( 'status', '<div id="statuslabel"></div>' ) ];
htmlSection( '', $body, 'status' );
//////////////////////////////////
$head = [ 
	  'title'  => 'Devices'
	, 'nohelp' => true
];
$body = [ $htmltabs ];
htmlSection( $head, $body, 'settings' );
