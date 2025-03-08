var eq = {
	  flat   : new Array( 10 ).fill( 62 )
	, freq  : [ 31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ]
	, bands  : []
	, bottom : ico( 'edit', 'eqedit' )
			 + ico( 'save disabled hide', 'eqsave' )
			 +'<div id="divpreset"><select id="eqpreset">PRESETS</select><input id="eqname" type="text" class="hide"></div>'
			 + ico( 'add', 'eqnew' ) + ico( 'back bl hide', 'eqback' )
}
eq.freq.forEach( ( hz, i ) => {
	var band = hz < 1000 ? hz +' Hz' : ( hz / 1000 ) +' kHz';
	eq.bands.push( '0'+ i +'. '+ band );
} );
function equalizer() {
	fetch( '/data/system/equalizer.json', { cache: 'no-store' } )
		.then( data => {
			if ( data.ok ) return data.json();
			
			return { active: "Flat", preset: { Flat: eq.flat } }
		} )
		.then( data => {
			infoEqualizer( data )
		} );
}
function eqLevel() {
	E.preset[ E.active ].forEach( ( v, i ) => $( '#eq .label.dn a' ).eq( i ).text( v - 62 ) );
}
function infoEqualizer( data ) {
	E = data;
	eq.user  = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
	var opt  = htmlOption( Object.keys( E.preset ) );
	info( {
		  icon       : 'equalizer'
		, title      : 'Equalizer'
		, list       : eqDiv( 42, 82, eq.freq, eq.bottom.replace( 'PRESETS', opt ) )
		, values     : [ ...E.preset[ E.active ], E.active ]
		, beforeshow : () => {
			eqDivBeforeShow( {
				  init  : () => {
					$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
					eqLevel();
					$( '#eq .select2-container' ).css( 'width', '' );
				}
				, input : ( i, v ) => {
					bash( [ 'equalizerset', eq.bands[ i ], v, eq.user, 'CMD BAND VAL USR' ] );
					$( '#eq .label.dn a' ).eq( i ).text( v - 62 );
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
	var e = jsonClone( E );
	info( {
		  icon       : 'equalizer'
		, title      : 'Presets'
		, list       : list
		, values     : values
		, beforeshow : () => {
			$( '#infoList input' ).on( 'blur', function() {
				var index = $( this ).parents( 'tr' ).index();
				var name0 = values[ index ];
				var name1 = $( this ).val().trim();
				if ( name0 !== name1 ) {
					if ( e.active === name0 ) e.active = name1;
					e.preset[ name1 ] = e.preset[ name0 ];
					delete e.preset[ name0 ];
				}
			} );
			$( '#infoList i' ).on( 'click', function() {
				var $tr   = $( this ).parents( 'tr' );
				var name1 = $tr.find( 'input' ).val();
				if ( e.active === name1 ) e.active = 'Flat';
				delete e.preset[ name1 ];
				$tr.remove();
				if ( ! $( '#infoList tr' ).length ) $( '#infoList table' ).append( '<tr><td><gr>(empty)<gr></td></tr>' );
			} );
		}
		, cancel     : equalizer
		, ok         : () => {
			jsonSave( 'equalizer', e );
			infoEqualizer( e );
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
	var name   = $( this ).val();
	E.active   = name;
	var values = E.preset[ name ];
	bash( [ 'equalizer', values.join( ' ' ), eq.user, 'CMD VALUES USR' ] );
	eqLevel();
	I.values = [ ...values, name ];
	infoSetValues();
	selectSet();
	jsonSave( 'equalizer', E );
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
