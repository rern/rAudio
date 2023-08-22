<?php
$id_data = [
	  'configuration'       => [ 'name' => 'Configuration',       'setting' => 'custom' ]
	, 'enable_rate_adjust'  => [ 'name' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'name' => 'Stop on Rate Change', 'setting' => 'custom' ]
	, 'enable_resampling'   => [ 'name' => 'Resampling',          'setting' => 'custom' ]
];

$htmltabs = '<div id="divtabs">';
foreach( [ 'filters', 'mixers', 'pipeline', 'devices' ] as $id ) {
	$htmltabs.= '<div id="'.$id.'" class="tab">';
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
		, 'range'    => 'gear'
		, 'playback' => 'play'
	]
	, 'help'   => <<< EOF
{$Fi( 'file btn' )} Log
{$Fi( 'gear btn' )} Gain slider range
{$Fi( 'play btn' )} {$Fi( 'pause btn' )} {$Fi( 'stop btn' )} Playback control

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
{$Fi( 'folder-config btn' )} Configuration files
{$Fi( 'plus btn' )} Add entry
{$Fi( 'folder-filter btn' )} FIR coefficient {$Ftab( 'filters' )}
{$Fi( 'flowchart btn' )} Flowchart {$Ftab( 'pipeline' )}
{$Fi( 'filters btn' )}{$Fi( 'mixers btn' )}{$Fi( 'pipeline btn' )} Context menu:
	{$Fmenu( 'graph', 'Graph' )}
	{$Fmenu( 'edit', 'Edit' )}
	{$Fmenu( 'remove', 'Delete' )}
{$Fi( 'mute btn' )}{$Fi( 'minus btn' )}{$Fi( 'set0 btn' )}{$Fi( 'plus btn' )} Gain: mute, up, 0, down
{$Fi( 'inverted btn' )} Invert {$Ftab( 'mixers' )}
EOF
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$head = [
	  'title'  => 'Filters'
	, 'nohelp' => true
];
$body = [ $htmltabs ];
htmlSection( $head, $body, 'settings' );
?>
<div id="menu" class="menu hide">
<a class="graph"><i class="i-graph"></i>Graph</a>
<a class="edit"><i class="i-edit"></i>Edit</a>
<a class="delete"><i class="i-remove"></i>Delete</a>
</div>
