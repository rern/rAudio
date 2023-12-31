<?php
$id_data = [
	  'volume'              => [ 'name' => 'Master',              'setting' => false,    'sub' => 'hw' ]
	, 'configuration'       => [ 'name' => 'Configuration',       'setting' => 'custom', 'sub' => 'current', 'status' => true ]
	, 'enable_rate_adjust'  => [ 'name' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'name' => 'Stop on Rate Change', 'setting' => 'custom' ]
	, 'resampler'           => [ 'name' => 'Resampler',           'setting' => 'custom' ]
];
$btnfilters = i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' );
$btnmixers  = i( 'mixers btn' ).' Context menu: '.i( 'edit btn' ).i( 'remove btn' );
$button     = [
	  'filters'    => i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' )
	, 'mixers'     => $btnmixers
	, 'processors' => str_replace( 'mixers' , 'processors', $btnmixers )
	, 'pipeline'   => str_replace( 'filters' , 'pipeline', $btnfilters )
	, 'config'     => str_replace( 'mixers' , 'config', $btnmixers )
	, 'gain'       => i( 'minus btn' ).i( 'code btn' ).i( 'plus btn' )
	, 'control'    => i( 'volume btn' ).i( 'inverted btn' ).i( 'linear btn' )
];
$help       = [
	  'status'      => <<< EOF
{$Fi( 'play btn' )}{$Fi( 'pause btn' )}{$Fi( 'stop btn' )} Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
	, 'volume'    => <<< EOF
{$Fi( 'gear btn' )} Configuration files'
{$$button[ 'gain' ]}{$Fi( 'volume btn' )} -% · Volume · +% · Mute
{$Fi( 'set0 btn' )} Reset clipped count (if any)
EOF
	, 'filters'   => <<< EOF
{$Fi( 'folder-filter btn' )}{$Fi( 'gear btn' )}{$Fi( 'plus btn' )} FIR coefficient files · Gain slider range · New
{$button[ 'filters' ]} Graph · Edit · Delete
{$button[ 'gain' ]} -1step · Set 0 · +1step
{$button[ 'control' ]} Mute · Invert · Linear (Gain)
EOF
	, 'mixers'   => <<< EOF
{$Fi( 'gear btn' )}{$Fi( 'plus btn' )} Gain slider range · New
{$button[ 'mixers' ]} Edit · Delete
{$button[ 'gain' ]}{$button[ 'control' ]} -1step · Set 0 · +1step · Mute · Invert · Linear
EOF
	, 'processors'   => <<< EOF
{$Fi( 'plus btn' )} New
{$button[ 'processors' ]} Edit · Delete
EOF
	, 'pipeline' => <<< EOF
{$Fi( 'flowchart btn' )}{$Fi( 'plus btn' )} Step flowchart · New
{$button[ 'pipeline' ]} Graph · Edit · Delete
EOF
	, 'devices'  => <<< EOF
{$Fi( 'gear btn' )} Capture sampling
{$Fi( 'input btn' )}{$Fi( 'output btn' )} Device settings
EOF
	, 'config'   => <<< EOF
{$$button[ 'config' ]}
EOF
];
$htmls = [
	  'volume' => '
<div id="volume" class="slider">
	<div class="track"></div>
	<div class="slide"></div>
	<div class="thumb"></div>
</div>
<div class="divgain">
	<i id="voldn" class="i-minus"></i>
	<c id="vollevel">0</c>
	<i id="volup" class="i-plus"></i>
</div>
<i id="volmute" class="i-volume"></i>
'
	, 'labels' => '
Buffer · Load<span class="divclipped hide"> · Clipped</span>
<br>Sampling<span class="rateadjust"> · Adjust</span>
'
	, 'values' => '
<a class="buffer">·</a> <gr>·</gr> <a class="load">·</a><span class="divclipped hide"> <gr>·</gr> <a class="clipped">·</a></span>
<br><a class="capture">·</a><span class="rateadjust"> <gr>·</gr> <a class="rate">·</a></span>
'
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

//////////////////////////////////
$head = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'icon' => 'mpd', 'playback' => 'play' ]
	, 'help'   => $help[ 'status' ]
];
$body = [
	  htmlSectionStatus( 'vu' )
	, [   'id'    => 'volume'
		, 'input' => $htmls[ 'volume' ]
	]
	, htmlSectionStatus( 'state', $htmls[ 'labels' ], $htmls[ 'values' ] )
	, [
		  'id'     => 'configuration'
		, 'status' => true
		, 'input'  => '<select id="configuration"></select>'
		, 'help'   => $help[ 'volume' ]
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$head = [
	  'title'  => 'Filters'
	, 'button' => [
		  'fir'     => 'folder-filter filters'
		, 'gear'    => 'gear filters mixers devices'
		, 'diagram' => 'flowchart pipeline'
		, 'add'     => 'add filters mixers processors pipeline'
	]
	, 'status' => 'output'
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
