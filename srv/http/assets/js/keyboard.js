$( '#keyboard' ).find( '.capslock, .shift' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	$( '#ka, #kA' ).toggleClass( 'hide' );
	if ( $( this ).hasClass( 'capslock' ) ) {
		$( '#keyboard .capslock' ).toggleClass( 'bll', $( '#ka' ).hasClass( 'hide' ) );
	} else {
		$( '#keyboard .capslock' ).removeClass( 'bll' );
	}
} );
$( '#keyboard .backspace' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	keyboardSet();
} );
$( '#keyboard .enter' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	$( '#infoOk' ).trigger( 'click' );
	$( '#keyboard' ).addClass( 'hide' );
	$( inputs ).removeClass( 'active' );
} );
$( '#keyboard a' ).on( 'click', function() {
	var cap      = $( '#ka' ).hasClass( 'hide' );
	var capslock = $( '#keyboard .capslock' ).hasClass( 'bll' );
	if ( cap && ! capslock ) $( '#ka, #kA' ).toggleClass( 'hide' );
	keyboardSet( $( this ).text() );
} );
var inputs = 'input[type=text], input[type=passowrd], textarea';
$( '#infoOverlay' ).on( 'click', inputs, function() {
	$( '#keyboard' ).removeClass( 'hide' );
	$( inputs ).removeClass( 'active' );
	$( this ).addClass( 'active' );
	V.index = this.selectionStart;
} );
$( 'body' ).on( 'click touchstart', function( e ) {
	$kb = $( '#keyboard' );
	if ( ! $kb.hasClass( 'hide' ) && ! $( e.target ).is( inputs ) && ! $( e.target ).closest( '#keyboard' ).length ) {
		$kb.addClass( 'hide' );
		delete V.index;
	}
} );
function keyboardSet( key ) {
	var val  = $( 'input.active' ).val();
	var last = V.index === val.length;
	if ( key ) {
		var value = last ? val + key : val.slice( 0, V.index ) + key + val.slice( V.index );
		V.index++;
	} else {
		var value = last ? val.slice( 0, -1 ) : val.slice( 0, V.index - 1 ) + val.slice( V.index );
		V.index--;
	}
	$( 'input.active' )
		.val( value )
		.trigger( 'input' );

}
