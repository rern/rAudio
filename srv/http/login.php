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

<div id="divlogin">
	<div id="logintitle">rAudio</div>
	<input type="password" id="pwd"><i id="toggle" class="fa fa-eye"></i>
	<br><a id="login" class="infobtn infobtn-primary">Login</a>
</div>

<script>
var banner = document.getElementById( 'banner' );
var pwd    = document.getElementById( 'pwd' );
var toggle = document.getElementById( 'toggle' );
var login  = document.getElementById( 'login' );

document.getElementById( 'divlogin' ).prepend( document.querySelector( '#loader svg' ) ); // use logo from #loader
document.getElementById( 'loader' ).remove();
banner.innerHTML = '<div id="bannerIcon"><i class="fa fa-lock"></i></div>'
				  +'<div id="bannerTitle">Login</div>'
				  +'<div id="bannerMessage">Wrong password.</div>';

pwd.focus();
pwd.addEventListener( 'keyup', ( e ) => {
	if ( e.key === 'Enter' ) login.click();
} );
toggle.addEventListener( 'click', () => {
	if ( pwd.type === 'text' ) {
		pwd.type = 'password';
		toggle.classList.remove( 'bl' );
	} else {
		pwd.type = 'text';
		toggle.classList.add( 'bl' );
	}
} );
login.addEventListener( 'click', () => {
	if ( ! pwd.value ) return
	
	var formdata = new FormData();
	formdata.append( 'cmd',      'login' );
	formdata.append( 'password', pwd.value );
	fetch( 'cmd.php', {
		  method : 'POST'
		, body   : formdata
	} ).then( ( response ) => {
		return response.text(); // set response data as text > verified
	} ).then( ( verified ) => {
		if ( verified != -1 ) location.reload();
		
		banner.classList.remove( 'hide' );
		setTimeout( () => {
			banner.classList.add( 'hide' );
		}, 3000 );
	} );
} );
</script>

</body>
</html>
