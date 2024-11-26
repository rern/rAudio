<?php
$id_data  = [
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
	, 'labels'  => []
	, 'menus'   => []
	, 'tabs'    => []
	
] );

$bset     = ( object ) [];
$bset->filters    = $B->filters.' Context menu: '.$B->graph.$B->edit.$B->remove;
$bset->mixers     = $B->mixers.' Context menu: '.$B->edit.$B->remove;
$bset->processors = str_replace( 'mixers' , 'processors', $bset->mixers );
$bset->pipeline   = str_replace( 'filters' , 'pipeline', $bset->filters );
$bset->config     = str_replace( 'mixers' , 'config', $bset->mixers );
$bset->control    = $B->volume.$B->inverted.$B->linear;

$id_tab   = [
	  'filters'    => [
		  'button' => [ 'folderfilter', 'add' ]
		, 'help'   => <<< EOF
$B->folderfilter$B->plus Finite Impulse Response (FIR) files · New
$bset->filters Graph · Edit · Delete
$B->code Set 0
$bset->control Mute · Invert · Linear (Gain)
EOF
	]
	, 'mixers'     => [
		  'button' => [ 'add' ]
		, 'help'   => <<< EOF
$B->plus New
$bset->mixers Edit · Delete
$B->code$bset->control Set 0 · Mute · Invert · Linear
EOF
	]
	, 'processors' => [
		  'button' => [ 'add' ]
		, 'help'   => <<< EOF
$B->plus New
$bset->processors Edit · Delete
EOF
	]
		
	, 'pipeline'   => [
		  'button' => [ 'flowchart', 'add' ]
		, 'help'   => <<< EOF
$B->flowchart$B->plus Step flowchart · New
$bset->pipeline Graph · Edit · Delete
EOF
	]
	, 'devices'    => [
		  'button' => [ 'gear' ]
		, 'help'   => <<< EOF
$B->gear Capture sampling
$B->input$B->output Device settings
EOF
	]
	, 'config'     => [
		  'button' => [ 'add' ]
		, 'help'   => $bset->config
	]
];
$bar      = '';
foreach( [ '', 'peak X', 'rms X' ] as $c ) $bar.= '<div class="bar '.$c.'"></div>';
$vugrid   = '';
$vulabel  = '';
for ( $i = 0; $i < 6; $i++ ) $vugrid.= '<a class="g'.$i.'"></a>';
foreach ( [ -60, -48, -36, -24, -12, 0, 'dB' ] as $i => $db ) $vulabel.= '<a class="l'.$i.'">'.$db.'</a>';

$options  = [
	  [ 'id' => 'enable_rate_adjust',  'returnhtml' => true, 'disabled' => '<wh>Resampler</wh> set as <wh>Synchronous</wh>' ]
	, [ 'id' => 'capture_samplerate',  'returnhtml' => true ]
	, [ 'id' => 'stop_on_rate_change', 'returnhtml' => true ]
	, [ 'id' => 'resampler',           'returnhtml' => true ]
];
$htmlopt  = '';
foreach( $options as $opt ) $htmlopt.= htmlSetting( $opt );
$htmltab  = [];
foreach( $id_tab as $id => $data ) {
	$html = '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$data[ 'help' ].'</div>';
	if ( $id === 'pipeline' ) $html.= '<svg class="flowchart hide" xmlns="http://www.w3.org/2000/svg"></svg>';
	$html.= '<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$html.= '
<div id="sampling">'.htmlSectionStatus( 'sampling' ).'</div>
<div id="options">'.$htmlopt.'</div>';
	} else if ( $id === 'config' ) {
		$html.= '
<pre id="codeconfig" class="status hide"></pre>';
	} else {
		$html.= '
<ul class="entries sub"></ul>';
	}
	$htmltab[ $id ] = $html.'</div>';
}
//////////////////////////////////
$head     = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'mpd icon', 'play playback' ]
	, 'help'   => <<< EOF
$B->play$B->pause$B->stop Playback control

<a href="https://henquist.github.io" target="_blank">CamillaDSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
];
$body     = [
	  htmlSectionStatus(
		  'vu'
		, ''
		, '<div id="vu">
			<div id="vugrid">'.$vugrid.'</div>
			<div id="in">'.str_replace( 'X', 'c0', $bar ).str_replace( 'X', 'c1', $bar ).'</div>
			<div id="vulabel">'.$vulabel.'</div>
			<div id="out">'.str_replace( 'X', 'p0', $bar ).'</div>
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
		, 'Load
		   <span class="rateadjust"><br>Buffer</span>
		   <br>Sampling<span class="rateadjust wide"> · Adjust</span>
		   <span class="divclipped hide"><br>Clipped</span>'
		, '<div id="statusbar">
			<div class="bar"></div>
			<div id="load" class="bar"></div>
			<div class="bar rateadjust"></div>
			<div id="buffer" class="bar rateadjust"></div>
		   </div>
		   <div id="statussampling">
			<a class="capture"></a><span class="rateadjust"> <gr>·</gr> <a class="rate"></a></span>
			<span class="divclipped hide"><br><a class="clipped"></a></span>
		   </div>'
	)
	, [
		  'id'     => 'configuration'
		, 'status' => true
		, 'input'  => 'configuration'
		, 'help'   => <<< EOF
$B->gear Configuration files
$B->set0 Reset clipped count (if any)
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
	$body = [ $htmltab[ $id ] ];
	htmlSection( $head, $body, $id );
}
$htmlmenu = '<div id="menu" class="menu hide">';
foreach( [ 'graph', 'edit', 'copy', 'rename', 'delete', 'info' ] as $c ) {
	$htmlmenu.= '<a class="'.$c.'">'.i( $c ).ucfirst( $c ).'</a>';
}
echo $htmlmenu.'</div>';
