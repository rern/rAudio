$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function blink() {
	if ( localhost ) {
		setInterval( () => E.logo.css( 'opacity', E.logo.css( 'opacity' ) == 0 ? 1 : 0 ), 1000 );
	} else {
		E.logo.addClass( 'blink' );
	}
}

E = {
	  eye    : $( '.i-eye' )
	, input  : $( 'input' ).not( '#headless' )
	, logo   : $( 'svg' ).eq( 0 )
};
[ 'data', 'infoOverlay', 'headless', 'login', 'ok', 'pwd', 'pwd2', 'qr', 'set' ].forEach( id => {
	E[ id ] = $( '#'+ id );
} );
var localhost = location.hostname === 'localhost';
var type      = E.data.length ? E.data.data( 'type' ) : 'boot';
var password  = type === 'password';

if ( ! password ) $( '#message' ).remove();
E.input.attr( 'spellcheck', 'false' );
if ( type !== 'login' ) {
	WS           = new WebSocket( 'ws://'+ location.host +':8080' );
	WS.onopen    = () => WS.send( '{ "client": "add" }' );
	WS.onmessage = message => {
		if ( JSON.parse( message.data ).channel === 'reload' ) location.reload();
	}
}
if ( type === 'boot' ) { // boot
	blink();
	return
}

if ( password ) {
	if ( E.qr.length ) {
		var hostname = $( '#data' ).data( 'hostname' );
		var ip       = $( '#data' ).data( 'ip' );
		var html     = 'http://<wh>'+ ip +'</wh>'
					  +'<br>http://'+ hostname +'.local'
					  + QRCode( 'http://'+ ip );
		E.qr.html( html );
	}
	E.input.val( 'ros' );
	E.headless.attr( 'checked', ! localhost );
} else if ( type === 'login' ) {
	E.input.attr( 'type', 'password' );
	E.eye.removeClass( 'bl' );
}
E.pwd.focus();
E.input.on( 'keyup cut paste', e => {
	setTimeout( () => { // cut: wait for value update
		var blank = ! E.pwd.val();
		if ( password ) blank = blank || ! E.pwd2.val();
		if ( blank ) {
			E.set.addClass( 'disabled' );
			return
		}

		E.set.removeClass( 'disabled' );
		if ( e.key === 'Enter' ) {
			var $target = $( '#infoOverlay' ).hasClass( 'hide' ) ? E.set : E.ok;
			$target.trigger( 'click' );
		}
	}, 0 );
} );
E.eye.on( 'click', function() {
	E.input.attr( 'type', E.input.attr( 'type' ) === 'text' ? 'password' : 'text' );
	$( this ).toggleClass( 'bl' );
} );
E.set.on( 'click', function() {
	var pwd = E.pwd.val();
	if ( password ) {
		if ( pwd !== E.pwd2.val() ) {
			E.infoOverlay.removeClass( 'hide' );
			return
		}
		
		
		E.login.children().not( '#title, svg, #qr' ).remove();
		blink();
		var headless = E.headless.length && E.headless.prop( 'checked' );
		$.post( 'cmd.php', {
			  cmd    : 'bash'
			, filesh : 'cmd.sh'
			, args   : [ 'password', pwd, headless, localhost, 'CMD PASSWORD HEADLESS LOCALHOST' ]
		} );
	} else {
		$.post( 'cmd.php', { cmd: 'login', pwd: pwd }, std => {
			if ( ! password ) std == -1 ? E.infoOverlay.removeClass( 'hide' ) : location.reload();
		} );
	}
	E.input.css( 'caret-color', 'transparent' );
} );
E.ok.on( 'click', () => {
	E.infoOverlay.addClass( 'hide' );
	E.input.css( 'caret-color', '' );
	E.pwd.focus();
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
