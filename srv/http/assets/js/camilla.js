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
	F.currenttab = id;
	$( '#bar-bottom div' ).removeClass( 'active' );
	$( '#'+ id ).addClass( 'active' );
	$( '.tab > .section' ).addClass( 'hide' );
	$( '#div'+ id ).removeClass( 'hide' );
} );
$( '#setting-enable_rate_adjust' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, numberlabel  : [ 'Adjust period', 'Target level' ]
		, boxwidth     : 100
		, values       : { adjust_period: D.adjust_period, target_level: D.target_level }
		, checkchanged : D.enable_rate_adjust
		, cancel       : switchCancel
		, ok           : () => {
			var val =  infoVal();
			[ 'adjust_period', 'target_level' ].forEach( k => D[ k ] = val[ k ] );
			D.enable_rate_adjust = true;
			saveConfig();
		}
	} );
} );
$( '#setting-enable_resampling' ).on( 'click', function() {
	infoResampling( D.resampler_type === 'FreeAsync' );
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var SW  = { icon: 'camilladsp' }
var kv  = {
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
var F   = {
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
			number: { q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
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
var sampletype  = [ 'Synchronous', 'FastAsync', 'BalancedAsync', 'AccurateAsync', 'FreeAsync' ];

var FreeAsync   = {
	  keys          : [ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ]
	, interpolation : [ 'Cubic', 'Linear', 'Nearest' ]
	, window        : [ 'Blackman', 'Blackman2', 'BlackmanHarris', 'BlackmanHarris2', 'Hann', 'Hann2' ]
}
/*
  resample_type:
    FreeAsync:
	  sinc_len: 128
	  oversampling_ratio: 1024
	  interpolation: Linear
	  window: Blackman2
	  f_cutoff: 0.925
*/

var opt_type    = '';
devicetype.forEach( k => opt_type += '<option value="'+ k +'">'+ k +'</option>' );
var opt_format  = '';
F.selectformat.forEach( k => opt_format += '<option value="'+ k +'">'+ k +'</option>' );
var TC          = { Type: opt_type, Channels: 'number' }
var TCS         = { ... TC, 'Sample format': opt_format }
var TCSD        = { ...TCS, Device: 'text' }
var TWasapi     = { ...TCSD, Exclusive: 'checkbox', Loopback: 'checkbox' }
var ESR         = { 'Extra samples': 'number', 'Skip bytes': 'number', 'Read bytes': 'number' }
var input_device  = {
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
function key2label( key ) {
	if ( key === 'ms' ) return 'ms'
	
	var str = key[ 0 ].toUpperCase();
	if ( key.length === 1 ) return str
	
	key = key
			.replace( '_act', ' actual' )
			.replace( '_len', ' length' )
			.replace( 'bytes_lines', 'bytes/lines' )
			.replace( 'chunksize', 'chunk size' )
			.replace( 'f_', 'freq ' )
			.replace( 'queuelimit', 'queue limit' )
			.replace( 'samplerate', 'sample rate' )
			.replace( /_/g, ' ' )
			.replace( 'freq', 'frequency' )
			.slice( 1 )
	return str + key
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
	var select      = [ F.selecttype ];
	var values      = { type: type }
	var key_val     = '';
	if ( subtype ) {
		selectlabel.push( 'subtype' )
		select.push( F.selectsubtype[ type ] );
		values.subtype    = subtype;
		key_val           = F.input_value[ subtype ];
	}
	if ( ! key_val ) key_val = F.input_value[ type ];
	if ( subtype === 'Uniform' ) key_val.amplitude = 1;
	if ( 'select' in key_val ) {
		var kv = key_val.select;
		var k  = Object.keys( kv );
		selectlabel = [ ...selectlabel, ...k ];
		var selectsubtype = subtype === 'Raw' ? [ S.lscoef, F.selectformat ] : [ S.lscoef ];
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
		  icon         : 'SW.icon'
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
				var subtype = type in F.selectsubtype ? F.selectsubtype[ type ][ 0 ] : '';
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
			S.config.filters[ val.name ] = { type: val.type, parameters : param }
			saveConfig();
		}
	} );
}
function infoResampling( freeasync ) {
	var capture_samplerate = D.capture_samplerate;
	if ( ! samplerate.includes( capture_samplerate ) ) capture_samplerate = 'Other';
	var selectlabel        = [ 'Resampler type', 'Capture samplerate' ];
	var select             = [ sampletype, [ ...samplerate, 'Other' ] ];
	var numberlabel        = [ 'Other' ];
	var values             = {
		  resampler_type     : D.resampler_type
		, capture_samplerate : capture_samplerate
		, other              : capture_samplerate
	}
	if ( freeasync ) {
		selectlabel.push( 'interpolation', 'window' );
		select.push( FreeAsync.interpolation, FreeAsync.window );
		numberlabel.push( 'Sinc length', 'Oversampling ratio', 'Frequency cutoff' );
		var F  = D.resampler_type.FreeAsync || {};
		values = {
			  resampler_type     : 'FreeAsync'
			, capture_samplerate : capture_samplerate
			, interpolation      : F.interpolation      || 'Linear'
			, window             : F.window             || 'Blackman2'
			, other              : capture_samplerate
			, sinc_len           : F.sinc_len           || 128
			, oversampling_ratio : F.oversampling_ratio || 1024
			, f_cutoff           : F.f_cutoff           || 0.925
		}
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, selectlabel  : selectlabel
		, select       : select
		, numberlabel  : numberlabel
		, boxwidth     : 160
		, order        : [ 'select', 'number' ]
		, values       : values
		, checkchanged : D.enable_resampling
		, beforeshow   : () => {
			var $trnumber = $( '.trnumber' );
			var $trother = $trnumber.eq( 0 );
			var indextr  = freeasync ? [ 2, 1, 0 ] : [ 0 ]
			indextr.forEach( i => $( '.trselect' ).eq( 1 ).after( $trnumber.eq( i ) ) );
			$trother.toggleClass( 'hide', capture_samplerate !== 'Other' );
			$( '#infoContent select' ).eq( 0 ).on( 'change', function() {
				if ( $( this ).val() === 'FreeAsync' ) {
					infoResampling( 'freeasync' );
				} else if ( $trnumber.length > 1 ) {
					infoResampling();
				}
			} );
			$( '#infoContent select' ).eq( 1 ).on( 'change', function() {
				var rate  = $( this ).val();
				var other = rate === 'Other';
				$trother.toggleClass( 'hide', ! other );
				if ( ! other ) $trother.find( 'input' ).val( rate );
			} );
		}
		, cancel       : switchCancel
		, ok           : () => {
			var val = infoVal();
			if ( val.capture_samplerate === 'Other' ) val.capture_samplerate = val.other;
			[ 'resampler_type', 'capture_samplerate' ].forEach( k => D[ k ] = val[ k ] );
			if ( freeasync ) {
				var v = {}
				FreeAsync.keys.forEach( k => v[ k ] = val[ k ] );
				D.resampler_type = { FreeAsync: v }
			}
			D.enable_resampling = true;
			saveConfig();
		}
	} );
}
function infoSaveFailed( title, name ) {
	info( {
		  icon    : 'SW.icon'
		, title   : title
		, message : iconwarning +'Save <wh>'+ name +'</wh> failed.'
	} );
}
function labelArraySet( array ) {
	var capitalized = array.map( el => key2label( el ) );
	return capitalized
}
function renderPage() {
	D        = S.config.devices;
	S.bass   = S.config.filters.Bass.parameters.gain;
	S.treble = S.config.filters.Treble.parameters.gain;
	[ 'volume', 'bass', 'treble' ].forEach( el => {
		var val = S[ el ];
		$( '#'+ el +' input' ).val( val );
		$( '#'+ el +' .value' ).text( val +( val ? 'dB' : '' ) );
	} );
	var status =  S.status +'<c>'+ S.name +'</c>'
				
	$( '#statusvalue' ).html( status );
	statusList( 'capture' );
	statusList( 'playback' );
	statusList( 'sampling', [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout', 'rate_measure_interval' ] );
	var keys = [];
	if ( D.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
	if ( D.enable_resampling ) keys.push( 'resampler_type', 'capture_samplerate' );
	keys.length ? statusList( 'options', keys ) : $( '#divoptions .statuslist' ).empty();
	$( '#div'+ F.currenttab ).removeClass( 'hide' );
	$( '#'+ F.currenttab ).addClass( 'active' );
	showContent();
}
function saveConfig() {
	notifyCommon();
	bash( [ 'save', JSON.stringify( S.config ), 'CMD JSON' ], error => {
		if ( error ) {
			info( {
				  icon    : SW.icon
				, title   : SW.title
				, message : 'Error: '+ error
			} );
		}
	} );
}
function statusList( section, keys ) {
	if ( [ 'capture', 'playback' ].includes( section ) ) {
		var kv = D[ section ]
		keys   = Object.keys( kv );
	} else {
		var kv =  D;
	}
	var labels = '';
	var values = '';
	keys.forEach( k => {
		labels += key2label( k ) +'<br>';
		values += kv[ k ] +'<br>';
	} );
	if ( D.resampler_type === 'FreeAsync' ) {
		[ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ].forEach( k => {
			labels += key2label( k ) +'<br>';
			values += D.resampler_type.FreeAsync[ k ] +'<br>';
		} );
	}
	$( '#div'+ section +' .statuslist' ).html(
		'<div class="col-l text gr">'+ labels +'</div><div class="col-r text">'+ values +'</div><div style="clear:both"></div>'
	);
}
