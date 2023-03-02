$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

types = [ 'pin', 'name', 'on', 'off', 'ond', 'offd' ];

$( 'select' ).change( refreshValues );
$( 'input' ).keyup( refreshValues );
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	R = JSON.parse( JSON.stringify( S ) );
	renderPage();
	$( '#undo' ).addClass( 'disabled' )
	if ( R.enabled ) $( '#save' ).addClass( 'disabled' )
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
		types.forEach( type => {
			R[ type ] = [];
			$( '.'+ type ).each(  ( i, el ) => {
				if ( type === 'name' ) {
					R.name.push( $( el ).val() || 0 );
					return
					
				} else if ( type === 'ond' ) {
					var v = R.on[ i + 1 ] ? $( el ).val() : 0; // none - disable delay
				} else if ( type === 'offd' ) {
					var v = R.off[ i + 1 ] ? $( el ).val() : 0; // none - disable delay
				} else {
					var v = +$( el ).val();
				}
				if ( v !== 0 ) R[ type ].push( v ); // force none to last
			} );
		} );
		R.timer = +$( '#timer' ).val();
		var changed = Ss !== JSON.stringify( R );
		$( '#undo' ).toggleClass( 'disabled', ! changed );
		if ( R.enabled ) $( '#save' ).toggleClass( 'disabled', ! changed );
		renderPage();
	}, 0 );
}
function renderPage() {
	if ( typeof R === 'undefined' ) {
		Ss = JSON.stringify( S );
		R  = JSON.parse( Ss );
		$( '#save' ).toggleClass( 'disabled', R.enabled );
	}
	var optnamepin = '<option value="0">(none)</option>';
	for ( i = 0; i < 4; i++ ) {
		var name = R.name[ i ] || '(no name)';
		optnamepin += '<option value="'+ R.pin[ i ] +'">'+ name +'</option>';
	}
	for ( i = 0; i < 4; i++ ) $( '.on, .off' ).html( optnamepin );
	for ( i = 0; i < 4; i++ ) {
		types.forEach( type => {
			var sub = type === 'name' ? '' : 0;
			$( '.'+ type ).eq( i ).val( R[ type ][ i ] || sub );
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
