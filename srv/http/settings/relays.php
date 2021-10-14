<?php
$pins = [ 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 32, 33, 35, 36, 37, 38, 40 ];
$optionpin = '';
foreach ( $pins as $p ) $optionpin.= '<option value='.$p.'>'.$p.'</option>';
$htmlpin = '';
$htmlname = '';
for ( $i = 0; $i < 4; $i++ ) {
	$htmlpin.= '<select id="pin'.$i.'" class="pin">'.$optionpin.'</select>';
	$htmlname.= '<input id="name'.$i.'" type="text" class="name" placeholder="(no name)">';
}
htmlHead( [ //////////////////////////////////
	  'title'  => 'GPIO Relays'
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<span class="help-block hide"><a class="img" data-name="relays">Relay module</a> - power on/off peripheral equipments
On/Off:  <i class="fa fa-plus-r"></i>System | <i class="fa fa-relays"></i>
 • More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
 • Can be enabled and run as a test without a connected relay module.
</span>
<?php include 'assets/img/gpio.svg';?>
<br>
<div class="gpio-float-l">
	<div class="column" id="gpio-num">
		<span class="gpio-text"><i class="fa fa-gpiopins bl"></i> Pin</span>
		<?=$htmlpin?>
		<span class="gpio-text"><i class="fa fa-stopwatch yl"></i> Idle</span>
		<select id="timer" class="timer"></select>
	</div>
	<div class="column" id="gpio-name">
		<span class="gpio-text"><i class="fa fa-tag bl"></i> Name</span>
		<?=$htmlname?>
		<span class="timer">&nbsp;min. to <i class="fa fa-power red"></i></span>
	</div>
</div>
<div class="gpio-float-r">
	<div class="column">
		<span class="gpio-text"><i class="fa fa-power grn"></i> On Sequence</span>
		<div id="on"></div>
	</div>
	<div class="column">
		<span class="gpio-text"><i class="fa fa-power red"></i> Off Sequence</span>
		<div id="off"></div>
		<br>
		<a id="undo" class="infobtn infobtn disabled"><i class="fa fa-undo"></i> Undo</a>
		<a id="save" class="infobtn infobtn-primary disabled"><i class="fa fa-save"></i> Save</a>
	</div>
</div>
