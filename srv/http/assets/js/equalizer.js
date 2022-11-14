var freq    = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
var timeout;
var band    = [];
var opthz   = '';
freq.forEach( ( hz, i ) => {
	band.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) );
	opthz  += '<a>'+ hz + ( i < 5 ? '' : 'k' ) +'</a>';
} );
var content = `
<div id="eq">
<div class="hz">${ opthz }</div>
<div class="bottom">
	<i id="eqdelete" class="fa fa-minus-circle hide"></i>
	<i id="eqrename" class="fa fa-edit-circle"></i>
	<i id="eqsave" class="fa fa-save"></i>
	<input id="eqname" type="text" class="hide"><select id="eqpreset">PRESETS</select>
	<i id="eqnew" class="fa fa-plus-circle"></i><i id="eqcancel" class="fa fa-times bl hide"></i>
	<i id="equndo" class="fa fa-undo"></i>
</div>
<div id="infoRange" class="vertical">${ '<input type="range" min="40" max="80">'.repeat( 10 ) }</div>
</div>`;
function equalizer() {
	bash( [ 'equalizerget' ], ( data ) => {
		G.eq = data;
		infoEqualizer();
	}, 'json' );
}
function infoEqualizer( update ) {
	var values     = [ '', G.eq.current, ...G.eq.values ]; // [ #eqname, #eqpreset, ... ]
	var optpreset  = '';
	G.eq.presets.forEach( ( name ) => {
		optpreset += '<option value="'+ name +'">'+ name +'</option>';
	} );
	info( {
		  icon       : 'equalizer'
		, title      : 'Equalizer'
		, content    : content.replace( 'PRESETS', optpreset )
		, values     : values
		, noreload   : update ? 1 : 0
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
				bash( [ 'equalizer', 'preset', $( this ).val() ] );
			} );
			$( '#eqname' ).on( 'keyup paste cut', function( e ) {
				var val    = $( this ).val().trim();
				var blank  = val === '';
				var exists = G.eq.presets.includes( val );
				if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
					var changed = ! blank && ! exists && val !== G.eq.current;
				} else { // new
					var changed = ! blank && ! exists;
				}
				if ( e.key === 'Enter' && changed ) $( '#eqsave' ).click();
				$( '#eqsave' ).toggleClass( 'disabled', ! changed );
			} );
			$( '#eqdelete' ).click( function() {
				bash( [ 'equalizer', 'delete', G.eq.current ] );
				$( '#eqcancel' ).click();
			} );
			$( '#eqrename' ).click( function() {
				$( '#eqrename, #eqdelete' ).toggleClass( 'hide' );
				$( '#eqname' ).val( G.eq.current );
				$( '#eqnew' ).click();
			} );
			$( '#eqsave' ).click( function() {
				if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
					bash( [ 'equalizer', 'rename', G.eq.current, $( '#eqname' ).val() ] );
				} else {
					var name = $( '#eqname' ).hasClass( 'hide' ) ? G.eq.current : $( '#eqname' ).val();
					bash( [ 'equalizer', 'save', name ] );
				}
				$( '#eqcancel' ).click();
				$( '#eqrename' ).removeClass( 'disabled' );
				$( '#eqsave' ).addClass( 'disabled' );
			} );
			$( '#eqnew' ).click( function() {
				$( '#eqnew, #eq .selectric-wrapper' ).addClass( 'hide' );
				$( '#eqname, #eqcancel' ).removeClass( 'hide' );
				$( '#eqrename' ).addClass( 'disabled' );
				$( '#eqsave' ).addClass( 'disabled' );
				if ( G.eq.current !== 'Flat' && G.eq.current !== '(unnamed)' ) $( '#eqname' ).val( G.eq.current )
			} );
			$( '#eqcancel' ).click( function() {
				$( '#eqrename, #eqnew, #eq .selectric-wrapper' ).removeClass( 'hide' );
				$( '#eqname, #eqcancel, #eqdelete' ).addClass( 'hide' );
				$( '#eqname' ).val( '' );
				eqButtonSet();
			} );
			$( '#equndo' ).click( function() {
				bash( [ 'equalizer', 'preset', G.eq.current ] );
			} );
		}
		, okno          : 1
	} );
}
function eqButtonSet() {
	var flat    = G.eq.current === 'Flat';
	var unnamed = G.eq.current === '(unnamed)';
	if ( flat || unnamed ) {
		var changed = false;
	} else {
		var val     = G.eq.nameval[ G.eq.current ].split( ' ' )
		var vnew    = infoVal().slice( 2 );
		var changed = vnew.some( function( v, i ) {
			return Math.abs( v - val[ i ] ) > 1 // fix: resolution not precise
		} );
	}
	$( '#eqrename' ).toggleClass( 'disabled', flat || unnamed || changed );
	$( '#eqsave' ).toggleClass( 'disabled', flat || unnamed || ! changed );
	$( '#equndo' ).toggleClass( 'disabled', flat || ! changed );
}
function eqValueSet( band, val ) {
	clearTimeout( timeout );
	bash( [ 'equalizerupdn', band, val ] );
	eqButtonSet();
	timeout = setTimeout( () => bash( [ 'equalizerget', 'pushstream', $( '#eqpreset' ).val() === 'Flat' ? 'set' : '' ] ), 1000 );
}
