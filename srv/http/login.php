<?php
if ( $passwd ) {
	$title    = 'Password';
	$text     = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
	$headless = file_exists( '/boot/kernel.img' ) || file_exists( '/boot/localbrowseroff' );
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
	<label id="chk"><input id="headless" type="checkbox">Raspberry Pi with no display <gr>(headless)</gr></label>
	<br>
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
var headless = '<?=$headless?>';
var hostname = '<?=$hostname?>';
var ip       = '<?=$ip?>';
</script>
<?php } ?>
