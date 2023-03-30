$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( 'select' ).change( refreshOnChange );
$( 'input' ).on( 'keyup paste cut', refreshOnChange );
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	R = JSON.parse( JSON.stringify( S ) );
	renderPage();
	$( '#undo' ).addClass( 'disabled' )
	if ( S.enabled ) $( '#save' ).addClass( 'disabled' );
} );
$( '#save' ).click( function() {
	var onorder  = [];
	var offorder = [];
	for ( i = 0; i < 4; i++ ) {
		onorder.push(  $( '.on' ).eq( i ).find( 'option:selected' ).text() );
		offorder.push( $( '.off' ).eq( i ).find( 'option:selected' ).text() );
	}
	var name = {}
	R.pin.forEach( ( p, i ) => name[ p ] = R.name[ i ] );
	var data = {
		  name  : name
		, on    : R.on
		, ond   : R.ond
		, off   : R.off
		, offd  : R.offd
		, timer : R.timer
	}
	$.post(
		  'cmd.php'
		, { cmd: 'fileconf', fileconf: 'relays', json: JSON.stringify( data ) }
		, () => bash( [ 'relays' ] )
	);
	banner( 'relays', 'Relays', 'Change ...' );
	$( '.infobtn' ).addClass( 'disabled' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function refreshOnChange() {
	return
	setTimeout( () => { // wait for select2 ready
		[ 'pin', 'name', 'on', 'off', 'ond', 'offd' ].forEach( k => {
			R[ k ] = [];
			$( '.'+ k ).each(  ( i, el ) => {
				if ( k === 'name' ) {
					R.name.push( $( el ).val() );
				} else if ( k === 'ond' ) {
					var v = R.on[ i + 1 ] ? $( el ).val() : 0; // none - disable delay
				} else if ( k === 'offd' ) {
					var v = R.off[ i + 1 ] ? $( el ).val() : 0; // none - disable delay
				} else {
					var v = $( el ).val();
				}
				if ( v != 0 ) R[ k ].push( +v ); // force none to last
			} );
		} );
		R.timer = +$( '#timer' ).val();
		var changed = Rs !== JSON.stringify( R );
		$( '#undo' ).toggleClass( 'disabled', ! changed );
		if ( S.enabled ) $( '#save' ).toggleClass( 'disabled', ! changed );
		renderPage();
	}, 0 );
}
function renderPage() {
	if ( typeof R === 'undefined' ) {
		R  = JSON.parse( JSON.stringify( S ) );
		[ 'page', 'enabled', 'login' ].forEach( k => delete R[ k ] );
		$( '#save' ).toggleClass( 'disabled', S.enabled );
	}
	R.pin  = Object.keys( R.pname );
	R.name = Object.values( R.pname );
	Rs = JSON.stringify( R );
	var optnamepin = '<option value="0">None</option>';
	R.pin.forEach( ( p, i ) => optnamepin += '<option value="'+ p +'">'+ ( R.name[ i ] || '(unnamed)' ) +'</option>' );
	$( '.on, .off' ).html( optnamepin );
	$( '.pin' ).each(  ( i, el ) => $( el ).val( R.pin[ i ] ) );
	$( '.name' ).each( ( i, el ) => $( el ).val( R.name[ i ] ) );
	$( '.on' ).each(   ( i, el ) => $( el ).val( R.on[ i ] ) );
	$( '.ond' ).each(  ( i, el ) => $( el ).val( R.ond[ i ] ) );
	$( '.off' ).each(  ( i, el ) => $( el ).val( R.off[ i ] ) );
	$( '.offd' ).each( ( i, el ) => $( el ).val( R.offd[ i ] ) );
//	[ 'on', 'ond', 'off', 'offd' ].forEach( ( cl, i ) => $( '.'+ cl ).val( R[ cl ][ i ] ) );
	$( '#timer' ).val( R.timer );
	R.on.forEach( ( p, i ) => $( '.ond' ).eq( i - 1 ).prop( 'disabled', ! p ) );
	R.off.forEach( ( p, i ) => $( '.offd' ).eq( i - 1 ).prop( 'disabled', ! p ) );
	showContent();
}
