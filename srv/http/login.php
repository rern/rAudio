<style>
body {
	display        : grid;
	place-items    : center;
	height         : 100vh;
	text-align     : center;
}
#divlogin > svg {
	width          : 50px;
}
#logintitle {
	margin         : 10px 0 10px 20px;
	font-weight    : 300;
	letter-spacing : 25px;
}
#qr {
	width: 230px;
	height: 230px;
	margin: 0 auto;
	line-height: 22px;
}
#qr svg {
	margin: 10px auto;
}
label {
	display        : inline-block;
	width          : 65px;
	margin-left    : -30px;
	text-align     : right;
}
#pwd, #pwd2 {
	width          : 200px;
	margin         : 5px 10px 10px;
	border         : 1px solid var( --cg );
}
.i-eye {
	font-size      : 20px;
	vertical-align : -3px;
}
</style>
</head>
<body>
<div id="divlogin">
	<?=$logosvg?>
	<div id="logintitle">rAudio</div>
	<br>
<?php
$file   = glob( '/srv/http/assets/js/plugin/jquery*' );
$script = '
<script src="'.substr( $file[ 0 ], 9 ).'"></script>';
if ( file_exists( '/boot/expand' ) ) {
	$html.= '
	<div id="qr" class="qr"></div>
	Set password for <c>root</c> :<br>
	<label>Password</label><input type="password" id="pwd" value="ros"><i class="i-eye"></i><br>
	<label>Confirm</label><input type="password" id="pwd2" value="ros"><i class="i-eye"></i><br>';
	$title  = 'Password';
	$text   = 'Password not the same.';
	$file   = glob( '/srv/http/assets/js/plugin/qr*' );
	$script.= '
<script src="'.substr( $file[ 0 ], 9 ).'"></script>';
	$hostname = gethostname();
	$ip       = gethostbyname( $hostname );
} else {
	$html.= '
	<input type="password" id="pwd"><i class="i-eye"></i><br>';
	$title = 'Login';
	$text  = 'Wrong password.';
	$script_qr = '';
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

<?=$script?>

<script>
$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$info = $( '#infoOverlay' );
$ok   = $( '#ok' );
$pwd  = $( '#pwd' );
$qr   = $( '#qr' );
$set  = $( '#set' );
login = ! $qr.length;
if ( ! login ) {
	var ip          = '<?=$ip?>';
	$qr.html( 'http://<wh>'+ ip +'</wh>'
			+ '<br>http://<?=$hostname?>'
			+ QRCode( 'http://'+ ip )
	);
}
$pwd.focus();
$( document ).on( 'keyup', e => {
	if ( ! $pwd.val() ) {
		$set.addClass( 'disabled' );
		return
	}
	
	$set.removeClass( 'disabled' );
	if ( e.key === 'Enter' ) {
		var $target = $( '#infoOverlay' ).hasClass( 'hide' ) ? $set : $ok;
		$target.trigger( 'click' );
	}
} );
$( '.i-eye' ).on( 'click', function() {
	var $prev = $( this ).prev();
	$prev.attr( 'type', $prev.attr( 'type' ) === 'text' ? 'password' : 'text' );
	$( this ).toggleClass( 'bl' );
} );
$set.on( 'click', function() {
	var pwd = $pwd.val();
	if ( ! login ) {
		if ( pwd !== $( '#pwd2' ).val() ) {
			$info.removeClass( 'hide' );
		} else {
			var data = { cmd: 'bash', filesh: 'cmd.sh', args: [ 'password', pwd, 'CMD PASSWORD' ] }
			$.post( 'cmd.php', data, location.reload );
		}
	} else {
		$.post( 'cmd.php', { cmd: 'login', pwd: pwd }, verified => {
			if ( verified == -1 ) {
				$info.removeClass( 'hide' );
			} else {
				location.reload();
			}
		} );
	}
} );
$ok.on( 'click', () => {
	$info.addClass( 'hide' );
	$pwd.css( 'caret-color', '' );
} );

} );
</script>

</body>
</html>
