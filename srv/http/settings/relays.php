<?php
$pins = [ 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 32, 33, 35, 36, 37, 38, 40 ];
$optionpin = '';
foreach ( $pins as $p ) $optionpin.= '<option value='.$p.'>'.$p.'</option>';
$htmlpin = '';
$htmlname = '';
for ( $i = 1; $i < 5; $i++ ) {
	$htmlpin.= '<select id="pin'.$i.'" name="pin'.$i.'" class="pin">'.$optionpin.'</select>';
	$htmlname.= '<input id="name'.$i.'" name="name'.$i.'" type="text" class="name" placeholder="(no name)">';
}
?>
<br>
<img id="gpiosvg" src="/assets/img/gpio.<?=$time?>.svg">
<br>
<div class="gpio-float-l">
	<div class="column" id="gpio-num">
		<span class="gpio-text"><i class="fa fa-gpiopins bl"></i> Pin</span>
		<?=$htmlpin?>
		<span class="gpio-text"><i class="fa fa-stopwatch yl"></i> Idle</span>
		<select id="timer" name="timer" class="timer"></select>
	</div>
	<div class="column" id="gpio-name">
		<span class="gpio-text"><i class="fa fa-tag bl"></i> Name</span>
		<input id="name1" name="name1" type="text" class="name" placeholder="(no name)">
		<input id="name2" name="name2" type="text" class="name" placeholder="(no name)">
		<input id="name3" name="name3" type="text" class="name" placeholder="(no name)">
		<input id="name4" name="name4" type="text" class="name" placeholder="(no name)">
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
