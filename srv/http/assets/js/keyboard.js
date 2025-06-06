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
	var $active = $( 'input.active' );
	var val    = $active.val();
	$active.val( val.slice( 0, -1 ) );
	$active.trigger( 'input' );
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
	var $active  = $( 'input.active' );
	var val      = $active.val() + $( this ).text();
	$active.val( val );
	$active.trigger( 'input' );
} );
var inputs = 'input[type=text], input[type=passowrd], textarea';
$( 'body' ).on( 'click', inputs, function() {
	$( '#keyboard' ).removeClass( 'hide' );
	$( inputs ).removeClass( 'active' );
	$( this ).addClass( 'active' );
} ).on( 'click touchstart', function( e ) {
	$kb = $( '#keyboard' );
	if ( ! $kb.hasClass( 'hide' )
		&& ! $( e.target ).is( inputs )
		&& ! $( e.target ).closest( '#keyboard' ).length
	) $kb.addClass( 'hide' );
} );
