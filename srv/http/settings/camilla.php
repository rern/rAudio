<?php
$id_data = [
	  'volume'              => [ 'label' => 'Master',              'setting' => false,    'sub' => 'hw' ]
	, 'configuration'       => [ 'label' => 'Configuration',       'setting' => 'custom', 'sub' => 'current', 'status' => true ]
	, 'enable_rate_adjust'  => [ 'label' => 'Rate Adjust',         'setting' => 'custom' ]
	, 'stop_on_rate_change' => [ 'label' => 'Stop on Rate Change', 'setting' => 'custom' ]
	, 'resampler'           => [ 'label' => 'Resampler',           'setting' => 'custom' ]
];
$btnfilters = i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' );
$btnmixers  = i( 'mixers btn' ).' Context menu: '.i( 'edit btn' ).i( 'remove btn' );
$button     = [
	  'filters'    => i( 'filters btn' ).' Context menu: '.i( 'graph btn' ).i( 'edit btn' ).i( 'remove btn' )
	, 'mixers'     => $btnmixers
	, 'processors' => str_replace( 'mixers' , 'processors', $btnmixers )
	, 'pipeline'   => str_replace( 'filters' , 'pipeline', $btnfilters )
	, 'config'     => str_replace( 'mixers' , 'config', $btnmixers )
	, 'control'    => i( 'volume btn' ).i( 'inverted btn' ).i( 'linear btn' )
];
$help       = [
	  'status'      => <<< EOF
{$Fi( 'play btn' )}{$Fi( 'pause btn' )}{$Fi( 'stop btn' )} Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
	, 'volume'    => <<< EOF
{$Fi( 'gear btn' )} Configuration files
{$Fi( 'set0 btn' )} Reset clipped count (if any)
EOF
	, 'filters'   => <<< EOF
{$Fi( 'folder-filter btn' )}{$Fi( 'plus btn' )} Finite Impulse Response (FIR) files · New
{$button[ 'filters' ]} Graph · Edit · Delete
{$Fi( 'code btn' )} Set 0
{$button[ 'control' ]} Mute · Invert · Linear (Gain)
EOF
	, 'mixers'   => <<< EOF
{$Fi( 'plus btn' )} New
{$button[ 'mixers' ]} Edit · Delete
{$Fi( 'code btn' )}{$button[ 'control' ]} Set 0 · Mute · Invert · Linear
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
	<div class="thumb"></div>
	<div id="volume-band"></div>
</div>
<i class="i-plus"></i>
<c class="level">0</c>
<i class="i-volume"></i>
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
$tabs     = [ 'filters', 'mixers', 'processors', 'pipeline', 'devices', 'config' ];
$htmltabs = [];
foreach( $tabs as $id ) {
	$html = '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$help[ $id ].'</div>';
	if ( $id === 'pipeline' ) $html.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$html.= '<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$html.= '
<div id="sampling">
'.htmlSectionStatus( 'sampling' ).'
</div>
<div id="options">
'.htmlSetting( [ 'id' => 'enable_rate_adjust',  'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ] ).'
'.htmlSetting( [ 'id' => 'resampler',           'returnhtml' => true ] ).'
</div>
';
	} else if ( $id !== 'config' ) {
		$html.= '<ul class="entries sub"></ul>';
	}
	$htmltabs[ $id ] = $html.'</div>';
}
$button = [
	  'filters'    => [ 'folder-filter', 'add' ]
	, 'mixers'     => [ 'add' ]
	, 'processors' => [ 'add' ]
	, 'pipeline'   => [ 'flowchart', 'add' ]
	, 'devices'    => [ 'gear' ]
	, 'config'     => ''
];

//////////////////////////////////
$head = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'mpd icon', 'play playback' ]
	, 'help'   => $help[ 'status' ]
];
$body = [
	  htmlSectionStatus( 'vu' )
	, [   'id'    => 'volume'
		, 'icon'  => 'minus'
		, 'input' => $htmls[ 'volume' ]
	]
	, htmlSectionStatus( 'state', $htmls[ 'labels' ], $htmls[ 'values' ] )
	, [
		  'id'     => 'configuration'
		, 'status' => true
		, 'input'  => 'configuration'
		, 'help'   => $help[ 'volume' ]
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
foreach( $tabs as $id ) {
	$head = [
		  'title'  => ucfirst( $id ).( $id === 'config' ? 'uration' : '' )
		, 'button' => $button[ $id ]
		, 'status' => $id === 'devices' ? 'output' : false
	];
	$body = [ $htmltabs[ $id ] ];
	htmlSection( $head, $body, $id );
}
?>
<div id="menu" class="menu hide">
<a class="graph"><i class="i-graph"></i>Graph</a>
<a class="edit"><i class="i-edit"></i>Edit</a>
<a class="copy"><i class="i-copy"></i>Copy</a>
<a class="rename"><i class="i-edit"></i>Rename</a>
<a class="delete"><i class="i-remove"></i>Delete</a>
</div>
