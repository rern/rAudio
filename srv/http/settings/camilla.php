<?php
function htmlSelect( $class, $options ) {
	$html = '<select class="'.$class.'">';
	foreach( $options as $o ) $html.= '<option value="'.$o.'">'.$o.'</option>';
	$html.= '</select>';
	return $html;
}
function htmlInput( $label, $type ) {
	if ( $type[ 0 ] !== '<' ) {
		$html = '<input class="'.$label.'" type="'.$type.'">';
		if ( $type === 'checkbox' ) $html.= '<div class="switchlabel"></div>';
	} else {
		$html = $type; // select / html
	}
	return '
<div class="col-l single">'.$label.'</div><div class="col-r">'.$html.'</div>
<div style="clear:both"></div>
';
}
function htmlSectionSub( $title, $list, $icon = '' ) {
	$html = '';
	foreach( $list as $label => $type ) {
		$html.= htmlInput( $label, $type );
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
	<br>Capture samplerate
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
	  'type'         => htmlSelect( 'type', $type )
	, 'channels'     => 'number'
	, 'sampleformat' => htmlSelect( 'sampleformat', $sampleformat )
	, 'device'       => 'text'
];

$title_data = [
	  'Sampling' => [
		  'samplerate' => htmlSelect( 'samplerate', $samplerate )
	]
	, 'Buffers' => [
		  'chunksize'  => 'number'
		, 'queuelimit' => 'number'
	]
	, 'Silence' => [
		  'silence_threshold' => 'number'
		, 'silence_timeout'   => 'number'
	]
	, 'Rate adjust' => [
		  'enable_rate_adjust' => 'checkbox'
		, 'adjust_period'      => 'number'
		, 'target_level'       => 'number'
	]
	, 'Resampling' => [
		  'enable_resampling'  => 'checkbox'
		, 'resampler_type'     => htmlSelect( 'resampler_type',     $resampler_type )
		, 'capture_samplerate' => htmlSelect( 'capture_samplerate', $samplerate )
	]
	, 'Capture rate monitoring' => [
		  'rate_measure_interval' => 'number'
		, 'stop_on_rate_change'   => 'checkbox'
	]
	, 'Capture device'  => $datadevice
	, 'Playback device' => $datadevice
];
foreach( $title_data as $title => $data ) htmlSectionSub( $title, $data );
?>

</div>

<div id="divfilters" class="section">
<heading><span class="headtitle"><?=i( 'filters' )?>Filters<?=i( 'plus-circle add' )?></span></heading>


</div>