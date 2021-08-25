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
		var on = Object.values( G.on );
		var off = Object.values( G.off );
		G.values = [ ...G.v.pins, ...G.v.names, ...on, ...off, G.v.timer ].toString();
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
		htmlon +=  '<select id="on'+ i +'" name="on'+ i +'" class="on">'+ optnamepin +'</select>';
		htmloff += '<select id="off'+ i +'" name="off'+ i +'" class="off">'+ optnamepin +'</select>';
		if ( i < 4 ) {
			htmlon += '<select id="ond'+ i +'" name="ond'+ i +'" class="ond delay">'+ optsec + htmlsec;
			htmloff += '<select id="offd'+ i +'" name="offd'+ i +'" class="offd delay">'+ optsec + htmlsec;
		}
	}
	$( '#timer' )
		.html( optsec )
		.find( 'option[value='+ G.v.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i=1; i < 5; i++ ) {
		$( '#pin'+ i ).val( G.v.pins[ i - 1 ] );
		var ex = G.v.pins.slice( 0 ); // clone
		ex.splice( i - 1, 1 );
		for ( x = 0; x < 3; x++ ) $( '#pin'+ i +' option[value='+ ex[ x ] +']' ).toggleClass( 'hide' );
		$( '#name'+ i ).val( G.v.names[ i - 1 ] );
		$( '#on'+ i +' option[value='+ G.on[ 'on'+ i ] +']' ).prop( 'selected', 1 );
		$( '#off'+ i +' option[value='+ G.off[ 'off'+ i ] +']' ).prop( 'selected', 1 );
		if ( i < 4 ) {
			$( '#ond'+ i +' option[value='+ G.on[ 'ond'+ i ] +']' ).prop( 'selected', 1 );
			$( '#offd'+ i +' option[value='+ G.off[ 'offd'+ i ] +']' ).prop( 'selected', 1 );
		}
	}
	if ( list ) {
		$( 'select' ).selectric();
		$( '.selectric-input' ).prop( 'readonly', true ); // suppress soft keyboard
	} else {
		$( 'select' ).selectric( 'refresh' );
	}
	$( '.selectric-ond, .selectric-offd' ).removeClass( 'disabled' );
	$( '.selectric .label' ).removeClass( 'gr' );
	var $el0 = $( 'select.on, select.off' ).filter( function() {
		return $( this ).val() == 0;
	} ).parent().parent();
	$el0.find( '.label' ).addClass( 'gr' );
	$el0.prev().prev()
		.addClass( 'disabled' )
		.find( '.label' ).addClass( 'gr' );
	showContent();
}
// disable default in shortcut.js
$( 'select' ).off( 'change' );
$( 'input' ).off( 'keyup' );
$( '.infobtn' ).off( 'click' );

$( '.name' ).keyup( function() {
	refreshData();
} );
$( '.pin, #timer' ).change( function() {
	refreshData();
} );
$( '.on, .off' ).change( function( e ) {
	refreshData();
	if ( $( e.target ).find( 'option:selected' ).val() == 0 ) {
		var id = e.target.id;
		var i = id.slice( -1 ) - 1;
		if ( i ) $( '#'+ id.slice( 0, -1 ) +'d'+ i +' option:eq( 0 )' ).prop( 'selected', 1 );
	}
} );
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
