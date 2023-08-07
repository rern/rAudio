<?php
$id_data = [
	  'configuration'       => [ 'name' => 'Configuration',       'setting' => 'custom' ]
	, 'enable_rate_adjust'  => [ 'name' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'enable_resampling'   => [ 'name' => 'Resampling',          'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'name' => 'Stop on Rate Change', 'setting' => 'custom' ]
];

$htmltabs = '<div id="divtabs">';
foreach( [ 'devices', 'filters', 'mixers', 'pipeline' ] as $id ) {
	$htmltabs.= '<div id="'.$id.'" class="tab">';
	if ( $id === 'devices' ) {
		$htmltabs.= '
<div id="divdevices" class="section">
'.htmlSectionStatus( 'sampling' ).'
</div>
<div id="divoptions" class="section">
'.htmlSetting( [ 'id' => 'enable_rate_adjust', 'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'enable_resampling', 'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ] ).'
</div>
';
	} else {
		if ( $id === 'pipeline' ) $htmltabs.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
		$htmltabs.= '<ul class="entries main"></ul>';
		if ( $id === 'mixers' || $id === 'pipeline' ) $htmltabs.= '<ul class="entries sub"></ul>';
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
	, 'button' => [
		  'log'     => 'file'
		, 'display' => 'gear hide'
	]
	, 'nohelp' => true
];
$body = [
	  '<pre id="codelog" class="hide"></pre>'
	, htmlSectionStatus( 'vu' )
	, htmlSectionStatus( 'volume', '<code id="gain"></code>', $htmlvolume )
	, htmlSectionStatus( 'state', '<div id="statuslabel"></div>' )
	, [
		  'id'    => 'configuration'
		, 'input' => '<select id="configuration"></select>'
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$head = [ 
	  'title'  => 'Devices'
	, 'nohelp' => true
];
$body = [ $htmltabs ];
htmlSection( $head, $body, 'settings' );
?>
<div id="menu" class="menu hide">
<a class="graph"><i class="i-graph"></i>Graph</a>
<a class="edit"><i class="i-edit-circle"></i>Edit</a>
<a class="delete"><i class="i-remove"></i>Delete</a>
</div>
