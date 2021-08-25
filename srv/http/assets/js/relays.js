$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function refreshData() {
	var n = [ 'pins', 'names', 'on', 'off' ];
	n.forEach( function( c ) {
		G.v[ c ] = [];
		G.k[ c ].forEach( function( id ) {
			G.v[ c ].push( $( '#'+ id ).val() );
		} );
	} );
	G.v.timer = $( '#timer' ).val();
	var values = [ ...G.v.pins, ...G.v.names, ...G.v.on, ...G.v.off, G.v.timer ].toString();
	renderPage();
	$( '.infobtn' ).toggleClass( 'disabled', values === G.values );
}
renderPage = function( list ) {
	if ( list ) {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
			if ( !list2G ) return
		} else {
			G = list;
		}
		G.v = [];
		G.v.pins = Object.keys( G.name );
		G.v.names = Object.values( G.name );
		G.v.timer = G.timer;
		G.v.on = Object.values( G.on );
		G.v.off = Object.values( G.off );
		G.values = [ ...G.v.pins, ...G.v.names, ...G.v.on, ...G.v.off, G.v.timer ].toString();
		G.k = {}
		G.k.pins = [ 'pin1', 'pin2', 'pin3', 'pin4' ];
		G.k.names = [ 'name1', 'name2', 'name3', 'name4' ];
		G.k.on = Object.keys( G.on );
		G.k.off = Object.keys( G.off );
	}
	var pin, namepin;
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) {
		pin = G.v.pins[ i ];
		namepin = ( G.v.names[ i ] || '(no name)' ) +' - '+ pin;
		optnamepin += '<option value="'+ pin +'">'+ namepin +'</option>';
	}
	var htmlon = '';
	var htmloff = '';
	var optsec = '<option value="0">0</option>';
	for ( i = 1; i < 11; i++ ) optsec += '<option value="'+ i +'">'+ i +'</option>';
	htmlsec = '</select><span class="sec">sec.</span>';
	for ( i = 1; i < 5; i++ ) {
		htmlon +=  '<select id="on'+ i +'" class="on">'+ optnamepin +'</select>';
		htmloff += '<select id="off'+ i +'" class="off">'+ optnamepin +'</select>';
		if ( i < 4 ) {
			htmlon += '<select id="ond'+ i +'" class="on delay">'+ optsec + htmlsec;
			htmloff += '<select id="offd'+ i +'" class="off delay">'+ optsec + htmlsec;
		}
	}
	$( '#timer' )
		.html( optsec )
		.find( 'option[value='+ G.v.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i = 0; i < 7; i++ ) {
		if ( i > 0 && i < 5 ) {
			$( '#pin'+ i ).val( G.v.pins[ i - 1 ] );
			$( '#name'+ i ).val( G.v.names[ i - 1 ] );
		}
		$( '.on' ).eq( i ).val( G.v.on[ i ] )
		$( '.off' ).eq( i ).val( G.v.off[ i ] )
	}
	if ( list ) {
		$( 'select' ).selectric();
		$( '.selectric-input' ).prop( 'readonly', true ); // suppress soft keyboard
	} else {
		$( 'select' ).selectric( 'refresh' );
	}
	$( '.selectric-ond, .selectric-offd' ).removeClass( 'disabled' );
	$( '.selectric .label' ).removeClass( 'gr' );
	var $el0 = $( '.on, .off' ).filter( function() {
		return !$( this ).hasClass( 'delay' ) && $( this ).val() == 0;
	} ).parent().parent();
	$el0.find( '.label' ).addClass( 'gr' );
	$el0.prev().prev()
		.addClass( 'disabled' )
		.find( '.label' ).addClass( 'gr' );
	showContent();
}
// disable default > re-enable
$( 'body' )
	.off( 'change', 'select' )
	.off( 'keyup', 'input' )
	.on( 'change', 'select', refreshData )
	.on( 'keyup', 'input', refreshData );
$( '.infobtn' ).off( 'click' );
	
$( '#undo' ).click( function() {
	renderPage( G );
	$( '.infobtn' ).addClass( 'disabled' );
} );
$( '#save' ).off( 'click' ).click( function() {
	var values = {
		  name  : {}
		, on    : {}
		, off   : {}
		, timer : G.v.timer
	}
	for( i = 0; i < 4; i++ ) {
		values.name[ G.v.pins[ i ] ] = G.v.names[ i ];
	}
	for( i = 0; i < 7; i++ ) {
		values.on[ G.k.on[ i ] ] = G.v.on[ i ];
		values.off[ G.k.off[ i ] ] = G.v.off[ i ];
	}
	bash( [ 'relaysset', JSON.stringify( values ) ] );
	banner( 'Relays', 'Change ...', 'relays' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
