$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

renderPage = function( list ) {
	if ( list ) {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
			if ( !list2G ) return
		} else {
			G = list;
		}
		D = {
			  val : {
				  pin   : Object.keys( G.name )
				, name  : Object.values( G.name )
			}
			, key : {}
		};
		[ 'on', 'off', 'ond', 'offd', 'timer' ].forEach( function( k ) {
			D.val[ k ] = G[ k ];
		} );
		D.keys = [ 'pin', 'name', 'on', 'off', 'ond', 'offd' ];
		var k;
		for ( i = 0; i < 6; i++ ) {
			k = D.keys[ i ]
			D.key[ k ] = [];
			for ( j = 0; j < 4; j++ ) {
				if ( i > 3 && j > 2 ) continue 
				D.key[ k ].push( k + j );
			}
		}
		D.values = [].concat.apply( [], Object.values( D.val ) ).toString();
		$( '.infobtn' ).addClass( 'disabled' )
	}
	var pin, namepin;
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) {
		pin = D.val.pin[ i ];
		namepin = ( D.val.name[ i ] || '(no name)' ) +' - '+ pin;
		optnamepin += '<option value="'+ pin +'">'+ namepin +'</option>';
	}
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
	D.keys.forEach( function( k ) {
		D.val[ k ] = [];
		D.key[ k ].forEach( function( id ) {
			D.val[ k ].push( $( '#'+ id ).val() );
		} );
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
	var v = {
		  name: {}
		, timer : +D.val.timer
	};
	[ 'on', 'off', 'ond', 'offd', 'onorder', 'offorder' ].forEach( function( k ) {
		v[ k ] = [];
	} );
	for( i = 0; i < 4; i++ ) {
		v.name[ D.val.pin[ i ] ] = D.val.name[ i ];
		v.on.push( +D.val.on[ i ] );
		v.off.push( +D.val.off[ i ] );
		if ( i < 3 ) {
			v.ond.push( +D.val.ond[ i ] );
			v.offd.push( +D.val.offd[ i ] );
		}
	}
	v.on.forEach( function( p ) {
		if ( p ) v.onorder.push( v.name[ p ] );
	} );
	v.off.forEach( function( p ) {
		if ( p ) v.offorder.push( v.name[ p ] );
	} );
	var values = 'onorder=\'[ "'+ v.onorder.join( '","' ) +'" ]\'\\n'
				+'on=( '+ v.on.join( ' ' ) +' )\\n'
				+'ond=( '+ v.ond.join( ' ' ) +' )\\n'
				+'offorder=\'[ "'+ v.offorder.join( '","' ) +'" ]\'\\n'
				+'off=( '+ v.off.join( ' ' ) +' )\\n'
				+'offd=( '+ v.offd.join( ' ' ) +' )\\n'
				+'timer='+ v.timer +'\\n'
				+'name=\''+ JSON.stringify( v.name ) + "'";
	bash( [ 'relaysset', values ] );
	banner( 'Relays', 'Change ...', 'relays' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
