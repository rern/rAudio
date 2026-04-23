<?php
$html = <<< EOF
<div id="login">
$logosvg
<div id="title">rAudio</div>
EOF;
$pwd = '<lbl>Password</lbl><input type="text" id="pwd"><i class="i-eye bl"></i><br>';
if ( $password ) {
	$title    = 'Password';
	$text     = 'Passwords not the same.';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
	$data     = ' data-type="password"';
	if ( $localhost ) {
		$qr   = '<div id="qr" class="qr"></div>';
		$data.= ' data-hostname="'.$hostname.'" data-ip="'.$ip.'"';
	} else {
		$qr   = '';
	}
	$html    .= <<< EOF
	$qr
	<div id="message">Set <c>root</c> password:</div>
	$pwd
	<lbl>Confirm</lbl><input type="text" id="pwd2"><br>
EOF;
	if ( file_exists( '/bin/firefox' ) && ! file_exists( '/boot/localbrowseroff' ) )
		$html.= <<< EOF
	<label><input id="headless" type="checkbox">Raspberry Pi with no display <gr>(headless)</gr></label><br><br>
EOF;
} else if ( $login ) {
	$title    = 'Login';
	$text     = 'Wrong password.';
	$data     = 'data-type="login"';
	$html    .= $pwd;
}
if ( ! $boot ) {
	$html.= <<< EOF
	<a id="set" class="infobtn infobtn-primary">OK</a>
</div>
<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="i-lock"></i><a id="infoTitle">$title</a></div></div>
		<div id="infoList"><div class="infomessage"><i class="i-warning yl"></i> $text</div></div>
		<div id="ok" class="infobtn infobtn-primary">OK</div>
	</div>
</div>
<div id="data" class="hide" $data></div>
EOF;
}

echo $html;
