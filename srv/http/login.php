<style>
#divlogin {
	position         : relative;
	top              : 50%;
	transform        : translateY( -50% );
	text-align       : center;
}
#divlogin svg {
	width            : 50px;
}
#logintitle {
	margin           : 10px 0 10px 20px;
	font-weight      : 300;
	letter-spacing   : 25px;
}
#divlogin i {
	font-size        : 20px;
	vertical-align   : -3px;
}
#pwd {
	height           : 40px;
	margin           : 30px 10px 10px 25px;
	padding          : 10px;
	font-family      : "Lato";
	font-size        : 15px;
	text-align       : center;
	color            : var( --cw );
	background-color : #000000 !important;
	border-radius    : 4px;
	border           : 1px solid var( --cg ) !important;
}
#login {
	margin           : 0 auto;
}
</style>

<div id="infoOverlay" class="hide">
	<div id="infoBox">
		<div id="infoTopBg"><div id="infoTop"><i class="fa fa-lock"></i><a id="infoTitle">Login</a></div></div>
		<div id="infoContent"><div class="infomessage">Wrong password.</div></div>
		<div id="infoOk" class="infobtn infobtn-primary">OK</div>
	</div>
</div>

<div id="divlogin">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
	<div id="logintitle">rAudio</div>
	<input type="password" id="pwd"><i id="toggle" class="fa fa-eye"></i>
	<br><a id="login" class="infobtn infobtn-primary">Login</a>
</div>

<script>
var E = {};
[ 'infoOk', 'infoOverlay', 'login', 'pwd', 'toggle' ].forEach( ( el ) => E[ el ] = document.getElementById( el ) );

E.pwd.focus();
document.body.addEventListener( 'keyup', ( e ) => {
	if ( e.key === 'Enter' ) E.infoOverlay.classList.contains( 'hide' ) ? E.login.click() : E.infoOk.click();
} );
E.toggle.addEventListener( 'click', () => {
	if ( E.pwd.type === 'text' ) {
		E.pwd.type = 'password';
		E.toggle.classList.remove( 'bl' );
	} else {
		E.pwd.type = 'text';
		E.toggle.classList.add( 'bl' );
	}
} );
E.login.addEventListener( 'click', () => {
	if ( ! E.pwd.value ) return
	
	var formdata = new FormData();
	formdata.append( 'cmd',      'login' );
	formdata.append( 'password', pwd.value );
	fetch( 'cmd.php', { method: 'POST', body: formdata } )
		.then( ( response ) => response.text() ) // set response data as text > verified
		.then( ( verified ) => {
			if ( verified != -1 ) {
				location.reload();
			} else {
				E.infoOverlay.classList.remove( 'hide' );
				E.pwd.style[ 'caret-color' ] = 'transparent'; // fix: hide blinking cursor on focus
			}
		} );
} );
E.infoOk.addEventListener( 'click', () => {
	E.infoOverlay.classList.add( 'hide' );
	E.pwd.style[ 'caret-color' ] = '';
} );
</script>

</body>
</html>
