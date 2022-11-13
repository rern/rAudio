<div id="divlogin">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
	<br><br>
	<a style="margin-left: 20px;font-weight: 300; letter-spacing: 20px">rAudio</a>
	<br><input type="password" id="pwd"><i id="toggle" class="fa fa-eye"></i>
	<a id="login" class="btn btn-primary" style="cursor: pointer">Login</a>
</div>
<script>
var pwd    = document.getElementById( 'pwd' );
var toggle = document.getElementById( 'toggle' );
var login  = document.getElementById( 'login' );
pwd.focus();
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
	var password = pwd.value.replace( /(["&()\\])/g, '\$1' );
	var formdata = new FormData();
	formdata.append( 'cmd',      'login' );
	formdata.append( 'password', password );
	fetch( 'cmd.php', {
		  method : 'POST'
		, body   : formdata
	} ).then( ( response ) => {
		return response.text(); // set response data as text > verified
	} ).then( ( verified ) => {
		if ( verified != -1 ) location.reload();
	} );
} );
pwd.addEventListener( 'keyup', ( e ) => {
	if ( e.key === 'Enter' ) login.click();
} );
</script>

</body>
</html>
