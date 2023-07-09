<?php
function htmlSelect( $class, $options ) {
	$html = '<select class="'.$class.'">';
	foreach( $options as $o ) $html.= '<option value="'.$o.'">'.$o.'</option>';
	$html.= '</select>';
	return $html;
}
function htmlInput( $label, $data ) {
	$class = $data[ 0 ];
	$type  = $data[ 1 ];
	if ( $type[ 0 ] !== '<' ) {
		$html = '<input class="'.$class.'" type="'.$type.'">';
		if ( $type === 'checkbox' ) $html.= '<div class="switchlabel"></div>';
	} else {
		$html = $type; // select / html
	}
	return'
<div class="col-l single">'.$label.'</div><div class="col-r">'.$html.'</div>
<div style="clear:both"></div>
';
}
function htmlSectionSub( $title, $data ) {
	$html = '';
	foreach( $data as $label => $type ) {
		if ( substr( $label, 0, 4 ) === 'html' ) {
			$html.= $type;
		} else {
			$html.= htmlInput( $label, $type );
		}
	}
	echo '
<div id="div'.lcfirst( str_replace( ' ', '', $title ) ).'" class="section">
<heading class="subhead"><span class="headtitle">'.$title.$icon.'</span></heading>
'.$html.'
</div>
';
}
?>
<div id="divcontrols-status" class="panel">

<div id="divcontrols" class="section">
<heading><span class="headtitle"><?=i( 'volume' )?>Controls</span></heading>
<div id="controls">
	<div id="volume" class="range">
		<code class="name">Gain</code><div class="value">0</div>
		<input type="range" min="-54" max="5" value="0">
	</div>
	<div id="bass" class="range">
		<code class="name">Bass</code><div class="value">0</div>
		<input type="range" min="-6" max="6" value="0">
	</div>
	<div id="treble" class="range">
		<code class="name">Treble</code><div class="value">0</div>
		<input type="range" min="-6" max="6" value="0">
	</div>
</div>
<div style="clear:both"></div>
</div>

<div id="divstatus" class="section">
<heading><span class="headtitle">Status</span><?=i( 'file log' ).i( 'undo' ).i( 'redo' )?></heading>
<div class="col-l text gr">
		Configuration
	<br>State
	<br>Sample rate
	<br>Rate adjust
	<br>Clipped samples
	<br>Buffer level
</div>
<div class="col-r text">
	<div id="statusvalue"></div>
</div>
<div style="clear:both"></div>
</div>

</div>

<div id="divtabs" class="panel tab">

<div id="divdevices" class="section hide">
<heading><span class="headtitle"><?=i( 'devices' )?>Devices</span></heading>

<?php
$samplerate     = [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ];
$resampler_type = [ 'FastAsync', 'BalancedAsync', 'AccurateAsync', 'Synchronous' ];
$type           = [ 'Alsa', 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin', 'File' ];
$sampleformat   = [ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE' ];
$datadevice     = [
	  'Type'          => [ 'type', htmlSelect( 'type', $type ) ]
	, 'Channels'      => [ 'channels', 'number' ]
	, 'Sample format' => [ 'sampleformat', htmlSelect( 'sampleformat', $sampleformat ) ]
	, 'Device'        => [ 'device', 'text' ]
];

$title_data = [
	  'Sampling' => [
		  'Rate'  => [ 'samplerate', htmlSelect( 'samplerate', $samplerate ) ]
		, 'html'  => '<div class="divother">'
		, 'Other' => [ 'other', 'number' ]
		, 'html1' => '</div>'
	]
	, 'Buffers' => [
		  'Chunk size'  => [ 'chunksize', 'number' ]
		, 'Queue limit' => [ 'queuelimit', 'number' ]
	]
	, 'Silence' => [
		  'Threshold' => [ 'silence_threshold', 'number' ]
		, 'Timeout'   => [ 'silence_timeout', 'number' ]
	]
	, 'Rate adjust' => [
		  'Rate adjust'   => [ 'enable_rate_adjust', 'checkbox' ]
		, 'html'          => '<div class="divtoggle">'
		, 'Adjust period' => [ 'adjust_period', 'number' ]
		, 'Target level'  => [ 'target_level', 'number' ]
		, 'html1'         => '</div>'
	]
	, 'Resampling' => [
		  'Resampling'  => [ 'enable_resampling', 'checkbox' ]
		, 'html'        => '<div class="divtoggle">'
		, 'Type'        => [ 'resampler_type', htmlSelect( 'resampler_type',     $resampler_type ) ]
		, 'Sample rate' => [ 'capture_samplerate', htmlSelect( 'capture_samplerate', $samplerate ) ]
		, 'html1'       => '<div class="divother">'
		, 'Other'       => [ 'other', 'number' ]
		, 'html2'       => '</div>'
		, 'html3'       => '</div>'
	]
	, 'Capture rate monitoring' => [
		  'Measure interval'    => [ 'rate_measure_interval', 'number' ]
		, 'Stop on rate change' => [ 'stop_on_rate_change', 'checkbox' ]
	]
	, 'Capture device'  => $datadevice
	, 'Playback device' => $datadevice
];
foreach( $title_data as $title => $data ) htmlSectionSub( $title, $data );
?>

</div>

<div id="divfilters" class="section hide">
<heading><span class="headtitle"><?=i( 'filters' )?>Filters<?=i( 'plus-circle add' )?></span></heading>


</div>