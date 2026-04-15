$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var E = {
	  eye    : $( '.i-eye' )
	, input  : $( 'input' )
	, logo   : $( 'svg' ).eq( 0 )
	, passwd : $( '#qr' ).length
};
[ 'infoOverlay', 'ok', 'pwd', 'pwd2', 'qr', 'set' ].forEach( id => {
	E[ id ] = $( '#'+ id );
} );
E.input.attr( 'spellcheck', 'false' );
if ( E.passwd ) {
	E.qr.html( 'http://<wh>'+ ip +'</wh>'
			+ '<br>http://'+ hostname
			+ QRCode( 'http://'+ ip )
	);
	E.input.val( 'ros' );
} else {
	$( '#qr, #message, label, #pwd2' ).remove();
	E.input.attr( 'type', 'password' );
	E.eye.removeClass( 'bl' );
}
E.pwd.focus();
E.input.on( 'keyup cut paste', e => {
	setTimeout( () => { // cut: wait for value update
		var blank = ! E.pwd.val();
		if ( E.passwd ) blank = blank || ! E.pwd2.val();
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
	if ( E.passwd ) {
		if ( pwd !== E.pwd2.val() ) {
			E.infoOverlay.removeClass( 'hide' );
			return
		}
		
		var args = { cmd: 'bash', filesh: 'cmd.sh', args: [ 'password', pwd, 'CMD PASSWORD' ] }
	} else {
		var args = { cmd: 'login', pwd: pwd }
	}
	E.input.css( 'caret-color', 'transparent' );
	$.post( 'cmd.php', args, std => {
		if ( std == -1 ) {
			E.infoOverlay.removeClass( 'hide' );
		} else if ( E.passwd ) {
			var localhost = location.hostname === 'localhost';
			if ( ! localhost ) $( '#login' ).addClass( 'blink' );
			$( '#login' ).children().slice( 3 ).remove();
			setInterval( () => {
				fetch( '/data/shm/startup' ).then( response => {
					if ( response.ok ) location.reload();
				} );
				if ( localhost ) E.logo.css( 'opacity', E.logo.css( 'opacity' ) == 0 ? 1 : 0 )
			}, 1000 );
		} else {
			location.reload();
		}
	} );
} );
E.ok.on( 'click', () => {
	E.infoOverlay.addClass( 'hide' );
	E.input.css( 'caret-color', '' );
	E.pwd.focus();
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
