$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function refreshData() {
	var n = [ 'pins', 'names', 'on', 'off' ];
	n.forEach( function( c ) {
		D.val[ c ] = [];
		D.key[ c ].forEach( function( id ) {
			D.val[ c ].push( $( '#'+ id ).val() );
		} );
	} );
	D.val.timer = $( '#timer' ).val();
	var values = [ ...D.val.pins, ...D.val.names, ...D.val.on, ...D.val.off, D.val.timer ].toString();
	renderPage();
	$( '.infobtn' ).toggleClass( 'disabled', values === D.valalues );
}
renderPage = function( list ) {
	if ( list ) {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
			if ( !list2G ) return
		} else {
			G = list;
		}
		D = {
			  val : {}
			, key : {}
		}
		D.val.pins = Object.keys( G.name );
		D.val.names = Object.values( G.name );
		D.val.timer = G.timer;
		D.val.on = Object.values( G.on );
		D.val.off = Object.values( G.off );
		D.valalues = [ ...D.val.pins, ...D.val.names, ...D.val.on, ...D.val.off, D.val.timer ].toString();
		D.key.pins = [ 'pin1', 'pin2', 'pin3', 'pin4' ];
		D.key.names = [ 'name1', 'name2', 'name3', 'name4' ];
		D.key.on = Object.keys( G.on );
		D.key.off = Object.keys( G.off );
		$( '.infobtn' ).addClass( 'disabled' )
	}
	var pin, namepin;
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) {
		pin = D.val.pins[ i ];
		namepin = ( D.val.names[ i ] || '(no name)' ) +' - '+ pin;
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
		.find( 'option[value='+ D.val.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i = 0; i < 7; i++ ) {
		if ( i > 0 && i < 5 ) {
			$( '#pin'+ i ).val( D.val.pins[ i - 1 ] );
			$( '#name'+ i ).val( D.val.names[ i - 1 ] );
		}
		$( '.on' ).eq( i ).val( D.val.on[ i ] )
		$( '.off' ).eq( i ).val( D.val.off[ i ] )
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
	} ).parent().parent(); // 2-up: selectric-wrapper
	if ( $el0.length ) {
		$el0.find( '.label' ).addClass( 'gr' );
		$el0.prev().prev() // 1-prv: sec. suffix; 2-prev: selectric-wrapper delay
			.addClass( 'disabled' );
	}
	showContent();
}
// disable default > re-enable
$( '.container' )
	.off( 'change', 'select' )
	.off( 'keyup', 'input' )
	.on( 'change', 'select', function() {
		var $this = $( this );
		if ( $this.val() == 0 ) {
			if ( $this.hasClass( 'on' ) ) {
				var i = $( '.on' ).index( this );
				if ( [ 2, 4, 6 ].indexOf( i ) !== -1 ) $( '.on' ).eq( i -1 ).val( 0 );
			} else if ( $this.hasClass( 'off' ) ) {
				var i = $( '.off' ).index( this );
				if ( [ 2, 4, 6 ].indexOf( i ) !== -1 ) $( '.off' ).eq( i -1 ).val( 0 );
			}
		}
		refreshData();
	} ).on( 'keyup', 'input', refreshData );
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
		, timer : D.val.timer
	}
	for( i = 0; i < 4; i++ ) {
		values.name[ D.val.pins[ i ] ] = D.val.names[ i ];
	}
	for( i = 0; i < 7; i++ ) {
		values.on[ D.key.on[ i ] ] = D.val.on[ i ];
		values.off[ D.key.off[ i ] ] = D.val.off[ i ];
	}
	bash( [ 'relaysset', JSON.stringify( values ) ] );
	banner( 'Relays', 'Change ...', 'relays' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
