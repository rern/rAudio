E             = {}
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
	${ ico( 'save', 'eqsave' ) }
	<input id="eqname" type="text" class="hide"><select id="eqpreset">PRESETS</select>
	${ ico( 'plus-circle', 'eqnew' ) + ico( 'arrow-left bl hide', 'eqback' ) }
	${ ico( 'undo', 'equndo' ) }
</div>
<div id="infoRange" class="vertical">${ '<input type="range" min="40" max="80">'.repeat( 10 ) }</div>
</div>`;
function equalizer() {
	bash( [ 'equalizerget' ], data => {
		E      = data || { active: "Flat", preset: { Flat: [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ] } }
		E.user = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		infoEqualizer();
	}, 'json' );
}
function infoEqualizer() {
	info( {
		  icon       : 'equalizer'
		, title      : 'Equalizer'
		, content    : content.replace( 'PRESETS', eqOptionPreset() )
		, values     : [ '', E.active, ...E.preset[ E.active ] ]
		, beforeshow : () => {
			$( '#infoBox' ).css( 'width', 550 );
			eqButtonSet();
			if ( ! /Android.*Chrome/i.test( navigator.userAgent ) ) { // fix: chrome android cannot drag
				$( '#infoRange input' ).on( 'click input keyup', function() {
					var $this = $( this );
					eqValueSet( band[ $this.index() ], $this.val() )
				} );
			} else {
				var $this, ystart, val, prevval;
				var yH   = $( '#infoRange input' ).width() - 40;
				var step = yH / 40;
				$( '#infoRange input' ).on( 'touchstart', function( e ) {
					$this  = $( this );
					ystart = e.changedTouches[ 0 ].pageY;
					val    = +$this.val();
				} ).on( 'touchmove', function( e ) {
					var pageY = e.changedTouches[ 0 ].pageY;
					var diff  = ystart - pageY;
					if ( Math.abs( diff ) < step ) return
					
					var v     = val + Math.round( diff / step );
					if ( v === prevval || v > 80 || v < 40 ) return
					
					prevval   = v;
					$this.val( v );
					eqValueSet( band[ $this.index() ], v )
				} );
			}
			$( '#eqpreset' ).change( function() {
				var name = $( this ).val();
				E.active = name;
				var v = E.preset[ name ].join( ' ' );
				bash( { cmd: [ 'equalizer', v, E.user, 'CMD values user' ], json: E } );
			} );
			$( '#eqname' ).on( 'keyup paste cut', function( e ) {
				var val    = $( this ).val().trim();
				var blank  = val === '';
				var exists = val in E.preset;
				if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
					var changed = ! blank && ! exists && val !== E.active;
				} else { // new
					var changed = ! blank && ! exists;
				}
				if ( e.key === 'Enter' && changed ) $( '#eqsave' ).click();
				$( '#eqsave' ).toggleClass( 'disabled', ! changed );
			} );
			$( '#eqdelete' ).click( function() {
				delete E.preset[ E.active ];
				E.active = 'Flat';
				var v = E.preset.Flat.join( ' ' );
				bash( { cmd: [ 'equalizer', v, E.user, 'CMD values user' ], json: E } );
				$( '#eqback' ).click();
//				eqOptionPreset();
			} );
			$( '#eqrename' ).click( function() {
				$( '#eqrename, #eqdelete' ).toggleClass( 'hide' );
				$( '#eqname' ).val( E.active );
				$( '#eqnew' ).click();
			} );
			$( '#eqsave' ).click( function() {
				if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
					var name            = $( '#eqpreset' ).val();
					var newname         = $( '#eqname' ).val();
					E.active           = newname;
					E.preset[ newname ] = E.preset[ name ];
					delete E.preset[ name ];
					bash( { cmd: [ 'equalizer' ], json: E } );
				} else {
					var name         = $( '#eqname' ).val();
					E.active        = name;
					E.preset[ name ] = infoVal().slice( 2 );
					bash( { cmd: [ 'equalizer' ], json: E } )
				}
				$( '#eqback' ).click();
				$( '#eqrename' ).removeClass( 'disabled' );
				$( '#eqsave' ).addClass( 'disabled' );
//				eqOptionPreset();
			} );
			$( '#eqnew' ).click( function() {
				$( '#eqnew, #eq .select2-container' ).addClass( 'hide' );
				$( '#eqname, #eqback' ).removeClass( 'hide' );
				$( '#eqname' ).css( 'display', 'inline-block' );
				$( '#eqrename' ).addClass( 'disabled' );
				$( '#eqsave' ).addClass( 'disabled' );
				if ( E.active !== 'Flat' && E.active !== '(unnamed)' ) $( '#eqname' ).val( E.active )
//				eqOptionPreset();
			} );
			$( '#eqback' ).click( function() {
				$( '#eqrename, #eqnew, #eq .select2-container' ).removeClass( 'hide' );
				$( '#eqname, #eqback, #eqdelete' ).addClass( 'hide' );
				$( '#eqname' ).val( '' );
				eqButtonSet();
			} );
			$( '#equndo' ).click( function() {
				var v = E.preset[ E.active ].join( ' ' );
				bash( [ 'equalizer', v, E.user, 'CMD values user' ] );
			} );
		}
		, okno          : true
	} );
}
function eqButtonSet() {
	var flat    = E.active === 'Flat';
	var unnamed = E.active === '(unnamed)';
	if ( flat || unnamed ) {
		var changed = false;
	} else {
		var val     = E.preset[ E.active ];
		var vnew    = infoVal().slice( 2 );
		var changed = vnew.join( ' ' ) !== val.join( ' ' );
	}
	$( '#eqrename' ).toggleClass( 'disabled', flat || unnamed || changed );
	$( '#eqsave' ).toggleClass( 'disabled', flat || unnamed || ! changed );
	$( '#equndo' ).toggleClass( 'disabled', flat || ! changed );
}
function eqOptionPreset() {
	var name      = Object.keys( E.preset ).sort();
	var optpreset = '';
	name.forEach( n => optpreset += '<option>'+ n +'</option>' );
	if ( ! I.active ) return optpreset
	
	$( '#eqpreset' )
		.html( optpreset )
		.trigger( 'change' );
}
function eqValueSet( band, val ) {
	clearTimeout( timeout );
	bash( [ 'equalizerupdn', band, val, E.user, 'CMD band val user' ] );
	eqButtonSet();
	timeout = setTimeout( () => bash( [ 'equalizerpush', E.user, 'CMD user' ] ), 1000 );
}
