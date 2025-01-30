W.volume      = data => {
	if ( V.local ) {
		V.local = false;
		return
	}
	
	var vol = data.val;
	if ( data.type === 'mute' ) {
		common.volumeAnimate( 0, S.volume );
		S.volume     = 0;
		S.volumemute = vol;
	} else if ( data.type === 'unmute' ) {
		common.volumeAnimate( S.volumemute, 0 );
		S.volume     = vol;
		S.volumemute = 0;
	} else {
		if ( data.type === 'drag' ) {
			V.drag = true;
			setTimeout( () => V.drag = false, 300 );
		}
		common.volumeAnimate( vol, S.volume );
		S.volume = vol;
	}
}
W.refresh     = data => {
	if ( V.press || V.local || data.page !== 'camilla' ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		data.config = JSON.parse( data.config );
		$.each( data, ( k, v ) => { S[ k ] = v } );
		config.valuesAssign();
		render[ V.tab ]();
	}, 300 );
}
// variables //////////////////////////////////////////////////////////////////////////////
V             = {
	  clipped    : false
	, tab        : 'filters'
	, timeoutred : true
}
var wscamilla = null
var R         = {} // range
var X         = {} // flowchart
// filters //////////////////////////////////////////////////////////////////////////////
var F0        = {
	  type         : [
		  'Type'
		, 'select'
		, [ 'Gain', 'Loudness', 'Delay', 'Conv', 'Biquad', 'BiquadCombo', 'Dither', 'Limiter', 'DiffEq' ] // omit Volume - use alsa directly
	]
	, subtype      : {
		  Conv        : [
			  'Subtype'
			, 'select'
			, [ 'Dummy', 'Raw', 'Wav', 'Values' ]
		]
		, Biquad      : [
		    'Subtype'
		  , 'select'
		  , [ 'Free', 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO', 'Peaking', 'Notch', 'GeneralNotch', 'Bandpass',  'Allpass',   'AllpassFO',  'LinkwitzTransform' ]
		]
		, BiquadCombo : [
			  'Subtype'
			, 'select'
			, [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass', 'Tilt', 'FivePointPeq', 'GraphicEqualizer' ]
		]
		, Dither      : [
			  'Subtype'
			, 'select'
			, [ 'None',           'Flat',          'Highpass',  'Fweighted441',  'FweightedShort441', 'FweightedLong441', 'Gesemann441',   'Gesemann48', 'Lipshitz441',  'LipshitzLong441', 'Shibata441'
			  , 'ShibataHigh441', 'ShibataLow441', 'Shibata48', 'ShibataHigh48', 'ShibataLow48',      'Shibata882',       'ShibataLow882', 'Shibata96',  'ShibataLow96', 'Shibata192',      'ShibataLow192' ]
		]
	}
	, freq         : [ 'Frequency', 'number' ]
	, gain         : [ 'Gain',      'number' ]
	, q            : [ 'Q',         'number' ]
	, qbandwidth   : [ '',          'radio', { Q: 'q', Bandwidth: 'bandwidth' } ]
	, name         : [ 'Name',      'text' ]
	, fader        : [ 'Fader',     'text' ]
	, FivePointPeq : {
		  Lowshelf  : [ 'fls', 'gls', 'qls' ]
		, Peaking1  : [ 'fp1', 'gp1', 'qp1' ]
		, Peaking2  : [ 'fp2', 'gp2', 'qp2' ]
		, Peaking3  : [ 'fp3', 'gp3', 'qp3' ]
		, Highshelf : [ 'fhs', 'ghs', 'qhs' ]
	}
}
var F1        = {
	  pass   : [ F0.name, F0.type, F0.subtype.Biquad, F0.freq, F0.q ]
	, conv   : [ F0.name, F0.type, F0.subtype.Conv ]
	, fader  : [ F0.name, F0.type, F0.fader ]
	, combo  : [ F0.name, F0.type, F0.subtype.BiquadCombo, [ 'Order', 'number' ], F0.freq ]
}
var Flist     = {
	  pass    : F1.pass
	, shelf   : [ ...F1.pass.slice( 0, 4 ), F0.gain, F0.q, [ '', 'radio', { Q: 'q', Slope: 'slope' } ] ]
	, passFO  : F1.pass.slice( 0, 4 )
	, shelfFO : [ ...F1.pass.slice( 0, 4 ), F0.gain ]
	, Notch   : [ ...F1.pass, F0.qbandwidth ]
}
var F         = {
	  Gain        : [
		  F0.name
		, F0.type
		, F0.gain
		, [ '',         'radio', { dB: 'dB', Linear: 'linear' } ]
		, [ 'Inverted', 'checkbox' ]
		, [ 'Mute',     'checkbox' ]
	]
	, Volume      : [
		  ...F1.fader
		, [ 'Ramp time', 'number' ]
	]
	, Loudness    : [
		  ...F1.fader
		, [ 'Reference level', 'number' ]
		, [ 'High boost',      'number' ]
		, [ 'Low boost',       'number' ]
		, [ 'Attenuate mid',   'checkbox' ]
	]
	, Delay       : [
		  F0.name
		, F0.type
		, [ 'ms',        'number' ]
		, [ '',          'radio', { ms: 'ms', mm: 'mm', Sample: 'samples' } ]
		, [ 'Subsample', 'checkbox' ]
	]
	, Conv        : {
		  Dummy  : [
			  ...F1.conv
			, [ 'Length', 'number' ]
		]
		, Raw    : [
			  ...F1.conv
			, [ 'File',             'select' ]
			, [ 'Format',           'select', [ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ] ]
			, [ 'Skip bytes lines', 'number' ]
			, [ 'Read bytes lines', 'number' ]
		]
		, Wav    : [
			  ...F1.conv
			, [ 'File',    'select' ]
			, [ 'Channel', 'number' ]
		]
		, Values : [
			  ...F1.conv
			, [ 'Values', 'text' ]
		]
	}
	, Biquad      : {
		  Free              : [
			...F1.pass.slice( 0, 3 )
			, [ 'a1', 'number' ]
			, [ 'a2', 'number' ]
			, [ 'b0', 'number' ]
			, [ 'b1', 'number' ]
			, [ 'b2', 'number' ]
		]
		, Lowpass           : Flist.pass
		, Highpass          : Flist.pass
		, Lowshelf          : Flist.shelf
		, Highshelf         : Flist.shelf
		, LowpassFO         : Flist.passFO
		, HighpassFO        : Flist.passFO
		, LowshelfFO        : Flist.shelfFO
		, HighshelfFO       : Flist.shelfFO
		, Peaking           : [ ...F1.pass.slice( 0, 4 ), F0.gain, F0.q, F0.qbandwidth ]
		, Notch             : Flist.Notch
		, GeneralNotch      : [
			...F1.pass.slice( 0, 3 )
			, [ 'Zero frequency',  'number' ]
			, [ 'Pole frequency',  'number' ]
			, [ 'Pole Q',          'number' ]
			, [ 'Normalize at DC', 'checkbox' ]
		]
		, Bandpass          : Flist.Notch
		, Allpass           : Flist.Notch
		, AllpassFO         : Flist.passFO
		, LinkwitzTransform : [
			...F1.pass.slice( 0, 3 )
			, [ 'Q act',            'number' ]
			, [ 'Q target',         'number' ]
			, [ 'Frequency act',    'number' ]
			, [ 'Frequency target', 'number' ]
		]
	}
	, BiquadCombo : {
		  ButterworthLowpass    : F1.combo
		, ButterworthHighpass   : F1.combo
		, LinkwitzRileyLowpass  : F1.combo
		, LinkwitzRileyHighpass : F1.combo
		, Tilt                  : [
			  ...F1.combo.slice( 0, 3 )
			, [ 'Gain', 'number' ]
		]
		, FivePointPeq          : [
			  ...F1.combo.slice( 0, 3 )
			, [ 'Lowshelf',  'text' ] // fls, gls, qls
			, [ 'Peaking 1', 'text' ] // fp1, gp1, qp1
			, [ 'Peaking 2', 'text' ] // fp2, gp2, qp2
			, [ 'Peaking 3', 'text' ] // fp3, gp3, qp3
			, [ 'Highshelf', 'text' ] // fhs, ghs, qhs
			, [ '',          '', '&nbsp;<c>freq, gain, q</c>' ]
		]
		, GraphicEqualizer     : [
			  ...F1.combo.slice( 0, 3 )
			, [ 'Frequency min', 'number' ]
			, [ 'Frequency max', 'number' ]
			, [ 'Bands',         'number' ]
		]
	}
	, Dither      : [
		  F0.name
		, F0.type
		, F0.subtype.Dither
		, [ 'Bits', 'number' ]
	]
	, Limiter     : [
		  F0.name
		, F0.type
		, [ 'Clip limit', 'number' ]
		, [ 'Soft clip',  'checkbox' ]
	]
	, DiffEq      : [
		F0.name
	  , F0.type
	  , [ 'a', 'text' ]
	  , [ 'b', 'text' ]
	]
//
	, values      : {
		  Gain              : { name: '', type: '', gain: 0, scale: 'dB', inverted: false, mute: false } // +-150dB / +-10 linear
		, Volume            : { name: '', type: '', ramp_time: 400, fader: 'Aux1' }
		, Loudness          : { name: '', type: '', fader : 'main', reference_level: 25, high_boost: 10, low_boost: 10, attenuate_mid: false }
		, Delay             : { name: '', type: '', delay: 0, unit: 'ms', subsample: false }
		// Conv
		, Dummy             : { name: '', type: '', subtype: '', length: 65536 } // min = 1
		, Raw               : { name: '', type: '', subtype: '', filename: '', format: 'TEXT', skip_bytes_lines: 0, read_bytes_lines: 0 }
		, Wav               : { name: '', type: '', subtype: '', filename: '', channel: 0 }
		, Values            : { name: '', type: '', subtype: '', values: [ 1, 0, 0, 0 ] }
		// Biquad
		, pass              : { name: '', type: '', subtype: '', freq: 1000, q: 0 }
		, shelf             : { name: '', type: '', subtype: '', freq: 1000, gain: 0, q: 0, unit: 'q' }
		, passFO            : { name: '', type: '', subtype: '', freq: 1000, name: '' }
		, shelfFO           : { name: '', type: '', subtype: '', freq: 1000, gain: 0 }
		, Notch             : { name: '', type: '', subtype: '', freq: 1000, q: 0, unit: 'q' }
		, GeneralNotch      : { name: '', type: '', subtype: '', freq_z: 0,  freq_p: 0, q_p: 0, normalize_at_dc:false }
		, Peaking           : { name: '', type: '', subtype: '', freq: 1000, gain: 0, q: 0, unit: 'q' }
		, LinkwitzTransform : { name: '', type: '', subtype: '', q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
		, Free              : { name: '', type: '', subtype: '', a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
		// BiquadCombo
		, BiquadCombo       : { name: '', type: '', subtype: '', order: 2, freq: 1000 }
		, Tilt              : { name: '', type: '', subtype: '', gain: 0 }
		, FivePointPeq      : { name: '', type: '', subtype: '', Lowshelf: [ 0, 0, 0 ], Peaking1: [ 0, 0, 0 ], Peaking2: [ 0, 0, 0 ], Peaking3: [ 0, 0, 0 ], Highshelf: [ 0, 0, 0 ] }
		, GraphicEqualizer  : { name: '', type: '', subtype: '', freq_min: 20, freq_max: 20000, bands: 10 }
		//
		, Dither            : { name: '', type: '', subtype: '', bits: 16 }
		, Limiter           : { name: '', type: '', clip_limit: -10.0, soft_clip: false }
		, DiffEq            : { name: '', type: '', a: [ 1, 0 ], b: [ 1, 0 ] }
	}
}
var P         = { // processor
	  Compressor : [
		  [ 'Name',             'text' ]
		, [ 'Type',             'select', [ 'Compressor' ] ]
		, [ 'Channels',         'number' ]
		, [ 'Attack',           'number' ]
		, [ 'Release',          'number' ]
		, [ 'Threshold',        'number' ]
		, [ 'Factor',           'number' ]
		, [ 'Makeup gain',      'number' ]
		, [ 'Clip limit',       'number' ]
		, [ 'Soft clip',        'checkbox' ]
		, [ 'Monitor channels', 'text' ]
		, [ 'Process channels', 'text' ]
	]
	, values     : {
		Compressor : { name: '', type: '', channels: 2, attack: 0.025, release: 1.0, threshold: -25, factor: 5.0, makeup_gain: 0, clip_limit: 0, soft_clip: false, monitor_channels: '0, 1', process_channels: '0, 1' }
	}
}
// devices /////////////////////////////////////////////////////////////////////////////////////////
var D0        = {
	  main       : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout' ]
	, listsample : {} // on GetSupportedDeviceTypes
	, samplerate : [] // ^
}
var Dlist     = {
	  type               : [ 'Type',               'select', [ 'AsyncSinc', 'AsyncPoly', 'Synchronous' ] ]
	, profile            : [ 'Profile',            'select', { kv: [ 'Accurate', 'Balanced', 'Fast', 'VeryFast', 'Custom' ], nosort: true } ]
	, typeC              : [ 'Type',               'select', {} ] // on 'GetSupportedDeviceTypes'
	, typeP              : [ 'Type',               'select', {} ] // ^
	, deviceC            : [ 'Device',             'select', {} ]                                    // ^ > hwparams
	, deviceP            : [ 'Device',             'select', {} ]                                    // ^
	, formatC            : [ 'Format',             'select', { kv: {}, nosort: true } ]              // ^
	, formatP            : [ 'Format',             'select', { kv: {}, nosort: true } ]              // ^
	, filename           : [ 'Filename',           'select', { kv: {}, nosort: true } ]              // ^
	, channelsC          : [ 'Channels',           'number', { updn: { step: 1, min: 1, max: 1 } } ] // ^
	, channelsP          : [ 'Channels',           'number', { updn: { step: 1, min: 1, max: 1 } } ] // ^
	, extra_samples      : [ 'Extra samples',      'number' ]
	, skip_bytes         : [ 'Skip bytes',         'number' ]
	, read_bytes         : [ 'Read bytes',         'number' ]
	, capture_samplerate : [ 'Capture samplerate', 'select', { kv: {}, nosort: true } ]              // ^
	, exclusive          : [ 'Exclusive',          'checkbox' ]
	, loopback           : [ 'Loopback',           'checkbox' ]
	, change_format      : [ 'Change format',      'checkbox' ]
}
var D1        = {
	  AlsaC : [ Dlist.typeC, Dlist.deviceC, Dlist.formatC, Dlist.channelsC ]
	, AlsaP : [ Dlist.typeP, Dlist.deviceP, Dlist.formatP, Dlist.channelsP ]
	, extra : [ Dlist.extra_samples, Dlist.skip_bytes, Dlist.read_bytes ]
}
var D         = {
	  main      : [
		  [ 'Sample rate',       'select', { kv: {}, nosort: true } ]                               // ^
		, [ 'Chunk size',        'number' ]
		, [ 'Queue limit',       'number' ]
		, [ 'Silence Threshold', 'number' ]
		, [ 'Silence Timeout',   'number' ]
	]
	, capture   : {
		  Alsa      : D1.AlsaC
		, CoreAudio : [ ...D1.AlsaC, Dlist.change_format ]
		, Pulse     : D1.AlsaC
		, Wasapi    : [ ...D1.AlsaC, Dlist.exclusive, Dlist.loopback ]
		, Jack      : [ Dlist.typeC, Dlist.channelsC ]
		, Stdin     : [ Dlist.typeC, Dlist.formatC, Dlist.channelsC, ...D1.extra ]
		, RawFile   : [ Dlist.typeC, Dlist.filename, Dlist.formatC, Dlist.channelsC, ...D1.extra ]
		, WavFile   : [ Dlist.typeC, Dlist.filename, Dlist.formatC, Dlist.channelsC, ...D1.extra ]
	}
	, playback  : {
		  Alsa      : D1.AlsaP
		, CoreAudio : [ ...D1.AlsaP, Dlist.change_format ]
		, Pulse     : D1.AlsaP
		, Wasapi    : [ ...D1.AlsaP, Dlist.exclusive, Dlist.loopback ]
		, Jack      : [ Dlist.typeP, Dlist.channelsP ]
		, Stdout    : [ Dlist.typeP, Dlist.formatP, Dlist.channelsP ]
		, File      : [ Dlist.typeP, Dlist.filename, Dlist.formatP, Dlist.channelsP ]
	}
	, values    : {
		  Alsa      : { type: '', device: '',   format: '', channels: 2 }
		, CoreAudio : { type: '', device: '',   format: '', channels: 2, change_format: '' }
		, Pulse     : { type: '', device: '',   format: '', channels: 2 }
		, Wasapi    : { type: '', device: '',   format: '', channels: 2, exclusive: false, loopback: false }
		, Jack      : { type: '',                           channels: 2 }
		, Stdin     : { type: '',               format: '', channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		, Stdout    : { type: '',               format: '', channels: 2 }
		, RawFile   : { type: '', filename: '', format: '', channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		, WavFile   : { type: '', filename: '', format: '', channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		, FileP     : { type: '', filename: '', format: '', channels: 2 }
	}
	, resampler : {
		  AsyncSinc    : [
			  Dlist.type
			, Dlist.profile
		]
		, Custom       : [
			  Dlist.type
			, Dlist.profile
			, [ 'Sinc length',         'number' ]
			, [ 'Oversampling factor', 'number' ]
			, [ 'F cutoff',            'number' ]
			, [ 'Interpolation',       'select', [ 'Nearest', 'Linear',    'Quadratic',       'Cubic' ] ]
			, [ 'Window',              'select', [ 'Hann2',   'Blackman2', 'BlackmanHarris2', 'BlackmanHarris2' ] ]
		]
		, AsyncPoly    : [
			  Dlist.type
			, [ 'Interpolation',       'select', [ 'Linear',  'Cubic',     'Quintic',         'Septic' ] ]
		]
		, Synchronous : [
			  Dlist.type
		]
		, values      : {
			  AsyncSinc   : { type: 'AsyncSinc', profile: 'Balanced' }
			, Custom      : { type: 'AsyncSinc', profile: 'Custom', sinc_len: 128, oversampling_factor: 256, f_cutoff: 0.9, interpolation: 'Cubic', window: 'Hann2' }
			, AsyncPoly   : { type: 'AsyncPoly', interpolation: 'Cubic' }
			, Synchronous : { type: 'Synchronous' }
		}
	}
}
// graph //////////////////////////////////////////////////////////////////////////////
var color     = {
	  g   : 'hsl( 100, 90%,  40% )'
	, gd  : 'hsl( 100, 90%,  20% )'
	, gr  : 'hsl( 200, 3%,   30% )'
	, grl : 'hsl( 200, 3%,   50% )'
	, grd : 'hsl( 200, 3%,   20% )'
	, grk : 'hsl( 200, 3%,   10% )'
	, m   : 'hsl( 200, 100%, 50% )'
	, md  : 'hsl( 200, 100%, 20% )'
	, o   : 'hsl( 30,  80%,  50% )'
	, od  : 'hsl( 30,  80%,  20% )'
	, r   : 'hsl( 0,   70%,  50% )'
	, rd  : 'hsl( 0,   70%,  20% )'
	, w   : 'hsl( 200, 3%,   60% )'
	, wl  : 'hsl( 200, 3%,   80% )'
}
var ycommon   = {
	  overlaying : 'y'
	, side       : 'right'
	, anchor     : 'free'
	, autoshift  : true
}
var ticktext  = [ 20, 50, 100, 500, '1k', '5k', '10k', '20k' ];
var axes      = {
	  freq       : {
		  filters  : {
			  tickfont  : { color: color.wl }
			, tickvals  : [ 235, 393, 462, 624, 694, 858, 926, 995 ] // 235>|  ...  | 69 |  163  | 69 |  163  | 69 | .. |<995
			, ticktext  : ticktext
			, range     : [ 235, 995 ]
			, gridcolor : color.grd
		}
		, pipeline : {
			  tickfont  : { color: color.wl }
			, tickvals  : [ 4, 210, 300, 511, 602, 816, 905, 995 ]   //   4>|  ...  | 90 |  213  | 90 |  213  | 90 | .. |<995
			, ticktext  : ticktext
			, range     : [ 4, 995 ]
			, gridcolor : color.grd
		}
	}
	, time       : {
		  title      : {
			  text     : 'Time'
			, font     : { color: color.grl }
			, standoff : 0
		}
		, tickfont   : { color: color.grl }
		, gridcolor  : color.grk
		, overlaying : 'x'
		, side       : 'top'
	}
	, magnitude  : {
		  title        : {
			  text     : 'Gain'
			, font     : { color: color.m }
			, standoff : 0
		}
		, tickfont      : { color: color.m }
		, zerolinecolor : color.w
		, linecolor     : color.md
		, gridcolor     : color.md
	}
	, phase      : {
		  title      : {
			  text     : 'Phase'
			, font     : { color: color.r }
			, standoff : 0
		}
		, tickfont   : { color: color.r }
		, overlaying : 'y'
		, side       : 'right'
		, range      : [ -180, 180 ]
		, dtick      : 90
		, zeroline   : false
		, linecolor  : color.rd
		, gridcolor  : color.rd
	}
	, groupdelay : {
		  title      : {
			  text     : 'Delay'
			, font     : { color: color.o }
			, standoff : 0
		}
		, tickfont   : { color: color.o }
		, zeroline   : false
		, linecolor  : color.od
		, gridcolor  : color.od
		, ...ycommon
		, shift      : 10
	}
	, impulse    : {
		  title      : {
			  text     : 'Impulse'
			, font     : { color: color.g }
			, standoff : 0
		}
		, tickfont   : { color: color.g }
		, zeroline   : false
		, linecolor  : color.gd
		, gridcolor  : color.gd
		, overlaying : 'y'
		, side       : 'left'
		, anchor     : 'free'
		, autoshift  : true
		, shift      : -10
	}
}
var plots     = {
	  groupdelay : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Delay'
		, line  : { width : 2, color: color.o }
	}
	, impulse    : {
		  xaxis : 'x2'
		, yaxis : 'y4'
		, type  : 'scatter'
		, name  : 'Impulse'
		, line  : { width : 1, color: color.g }
	}
	, layout     : {
		  margin        : { t: 10, r: 40, b: 40, l: 40 }
		, paper_bgcolor : '#000'
		, plot_bgcolor  : '#000'
		, showlegend    : false
		, hovermode     : false
		, dragmode      : 'zoom'
		, font          : { family: 'Inconsolata', size: 14 }
	}
	, magnitude  : {
		  yaxis : 'y'
		, type  : 'scatter'
		, name  : 'Gain'
		, line  : { width : 3, color: color.m }
	}
	, options    : {
		  displayModeBar : false
		, responsive     : true
		, staticPlot     : true // disable zoom
//		, scrollZoom     : true
	}
	, phase      : {
		  yaxis : 'y2'
		, type  : 'scatter'
		, name  : 'Phase'
		, line  : { width : 2, color : color.r }
	}
}

// functions //////////////////////////////////////////////////////////////////////////////
function renderPage() { // common from settings.js - render with 'GetConfigJson'
	wscamilla && wscamilla.readyState === 1 ? common.wsGetConfig() : common.webSocket();
}
function onPageInactive() {
	if ( wscamilla ) wscamilla.close();
}

var config    = {
	  configuration       : () => {
		if ( $( '#divconfig' ).hasClass( 'hide' ) ) {
			V.tabprev = V.tab;
			V.tab     = 'config';
			render.tab();
		} else {
			$( '#tab'+ V.tabprev ).trigger( 'click' );
		}
	}
	, enable_rate_adjust  : () => {
		if ( $( '#setting-enable_rate_adjust' ).siblings( 'input' ).hasClass( 'disabled' ) ) {
			info( {
				  ...SW
				, message : 'Resampler type is <wh>Synchronous</wh>'
			} );
			switchCancel();
			return
		}
		
		var enabled = S.enable_rate_adjust;
		info( {
			  ...SW
			, list         : [
				  [ 'Adjust period', 'number' ]
				, [ 'Target level',  'number' ]
			]
			, boxwidth     : 100
			, values       : {
				  adjust_period : DEV.adjust_period
				, target_level  : DEV.target_level
			}
			, checkchanged : enabled
			, cancel       : switchCancel
			, ok           : () => {
				var val =  infoVal();
				[ 'adjust_period', 'target_level' ].forEach( k => DEV[ k ] = val[ k ] );
				DEV.enable_rate_adjust = true;
				setting.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, capture_samplerate  : () => {
		var enabled = S.capture_samplerate;
		info( {
			  ...SW
			, list         : Dlist.capture_samplerate
			, boxwidth     : 120
			, values       : [ DEV.capture_samplerate ]
			, checkchanged : enabled
			, cancel       : switchCancel
			, beforeshow   : () => $( '#infoList option[value='+ DEV.samplerate +']' ).remove()
			, ok           : () => {
				DEV.capture_samplerate = infoVal();
				setting.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, resampler           : () => setting.resampler( S.resampler ? DEV.resampler.type : 'AsyncSinc' )
	, stop_on_rate_change : () => {
		var enabled = S.stop_on_rate_change;
		info( {
			  ...SW
			, list         : [ 'Rate mearsure interval', 'number' ]
			, boxwidth     : 65
			, values       : DEV.rate_measure_interval
			, checkchanged : enabled
			, cancel       : switchCancel
			, ok           : () => {
				DEV.stop_on_rate_change   = true;
				DEV.rate_measure_interval = infoVal();
				setting.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, valuesAssign        : () => { // DEV, MIX, FIL, PRO, DEV ...
		[ 'devices', 'mixers', 'filters', 'processors', 'pipeline' ].forEach( k => {
			window[ k.slice( 0, 3 ).toUpperCase() ] = S.config[ k ];
		} );
		[ 'capture_samplerate', 'enable_rate_adjust', 'resampler', 'stop_on_rate_change' ].forEach( k => {
			S[ k ] = DEV[ k ] === true;
		} );
		var dev                          = S.devices;
		var samplings                    = dev.playback.samplings;
		D0.samplerate                    = Object.values( samplings );
		D.main[ 0 ][ 2 ].kv              = samplings;
		Dlist.capture_samplerate[ 2 ].kv = samplings;
		Dlist.formatC[ 2 ].kv            = dev.capture.formats;
		Dlist.formatP[ 2 ].kv            = dev.playback.formats;
		Dlist.deviceC[ 2 ]               = dev.capture.device;
		Dlist.deviceP[ 2 ]               = dev.playback.device;
		Dlist.channelsC[ 2 ].updn.max    = dev.capture.channels;
		Dlist.channelsP[ 2 ].updn.max    = dev.playback.channels;
		Dlist.filename[ 2 ].kv           = S.ls.raw;
	}
}
var graph     = {
	  pipeline    : {
		  add       : txt => {
			X.type = txt;
			var cL = DEV[ txt.toLowerCase() ].channels;
			graph.pipeline.addFrame( txt, cL );
			for ( var ch = 0; ch < cL; ch++ ) graph.pipeline.addBox( 'ch '+ ch, ch );
		}
		, addBox    : ( txt, ch, gain ) => {
			var c  = {
				  Filter   : color.md
				, Capture  : '#000'
				, Mixer    : color.rd
				, Playback : color.gr
			}
			var y  = X.h + X.h * 2 * ch; // y > down - each channel
			X.box.push( { //----
				  x : X.x
				, y : y
				, w : X.w
				, h : X.h
				, r : Math.round( X.p / 2 )
				, c : c[ X.type ]
			} );
			y       += Math.round( X.h / 2 );
			X.text.push( { //----
				  x : X.x + Math.round( X.w / 2 )
				, y : y
				, t : txt
			} );
			if ( X.type === 'Capture' ) return // no arrows, no gains
			
			X.arrow.push( [ //----
				  { x: X.ax[ ch ], y: y }
				, { x: X.x,        y: y }
			] );
			if ( X.type === 'Playback' ) return // no gains
			
			var g  = X.type === 'Mixer' ? gain[ ch ] : gain;
			var db = graph.pipeline.dbText( g );
			X.text.push( { //----
				  x : X.ax[ ch ] + Math.round( X.w / 2 )
				, y : y
				, t : db.t
				, c : db.c
			} );
			if ( X.type !== 'Mixer' ) return // no crosses
			
			gain.forEach( ( g, s_ch ) => {
				if ( s_ch === ch ) return
				
				var xy     = [
					  { x: X.ax[ s_ch ], y: y + X.h * 2 * ( s_ch - ch ) }
					, { x: X.x,          y: y }
				]
				X.arrow.push( xy ); //----
				var db     = graph.pipeline.dbText( g );
				var x_diff = xy[ 1 ].x - xy[ 0 ].x - X.aw;
				var y_diff = xy[ 1 ].y - xy[ 0 ].y;
				var angle  = Math.atan2( y_diff, x_diff );
				X.text.push( { //----
					  x : xy[ 0 ].x + x_diff / 4
					, y : xy[ 0 ].y + y_diff / 4
					, t : db.t
					, c : db.c
					, a : angle // radian
				} );
			} );
		}
		, addFrame  : ( txt, ch ) => {
			X.box.push( { //----
				  x : X.x - X.p
				, y : X.h - X.p
				, w : X.w + X.p * 2
				, h : X.h * ( ch * 2 - 1 ) + X.p * 2
				, r : X.p
				, c : color.grd
			} );
			X.text.push( { //----
				  x : Math.round( X.x + X.w / 2 )
				, y : Math.round( X.h / 4 )
				, t : txt
				, f : true
			} );
		}
		, ctxShadow : ( offset ) => {
			offset             *= X.dpxr;
			X.ctx.shadowOffsetX = -offset;
			X.ctx.shadowOffsetY = offset;
			X.ctx.shadowBlur    = offset;
			X.ctx.shadowColor   = '#000';
		}
		, dbText    : gain => {
			var c = color.grl;
			if ( gain > 0 )      c = color.m;
			else if ( gain < 0 ) c = color.r;
			if ( gain !== 0 ) gain = ( gain > 0 ? '+' : '' ) + gain.toFixed( 1 );
			return { t: gain, c: c }
		}
		, flowchart : () => {
			var canvasW = $( '#pipeline' ).width();
			var boxL    = 2;                               // capture + playback
			PIP.forEach( pip => {
				boxL += pip.type === 'Filter' ? pip.names.length : 1;
			} );
			var canvasL = boxL * 2;                        // |--boxC----boxN----boxP--|
			var w0      = Math.round( canvasW / canvasL ); // box w (base unit) - round to prevent blurry
			var h0      = Math.round( w0 / 2 );
			var p0      = Math.round( w0 / 10 );
			var ch_capt = DEV.capture.channels;
			var ch_play = DEV.playback.channels;
			var canvasH = h0 * ( Math.max( ch_capt, ch_play ) * 2 ) + p0; // |-label-box0----box1-p|
			X           = {
				  w     : w0
				, h     : h0
				, p     : p0                                   // frame padding
				, x     : h0                                   // box0 start x
				, ax    : new Array( ch_capt ).fill( h0 + w0 ) // arrow line x[ 0 ]: each channel (draw from previous box)
				, aw    : Math.round( w0 / 8 )                 // arrow head w
				, dpxr  : window.devicePixelRatio
				, box   : []
				, text  : []
				, arrow : []
			}
			
			graph.pipeline.add( 'Capture' );
			X.x += X.w * 2;
			PIP.forEach( pip => {
				X.type  = pip.type;
				if ( X.type === 'Filter' ) {
					pip.names.forEach( name => {
						pip.channels.forEach( ch => {
							graph.pipeline.addBox( name, ch, FIL[ name ].parameters.gain );
							X.ax[ ch ] = X.x + X.w;
						} );
						X.x += X.w * 2; // x > right - each filter
					} );
				} else {
					var mapping = MIX[ pip.name ].mapping;
					graph.pipeline.addFrame( pip.name, mapping.length );
					mapping.forEach( m => {
						var ch   = m.dest;
						var gain = [];
						m.sources.forEach( s => { gain[ s.channel ] = s.gain } );
						graph.pipeline.addBox( 'ch '+ ch, ch, gain );
					} );
					var x       = X.x + X.w;
					X.ax        = [ x, x ]; // equalize arrow in
					X.x        += X.w * 2; // x > right - each mixer
				}
			} );
			graph.pipeline.add( 'Playback' );
			$( '#pipeline' ).prepend( '<canvas></canvas>' );
			var $canvas         = $( '#pipeline canvas' );
			$canvas // fix - blur elements
				.attr( 'width', canvasW * X.dpxr )
				.attr( 'height', canvasH * X.dpxr )
				.css( {
					  width  : canvasW +'px'
					, height : canvasH +'px'
					, margin : '20px 0'
				} );
			var canvas          = $canvas[ 0 ];
			var ctx             = canvas.getContext( '2d' );
			X.ctx               = ctx; // for ctxShadow()
			ctx.scale( X.dpxr, X.dpxr );            // ^
			ctx.save();
			X.box.forEach( b => { //-------------------------------
				ctx.fillStyle = b.c;
				ctx.beginPath();
				ctx.roundRect( b.x, b.y, b.w, b.h, b.r );
				ctx.fill();
				graph.pipeline.ctxShadow( 2 );
			} );
			ctx.restore();
			ctx.strokeStyle  = color.gr;
			ctx.fillStyle    = color.grl;
			ctx.beginPath();
			var ay = Math.round( X.aw / 4 );
			var x0, y0, x1, y1, xa;
			X.arrow.forEach( xy => { //-------------------------------
				x0 = xy[ 0 ].x;
				y0 = xy[ 0 ].y;
				x1 = xy[ 1 ].x - 1; // omit mitter head
				y1 = xy[ 1 ].y;
				xa = x1 - X.aw;
				ctx.moveTo( x0, y0 );
				ctx.lineTo( xa, y1 );
				ctx.lineTo( xa, y1 - ay );
				ctx.lineTo( x1, y1 );
				ctx.lineTo( xa, y1 + ay );
				ctx.lineTo( xa, y1 );
				ctx.stroke();
				ctx.fill();
			} );
			ctx.textAlign    = 'center';
			ctx.textBaseline = 'middle';
			X.text.forEach( t => { //-------------------------------
				ctx.fillStyle = t.c || color.wl;
				ctx.font = ( t.c ? 12 : 15 ) +'px Inconsolata';
				if ( t.a ) { // cross gain
					ctx.save();
					ctx.translate( t.x, t.y );
					ctx.rotate( t.a );
					ctx.translate( -t.x,-t.y );
					ctx.fillText( t.t, t.x, t.y );
					ctx.restore();
				} else {
					var txt = t.t;
					if ( ! t.c ) { // gain
						var cL = Math.floor( X.w * 0.9  / ctx.measureText( '0' ).width );
						if ( txt.length > cL ) txt = txt.replace( /^ch /, '' );
						if ( ! t.f ) txt = txt.slice( 0, cL ); // if not fram, trim
					}
					ctx.fillText( txt, t.x, t.y );
				}
				graph.pipeline.ctxShadow( 1 );
			} );
		}
		, refresh   : () => {
			var $flowchart = $( '#pipeline canvas' );
			var fL         = $flowchart.length;
			$flowchart.remove();
			if ( fL ) graph.pipeline.flowchart();
		}
	}
	, plot        : $li => {
		if ( typeof Plotly !== 'object' ) {
			$.getScript( '/assets/js/plugin/'+ jfiles.plotly, () => graph.plot( V.li ) );
			return
		}
		
		var filters = V.tab === 'filters';
		var val     = $li.data( filters ? 'name' : 'index' );
		var filterdelay = false;
		if ( filters ) {
			filterdelay = FIL[ val ].type === 'Delay';
			var delay0  = ! filterdelay && 'gain' in FIL[ val ].parameters && FIL[ val ].parameters.gain === 0;
		} else {
			var pipelinedelay = false;
			var delay0        = true;
			PIP[ val ].names.forEach( n => {
				var filter = FIL[ n ];
				if ( ! pipelinedelay && filter.type === 'Delay' ) pipelinedelay = true;
				if ( delay0 && 'gain' in filter.parameters && filter.parameters.gain !== 0 ) delay0 = false;
			} );
		}
		var args = JSON.stringify( filters ? FIL[ val ] : S.config );
		if ( ! filters ) args = args.replace( /}$/, ',"index":'+ val +'}' );
		bash( [ 'settings/camilla.py', args ], data => {
			var PLOTS   = jsonClone( plots );
			var AXES    = jsonClone( axes );
			var impulse = 'impulse' in data;
			if ( filterdelay ) {
				PLOTS.magnitude.y   = 0;
			} else {
				PLOTS.magnitude.y   = data.magnitude;
				var minmax          = {
					  groupdelay : { min: -10, max: 10 }
					, impulse    : { min:  -1, max: 1 }
					, magnitude  : { min:  -6, max: 6 }
				};
				[ 'groupdelay', 'impulse', 'magnitude' ].forEach( d => {
					if ( ! ( d in data ) ) return
					
					var min = Math.min( ...data[ d ] );
					var max = Math.max( ...data[ d ] );
					max     = Math.max( max, minmax[ d ].max );
					min     = Math.min( min, minmax[ d ].min )
					var abs = Math.max( Math.abs( min ), Math.abs( max ) ) + minmax[ d ].max * 0.1;
					if ( d === 'impulse' ) {
						dtick = abs < 1 ? 0.2 : ( abs < 2 ? 0.5 : 1 );
					} else {
						dtick = abs < 10 ? 2 : ( abs < 20 ? 5 : 10 );
					}
					AXES[ d ].dtick = dtick
					AXES[ d ].range = [ -abs, abs ];
				} );
			}
			PLOTS.phase.y      = data.phase;
			PLOTS.groupdelay.y = delay0 ? 0 : data.groupdelay;
			var plot           = [ PLOTS.magnitude, PLOTS.phase, PLOTS.groupdelay ];
			var layout         = {
				  ...PLOTS.layout
				, xaxis         : AXES.freq[ V.tab ]
				, yaxis         : AXES.magnitude
				, yaxis2        : AXES.phase
				, yaxis3        : AXES.groupdelay
			}
			if ( 'impulse' in data ) { // Conv
				var imL  = data.impulse.length;
				var raw  = imL < 4500;
				var each = raw ? imL / 80 : imL / 120;
				var iL   = raw ? 5 : 7;
				var ticktext = [];
				var tickvals = [];
				for ( var i = 0; i < iL; i++ ) {
					ticktext.push( i * 20 );
					tickvals.push( i * 20 * each );
				}
				ticktext[ i - 1 ]  = '';
				AXES.time.range    = [ 0, imL ];
				AXES.time.tickvals = tickvals;
				AXES.time.ticktext = ticktext;
				layout.margin.t    = 40;
				layout.xaxis2      = AXES.time;
				layout.yaxis4      = AXES.impulse;
				PLOTS.impulse.y    = data.impulse;
				plot.push( PLOTS.impulse );
			}
			$li.find( '.divgraph' ).remove();
			$li.append( '<div class="divgraph"></div>' );
			var $divgraph = $li.find( '.divgraph' );
			Plotly.newPlot( $divgraph[ 0 ], plot, layout, PLOTS.options );
			$divgraph.append( '<i class="i-close graphclose" tabindex="0"></i>' );
		}, 'json' );
	}
	, refresh  : () => {
		$( '#'+ V.tab +' .entries.main .divgraph' ).each( ( i, el ) => {
			graph.plot( $( el ).parent() );
		} );
	}
}
window.addEventListener( 'resize', graph.pipeline.refresh );

var render    = {
	  status      : () => { // onload only
		headIcon();
		if ( S.volume !== false ) {
			$( '#divvolume' ).removeClass( 'hide' );
			$( '#divvolume .control' ).text( S.control );
			render.volume();
		} else {
			$( '#divvolume' ).addClass( 'hide' );
		}
		$( '.rateadjust' ).toggleClass( 'hide', ! S.enable_rate_adjust );
		if ( S.bluetooth ) {
			if ( ! $( '#divconfiguration .col-l i' ).length ) $( '#divconfiguration a' ).after( ico( 'bluetooth' ) );
		} else {
			$( '#divconfiguration .col-l i' ).remove();
		}
		$( '#configuration' )
			.html( htmlOption( S.ls.configs ) )
			.val( S.configname );
		if ( $( '#vu .bar' ).length ) {
			render.vuBarToggle();
			return
		}
		
		var chC     = DEV.capture.channels;
		var chP     = DEV.playback.channels;
		var ch      = chC > chP ? chC : chP;
		var htmlin  = '<div class="bar"></div><div class="bar peak c0"></div><div class="bar rms c0"></div>';
		var htmlout = htmlin.replace( /c0/g, 'p0' );
		if ( chC > 1 ) for ( var i = 1; i < chC; i++ ) htmlin += htmlin.replace( /0/g, i +'' );
		$( '#in' ).html( htmlin );
		if ( chP > 1 ) for ( var i = 1; i < chP; i++ ) htmlout += htmlout.replace( /0/g, i +'' );
		$( '#out' ).html( htmlout );
		render.vuBarToggle();
	}
	, statusStop  : () => {
		if ( ! ( 'intervalvu' in V ) ) return
		
		V.signal = false;
		clearInterval( V.intervalvu );
		delete V.intervalvu;
		render.vuBarToggle();
		$( '#buffer, #load' ).css( 'width', 0 );
		$( '#divstate' ).find( '.buffer, .load, .capture, .rate' ).html( '· · ·' );
	}
	, tab         : () => {
		$( '.section:not( #divstatus )' ).addClass( 'hide' );
		$( '#div'+ V.tab ).removeClass( 'hide' );
		$( '#bar-bottom div' ).removeClass( 'active' );
		$( '#tab'+ V.tab ).addClass( 'active' );
		if ( $( '#'+ V.tab +' .entries.main' ).hasClass( 'hide' ) ) {
			var data = V.tab === 'pipeline' ? 'index' : 'name';
			var val  = $( '#'+ V.tab +' .entries.sub li' ).eq( 0 ).data( data );
			render[ V.tab +'Sub' ]( val );
		} else {
			render[ V.tab ]();
		}
	}
	, volume      : () => {
		render.volumeThumb();
		$( '#divvolume .i-minus' ).toggleClass( 'disabled', S.volume === 0 );
		$( '#divvolume .i-plus' ).toggleClass( 'disabled', S.volume === 100 );
		if ( S.volumemute ) {
			$( '#divvolume .level' ).addClass( 'bl' );
			$( '#divvolume .i-volume' ).addClass( 'mute' );
		} else {
			$( '#divvolume .level' ).removeClass( 'bl' );
			$( '#divvolume .i-volume' ).removeClass( 'mute' );
		}
		$( '#divvolume .level' ).text( S.volumemute || S.volume )
	}
	, volumeThumb : () => {
		$( '#volume .thumb' ).css( 'margin-left', ( 230 - 40 ) / 100 * S.volume );
	}
	, vuBarToggle : () => {
		$( '.peak, .rms, #load, #buffer' ).toggleClass( 'stop', ! V.signal || S.state !== 'play' );
	}
	, vuLevel     : ( rms, cpi, db ) => {
		if ( db < -98 ) {
			var width = 0;
			var left  = 0;
		} else {
			var width = Math.log10( ( 100 + db ) / 10 ) * 200; // -99 = -1, - 100 = -Infinity
			width     = ( width - 100 ) * 2;
			var left  = width - 2;
		}
		if ( rms ) {
			$( '.rms.'+ cpi ).css( 'width', width +'px' );
		} else {
			$( '.peak.'+ cpi ).css( 'left', left +'px' );
			if ( db > 0 ) {
				if ( ! V.timeoutred ) return
				
				clearTimeout( V.timeoutred );
				V.timeoutred = false;
				$( '.peak, .clipped' )
					.css( 'transition-duration', '0s' )
					.addClass( 'red' );
			} else if ( ! V.timeoutred ) {
				V.timeoutred = setTimeout( () => {
					$( '.peak, .clipped' )
						.css( 'transition-duration', '' )
						.removeClass( 'red' );
				}, 200 );
			}
		}
	} //-----------------------------------------------------------------------------------
	, filters     : () => {
		var data     = render.dataSort();
		var li       = '';
		$.each( data, ( k, v ) => li += render.filter( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	}
	, filter      : ( k, v ) => {
		var param    = v.parameters;
		var scale    = false;
		var icongain = '';
		var disabled = '';
		if ( v.type === 'Gain' ) {
			var scale = param.scale === 'linear' ? 100 : 10;
			icongain  = ico( param.mute ? 'volume mute' : 'volume' )
					  + ico( param.inverted ? 'inverted bl' : 'inverted' )
					  + ico( param.scale === 'linear' ? 'linear bl' : 'linear' );
			disabled  = param.mute ? ' disabled' : '';
		}
		if ( 'gain' in param ) {
			var gain = param.gain;
			var li   = '<div class="liinput"><div class="name"><div class="li1">'+ k +'</div>'
					+'<div class="li2">'
					+ ( 'freq' in param ? param.freq +'Hz ' : v.type )
					+ ( 'q' in param ? 'Q:'+ param.q : '' )
					+ ( 'slope' in param ?  'S:'+ param.slope : '' )
					+'</div>'
					+'</div>'
					+ render.htmlRange( scale, gain, disabled )
					+ icongain
					+'</div>';
		} else {
			var paramdata = [ 'FivePointPeq', 'GraphicEqualizer' ].includes( param.type ) ? param.type : render.json2string( param );
			var li        = '<div class="li1">'+ k +'</div>'
						   +'<div class="li2">'+ v.type +' · '+ paramdata +'</div>';
		}
		var $graph   = $( '#filters .entries.main li[data-name="'+ k +'"]' ).find( '.divgraph' );
		if ( $graph.length ) li += $graph[ 0 ].outerHTML;
		var icon;
		if ( param.type === 'GraphicEqualizer' ) {
			icon = 'equalizer';
			var cl_eq = ' class="eq"';
		} else {
			icon = 'filters';
			var cl_eq = '';
		}
		icon        += [ 'Volume', 'Dither', 'Limiter' ].includes( v.type ) ? '' : ' graph';
		icon        += ' liicon edit';
		return '<li data-name="'+ k +'"'+ cl_eq +'>'+ ico( icon ) + li  +'</li>'
	}
	, filtersSub  : k => {
		var li = '<li class="lihead main files">'+ ico( 'folderfilter' ) +'&ensp;Finite Impulse Response'+ ico( 'add' ) + ico( 'back' ) +'</li>';
		if ( S.ls.coeffs ) S.ls.coeffs.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file liicon' ) + k +'</li>' );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
	} //-----------------------------------------------------------------------------------
	, mixers      : () => {
		var data = render.dataSort();
		var li = '';
		$.each( data, ( k, v ) => li += render.mixer( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	}
	, mixer       : ( k, v ) => {
		return '<li data-name="'+ k +'">'+ ico( 'mixers liicon edit' )
			  +'<div class="li1">'+ k +'</div>'
			  +'<div class="li2">In: '+ v.channels.in +' - Out: '+ v.channels.out +'</div>'
			  +'</li>'
	}
	, mixersSub   : name => {
		var iconadd = max => ico( max ? 'add disabled' : 'add' );
		var data    = MIX[ name ].mapping;
		var chin    = DEV.capture.channels;
		var chout   = DEV.playback.channels;
		var li      = '<li class="lihead" data-name="'+ name +'">'+ ico( 'mixers subicon' ) +'&nbsp;<a>'+ name +'</a>'
					 + iconadd( chout === data.length ) + ico( 'back' )
					 +'</li>';
		var optin   = htmlOption( chin );
		var optout  = htmlOption( chout );
		data.forEach( ( kv, i ) => {
			var dest   = kv.dest;
			var opts   = optout.replace( '>'+ dest, ' selected>'+ dest );
			var i_name = ' data-index="'+ i +'" data-name="'+ name +'"';
			li        += '<li class="liinput main dest'+ i +'"'+ i_name +' data-dest="'+ dest +'">'+ ico( 'output liicon' )
						+'<div>Output&ensp;'+ dest +'</div>'
						+ ico( kv.mute ? 'volume mute' : 'volume' ) + iconadd( chout === kv.sources.length )
						+'</li>';
			kv.sources.forEach( ( s, si ) => {
				var source   = data[ i ].sources[ si ];
				var channel  = source.channel;
				var opts     = optin.replace( '>'+ channel, ' selected>'+ channel );
				var gain     = source.gain || 0;
				var disabled = source.mute ? ' disabled' : '';
				var linear   = source.scale === 'linear';
				li += '<li class="liinput dest'+ i +'"'+ i_name +'" data-si="'+ si +'">'+ ico( 'input liicon' ) +'<select>'+ opts +'</select>'
					 + render.htmlRange( linear ? 100 : 10, gain, disabled )
					 + ico( source.mute ? 'volume mute' : 'volume' )
					 + ico( source.inverted ? 'inverted bl' : 'inverted' )
					 + ico( linear ? 'linear bl' : 'linear' )
					 +'</li>';
			} );
		} );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
		selectSet( $( '#mixers select' ) );
	} //-----------------------------------------------------------------------------------
	, processors  : () => {
		var data = render.dataSort();
		var li = '';
		$.each( data, ( k, v ) => {
			var param = jsonClone( v.parameters );
			[ 'channels', 'monitor_channels', 'process_channels' ].forEach( k => delete param[ k ] );
			li += '<li data-name="'+ k +'">'+ ico( 'processors liicon edit' )
				 +'<div class="li1">'+ k +'</div>'
				 +'<div class="li2">'+ v.type +' · '+ render.json2string( param )+'</div>'
				 +'</li>'
		} );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	} //-----------------------------------------------------------------------------------
	, pipeline    : () => {
		$( '.i-flowchart' ).toggleClass( 'disabled', PIP.length === 0 );
		var li = '';
		PIP.forEach( ( el, i ) => li += render.pipe( el, i ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
		render.sortable();
		graph.pipeline.refresh();
	}
	, pipe        : ( el, i ) => {
		var icon  = ( el.bypassed ? 'bypass' : 'pipeline' ) +' liicon edit';
		if ( el.type === 'Filter' ) {
			icon  += ' graph';
			var li = ico( 'filters' ) + el.names.join( ', ' ) +' <gr>(ch: '+ el.channels +')</gr>';
		} else {
			var li = ico( 'mixers' ) + el.name;
		}
		var $graph = $( '#pipeline .entries.main li' ).eq( i ).find( '.divgraph' );
		if ( $graph.length ) li += $graph[ 0 ].outerHTML;
		return '<li data-type="'+ el.type +'" data-index="'+ i +'">'+ ico( icon ) + li +'</li>'
	}
	, sortable    : () => {
		if ( V.sortable ) {
			V.sortable.destroy();
			delete V.sortable;
		}
		if ( $( '#pipeline .entries li' ).length < 2 ) return
		
		V.sortable = new Sortable( $( '#pipeline .entries' )[ 0 ], {
			  ghostClass : 'sortable-ghost'
			, delay      : 400
			, onUpdate   : function ( e ) {
				var ai      = e.oldIndex;
				var bi      = e.newIndex;
				var pip     = PIP;
				var a = pip[ ai ];
				pip.splice( ai, 1 );
				pip.splice( bi, 0, a );
				setting.save( 'Pipeline', 'Change order ...' );
				graph.pipeline.refresh();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, devices     : () => {
		var li  = '';
		[ 'playback', 'capture' ].forEach( d => {
			var dev = DEV[ d ];
			var data = jsonClone( dev );
			var device = dev.device;
			if ( d === 'playback' ) device += ' - '+ S.cardname.replace( / *-* A2DP/, '' );
			[ 'device', 'type' ].forEach( k => delete data[ k ] );
			li += '<li data-type="'+ d +'">'+ ico( d === 'capture' ? 'input' : 'output' )
				 +'<div class="li1">'+ common.key2label( d ) +' <gr>·</gr> '+ render.typeReplace( dev.type )
				 + ( 'device' in dev ? ' <gr>·</gr> '+ device +'</div>' : '' )
				 +'<div class="li2">'+ render.json2string( data ) +'</div>'
				 +'</li>';
		} );
		$( '#devices .entries.main' ).html( li );
		var labels = '';
		var values = '';
		D0.main.forEach( k => {
			if ( k in DEV ) {
				labels += common.key2label( k ) +'<br>';
				values += DEV[ k ].toLocaleString() +'<br>';
			}
		} );
		var keys = [];
		if ( S.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
		if ( S.capture_samplerate ) keys.push( 'capture_samplerate' );
		if ( S.stop_on_rate_change ) keys.push( 'rate_measure_interval' );
		if ( keys.length ) {
			labels += '<hr>';
			values += '<hr>';
			keys.forEach( k => {
				labels += common.key2label( k ) +'<br>';
				values += DEV[ k ].toLocaleString() +'<br>';
			} );
		}
		if ( S.resampler ) {
			labels += 'Resampler<br>'
			values += DEV.resampler.type +'<br>';
			if ( 'profile' in DEV.resampler ) {
				labels += 'Profile<br>'
				values += DEV.resampler.profile +'<br>';
			}
			if ( S.capture_samplerate ) {
				labels += 'Capture samplerate<br>'
				values += DEV.capture_samplerate +'<br>';
			}
		}
		$( '#divsampling .label' ).html( labels );
		$( '#divsampling .value' ).html( values.replace( /bluealsa|Bluez/, 'BlueALSA' ) );
		$( '#enable_rate_adjust' ).toggleClass( 'disabled', S.resampler && DEV.resampler.type === 'Synchronous' );
		switchSet();
	} //-----------------------------------------------------------------------------------
	, config      : () => {
		var li  = '';
		S.ls.configs.forEach( f => {
			var current = f === S.configname ? '<grn>•</grn>&ensp;' : '';
			li += '<li>'+ ico( 'file liicon' ) + current +'<a class="name">'+ f +'</a></li>';
		} );
		$( '#'+ V.tab +' .entries.main' ).html( li );
	} //-----------------------------------------------------------------------------------
	, dataSort    : () => {
		var kv   = S.config[ V.tab ];
		if ( ! kv ) return
		
		var data = {};
		var keys = Object.keys( kv );
		keys.sort().forEach( k => data[ k ] = kv[ k ] );
		return data
	}
	, htmlRange   : ( scale, gain, disabled ) => {
		if ( scale === 100 ) { // filter - Gain / mixer - dB
			var db    = gain;
			var value = gain;
		} else {
			var db    = gain.toFixed( 1 );
			var value = gain * 10
		}
		var disabled = {
			  range : disabled
			, min   : disabled || ( value === -100 ? ' disabled' : '' )
			, max   : disabled || ( value ===  100 ? ' disabled' : '' )
			, db    : disabled || ( value ===    0 ? ' disabled' : '' )
		}
		return   '<i class="i-minus'+ disabled.min +'"></i>'
				+'<input type="range" value="'+ value +'" min="-100" max="100" data-scale="'+ scale +'"'+ disabled.range +'>'
				+'<i class="i-plus'+ disabled.max +'"></i>'
				+'<c class="db'+ disabled.db +'">'+ db +'</c>'
	}
	, json2string : json => {
		return JSON.stringify( json )
					.replace( /[{"}]/g, '' )
					.replace( /type:|filename:.*\/|format:TEXT,|skip_bytes_lines:.*|read_bytes_lines:.*/g, '' )
					.replace( /,$/, '' )
					.replace( /([:,])/g, '$1 ' )
	}
	, toggle      : ( sub ) => {
		var $main = $( '#'+ V.tab +' .entries.main' );
		var $sub  = $( '#'+ V.tab +' .entries.sub' );
		if ( sub || $main.hasClass( 'hide' ) ) {
			$main.addClass( 'hide' );
			$sub.removeClass( 'hide' );
			var $entries = $sub;
		} else {
			$main.removeClass( 'hide' );
			$sub.addClass( 'hide' );
			var $entries = $main;
		}
		$( '#menu' ).addClass( 'hide' );
		graph.refresh();
		$( '.entries' ).children().removeAttr( 'tabindex' );
		$entries.find( '.lihead .i-add, .lihead .i-back' ).prop( 'tabindex', 0 );
		var $li = $entries.find( 'li:not( .lihead )' );
		$li.prop( 'tabindex', 0 );
		if ( 'focused' in V ) {
			$li.eq( V.focused ).trigger( 'focus' );
			delete V.focused;
		}
	}
	, typeReplace : str => {
		return str
				.replace( 'Alsa', 'ALSA' )
				.replace( 'Std',  'std' )
	}
}
var setting   = {
	  filter        : ( type, subtype, name ) => {
		var list  = subtype in F[ type ] ? F[ type ][ subtype ] : F[ type ];
		if ( type === 'Biquad' ) {
			if ( [ 'Hig', 'Low' ].includes( subtype.slice( 0, 3 ) ) ) {
				var vsubtype = subtype.replace( /High|Low/, '' );
			} else if ( subtype.slice( -4 ) === 'pass' ) {
				var vsubtype = 'Notch';
			} else if ( subtype === 'AllpassFO' ) {
				var vsubtype = 'passFO';
			} else {
				var vsubtype = subtype;
			}
		} else if ( type === 'BiquadCombo' ) {
			var vsubtype = [ 'Tilt', 'FivePointPeq', 'GraphicEqualizer' ].includes( subtype ) ? subtype : type;
		} else {
			var vsubtype = subtype;
		}
		var values  = F.values[ vsubtype ];
		values.name = name;
		values.type = type;
		if ( subtype ) values.subtype = subtype;
		var current = name in FIL && FIL[ name ].type === values.type && FIL[ name ].parameters.type === values.subtype;
		if ( current ) {
			if ( subtype === 'FivePointPeq' ) {
				Object.keys( F0.FivePointPeq ).forEach( k => {
					values[ k ] = [];
					F0.FivePointPeq[ k ].forEach( key => values[ k ].push( FIL[ name ].parameters[ key ] ) );
				} );
			} else if ( subtype === 'GraphicEqualizer' ) {
				$.each( FIL[ name ].parameters, ( k, v ) => {
					if ( k === 'type' ) return
					
					k === 'gains' ? values.bands = v.length : values[ k ] = v;
				} );
			} else {
				$.each( FIL[ name ].parameters, ( k, v ) => {
					if ( k === 'type' ) return
					
					values[ k ] = v;
				} );
			}
		}
		var title       = name ? 'Filter' : 'Add Filter';
		info( {
			  icon         : V.tab
			, title        : title
			, list         : list
			, boxwidth     : 198
			, values       : values
			, checkblank   : true
			, checkchanged : current
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).css( 'min-width', '125px' );
				var $select = $( '#infoList select' );
				$select.eq( 0 ).on( 'input', function() {
					var val     = infoVal();
					var subtype = val.type in F0.subtype ? val.subtype : val.type;
					setting.filter( val.type, subtype, val.name );
				} );
				$select.eq( 1 ).on( 'input', function() {
					var val = infoVal();
					if ( val.type === 'Conv' && [ 'Raw', 'Wav' ].includes( val.subtype ) && ! S.ls.coeffs ) {
						info( {
							  icon    : V.tab
							, title   : title
							, message : 'Filter files not available.'
							, ok      : () => setting.filter( 'Conv', subtype, val.name )
						} );
					} else {
						setting.filter( val.type, val.subtype, val.name );
					}
				} );
				var $radio = $( '#infoList input:radio' );
				if ( $radio.length ) {
					var $label = $radio.parents( 'tr' ).prev().find( 'td' ).eq( 0 );
					$radio.on( 'input', function() {
						$label.text( $( this ).filter( ':checked' ).parent().text() );
					} );
				}
			}
			, ok           : () => {
				var val     = infoVal();
				var newname = val.name;
				type        = val.type;
				subtype     = val.subtype;
				if ( type === 'DiffEq' ) {
					[ 'a', 'b' ].forEach( k => val[ k ] = common.list2array( val[ k ] ) );
				} else if ( subtype === 'FivePointPeq' ) {
					Object.keys( F0.FivePointPeq ).forEach( k => {
						var v = common.list2array( val[ k ] );
						F0.FivePointPeq[ k ].forEach( ( key, i ) => {
							val[ key ] = v[ i ];
						} );
						delete val[ k ];
					} );
				} else if ( subtype === 'GraphicEqualizer' ) {
					var bands = val.bands;
					delete val.bands;
					val.gains = Array( bands ).fill( 0 );
				} else if ( subtype === 'Values' ) {
					val.values = common.list2array( val.values );
				}
				var param = {}
				if ( 'subtype' in val ) param.type = subtype;
				[ 'name', 'type', 'subtype' ].forEach( k => delete val[ k ] );
				if ( 'q' in values && 'unit' in values ) {
					var q    = val.q;
					var unit = val.unit;
					[ 'q', 'bandwidth', 'slope', 'unit' ].forEach( k => delete val[ k ] );
					val[ unit ] = q;
				}
				$.each( val, ( k, v ) => { param[ k ] = v } );
				if ( 'filename' in param ) {
					param.filename = '/srv/http/data/camilladsp/coeffs/'+ param.filename;
					if ( subtype === 'Raw' ) param.format = 'TEXT';
				}
				FIL[ newname ] = { type: type, parameters : param }
				if ( name in FIL && name !== newname ) {
					delete FIL[ name ];
					PIP.forEach( p => {
						if ( p.type === 'Filter' ) {
							p.names.forEach( ( f, i ) => {
								if ( f === name ) p.names[ i ] = newname;
							} );
						}
					} );
				}
				setting.save( title, name ? 'Change ...' : 'Save ...' );
				render.filters();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, mixer         : name => {
		var title = name ? 'Mixer' : 'Add Mixer'
		info( {
			  icon         : V.tab
			, title        : title
			, message      : name ? 'Rename <wh>'+ name +'</wh> to:' : ''
			, list         : [ 'Name', 'text' ]
			, values       : name
			, checkblank   : true
			, checkchanged : name
			, ok           : () => {
				var newname = infoVal();
				if ( newname in MIX ) {
					info( {
						  icon    : V.tab
						, title   : title
						, message : 'Mixer: <wh>'+ newname +'</wh> already exists.'
						, ok      : () => setting.mixer( newname )
					} );
					return
				}
				
				if ( name ) {
					MIX[ newname ] = MIX[ name ];
					delete MIX[ name ];
					PIP.forEach( p => {
						if ( p.type === 'Mixer' && p.name === name ) p.name = newname;
					} );
				} else {
					var sources    = [];
					for ( var i = 0; i < DEV.capture.channels; i++ ) {
						sources.push( {
							  channel  : i
							, gain     : 0
							, inverted : false
							, mute     : false
						} );
					}
					var mapping    = [];
					for ( var i = 0; i < DEV.playback.channels; i++ ) {
						mapping.push( {
							  dest    : i
							, sources : sources
							, mute    : false
						} );
					}
					MIX[ newname ] = {
						  channels : {
							  in  : DEV.capture.channels
							, out : DEV.playback.channels
						}
						, mapping  : mapping
					}
				}
				setting.save( title, name ? 'Change ...' : 'Save ...' );
				render.mixers();
			}
		} );
	}
	, mixerMap      : ( name, index ) => {
		if ( index === 'dest' ) {
			var title = 'Add Destination';
			info( {
				  icon       : V.tab
				, title      : title
				, list       : [ 'Playback channel', 'select', DEV.playback.channels ]
				, boxwidth   : 70
				, ok         : () => {
					var mapping = {
						  dest    : infoVal()
						, mute    : false
						, sources : [
							{
								  channel  : 0
								, gain     : 0
								, inverted : false
								, mute     : false
							}
						]
					}
					MIX[ name ].mapping.push( mapping );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		} else {
			var title = 'Add Source';
			info( {
				  icon       : V.tab
				, title      : title
				, list       : [ 'Capture channel', 'select', DEV.capture.channels ]
				, boxwidth   : 70
				, ok         : () => {
					var source = {
						  channel  : infoVal()
						, gain     : 0
						, inverted : false
						, mute     : false
					}
					MIX[ name ].mapping[ index ].sources.push( source );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		}
	} //-----------------------------------------------------------------------------------
	, processor     : name => {
		var type   = name ? PRO[ name ].type : 'Compressor';
		var values = jsonClone( P.values[ type ] );
		if ( name ) {
			$.each( PRO[ name ].parameters, ( k, v ) => { values[ k ] = v } );
			values.name = name;
		}
		var title  = name ? 'Processor' : 'Add Processor'
		info( {
			  icon         : V.tab
			, title        : title
			, list         : name ? P[ PRO[ name ].type ] : P.Compressor
			, boxwidth     : 150
			, values       : values
			, checkblank   : true
			, checkchanged : name
			, beforeshow   : () => {
				if ( name ) $( '#infoList select' ).eq( 0 ).prop( 'disabled', true );
			}
			, ok           : () => {
				var val = infoVal();
				var typenew = val.type;
				var namenew = val.name;
				[ 'name', 'type' ].forEach( k => delete val[ k ] );
				[ 'monitor_channels', 'process_channels' ].forEach( k => val[ k ] = common.list2array( val[ k ] ) );
				if ( ! PRO ) {
					S.config.processors = {}
					PRO = S.config.processors;
				}
				PRO[ namenew ] = { type: v.type, parameters: val }
				if ( name in PRO && name !== namenew ) delete PRO[ name ];
				setting.save( title, name ? 'Change ...' : 'Save ...' );
				render.processors();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, pipeline      : index => {
		if ( ! setting.pipelineNone( 'filters' ) ) return
		
		var channels = '';
		[ ...Array( DEV.playback.channels ).keys() ].forEach( c => {
			channels += '<label><input type="checkbox" value="'+ c +'">'+ c +'</label>&emsp;';
		} );
		var filters  = Object.keys( FIL );
		var list     = [ [ ico( 'output gr' ), 'html', channels ] ];
		var select   = [ ico( 'filters gr' ),  'select', { kv: filters, suffix: ico( 'remove' ) } ];
		if ( index === undefined ) {
			var edit = false;
			list.push( select );
		} else {
			var edit = true;
			var data = jsonClone( PIP[ index ] );
			var nL   = edit ? data.names.length : 1;
			for ( var i = 0; i < nL; i++ ) list.push( select );
		}
		info( {
			  icon         : V.tab
			, title        : edit ? 'Pipeline Filter' : 'Add Pipeline'
			, tablabel     : edit ? '' : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab          : edit ? '' : [ '', setting.pipelineMixer ]
			, list         : list
			, values       : edit ? [ ...data.channels, ...data.names ] : ''
			, beforeshow   : () => {
				$( '#infoList td' ).eq( 0 ).css( 'width', '40px' );
				$( '#infoList tr' ).eq( 0 ).append( '<td>'+ ico( 'add' ) +'</td>' );
				if ( edit ) {
					$( '#infoOk' ).addClass( 'disabled' );
				} else {
					$( '#infoList input' ).prop( 'checked', true );
				}
				var setChanged = () => {
					if ( edit ) {
						$input = $( '#infoList' ).find( 'input, select' );
						$( '#infoOk' ).toggleClass( 'disabled', I.values.join( '' ) === infoVal().join( '' ) );
					}
					setDisabled();
				}
				var setDisabled = () => {
					var $remove = $( '#infoList .i-remove' );
					$remove.toggleClass( 'disabled', $remove.length === 1 );
					$( '#infoList input:checked' ).prop( 'disabled', $( 'input:checked' ).length === 1 );
				}
				setDisabled();
				var select    = '<select>'+ htmlOption( filters ) +'</select';
				$( '#infoList' ).on( 'input', function() {
					setChanged();
				} ).on( 'click', '.i-add', function() {
					var $trlast = $( '#infoList tr' ).last();
					$( '#infoList table' ).append( $trlast.clone() );
					var $trnew  = $( '#infoList tr' ).last();
					$trnew.find( 'td' ).eq( 1 ).html( select );
					selectSet( $trnew.find( 'select' ) );
					setChanged();
				} ).on( 'click', '.i-remove', function() {
					$( this ).parents( 'tr' ).remove();
					setChanged();
				} );
			}
			, ok           : () => {
				var channels = [];
				var names    = [];
				$( '#infoList input:checkbox' ).each( ( i, el ) => {
					if ( $( el ).prop( 'checked' ) ) channels.push( +$( el ).val() );
				} );
				$( '#infoList select' ).each( ( i, el ) => names.push( $( el ).val() ) );
				data = {
					  type     : 'Filter'
					, channels : channels
					, names    : names
				}
				edit ? PIP[ index ] = data : PIP.push( data );
				setting.pipelineSave();
			}
		} );
	}
	, pipelineMixer : index => {
		if ( ! setting.pipelineNone( 'mixers' ) ) return
		
		var edit = index !== undefined;
		info( {
			  icon         : V.tab
			, title        : edit ? 'Pipeline Mixer' : 'Add Pipeline'
			, tablabel     : edit ? '' : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab          : edit ? '' : [ setting.pipeline, '' ]
			, list         : [ 'Mixers', 'select', Object.keys( MIX ) ]
			, values       : edit ? PIP[ index ].name : ''
			, checkchanged : edit
			, ok           : () => {
				data = {
					  type : 'Mixer'
					, name : infoVal()
				}
				edit ? PIP[ index ] = data : PIP.push( data );
				setting.pipelineSave();
			}
		} );
	}
	, pipelineNone  : type => {
		if ( Object.keys( S.config[ type ] ).length ) return true
		
		info( {
			  icon    : V.tab
			, title   : 'Add Pipeline'
			, message : 'No '+ type +' found.'
			, ok      : type === 'filters' ? setting.pipelineMixer : setting.pipeline
		} );
		return false
	}
	, pipelineSave  : () => {
		setting.save( 'Add Pipeline', 'Save ...' );
		render.pipeline();
	}
	, pipelineTr    : () => {
		
	} //-----------------------------------------------------------------------------------
	, device        : ( dev, type ) => {
		var type        = type || 'Alsa';
		var vtype       = type === 'File' && dev === 'playback' ? 'FileP' : type;
		var values      = DEV[ dev ][ type ] === type ? DEV[ dev ][ type ] : jsonClone( D.values[ vtype ] );
		values.type     = type;
		values.channels = DEV[ dev ].channels;
		if ( DEV[ dev ].type === type ) $.each( values, ( k, v ) => { values[ k ] = DEV[ dev ][ k ] } );
		var title       = common.key2label( dev );
		info( {
			  icon         : V.tab
			, title        : title
			, list         : D[ dev ][ type ]
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, beforeshow   : () => {
				var $input = $( '#infoList input[type=number]' );
				var $td    = $input.parent();
				$td.append( $td.next().find( 'i' ) );
				$input.css( 'width', '70px' );
				$( '#infoList select' ).eq( 0 ).on( 'input', function() {
					var typenew = $( this ).val();
					var files   = false;
					if ( type === 'capture' ) {
						if ( typenew === 'RawFile' ) {
							file = S.ls.raw;
						} else if ( typenew === 'RawFile' ) {
							file = S.ls.wave;
						}
					} else {
						if ( typenew === 'File' ) file = S.ls.file;
					}
					if ( file ) {
						setting.device( dev, typenew );
					} else {
						info( {
							  icon    : V.tab
							, title   : title
							, message : 'No <c>'+ typenew +'</c> available.'
							, ok      : () => setting.device( dev, type )
						} );
					}
				} );
			}
			, ok           : () => {
				DEV[ dev ] = infoVal();
				setting.save( title, 'Change ...' );
			}
		} );
	}
	, main          : () => {
		var values   = {};
		D0.main.forEach( k => {
			values[ k ] = DEV[ k ];
		} );
		var title    = common.tabTitle();
		info( {
			  icon         : V.tab
			, title        : title
			, list         : D.main
			, boxwidth     : 120
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, ok           : () => {
				var val = infoVal();
				$.each( val, ( k, v ) => { DEV[ k ] = v } );
				setting.save( title, 'Change ...' );
				render.devices();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, resampler     : ( type, profile ) => {
		var list    = D.resampler[ type ];
		var values  = D.resampler.values[ type ];
		var current = S.resampler && DEV.resampler.type === values.type;
		if ( profile ) values.profile = profile;
		if ( current ) $.each( DEV.resampler, ( k, v ) => { values[ k ] = v } );
		info( {
			  ...SW
			, list         : list
			, boxwidth     : 160
			, values       : values
			, checkblank   : true
			, checkchanged : current
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).css( 'min-width', '100px' );
				$( 'select' ).eq( 0 ).on( 'input', function() {
					setting.resampler( $( this ).val() );
				} );
				if ( values.type === 'AsyncSinc' ) {
					$( 'select' ).eq( 1 ).on( 'input', function() {
						var profile = $( this ).val();
						if ( type === 'Custom' ) {
							setting.resampler( 'AsyncSinc', profile );
						} else {
							if ( profile === 'Custom' ) setting.resampler( 'Custom' );
						}
					} );
				}
			}
			, cancel       : switchCancel
			, ok           : () => {
				var val        = infoVal();
				if ( val.type === 'Synchronous' && S.enable_rate_adjust ) DEV.enable_rate_adjust = false;
				DEV.resampler = val;
				setting.save( SW.title, 'Change ...' );
			}
		} );
	} //-----------------------------------------------------------------------------------
	, mixerGet      : $this => {
		var $li = $this.parents( 'li' );
		return {
			  $li     : $li
			, name    : $li.data( 'name' )
			, index   : $li.hasClass( 'lihead' ) ? 'dest' : $li.data( 'index' )
			, si      : $li.data( 'si' )
			, checked : ! ( $this.hasClass( 'bl' ) || $this.hasClass( 'mute' ) )
		}
	}
	, muteToggle    : ( $this, checked ) => {
		$this.toggleClass( 'mute', checked );
		$this.siblings( 'input' ).prop( 'disabled', checked );
		$this.parent().find( '.i-minus, .i-plus, .db' ).toggleClass( 'disabled', checked );
	}
	, rangeGet      : ( $this, type ) => {
		var input = type === 'input';
		var $li   = $this.parents( 'li' );
		var $gain = input ? $this : $this.siblings( 'input' );
		R = {
			  $gain : $gain
			, $db   : $li.find( 'c' )
			, val   : +$gain.val()
			, cmd   : input ? '' : $this.prop( 'class' ).replace( 'i-', '' )
			, up    : input ? '' : $this.hasClass( 'i-plus' )
			, scale : $gain.data( 'scale' )
			, name  : $li.data( 'name' )
			, index : $li.data( 'index' )
			, si    : $li.data( 'si' )
		}
		if ( input ) {
			setting.rangeSet();
		} else if ( type === 'press' ) {
			V.intervalgain = setInterval( () => {
				R.up ? R.val++ : R.val--;
				setting.rangeSet();
			}, 100 );
		} else {
			switch ( R.cmd ) {
				case 'minus':
					R.val--;
					break;
				case 'plus':
					R.val++;
					break;
				default: // db
					R.val = 0;
			}
			setting.rangeSet();
		}
	}
	, rangeSet      : () => {
		R.$gain.val( R.val );
		if ( R.scale === 100 ) { // filter - Gain dB / mixer - dB
			var val = R.val;
			var db  = R.val;
		} else {
			var val = R.val / 10;
			var db  = val.toFixed( 1 );
		}
		R.$db
			.text( db )
			.toggleClass( 'disabled', R.val === 0 );
		if ( V.tab === 'filters' ) {
			FIL[ R.name ].parameters.gain = val;
		} else {
			MIX[ R.name ].mapping[ R.index ].sources[ R.si ].gain = val;
		}
		setting.save();
	}
	, scaleSet      : ( checked, key, $this ) => {
		var $db = $this.siblings( '.db' );
		if ( checked ) {
			var gain  = key.gain / 10;
			key.scale = 'linear';
			key.gain  = gain;
			$db.text( gain.toFixed( 1 ) );
		} else {
			var gain  = key.gain * 10;
			key.scale = 'dB';
			key.gain  = gain;
			$db.text( gain );
		}
	}
	, save          : ( titlle, msg ) => {
		setTimeout( () => {
			var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
			wscamilla.send( '{ "SetConfigJson": "'+ config +'" }' );
			if ( ! V.press ) {
				local();
				setting.statusPush();
				clearTimeout( V.timeoutsave );
				V.timeoutsave = setTimeout( () => bash( [ 'saveconfig' ] ), 1000 );
			}
		}, wscamilla ? 0 : 300 );
		if ( titlle ) banner( V.tab, titlle, msg );
	}
	, statusPush    : () => {
		var status = { 
			  channel : "refresh"
			, data    : {
				  page       : "camilla"
				, config     : JSON.stringify( S.config )
				, configname : S.configname // confswitch
			}
		}
		ws.send( JSON.stringify( status ) );
	}
	, upload        : () => {
		var filters = V.tab === 'filters';
		var title   = 'Add File';
		if ( filters ) {
			var dir     = 'coeffs';
			var message = 'Upload <wh>coefficient</wh> file:';
		} else {
			var dir     = S.bluetooth ? 'configs-bt' : 'configs';
			var message = 'Upload <wh>configuration</wh> file:'
		}
		info( {
			  icon    : V.tab
			, title   : title
			, message : message
			, file    : { oklabel: ico( 'file' ) +'Upload', type: dir === 'coeffs' ? '.dbl,.pcm,.raw,.wav' : '.yml' }
			, cancel  : common.webSocket
			, ok      : () => {
				notify( V.tab, title, 'Upload ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'camilla' );
				formdata.append( 'dir', dir );
				formdata.append( 'file', I.infofile );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( message => {
						if ( message ) {
							bannerHide();
							infoWarning(  V.tab,  title, message );
						}
					} );
				common.webSocket();
			}
		} );
	}
}
var common    = {
	  inUse         : name => {
		var filters = V.tab === 'filters';
		var inuse   = [];
		if ( filters && ! ( name in FIL ) ) { // file
			$.each( FIL, ( k, v ) => {
				if ( 'filename' in v.parameters && v.parameters.filename === name ) {
					inuse.push( 'Filter: '+ k );
				}
			} );
		}
		PIP.forEach( ( k, i ) => {
			if ( filters ) {
				if ( k.type === 'Filter' ) {
					k.names.forEach( ( n, ni ) => {
						if ( n === name ) inuse.push( 'Pipeline: #'+ ( i + 1 ) );
					} );
				}
			} else {
				if ( k.type === 'Mixer' && k.name === name ) inuse.push( 'Pipeline: #'+ ( i + 1 ) );
			}
		} );
		if ( inuse.length ) {
			var message = '<wh>Currently used by:</wh>';
			inuse.forEach( d => message += '<br> - '+ d );
			info( {
				  icon    : V.tab
				, title   : ( filters ? 'Filter' : 'Mixer' ) +' In Use'
				, message : message
			} );
			return true
		}
		
		return false
	}
	, key2label     : key => {
		if ( key === 'ms' ) return 'ms'
		
		var str = key[ 0 ].toUpperCase();
		if ( key.length === 1 ) return str
		
		key = key
				.replace( '_act',        ' actual' )
				.replace( '_len',        ' length' )
				.replace( 'bytes_lines', 'bytes/lines' )
				.replace( 'chunksize',   'chunk size' )
				.replace( 'f_',          'freq ' )
				.replace( 'queuelimit',  'queue limit' )
				.replace( 'samplerate',  'sample rate' )
				.replace( /_/g,          ' ' )
				.replace( 'freq',        'frequency' )
				.slice( 1 )
		return str + key
	}
	, labels2array  : array => {
		if ( ! array ) return false
		
		var capitalized = array.map( el => common.key2label( el ) );
		return capitalized
	}
	, list2array    : list => { // '1, 2, 3' > [ 1, 2, 3 ]
		return list.replace( /[ \]\[]/g, '' ).split( ',' ).map( Number )
	}
	, tabTitle      : () => capitalize( V.tab )
	, volumeAnimate : ( target, volume ) => {
		var bandW = $( '#volume-band' ).width() - 40;
		$( '#divvolume' ).css( 'pointer-events', 'none' );
		$( '#volume .thumb' ).animate(
			  { 'margin-left': bandW / 100 * target }
			, {
				  duration : Math.abs( target - volume ) * 40
				, easing   : 'linear'
				, complete : () => {
					$( '#divvolume' ).css( 'pointer-events', '' );
					render.volume();
				}
			}
		);
	}
	, webSocket     : () => {
		if ( wscamilla && wscamilla.readyState < 2 ) return
		
		wscamilla           = new WebSocket( 'ws://'+ location.host +':1234' );
		wscamilla.onopen    = () => {
			var interval = setTimeout( () => {
				if ( wscamilla && wscamilla.readyState === 1 ) { // 0=created, 1=ready, 2=closing, 3=closed
					clearTimeout( interval );
					common.wsGetState();
					common.wsGetConfig();
					V.intervalstatus = setInterval( () => {
						if ( V.local ) return
						
						common.wsGetState();
						if ( S.enable_rate_adjust ) wscamilla.send( '"GetRateAdjust"' );
					}, 1000 );
				}
			}, 100 );
		}
		wscamilla.onclose   = () => {
			wscamilla = null;
			[ 'intervalstatus', 'intervalvu' ].forEach( k => clearInterval( V[ k ] ) );
			render.statusStop();
		}
		wscamilla.onmessage = response => {
			var data  = JSON.parse( response.data );
			var cmd   = Object.keys( data )[ 0 ];
			var value = data[ cmd ].value;
			var cp, p, v;
			switch ( cmd ) {
				case 'GetSignalLevels':
					if ( S.state !== 'play' ) {
						render.statusStop();
						return
					}
					
					[ 'playback_peak', 'playback_rms', 'capture_peak', 'capture_rms' ].forEach( k => {
						cp = k[ 0 ];
						value[ k ].forEach( ( db, i ) => {
							if ( S.volumemute && cp === 'p' ) db = -99;
							render.vuLevel( k.slice( -1 ) === 's', cp + i, db );
						} );
					} );
					break;
				case 'GetBufferLevel':
				case 'GetCaptureRate':
				case 'GetProcessingLoad':
				case 'GetRateAdjust':
					if ( S.state !== 'play' ) {
						render.statusStop();
						return
					}
					
					var el = cmd.replace( /Get(.*)[A-Z].*/, '$1' ).toLowerCase();
					if ( cmd === 'GetBufferLevel' ) {
						v = value / DEV.target_level  * 100;
						if ( v > 100 ) v = 100;
						$( '#buffer' ).css( 'width', v +'%' );
					} else if ( cmd === 'GetProcessingLoad' ) {
						v = value * 100;
						if ( v > 100 ) v = 100;
						$( '#load' ).css( 'width', v +'%' );
					} else {
						var cl = cmd === 'GetRateAdjust' ? 'rate' : 'capture';
						$( '#divstate .'+ cl ).text( value.toLocaleString() );
					}
					break;
				case 'GetClippedSamples':
					if ( V.local ) return
					
					if ( value ) {
						$( '.divclipped' )
							.removeClass( 'hide' )
							.find( '.clipped' ).text( value.toLocaleString() );
					} else {
						$( '.divclipped' ).addClass( 'hide' );
					}
					break;
				case 'GetState':
					if ( 'intervalvu' in V ) {
						if ( S.state !== 'play' ) render.statusStop();
					} else {
						if ( ! V.signal ) { // restore after 1st set
							V.signal = true;
							render.vuBarToggle();
						}
						V.intervalvu = setInterval( () => wscamilla.send( '"GetSignalLevels"' ), 100 );
					}
					break;
				case 'GetConfigJson':
					S.config = JSON.parse( value );
					config.valuesAssign();
					render.status();
					render.tab();
					showContent();
					wscamilla.send( '"GetSupportedDeviceTypes"' );
					if ( V.confswitch ) {
						delete V.confswitch;
						$( '.divgraph' ).remove();
						setting.statusPush();
					}
					break;
				case 'GetSupportedDeviceTypes':
					var type = {};
					[ 'playback', 'capture' ].forEach( ( k, i ) => {
						type[ k ] = {};
						value[ i ].forEach( t => {
							v = render.typeReplace( t );
							type[ k ][ v ] = t; // [ 'Alsa', 'Bluez' 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
						} );
					} );
					Dlist.typeC[ 2 ] = type.capture;
					Dlist.typeP[ 2 ] = type.playback;
					break;
				case 'Invalid':
					info( {
						  icon    : 'warning'
						, title   : 'Error'
						, message : data.Invalid.error
					} );
					break;
			}
		}
	}
	, wsGetConfig   : () => {
		setTimeout( () => {
			wscamilla.send( '"GetConfigJson"' );
		}, wscamilla.readyState === 1 ? 0 : 300 ); 
	}
	, wsGetState    : () => {
		var getstate = [ 'GetState', 'GetCaptureRate', 'GetClippedSamples', 'GetProcessingLoad' ];
		if ( S.enable_rate_adjust ) getstate.push( 'GetBufferLevel', 'GetRateAdjust' );
		getstate.forEach( k => wscamilla.send( '"'+ k +'"' ) );
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// volume ---------------------------------------------------------------------------------
$( '#divvolume' ).on( 'keydown', function( e ) {
	var key = e.key;
	if ( [ '-', '+' ].includes( key ) ) $( this ).find( key === '-' ? '.i-minus' : '.i-plus' ).trigger( 'click' );
} );
$( '.entries' ).on( 'keydown', 'li:focus', function( e ) {
	var key = e.key;
	if ( [ '-', '+' ].includes( key ) ) {
		var $this = $( this );
		var $updn = $this.find( key === '-' ? '.i-minus' : '.i-plus' );
		if ( ! $updn.length ) return
		
		V.focused = $this.index();
		$updn.trigger( 'click' );
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function( e ) {
	var $this = $( this );
	var left  = $this.offset().left;
	var width = $this.width();
	V.volume = {
		  current : S.volume
		, min     : left
		, max     : left + width - 40
		, width   : width - 40
	}
	S.volumemute    = 0;
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.volume ) return
	
	V.drag = true;
	var x  = e.pageX || e.changedTouches[ 0 ].pageX;
	if ( x < V.volume.min + 20 || x > V.volume.max + 20 ) return
	
	S.volume = Math.round( ( x - 20 - V.volume.min ) / V.volume.width * 100 );
	volumeMaxSet();
	render.volume();
	volumeSet();
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.volume ) return
	
	if ( V.drag ) {
		volumePush();
	} else { // click
		var current = V.volume.current;
		var x       = e.pageX || e.changedTouches[ 0 ].pageX;
		if ( x < V.volume.min + 20 ) {   // 0-20: volume = 0
			S.volume = 0;
		} else if ( x > V.volume.max + 20 ) {
			S.volume = 100;
		} else {
			S.volume = Math.round( ( x - V.volume.min - 20 ) / V.volume.width * 100 );
		}
		volumeMaxSet();
		$( '#divvolume .level' ).text( S.volume );
		common.volumeAnimate( S.volume, current );
		volumeSet();
	}
	V.volume = V.drag = false;
} ).on( 'mouseleave', function() {
	V.volume = V.drag = false;
} );
$( '#volume-0, #volume-100' ).on( 'click', function() {
	var current = S.volume;
	S.volume    = this.id === 'volume-0' ? 0 : 100;
	volumeMaxSet();
	$( '#divvolume .level' ).text( S.volume );
	common.volumeAnimate( S.volume, current );
	volumeSet();
} );
$( '#divvolume' ).on( 'click', '.col-l i, .i-plus', function() {
	var up = $( this ).hasClass( 'i-plus' );
	if ( ( ! up && S.volume === 0 ) || ( up && S.volume === 100 ) ) return
	
	up ? S.volume++ : S.volume--;
	volumeMaxSet();
	render.volume();
	volumeSet();
} ).on( 'touchend mouseup mouseleave', function() {
	if ( ! V.press )  return
	
	clearInterval( V.intervalvolume );
	volumePush();
} ).press( '.col-l i, .i-plus', function( e ) {
	var up           = $( e.target ).hasClass( 'i-plus' );
	V.intervalvolume = setInterval( () => {
		up ? S.volume++ : S.volume--;
		volumeMaxSet();
		volumeSet();
		render.volumeThumb();
		$( '#divvolume .level' ).text( S.volume );
		if ( S.volume === 0 || S.volume === 100 ) clearInterval( V.intervalvolume );
	}, 100 );
} ).on( 'click', '.col-r .i-volume, .level', function() {
	common.volumeAnimate( S.volumemute, S.volume );
	volumeMuteToggle();
	$( '#out .peak' ).css( 'transition-duration', '0s' );
	setTimeout( () => $( '#out .peak' ).css( 'transition-duration', '' ), 100 );

} );
// common ---------------------------------------------------------------------------------
$( '.entries' ).on( 'click', '.i-minus, .i-plus, .db', function() { // filters, mixersSub
	setting.rangeGet( $( this ), 'click' );
	graph.refresh();
} ).on( 'touchend mouseup mouseleave', '.i-minus, .i-plus, .db', function() {
	if ( ! V.press ) return
	
	V.press = false;
	clearInterval( V.intervalgain );
	setting.save();
	graph.refresh();
} ).press( '.i-minus, .i-plus', function( e ) {
	setting.rangeGet( $( e.currentTarget ), 'press' );
} );
$( '#divstate' ).on( 'click', '.clipped', function() {
	local( 2000 );
	$( '.divclipped' ).addClass( 'hide' );
	wscamilla.send( '"ResetClippedSamples"' );
} );
$( '#configuration' ).on( 'input', function() {
	if ( V.local ) return
	
	var name = $( this ).val();
	var path = '/srv/http/data/camilladsp/configs'+ ( S.bluetooth ? '-bt/' : '/' ) + name;
	bash( [ 'confswitch', path, 'CMD CONFIG' ], () => {
		V.confswitch = true;
		wscamilla.send( '{ "SetConfigFilePath": "'+ path +'" }' );
		wscamilla.send( '"Reload"' );
		S.configname = name;
		setTimeout( () => common.wsGetConfig(), 300 );
	} );
	notify( 'camilladsp', 'Configuration', 'Switch ...' );
} );
$( '.tab .headtitle' ).on( 'click', function() {
	if ( $( '#'+ V.tab +' .entries.main' ).hasClass( 'hide' ) ) $( '#'+ V.tab +' .i-back' ).trigger( 'click' );
} );
$( 'heading' ).on( 'click', '.i-folderfilter', function() {
	render.filtersSub();
} ).on( 'click', '.i-add', function() {
	if ( V.tab === 'filters' ) {
		setting.filter( 'Biquad', 'Lowpass' );
	} else if ( V.tab === 'config' ) {
		setting.upload();
	} else {
		setting[ V.tab.replace( /s$/, '' ) ]();
	}
} ).on( 'click', '.i-flowchart', function() {
	var $flowchart = $( '#pipeline canvas' );
	$flowchart.length ? $flowchart.remove() : graph.pipeline.flowchart();
} );
$( '.entries' ).on( 'click', '.liicon', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	V.li      = $this.parent();
	if ( ! $( '#menu' ).hasClass( 'hide' ) ) {
		$( '#menu' ).addClass( 'hide' );
		if ( V.li.hasClass( 'focus' ) )return
	}
	
	$( '#'+ V.tab +' li' ).removeClass( 'focus' );
	V.li.addClass( 'focus' );
	$( '#menu' ).find( '.copy, .rename, .info' ).toggleClass( 'hide', V.tab !== 'config' );
	[ 'edit', 'graph' ].forEach( k => $( '#menu .'+ k ).toggleClass( 'hide', ! $this.hasClass( k ) ) )
	$( '#menu .delete' ).toggleClass( 'disabled', V.tab === 'config' && S.ls.configs.length === 1 );
	if ( V.tab === 'mixers' && $( '#mixers .entries.sub' ).hasClass( 'hide' ) ) {
		$( '#menu' ).find( '.edit, .rename' ).toggleClass( 'hide' );
	}
	if ( V.tab === 'pipeline' ) {
		var bypassed = PIP[ V.li.index() ].bypassed === true;
		$( '#menu' ).find( '.bypass' ).toggleClass( 'hide', bypassed );
		$( '#menu' ).find( '.restore' ).toggleClass( 'hide', ! bypassed );
	} else {
		$( '#menu' ).find( '.bypass, .restore' ).addClass( 'hide' );
	}
	contextMenu();
} ).on( 'click', '.i-back', function() {
	if ( V.tab === 'mixers' ) {
		var name = $( '#mixers .lihead a' ).text();
		if ( ! MIX[ name ].mapping.length ) { // no mapping left
			delete MIX[ name ];
			setting.save( 'Mixer', 'Remove ...' );
		}
	}
	$( '#'+ V.tab +' .entries' ).toggleClass( 'hide' );
	render[ V.tab ]();
} ).on( 'click', '.graphclose', function() {
	$( this ).parent().remove();
} );
$( 'body' ).on( 'click', function( e ) {
	if ( $( e.target ).hasClass( 'liicon' ) ) return
	
	$( '#menu' ).addClass( 'hide' );
	$( '#'+ V.tab +' .entries li' ).removeClass( 'active' );
} );
$( '#menu a' ).on( 'click', function( e ) {
	var $this = $( this );
	var cmd   = $this.prop( 'class' ).replace( ' active', '' );
	if ( cmd === 'graph' ) {
		var $divgraph = V.li.find( '.divgraph' );
		$divgraph.length ? $divgraph.remove() : graph.plot( V.li );
		return
	}
	
	switch ( V.tab ) {
		case 'filters':
			var title = file ? 'Filter File' : 'Filter';
			var name  = V.li.data( 'name' );
			var file  = V.li.find( '.i-file' ).length;
			switch ( cmd ) {
				case 'edit':
					if ( file ) {
						info( {
							  icon         : V.tab
							, title        : title
							, message      : 'Rename <wh>'+ name +'</wh> to:'
							, list         : [ 'Name', 'text' ]
							, values       : name
							, checkblank   : true
							, checkchanged : true
							, ok           : () => { // in filters Conv
								var newname    = infoVal();
								bash( [ 'coefrename', name, newname, 'CMD NAME NEWNAME' ] );
								$.each( FIL, ( k, v ) => {
									if ( v.type === 'Conv' && v.parameters.filename === name ) FIL[ name ].parameters.filename = newname;
								} );
								setting.save( title, 'Rename ...' );
							}
						} );
					} else {
						var type    = FIL[ name ].type;
						var subtype = 'type' in FIL[ name ].parameters ? FIL[ name ].parameters.type : '';
						setting.filter( type, subtype, name );
					}
					break;
				case 'delete':
					if ( common.inUse( name ) ) return
					
					info( {
						  icon    : V.tab
						, title   : title
						, message : 'Delete: <wh>'+ name +'</wh> ?'
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => {
							file ? bash( [ 'coefdelete', name, 'CMD NAME' ] ) : delete FIL[ name ];
							setting.save( title, 'Delete ...' );
							V.li.remove();
						}
					} );
					break;
			}
			break;
		case 'mixers':
			var name  = V.li.data( 'name' );
			var main  = $( '#mixers .entries.sub' ).hasClass( 'hide' );
			switch ( cmd ) {
				case 'delete':
					var dest = V.li.hasClass( 'liinput main' );
					var mi   = V.li.data( 'index' );
					if ( main ) {
						if ( common.inUse( name ) ) return
						
						var title = 'Mixer';
						var msg   = name;
					} else if ( dest ) {
						var title = 'Output';
						var msg   = '#'+ mi;
					} else {
						var title = 'Input';
						var msg   = '#'+ V.li.find( 'select' ).val();
					}
					var message = 'Delete <wh>'+ msg +'</wh> ?';
					info( {
						  icon    : V.tab
						, title   : title
						, message : message
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => {
							if ( main ) {
								delete MIX[ name ];
							} else if ( dest ) {
								MIX[ name ].mapping.splice( mi, 1 );
								if ( ! MIX[ name ].mapping.length ) {
									$( '#mixers .i-back' ).trigger( 'click' );
									return
								}
								
								V.li.siblings( '.dest'+ mi ).remove();
							} else {
								MIX[ name ].mapping[ mi ].sources.splice( V.li.data( 'si' ), 1 );
							}
							setting.save( title, 'Remove ...' );
							V.li.remove();
						}
					} );
					break;
				case 'rename':
					setting.mixer( name );
					break;
			}
			break;
		case 'processors':
			var title = 'Processors';
			var name  = V.li.data( 'name' );
			switch ( cmd ) {
				case 'edit':
					setting.processor( name );
					break;
				case 'delete':
					info( {
						  icon    : V.tab
						, title   : title
						, message : 'Delete <wh>'+ name +'</wh> ?'
						, ok      : () => {
							delete PRO[ name ];
							setting.save( title, 'Remove ...' );
							V.li.remove();
						}
					} );
					break;
			}
			break;
		case 'pipeline':
			var title = 'Pipeline';
			switch ( cmd ) {
				case 'edit':
					var i = V.li.index();
					PIP[ i ].type === 'Filter' ? setting.pipeline( i ) : setting.pipelineMixer( i );
					break;
				case 'delete':
					var type = V.li.data( 'type' ).toLowerCase();
					info( {
						  icon    : V.tab
						, title   : title
						, message : 'Delete this '+ type +'?'
						, ok      : () => {
							PIP.splice( V.li.index(), 1 );
							setting.save( title, 'Remove '+ type +' ...' );
							V.li.remove();
							if ( PIP.length ) {
								graph.pipeline.refresh();
							} else {
								$( '.i-flowchart' ).addClass( 'disabled' );
								$( '#pipeline canvas' ).remove();
							}
						}
					} );
					break;
				case 'bypass':
				case 'restore':
					var i             = V.li.index();
					var bypassed      = ! PIP[ i ].bypassed
					PIP[ i ].bypassed = bypassed;
					setting.save( title, bypassed ? 'Bypassed' : 'Restored' );
					V.li.find( '.liicon' )
						.removeClass()
						.addClass( bypassed ? 'i-bypass' : 'i-pipeline' );
					break;
			}
			break;
		case 'devices':
			setting.device( V.li.data( 'type' ) );
			break;
		case 'config':
			var name  = V.li.find( '.name' ).text();
			var icon  = V.tab;
			var title = 'Configuration';
			switch ( cmd ) {
				case 'copy':
					info( {
						  icon         : icon
						, title        : title
						, message      : 'File: <c>'+ name +'</c>'
						, list         : [ 'Copy as', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = infoVal();
							bash( [ 'confcopy', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							notify( icon, title, 'Copy ...' );
						}
					} );
					break;
				case 'delete':
					info( {
						  icon    : icon
						, title   : title
						, message : 'Delete <c>'+ name +'</c> ?'
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => {
							bash( [ 'confdelete', name, S.bluetooth, 'CMD NAME BT' ] );
							notify( icon, title, 'Delete ...' );
						}
					} );
					break;
				break;
				case 'info':
					var name = V.li.find( '.name' ).text();
					bash( 'data-status.sh configuration "'+ name +'"', config => {
						$( '#codeconfig' )
							.html( config )
							.removeClass( 'hide' );
					} );
					break;
				break;
				case 'rename':
					info( {
						  icon         : icon
						, title        : title
						, message      : 'File: <c>'+ name +'</c>'
						, list         : [ 'Rename to', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = infoVal();
							bash( [ 'confrename', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							notify( icon, title, 'Rename ...' );
						}
					} );
					break;
			}
	}
} );
$( '.entries' ).on( 'touchmove mousemove', 'input[type=range]', function() {
	V.press = true;
} ).on( 'input', 'input[type=range]', function() {
	setting.rangeGet( $( this ), 'input' );
} ).on( 'touchend mouseup mouseleave', 'input[type=range]', function() {
	V.press = false;
	graph.refresh();
} )
// filters --------------------------------------------------------------------------------
$( '#filters' ).on( 'click', '.name', function( e ) {
	e.stopPropagation();
	$( this ).parents( 'li' ).find( '.liicon' ).trigger( 'click' );
} ).on( 'click', '.i-add', function() {
	setting.upload();
} ).on( 'click', '.i-volume', function() {
	var $this   = $( this );
	var name    = $this.parents( 'li' ).data( 'name' );
	var checked = ! $this.hasClass( 'mute' );
	setting.muteToggle( $this, checked );
	FIL[ name ].parameters.mute = checked;
	setting.save();
} ).on( 'click', '.i-inverted, .i-linear', function() {
	var $this   = $( this );
	var name    = $this.parents( 'li' ).data( 'name' );
	var checked = ! $this.hasClass( 'bl' );
	$this.toggleClass( 'bl', checked );
	var param   = FIL[ name ].parameters;
	$this.hasClass( 'i-inverted' ) ? param.inverted = checked : setting.scaleSet( checked, param, $this );
	setting.save();
} ).on( 'click', 'li.eq', function( e ) {
	if ( $( e.target ).parents( '.divgraph' ).length ) return
	
	var name  = $( this ).data( 'name' );
	var param = FIL[ name ].parameters;
	var bands = param.gains.length;
	var min   = Math.log10( param.freq_min ); // Hz > log10 : 20 > 1.3
	var max   = Math.log10( param.freq_max ); // Hz > log10 : 20000 > 4.3
	var width = ( max - min ) / bands;        // log10 / band
	var v0    = min + width / 2;              // log10 midband
	var v     = [ v0 ];
	for ( var i = 0; i < bands - 1; i++ ) {
		v0 += width;
		v.push( v0 );
	}
	var labelhz = '';
	v.forEach( val => {
		var hz = Math.round( Math.pow( 10, val ) ); // log10 > Hz
		if ( hz > 999 ) hz = Math.round( hz / 1000 ) +'k'
		labelhz += '<a>'+ hz +'</a>';
	} );
	var list    = `
<div id="eq">
<div class="label up">${ labelhz }</div>
<div class="bottom"><div class="label dn">${ labelhz }</div></div>
<div class="inforange vertical">${ '<input type="range" min="-40" max="40">'.repeat( bands ) }</div>
</div>`;
	var flatButton = () => $( '#infoOk' ).toggleClass( 'disabled', param.gains.reduce( ( a, b ) => a + b, 0 ) === 0 );
	info( {
		  icon       : 'equalizer'
		, title      : name
		, list       : list
		, width      : 50 * bands + 40
		, values     : param.gains
		, beforeshow : () => {
			flatButton();
			$( '.inforange input' ).on( 'input', function() {
				var $this = $( this );
				param.gains[ $this.index() ] = +$this.val();
				setting.save();
				flatButton();
			} );
			$( '#eq .label a' ).on( 'click', function() {
				var $this = $( this );
				var i     = $this.index();
				var gain  = param.gains[ i ];
				$this.parent().hasClass( 'up' ) ? gain++ : gain--;
				$( '.inforange input' ).eq( i ).val( gain );
				param.gains[ i ] = gain;
				setting.save();
				flatButton();
			} );
		}
		, oklabel    : ico( 'set0' ) +'Flat'
		, oknoreset  : true
		, ok         : () => {
			param.gains = Array( bands ).fill( 0 );
			setting.save();
			$( '.inforange input' ).val( 0 );
			$( '#infoOk' ).addClass( 'disabled' );
		}
	} );
} );
// mixers ---------------------------------------------------------------------------------
$( '#mixers' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	if ( $( e.target ).is( 'i' ) || $this.parent().hasClass( 'sub' ) ) return
	
	var name  = $this.find( '.li1' ).text();
	render.mixersSub( name );
} ).on( 'click', '.i-volume', function() {
	var $this   = $( this );
	var M       = setting.mixerGet( $this );
	var mapping = MIX[ M.name ].mapping[ M.index ];
	setting.muteToggle( $this, M.checked );
	typeof M.si === 'number' ? mapping.sources[ M.si ].mute = M.checked : mapping.mute = M.checked;
	setting.save();
} ).on( 'click', '.i-inverted, .i-linear', function() {
	var $this  = $( this );
	var M      = setting.mixerGet( $this );
	var source = MIX[ M.name ].mapping[ M.index ].sources[ M.si ];
	$this.toggleClass( 'bl', M.checked );
	$this.hasClass( 'i-inverted' ) ? source.inverted = M.checked : setting.scaleSet( M.checked, source, $this );
	setting.save();
} ).on( 'input', 'select', function() {
	var M   = setting.mixerGet( $( this ) );
	var val = +$( this ).val();
	if ( typeof M.si === 'number' ) {
		MIX[ M.name ].mapping[ M.index ].sources[ M.si ].channel = val;
	} else {
		MIX[ M.name ].mapping[ M.index ].dest = val;
	}
	setting.save( M.name, 'Change ...' );
} ).on( 'click', '.i-add', function() {
	var M = setting.mixerGet( $( this ) );
	setting.mixerMap( M.name, M.index );
} );
// processors -----------------------------------------------------------------------------
// pipeline -------------------------------------------------------------------------------
$( '#processors, #pipeline' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	if ( ! $( e.target ).is( 'i' ) ) $( this ).find( 'i' ).trigger( 'click' );
} );
// devices --------------------------------------------------------------------------------
$( '#divdevices heading .i-gear' ).on( 'click', function() {
	setting.main();
} );
$( '#devices' ).on( 'click', 'li', function() {
	setting.device( $( this ).data( 'type' ) );
} );
// config ---------------------------------------------------------------------------------
$( '#config' ).on( 'click', '.i-add', function() {
	setting.upload();
} );
// ----------------------------------------------------------------------------------------
$( '#bar-bottom div' ).off( 'click' ).on( 'click', function() {
	V.tab = this.id.slice( 3 );
	render.tab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
