$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.gpio-no' ).addClass( 'hide' );

$( 'select' ).change( refreshValues );
$( 'input' ).keyup( refreshValues );
$( '.back' ).click( function() {
	location.href = 'settings.php?p=system';
} );
$( '#undo' ).click( function() {
	R = JSON.parse( JSON.stringify( S ) );
	renderPage();
	$( '#undo' ).addClass( 'disabled' )
} );
$( '#save' ).off( 'click' ).click( function() {
	var onorder  = [];
	var offorder = [];
	for ( i = 0; i < 4; i++ ) {
		onorder.push(  $( '.on' ).eq( i ).find( 'option:selected' ).text() );
		offorder.push( $( '.off' ).eq( i ).find( 'option:selected' ).text() );
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
	setTimeout( () => { // fix select2 not ready
		$( '.pin' ).each(  ( i, el ) => R.pin[ i ]  = +$( el ).val() );
		$( '.name' ).each( ( i, el ) => R.name[ i ] = $( el ).val() );
		$( '.on' ).each(   ( i, el ) => R.on[ i ]   = +$( el ).val() );
		$( '.off' ).each(  ( i, el ) => R.off[ i ]  = +$( el ).val() );
		$( '.ond' ).each(  ( i, el ) => R.ond[ i ]  = R.on[ i + 1 ]  ? +$( el ).val() : 0 );
		$( '.offd' ).each( ( i, el ) => R.offd[ i ] = R.off[ i + 1 ] ? +$( el ).val() : 0 );
		R.timer     = +$( '#timer' ).val();
		$( '.infobtn' ).toggleClass( 'disabled', V === JSON.stringify( R ) )
	}, 0 );
}
function renderPage() {
	V = JSON.stringify( S );
	R = JSON.parse( V );
	$( '#save' ).toggleClass( 'disabled', S.enabled )
	for ( i = 0; i < 4; i++ ) {
		$( '.pin' ).eq( i ).val(  R.pin[ i ] );
		$( '.name' ).eq( i ).val( R.name[ i ] );
		$( '.on' ).eq( i ).val(   R.on[ i ] );
		$( '.off' ).eq( i ).val(  R.off[ i ] );
		$( '.ond' ).eq( i ).val(  R.ond[ i ] );
		$( '.offd' ).eq( i ).val( R.offd[ i ] );
	}
	$( '#timer' ).val( R.timer );
	var $el0 = $( '.on, .off' ).filter( ( i, el ) => {
		var $this = $( el );
		return ! $this.hasClass( 'delay' ) && $this.val() == 0;
	} );
	if ( $el0.length ) $el0.find( '.label' ).addClass( 'gr' );
	showContent();
	$( '#on > .select2' )
		.odd()
		.add( $( '#off > .select2' ).odd() )
		.css( 'cssText', 'width:70px !important' );
}
