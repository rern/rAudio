<?php
$pins      = [ 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 32, 33, 35, 36, 37, 38, 40 ];
$optionpin = '';
foreach ( $pins as $p ) $optionpin.= '<option value='.$p.'>'.$p.'</option>';
$htmlpin   = '';
$htmlname  = '';
for ( $i = 0; $i < 4; $i++ ) {
	$htmlpin .= '<select id="pin'.$i.'" class="pin">'.$optionpin.'</select>';
	$htmlname.= '<input id="name'.$i.'" type="text" class="name" placeholder="(no name)">';
}
echo '<div class="section">';
htmlHead( [ //////////////////////////////////
	  'title'  => 'Relay Module'
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<span class="helpblock hide"><img src="/assets/img/relays.jpg">
Power on/off peripheral equipments
On/Off:  <a class="helpmenu"><i class="fa fa-raudio"></i> System</a><i class="fa fa-relays sub"></i>
<br> • More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
 • Can be enabled and run as a test without a connected relay module.
</span>
</div>
<?php include 'assets/img/gpio.svg';?>
<br>
<div class="gpio-float-l">
	<div class="column" id="gpio-num">
		<span class="gpio-text"><?=( i( 'gpiopins bl' ) )?>Pin</span>
		<?=$htmlpin?>
		<span class="gpio-text"><?=( i( 'stoptimer yl' ) )?> Idle</span>
		<select id="timer" class="timer"></select>
	</div>
	<div class="column c2" id="gpio-name">
		<span class="gpio-text"><?=( i( 'tag bl' ) )?> Name</span>
		<?=$htmlname?>
		<span class="timer">&nbsp;min. to <?=( i( 'power red' ) )?></span>
	</div>
</div>
<div class="gpio-float-r">
	<div class="column">
		<span class="gpio-text"><?=( i( 'power grn' ) )?> On Sequence</span>
		<div id="on"></div>
	</div>
	<div class="column c2">
		<span class="gpio-text"><?=( i( 'power red' ) )?> Off Sequence</span>
		<div id="off"></div>
		<br>
		<a id="undo" class="infobtn infobtn"><?=( i( 'undo' ) )?>Undo</a><!--
	 --><a id="save" class="infobtn infobtn-primary"><?=( i( 'save' ) )?>Save</a>
	</div>
</div>
