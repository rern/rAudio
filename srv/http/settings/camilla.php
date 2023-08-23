<?php
$id_data = [
	  'configuration'       => [ 'name' => 'Configuration',       'setting' => 'custom' ]
	, 'enable_rate_adjust'  => [ 'name' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'name' => 'Stop on Rate Change', 'setting' => 'custom' ]
	, 'enable_resampling'   => [ 'name' => 'Resampling',          'setting' => 'custom' ]
];
$sliderrange     = i( 'gear btn' ).' Gain slider range';
$addentry        = i( 'plus btn' ).' Add entry';
$back            = i( 'back btn' ).' Back to main';
$contextfilters  = i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' );
$contextmixers   = str_replace( 'filters' , 'mixers', $contextfilters );
$contextpipeline = str_replace( 'filters' , 'pipeline', $contextfilters );
$gaincontrols    = i( 'minus btn' ).i( 'set0 btn' ).i( 'plus btn' ).' Gain: -0.1dB · 0 · +0.1dB';
$help = [
	  'filters'   => <<< EOF
{$Fi( 'folder-filter btn' )} FIR coefficient
{$sliderrange}
{$addentry}
{$back}
{$contextfilters}
{$gaincontrols}
EOF
	, 'mixers'   => <<< EOF
{$sliderrange}
{$addentry}
{$back}
{$contextmixers}
{$gaincontrols}
{$Fi( 'mute btn' )}{$Fi( 'inverted btn' )} Mute, Invert
EOF
	, 'pipeline' => <<< EOF
{$Fi( 'flowchart btn' )} Step flowchart
{$Fi( 'plus btn' )} Add entry
{$back}
{$contextmixers}
EOF
	, 'devices'  => <<< EOF
{$Fi( 'gear btn' )} Capture sampling
{$Fi( 'input btn' )}{$Fi( 'output btn' )} Device settings
EOF
];
$htmltabs = '<div id="divtabs">';
foreach( [ 'filters', 'mixers', 'pipeline', 'devices' ] as $id ) {
	$htmltabs.= '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$help[ $id ].'</div>';
	if ( $id === 'pipeline' ) $htmltabs.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$htmltabs.= '<ul class="entries main"></ul>';
	if ( $id !== 'devices' ) {
		$htmltabs.= '<ul class="entries sub"></ul>';
	} else {
		$htmltabs.= '
<div id="divdevices" class="section">
'.htmlSectionStatus( 'sampling' ).'
</div>
<div id="divoptions" class="section">
'.htmlSetting( [ 'id' => 'enable_rate_adjust',  'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'enable_resampling',   'returnhtml' => true ] ).'
</div>
';
	}
	$htmltabs.= '</div>';
}

$htmltabs.= '</div>';
$htmlvolume = '
<div id="divvolume">
<div class="col-l text">Volume&emsp;<c id="gain">0</c></div>
<div class="col-r text">
	<input id="volume" type="range" min="0" max="100">
	<div class="divgain">'.i( 'minus' ).i( 'mute' ).i( 'plus' ).'</div>
</div>
<div style="clear:both"></div>
</div>
';

//////////////////////////////////
$head = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [
		  'log'      => 'file'
		, 'playback' => 'play'
	]
	, 'help'   => <<< EOF
{$Fi( 'file btn' )} Log
{$Fi( 'play btn' )}{$Fi( 'pause btn' )}{$Fi( 'stop btn' )} Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
];
$body = [
	  '<pre id="codelog" class="hide"></pre>'
	, htmlSectionStatus( 'vu' )
	, $htmlvolume
	, htmlSectionStatus( 'state', '<div id="statuslabel"></div>' )
	, [
		  'id'    => 'configuration'
		, 'input' => '<select id="configuration"></select>'
		, 'settingicon' => 'folder-config'
		, 'help'  => <<< EOF
{$Fi( 'minus btn' )}{$Fi( 'mute btn' )}{$Fi( 'plus btn' )} -1% · mute · +1%
{$Fi( 'set0 btn' )} Reset clipped
{$Fi( 'folder-config btn' )} Configuration files
EOF
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$head = [
	  'title'  => 'Filters'
];
$body = [ $htmltabs ];
htmlSection( $head, $body, 'settings' );
?>
<div id="menu" class="menu hide">
<a class="graph"><i class="i-graph"></i>Graph</a>
<a class="edit"><i class="i-edit"></i>Edit</a>
<a class="delete"><i class="i-remove"></i>Delete</a>
</div>
