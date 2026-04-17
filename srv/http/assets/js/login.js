$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

E = {
	  eye    : $( '.i-eye' )
	, input  : $( 'input' ).not( '#headless' )
	, logo   : $( 'svg' ).eq( 0 )
};
V = {
	  localhost : location.hostname === 'localhost'
	, passwd    : $( '#qr' ).length
};
[ 'infoOverlay', 'headless', 'login', 'ok', 'pwd', 'pwd2', 'qr', 'set' ].forEach( id => {
	E[ id ] = $( '#'+ id );
} );
E.input.attr( 'spellcheck', 'false' );
if ( legacy ) {
	$( '#divheadless' ).remove();
} else {
	E.headless.attr( 'checked', ! V.localhost );
}
if ( V.passwd ) {
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
		if ( V.passwd ) blank = blank || ! E.pwd2.val();
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
	if ( V.passwd ) {
		if ( pwd !== E.pwd2.val() ) {
			E.infoOverlay.removeClass( 'hide' );
			return
		}
		
		if ( V.localhost ) {
			setInterval( () => E.logo.css( 'opacity', E.logo.css( 'opacity' ) == 0 ? 1 : 0 ), 1000 );
		} else {
			E.login.addClass( 'blink' );
		}
		E.login.children().slice( 3 ).remove();
		var headless = E.headless.prop( 'checked' );
		var args         = {
			  cmd    : 'bash'
			, filesh : 'cmd.sh'
			, args   : [ 'password', pwd, headless, V.localhost, 'CMD PASSWORD HEADLESS LOCALHOST' ] }
	} else {
		var args = { cmd: 'login', pwd: pwd }
	}
	E.input.css( 'caret-color', 'transparent' );
	$.post( 'cmd.php', args, std => {
		if ( V.passwd ) {
			if ( std == 'update' ) E.login.append( 'U p d a t e . . .' );
			setInterval( () => {
				fetch( '/data/shm/startup' ).then( response => {
					if ( response.ok ) location.reload();
				} );
			}, 1000 );
		} else {
			std == -1 ? E.infoOverlay.removeClass( 'hide' ) : location.reload();
		}
	} );
} );
E.ok.on( 'click', () => {
	E.infoOverlay.addClass( 'hide' );
	E.input.css( 'caret-color', '' );
	E.pwd.focus();
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
