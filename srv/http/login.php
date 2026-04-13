<div id="divlogin">
	<?=$logosvg?>
	<div id="logintitle">rAudio</div>
<?php if ( $password ) {
	$title  = 'Password';
	$text   = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
?>
	<div id="qr" class="qr"></div>
	Set <c>root</c> password:<br>
	<label>Password</label><input type="text" id="pwd"><i class="i-eye bl"></i><br>
	<label>Confirm</label><input type="text" id="pwd2"><br>
<script>
var ip       = '<?=$hostname?>';
var hostname = '<?=$ip?>';
</script>
<?php } else {
	$title = 'Login';
	$text  = 'Wrong password.';
?>
	<input type="password" id="pwd"><i class="i-eye"></i><br>
<?php }
?>
	<a id="set" class="infobtn infobtn-primary">OK</a>
</div>
<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-lock"></i><a id="infoTitle"><?=$title?></a></div></div>
		<div id="infoList"><div class="infomessage"><i class="i-warning yl"></i> <?=$text?></div></div>
		<div id="ok" class="infobtn infobtn-primary">OK</div>
	</div>
</div>
