<?php
$options = [
	  'Rate Adjust'         => 'enable_rate_adjust'
	, 'Resampling'          => 'enable_resampling'
	, 'Stop on Rate Change' => 'stop_on_rate_change'
];
$htmloptions = '';
foreach( $options as $label => $id ) {
	$common  = '';
	$setting = '';
	if ( $id !== 'stop_on_rate_change' ) {
		$common  = ' common';
		$setting = '<i id="setting-'.$id.'" class="i-gear setting"></i>';
	}
	$input       = '<input id="'.$id.'" type="checkbox" class="switch'.$common.'">'
				  .'<div class="switchlabel"></div>'.$setting;
	$htmloptions.= '<div id="div'.$id.'">'
				  .'<div class="col-l single name">'.$label.'</div><div class="col-r">'.$input
				  .'</div><div style="clear:both"></div>'
				  .'</div>';
}
$htmldevices = '';
foreach( [ 'Sampling', 'Options', 'Capture', 'Playback' ] as $title ) {
	$id      = lcFirst( str_replace( ' ', '', $title ) );
	$html    = '<div class="statuslist"></div>';
	$setting = $title === 'Capture' || $title === 'Playback';
	$head    = '';
	if ( $title === 'Options' ) {
		$html .= $htmloptions;
	} else if ( $setting ) {
		$head  = '<heading class="subhead"><span class="headtitle">'.$title.i( 'gear', $id ).'</span></heading>';
	}
	$htmldevices.= '
<div id="div'.$id.'" class="section">
'.$head.'
<div class="content">'.$html.'</div>
</div>
';
}
$htmlcontrols = '
<div id="divcontrols" class="tab">
	<div id="volume" class="range">
		<code class="name">Gain</code><div class="value">0</div>
		<input type="range" min="-54" max="5" value="0">
	</div>
	<div id="bass" class="range">
		<code class="name">Bass</code><div class="value">0</div>
		<input type="range" min="-6" max="6" step="0.1" value="0">
	</div>
	<div id="treble" class="range">
		<code class="name">Treble</code><div class="value">0</div>
		<input type="range" min="-6" max="6" step="0.1" value="0">
	</div>
	<div style="clear:both"></div>
</div>
';

$htmltabs = '<div id="divtabs">';
foreach( [ 'devices', 'filters', 'mixers', 'pipeline' ] as $id ) {
	$htmltabs.= '
<div id="div'.$id.'" class="tab">
	'.( $id === 'devices' ? $htmldevices : '' ).'
	<ul class="entries"></ul>
</div>
';
}

$htmltabs.= $htmlcontrols.'</div>';

$id_data = [
	  'profile' => [ 'name' => 'Configuration', 'setting' => 'custom' ]
];
//////////////////////////////////
$head = [ 'title'  => 'Status', 'status' => 'camilladsp' ];
$labels = 'State
	<br>Sample rate
	<br>Rate adjust
	<br>Clipped samples
	<br>Buffer level';
$body = [ htmlSectionStatus( 'status', $labels ) ];
htmlSection( $head, $body, 'status' );
//////////////////////////////////
$head = [
	  'title'  => 'Profile'
	, 'button' => [
		  'add'    => 'plus-circle'
		, 'settings' => 'gear'
	]
];
$body = [
	[
		  'id'    => 'profile'
		, 'input' => '<select id="profile"></select>'
		, 'help'  => 'Select configuration file'
	]
];
htmlSection( $head, $body, 'profile' );
//////////////////////////////////
$head = [
	  'title'  => 'Controls'
	, 'button' => [
		  'add hide'      => 'plus-circle'
		, 'settings hide' => 'gear'
	]
];
$body = [ $htmltabs ];
htmlSection( $head, $body, 'settings' );
