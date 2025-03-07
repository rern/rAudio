var eqtimeout, equser;
var flat   = new Array( 10 ).fill( 62 );
var freq   = [ 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ];
var bands  = [];
freq.forEach( ( hz, i ) => bands.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) ) );
var bottom =  ico( 'edit', 'eqedit' )
			+ ico( 'save disabled hide', 'eqsave' )
			+'<div id="divpreset"><select id="eqpreset">PRESETS</select><input id="eqname" type="text" class="hide"></div>'
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
			, values     : [ ...E.preset[ E.active ], E.active ]
			, beforeshow : () => {
				eqDivBeforeShow( {
					  misc  : () => {
						eqEditToggle();
						eqText();
						$( '#eq .select2-container' ).css( 'width', '' );
					}
					, input : ( i, v ) => eqSlide( i, v )
					, end   : eqSlideEnd
					, click : ( i, v ) => {
						eqSlide( i, v );
						eqtimeout  = setTimeout( eqSlideEnd, 1000 );
					}
				} );
			}
			, cancel     : () => E = {}
			, okno       : true
		} );
	}, 'json' );
}
function eqEditToggle() {
	$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
}
function eqSlide( index, v ) {
	bash( [ 'equalizerset', bands[ index ], v, equser, 'CMD BAND VAL USR' ] );
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
	E.preset[ E.active ] = infoVal().slice( 0, -2 );
	E.preset.Flat        = flat;
	jsonSave( 'equalizer', E );
	$( '#eqedit' ).removeClass( 'disabled' );
	$( '#eqpreset' ).html( htmlOption( Object.keys( E.preset ) ) );
	I.values = [ ...E.preset[ E.active ], E.active ];
	infoSetValues();
	selectSet();
}
function eqText() {
	E.preset[ E.active ].forEach( ( v, i ) => $( '#eq .label.dn a' ).eq( i ).text( v - 62 ) );
}

$( '#infoOverlay' ).on( 'click', '#eqnew', function() {
	$( '#eqedit, #eq .select2-container, #eqnew' ).addClass( 'hide' );
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
						equalizer();
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
	$( '#eqedit, #eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
	eqEditToggle();
} ).on( 'input', '#eqname', function( e ) {
	$( '#eqsave' ).toggleClass( 'disabled', $( this ).val().trim() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() { // preset
	var name = $( this ).val();
	E.active = name;
	E.preset.Flat = flat;
	jsonSave( 'equalizer', E );
	bash( [ 'equalizer', E, equser, 'CMD VALUES USR' ] );
	eqText();
	I.values = [ ...E.preset[ E.active ], E.active ];
	infoSetValues();
	selectSet();
	eqEditToggle();
} ).on( 'click', '#eqsave', function() {
	var name         = $( '#eqname' ).val();
	var oldname      = E.active;
	E.active         = name;
	E.preset[ name ] = E.preset[ oldname ];
	delete E.preset[ oldname ];
	$( '#eqback' ).trigger( 'click' );
	E.preset.Flat = flat;
	jsonSave( 'equalizer', E );
} );
