<?php
$id_data = [
	  'volume'              => [ 'label' => 'Master',        'sub' => 'hw' ]
	, 'configuration'       => [ 'label' => 'Configuration', 'sub' => 'current', 'status' => true ]
	, 'enable_rate_adjust'  => [ 'label' => 'Rate Adjust' ]
	, 'capture_samplerate'  => [ 'label' => 'Capture Samplerate' ]
	, 'stop_on_rate_change' => [ 'label' => 'Stop on Rate Change' ]
	, 'resampler'           => [ 'label' => 'Resampler' ]
];
commonVariables( [
	'buttons' => [ 'code',   'edit',   'filters', 'flowchart', 'gear', 'graph',  'input', 'inverted', 'linear'
				 , 'mixers', 'output', 'pause',   'play',      'plus', 'remove', 'set0',  'stop',     'volume' ]
] );
$btnfilters = $B_filters.' Context menu: '.$B_graph.$B_edit.' '.$B_remove;
$btnmixers  = $B_mixers.' Context menu: '.$B_edit.' '.$B_remove;
$button     = [
	  'filters'    => $B_filters.' Context menu: '.$B_graph.' '.$B_edit.' '.$B_remove
	, 'mixers'     => $btnmixers
	, 'processors' => str_replace( 'mixers' , 'processors', $btnmixers )
	, 'pipeline'   => str_replace( 'filters' , 'pipeline', $btnfilters )
	, 'config'     => str_replace( 'mixers' , 'config', $btnmixers )
	, 'control'    => $B_volume.' '.$B_inverted.' '.$B_linear
];
$bset_filters    = $B_filters.' Context menu: '.$B_graph.' '.$B_edit.' '.$B_remove;
$bset_mixers     = $btnmixers;
$bset_processors = str_replace( 'mixers' , 'processors', $btnmixers );
$bset_pipeline   = str_replace( 'filters' , 'pipeline', $btnfilters );
$bset_config     = str_replace( 'mixers' , 'config', $btnmixers );
$bset_control    = $B_volume.' '.$B_inverted.' '.$B_linear;

$dots = '· · ·';
$help       = [
	  'status'      => <<< EOF
$B_play $B_pause $B_stop Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
	, 'volume'    => <<< EOF
$B_gear Configuration files
$B_set0 Reset clipped count (if any)
EOF
	, 'filters'   => <<< EOF
{$I( 'folder-filter btn' )} $B_plus Finite Impulse Response (FIR) files · New
$bset_filters Graph · Edit · Delete
$B_code Set 0
$bset_control Mute · Invert · Linear (Gain)
EOF
	, 'mixers'   => <<< EOF
$B_plus New
$bset_mixers Edit · Delete
$B_code $bset_control Set 0 · Mute · Invert · Linear
EOF
	, 'processors'   => <<< EOF
$B_plus New
$bset_processors Edit · Delete
EOF
	, 'pipeline' => <<< EOF
$B_flowchart $B_plus Step flowchart · New
$bset_pipeline Graph · Edit · Delete
EOF
	, 'devices'  => <<< EOF
$B_gear Capture sampling
$B_input $B_output Device settings
EOF
	, 'config'   => <<< EOF
$bset_config
EOF
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
'.htmlSetting( [ 'id' => 'enable_rate_adjust',  'returnhtml' => true, 'disabled' => '<wh>Resampler</wh> set as <wh>Synchronous</wh>' ] ).'
'.htmlSetting( [ 'id' => 'capture_samplerate',  'returnhtml' => true ] ).'
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
$htmls = [
	  'volume' => [
		  'labels' => '
<a><span class="label">Master</span>
<gr class="control"></gr></a>'.i( 'minus' )
		, 'values' => '
<div id="volume" class="slider">
	<div class="track"></div>
	<div class="thumb" tabindex="0"></div>
	<div id="volume-band"></div>
</div>'.i( 'plus' ).'<c class="level"></c>'.i( 'volume' )
	]
	, 'state' => [
		  'labels' => '
Buffer · Load<span class="divclipped hide"> · Clipped</span>
<br>Sampling<span class="rateadjust"> · Adjust</span>'
		, 'values' => '
<a class="buffer">'.$dots.'</a> <gr>·</gr> <a class="load">'.$dots.'</a><span class="divclipped hide"> <gr>·</gr> <a class="clipped">'.$dots.'</a></span>
<br><a class="capture">'.$dots.'</a><span class="rateadjust"> <gr>·</gr> <a class="rate">'.$dots.'</a></span>'
	]
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
	, htmlSectionStatus( 'volume', $htmls[ 'volume' ][ 'labels' ], $htmls[ 'volume' ][ 'values' ] )
	, htmlSectionStatus( 'state',  $htmls[ 'state' ][ 'labels' ],  $htmls[ 'state' ][ 'values' ] )
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
<a class="graph"><?=i( 'graph' )?>Graph</a>
<a class="edit"><?=i( 'edit' )?>Edit</a>
<a class="copy"><?=i( 'copy' )?>Copy</a>
<a class="rename"><?=i( 'edit' )?>Rename</a>
<a class="delete"><?=i( 'remove' )?>Delete</a>
</div>
