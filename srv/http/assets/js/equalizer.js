var eqtimeout, equser;
var flat   = new Array( 10 ).fill( 62 );
var freq   = [ 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ];
var bands  = [];
freq.forEach( ( hz, i ) => bands.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) ) );
var bottom =  ico( 'remove hide', 'eqdelete' )
			+ ico( 'edit', 'eqedit' )
			+ ico( 'save disabled hide', 'eqsave' )
			+'<input id="eqname" type="text" class="hide"><select id="eqpreset">PRESETS</select>'
			+ ico( 'add', 'eqnew' ) + ico( 'back bl hide', 'eqback' );
function equalizer() {
	bash( [ 'equalizerget' ], data => {
		E       = data || { active: "Flat", preset: { Flat: flat } }
		equser  = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		var opt = htmlOption( Object.keys( E.preset ) );
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, list       : eqDiv( 42, 82, freq, bottom.replace( 'PRESETS', opt ) )
			, values     : [ E.active, E.active, ...E.preset[ E.active ] ]
			, beforeshow : () => {
				$( '#infoBox' ).css( 'width', 540 );
				eqEditToggle();
				$( '#eq .select2-container' ).css( 'width', '' );
				eqText();
				if ( /Android.*Chrome/i.test( navigator.userAgent ) ) { // fix: chrome android drag
					var $this, ystart, val, prevval;
					var yH   = $( '.inforange input' ).width() - 40;
					var step = yH / 40;
					$( '.inforange input' ).on( 'touchstart', function( e ) {
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
						eqSlide( $this.index(), v );
					} ).on( 'touchend', function() {
						eqSlideEnd();
					} );
				} else {
					$( '.inforange input' ).on( 'input', function() {
						var $this = $( this );
						eqSlide( $this.index(), +$this.val() );
					} ).on( 'touchend mouseup keyup', function() {
						eqSlideEnd();
					} );
				}
			}
			, cancel     : () => E = {}
			, okno       : true
		} );
	}, 'json' );
}
function eqEditToggle() {
	$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
}
function eqPreset( v ) {
	E.preset.Flat = flat;
	E.current     = v;
	jsonSave( 'equalizer', E );
	bash( [ 'equalizer', v, equser, 'CMD VALUES USR' ] );
	eqText();
}
function eqOptionPreset() {
	local(); // suppress input event
	var name   = ! $( '#eqname' ).hasClass( 'hide' );
	var eqname = name ? $( '#eqname' ).val() : E.active;
	$( '#eqpreset' ).html( htmlOption( Object.keys( E.preset ) ) );
	I.values = [ eqname, E.active, ...E.preset[ E.active ] ];
	infoSetValues();
	selectSet();
	$( '#eq .select2-container' ).removeAttr( 'style' );
	if ( name ) $( '#eq .select2-container' ).addClass( 'hide' );
}
function eqSlide( index, v ) {
	var band = bands[ index ];
	bash( [ 'equalizerset', band, v, equser, 'CMD BAND VAL USR' ] );
	if ( E.active === 'Flat' ) {
		for ( var i = 1; i < 10; i++ ) {
			var name = 'New '+ i;
			if ( ! ( name in E.preset ) ) break;
		}
		E.active         = name;
		E.preset[ name ] = E.preset.Flat;
	}
	$( '#eq .label.dn a' ).eq( index ).text( v - 62 );
}
function eqSlideEnd() {
	E.preset[ E.active ] = infoVal().slice( 2 );
	E.preset.Flat        = flat;
	E.current            = E.preset[ E.active ].join( ' ' );
	jsonSave( 'equalizer', E );
	$( '#eqedit' ).removeClass( 'disabled' );
	eqOptionPreset();
}
function eqText() {
	E.preset[ E.active ].forEach( ( v, i ) => $( '#eq .label.dn a' ).eq( i ).text( v - 62 ) );
}

$( '#infoOverlay' ).on( 'click', '#eqnew', function() {
	$( '#eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' )
		.css( 'display', 'inline-block' )
		.val( E.active );
} ).on( 'click', '#eqedit', function() {
	var list    = [];
	var values  = [];
	var presets = Object.keys( E.preset ).sort();
	presets.forEach( k => {
		if ( k === 'Flat' ) return
		
		list.push( [ '', 'text', { suffix: ico( 'remove' ) } ] );
		values.push( k );
	} );
	info( {
		  icon         : 'equalizer'
		, title        : 'Presets'
		, list         : list
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoList i' ).on( 'click', function() {
				var preset = $( this ).parents( 'tr' ).find( 'input' ).val();
				info( {
					  icon    : 'equalizer'
					, title   : 'Delete'
					, message : preset
					, oklabel : ico( 'remove' ) +'Delete'
					, okcolor : red
					, ok      : () => {
						if ( preset === E.active ) E.active = 'Flat';
						delete E.preset[ preset ];
						jsonSave( 'equalizer', E );
					}
				} );
			} );
		}
		, ok      : () => {
			var val = infoVal();
			if ( typeof val === 'string' ) val = [ val ];
			val.forEach( ( name1, i ) => {
				var name0 = presets[ i ];
				if ( name0 !== name1 ) {
					if ( E.active === name0 ) E.active = name1;
					E.preset[ name1 ] = E.preset[ name0 ];
					delete E.preset[ name0 ];
				}
			} );
			jsonSave( 'equalizer', E );
		}
	} );
} ).on( 'click', '#eqback', function() {
	$( '#eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqdelete, #eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
	eqEditToggle();
} ).on( 'input', '#eqname', function( e ) {
	var $eqsave = $( '#eqsave' );
	$eqsave.toggleClass( 'disabled', $( this ).val().trim() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() {      // preset
	if ( V.local ) return
	
	var name = $( this ).val();
	E.active = name;
	I.values = [ E.active, E.active, ...E.preset[ E.active ] ];
	infoSetValues();
	eqEditToggle();
	eqPreset( E.preset[ name ].join( ' ' ) );
} ).on( 'click', '#eqdelete', function() {       // delete
	delete E.preset[ E.active ];
	E.active = 'Flat';
	eqPreset( E.preset.Flat.join( ' ' ) );
	$( '#eqback' ).trigger( 'click' );
	eqOptionPreset();
} ).on( 'click', '#eqsave', function() {
	var name      = $( '#eqname' ).val();
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
	E.current     = E.preset[ name ].join( ' ' );
	jsonSave( 'equalizer', E );
} ).on( 'click', '.up, .dn', function( e ) {
	clearTimeout( eqtimeout )
	var $this  = $( this );
	var i      = $this.index();
	var $range = $( '.inforange input' ).eq( i );
	var val    = +$range.val() + ( $this.hasClass( 'up' ) ? 1 : -1 );
	$range.val( val );
	eqSlide( i, val );
	eqtimeout  = setTimeout( eqSlideEnd, 1000 );
} );
