$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$info = $( '#infoOverlay' );
$ok   = $( '#ok' );
$pwd  = $( '#pwd' );
$qr   = $( '#qr' );
$set  = $( '#set' );
login = ! $qr.length;
if ( ! login ) {
	$qr.html( 'http://<wh>'+ ip +'</wh>'
			+ '<br>http://'+ hostname
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
					$info.removeClass( 'hide' );
				} else {
					location.reload();
				}
			}
		);
	}
} );
$ok.on( 'click', () => {
	$info.addClass( 'hide' );
	$pwd.css( 'caret-color', '' );
} );

} );
