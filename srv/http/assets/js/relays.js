$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

keys = [ 'pin', 'name', 'on', 'off', 'ond', 'offd' ];

$( 'select' ).change( refreshValues );
$( 'input' ).keyup( refreshValues );
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	R = JSON.parse( JSON.stringify( S ) );
	renderPage();
	$( '#undo' ).addClass( 'disabled' )
	if ( S.enabled ) $( '#save' ).addClass( 'disabled' )
} );
$( '#save' ).click( function() {
	var onorder  = [];
	var offorder = [];
	for ( i = 0; i < 4; i++ ) {
		onorder.push(  $( '.on' ).eq( i ).find( 'option:selected' ).text() );
		offorder.push( $( '.off' ).eq( i ).find( 'option:selected' ).text() );
	}
	var cmd = [
		  'save'
		, 'pin=\'[ '+ R.pin.join( ',' ) +' ]\''
		, 'name=\'[ "'+ R.name.join( '","' ) +'" ]\''
		, 'onorder=\'[ "'+ onorder.join( '","' ) +'" ]\''
		, 'offorder=\'[ "'+ offorder.join( '","' ) +'" ]\''
		, 'on=( '+ R.on.join( ' ' ) +' )'
		, 'ond=( '+ R.ond.join( ' ' ) +' )'
		, 'off=( '+ R.off.join( ' ' ) +' )'
		, 'offd=( '+ R.offd.join( ' ' ) +' )'
		, 'timer='+ R.timer
	];
	bash( cmd );
	banner( 'relays', 'Relays', 'Change ...' );
	$( '.infobtn' ).addClass( 'disabled' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function refreshValues() {
	setTimeout( () => { // wait for select2 ready
		keys.forEach( k => {
			R[ k ] = [];
			$( '.'+ k ).each(  ( i, el ) => {
				if ( k === 'name' ) {
					R.name.push( $( el ).val() );
					return
					
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
		Rs = JSON.stringify( R );
		$( '#save' ).toggleClass( 'disabled', S.enabled );
	}
	var optnamepin = '<option value="0">(none)</option>';
	for ( i = 0; i < 4; i++ ) {
		var name = R.name[ i ] || '(no name)';
		optnamepin += '<option value="'+ R.pin[ i ] +'">'+ name +'</option>';
	}
	for ( i = 0; i < 4; i++ ) $( '.on, .off' ).html( optnamepin );
	for ( i = 0; i < 4; i++ ) {
		keys.forEach( k => {
			var sub = k === 'name' ? '' : 0;
			$( '.'+ k ).eq( i ).val( R[ k ][ i ] || sub );
		} );
	}
	$( '#timer' ).val( R.timer );
	for ( i = 1; i < 4; i++ ) $( '.ond' ).eq( i - 1 ).prop( 'disabled', ! R.on[ i ] );
	showContent();
	renderSelect();
	$( '.on, .off' ).on( 'select2:open', () => {
		setTimeout( () => renderSelect( 'open' ), 0 );
	} ).on( 'select2:select', function() {
		renderSelect();
	} );
}
function renderSelect( open ) {
	$( open ? '.select2-results__options li' : '.select2-selection__rendered' ).each( ( i, el ) => {
		$( el ).html( $( el ).text().replace( '(none)', '<gr>(none)</gr>' ) );
	} );
}
