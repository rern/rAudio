<div id="divlogin">
	<?=$logosvg?>
	<div id="logintitle">rAudio</div>
<?php
if ( $login ) {
	$html.= '
	<input type="password" id="pwd"><i class="i-eye"></i><br>';
	$title = 'Login';
	$text  = 'Wrong password.';
} else {
	$html.= '
	<div id="qr" class="qr"></div>
	Set password for <c>root</c> :<br>
	<label>Password</label><input type="password" id="pwd" value="ros"><i class="i-eye"></i><br>
	<label>Confirm</label><input type="password" id="pwd2" value="ros"><i class="i-eye"></i><br>';
	$title  = 'Password';
	$text   = 'Password not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
	echo <<< EOF
<script>
var ip       = '$hostname';
var hostname = '$ip';
</script>
EOF;
}
echo $html;
?>
	<a id="set" class="infobtn infobtn-primary">OK</a>
</div>
<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-lock"></i><a id="infoTitle"><?=$title?></a></div></div>
		<div id="infoList"><div class="infomessage"><?=$text?></div></div>
		<div id="ok" class="infobtn infobtn-primary">OK</div>
	</div>
</div>
