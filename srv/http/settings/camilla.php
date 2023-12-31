<?php
$id_data = [
	  'configuration'       => [ 'name' => 'Configuration',       'setting' => 'custom', 'sub' => 'current', 'status' => true ]
	, 'enable_rate_adjust'  => [ 'name' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'name' => 'Stop on Rate Change', 'setting' => 'custom' ]
	, 'resampler'           => [ 'name' => 'Resampler',           'setting' => 'custom' ]
];
$sliderrange     = i( 'gear btn' ).' Gain slider range (dB)';
$contextfilters  = i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' );
$contextmixers   = i( 'mixers btn' ).' Context menu: '.i( 'edit btn' ).i( 'remove btn' );
$contextpipeline = str_replace( 'filters' , 'pipeline', $contextfilters );
$contextconfig   = str_replace( 'mixers' , 'config', $contextmixers );
$gaincontrols    = i( 'minus btn' ).i( 'code btn' ).i( 'plus btn' ).i( 'volume btn' ).' -1step · set 0 · +1step · mute';
$controls        = i( 'inverted btn' ).i( 'linear btn' ).' Invert · Linear';
$help = [
	  'filters'   => <<< EOF
{$Fi( 'folder-filter btn' )} FIR coefficient
{$sliderrange}
{$contextfilters}
{$gaincontrols}
{$controls}
EOF
	, 'mixers'   => <<< EOF
{$sliderrange}
{$contextmixers}
{$gaincontrols}
{$controls}
EOF
	, 'pipeline' => <<< EOF
{$Fi( 'flowchart btn' )} Step flowchart
{$contextpipeline}
EOF
	, 'devices'  => <<< EOF
{$Fi( 'gear btn' )} Capture sampling
{$Fi( 'input btn' )}{$Fi( 'output btn' )} Device settings
EOF
	, 'config'   => <<< EOF
{$contextconfig}
EOF
];
$htmltabs = '<div id="divtabs">';
foreach( [ 'filters', 'mixers', 'processors', 'pipeline', 'devices', 'config' ] as $id ) {
	$htmltabs.= '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$help[ $id ].'</div>';
	if ( $id === 'pipeline' ) $htmltabs.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$htmltabs.= '<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$htmltabs.= '
<div id="divdevices" class="section">
'.htmlSectionStatus( 'sampling' ).'
</div>
<div id="divoptions" class="section">
'.htmlSetting( [ 'id' => 'enable_rate_adjust',  'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'resampler',           'returnhtml' => true ] ).'
</div>
';
	} else if ( $id !== 'config' ) {
		$htmltabs.= '<ul class="entries sub"></ul>';
	}
	$htmltabs.= '</div>';
}

$htmltabs.= '</div>';
$htmlvolume = '
<div id="divvolume">
<div class="col-l"><a>Master<gr>hw</gr></a></div>
<div class="col-r">
	<div id="volume" class="slider">
		<div class="track"></div>
		<div class="slide"></div>
		<div class="thumb"></div>
	</div>
	<div class="divgain">
		<i id="voldn" class="i-minus"></i>
		<c id="volume-text">0</c>
		<i id="volup" class="i-plus"></i>
		<i id="volmute" class="i-volume"></i>
	</div>
</div>
<div style="clear:both"></div>
</div>
';
$htmllabels = '
Buffer · Load<span class="divclipped hide"> · Clipped</span>
<br>Sampling<span class="rateadjust"> · Adjust</span>
';
$htmlvalues = '
<a class="buffer">·</a> <gr>·</gr> <a class="load">·</a><span class="divclipped hide"> <gr>·</gr> <a class="clipped">·</a></span>
<br><a class="capture">·</a><span class="rateadjust"> <gr>·</gr> <a class="rate">·</a></span>
';

//////////////////////////////////
$head = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'icon' => 'mpd', 'playback' => 'play' ]
	, 'help'   => <<< EOF
{$Fi( 'play btn' )}{$Fi( 'pause btn' )}{$Fi( 'stop btn' )} Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
];
$gaincontrols = str_replace( [ 'step', 'set 0' ], [ '%', 'volume' ], $gaincontrols );
$body = [
	  htmlSectionStatus( 'vu' )
	, $htmlvolume
	, htmlSectionStatus( 'state', $htmllabels, $htmlvalues )
	, [
		  'id'    => 'configuration'
		, 'status' => true
		, 'input' => '<select id="configuration"></select>'
		, 'help'  => <<< EOF
{$Fi( 'gear btn' )} Configuration files
{$gaincontrols}
{$Fi( 'set0 btn' )} Reset clipped count (if any)
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
<a class="copy"><i class="i-copy"></i>Copy</a>
<a class="rename"><i class="i-edit"></i>Rename</a>
<a class="delete"><i class="i-remove"></i>Delete</a>
</div>
