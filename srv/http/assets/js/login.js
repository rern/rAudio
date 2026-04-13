$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var E = { input: $( 'input' ) };
[ 'infoOverlay', 'ok', 'pwd', 'pwd2', 'qr', 'set' ].forEach( id => { E[ id ] = $( '#'+ id ) } );
if ( E.qr.length ) {
	E.qr.html( 'http://<wh>'+ ip +'</wh>'
			+ '<br>http://'+ hostname
			+ QRCode( 'http://'+ ip )
	);
	E.input.val( 'ros' );
}
E.pwd.select();
$( document ).on( 'keyup', e => {
	if ( ! $pwd.val() ) {
		E.set.addClass( 'disabled' );
		return
	}
	
	E.set.removeClass( 'disabled' );
	if ( e.key === 'Enter' ) {
		var $target = $( '#infoOverlay' ).hasClass( 'hide' ) ? E.set : E.ok;
		$target.trigger( 'click' );
	}
} );
$( '.i-eye' ).on( 'click', function() {
	E.input.attr( 'type', E.input.attr( 'type' ) === 'text' ? 'password' : 'text' );
	$( this ).toggleClass( 'bl' );
} );
E.set.on( 'click', function() {
	var pwd = E.pwd.val();
	if ( E.qr.length ) {
		if ( pwd !== E.pwd2.val() ) {
			E.infoOverlay.removeClass( 'hide' );
		} else {
			$.post(
				'cmd.php'
				, { cmd: 'bash', filesh: 'cmd.sh', args: [ 'password', pwd, 'CMD PASSWORD' ] }
				, () => location.reload()
			);
		}
	} else {
		$.post(
			'cmd.php'
			, { cmd: 'login', pwd: pwd }
			, verified => {
				if ( verified == -1 ) {
					E.infoOverlay.removeClass( 'hide' );
				} else {
					location.reload();
				}
			}
		);
	}
} );
E.ok.on( 'click', () => {
	E.infoOverlay.addClass( 'hide' );
	var el = E.pwd[ 0 ];
	el.setSelectionRange( el.value.length, el.value.length ); // cursor at end
} );

} );
