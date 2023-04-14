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
	$eqsave.toggleClass( 'disabled', $( this ).val().trim() === E.active );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.click();
} ).on( 'change', '#eqpreset', function() {      // preset
	if ( V.local ) return
	
	var name = $( this ).val();
	E.active = name;
	I.values = [ '', E.active, ...E.preset[ E.active ] ];
	infoSetValues();
	$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
	eqCommand( E.preset[ name ].join( ' ' ) );
} ).on( 'click', '#eqdelete', function() {       // delete
	delete E.preset[ E.active ];
	E.active = 'Flat';
	eqCommand( E.preset.Flat.join( ' ' ) );
	$( '#eqback' ).click();
	eqOptionPreset();
} ).on( 'click', '#eqsave', function() {
	var name            = $( '#eqname' ).val();
	if ( $( '#eqdelete' ).hasClass( 'hide' ) ) { // new
		E.active         = name;
		E.preset[ name ] = infoVal().slice( 2 );
		eqCommandName();
	} else {                                     // rename
		var oldname      = E.active;
		E.active         = name;
		E.preset[ name ] = E.preset[ oldname ];
		delete E.preset[ oldname ];
		eqCommandName();
	}
	$( '#eqback' ).click();
	$( '#eqrename, #eqsave' ).removeClass( 'disabled' );
} );


var freq      = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
var timeout;
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
		E        = data || { active: "Flat", preset: { Flat: Array.from( new Array( 10 ), () => 62 ) } }
		var user = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, content    : content.replace( 'PRESETS', eqOptionPreset() )
			, values     : [ '', E.active, ...E.preset[ E.active ] ]
			, beforeshow : () => {
				$( '#infoBox' ).css( 'width', 550 );
				$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
/* slider */	if ( /Android.*Chrome/i.test( navigator.userAgent ) ) { // fix: chrome android cannot drag
					var $this, ystart, val, prevval, timeout;
					var yH   = $( '#infoRange input' ).width() - 40;
					var step = yH / 40;
					$( '#infoRange input' ).on( 'touchstart', function( e ) {
						$this  = $( this );
						ystart = e.changedTouches[ 0 ].pageY;
						val    = +$this.val();
					} ).on( 'click input keyup', function( e ) {
						clearTimeout( timeout );
						var pageY = e.changedTouches[ 0 ].pageY;
						var diff  = ystart - pageY;
						if ( Math.abs( diff ) < step ) return
						
						var v     = val + Math.round( diff / step );
						if ( v === prevval || v > 80 || v < 40 ) return
						
						prevval   = v;
						$this.val( v );
						bash( [ 'equalizerset', band[ $this.index() ], v, user, 'CMD band val user' ] );
						timeout = setTimeout( eqSave, 1000 );
					} );
				} else {
/* slider */		$( '#infoRange input' ).on( 'click input keyup', function() {
						var $this = $( this );
						bash( [ 'equalizerset', band[ $this.index() ], +$this.val(), user, 'CMD band val user' ] );
					} ).on( 'touchend mouseup keyup', function() {
						E.preset[ E.active ] = infoVal().slice( 2 );
						bash( { cmd: [ 'equalizer' ], json: E } );
					} );
				}
			}
			, okno          : true
		} );
	}, 'json' );
}
function eqCommand( v ) {
	bash( { cmd: [ 'equalizer', v, eqUser(), 'CMD values user' ], json: E } );
}
function eqCommandName() {
	bash( { cmd: [ 'equalizer', eqUser(), 'CMD user' ], json: E } );
	eqOptionPreset();
}
function eqOptionPreset() {
	var names     = Object.keys( E.preset ).sort();
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
function eqUser() {
	return [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd'
}
