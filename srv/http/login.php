<div id="divlogin">
	<?=$logosvg?>
	<div id="logintitle">rAudio</div>
	<div id="qr" class="qr"></div>
	<div id="message">Set <c>root</c> password:</div>
	<label>Password</label><input type="text" id="pwd"><i class="i-eye bl"></i><br>
	<label>Confirm</label><input type="text" id="pwd2"><br>
	<a id="set" class="infobtn infobtn-primary">OK</a>
</div>
<?php
if ( $passwd ) {
	$title  = 'Password';
	$text   = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
} else {
	$title = 'Login';
	$text  = 'Wrong password.';
}
?>
<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-lock"></i><a id="infoTitle"><?=$title?></a></div></div>
		<div id="infoList"><div class="infomessage"><i class="i-warning yl"></i> <?=$text?></div></div>
		<div id="ok" class="infobtn infobtn-primary">OK</div>
	</div>
</div>
<?php 
if ( $passwd ) { ?>
<script>
var ip       = '<?=$hostname?>';
var hostname = '<?=$ip?>';
</script>
<?php
}
?>