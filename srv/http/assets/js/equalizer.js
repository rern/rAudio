var names, timeout, user;
var freq      = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
var band      = [];
var labelhz   = '';
freq.forEach( ( hz, i ) => {
	band.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) );
	labelhz  += '<a>'+ hz + ( i < 5 ? '' : 'k' ) +'</a>';
} );
var content = `
<div id="eq">
<div class="hz">${ labelhz }</div>
<div class="bottom">
	${ ico( 'minus-circle hide', 'eqdelete' ) }
	${ ico( 'edit-circle', 'eqrename' ) }
	${ ico( 'save disabled hide', 'eqsave' ) }
	<input id="eqname" type="text" class="hide"><select id="eqpreset">PRESETS</select>
	${ ico( 'plus-circle', 'eqnew' ) + ico( 'arrow-left bl hide', 'eqback' ) }
</div>
<div id="infoRange" class="vertical">${ '<input type="range" min="40" max="80">'.repeat( 10 ) }</div>
</div>`;
function equalizer() {
	bash( [ 'equalizerget' ], data => {
		E    = data || { active: "Flat", preset: { Flat: Array.from( new Array( 10 ), () => 62 ) } }
		user = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, content    : content.replace( 'PRESETS', eqOptionPreset() )
			, values     : [ '', E.active, ...E.preset[ E.active ] ]
			, beforeshow : () => {
				$( '#infoBox' ).css( 'width', 550 );
				$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
			}
			, cancel     : () => E = {}
			, okno       : true
		} );
	}, 'json' );
}
function eqPreset( v ) {
	var user = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd'
	bash( { cmd: [ 'equalizer', v, user, 'CMD VALUES USER' ], json: E } );
}
function eqOptionPreset() {
	names         = Object.keys( E.preset ).sort();
	var optpreset = '';
	names.forEach( n => optpreset += '<option>'+ n +'</option>' );
	if ( ! I.active ) return optpreset
	
	local(); // suppress change event
	$( '#eqpreset' )
		.html( optpreset )
		.trigger( 'change' );
	I.values = [ '', E.active, ...E.preset[ E.active ] ];
	infoSetValues();
}

$( '#infoOverlay' ).on( 'click', '#eqrename', function() {
	$( '#eqrename, #eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqdelete, #eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' ).css( 'display', 'inline-block' );
	$( '#eqname' ).val( E.active );
} ).on( 'click', '#eqnew', function() {
	$( '#eqrename, #eqdelete, #eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' ).css( 'display', 'inline-block' );
} ).on( 'click', '#eqback', function() {
	$( '#eqrename, #eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqdelete, #eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
	$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
} ).on( 'keyup paste cut', '#eqname', function( e ) {
	var $eqsave = $( '#eqsave' );
	$eqsave.toggleClass( 'disabled', names.includes( $( this ).val().trim() ) );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.click();
} ).on( 'change', '#eqpreset', function() {      // preset
	if ( V.local ) return
	
	var name = $( this ).val();
	E.active = name;
	I.values = [ '', E.active, ...E.preset[ E.active ] ];
	infoSetValues();
	$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
	eqPreset( E.preset[ name ].join( ' ' ) );
} ).on( 'click', '#eqdelete', function() {       // delete
	delete E.preset[ E.active ];
	E.active = 'Flat';
	eqPreset( E.preset.Flat.join( ' ' ) );
	$( '#eqback' ).click();
	eqOptionPreset();
} ).on( 'click', '#eqsave', function() {
	var name            = $( '#eqname' ).val();
	if ( $( '#eqdelete' ).hasClass( 'hide' ) ) { // new
		E.active         = name;
		E.preset[ name ] = infoVal().slice( 2 );
	} else {                                     // rename
		var oldname      = E.active;
		E.active         = name;
		E.preset[ name ] = E.preset[ oldname ];
		delete E.preset[ oldname ];
	}
	$( '#eqback' ).click();
	bash( { cmd: [ 'equalizer' ], json: E } );
} ).on( 'input', '.vertical', function() {       // slide
	var $this = $( this );
	bash( [ 'equalizerset', band[ $this.index() ], +$this.val(), user, 'CMD BAND VAL USER' ] );
	if ( E.active === 'Flat' ) {
		var newname         = 'New';
		if ( Object.keys( E.preset ).includes( newname ) ) newname += '.1';
		E.active            = newname;
		E.preset[ newname ] = E.preset.Flat;
		eqOptionPreset();
	}
} ).on( 'touchend mouseup keyup', '.vertical', function() {
	E.preset[ E.active ] = infoVal().slice( 2 );
	bash( { cmd: [ 'equalizer' ], json: E } );
	$( '#eqrename' ).removeClass( 'disabled' );
} );
