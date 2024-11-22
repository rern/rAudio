<?php
$id_data         = [
	  'volume'              => [ 'label' => 'Master',        'sub' => 'hw' ]
	, 'configuration'       => [ 'label' => 'Configuration', 'sub' => 'current', 'status' => true ]
	, 'enable_rate_adjust'  => [ 'label' => 'Rate Adjust' ]
	, 'capture_samplerate'  => [ 'label' => 'Capture Samplerate' ]
	, 'stop_on_rate_change' => [ 'label' => 'Stop on Rate Change' ]
	, 'resampler'           => [ 'label' => 'Resampler' ]
];
commonVariables( [
	'buttons' => [ 'code',   'edit',   'filters', 'flowchart', 'folderfilter', 'gear',   'graph', 'input', 'inverted', 'linear'
				 , 'mixers', 'output', 'pause',   'play',      'plus',         'remove', 'set0',  'stop',  'volume' ]
] );

$btnfilters      = $B_filters.' Context menu: '.$B_graph.$B_edit.' '.$B_remove;
$btnmixers       = $B_mixers.' Context menu: '.$B_edit.' '.$B_remove;
$bset_filters    = $B_filters.' Context menu: '.$B_graph.' '.$B_edit.' '.$B_remove;
$bset_mixers     = $btnmixers;
$bset_processors = str_replace( 'mixers' , 'processors', $btnmixers );
$bset_pipeline   = str_replace( 'filters' , 'pipeline', $btnfilters );
$bset_config     = str_replace( 'mixers' , 'config', $btnmixers );
$bset_control    = $B_volume.' '.$B_inverted.' '.$B_linear;
$help            = [
	  'status'      => <<< EOF
$B_play $B_pause $B_stop Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
	, 'volume'    => <<< EOF
$B_gear Configuration files
$B_set0 Reset clipped count (if any)
EOF
	, 'filters'   => <<< EOF
$B_folderfilter $B_plus Finite Impulse Response (FIR) files · New
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
$options         = [
	  [ 'id' => 'enable_rate_adjust',  'returnhtml' => true, 'disabled' => '<wh>Resampler</wh> set as <wh>Synchronous</wh>' ]
	, [ 'id' => 'capture_samplerate',  'returnhtml' => true ]
	, [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ]
	, [ 'id' => 'resampler',           'returnhtml' => true ]
];
$htmloptions     = '';
foreach( $options as $opt ) $htmloptions.= htmlSetting( $opt );
$tabs            = [
	  'filters'    => [ 'folderfilter', 'add' ]
	, 'mixers'     => [ 'add' ]
	, 'processors' => [ 'add' ]
	, 'pipeline'   => [ 'flowchart', 'add' ]
	, 'devices'    => [ 'gear' ]
	, 'config'     => [ 'add' ]
];
$htmltabs        = [];
foreach( array_keys( $tabs ) as $id ) {
	$html = '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$help[ $id ].'</div>';
	if ( $id === 'pipeline' ) $html.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$html.= '<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$html.= '
<div id="sampling">
'.htmlSectionStatus( 'sampling' ).'
</div>
<div id="options">'.$htmloptions.'</div>';
	} else if ( $id !== 'config' ) {
		$html.= '<ul class="entries sub"></ul>';
	}
	$htmltabs[ $id ] = $html.'</div>';
}
$volume_labels   = '
<a><span class="label">Master</span>
<gr class="control"></gr></a>'.i( 'minus' );
$volume_values   = '
<div id="volume" class="slider">
	<div class="track"></div>
	<div class="thumb" tabindex="0"></div>
	<div id="volume-band"></div>
</div>'.i( 'plus' ).'<c class="level"></c>'.i( 'volume' );
$state_labels    = '
Buffer · Load<span class="divclipped hide"> · Clipped</span>
<br>Sampling<span class="rateadjust"> · Adjust</span>';
$dots            = '· · ·';
$state_values    = '
<a class="buffer">'.$dots.'</a> <gr>·</gr> <a class="load">'.$dots.'</a><span class="divclipped hide"> <gr>·</gr> <a class="clipped">'.$dots.'</a></span>
<br><a class="capture">'.$dots.'</a><span class="rateadjust"> <gr>·</gr> <a class="rate">'.$dots.'</a></span>';

//////////////////////////////////
$head            = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'mpd icon', 'play playback' ]
	, 'help'   => $help[ 'status' ]
];
$body            = [
	  htmlSectionStatus( 'vu' )
	, htmlSectionStatus( 'volume', $volume_labels, $volume_values )
	, htmlSectionStatus( 'state',  $state_labels,  $state_values )
	, [
		  'id'     => 'configuration'
		, 'status' => true
		, 'input'  => 'configuration'
		, 'help'   => $help[ 'volume' ]
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
foreach( $tabs as $id => $button ) {
	$head = [
		  'title'  => ucfirst( $id ).( $id === 'config' ? 'uration' : '' )
		, 'button' => $button
		, 'status' => $id === 'devices' ? 'output' : false
	];
	$body = [ $htmltabs[ $id ] ];
	htmlSection( $head, $body, $id );
}
$htmlmenu        = '<div id="menu" class="menu hide">';
foreach( [ 'graph', 'edit', 'copy', 'rename', 'delete' ] as $c ) {
	$htmlmenu.= '<a class="'.$c.'">'.i( $c ).ucfirst( $c ).'</a>';
}
echo $htmlmenu.'</div>';
