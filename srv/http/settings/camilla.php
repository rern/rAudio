<?php
commonVariables( [
	  'buttons' => [ 'code',   'drag',   'edit', 'filters', 'flowchart', 'folderfilter', 'gear', 'graph',  'input', 'inverted'
				   , 'linear', 'mixers', 'mute', 'output',  'pause',     'play',         'plus', 'remove', 'set0',  'stop', 'volume' ]
	, 'labels'  => []
	, 'menus'   => []
	, 'tabs'    => []
	
] );
$status    = [ 'configuration' ];

$bset     = ( object ) [];
$bset->filters    = $B->filters.' Context menu: '.$B->graph.$B->edit.$B->remove;
$bset->mixers     = $B->mixers.' Context menu: '.$B->edit.$B->remove;
$bset->processors = str_replace( 'mixers' , 'processors', $bset->mixers );
$bset->pipeline   = str_replace( 'filters' , 'pipeline', $bset->filters );
$bset->config     = str_replace( 'mixers' , 'config', $bset->mixers );
$bset->control    = $B->inverted.$B->linear;
$bset->volume     = $B->code.$B->volume;

$id_tab   = [
	  'filters'    => [
		  'button' => [ 'folderfilter', 'add' ]
		, 'help'   => <<< EOF
$B->folderfilter$B->plus Finite Impulse Response (FIR) files · New
$bset->filters Graph · Edit · Delete
$bset->volume 0db · Mute
$bset->control Invert · Linear (Gain)
EOF
	]
	, 'mixers'     => [
		  'button' => [ 'add' ]
		, 'help'   => <<< EOF
$B->plus New
$bset->mixers Edit · Delete
$bset->volume 0dB · Mute
$bset->control Invert · Linear
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
$B->drag Drag to arrange order
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
$vugrid   = '';
$vulabel  = '';
for ( $i = 0; $i < 6; $i++ ) $vugrid.= '<a class="g'.$i.'"></a>';
foreach ( [ -60, -48, -36, -24, -12, 0, 'dB' ] as $i => $db ) $vulabel.= '<a class="l'.$i.'">'.$db.'</a>';

$options  = [
	  [
		  'id'         => 'enable_rate_adjust'
		, 'label'      => 'Rate Adjust'
		, 'returnhtml' => true
		, 'disabled'   => '<wh>Resampler</wh> set as <wh>Synchronous</wh>'
	]
	, [
		  'id'         => 'capture_samplerate'
		, 'label'      => 'Capture Samplerate'
		, 'returnhtml' => true
	]
	, [
		  'id'         => 'stop_on_rate_change'
		, 'label'      => 'Stop on Rate Change'
		, 'returnhtml' => true
	]
	, [
		  'id'         => 'resampler'
		, 'label'      => 'Resampler'
		, 'returnhtml' => true
	]
];
$htmlopt  = '';
foreach( $options as $opt ) $htmlopt.= htmlSetting( $opt );
$htmltab  = [];
foreach( $id_tab as $id => $data ) {
	$html = '<div id="'.$id.'" class="tab"><div class="helpblock hide">'.$data[ 'help' ].'</div>'.
			'<ul class="entries main"></ul>';
	if ( $id === 'devices' ) {
		$html.= '
<div id="sampling">'.htmlSectionStatus( 'sampling' ).'</div>
<div id="options">'.$htmlopt.'</div>';
	} else if ( $id === 'filters' || $id === 'mixers' ) {
		$html.= '
<ul class="entries sub"></ul>';
	}
	$htmltab[ $id ] = $html.'</div>';
}
//////////////////////////////////
$head     = [ 
	  'title'  => 'Status'
	, 'status' => 'camilladsp'
	, 'button' => [ 'mpd player', 'play playback' ]
	, 'help'   => <<< EOF
$B->play$B->pause$B->stop Playback control

<a href="https://henquist.github.io" target="_blank">CamillaDSP</a> - Create audio processing pipelines for applications such as active crossovers or room correction.
EOF
];
$body     = [
	  htmlSectionStatus(
		  'vu'
		, ''
		, '
<div id="vu">
	<div id="vugrid">'.$vugrid.'</div>
	<div id="in"></div>
	<div id="vulabel">'.$vulabel.'</div>
	<div id="out"></div>
</div>'
	)
	, htmlSectionStatus(
		  'volume'
		, '
<a><span class="label">Master</span>
<gr class="control"></gr></a>'.icon(  'minus' )
		, '
<div id="volume" class="slider">
	<div class="track"></div>
	<div id="vol"><div class="thumb" tabindex="0"></div></div>
	<div id="volume-band"></div>
</div>'.icon(  'plus' ).'<c id="volume-level"></c><c id="volume-mute"></c>'.icon(  'volume' )
	)
	, htmlSectionStatus(
		  'state'
		, '
Processing Load
<span class="rateadjust"><br>Buffer</span>
<br>Sampling<span class="rateadjust wide"> · Adjust</span>
<span class="divclipped hide"><br>Clipped</span>'
		, '
<div id="statusbar">
	<div class="bar"></div>
	<div id="load" class="bar"></div>
	<div class="bar rateadjust"></div>
	<div id="buffer" class="bar rateadjust"></div>
</div>
<div id="statussampling">
	<a class="capture"></a><span class="rateadjust"> <gr>·</gr> <a class="rate"></a></span>
	<span class="divclipped hide"><br><a class="clipped"></a></span>
</div>
<span class="helpblock hide">'.$B->volume.$B->mute.' Mute · Unmute
'.$B->set0.' Reset clipped count (if any)
</span>'
	)
	, [
		  'id'     => 'configuration'
		, 'label'  => 'Configuration'
		, 'sub'    => 'current'
		, 'status' => true
		, 'input'  => 'configuration'
		, 'help'   => $B->gear.' Configuration files'
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
htmlMenu( [ 'graph', 'edit', 'copy', 'rename', 'delete', 'bypass', 'restore', 'info' ] );
