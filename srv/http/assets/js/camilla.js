/*
Biquad
	- Lowpass, Highpass       : freq Q
	- Lowshelf, Highshelf     : gain freq slope/Q
	- LowpassFO, HighpassFO   : freq
	- LowshelfFO, HighshelfFO : gain freq
	- Peaking                 : gain freq Q/bandwidth
	- Notch, Bandpass, Allpass: freq Q/bandwidth
	- AllpassFO               : freq
	- LinkwitzTransform       : Q_actual Q_target freq_act freq_target
	- Free                    : a1 a2 b0 b1 b2
BiquadCombo
	- (all): order freq
Conv
	- Raw    : [filename] [format] skip_bytes_lines read_bytes_lines
	- Wave   : [filename] channel
	- Values : [values] length
Dither
	- (all except Uniform): bits
	- Uniform             : bits amplitude
	
(no subtype)
Delay    : ms samples XsSubsample
Gain     : gain X*Inverted X*Mute
Volume   : ramp_time
Loudness : reference_level high_boost low_boost ramp_time
DiffEq   : [a] [b]
*/
$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#divfilters .add' ).on( 'click', function() {
	infoFilters( 'Biquad', 'Lowpass' );
} );
$( '#bar-bottom div' ).on( 'click', function() {
	var id       = this.id;
	V.currenttab = id;
	$( '#bar-bottom div' ).removeClass( 'active' );
	$( '#'+ id ).addClass( 'active' );
	$( '.tab > .section' ).addClass( 'hide' );
	$( '#div'+ id ).removeClass( 'hide' );
} );
$( '.samplerate, .capture_samplerate' ).on( 'change', function() {
	var $this  = $( this );
	$this.parent().next().next().toggleClass( 'hide', $this.val() !== 'Other' )
} );
$( '.enable_rate_adjust, .enable_resampling' ).on( 'change', function() {
	var $this = $( this );
	$( this ).closest( '.section' ).find( '.divtoggle' ).toggleClass( 'hide', ! $this.prop( 'checked' ) )
} );
$( '.capture, .playback' ).on( 'change', '.type', function() {
	var $this = $( this );
	var cls   = $this.closest( '.section' ).prop( 'id' ).slice( 3, -6 );
	htmlDevice( cls, $this.val() );
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var kv = {
	  pass    : {
		number: { freq: 1000, q: 0.5 }
	  }
	, shelf   : {
		  number : { gain: 6, freq: 1000, q: 6 }
		, radio  : [ 'Q', 'Samples' ]
	}
	, passFO  : {
		number: { freq: 1000 }
	}
	, shelfFO : {
		number: { gain: 6, freq: 1000 }
	}
	, notch   : {
		  number : { freq: 1000, q: 0.5 }
		, radio  : [ 'Q', 'Bandwidth' ]
	}
}
V = {
	  currenttab    : 'devices'
	, selecttype    : [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'Gain', 'Volume', 'Loudness', 'DiffEq', 'Dither' ]
	, selectsubtype : {
		  Biquad      : [ 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
						, 'Peaking', 'Notch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform', 'Free' ]
		, BiquadCombo : [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass' ]
		, Conv        : [ 'Raw', 'Wave', 'Values' ]
		, Dither      : [ 'Simple', 'Uniform', 'Lipshitz441', 'Fweighted441', 'Shibata441', 'Shibata48', 'None' ]
	}
	, selectformat  : [ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ]
	, input_value   : {
		  Lowpass           : kv.pass
		, Highpass          : kv.pass
		, Lowshelf          : kv.shelf
		, Highshelf         : kv.shelf
		, LowpassFO         : kv.passFO
		, HighpassFO        : kv.passFO
		, LowshelfFO        : kv.shelfFO
		, HighshelfFO       : kv.shelfFO
		, Peaking           : {
			  number : { gain: 6, freq: 1000, q: 1.5 }
			, radio  : [ 'Q', 'Bandwidth' ]
		}
		, Notch             : kv.notch
		, Bandpass          : kv.notch
		, Allpass           : kv.notch
		, AllpassFO         : kv.passFO
		, LinkwitzTransform : {
			number: { q_actual: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
		}
		, Free              : {
			number: { a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
		}
		, BiquadCombo       : {
			number: { order: 2, freq: 1000 }
		}
		, Raw               : { 
			  select : { filename: '', format: '' }
			, number : { skip_bytes_lines: 0, read_bytes_lines: 0 }
		}
		, Wave              : {
			  select : { filename: '' }
			, number : { channel: 0 }
		}
		, Values            : {
			  text   : { values: '1, 0, 0, 0' }
			, number : { length: 0 }
		}
		, Delay             : {
			  number   : { ms: 0 }
			, radio    : [ 'ms', 'Samples' ]
			, checkbox : { subsample: false }
		}
		, Gain              : {
			  number   : { gain: 0 }
			, checkbox : { inverted: false, mute: false }
		}
		, Volume            : {
			number: { ramp_time: 200 }
		}
		, Loudness          : {
			number: { reference_level: 5, high_boost: 5, low_boost: 5, ramp_time: 200 }
		}
		, DiffEq            : {
			text: { a: '1, 0', b: '1, 0' }
		}
		, Dither            : {
			number: { bits: 16 }
		}
	}
}
var samplerate  = [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000 ];
var devicetype  = [ 'Alsa', 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin', 'File' ];
var opt_type    = '';
devicetype.forEach( k => opt_type += '<option value="'+ k +'">'+ k +'</option>' );
var opt_format  = '';
V.selectformat.forEach( k => opt_format += '<option value="'+ k +'">'+ k +'</option>' );
var TC          = { Type: opt_type, Channels: 'number' }
var TCS         = { ... TC, 'Sample format': opt_format }
var TCSD        = { ...TCS, Device: 'text' }
var TWasapi     = { ...TCSD, Exclusive: 'checkbox', Loopback: 'checkbox' }
var ESR         = { 'Extra samples': 'number', 'Skip bytes': 'number', 'Read bytes': 'number' }
var type_input  = {
	  capture : {
		  Alsa      : TCSD
		, CoreAudio : { ...TCSD, 'Change format': 'checkbox' }
		, Pulse     : TCSD
		, Wasapi    : TWasapi
		, Jack      : TC
		, Stdin     : { ...TCS, ...ESR }
		, File      : { ...TCS, Filename: 'text', ...ESR }
	}
	, playback : {
		  Alsa      : TCSD
		, CoreAudio : { ...TCSD, Exclusive: 'checkbox', 'Change format': 'checkbox' }
		, Pulse     : TCSD
		, Wasapi    : TWasapi
		, Jack      : TC
		, Stdout    : TCS
		, File      : { ...TCS, Filename: 'text' }
	}
}

function htmlDevice( cls, val ) {
	if ( ! val ) val = 'Alsa';
	var list = type_input.capture[ val ];
	var html = '<heading class="subhead"><span class="headtitle">'+ cls[ 0 ].toUpperCase() + cls.slice( 1 ) +' device</span></heading>';
	$.each( list, ( label, type ) => {
		var cls = label.replace( ' ', '_' ).toLowerCase();
		html += '<div class="col-l single">'+ label +'</div><div class="col-r">';
		if ( type[ 0 ] === '<' ) {
			html += '<select class="'+ cls +'">'+ type +'</select>';
		} else {
			html += '<input class="'+ cls +'" type="'+ type +'">';
			if ( type === 'checkbox' ) html += '<div class="switchlabel"></div>';
		}
		html += '</div><div style="clear:both"></div>';
	} );
	$( '.'+ cls )
		.html( html )
		.find( 'select' ).select2();
}
function infoFilters( type, subtype ) {
	if ( typeof type === 'object' ) { // saved filters: type = values
		var type    = type.type;
		var subtype = type.subtype;
		var name    = type.name;
		var key_val = type;
	} else {
		var name    = '';
	}
	// select
	var selectlabel = [ 'type' ];
	var select      = [ V.selecttype ];
	var values      = { type: type }
	var key_val     = '';
	if ( subtype ) {
		selectlabel.push( 'subtype' )
		select.push( V.selectsubtype[ type ] );
		values.subtype    = subtype;
		key_val           = V.input_value[ subtype ];
	}
	if ( ! key_val ) key_val = V.input_value[ type ];
	if ( subtype === 'Uniform' ) key_val.amplitude = 1;
	if ( 'select' in key_val ) {
		var kv = key_val.select;
		var k  = Object.keys( kv );
		selectlabel = [ ...selectlabel, ...k ];
		var selectsubtype = subtype === 'Raw' ? [ S.lscoef, V.selectformat ] : [ S.lscoef ];
		select = [ ...select, ...selectsubtype ];
		values = { ...values, ...kv };
	}
	selectlabel = labelArraySet( selectlabel );
	// text
	var textlabel   = [ 'name' ];
	values.name = name;
	if ( 'text' in key_val ) {
		var kv    = key_val.text;
		var k     = Object.keys( kv );
		textlabel = [ ...textlabel, ...k ];
		values    = { ...values, ...kv };
	}
	textlabel    = labelArraySet( textlabel );
	// number
	var numberlabel = false;
	if ( 'number' in key_val ) {
		var kv      = key_val.number;
		numberlabel = Object.keys( kv );
		values      = { ...values, ...kv };
		numberlabel = labelArraySet( numberlabel );
	}
	// radio
	var radio       = false;
	if ( 'number' in key_val ) {
		radio  = key_val.radio;
		values = { ...values, radio: numberlabel.slice( -1 )[ 0 ] };
	}
	// checkbox
	var checkbox    = false;
	if ( 'checkbox' in key_val ) {
		var kv   = key_val.checkbox;
		checkbox = Object.keys( kv );
		values   = { ...values, ...kv };
	}
	info( {
		  icon         : 'camilladsp'
		, title        : 'Filters'
		, selectlabel  : selectlabel
		, select       : select
		, textlabel    : textlabel
		, numberlabel  : numberlabel
		, radio        : radio
		, radiosingle  : true
		, checkbox     : checkbox
		, boxwidth     : 198
		, order        : [ 'select', 'text', 'number', 'radio', 'checkbox' ]
		, values       : values
		, checkblank   : true
		, checkchanged : name
		, beforeshow   : () => {
			$( '#infoContent td:first-child' ).css( 'min-width', '125px' );
			$( '.trcheckbox label' ).css( 'text-transform', 'capitalize' );
			var $tdname = $( '#infoContent td' ).filter( function() {
				return $( this ).text() === 'Name'
			} );
			$( '#infoContent tr' ).eq( 0 ).before( $tdname.parent() );
			var $select     = $( '#infoContent select' );
			var $selecttype = $select.eq( 0 );
			$selecttype.on( 'change', function() {
				var type    = $( this ).val();
				var subtype = type in V.selectsubtype ? V.selectsubtype[ type ][ 0 ] : '';
				infoFilters( type, subtype );
			} );
			if ( $select.length > 1 ) {
				$select.eq( 1 ).on( 'change', function() {
					var type    = $selecttype.val();
					var subtype = $( this ).val();
					infoFilters( type, subtype );
				} );
			}
			if ( radio ) {
				var $tr      = $( '#infoContent .trradio' ).prev();
				var itr      = $tr.index()
				var $label   = $tr.find( 'td' ).eq( 0 );
				var $radio   = $( '#infoContent input:radio' );
				$radio.on( 'change', function() {
					var val       = $( this ).filter( ':checked' ).val();
					I.keys[ itr ] = val.toLowerCase();
					$label.text( val );
				} );
			}
		}
		, ok           : () => {
			var val   = infoVal();
			var param = { type: val.subtype }
			$.each( val, ( k, v ) => {
				if ( ! [ 'radio', 'name', 'type', 'subtype' ].includes( k ) ) param[ k ] = v;
			} );
			var config = jsonClone( S.config );
			var name   = val.name;
			config.filters[ name ] = { type: val.type, parameters : param }
			notify( 'camilladsp', 'Filter: '+ name , 'Save ...' );
			bash( [ 'validate', JSON.stringify( config ) ], std => {
				std != -1 ? S.config = config : infoSaveFailed( 'Filters', name );
				banner( 'camilladsp', 'Filter: '+ name, 'Saved' );
			} );
		}
	} );
}
function infoSaveFailed( title, name ) {
	info( {
		  icon    : 'camilladsp'
		, title   : title
		, message : iconwarning +'Save <wh>'+ name +'</wh> failed.'
	} );
}
function labelArraySet( array ) {
	var capitalized = array.map( function( el ) {
		if ( el === 'ms' ) return 'ms'
		
		var str = el[ 0 ].toUpperCase();
		if ( el.length === 1 ) return str
		
		el = el
				.replace( 'freq_act', 'freq_actual' )
				.replace( 'freq', 'frequency' )
				.replace( 'bytes_lines', 'bytes/lines' )
				.replace( /_/g, ' ' )
				.slice( 1 )
		return str + el
	} );
	return capitalized
}
function renderPage() {
	console.log(S.config.devices)
	var v = {
		  mute   : S.mute
		, volume : S.volume
		, bass   : S.config.filters.Bass.parameters.gain
		, treble : S.config.filters.Treble.parameters.gain
	};
	[ 'volume', 'bass', 'treble' ].forEach( el => {
		var val = v[ el ];
		$( '#'+ el +' input' ).val( val );
		$( '#'+ el +' .value' ).text( val +( val ? 'dB' : '' ) );
	} );
	var status = '<c>'+ S.name +'</c><br>'+
				 S.status.state +'<br>'+
				 S.status.capture_rate +'<br>'+
				 S.status.rate_adjust +'<br>'+
				 S.status.clipped_samples +'<br>'+
				 S.status.buffer_level +'<br>'
	$( '#statusvalue' ).html( status );
	htmlDevice( 'capture' );
	htmlDevice( 'playback' );
	var D = S.config.devices;
	$.each( D, ( k, v ) => {
		if ( [ 'capture', 'playback' ].includes( k ) ) {
			var $div = k === 'capture' ? $( '#divcapturedevice' ) : $( '#divplaybackdevice' );
			$.each( v, ( key, val ) => $div.find( '.'+ key ).val( val ) );
			return
		}
		
		if ( [ 'samplerate', 'capture_samplerate' ].includes( k ) ) {
			var $div = k === 'samplerate' ? $( '#divsampling' ) : $( '#divresampling' );
			var $divinput = $div.find( 'input' );
			var $divother = $div.find( '.divother' );
			if ( samplerate.includes( v ) ) {
				$divother.addClass( 'hide' );
				$divinput.val( 0 );
			} else {
				$divother.removeClass( 'hide' );
				$divinput.val( v );
				v = 'Other';
			}
		}
		var $el = $( '.'+ k );
		$el.is( ':checkbox' ) ? $el.prop( 'checked', v ) : $el.val( v );
	} );
	$( '#divrateadjust .divtoggle' ).toggleClass( 'hide', ! D.enable_rate_adjust );
	$( '#divresampling .divtoggle' ).toggleClass( 'hide', ! D.enable_resampling );
//	$( '#divcapturedevice, #divplaybackdevice' ).find( '.col-l:eq( 0 ), .col-r:eq( 0 )' ).addClass( 'hide' );
	$( '#divcapturedevice .device' ).addClass( 'disabled' );
	$( '#divplaybackdevice .type option[value=Stdin]' )
		.text( 'Stdout' )
		.prop( 'value', 'Stdout' )
	$( '#div'+ V.currenttab ).removeClass( 'hide' );
	$( '#'+ V.currenttab ).addClass( 'active' );
	showContent();
}
