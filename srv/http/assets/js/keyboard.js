$( '#keyboard' ).find( '.capslock, .shift' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	$( '#ka, #kA' ).toggleClass( 'hide' );
	if ( $( this ).hasClass( 'capslock' ) ) {
		$( '#keyboard .capslock' ).toggleClass( 'bll', $( '#ka' ).hasClass( 'hide' ) );
	} else {
		$( '#keyboard .capslock' ).removeClass( 'bll' );
	}
} );
$( '#keyboard .numeric' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	var $this  = $( this );
	var $kn    = $( '#kn' );
	var $shift = $( '#keyboard' ).find( '.capslock, .shift' );
	if ( $kn.hasClass( 'hide' ) ) {
		$this.text( 'abc' );
		$( '#ka, #kA' ).addClass( 'hide' );
		$kn.removeClass( 'hide' );
		$shift.addClass( 'disabled' );
	} else {
		$this.text( '12!@' );
		$( '#ka' ).removeClass( 'hide' );
		$kn.addClass( 'hide' );
		$shift.removeClass( 'disabled' );
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
	var numeric  = ! $( '#kn' ).hasClass( 'hide' );
	if ( cap && ! capslock && ! numeric ) $( '#ka, #kA' ).toggleClass( 'hide' );
	keyboardSet( $( this ).text() );
} );
var inputs = 'input[type=text], input[type=passowrd], textarea';
$( 'body' ).on( 'click', inputs, function() {
	$( '#keyboard' ).removeClass( 'hide' );
	$( inputs ).removeClass( 'active' );
	$( this ).addClass( 'active' );
	V.index = this.selectionStart;
} ).on( 'click touchstart', function( e ) {
	$kb = $( '#keyboard' );
	if ( ! $kb.hasClass( 'hide' ) && ! $( e.target ).is( inputs ) && ! $( e.target ).closest( '#keyboard' ).length ) {
		$kb.addClass( 'hide' );
		delete V.index;
	}
} );
function keyboardSet( t ) {
	var val = $( 'input.active' ).val();
	if ( t ) {
		var value = V.index === val.length ? val + t : val.slice( 0, V.index ) + t + val.slice( V.index );
		V.index++;
	} else {
		var value = V.index === val.length ? val.slice( 0, -1 ) : val.slice( 0, V.index - 1 ) + val.slice( V.index );
		V.index--;
	}
	$( 'input.active' )
		.val( value )
		.trigger( 'input' );

}
