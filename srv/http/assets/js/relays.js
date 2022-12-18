$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

R = {}
var values0;

$( '.gpio-no' ).addClass( 'hide' );

$( '.container' ).on( 'change', 'select', function() {
	if ( this.id.slice( 0, 3 ) === 'pin' ) {
		var i    = +this.id.slice( -1 );
		var val  = +this.value;
		var val0 = R.pin[ i ];
		R.on.forEach( ( el, i ) => {
			if ( el == val0 ) R.on[ i ] = val;
		} );
		R.off.forEach( ( el, i ) => {
			if ( el == val0 ) R.off[ i ] = val;
		} );
	}
	refreshValues();
} );
$( 'input' ).keyup( refreshValues );
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	R = {}
	renderPage( false );
} );
$( '#save' ).off( 'click' ).click( function() {
	var onorder  = [];
	var offorder = [];
	for ( i = 0; i < 4; i++ ) {
		onorder.push(  $( '#on'+ i +' option:selected' ).text() );
		offorder.push( $( '#off'+ i+' option:selected' ).text() );
	}
	var cmd = [
				  'save'
				, 'pin=\'[ '+ R.pin.join( ',' ) +' ]\''
				, 'name=\'[ "'+ R.name.join( '","' ) +'" ]\''
				, 'onorder=\'[ "'+ onorder.join( '","' ) +'" ]\''
				, 'offorder=\'[ "'+ offorder.join( '","' ) +'" ]\''
				, 'on=( '+ R.on.join( ' ' ) +' )'
				, 'ond=( '+ R.ond.join( ' ' ) +' )'
				, 'off=( '+ R.off.join( ' ' ) +' )'
				, 'offd=( '+ R.offd.join( ' ' ) +' )'
				, 'timer='+ R.timer
	];
	bash( cmd );
	banner( 'relays', 'Relays', 'Change ...' );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function refreshValues() {
	$( '#gpio-num .pin' ).each( ( i, el ) => R.pin[ i ]  = +$( el ).val() );
	$( '.name' ).each(          ( i, el ) => R.name[ i ] = $( el ).val() );
	$( '.on.delay' ).each(      ( i, el ) => R.ond[ i ]  = R.on[ i + 1 ]  ? +$( el ).val() : 0 );
	$( '.off.delay' ).each(     ( i, el ) => R.offd[ i ] = R.off[ i + 1 ] ? +$( el ).val() : 0 );
	R.timer = +$( '#timer' ).val();
	var values  = [].concat.apply( [], Object.values( R ) ).toString();
	renderPage( values !== V.values );
}
function renderPage( changed ) {
	if ( ! ( 'pin' in R ) ) {
		R       = JSON.parse( JSON.stringify( V ) );
		values0 = [].concat.apply( [], Object.values( V ) ).toString();
	}
	$( '#save' ).toggleClass( 'disabled', V.enabled && ! changed )
	$( '#undo' ).toggleClass( 'disabled', ! changed )
	var optnamepin = '<option value="0">--- none ---</option>';
	for ( i = 0; i < 4; i++ ) optnamepin += '<option value="'+ R.pin[ i ] +'">'+ R.name[ i ] || '(no name)' +'</option>';
	var htmlon  = '';
	var htmloff = '';
	var optsec  = '<option value="0">0</option>';
	for ( i = 1; i < 11; i++ ) optsec += '<option value="'+ i +'">'+ i +'</option>';
	htmlsec     = '</select><span class="sec">sec.</span>';
	for ( i = 0; i < 4; i++ ) {
		htmlon  +=  '<select id="on'+ i +'" class="on pin">'+ optnamepin +'</select>';
		htmloff += '<select id="off'+ i +'" class="off pin">'+ optnamepin +'</select>';
		if ( i < 3 ) {
			htmlon  += '<select id="ond'+ i +'" class="on delay">'+ optsec + htmlsec;
			htmloff += '<select id="offd'+ i +'" class="off delay">'+ optsec + htmlsec;
		}
	}
	$( '#timer' )
		.html( optsec )
		.find( 'option[value='+ R.timer +']' ).prop( 'selected', 1 );
	$( '#on' ).html( htmlon );
	$( '#off' ).html( htmloff );
	for ( i = 0; i < 4; i++ ) {
		$( '#pin'+ i ).val(  R.pin[ i ] );
		$( '#name'+ i ).val( R.name[ i ] );
		$( '#on'+ i ).val(   R.on[ i ] );
		$( '#off'+ i ).val(  R.off[ i ] );
		$( '#ond'+ i ).val(  R.ond[ i ] );
		$( '#offd'+ i ).val( R.offd[ i ] );
	}
	$( '.ond, .offd' ).prop( 'disabled', 0 );
	var $el0 = $( '.on, .off' ).filter( ( i, el ) => {
		var $this = $( el );
		return ! $this.hasClass( 'delay' ) && $this.val() == 0;
	} );
	if ( $el0.length ) {
		$el0.find( '.label' ).addClass( 'gr' );
		$el0.prop( 'disabled', 1 );
	}
	showContent();
	$( '#on > .select2' ).odd().css( 'cssText', 'width:70px !important' );
	$( '#off > .select2' ).odd().css( 'cssText', 'width:70px !important' );
}
