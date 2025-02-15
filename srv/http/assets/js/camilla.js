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
		, [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'DiffEq', 'Dither', 'Gain', 'Limiter', 'Loudness' ] // omit Volume - use alsa directly
	]
	, subtype      : {
		  Biquad      : [
			  'Subtype'
			, 'select'
			, [ 'Allpass',     'AllpassFO',         'Bandpass', 'Free',      'GeneralNotch', 'Highpass',   'HighpassFO', 'Highshelf'
			  , 'HighshelfFO', 'LinkwitzTransform', 'Lowpass',  'LowpassFO', 'Lowshelf',     'LowshelfFO', 'Notch',      'Peaking' ]
		]
		, BiquadCombo : [
			  'Subtype'
			, 'select'
			, [ 'ButterworthHighpass', 'ButterworthLowpass', 'FivePointPeq', 'GraphicEqualizer', 'LinkwitzRileyHighpass', 'LinkwitzRileyLowpass', 'Tilt' ]
		]
		, Conv        : [
			  'Subtype'
			, 'select'
			, [ 'Dummy', 'Raw', 'Values', 'Wav' ]
		]
		, Dither      : [
			  'Subtype'
			, 'select'
			, [ 'Flat',           'Fweighted441',    'FweightedLong441', 'FweightedShort441', 'Gesemann441',  'Gesemann48',    'Highpass'
			  , 'Lipshitz441',    'LipshitzLong441', 'Shibata192',       'Shibata441',        'Shibata48',    'Shibata882',    'Shibata96'
			  , 'ShibataHigh441', 'ShibataHigh48',   'ShibataLow192',    'ShibataLow441',     'ShibataLow48', 'ShibataLow882', 'ShibataLow96' ]
		]
	}
	, freq         : [ 'Frequency', 'number' ]
	, gain         : [ 'Gain',      'number' ]
	, q            : [ 'Q',         'number' ]
	, qbandwidth   : [ '',          'radio', { Q: 'q', Bandwidth: 'bandwidth' } ]
	, name         : [ 'Name',      'text' ]
	, fader        : [ 'Fader',     'text' ]
	, Free         : [
		  [ 'a1', 'number' ]
		, [ 'a2', 'number' ]
		, [ 'b0', 'number' ]
		, [ 'b1', 'number' ]
		, [ 'b2', 'number' ]
	]
	, FivePointPeq : {
		  Lowshelf  : [ 'fls', 'gls', 'qls' ]
		, Peaking1  : [ 'fp1', 'gp1', 'qp1' ]
		, Peaking2  : [ 'fp2', 'gp2', 'qp2' ]
		, Peaking3  : [ 'fp3', 'gp3', 'qp3' ]
		, Highshelf : [ 'fhs', 'ghs', 'qhs' ]
	}
	, GeneralNotch : [
		  [ 'Zero frequency',  'number' ]
		, [ 'Pole frequency',  'number' ]
		, [ 'Pole Q',          'number' ]
		, [ 'Normalize at DC', 'checkbox' ]
	]
	, LinkwitzTransform : [
		  [ 'Q act',            'number' ]
		, [ 'Q target',         'number' ]
		, [ 'Frequency act',    'number' ]
		, [ 'Frequency target', 'number' ]
	]
}
F0.conv       = [ F0.name, F0.type, F0.subtype.Conv ];
F0.dither     = [ F0.name, F0.type, F0.subtype.Dither, [ 'Bits', 'number' ] ];
F0.fader      = [ F0.name, F0.type, F0.fader ];
F0.pass       = [ F0.name, F0.type, F0.subtype.Biquad,      F0.freq,               F0.q ];
F0.passC      = [ F0.name, F0.type, F0.subtype.BiquadCombo, [ 'Order', 'number' ], F0.freq ];
F0.pass0_3    = F0.pass.slice( 0, 3 );
F0.pass0_4    = F0.pass.slice( 0, 4 );
F0.passC0_3   = F0.passC.slice( 0, 3 );
F0.v_nt       = { name: '', type: '' }
F0.v_nts      = { name: '', type: '', subtype: '' }

F0.list       = {
	  fivepoint : { name: '', type: '', subtype: '' }
	, notch     : [ ...F0.pass,    F0.qbandwidth ]
	, pass      : F0.pass
	, passC     : F0.passC
	, passFO    : F0.pass0_4
	, shelf     : [ ...F0.pass0_4, F0.gain, F0.q, [ '', 'radio', { Q: 'q', Slope: 'slope' } ] ]
	, shelfFO   : [ ...F0.pass0_4, F0.gain ]
}
$.each( F0.FivePointPeq, ( k, v ) => { F0.list.fivepoint[ k ] = [ 0, 0, 0 ] } );
var F         = {
	  Biquad      : {
		  Free              : [ ...F0.pass0_3, ...F0.Free ]
		, GeneralNotch      : [ ...F0.pass0_3, ...F0.GeneralNotch ]
		, LinkwitzTransform : [ ...F0.pass0_3, ...F0.LinkwitzTransform ]
		, Notch             : F0.list.notch
		, Peaking           : [ ...F0.pass0_4, F0.gain, F0.q, F0.qbandwidth ]
		// the rest - assign later
	}
	, BiquadCombo : {
		  FivePointPeq          : [
			  ...F0.passC0_3
			, [ 'Lowshelf',  'text' ]
			, [ 'Peaking 1', 'text' ]
			, [ 'Peaking 2', 'text' ]
			, [ 'Peaking 3', 'text' ]
			, [ 'Highshelf', 'text' ]
//			, [ '',          '',     '&nbsp;<c>freq, gain, q</c>' ]
		]
		, GraphicEqualizer     : [
			  ...F0.passC.slice( 0, 3 )
			, [ 'Frequency min', 'number' ]
			, [ 'Frequency max', 'number' ]
			, [ 'Bands',         'number' ]
		]
		, Tilt                  : [
			  ...F0.passC0_3
			, [ 'Gain', 'number' ]
		]
		// the rest - assign later
	}
	, Conv        : {
		  Dummy  : [
			  ...F0.conv
			, [ 'Length', 'number' ]
		]
		, Raw    : [
			  ...F0.conv
			, [ 'File',             'select' ]
			, [ 'Format',           'select', [ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ] ]
			, [ 'Skip bytes lines', 'number' ]
			, [ 'Read bytes lines', 'number' ]
		]
		, Wav    : [
			  ...F0.conv
			, [ 'File',    'select' ]
			, [ 'Channel', 'number' ]
		]
		, Values : [
			  ...F0.conv
			, [ 'Values', 'text' ]
		]
	}
	, Delay       : [
		  F0.name
		, F0.type
		, [ 'ms',        'number' ]
		, [ '',          'radio', { ms: 'ms', mm: 'mm', Sample: 'samples' } ]
		, [ 'Subsample', 'checkbox' ]
	]
	, DiffEq      : [
		  F0.name
		, F0.type
		, [ 'a', 'text' ]
		, [ 'b', 'text' ]
	]
	, Dither      : [] // assign later
	, Gain        : [
		  F0.name
		, F0.type
		, F0.gain
		, [ '',         'radio', { dB: 'dB', Linear: 'linear' } ]
		, [ 'Inverted', 'checkbox' ]
		, [ 'Mute',     'checkbox' ]
	]
	, Limiter     : [
		  F0.name
		, F0.type
		, [ 'Clip limit', 'number' ]
		, [ 'Soft clip',  'checkbox' ]
	]
	, Loudness    : [
		  ...F0.fader
		, [ 'Reference level', 'number' ]
		, [ 'High boost',      'number' ]
		, [ 'Low boost',       'number' ]
		, [ 'Attenuate mid',   'checkbox' ]
	]
	, Volume      : [
		  ...F0.fader
		, [ 'Ramp time', 'number' ]
	]
//
	, values      : {
		  Biquad      : {                        // parameters
			  Free              : { ...F0.v_nts, a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
			, GeneralNotch      : { ...F0.v_nts, freq_z: 0,  freq_p: 0, q_p: 0, normalize_at_dc:false }
			, LinkwitzTransform : { ...F0.v_nts, q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
			, Notch             : { ...F0.v_nts, freq: 1000, q: 0, unit: 'q' }
			, Peaking           : { ...F0.v_nts, freq: 1000, gain: 0, q: 0, unit: 'q' }
			// the rest - define next
		}
		, BiquadCombo : {
			  FivePointPeq      : F0.list.fivepoint
			, GraphicEqualizer  : { ...F0.v_nts, freq_min: 20, freq_max: 20000, bands: 10 }
			, Tilt              : { ...F0.v_nts, gain: 0 }
			// the rest - define next
		}
		, Conv        : {
			  Dummy             : { ...F0.v_nts, length: 65536 } // min = 1
			, Raw               : { ...F0.v_nts, filename: '', format: 'TEXT', skip_bytes_lines: 0, read_bytes_lines: 0 }
			, Values            : { ...F0.v_nts, values: [ 0.1, 0.2, 0.3, 0.4 ] }
			, Wav               : { ...F0.v_nts, filename: '', channel: 0 }
		}
		, Dither      : {
			// define next
		}                             // parameters
		, Delay       : { ...F0.v_nt, delay: 0, unit: 'ms', subsample: false }
		, DiffEq      : { ...F0.v_nt, a: [ 1, 0 ], b: [ 1, 0 ] }
		, Gain        : { ...F0.v_nt, gain: 0, scale: 'dB', inverted: false, mute: false } // +-150dB / +-10 linear
		, Limiter     : { ...F0.v_nt, clip_limit: -10.0, soft_clip: false }
		, Loudness    : { ...F0.v_nt, fader : 'main', reference_level: 25, high_boost: 10, low_boost: 10, attenuate_mid: false }
		, Volume      : { ...F0.v_nt, ramp_time: 400, fader: 'Aux1' }
	}
};
[ 'Biquad', 'BiquadCombo', 'Conv', 'Dither' ].forEach( type => {
	F0.subtype[ type ][ 2 ].forEach( sub => {
		if ( type === 'Biquad' ) {
			if ( sub.slice( -4 ) === 'pass' ) {
				F[ type ][ sub ]        = F0.list[ [ 'H', 'L' ].includes( sub[ 0 ] ) ? 'pass' : 'notch' ];
				F.values[ type ][ sub ] = { name: '', type: '', subtype: '', freq: 1000, q: 0 }
			} else if ( sub.slice( -6 ) === 'passFO' ) {
				F[ type ][ sub ]        = F0.list.passFO;
				F.values[ type ][ sub ] = { name: '', type: '', subtype: '', freq: 1000, name: '' }
			} else if ( sub.slice( -5 ) === 'shelf' ) {
				F[ type ][ sub ]        = F0.list.shelf;
				F.values[ type ][ sub ] = { name: '', type: '', subtype: '', freq: 1000, gain: 0, q: 0, unit: 'q' }
			} else if ( sub.slice( -7 ) === 'shelfFO' ) {
				F[ type ][ sub ]        = F0.list.shelfFO;
				F.values[ type ][ sub ] = { name: '', type: '', subtype: '', freq: 1000, gain: 0 }
			}
		} else if ( type === 'BiquadCombo' ) {
			if ( [ 'B', 'L' ].includes( sub[ 0 ] ) ) {
				F[ type ][ sub ]        = F0.passC;
				F.values[ type ][ sub ] = { name: '', type: '', subtype: '', order: 2, freq: 1000 }
			}
		} else if ( type === 'Dither' ) {
			F[ type ][ sub ]        = F0.dither;
			F.values[ type ][ sub ] = { name: '', type: '', subtype: '', bits: 16 }
		}
	} );
} );
// processor //////////////////////////////////////////////////////////////////////////////
var P         = {
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
		Compressor : {
			  name             : ''
			, type             : ''
			, channels         : 2
			, attack           : 0.025
			, release          : 1.0
			, threshold        : -25
			, factor           : 5.0
			, makeup_gain      : 0
			, clip_limit       : 0
			, soft_clip        : false
			, monitor_channels : '0, 1'
			, process_channels : '0, 1'
		}
	}
}
// devices /////////////////////////////////////////////////////////////////////////////////////////
var D0        = {
	  main       : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout' ]
	, listsample : {} // on GetSupportedDeviceTypes
	, samplerate : [] // ^
}
D0.list       = {
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
D0.AlsaC      = [ D0.list.typeC,         D0.list.deviceC,    D0.list.formatC, D0.list.channelsC ];
D0.AlsaP      = [ D0.list.typeP,         D0.list.deviceP,    D0.list.formatP, D0.list.channelsP ];
D0.extra      = [ D0.list.extra_samples, D0.list.skip_bytes, D0.list.read_bytes ];
var D         = {
	  main      : [
		  [ 'Sample rate',       'select', { kv: {}, nosort: true } ]                               // ^
		, [ 'Chunk size',        'number' ]
		, [ 'Queue limit',       'number' ]
		, [ 'Silence Threshold', 'number' ]
		, [ 'Silence Timeout',   'number' ]
	]
	, capture   : {
		  Alsa      : D0.AlsaC
		, CoreAudio : [ ...D0.AlsaC,   D0.list.change_format ]
		, Pulse     : D0.AlsaC
		, Wasapi    : [ ...D0.AlsaC,   D0.list.exclusive, D0.list.loopback ]
		, Jack      : [ D0.list.typeC, D0.list.channelsC ]
		, Stdin     : [ D0.list.typeC, D0.list.formatC,   D0.list.channelsC,                  ...D0.extra ]
		, RawFile   : [ D0.list.typeC, D0.list.filename,  D0.list.formatC, D0.list.channelsC, ...D0.extra ]
		, WavFile   : [ D0.list.typeC, D0.list.filename,  D0.list.formatC, D0.list.channelsC, ...D0.extra ]
	}
	, playback  : {
		  Alsa      : D0.AlsaP
		, CoreAudio : [ ...D0.AlsaP,   D0.list.change_format ]
		, Pulse     : D0.AlsaP
		, Wasapi    : [ ...D0.AlsaP,   D0.list.exclusive, D0.list.loopback ]
		, Jack      : [ D0.list.typeP, D0.list.channelsP ]
		, Stdout    : [ D0.list.typeP, D0.list.formatP,   D0.list.channelsP ]
		, File      : [ D0.list.typeP, D0.list.filename,  D0.list.formatP, D0.list.channelsP ]
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
			  D0.list.type
			, D0.list.profile
		]
		, Custom       : [
			  D0.list.type
			, D0.list.profile
			, [ 'Sinc length',         'number' ]
			, [ 'Oversampling factor', 'number' ]
			, [ 'F cutoff',            'number' ]
			, [ 'Interpolation',       'select', [ 'Nearest', 'Linear',    'Quadratic',       'Cubic' ] ]
			, [ 'Window',              'select', [ 'Hann2',   'Blackman2', 'BlackmanHarris2', 'BlackmanHarris2' ] ]
		]
		, AsyncPoly    : [
			  D0.list.type
			, [ 'Interpolation',       'select', [ 'Linear',  'Cubic',     'Quintic',         'Septic' ] ]
		]
		, Synchronous : [
			  D0.list.type
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
	, ma  : 'hsl( 200, 100%, 40% )'
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
		
		var enabled = DEV.enable_rate_adjust;
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
				DEV.enable_rate_adjust = true;
				var val                =  infoVal();
				[ 'adjust_period', 'target_level' ].forEach( k => DEV[ k ] = val[ k ] );
				setting.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, capture_samplerate  : () => {
		var enabled = DEV.capture_samplerate;
		info( {
			  ...SW
			, list         : D0.list.capture_samplerate
			, boxwidth     : 120
			, values       : [ DEV.capture_samplerate ]
			, checkchanged : enabled
			, cancel       : switchCancel
			, beforeshow   : () => $( '#infoList option[value='+ DEV.samplerate +']' ).remove()
			, ok           : () => {
				DEV.capture_samplerate = DEV.samplerate;
				setting.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, resampler           : () => setting.resampler( DEV.resampler ? DEV.resampler.type : 'AsyncSinc' )
	, stop_on_rate_change : () => {
		var enabled = DEV.stop_on_rate_change;
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
		var dev                          = S.devices;
		var samplings                    = dev.playback.samplings;
		D0.samplerate                    = Object.values( samplings );
		D.main[ 0 ][ 2 ].kv              = samplings;
		D0.list.capture_samplerate[ 2 ].kv = samplings;
		D0.list.formatC[ 2 ].kv            = dev.capture.formats;
		D0.list.formatP[ 2 ].kv            = dev.playback.formats;
		D0.list.deviceC[ 2 ]               = dev.capture.device;
		D0.list.deviceP[ 2 ]               = dev.playback.device;
		D0.list.channelsC[ 2 ].updn.max    = dev.capture.channels;
		D0.list.channelsP[ 2 ].updn.max    = dev.playback.channels;
		D0.list.filename[ 2 ].kv           = S.ls.raw;
	}
}
var graph     = {
	  filters      : {
		  plot     : name => {
			var filter     = FIL[ name ];
			var f          = graph.filters.logSpace( 1, DEV.samplerate * 0.95 / 2 );
			var currfilt   = graph.filters.data( filter );
			if ( ! currfilt ) return
			
			var [ ma, ph ] = currfilt.gainAndPhase( f );
			var [ fg, gr ] = calcGroupDelay( f, ph );
			var result     = {
				  f            : f
				, f_groupdelay : fg
				, groupdelay   : gr
				, magnitude    : ma
				, phase        : ph
			}
			if ( filter.type === 'Conv' ) {
				var [ ti, im ] = currfilt.getImpulse();
				result.time    = ti;
				result.impulse = im;
			}
			graph.plotLy( result );
		}
		, data     : ( filter, volume ) => {
			var param      = filter.parameters;
			var samplerate = DEV.samplerate;
			switch( filter.type ) {
				case 'Biquad':
					return new Biquad( param, samplerate )
				case 'BiquadCombo':
					return new BiquadCombo( param, samplerate )
	/*			case 'Conv': // require: fft, audiofileread
					return new Conv( param || null, samplerate )*/
				case 'Delay':
					return new Delay( param, samplerate )
				case 'DiffEq':
					return new DiffEq( param, samplerate )
				case 'Gain':
					return new Gain( param )
				case 'Loudness':
					return new Loudness( param, samplerate, S.volume )
				case 'Dither':
				case 'Volume':
					return new BaseFilter()
				default:
					banner( 'graph', 'Graph', 'Not available.' );
					return false
			}
		}
		, fetchConv : file => {
			file = '/data/camilladsp/configs/'+ file;
			fetch( file )
				.then( response => response.text() )
				.then( text => {
					console.log( text );
				} );
		}
		, logSpace : ( min, max ) => {
			var logmin  = Math.log10( min );
			var logmax  = Math.log10( max );
			var perstep = ( logmax - logmin ) / 1000;
			var values  = Array.from( { length: 1000 }, ( _, n ) => 10 ** ( logmin + n * perstep ) );
			return values
		}
	}
	, flowchart    : {
		  add       : txt => {
			X.type = txt;
			var cL = DEV[ txt.toLowerCase() ].channels;
			graph.flowchart.addFrame( txt, cL );
			for ( var ch = 0; ch < cL; ch++ ) graph.flowchart.addBox( 'ch '+ ch, ch );
		}
		, addBox    : ( txt, ch, gain ) => {
			var c  = {
				  Filter   : color.md
				, Capture  : color.grl
				, Mixer    : color.gd
				, Playback : color.gr
			}
			Object.keys( c ).forEach( k => { X[ k ] = X.type === k } );
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
				, c : X.Capture ? '#000' : ''
			} );
			if ( X.Capture ) return // no arrows, no gains
			
			var g  = X.Mixer ? gain[ ch ] : gain;
			if ( g !== undefined ) {
				var db = graph.flowchart.dbText( g );
				X.text.push( { //----
					  x : X.ax[ ch ] + Math.round( X.w / 2 )
					, y : y
					, t : db.t
					, c : db.c
					, a : 0
				} );
			}
			if ( g !== undefined || X.Playback ) { // Playback always has arrows in
				X.arrow.push( [ //----
					  { x: X.ax[ ch ], y: y }
					, { x: X.x,        y: y }
				] );
			}
			if ( X.Playback || ! X.Mixer ) return
			
			$.each( gain, ( ch_s, g ) => {
				ch_s = +ch_s;
				if ( ch_s === ch ) return
				
				var xy     = [
					  { x: X.ax[ ch_s ], y: y + X.h * 2 * ( ch_s - ch ) }
					, { x: X.x,          y: y }
				]
				X.arrow.push( xy ); //----
				var db     = graph.flowchart.dbText( g );
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
				, f : 'frame'
			} );
		}
		, ctxShadow : ( ctx, offset ) => {
			offset             *= X.dpxr;
			ctx.shadowOffsetX = -offset;
			ctx.shadowOffsetY = offset;
			ctx.shadowBlur    = offset;
			ctx.shadowColor   = '#000';
		}
		, dbText    : gain => {
			var c = color.grl;
			if ( gain > 0 )      c = color.wl;
			else if ( gain < 0 ) c = color.r;
			if ( gain !== 0 ) gain = ( gain > 0 ? '+' : '' ) + gain.toFixed( 1 );
			return { t: gain, c: c }
		}
		, plot      : () => {
			var canvasW = $( '#pipeline' ).width();
			var boxL    = 2; // capture + playback
			PIP.forEach( pip => {                                     //     cap                   pla
				boxL += pip.type === 'Filter' ? pip.names.length : 1; // --|boxC0|----|box N|----|boxP1|--
			} );                                                      //
			var canvasL = boxL * 2;                                   // --|boxC0|----|box N|----|boxP1|--
			var w0      = Math.round( canvasW / canvasL ); // box w (base unit)
			var h0      = Math.round( w0 / 2 );
			var p0      = Math.round( w0 / 10 );
			var ch_capt = DEV.capture.channels;
			var ch_play = DEV.playback.channels;
			var canvasH = h0 * ( Math.max( ch_capt, ch_play ) * 2 ) + p0;
			X           = {
				  w     : w0
				, h     : h0
				, p     : p0                                   // frame padding
				, x     : h0                                   // box0 start x
				, ax    : new Array( ch_capt ).fill( h0 + w0 ) // arrow line x start: each channel (draw from previous box)
				, aw    : Math.round( w0 / 8 )                 // arrow head w
				, dpxr  : window.devicePixelRatio
				, box   : []
				, text  : []
				, arrow : []
			}
			
			graph.flowchart.add( 'Capture' );
			X.x += X.w * 2;
			PIP.forEach( pip => {                     // @ step
				X.type  = pip.type;
				if ( pip.type === 'Filter' ) {
					pip.names.forEach( name => {      // @ filter  < @ step
						pip.channels.forEach( ch => { // @ channel < @ filter < @ step
							graph.flowchart.addBox( name, ch, FIL[ name ].parameters.gain );
							X.ax[ ch ] = X.x + X.w;   // ax >| @ channel < @ filter < @ step
						} );
						X.x += X.w * 2;               // x  >| @ filter  < @ step
					} );
				} else {
					var mapping = MIX[ pip.name ].mapping;
					var mL      = mapping.length;
					if ( mL > 1 ) graph.flowchart.addFrame( pip.name, mL );
					mapping.forEach( m => {                                        // @ playback channel      < @ step
						var ch   = m.dest;
						var gain = {};
						m.sources.forEach( s => { gain[ s.channel ] = s.gain } );
						graph.flowchart.addBox( 'ch '+ ch, ch, gain );
					} );
					for ( var ch = 0; ch < ch_capt; ch++ ) X.ax[ ch ] = X.x + X.w; // ax >| @ capture channel < @ step
					X.x        += X.w * 2;                                         // x  >| @ mixer           < @ step
				}
			} );
			graph.flowchart.add( 'Playback' );
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
			ctx.scale( X.dpxr, X.dpxr );
			ctx.save();
			X.box.forEach( b => { //-------------------------------
				ctx.fillStyle = b.c;
				ctx.beginPath();
				ctx.roundRect( b.x, b.y, b.w, b.h, b.r );
				ctx.fill();
				graph.flowchart.ctxShadow( ctx, 2 );
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
				x1 = xy[ 1 ].x - 1; // omit 1px mitter head
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
			var gain;
			X.text.forEach( t => { //-------------------------------
				gain          = 'a' in t;
				ctx.fillStyle = t.c || color.wl;
				ctx.font = ( gain ? 12 : 15 ) +'px Inconsolata';
				graph.flowchart.ctxShadow( ctx, gain ? 1 : 0 );
				if ( t.a ) { // cross gain
					ctx.save();
					ctx.translate( t.x, t.y );
					ctx.rotate( t.a );
					ctx.translate( -t.x,-t.y );
					ctx.fillText( t.t, t.x, t.y );
					ctx.restore();
				} else {
					var txt = t.t;
					if ( ! gain ) { // not gain
						var cL = Math.floor( X.w * 0.9  / ctx.measureText( '0' ).width );
						if ( txt.length > cL ) txt = txt.replace( /^ch /, '' );
						if ( ! t.f ) txt = txt.slice( 0, cL ); // if not frame, trim
					}
					ctx.fillText( txt, t.x, t.y );
				}
			} );
		}
		, refresh   : () => {
			var $flowchart = $( '#pipeline canvas' );
			var fL         = $flowchart.length;
			$flowchart.remove();
			if ( fL ) graph.flowchart.plot();
		}
	}
	, pipeline     : {
		  plot : index => {
			var f          = graph.filters.logSpace( 10, DEV.samplerate * 0.95 / 2 );
			var totcgain   = new Array( 1000 ).fill( 1 );
			var currfilt;
			PIP[ index ].names.forEach( name => {
				var filter       = FIL[ name ];
				currfilt         = graph.filters.data( filter );
				if ( ! currfilt ) return false
				
				var [ _, cgain ] = currfilt.complexGain( f );
				totcgain         = totcgain.map( ( cg, i ) => cgain[ i ].mul( cg ) );
			});
			if ( ! currfilt ) return
			
			var ma         = totcgain.map( cg => 20 * Math.log10( cg.abs() + 1e-15 ) );
			var ph         = totcgain.map( cg => 180 / Math.PI * Math.atan2( cg.im, cg.re ) );
			var [ fg, gr ] = calcGroupDelay( f, ph );
			graph.plotLy( {
				  f            : f
				, f_groupdelay : fg
				, groupdelay   : gr
				, magnitude    : ma
				, phase        : ph
			} );
		}
	}
	, plot         : () => {
		graph[ V.tab ].plot( V.li.data( V.tab === 'filters' ? 'name' : 'index' ) );
	}
	, plotLy       : data => {
		var PLOTS = jsonClone( plots );
		var AXES  = jsonClone( axes );
		if ( V.tab === 'filters' ) {
			var f      = FIL[ V.li.data( 'name' ) ];
			var delay  = f.type === 'Delay';                  // if filter has delay
			var delay0 = ! delay && 'gain' in f.parameters && f.parameters.gain === 0;
		} else {
			var delay  = false;
			PIP[ V.li.data( 'index' ) ].names.forEach( n => { // if any filter has delay
				var f      = FIL[ n ];
				if ( ! delay && f.type === 'Delay' ) delay = true;
				var delay0 = ! delay && 'gain' in f.parameters && f.parameters.gain === 0;
			} );
		}
		if ( delay ) {
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
		V.li.find( '.divgraph' ).remove();
		V.li
			.addClass( 'graph' )
			.append( '<div class="divgraph"></div>' );
		var $divgraph = V.li.find( '.divgraph' );
		Plotly.newPlot( $divgraph[ 0 ], plot, layout, PLOTS.options );
		$divgraph.append( '<i class="i-close graphclose" tabindex="0"></i>' );
		if ( ! V.refresh ) scrollUpToView( $divgraph );
	}
	, refresh      : () => {
		V.refresh = true;
		$( '#'+ V.tab +' .entries.main li.graph' ).each( ( i, el ) => {
			V.li = $( el );
			graph.plot();
		} );
		delete V.refresh;
	}
}
window.addEventListener( 'resize', graph.flowchart.refresh );

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
		$( '.rateadjust' ).toggleClass( 'hide', ! DEV.enable_rate_adjust );
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
		if ( ! data ) return

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
		var cl_graph = $( '#filters li[data-name="'+ k +'"]' ).hasClass( 'graph' ) ? ' class="graph"' : '';
		if ( param.type === 'GraphicEqualizer' ) {
			var icon = 'equalizer';
			var cl_eq = ' class="eq"';
		} else {
			var icon = 'filters';
			var cl_eq = '';
		}
		icon        += [ 'Volume', 'Dither', 'Limiter' ].includes( v.type ) ? '' : ' graph';
		icon        += ' liicon edit';
		return '<li data-name="'+ k +'"'+ cl_graph + cl_eq +'>'+ ico( icon ) + li  +'</li>'
	}
	, filtersSub  : k => {
		var li = '<li class="lihead main files">'+ ico( 'folderfilter' ) +'&ensp;Finite Impulse Response'+ ico( 'add' ) + ico( 'back' ) +'</li>';
		if ( S.ls.coeffs ) S.ls.coeffs.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file liicon' ) + k +'</li>' );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
	} //-----------------------------------------------------------------------------------
	, mixers      : () => {
		var data = render.dataSort();
		if ( ! data ) return
		
		var li   = '';
		$.each( data, ( k, v ) => li += render.mixer( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	}
	, mixer       : ( k, v ) => {
		return '<li data-name="'+ k +'">'+ ico( 'mixers liicon edit' )
			  +'<div class="li1">'+ k +'</div>'
			  +'<div class="li2">'+ render.mixerMap( v.mapping ) +'</div>'
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
		data.forEach( ( kv, i ) => {
			var dest   = kv.dest;
			var i_name = ' data-index="'+ i +'" data-name="'+ name +'"';
			li        += '<li class="liinput main dest'+ i +'"'+ i_name +' data-dest="'+ dest +'">'+ ico( 'output liicon' )
						+'<div>Out: '+ dest +'</div>'
						+ ico( kv.mute ? 'volume mute' : 'volume' ) + iconadd( chout === kv.sources.length )
						+'</li>';
			kv.sources.forEach( ( s, si ) => {
				var sources  = data[ i ].sources[ si ];
				var ch       = sources.channel;
				var gain     = sources.gain || 0;
				var disabled = sources.mute ? ' disabled' : '';
				var linear   = sources.scale === 'linear';
				li += '<li class="liinput dest'+ i +'"'+ i_name +'" data-si="'+ si +'" data-source="'+ ch +'">'
					 + ico( 'input liicon' ) +'In: '+ ch +'&emsp;'
					 + render.htmlRange( linear ? 100 : 10, gain, disabled )
					 + ico( sources.mute ? 'volume mute' : 'volume' )
					 + ico( sources.inverted ? 'inverted bl' : 'inverted' )
					 + ico( linear ? 'linear bl' : 'linear' )
					 +'</li>';
			} );
		} );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
		selectSet( $( '#mixers select' ) );
	}
	, mixerMap    : mapping => {
		var ch = '';
		mapping.forEach( m => {
			ch     += ' • ';
			var src = ''
			m.sources.forEach( s => ch += '<cc>'+ s.channel +'</cc> ' );
			ch += '» <cp>'+ m.dest +'</cp>';
		} );
		return ch.slice( 3 )
	} //-----------------------------------------------------------------------------------
	, processors  : () => {
		var data = render.dataSort();
		if ( ! data ) return
		
		var li   = '';
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
		var nopip = ! PIP || ! PIP.length;
		$( '.i-flowchart' ).toggleClass( 'disabled', nopip );
		if ( nopip ) return
		
		var li = '';
		PIP.forEach( ( el, i ) => li += render.pipe( el, i ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
		render.sortable();
		graph.flowchart.refresh();
	}
	, pipe        : ( el, i ) => {
		var icon     = ( el.bypassed ? 'bypass' : 'pipeline' ) +' liicon edit';
		var cl_graph = '';
		if ( el.type === 'Filter' ) {
			icon      += ' graph';
			var icon_s = 'filters'
			var li1    = el.names.join( ' <gr>•</gr> ' );
			var li2    = '';
			el.channels.forEach( c => li2 += '<cc>'+ c +'</cc> ' );
			cl_graph   = $( '#pipeline .main li' ).eq( i ).hasClass( 'graph' ) ? ' class="graph"' : '';
		} else {
			var icon_s = 'mixers'
			var li1    = el.name;
			var li2    = render.mixerMap( MIX[ el.name ].mapping );
		}
		var li = '<li data-type="'+ el.type +'" data-index="'+ i +'"'+ cl_graph +'>'+ ico( icon ) + ico( icon_s )
				+'<div class="li1">'+ li1 +'</div>'
				+'<div class="li2">'+ li2 +'</div>'
				+'</li>';
		return li
	}
	, sortable    : () => {
		$( '#menu' ).addClass( 'hide' );
		if ( V.sortable ) {
			V.sortable.destroy();
			delete V.sortable;
		}
		if ( $( '#pipeline .entries li' ).length < 2 ) return
		
		V.sortable = new Sortable( $( '#pipeline .entries' )[ 0 ], {
			  ghostClass : 'sortable-ghost'
			, delay      : 400
			, onUpdate   : function ( e ) {
				var a  = jsonClone( PIP[ e.oldIndex ] );
				PIP.splice( e.oldIndex, 1 );
				PIP.splice( e.newIndex, 0, a );
				setting.save( 'Pipeline', 'Change order ...' );
				render.pipeline();
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
		if ( DEV.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
		if ( DEV.capture_samplerate ) keys.push( 'capture_samplerate' );
		if ( DEV.stop_on_rate_change ) keys.push( 'rate_measure_interval' );
		if ( keys.length ) {
			labels += '<hr>';
			values += '<hr>';
			keys.forEach( k => {
				labels += common.key2label( k ) +'<br>';
				values += DEV[ k ].toLocaleString() +'<br>';
			} );
		}
		if ( DEV.resampler ) {
			labels += 'Resampler<br>'
			values += DEV.resampler.type +'<br>';
			if ( 'profile' in DEV.resampler ) {
				labels += 'Profile<br>'
				values += DEV.resampler.profile +'<br>';
			}
			if ( DEV.capture_samplerate ) {
				labels += 'Capture samplerate<br>'
				values += DEV.capture_samplerate +'<br>';
			}
		}
		$( '#divsampling .label' ).html( labels );
		$( '#divsampling .value' ).html( values.replace( /bluealsa|Bluez/, 'BlueALSA' ) );
		$( '#enable_rate_adjust' ).toggleClass( 'disabled', DEV.resampler !== null && DEV.resampler.type === 'Synchronous' );
		[ 'capture_samplerate', 'enable_rate_adjust', 'resampler', 'stop_on_rate_change' ].forEach( id => {
			$( '#'+ id ).prop( 'checked', ! ( DEV[ id ] === null || DEV[ id ] === false ) );
		} );
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
		
		var keys = Object.keys( kv );
		if ( ! keys.length ) return false
		
		var data = {};
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
	  filter        : ( type, subtype, name, edit ) => {
		if ( edit ) {
			var values = { name: name, type: type }
			var list   = F[ type ];
			var kv     = F.values[ type ];
			if ( subtype ) {
				values.subtype = subtype;
				list           = list[ subtype ];
				kv             = kv[ subtype ];
			}
			var param  = FIL[ name ].parameters;
			$.each( kv, ( k, v ) => { // F.values[ type ] - keep values order
				if ( ! ( k in values ) ) values[ k ] = param[ k ] || ''; // exclude: name, type, subtype
			} );
			if ( type === 'BiquadCombo' ) {
				if ( subtype === 'FivePointPeq' ) {
					$.each( F0.FivePointPeq, ( k, v ) => { // param kv to values array group
						values[ k ] = [];
						v.forEach( p => values[ k ].push( param[ p ] ) );
					} );
				} else if ( subtype === 'GraphicEqualizer' ) {
					values.bands = param.gains.length;
				}
			}
		} else {
			var values = { name: name || '', type: type }
			var list   = F[ type ];
			var kv     = F.values[ type ];
			if ( ! subtype && type in F0.subtype ) subtype = F0.subtype[ type ][ 2 ][ 0 ];
			if ( subtype ) {
				values.subtype = subtype;
				list           = list[ subtype ];
				kv             = kv[ subtype ];
			}
			$.each( kv, ( k, v ) => {
				if ( ! ( k in values ) ) values[ k ] = v;
			} );
		}
		var title       = edit ? 'Filter' : 'Add Filter';
		info( {
			  icon         : V.tab
			, title        : title
			, list         : list
			, boxwidth     : 198
			, values       : values
			, checkblank   : true
			, checkchanged : edit
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).css( 'min-width', '125px' );
				var $select = $( '#infoList select' );
				$select.eq( 0 ).on( 'input', function() {
					var val = infoVal();
					setting.filter( val.type, '', val.name );
				} );
				$select.eq( 1 ).on( 'input', function() {
					var val = infoVal();
					if ( val.type === 'Conv' && [ 'Raw', 'Wav' ].includes( val.subtype ) && ! S.ls.coeffs ) {
						info( {
							  icon    : V.tab
							, title   : title
							, message : 'Filter files not available.'
							, ok      : () => setting.filter( 'Conv', '', val.name )
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
				var val        = infoVal();
				var newname    = val.name;
				type           = val.type;
				subtype        = val.subtype;
				if ( subtype === 'GraphicEqualizer' ) {
					var bands = val.bands;
					if ( edit ) {
						if ( bands !== values.bands ) {
							delete val.gain;
							val.gains = Array( bands ).fill( 0 );
						}
					} else {
						val.gains = Array( bands ).fill( 0 );
					}
					delete val.bands;
				} else if ( subtype === 'FivePointPeq' ) {
					Object.keys( F0.FivePointPeq ).forEach( k => {
						F0.FivePointPeq[ k ].forEach( ( key, i ) => {
							val[ key ] = val[ k ][ i ];
						} );
						delete val[ k ];
					} );
				}
				var param      = {}
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
		var mapping = MIX[ V.li.data( 'name' ) ].mapping;
		if ( index === 'dest' ) {
			var title = 'Add Destination / Out';
			info( {
				  icon       : V.tab
				, title      : title
				, message    : 'Channel:'
				, list       : [ '', 'radio', [ ...Array( DEV.playback.channels ).keys() ] ]
				, beforeshow : () => {
					if ( mapping.length ) {
						var ch    = [];
						mapping.forEach( m => ch.push( m.dest ) );
						setting.mixerMapCheck( ch, 'playback' );
					}
				}
				, ok         : () => {
					var sources = [];
					for ( var ch = 0; ch < DEV.capture.channels; ch++ ) {
						sources.push( {
							  channel  : ch
							, gain     : 0
							, inverted : false
							, mute     : false
						} );
					}
					var mapping = {
						  dest    : infoVal()
						, mute    : false
						, sources : sources
					}
					MIX[ name ].mapping.push( mapping );
					MIX[ name ].mapping.sort( ( a, b ) => a.dest - b.dest );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		} else {
			var title = 'Add Source / In';
			info( {
				  icon       : V.tab
				, title      : title
				, message    : 'Channel:'
				, list       : [ '', 'radio', [ ...Array( DEV.capture.channels ).keys() ] ]
				, beforeshow : () => {
					mapping.forEach( m => {
						if ( ! m.sources.length || m.dest !== V.li.data( 'dest' ) ) return
						
						var ch    = [];
						m.sources.forEach( s => ch.push( s.channel ) );
						setting.mixerMapCheck( ch, 'capture' );
					} );
				}
				, ok         : () => {
					var source = {
						  channel  : infoVal()
						, gain     : 0
						, inverted : false
						, mute     : false
					}
					MIX[ name ].mapping[ index ].sources.push( source );
					MIX[ name ].mapping[ index ].sources.sort( ( a, b ) => a.channel - b.channel );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		}
	}
	, mixerMapCheck : ( ch, c_p ) => {
		$( '#infoList input' ).each( ( i, el ) => $( el ).prop( 'disabled', ch.includes( i ) ) );
		var ch_capt = Array.from( Array( DEV[ c_p ].channels ).keys() );
		var ch_diff = ch_capt.filter( c => ! ch.includes( c ) );
		$( '#infoList input' )
			.prop( 'checked', false )
			.eq( ch_diff[ 0 ] ).prop( 'checked', true );
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
				if ( ! PRO ) {
					S.config.processors = {}
					PRO = S.config.processors;
				}
				PRO[ namenew ] = { type: typenew, parameters: val }
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
		var current = DEV.resampler && DEV.resampler.type === values.type;
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
				if ( val.type === 'Synchronous' && DEV.enable_rate_adjust ) DEV.enable_rate_adjust = false;
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
		clearTimeout( V.debounce );
		setTimeout( () => {
			var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
			wscamilla.send( '{ "SetConfigJson": "'+ config +'" }' );
			graph.refresh();
			V.debounce = setTimeout( () => {
				local();
				setting.statusPush();
				bash( [ 'saveconfig' ] );
			}, 1000 );
		}, wscamilla ? 0 : 300 );
		if ( titlle ) banner( V.tab, titlle, msg );
		if ( V.tab === 'devices' ) render.devices();
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
						if ( DEV.enable_rate_adjust ) wscamilla.send( '"GetRateAdjust"' );
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
					D0.list.typeC[ 2 ] = type.capture;
					D0.list.typeP[ 2 ] = type.playback;
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
		if ( S.config && DEV.enable_rate_adjust ) getstate.push( 'GetBufferLevel', 'GetRateAdjust' );
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
} ).on( 'click', '.col-r .i-volume, .level', function() {
	common.volumeAnimate( S.volumemute, S.volume );
	volumeMuteToggle();
	$( '#out .peak' ).css( 'transition-duration', '0s' );
	setTimeout( () => $( '#out .peak' ).css( 'transition-duration', '' ), 100 );

} ).press( {
	  delegate : '.col-l i, .i-plus'
	, action   : e => {
		var up           = $( e.target ).hasClass( 'i-plus' );
		V.intervalvolume = setInterval( () => {
			up ? S.volume++ : S.volume--;
			volumeMaxSet();
			volumeSet();
			render.volumeThumb();
			$( '#divvolume .level' ).text( S.volume );
			if ( S.volume === 0 || S.volume === 100 ) clearInterval( V.intervalvolume );
		}, 100 );
	}
	, end     : () => {
		clearInterval( V.intervalvolume );
		volumePush();
	}
} );
// common ---------------------------------------------------------------------------------
$( '.entries' ).on( 'click', '.i-minus, .i-plus, .db', function() { // filters, mixersSub
	setting.rangeGet( $( this ), 'click' );
} ).press( {
	  delegate : '.i-minus, .i-plus'
	, action   :  e => setting.rangeGet( $( e.currentTarget ), 'press' )
	, end      : () => clearInterval( V.intervalgain ) // on end
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
		setting.filter( 'Biquad' );
	} else if ( V.tab === 'config' ) {
		setting.upload();
	} else {
		setting[ V.tab.replace( /s$/, '' ) ]();
	}
} ).on( 'click', '.i-flowchart', function() {
	var $flowchart = $( '#pipeline canvas' );
	$flowchart.length ? $flowchart.remove() : graph.flowchart.plot();
} );
$( '.entries' ).on( 'click', '.liicon', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	V.li      = $this.parent();
	if ( ! contextMenuToggle() ) return
	
	$( '#'+ V.tab +' li' ).removeClass( 'active' );
	V.li.addClass( 'active' );
	$( '#menu' ).find( '.copy, .rename, .info' ).toggleClass( 'hide', V.tab !== 'config' );
	[ 'edit', 'graph' ].forEach( k => $( '#menu .'+ k ).toggleClass( 'hide', ! $this.hasClass( k ) ) )
	$( '#menu .delete' ).toggleClass( 'disabled', V.tab === 'config' && S.ls.configs.length === 1 );
	if ( V.tab === 'mixers' && $( '#mixers .entries.sub' ).hasClass( 'hide' ) ) {
		$( '#menu' ).find( '.edit, .rename' ).toggleClass( 'hide' );
	}
	if ( V.tab === 'pipeline' ) {
		var bypassed = PIP[ V.li.index() ].bypassed === true;
		$( '#menu .bypass' ).toggleClass( 'hide', bypassed );
		$( '#menu .restore' ).toggleClass( 'hide', ! bypassed );
		$( '#menu .edit' ).toggleClass( 'disabled', V.li.data( 'type' ) === 'Mixer' && Object.keys( MIX ).length < 2 );
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
	var $this = $( this );
	$this.parents( 'li' ).removeClass( 'graph' );
	$this.parent().remove();
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
		if ( $divgraph.length ) {
			V.li.removeClass( 'graph' );
			$divgraph.remove();
		} else {
			graph.plot();
		}
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
						setting.filter( type, subtype, name, 'edit' );
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
						var msg   = ico( 'output gr' ) +' Out: '+ V.li.data( 'dest' );
					} else {
						var title = 'Input';
						var msg   = ico( 'input gr' ) +' In: '+ V.li.data( 'source' );
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
							} else {
								MIX[ name ].mapping[ mi ].sources.splice( V.li.data( 'si' ), 1 );
							}
							setting.save( title, 'Remove ...' );
							main ? render.mixers( name ) : render.mixersSub( name );
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
								graph.flowchart.refresh();
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
$( '.entries' ).on( 'input', 'input[type=range]', function() {
	setting.rangeGet( $( this ), 'input' );
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
	var $this = $( this );
	V.li  = $this.parent();
	var M = setting.mixerGet( $this );
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
