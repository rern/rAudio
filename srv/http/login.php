<?php
$html = <<< EOF
<div id="login">
$logosvg
<div id="logintitle">rAudio</div>
EOF;
$pwd = '<lbl>Password</lbl><input type="text" id="pwd"><i class="i-eye bl"></i><br>';
if ( $password ) {
	$title    = 'Password';
	$text     = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
$html.= <<< EOF
	<div id="qr" class="qr"></div>
	<div id="message">Set <c>root</c> password:</div>
	$pwd
	<lbl>Confirm</lbl><input type="text" id="pwd2"><br>
EOF;
	if ( file_exists( '/bin/firefox' ) && ! file_exists( '/boot/localbrowseroff' ) ) $html.= <<< EOF
	<label><input id="headless" type="checkbox">Raspberry Pi with no display <gr>(headless)</gr></label><br><br>
EOF;
} else {
	$title    = 'Login';
	$text     = 'Wrong password.';
	$html    .= $pwd;
}
echo $html;
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
<?php if ( $password ) { ?>
<script>
var hostname = '<?=$hostname?>';
var ip       = '<?=$ip?>';
</script>
<?php } ?>
