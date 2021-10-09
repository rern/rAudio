function equalizer() {
	var vflat = '60'.repeat( 10 );
	var freq = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
	var band = [];
	freq.forEach( function( hz, i ) {
		band.push( '0'+ i +'. '+ freq[ i ] + ( i < 5 ? ' Hz' : ' kHz' ) );
	} );
	var opthz = '';
	freq.forEach( function( hz, i ) {
		opthz += '<a>'+ hz + ( i < 5 ? '' : 'k' ) +'</a>';
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
	<i id="eqflat" class="fa fa-set0"></i>
</div>
<div id="infoRange" class="vertical">${ '<input type="range">'.repeat( 10 ) }</div>
</div>`;
	bash( [ 'equalizer' ], function( data ) {
		G.eqcurrent = data.current;
		var values = [ '', data.current, ...data.values ]; // [ #eqname, #eqpreset, ... ]
		var vcurrent = data.values.join( '' );
		var optpreset = '';
		data.presets.forEach( function( name ) {
			optpreset += '<option value="'+ name +'">'+ name +'</option>';
		} );
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, content    : content.replace( 'PRESETS', optpreset )
			, values     : values
			, beforeshow : function() {
				$( '#infoBox' ).css( 'width', 550 );
				var notpreset = G.eqcurrent === '(unnamed)' || G.eqcurrent === 'Flat';
				equalizerButtonSet();
				$( '#infoRange input' ).on( 'click input keyup', function() {
					var $this = $( this );
					bash( [ 'equalizerupdn', band[ $this.index() ], $this.val() ] );
					var vnew = infoVal().slice( 2 ).join( '' );
					var changed = vnew !== vcurrent;
					var flat = vnew === vflat;
					$( '#eqsave' ).toggleClass( 'disabled', !changed || G.eqcurrent === 'Flat' );
					$( '#eqnew' ).toggleClass( 'disabled', !changed || flat )
					$( '#eqflat' ).toggleClass( 'disabled', flat )
				} );
				$( '#eqpreset' ).change( function() {
					var name = $( this ).val();
					G.eqcurrent = name;
					bash( [ 'equalizer', 'preset', name ] );
				} );
				$( '#eqname' ).on( 'keyup paste cut', function( e ) {
					var val = $( this ).val().trim();
					var blank = val === '';
					var exists = data.presets.indexOf( val ) !== -1;
					if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
						var changed = !blank && !exists && val !== G.eqcurrent;
					} else { // new
						var changed = !blank && !exists;
					}
					if ( e.key === 'Enter' && changed ) $( '#eqsave' ).click();
					$( '#eqsave' ).toggleClass( 'disabled', !changed );
				} );
				$( '#eqdelete' ).click( function() {
					G.eqcurrent = 'Flat';
					bash( [ 'equalizer', 'delete', $( '#eqpreset' ).val() ] );
					$( '#eqcancel' ).click();
				} );
				$( '#eqrename' ).click( function() {
					$( '#eqrename, #eqdelete' ).toggleClass( 'hide' );
					$( '#eqname' ).val( G.eqcurrent );
					$( '#eqnew' ).click();
				} );
				$( '#eqsave' ).click( function() {
					var cmd = '';
					var eqname = $( '#eqname' ).val();
					if ( $( '#eqrename' ).hasClass( 'hide' ) ) {
						bash( [ 'equalizer', 'rename', G.eqcurrent, eqname ] );
						G.eqcurrent = eqname;
						$( '#eqcancel' ).click();
					} else if ( $( '#eqnew' ).hasClass( 'hide' )  ) {
						G.eqcurrent = eqname;
						bash( [ 'equalizer', 'new', eqname ] );
						$( '#eqcancel' ).click();
					} else {
						bash( [ 'equalizer', 'save', G.eqcurrent ] );
					}
					$( this ).addClass( 'disabled' );
				} );
				$( '#eqnew' ).click( function() {
					G.eqbuttons = {};
					[ 'eqrename', 'eqsave', 'eqflat' ].forEach( function( btn ) {
						G.eqbuttons[ btn ] = $( '#'+ btn ).hasClass( 'disabled' );
					} );
					$( '#eqnew, #eq .selectric-wrapper' ).addClass( 'hide' );
					$( '#eqname, #eqcancel' ).removeClass( 'hide' );
					$( '#eqrename' ).addClass( 'disabled' );
					$( '#eqsave' ).addClass( 'disabled' );
				} );
				$( '#eqcancel' ).click( function() {
					$( '#eqrename, #eqnew, #eq .selectric-wrapper' ).removeClass( 'hide' );
					$( '#eqname, #eqcancel, #eqdelete' ).addClass( 'hide' );
					$( '#eqname' ).val( '' );
					[ 'eqrename', 'eqsave', 'eqflat' ].forEach( function( btn ) {
						$( '#'+ btn ).toggleClass( 'disabled', G.eqbuttons[ btn ] );
					} );
				} );
				$( '#eqflat' ).click( function() {
					G.eqcurrent = 'Flat';
					bash( [ 'equalizer', 'preset', 'Flat' ] );
				} );
			}
			, buttonnoreset : 1
			, okno          : 1
		} );
	}, 'json' );
}
function equalizerButtonSet() {
	var flat = G.eqcurrent === 'Flat';
	var unnamed = G.eqcurrent === '(unnamed)';
	var notpreset = unnamed || flat;
	$( '#eqrename' ).toggleClass( 'disabled', notpreset );
	$( '#eqsave' ).addClass( 'disabled' );
	$( '#eqnew' ).toggleClass( 'disabled', !unnamed || flat );
	$( '#eqflat' ).toggleClass( 'disabled', flat );
}
function equalizerRefresh( data ) {
	O.values = [ '', data.current, ...data.values ];
	var options = '';
	data.presets.forEach( function( name ) {
		options += '<option value="'+ name +'">'+ name +'</option>';
	} );
	$( '#eqpreset' ).html( options );
	infoSetValues();
	selectricRender();
	equalizerButtonSet();
}
