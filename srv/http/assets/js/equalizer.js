var EQ       = {
	  flat   : new Array( 10 ).fill( 62 )
	, freq  : [ 31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ]
	, bands  : []
	, bottom : ICON( 'edit', 'eqedit' )
			 + ICON( 'save disabled hide', 'eqsave' )
			 +'<div id="divpreset"><select id="eqpreset">PRESETS</select><input id="eqname" type="text" class="hide"></div>'
			 + ICON( 'add', 'eqnew' ) + ICON( 'back bl hide', 'eqback' )
}
EQ.freq.forEach( ( hz, i ) => {
	var band = hz < 1000 ? hz +' Hz' : ( hz / 1000 ) +' kHz';
	EQ.bands.push( '0'+ i +'. '+ band );
} );
EQ.level = () => {
	E.preset[ E.active ].forEach( ( v, i ) => $( '#eq .label.dn a' ).eq( i ).text( v - 62 ) );
}
EQ.info  = data => {
	E = data;
	EQ.user  = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
	var opt  = COMMON.htmlOption( Object.keys( E.preset ) );
	INFO( {
		  icon       : 'equalizer'
		, title      : 'Equalizer'
		, list       : COMMON.eq.html( 42, 82, EQ.freq, EQ.bottom.replace( 'PRESETS', opt ) )
		, values     : [ ...E.preset[ E.active ], E.active ]
		, beforeshow : () => {
			COMMON.eq.beforShow( {
				  init  : () => {
				  	EQ.level();
					$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
				}
				, input : ( i, v ) => {
					BASH( [ 'equalizerset', EQ.bands[ i ], v, EQ.user, 'CMD BAND VAL USR' ] );
					$( '#eq .label.dn a' ).eq( i ).text( v - 62 );
				}
				, end   : () => {
					if ( E.active === 'Flat' ) {
						for ( var i = 1; i < 10; i++ ) {
							var name = 'New '+ i;
							if ( ! ( name in E.preset ) ) break;
						}
						E.active         = name;
						E.preset[ name ] = EQ.flat;
					}
					E.preset[ E.active ] = infoVal().slice( 0, 10 );
					$( '#eqedit' ).removeClass( 'disabled' );
					$( '#eqpreset' ).html( COMMON.htmlOption( Object.keys( E.preset ) ) );
					I.values = [ ...E.preset[ E.active ], E.active ];
					_INFO.setValues();
					COMMON.select.set();
					COMMON.json.save( 'equalizer', E );
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
		
		list.push( [ '', 'text', { suffix: ICON( 'remove' ) } ] );
		values.push( k );
	} );
	var e = COMMON.json.clone( E );
	INFO( {
		  icon         : 'equalizer'
		, title        : 'Presets'
		, list         : list
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoList input' ).on( 'blur', function() {
				var index = $( this ).parents( 'tr' ).index();
				var name0 = values[ index ];
				var name1 = $( this ).val();
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
				$( '#infoOk' ).removeClass( 'disabled' );
			} );
		}
		, cancel       : () => EQ.info( E )
		, ok           : () => {
			COMMON.json.save( 'equalizer', e );
			EQ.info( e );
		}
	} );
} ).on( 'click', '#eqback', function() {
	$( '#eqedit, #eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
} ).on( 'input', '#eqname', function( e ) {
	$( '#eqsave' ).toggleClass( 'disabled', $( this ).val() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() { // preset
	var name   = $( this ).val();
	E.active   = name;
	var values = E.preset[ name ];
	BASH( [ 'equalizer', values.join( ' ' ), EQ.user, 'CMD VALUES USR' ] );
	I.values = [ ...values, name ];
	_INFO.setValues();
	EQ.level();
	COMMON.json.save( 'equalizer', E );
} ).on( 'click', '#eqsave', function() {
	var name         = $( '#eqname' ).val();
	E.preset[ name ] = E.preset[ E.active ];
	E.active         = name;
	COMMON.json.save( 'equalizer', E );
	$( '#eqback' ).trigger( 'click' );
	$( '#eqpreset' )
		.html( COMMON.htmlOption( Object.keys( E.preset ) ) )
		.val( name )
		.trigger( 'change' );
} );
