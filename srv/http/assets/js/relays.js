$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

renderPage = function( list ) {
	if ( list ) {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
			if ( !list2G ) return
		} else {
			G = list;
		}
		D = { val : {}, key : {} };
		D.keys = [ 'pin', 'name', 'on', 'off', 'ond', 'offd' ];
		D.keys.forEach( function( k ) {
			D.val[ k ] = G[ k ];
		} );
		D.val.timer = G.timer;
		D.values = [].concat.apply( [], Object.values( D.val ) ).toString();
		$( '.infobtn' ).addClass( 'disabled' )
	}
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) optnamepin += '<option value="'+ D.val.pin[ i ] +'">'+ D.val.name[ i ] || '(no name)' +'</option>';
	var htmlon = '';
	var htmloff = '';
	var optsec = '<option value="0">0</option>';
	for ( i = 1; i < 11; i++ ) optsec += '<option value="'+ i +'">'+ i +'</option>';
	htmlsec = '</select><span class="sec">sec.</span>';
	for ( i = 0; i < 4; i++ ) {
		htmlon +=  '<select id="on'+ i +'" class="on">'+ optnamepin +'</select>';
		htmloff += '<select id="off'+ i +'" class="off">'+ optnamepin +'</select>';
		if ( i < 3 ) {
			htmlon += '<select id="ond'+ i +'" class="on delay">'+ optsec + htmlsec;
			htmloff += '<select id="offd'+ i +'" class="off delay">'+ optsec + htmlsec;
		}
	}
	$( '#timer' )
		.html( optsec )
		.find( 'option[value='+ D.val.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i = 0; i < 4; i++ ) {
		$( '#pin'+ i ).val( D.val.pin[ i ] );
		$( '#name'+ i ).val( D.val.name[ i ] );
		$( '#on'+ i ).val( D.val.on[ i ] )
		$( '#off'+ i ).val( D.val.off[ i ] )
		$( '#ond'+ i ).val( D.val.ond[ i ] )
		$( '#offd'+ i ).val( D.val.offd[ i ] )
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
function renderUpdate() {
	[ 'on', 'off', 'ond', 'offd' ].forEach( function( k ) {
		D.val[ k ] = [];
		var zero = [];
		var L = k.slice( -1 ) === 'd' ? 3 : 4;
		for ( i = 0; i < L; i ++ ) $( '#'+ k + i ).val() != 0 ? D.val[ k ].push( +$( '#'+ k + i ).val() ) : zero.push( 0 );
		D.val[ k ] = D.val[ k ].concat( zero );
	} );
	[ 'pin', 'name' ].forEach( function( k ) {
		D.val[ k ] = [];
		for ( i = 0; i < 4; i ++ ) {
			var val = $( '#'+ k + i ).val();
			if ( k === 'pin') val = +val;
			D.val[ k ].push( val );
		}
	} );
	D.val.timer = $( '#timer' ).val();
	var values = [].concat.apply( [], Object.values( D.val ) ).toString();
	$( '.infobtn' ).toggleClass( 'disabled', values === D.values );
	renderPage();
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
		renderUpdate();
	} ).on( 'keyup', 'input', renderUpdate );
$( '.infobtn' ).off( 'click' );
	
$( '#undo' ).click( function() {
	renderPage( G );
	$( '.infobtn' ).addClass( 'disabled' );
} );
$( '#save' ).off( 'click' ).click( function() {
	var names = {}
	for ( i = 0; i < 4; i++ ) names[ D.val.pin[ i ] ] = D.val.name[ i ];
	var onorder = [];
	var offorder = [];
	for ( i = 0; i < 4; i++ ) {
		var on = D.val.on[ i ];
		var off = D.val.off[ i ];
		if ( on ) onorder.push( names[ on ] );
		if ( off ) offorder.push( names[ off ] );
	}
	var values = 'pin=\'[ "'+ D.val.pin.join( '","' ) +'" ]\'\\n'
				+'name=\'[ "'+ D.val.name.join( '","' ) +'" ]\'\\n'
				+'onorder=\'[ "'+ onorder.join( '","' ) +'" ]\'\\n'
				+'offorder=\'[ "'+ offorder.join( '","' ) +'" ]\'\\n'
				+'on=( '+ D.val.on.join( ' ' ) +' )\\n'
				+'ond=( '+ D.val.ond.join( ' ' ) +' )\\n'
				+'off=( '+ D.val.off.join( ' ' ) +' )\\n'
				+'offd=( '+ D.val.offd.join( ' ' ) +' )\\n'
				+'timer='+ D.val.timer;
	bash( [ 'relaysset', values ] );
	banner( 'Relays', 'Change ...', 'relays' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
