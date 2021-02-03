$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var newvalues, pinprev, pinmatch;

function data2json() {
	var form = document.getElementById( 'relaysform' );
	var data = Object.fromEntries( new FormData( form ).entries() );
	for( key in data ) {
		var name = {}
		var onv = [ 0 ];
		var offv = [ 0 ];
		for ( i = 1; i < 5; i++ ) {
			name[ data[ 'pin'+ i ] ] = data[ 'name'+ i ];
			if ( data[ 'on'+ i ] != 0 ) onv.push( data[ 'on'+ i ] );
			if ( i < 4 && data[ 'on'+ ( i + 1 ) ] != 0 ) onv.push( data[ 'ond'+ i ] );
			if ( data[ 'off'+ i ] != 0 ) offv.push( data[ 'off'+ i ] );
			if ( i < 4 && data[ 'off'+ ( i + 1 ) ] != 0 ) offv.push( data[ 'offd'+ i ] );
		}
	}
	var padon = 8 - onv.length;
	if ( padon ) onv = onv.concat( Array( padon ).fill( 0 ) );
	var padoff = 8 - offv.length;
	if ( padoff ) offv = offv.concat( Array( padoff ).fill( 0 ) );
	pinmatch = padon === padoff ? 1 : 0;
	
	var onk = [ 0, 'on1', 'ond1', 'on2', 'ond2', 'on3', 'ond3', 'on4' ];
	var offk = [ 0, 'off1', 'offd1', 'off2', 'offd2', 'off3', 'offd3', 'off4' ];
	var on = {}
	var off = {}
	for ( i = 1; i < 8; i++ ) {
		on[ onk[ i ] ] = +onv[ i ];
		off[ offk[ i ] ] = +offv[ i ];
	}
	newvalues = {
		  name  : name
		, on    : on
		, off   : off
		, timer : +data.timer
	}
	return newvalues
}
function dataDiff() {
	setColorNone();
	var json1 = relaysset;
	var json2 = data2json();
	if ( json1.timer !== json2.timer ) {
		$( '.btn' ).removeClass( 'disabled' );
		return
	}
	var on1 = json1.on;
	var on2 = json2.on;
	var off1 = json1.off;
	var off2 = json2.off;
	for ( i = 1; i < 4; i++ ) {
		if ( on1[ 'ond' + i ] !== on2[ 'ond' + i ] || off1[ 'offd' + i ] !== off2[ 'offd' + i ] ) {
			$( '.btn' ).removeClass( 'disabled' );
			return
		}
	}
	for ( i = 1; i < 5; i++ ) {
		if ( on1[ 'on' + i ] !== on2[ 'on' + i ] || off1[ 'off' + i ] !== off2[ 'off' + i ] ) {
			$( '.btn' ).removeClass( 'disabled' );
			return
		}
	}
	var pins1 = Object.keys( json1.name );
	var pins2 = Object.keys( json2.name );
	var names1 = Object.values( json1.name );
	var names2 = Object.values( json2.name );
	for ( i = 0; i < 4; i++ ) {
		if ( pins1[ i ] !== pins2[ i ] || names1[ i ] !== names2[ i ] ) {
			$( '.btn' ).removeClass( 'disabled' );
			return
		}
	}
	$( '.btn' ).addClass( 'disabled' );
}
function renderOptions( json ) {
	var r = json;
	var pins = Object.keys( r.name );
	var names = Object.values( r.name );
	var name, pin;
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) {
		pin = pins[ i ];
		namepin = ( names[ i ] || '(no name)' ) +' - '+ pin;
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
		.find( 'option[value='+ r.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i=1; i < 5; i++ ) {
		$( '#pin'+ i ).val( pins[ i - 1 ] );
		var ex = pins.slice( 0 ); // clone
		ex.splice( i - 1, 1 );
		for ( x = 0; x < 3; x++ ) $( '#pin'+ i +' option[value='+ ex[ x ] +']' ).toggleClass( 'hide' );
		$( '#name'+ i ).val( names[ i - 1 ] );
		$( '#on'+ i +' option[value='+ r.on[ 'on'+ i ] +']' ).prop( 'selected', 1 );
		$( '#off'+ i +' option[value='+ r.off[ 'off'+ i ] +']' ).prop( 'selected', 1 );
		if ( i < 4 ) {
			$( '#ond'+ i +' option[value='+ r.on[ 'ond'+ i ] +']' ).prop( 'selected', 1 );
			$( '#offd'+ i +' option[value='+ r.off[ 'offd'+ i ] +']' ).prop( 'selected', 1 );
		}
	}
	$( 'select' ).selectric();
	setColorNone();
}
function setColorNone() {
	$( '.selectric .label' ).filter( function() {
		return $( this ).text() === '--- none ---'
	} ).addClass( 'gr' );
}

renderOptions( relaysset );

$( '.close-root' ).click( function() {
	location.href = '/';
} );
$( '#help' ).click( function() {
	$( this ).toggleClass( 'blue' );
	$( '.help-block' ).toggleClass( 'hide' );
} );
$( '#gpioimgtxt' ).click( function() {
	if ( $( '#gpiopin' ).is( ':hidden' ) && $( '#gpiopin1' ).is( ':hidden' ) ) {
		$( '#gpiopin' ).slideToggle();
		$( '#fliptxt' ).toggle();
		$( this ).find( 'i' ).toggleClass( 'fa-chevron-down fa-chevron-up' );
	} else {
		$( '#gpiopin, #gpiopin1' ).css( 'display', 'none' );
		$( '#fliptxt' ).hide();
		$( this ).find( 'i' )
			.removeAttr( 'class' )
			.addClass( 'fa fa-chevron-down' );
	}
} );
$( '#gpiopin, #gpiopin1' ).click( function() {
	$( '#gpiopin, #gpiopin1' ).toggle();
} );
$( '.name' ).keyup( function() {
	dataDiff();
} ).change( function() {
	renderOptions( data2json() );
} );
$( '#gpio-num' ).on( 'mousedown touchdown', function( e ) {
	pinprev = Number( $( e.target ).parent().prev().find( 'option:selected' ).val() );
} );
$( '.pin' ).change( function() {
	var pinnew = Number( $( this ).find( 'option:selected' ).val() );
	var r = data2json();
	[ r.on, r.off ].forEach( function( json ) {
		$.each( json, function( k, v ) {
			if ( v === pinprev ) json[ k ] = pinnew;
		} );
	} );
	$( 'select' ).selectric( 'refresh' );
	renderOptions( r );
	dataDiff();
} );
$( '#timer' ).change( function() {
	dataDiff();
} );
$( '#on, #off' ).change( function( e ) {
	if ( $( e.target ).find( 'option:selected' ).val() == 0 ) {
		var id = e.target.id;
		var i = id.slice( -1 ) - 1;
		if ( i ) $( '#'+ id.slice( 0, -1 ) +'d'+ i +' option:eq( 0 )' ).prop( 'selected', 1 );
	}
	renderOptions( data2json() );
	dataDiff();
} );
$( '#undo' ).click( function() {
	renderOptions( relaysset );
	$( '.btn' ).addClass( 'disabled' );
} );
$( '#save' ).click( function() {
	if ( !pinmatch ) {
		info( {
			  icon    : 'relays'
			, title   : 'GPIO Relays'
			, message : 'Number of equipments not matched.'
		} );
		return
	}
	$.post(
		'/cmd.php'
		, { cmd: 'sh' , sh: [ 'system.sh', 'relayssave', JSON.stringify( newvalues ) ] }
		, function() {
			relaysset = newvalues;
			$( '.btn' ).addClass( 'disabled' );
			$( '#bannerMessage' ).text( 'Done' );
			setTimeout( bannerHide, 2000 );
		}
	);
	banner( 'GPIO Relays', 'Change ...', 'relays' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
