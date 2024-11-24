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

$id_tab          = [
	  'filters'    => [
		  'button' => [ 'folderfilter', 'add' ]
		, 'help'   => <<< EOF
$B_folderfilter $B_plus Finite Impulse Response (FIR) files · New
$bset_filters Graph · Edit · Delete
$B_code Set 0
$bset_control Mute · Invert · Linear (Gain)
EOF
	]
	, 'mixers'     => [
		  'button' => [ 'add' ]
		, 'help'   => <<< EOF
$B_plus New
$bset_mixers Edit · Delete
$B_code $bset_control Set 0 · Mute · Invert · Linear
EOF
	]
	, 'processors' => [
		  'button' => [ 'add' ]
		, 'help'   => <<< EOF
$B_plus New
$bset_processors Edit · Delete
EOF
	]
		
	, 'pipeline'   => [
		  'button' => [ 'flowchart', 'add' ]
		, 'help'   => <<< EOF
$B_flowchart $B_plus Step flowchart · New
$bset_pipeline Graph · Edit · Delete
EOF
	]
	, 'devices'    => [
		  'button' => [ 'gear' ]
		, 'help'   => <<< EOF
$B_gear Capture sampling
$B_input $B_output Device settings
EOF
	]
	, 'config'     => [
		  'button' => [ 'add' ]
		, 'help'   => $bset_config
	]
];
$vubar   = '<div class="vubar"></div><div class="vubar peak X"></div><div class="vubar rms X"></div>';
$vugrid  = '';
$vulabel = '';
for ( $i = 0; $i < 6; $i++ ) $vugrid.= '<a class="g'.$i.'"></a>';
foreach ( [ -60, -48, -36, -24, -12, 0, 'dB' ] as $i => $db ) $vulabel.= '<a class="l'.$i.'">'.$db.'</a>';

$options         = [
	  [ 'id' => 'enable_rate_adjust',  'returnhtml' => true, 'disabled' => '<wh>Resampler</wh> set as <wh>Synchronous</wh>' ]
	, [ 'id' => 'capture_samplerate',  'returnhtml' => true ]
	, [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ]
	, [ 'id' => 'resampler',           'returnhtml' => true ]
];
$htmloptions     = '';
foreach( $options as $opt ) $htmloptions.= htmlSetting( $opt );
$htmltabs        = [];
foreach( $id_tab as $id => $data ) {
	$html = '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$data[ 'help' ].'</div>';
	if ( $id === 'pipeline' ) $html.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$html.= '<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$html.= '
<div id="sampling">'.htmlSectionStatus( 'sampling' ).'</div>
<div id="options">'.$htmloptions.'</div>';
	} else if ( $id !== 'config' ) {
		$html.= '
<ul class="entries sub"></ul>';
	}
	$htmltabs[ $id ] = $html.'</div>';
}
//////////////////////////////////
$head            = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'mpd icon', 'play playback' ]
	, 'help'   => <<< EOF
$B_play $B_pause $B_stop Playback control

<a href="https://henquist.github.io/0.6.3" target="_blank">Camilla DSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
];
$body            = [
	  htmlSectionStatus(
		  'vu'
		, ''
		, '<div id="vu">
			<div id="vugrid">'.$vugrid.'</div>
			<div id="in">'.str_replace( 'X', 'c0', $vubar ).str_replace( 'x', 'c1', $vubar ).'</div>
			<div id="vulabel">'.$vulabel.'</div>
			<div id="out">'.str_replace( 'X', 'p0', $vubar ).'</div>
		   </div>'
	)
	, htmlSectionStatus(
		  'volume'
		, '<a><span class="label">Master</span>
		   <gr class="control"></gr></a>'.i( 'minus' )
		, '<div id="volume" class="slider">
			<div class="track"></div>
			<div class="thumb" tabindex="0"></div>
			<div id="volume-band"></div>
		   </div>'.i( 'plus' ).'<c class="level"></c>'.i( 'volume' )
	)
	, htmlSectionStatus(
		  'state'
		, 'Buffer · Load<span class="divclipped hide"> · Clipped</span>
		   <br>Sampling<span class="rateadjust"> · Adjust</span>'
		, '<a class="buffer"></a> <gr>·</gr> <a class="load"></a><span class="divclipped hide"> <gr>·</gr> <a class="clipped"></a></span>
		   <br><a class="capture"></a><span class="rateadjust"> <gr>·</gr> <a class="rate"></a></span>'
	)
	, [
		  'id'     => 'configuration'
		, 'status' => true
		, 'input'  => 'configuration'
		, 'help'   => <<< EOF
$B_gear Configuration files
$B_set0 Reset clipped count (if any)
EOF
	]
];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
foreach( $id_tab as $id => $data ) {
	$head = [
		  'title'  => ucfirst( $id ).( $id === 'config' ? 'uration' : '' )
		, 'button' => $data[ 'button' ]
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
