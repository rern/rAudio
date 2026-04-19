<?php
if ( $passwd ) {
	$title    = 'Password';
	$text     = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
	if ( file_exists( '/boot/kernel.img' ) || file_exists( '/boot/localbrowseroff' ) ) {
		$headless = '';
	} else {
		$headless = '<br><label><input id="headless" type="checkbox">Raspberry Pi with no display <gr>(headless)</gr><br>';
	}
} else {
	$title    = 'Login';
	$text     = 'Wrong password.';
}
?>
<div id="login">
	<?=$logosvg?>
	<div id="logintitle">rAudio</div>
	<div id="qr" class="qr"></div>
	<div id="message">Set <c>root</c> password:</div>
	<lbl>Password</lbl><input type="text" id="pwd"><i class="i-eye bl"></i><br>
	<lbl>Confirm</lbl><input type="text" id="pwd2">
	<?=$headless?><br>
	<a id="set" class="infobtn infobtn-primary">OK</a>
</div>
<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-lock"></i><a id="infoTitle"><?=$title?></a></div></div>
		<div id="infoList"><div class="infomessage"><i class="i-warning yl"></i> <?=$text?></div></div>
		<div id="ok" class="infobtn infobtn-primary">OK</div>
	</div>
</div>
<?php if ( $passwd ) { ?>
<script>
var hostname = '<?=$hostname?>';
var ip       = '<?=$ip?>';
var legacy   = '<?=$legacy?>';
</script>
<?php } ?>
