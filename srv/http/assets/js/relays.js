$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.gpio-no' ).addClass( 'hide' );

renderPage = function( changed ) {
	if ( typeof D === 'undefined' ) {
		D = { val : {}, key : {} };
		D.keys = [ 'pin', 'name', 'on', 'off', 'ond', 'offd' ];
		D.keys.forEach( function( k ) {
			D.val[ k ] = G[ k ];
		} );
		D.val.timer = G.timer;
		D.values = [].concat.apply( [], Object.values( D.val ) ).toString();
	}
	$( '#save' ).toggleClass( 'disabled', G.enabled && !changed )
	$( '#undo' ).toggleClass( 'disabled', !changed )
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
	if ( !$( '.selectric-input' ).length ) {
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
//	if ( !G.enabled ) $( '#undo' ).removeClass( 'disabled' );
	showContent();
}
function renderUpdate() {
	D.keys.forEach( function( k ) {
		D.val[ k ] = [];
	} );
	for ( i = 0; i < 4; i ++ ) {
		D.val.pin.push( +$( '#pin'+ i ).val() );
		D.val.name.push( $( '#name'+ i ).val() );
	}
	[ 'on', 'off' ].forEach( function( k ) {
		var v0 = [];
		for ( i = 0; i < 4; i ++ ) {
			var v = +$( '#'+ k + i ).val();
			v ? D.val[ k ].push( v ) : v0.push( 0 );
		}
		D.val[ k ] = D.val[ k ].concat( v0 );
	} );
	for ( i = 0; i < 3; i ++ ) {
		D.val.ond.push( D.val.on[ i + 1 ] ? +$( '#ond'+ i ).val() : 0 );
		D.val.offd.push( D.val.off[ i + 1 ] ? +$( '#offd'+ i ).val() : 0 );
	}
	D.val.timer = +$( '#timer' ).val();
	var values = [].concat.apply( [], Object.values( D.val ) ).toString();
	renderPage( values !== D.values );
}
// disable default > re-enable
$( '.container' )
	.off( 'change', 'select' ).on( 'change', 'select', renderUpdate )
	.off( 'keyup', 'input' ).on( 'keyup', 'input', renderUpdate );
$( '.infobtn' ).off( 'click' );
	
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	delete D;
	renderPage( false );
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
	var values = 'pin=\'[ '+ D.val.pin.join( ',' ) +' ]\'\\n'
				+'name=\'[ "'+ D.val.name.join( '","' ) +'" ]\'\\n'
				+'onorder=\'[ "'+ onorder.join( '","' ) +'" ]\'\\n'
				+'offorder=\'[ "'+ offorder.join( '","' ) +'" ]\'\\n'
				+'on=( '+ D.val.on.join( ' ' ) +' )\\n'
				+'ond=( '+ D.val.ond.join( ' ' ) +' )\\n'
				+'off=( '+ D.val.off.join( ' ' ) +' )\\n'
				+'offd=( '+ D.val.offd.join( ' ' ) +' )\\n'
				+'timer='+ D.val.timer;
	bash( [ 'save', values ] );
	banner( 'relays', 'Relays', 'Change ...' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
