var eq = {
	  flat   : new Array( 10 ).fill( 62 )
	, freq   : [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ]
	, bands  : []
	, bottom : ico( 'edit', 'eqedit' )
			 + ico( 'save disabled hide', 'eqsave' )
			 +'<div id="divpreset"><select id="eqpreset">PRESETS</select><input id="eqname" type="text" class="hide"></div>'
			 + ico( 'add', 'eqnew' ) + ico( 'back bl hide', 'eqback' )
}
eq.freq.forEach( ( hz, i ) => eq.bands.push( '0'+ i +'. '+ eq.freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) ) );
function equalizer() {
	fetch( '/data/system/equalizer.json' )
		.then( data => data.json() )
		.then( data => {
		E        = data || { active: "Flat", preset: { Flat: eq.flat } }
		eq.user  = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		var opt  = htmlOption( Object.keys( E.preset ) );
		var freq = eq.freq.map( f => f < 31 ? f * 1000 : f ); 
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, list       : eqDiv( 42, 82, freq, eq.bottom.replace( 'PRESETS', opt ) )
			, values     : [ ...E.preset[ E.active ], E.active ]
			, beforeshow : () => {
				eqDivBeforeShow( {
					  init  : () => {
						$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
						eqText();
						$( '#eq .select2-container' ).css( 'width', '' );
					}
					, input : ( i, v ) => {
						bash( [ 'equalizerset', eq.bands[ index ], v, eq.user, 'CMD BAND VAL USR' ] );
						$( '#eq .label.dn a' ).eq( index ).text( v - 62 );
					}
					, end   : () => {
						if ( E.active === 'Flat' ) {
							for ( var i = 1; i < 10; i++ ) {
								var name = 'New '+ i;
								if ( ! ( name in E.preset ) ) break;
							}
							E.active         = name;
							E.preset[ name ] = eq.flat;
						}
						E.preset[ E.active ] = infoVal().slice( 0, 10 );
						$( '#eqedit' ).removeClass( 'disabled' );
						$( '#eqpreset' ).html( htmlOption( Object.keys( E.preset ) ) );
						I.values = [ ...E.preset[ E.active ], E.active ];
						infoSetValues();
						selectSet();
						jsonSave( 'equalizer', E );
					}
				} );
			}
			, cancel     : () => E = {}
			, okno       : true
		} );
	} );
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
} ).on( 'input', '#eqname', function( e ) {
	$( '#eqsave' ).toggleClass( 'disabled', $( this ).val().trim() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() { // preset
	var name = $( this ).val();
	E.active   = name;
	var values = E.preset[ name ];
	banner( 'equalizer', 'Preset', 'Change ...', -1 );
	bash( [ 'equalizer', values.join( ' ' ), eq.user, 'CMD VALUES USR' ], function() {
		bannerHide();
		eqText();
		I.values = [ ...values, name ];
		infoSetValues();
		selectSet();
		jsonSave( 'equalizer', E );
	} );
} ).on( 'click', '#eqsave', function() {
	var name         = $( '#eqname' ).val();
	var oldname      = E.active;
	E.active         = name;
	E.preset[ name ] = E.preset[ oldname ];
	delete E.preset[ oldname ];
	$( '#eqback' ).trigger( 'click' );
	E.preset.Flat = eq.flat;
	jsonSave( 'equalizer', E );
} );
