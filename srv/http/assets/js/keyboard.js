$( '#keyboard .shift' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	var $this = $( this );
	if ( ! V.local ) $( '#ka, #kA' ).toggleClass( 'hide' );
	if ( $this.hasClass( 'bll' ) ) {
		$this.removeClass( 'bll' );
		return
	}
	
	if ( V.local ) {
		$this.addClass( 'bll' );
	} else {
		LOCAL( 600 );
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
	var capslock = $( '#keyboard .shift' ).hasClass( 'bll' );
	if ( ( cap && ! capslock ) || ( ! cap && capslock ) ) $( '#ka, #kA' ).toggleClass( 'hide' );
	keyboardSet( $( this ).text() );
} ).press( {
	  action : e => V.intervalkey = setInterval( () => keyboardSet( $( e.currentTarget ).text() ), 100 )
	, end    : () => {
		clearInterval( V.intervalkey );
		delete V.intervalkey;
	}
} );
$( '#infoOverlay' ).on( 'click', 'input, textarea', function() {
	$( '#keyboard' ).removeClass( 'hide' );
	$( 'input, textarea' ).removeClass( 'active' );
	$( this ).addClass( 'active' );
	V.index = this.selectionStart;
} );
$( 'body' ).on( 'click', function( e ) {
	$kb = $( '#keyboard' );
	if ( ! $kb.hasClass( 'hide' ) && ! $( e.target ).is( 'input, textarea' ) && ! $( e.target ).closest( '#keyboard' ).length ) {
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
		if ( V.index === 0 ) return
		
		var value = last ? val.slice( 0, -1 ) : val.slice( 0, V.index - 1 ) + val.slice( V.index );
		V.index--;
	}
	$( 'input.active' )
		.val( value )
		.trigger( 'input' );

}
