$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var E = {
	  input  : $( 'input' )
	, passwd : $( '#qr' ).length
};
[ 'infoOverlay', 'ok', 'pwd', 'pwd2', 'qr', 'set' ].forEach( id => { E[ id ] = $( '#'+ id ) } );
if ( E.passwd ) {
	E.qr.html( 'http://<wh>'+ ip +'</wh>'
			+ '<br>http://'+ hostname
			+ QRCode( 'http://'+ ip )
	);
	E.input.val( 'ros' );
}
E.pwd.select();
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
$( '.i-eye' ).on( 'click', function() {
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
	$.post( 'cmd.php', args, verified => {
		if ( verified != -1 ) location.reload();
		
		E.infoOverlay.removeClass( 'hide' );
	} );
} );
E.ok.on( 'click', () => {
	E.infoOverlay.addClass( 'hide' );
	var el = E.pwd[ 0 ];
	el.setSelectionRange( el.value.length, el.value.length ); // cursor at end
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
