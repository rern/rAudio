var eqtimeout, equser;
var flat    = [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ];
var freq    = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
var band    = [];
var labelhz = '';
freq.forEach( ( hz, i ) => {
	band.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) );
	labelhz += '<a>'+ hz + ( i < 5 ? '' : 'k' ) +'</a>';
} );
var content   = `
<div id="eq">
<div class="label up">${ labelhz }</div>
<div class="bottom">
	<div class="label dn">${ labelhz }</div>
	${ ico( 'remove hide', 'eqdelete' ) }
	${ ico( 'edit', 'eqrename' ) }
	${ ico( 'save disabled hide', 'eqsave' ) }
	<input id="eqname" type="text" class="hide"><select id="eqpreset">PRESETS</select>
	${ ico( 'add', 'eqnew' ) + ico( 'back bl hide', 'eqback' ) }
</div>
<div id="infoRange" class="vertical">${ '<input type="range" min="40" max="80">'.repeat( 10 ) }</div>
</div>`;
function equalizer() {
	bash( [ 'equalizerget' ], data => {
		E      = data || { active: "Flat", preset: { Flat: Array.from( new Array( 10 ), () => 62 ) } }
		equser = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		info( {
			  icon         : 'equalizer'
			, title        : 'Equalizer'
			, content      : content.replace( 'PRESETS', eqOptionPreset() )
			, contentcssno : true
			, values       : [ '', E.active, ...E.preset[ E.active ] ]
			, beforeshow   : () => {
				$( '#infoBox' ).css( 'width', 550 );
				$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
				if ( /Android.*Chrome/i.test( navigator.userAgent ) ) { // fix: chrome android drag
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
						eqSlide( band[ $this.index() ], v );
					} ).on( 'touchend', function() {
						eqSlideEnd();
					} );
				} else {
					$( '#infoRange input' ).on( 'input', function() {
						var $this = $( this );
						eqSlide( band[ $this.index() ], +$this.val() );
					} ).on( 'touchend mouseup keyup', function() {
						eqSlideEnd();
					} );
				}
			}
			, cancel       : () => E = {}
			, okno         : true
		} );
	}, 'json' );
}
function eqPreset( v ) {
	E.preset.Flat = flat;
	E.current = v;
	bash( { cmd: [ 'equalizer', v, equser, 'CMD VALUES USER' ], json: E } );
}
function eqOptionPreset() {
	var eqnames   = Object.keys( E.preset ).sort();
	var optpreset = '';
	eqnames.forEach( n => optpreset += '<option>'+ n +'</option>' );
	if ( ! I.active ) return optpreset
	
	local(); // suppress input event
	$( '#eqpreset' )
		.html( optpreset )
		.trigger( 'input' );
	I.values = [ '', E.active, ...E.preset[ E.active ] ];
	infoSetValues();
}
function eqSlide( band, v ) {
	bash( [ 'equalizerset', band, v, equser, 'CMD BAND VAL USER' ] );
	if ( E.active === 'Flat' ) {
		for ( i = 1; i < 10; i++ ) {
			var name = 'New '+ i;
			if ( ! ( name in E.preset ) ) break;
		}
		E.active         = name;
		E.preset[ name ] = E.preset.Flat;
		eqOptionPreset();
	}
}
function eqSlideEnd() {
	E.preset[ E.active ] = infoVal().slice( 2 );
	E.preset.Flat        = flat;
	E.current = E.preset[ E.active ].join( ' ' );
	bash( { cmd: [ 'equalizer' ], json: E } );
	$( '#eqrename' ).removeClass( 'disabled' );
}

$( '#infoOverlay' ).on( 'click', '#eqrename', function() {
	$( '#eqrename, #eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqdelete, #eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' ).css( 'display', 'inline-block' );
	$( '#eqname' ).val( E.active );
} ).on( 'click', '#eqnew', function() {
	$( '#eqname' ).val( E.active );
	$( '#eqrename, #eqdelete, #eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' ).css( 'display', 'inline-block' );
} ).on( 'click', '#eqback', function() {
	$( '#eqrename, #eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqdelete, #eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
	$( '#eqrename' ).toggleClass( 'disabled', E.active === 'Flat' );
} ).on( 'input', '#eqname', function( e ) {
	var $eqsave = $( '#eqsave' );
	$eqsave.toggleClass( 'disabled', $( this ).val().trim() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() {      // preset
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
	$( '#eqback' ).trigger( 'click' );
	eqOptionPreset();
} ).on( 'click', '#eqsave', function() {
	var name = $( '#eqname' ).val();
	if ( $( '#eqdelete' ).hasClass( 'hide' ) ) { // new
		E.active         = name;
		E.preset[ name ] = infoVal().slice( 2 );
	} else {                                     // rename
		var oldname      = E.active;
		E.active         = name;
		E.preset[ name ] = E.preset[ oldname ];
		delete E.preset[ oldname ];
	}
	$( '#eqback' ).trigger( 'click' );
	E.preset.Flat = flat;
	E.current = E.preset[ name ].join( ' ' );
	bash( { cmd: [ 'equalizer' ], json: E } );
} ).on( 'click', '.up, .dn', function( e ) {
	clearTimeout( eqtimeout )
	var $this = $( this );
	if ( $this.hasClass( 'up' ) ) {
		var i    = $( '.label.up a' ).index( e.target );
		var v    = '1%+';
		var updn = 1;
	} else {
		var i    = $( '.label.dn a' ).index( e.target );
		var v    = '1%-';
		var updn = -1;
	}
	var $range = $( '#infoRange input' ).eq( i );
	$range.val( +$range.val() + updn );
	eqSlide( band[ i ], v );
	eqtimeout = setTimeout( eqSlideEnd, 1000 );
} );
