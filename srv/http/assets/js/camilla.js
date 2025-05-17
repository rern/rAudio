W.volume      = data => {
	if ( V.local ) {
		V.local = false;
		return
	}
	
	var vol = data.val;
	if ( data.type === 'mute' ) {
		UTIL.volumeAnimate( 0, S.volume );
		S.volume     = 0;
		S.volumemute = vol;
	} else if ( data.type === 'unmute' ) {
		UTIL.volumeAnimate( S.volumemute, 0 );
		S.volume     = vol;
		S.volumemute = 0;
	} else {
		if ( data.type === 'drag' ) {
			V.drag = true;
			setTimeout( () => V.drag = false, 300 );
		}
		UTIL.volumeAnimate( vol, S.volume );
		S.volume = vol;
	}
}
W.refresh     = data => {
	if ( V.press || V.local || data.page !== 'camilla' ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		$.each( data, ( k, v ) => { S[ k ] = v } );
		CONFIG.valuesAssign();
		RENDER[ $( '#'+ V.tab +' .entries.main' ).hasClass( 'hide' ) ? V.tab +'Sub' : V.tab ]();
		BANNER_HIDE();
	}, 300 );
}
// variables //////////////////////////////////////////////////////////////////////////////
V             = {
	   ...V
	, clipped    : false
	, tab        : 'filters'
	, timeoutred : true
}
var WSCAMILLA = null
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
	, name         : [ 'Name',      'text' ]
	, fader        : [ 'Fader',     'text' ]
	, freq         : [ 'Frequency', 'number' ]
	, gain         : [ 'Gain',      'number' ]
	, q            : [ 'Q',         'number' ]
	, qbandwidth   : [ '',          'radio', { Q: 'q', Bandwidth: 'bandwidth' } ]
	, Free         : [
		  [ 'a1', 'number' ]
		, [ 'a2', 'number' ]
		, [ 'b0', 'number' ]
		, [ 'b1', 'number' ]
		, [ 'b2', 'number' ]
	]
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
	, n_t          : { name: '', type: '' }
	, n_t_s        : { name: '', type: '', subtype: '' }
	, peq          : [ 'Lowshelf', 'Peaking 1', 'Peaking 2', 'Peaking 3', 'Highshelf' ]
}
F0.values     = {
	  dither  : { ...F0.n_t_s, bits: 16 }
	, pass    : { ...F0.n_t_s, freq: 1000, q: 0 }
	, passFO  : { ...F0.n_t_s, freq: 1000 }
	, passC   : { ...F0.n_t_s, order: 2, freq: 1000 }
	, shelf   : { ...F0.n_t_s, freq: 1000, gain: 0, q: 0, unit: 'q' }
	, shelfFO : { ...F0.n_t_s, freq: 1000, gain: 0 }
}
F0.biquad     = [ F0.name, F0.type, F0.subtype.Biquad ];
F0.biquad_f   = [ ...F0.biquad, F0.freq ];
F0.biquadC    = [ F0.name, F0.type, F0.subtype.BiquadCombo ];
F0.conv       = [ F0.name, F0.type, F0.subtype.Conv ];
F0.dither     = [ F0.name, F0.type, F0.subtype.Dither, [ 'Bits', 'number' ] ];
F0.fader      = [ F0.name, F0.type, F0.fader ];
F0.pass       = [ ...F0.biquad_f, F0.q ];
F0.passC      = [ ...F0.biquadC, [ 'Order', 'number' ], F0.freq ];

F0.list       = {
	  notch     : [ ...F0.pass,    F0.qbandwidth ]
	, pass      : F0.pass
	, passC     : F0.passC
	, passFO    : F0.biquad_f
	, peq       : [ ...F0.biquadC, [ '', 'Frequency</td><td>Gain</td><td>Q' ] ]
	, shelf     : [ ...F0.biquad_f, F0.gain, F0.q, [ '', 'radio', { Q: 'q', Slope: 'slope' } ] ]
	, shelfFO   : [ ...F0.biquad_f, F0.gain ]
}
for ( var i = 0; i < 15; i++ ) {
	F0.list.peq.push( [ i % 3 ? '' : F0.peq[ i / 3 ], 'number', { sameline: i % 3 < 2 } ] );
}
var F         = {
	  Biquad      : {
		  Free              : [ ...F0.biquad, ...F0.Free ]
		, GeneralNotch      : [ ...F0.biquad, ...F0.GeneralNotch ]
		, LinkwitzTransform : [ ...F0.biquad, ...F0.LinkwitzTransform ]
		, Notch             : F0.list.notch
		, Peaking           : [ ...F0.biquad_f, F0.gain, F0.q, F0.qbandwidth ]
		// the rest - assign later
	}
	, BiquadCombo : {
		  FivePointPeq     : F0.list.peq
		, GraphicEqualizer : [
			  ...F0.biquadC
			, [ 'Frequency min', 'number' ]
			, [ 'Frequency max', 'number' ]
			, [ 'Bands',         'number' ]
		]
		, Tilt             : [
			  ...F0.biquadC
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
			  Free              : { ...F0.n_t_s, a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
			, GeneralNotch      : { ...F0.n_t_s, freq_z: 0,  freq_p: 0, q_p: 0, normalize_at_dc:false }
			, LinkwitzTransform : { ...F0.n_t_s, q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
			, Notch             : { ...F0.n_t_s, freq: 1000, q: 0, unit: 'q' }
			, Peaking           : { ...F0.n_t_s, freq: 1000, gain: 0, q: 0, unit: 'q' }
			// the rest - define next
		}
		, BiquadCombo : {
			  FivePointPeq      : {
				  ... F0.n_t_s
				, fls:    60, gls: 0, qls: 0.5
				, fp1:   240, gp1: 0, qp1: 0.5
				, fp2:   900, gp2: 0, qp2: 0.5
				, fp3:  4000, gp3: 0, qp3: 0.5
				, fhs: 14000, ghs: 0, qhs: 0.5
			}
			, GraphicEqualizer  : { ...F0.n_t_s, freq_min: 20, freq_max: 20000, bands: 10 }
			, Tilt              : { ...F0.n_t_s, gain: 0 }
			// the rest - define next
		}
		, Conv        : {
			  Dummy             : { ...F0.n_t_s, length: 65536 } // min = 1
			, Raw               : { ...F0.n_t_s, filename: '', format: 'TEXT', skip_bytes_lines: 0, read_bytes_lines: 0 }
			, Values            : { ...F0.n_t_s, values: [ 0.1, 0.2, 0.3, 0.4 ] }
			, Wav               : { ...F0.n_t_s, filename: '', channel: 0 }
		}
		, Dither      : {
			// define next
		}                             // parameters
		, Delay       : { ...F0.n_t, delay: 0, unit: 'ms', subsample: false }
		, DiffEq      : { ...F0.n_t, a: [ 1, 0 ], b: [ 1, 0 ] }
		, Gain        : { ...F0.n_t, gain: 0, scale: 'dB', inverted: false, mute: false } // +-150dB / +-10 linear
		, Limiter     : { ...F0.n_t, clip_limit: -10.0, soft_clip: false }
		, Loudness    : { ...F0.n_t, fader : 'main', reference_level: 25, high_boost: 10, low_boost: 10, attenuate_mid: false }
		, Volume      : { ...F0.n_t, ramp_time: 400, fader: 'Aux1' }
	}
};
[ 'Biquad', 'BiquadCombo', 'Conv', 'Dither' ].forEach( type => {
	F0.subtype[ type ][ 2 ].forEach( sub => {
		if ( type === 'Biquad' ) {
			if ( sub.slice( -4 ) === 'pass' ) {
				F[ type ][ sub ]        = F0.list[ [ 'H', 'L' ].includes( sub[ 0 ] ) ? 'pass' : 'notch' ];
				F.values[ type ][ sub ] = F0.values.pass
			} else if ( sub.slice( -6 ) === 'passFO' ) {
				F[ type ][ sub ]        = F0.list.passFO;
				F.values[ type ][ sub ] = F0.values.passFO
			} else if ( sub.slice( -5 ) === 'shelf' ) {
				F[ type ][ sub ]        = F0.list.shelf;
				F.values[ type ][ sub ] = F0.values.shelf
			} else if ( sub.slice( -7 ) === 'shelfFO' ) {
				F[ type ][ sub ]        = F0.list.shelfFO;
				F.values[ type ][ sub ] = F0.values.shelfFO
			}
		} else if ( type === 'BiquadCombo' ) {
			if ( [ 'B', 'L' ].includes( sub[ 0 ] ) ) {
				F[ type ][ sub ]        = F0.passC;
				F.values[ type ][ sub ] = F0.values.passC
			}
		} else if ( type === 'Dither' ) {
			F[ type ][ sub ]        = F0.dither;
			F.values[ type ][ sub ] = F0.values.dither
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
var CLR       = {
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
var TICKTEXT  = [ 20, 50, 100, 500, '1k', '5k', '10k', '20k' ];
var AXES      = {
	  freq       : {
		  filters  : {
			  tickfont  : { color: CLR.wl }
			, tickvals  : [ 235, 393, 462, 624, 694, 858, 926, 995 ] // 235>|  ...  | 69 |  163  | 69 |  163  | 69 | .. |<995
			, ticktext  : TICKTEXT
			, range     : [ 235, 995 ]
			, gridcolor : CLR.grd
		}
		, pipeline : {
			  tickfont  : { color: CLR.wl }
			, tickvals  : [ 4, 210, 300, 511, 602, 816, 905, 995 ]   //   4>|  ...  | 90 |  213  | 90 |  213  | 90 | .. |<995
			, ticktext  : TICKTEXT
			, range     : [ 4, 995 ]
			, gridcolor : CLR.grd
		}
	}
	, time       : {
		  title      : {
			  text     : 'Time'
			, font     : { color: CLR.grl }
			, standoff : 0
		}
		, tickfont   : { color: CLR.grl }
		, gridcolor  : CLR.grk
		, overlaying : 'x'
		, side       : 'top'
	}
	, gain       : {
		  title        : {
			  text     : 'Gain'
			, font     : { color: CLR.m }
			, standoff : 0
		}
		, tickfont      : { color: CLR.m }
		, zerolinecolor : CLR.w
		, linecolor     : CLR.md
		, gridcolor     : CLR.md
	}
	, phase      : {
		  title      : {
			  text     : 'Phase'
			, font     : { color: CLR.r }
			, standoff : 0
		}
		, tickfont   : { color: CLR.r }
		, overlaying : 'y'
		, side       : 'right'
		, range      : [ -180, 180 ]
		, dtick      : 90
		, zeroline   : false
		, linecolor  : CLR.rd
		, gridcolor  : CLR.rd
	}
	, groupdelay : {
		  title      : {
			  text     : 'Delay'
			, font     : { color: CLR.o }
			, standoff : 0
		}
		, tickfont   : { color: CLR.o }
		, zeroline   : false
		, linecolor  : CLR.od
		, gridcolor  : CLR.od
		, overlaying : 'y'
		, side       : 'right'
		, anchor     : 'free'
		, autoshift  : true
		, shift      : 10
	}
	, impulse    : {
		  title      : {
			  text     : 'Impulse'
			, font     : { color: CLR.g }
			, standoff : 0
		}
		, tickfont   : { color: CLR.g }
		, zeroline   : false
		, linecolor  : CLR.gd
		, gridcolor  : CLR.gd
		, overlaying : 'y'
		, side       : 'left'
		, anchor     : 'free'
		, autoshift  : true
		, shift      : -10
	}
}
var PLOTS     = {
	  groupdelay : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Delay'
		, line  : { width : 2, color: CLR.o }
	}
	, impulse    : {
		  xaxis : 'x2'
		, yaxis : 'y4'
		, type  : 'scatter'
		, name  : 'Impulse'
		, line  : { width : 1, color: CLR.g }
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
	, gain       : {
		  yaxis : 'y'
		, type  : 'scatter'
		, name  : 'Gain'
		, line  : { width : 3, color: CLR.m }
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
		, line  : { width : 2, color : CLR.r }
	}
}

// functions //////////////////////////////////////////////////////////////////////////////
function renderPage() { // common from settings.js - render with 'GetConfigJson'
	WSCAMILLA && WSCAMILLA.readyState === 1 ? UTIL.wsGetConfig() : UTIL.webSocket();
}
function onPageInactive() {
	if ( WSCAMILLA ) WSCAMILLA.close();
}

var GRAPH     = {
	  filters      : {
		  plot     : $li => {
			var filter    = FIL[ $li.data( 'name' ) ];
			var f         = GRAPH.filters.logSpace( 0 );
			var classdata = GRAPH.filters.data( filter );
			if ( ! classdata ) return
			
			classdata.gainAndPhase( f, false, ( fg, ga, gr, ph, im ) => {
				GRAPH.plotLy( $li, fg, ga, gr, ph, im );
			} );
		}
		, data     : filter => {
			var param      = filter.parameters;
			var samplerate = DEV.samplerate;
			switch( filter.type ) {
				case 'Biquad':
					return new Biquad( param, samplerate )
				case 'BiquadCombo':
					return new BiquadCombo( param, samplerate )
				case 'Conv':
					return new Conv( param, samplerate )
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
					BANNER( 'graph', 'Graph', 'Not available.' );
					return false
			}
		}
		, logSpace : logmin => {
			let logmax  = Math.log10( DEV.samplerate * 0.95 / 2 );
			let perstep = ( logmax - logmin ) / 1000;
			let values  = Array.from( { length: 1000 }, ( v, i ) => 10 ** ( logmin + i * perstep ) );
			return values;
		}
	}
	, flowchart    : {
		  add       : txt => {
			X.type = txt;
			var cL = DEV[ txt.toLowerCase() ].channels;
			GRAPH.flowchart.addFrame( txt, cL );
			for ( var ch = 0; ch < cL; ch++ ) GRAPH.flowchart.addBox( 'ch '+ ch, ch );
		}
		, addBox    : ( txt, ch, gain ) => {
			var nodb = gain === false;
			var c    = {
				  Filter   : nodb ? CLR.gd : CLR.md
				, Capture  : CLR.grl
				, Mixer    : CLR.od
				, Playback : CLR.gr
			}
			Object.keys( c ).forEach( k => { X[ k ] = X.type === k } );
			var y    = X.h + X.h * 2 * ch; // y > down - each channel
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
			
			var g    = X.Mixer ? gain[ ch ] : gain;
			if ( g !== undefined && ! nodb ) {
				var db = GRAPH.flowchart.dbText( g );
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
				var db     = GRAPH.flowchart.dbText( g );
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
				, c : CLR.grd
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
			var c = CLR.grl;
			if ( gain > 0 )      c = CLR.wl;
			else if ( gain < 0 ) c = CLR.r;
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
			
			GRAPH.flowchart.add( 'Capture' );
			X.x += X.w * 2;
			PIP.forEach( pip => {                     // @ step
				X.type  = pip.type;
				if ( pip.type === 'Filter' ) {
					pip.names.forEach( name => {      // @ filter  < @ step
						pip.channels.forEach( ch => { // @ channel < @ filter < @ step
							var param  = FIL[ name ].parameters;
							var gain   = 'gain' in param ? param.gain : false;
							GRAPH.flowchart.addBox( name, ch, gain );
							X.ax[ ch ] = X.x + X.w;   // ax >| @ channel < @ filter < @ step
						} );
						X.x += X.w * 2;               // x  >| @ filter  < @ step
					} );
				} else {
					var mapping = MIX[ pip.name ].mapping;
					var mL      = mapping.length;
					if ( mL > 1 ) GRAPH.flowchart.addFrame( pip.name, mL );
					mapping.forEach( m => {                                        // @ playback channel      < @ step
						var ch   = m.dest;
						var gain = {};
						m.sources.forEach( s => { gain[ s.channel ] = s.gain } );
						GRAPH.flowchart.addBox( 'ch '+ ch, ch, gain );
					} );
					for ( var ch = 0; ch < ch_capt; ch++ ) X.ax[ ch ] = X.x + X.w; // ax >| @ capture channel < @ step
					X.x        += X.w * 2;                                         // x  >| @ mixer           < @ step
				}
			} );
			GRAPH.flowchart.add( 'Playback' );
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
				GRAPH.flowchart.ctxShadow( ctx, 2 );
			} );
			ctx.restore();
			ctx.strokeStyle  = CLR.gr;
			ctx.fillStyle    = CLR.grl;
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
				ctx.fillStyle = t.c || CLR.wl;
				ctx.font = ( gain ? 12 : 15 ) +'px Inconsolata';
				GRAPH.flowchart.ctxShadow( ctx, gain ? 1 : 0 );
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
			if ( fL ) GRAPH.flowchart.plot();
		}
	}
	, pipeline     : {
		  plot : $li => {
			var f          = GRAPH.filters.logSpace( 1 );
			var classdata;
			var names      = PIP[ $li.data( 'index' ) ].names;
			var filter     = FIL[ names[ 0 ] ];
			if ( filter.type === 'Conv' ) {
				classdata  = GRAPH.filters.data( filter );
				classdata.gainAndPhase( f, false, ( fg, ga, gr, ph, im ) => {
					GRAPH.plotLy( $li, fg, ga, gr, ph, im );
				} );
			} else {
				var totcga = new Array( 1000 ).fill( 1 );
				names.forEach( name => {
					filter         = FIL[ name ];
					classdata      = GRAPH.filters.data( filter );
					if ( ! classdata ) return false
					
					var [ _, cga ] = classdata.complexGain( f );
					totcga          = totcga.map( ( cg, i ) => cga[ i ].mul( cg ) );
				});
				var ga         = mapGain( totcga );
				var ph         = mapPhase( totcga );
				var [ fg, gr ] = calcGroupDelay( f, ph );
				GRAPH.plotLy( $li, fg, ga, gr, ph );
			}
		}
	}
	, plotLy       : ( $li, fg, ga, gr, ph, im ) => {
		var data  = {
			  f_groupdelay : fg
			, groupdelay   : gr
			, gain         : ga
			, phase        : ph
		}
		if ( im ) data.impulse = im;
		var plots = COMMON.json.clone( PLOTS );
		var axes  = COMMON.json.clone( AXES );
		if ( V.tab === 'filters' ) {
			var f      = FIL[ $li.data( 'name' ) ];
			var delay  = f.type === 'Delay';                  // if filter has delay
			var delay0 = ! delay && 'gain' in f.parameters && f.parameters.gain === 0;
		} else {
			var delay  = false;
			PIP[ $li.data( 'index' ) ].names.forEach( n => { // if any filter has delay
				var f      = FIL[ n ];
				if ( ! delay && f.type === 'Delay' ) delay = true;
				var delay0 = ! delay && 'gain' in f.parameters && f.parameters.gain === 0;
			} );
		}
		if ( delay ) {
			plots.gain.y   = 0;
		} else {
			plots.gain.y   = data.gain;
			var minmax          = {
				  groupdelay : 50 
				, impulse    : 1
				, gain       : 6
			};
			[ 'groupdelay', 'impulse', 'gain' ].forEach( d => {
				if ( ! ( d in data ) ) {
					if ( d === 'gain' ) {
						axes[ d ].dtick = 8
						axes[ d ].range = [ -6, 6 ];
					}
					return
				}
				var min = Math.min( ...data[ d ] );
				var max = Math.max( ...data[ d ] );
				max     = Math.max( max, minmax[ d ] );
				min     = Math.min( min, -minmax[ d ] )
				var abs = Math.max( Math.abs( min ), Math.abs( max ) ) + minmax[ d ] * 0.1;
				if ( d === 'gain' ) {
					dtick = abs < 10
								? 2
								: abs < 20
									? 5
									: abs < 30
										? 10
										: 20;
				} else if ( d === 'groupdelay' ) {
					dtick = abs < 100
								? 20
								: abs < 500
									? 100
									: 500;
				} else {
					dtick = abs < 1
							? 0.2
							: abs < 2
								? 0.5
								: 1;
				}
				axes[ d ].dtick = dtick
				axes[ d ].range = [ -abs, abs ];
			} );
		}
		plots.phase.y      = data.phase;
		plots.groupdelay.y = delay0 ? false : data.groupdelay;
		var plot           = [ plots.gain, plots.phase, plots.groupdelay ];
		var layout         = {
			  ...plots.layout
			, xaxis         : axes.freq[ V.tab ]
			, yaxis         : axes.gain
			, yaxis2        : axes.phase
			, yaxis3        : axes.groupdelay
		}
		if ( im ) { // Conv
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
			axes.time.range    = [ 0, imL ];
			axes.time.tickvals = tickvals;
			axes.time.ticktext = ticktext;
			layout.margin.t    = 40;
			layout.xaxis2      = axes.time;
			layout.yaxis4      = axes.impulse;
			plots.impulse.y    = data.impulse;
			plot.push( plots.impulse );
			plots.phase.line.width = 1;
		}
		var graphnew = ! $li.find( '.divgraph' ).length;
		if ( graphnew ) $li.append( '<div class="divgraph"></div>' );
		var $divgraph = $li.find( '.divgraph' );
		Plotly.newPlot( $divgraph[ 0 ], plot, layout, plots.options );
		if ( ! $li.find( '.graphclose' ).length ) $divgraph.append( '<i class="i-close graphclose" tabindex="0"></i>' );
		if ( graphnew ) COMMON.scrollToView( $divgraph );
	}
	, refresh      : () => {
		$( '#'+ V.tab +' .entries.main .divgraph' ).each( ( i, el ) => {
			GRAPH[ V.tab ].plot( $( el ).parent() );
		} );
	}
}
window.addEventListener( 'resize', GRAPH.flowchart.refresh );
new Sortable( $( '#pipeline .entries' )[ 0 ], {
	  delay               : 200
	, delayOnTouchOnly    : true
	, touchStartThreshold : 5
	, onUpdate            : e => {
		var a  = COMMON.json.clone( PIP[ e.oldIndex ] );
		PIP.splice( e.oldIndex, 1 );
		PIP.splice( e.newIndex, 0, a );
		SETTING.save( 'Pipeline', 'Change order ...' );
		RENDER.pipeline();
	}
} );

var CONFIG    = {
	  configuration       : () => {
		if ( $( '#divconfig' ).hasClass( 'hide' ) ) {
			V.tabprev = V.tab;
			V.tab     = 'config';
			RENDER.tab();
		} else {
			$( '#tab'+ V.tabprev ).trigger( 'click' );
		}
	}
	, enable_rate_adjust  : () => {
		if ( $( '#setting-enable_rate_adjust' ).siblings( 'input' ).hasClass( 'disabled' ) ) {
			INFO( {
				  ...SW
				, message : 'Resampler type is <wh>Synchronous</wh>'
			} );
			SWITCH.cancel();
			return
		}
		
		var enabled = DEV.enable_rate_adjust;
		INFO( {
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
			, cancel       : SWITCH.cancel
			, ok           : () => {
				DEV.enable_rate_adjust = true;
				var val                =  _INFO.val();
				[ 'adjust_period', 'target_level' ].forEach( k => DEV[ k ] = val[ k ] );
				SETTING.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, capture_samplerate  : () => {
		var enabled = DEV.capture_samplerate;
		INFO( {
			  ...SW
			, list         : D0.list.capture_samplerate
			, boxwidth     : 120
			, values       : [ DEV.capture_samplerate ]
			, checkchanged : enabled
			, cancel       : SWITCH.cancel
			, beforeshow   : () => $( '#infoList option[value='+ DEV.samplerate +']' ).remove()
			, ok           : () => {
				DEV.capture_samplerate = DEV.samplerate;
				SETTING.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, resampler           : () => SETTING.resampler( DEV.resampler ? DEV.resampler.type : 'AsyncSinc' )
	, stop_on_rate_change : () => {
		var enabled = DEV.stop_on_rate_change;
		INFO( {
			  ...SW
			, list         : [ 'Rate mearsure interval', 'number' ]
			, boxwidth     : 65
			, values       : DEV.rate_measure_interval
			, checkchanged : enabled
			, cancel       : SWITCH.cancel
			, ok           : () => {
				DEV.stop_on_rate_change   = true;
				DEV.rate_measure_interval = _INFO.val();
				SETTING.save( SW.title, enabled ? 'Change ...' : 'Enable ...' );
			}
		} );
	}
	, valuesAssign        : () => { // DEV, MIX, FIL, PRO, DEV ...
		[ 'devices', 'mixers', 'filters', 'processors', 'pipeline' ].forEach( k => {
			window[ k.slice( 0, 3 ).toUpperCase() ] = S.config[ k ];
		} );
		var dev                            = S.devices;
		var samplings                      = dev.playback.samplings;
		D0.samplerate                      = Object.values( samplings );
		D.main[ 0 ][ 2 ].kv                = samplings;
		D0.list.capture_samplerate[ 2 ].kv = samplings;
		D0.list.formatC[ 2 ].kv            = dev.capture.formats;
		D0.list.formatP[ 2 ].kv            = dev.playback.formats;
		D0.list.deviceC[ 2 ]               = dev.capture.device;
		D0.list.deviceP[ 2 ]               = dev.playback.device;
		D0.list.channelsC[ 2 ].updn.max    = dev.capture.channels;
		D0.list.channelsP[ 2 ].updn.max    = dev.playback.channels;
		D0.list.filename[ 2 ].kv           = S.ls.raw;
		if ( S.ls.coeffs ) F.Conv.Raw[ 3 ].push( S.ls.coeffs );
		if ( S.ls.coeffswav ) F.Conv.Wav[ 3 ].push( S.ls.coeffswav );
	}
}
var RENDER    = {
	  status      : () => { // onload only
		headIcon();
		if ( S.volume !== false ) {
			$( '#divvolume' ).removeClass( 'hide' );
			$( '#divvolume .control' ).text( S.control );
			RENDER.volume();
		} else {
			$( '#divvolume' ).addClass( 'hide' );
		}
		$( '.rateadjust' ).toggleClass( 'hide', ! DEV.enable_rate_adjust );
		if ( S.bluetooth ) {
			if ( ! $( '#divconfiguration .col-l i' ).length ) $( '#divconfiguration a' ).after( ICON( 'bluetooth' ) );
		} else {
			$( '#divconfiguration .col-l i' ).remove();
		}
		$( '#configuration' )
			.html( COMMON.htmlOption( S.ls.configs ) )
			.val( S.configname );
		if ( $( '#vu .bar' ).length ) {
			RENDER.vuBarToggle();
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
		RENDER.vuBarToggle();
	}
	, statusStop  : () => {
		if ( ! ( 'intervalvu' in V ) ) return
		
		V.signal = false;
		clearInterval( V.intervalvu );
		delete V.intervalvu;
		RENDER.vuBarToggle();
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
			RENDER[ V.tab +'Sub' ]( val );
		} else {
			RENDER[ V.tab ]();
		}
	}
	, volume      : () => {
		RENDER.volumeThumb();
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
		var data     = RENDER.dataSort();
		if ( ! data ) return

		var li       = '';
		$.each( data, ( k, v ) => li += RENDER.filter( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		RENDER.toggle();
	}
	, filter      : ( k, v ) => {
		var param    = v.parameters;
		var eq       = [ 'FivePointPeq', 'GraphicEqualizer' ].includes( param.type );
		var cl_eq    = '';
		var scale    = false;
		var icon     = ICON( 'filters liicon graph edit' );
		var icongain = '';
		var disabled = '';
		if ( v.type === 'Gain' ) {
			var scale = param.scale === 'linear' ? 100 : 10;
			icongain  = ICON( param.mute ? 'volume mute' : 'volume' )
					  + ICON( param.inverted ? 'inverted bl' : 'inverted' )
					  + ICON( param.scale === 'linear' ? 'linear bl' : 'linear' );
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
					+ RENDER.htmlRange( scale, gain, disabled )
					+ icongain
					+'</div>';
		} else {
			if ( eq ) {
				icon += ICON( 'mixers' );
				cl_eq = ' class="eq"';
				var paramdata = param.type;
			} else {
				var paramdata = RENDER.json2string( param );
			}
			var li        = '<div class="li1">'+ k +'</div>'
						   +'<div class="li2">'+ v.type +' · '+ paramdata +'</div>';
		}
		var $graph   = $( '#filters li[data-name="'+ k +'"] .divgraph' );
		var graph    = $graph.length ? $graph[ 0 ].outerHTML : '';
		return '<li data-name="'+ k +'"'+ cl_eq +'>'+ icon + li + graph +'</li>'
	}
	, filtersSub  : k => {
		var li    = '<li class="lihead main files">'+ ICON( 'folderfilter' ) +'&ensp;Finite Impulse Response'+ ICON( 'add' ) + ICON( 'back' ) +'</li>';
		var files = S.ls.coeffs ? [ ...S.ls.coeffs ] : [];
		if ( S.ls.coeffswav ) files.push( ...S.ls.coeffswav );
		if ( files.length ) files.forEach( k => li += '<li data-name="'+ k +'">'+ ICON( 'file liicon' ) + k +'</li>' );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		RENDER.toggle( 'sub' );
	} //-----------------------------------------------------------------------------------
	, mixers      : () => {
		var data = RENDER.dataSort();
		if ( ! data ) return
		
		var li   = '';
		$.each( data, ( k, v ) => li += RENDER.mixer( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		RENDER.toggle();
	}
	, mixer       : ( k, v ) => {
		return '<li data-name="'+ k +'">'+ ICON( 'mixers liicon edit' )
			  +'<div class="li1">'+ k +'</div>'
			  +'<div class="li2">'+ RENDER.mixerMap( v.mapping ) +'</div>'
			  +'</li>'
	}
	, mixersSub   : name => {
		var iconadd = max => ICON( max ? 'add disabled' : 'add' );
		var data    = MIX[ name ].mapping;
		var chin    = DEV.capture.channels;
		var chout   = DEV.playback.channels;
		var li      = '<li class="lihead" data-name="'+ name +'">'+ ICON( 'mixers subicon' ) +'&nbsp;<a>'+ name +'</a>'
					 + iconadd( chout === data.length ) + ICON( 'back' )
					 +'</li>';
		data.forEach( ( kv, i ) => {
			var dest   = kv.dest;
			var i_name = ' data-index="'+ i +'" data-name="'+ name +'"';
			li        += '<li class="liinput main dest'+ i +'"'+ i_name +' data-dest="'+ dest +'">'+ ICON( 'output liicon' )
						+'<div>Out: '+ dest +'</div>'
						+ ICON( kv.mute ? 'volume mute' : 'volume' ) + iconadd( chout === kv.sources.length )
						+'</li>';
			kv.sources.forEach( ( s, si ) => {
				var sources  = data[ i ].sources[ si ];
				var ch       = sources.channel;
				var gain     = sources.gain || 0;
				var disabled = sources.mute ? ' disabled' : '';
				var linear   = sources.scale === 'linear';
				li += '<li class="liinput dest'+ i +'"'+ i_name +'" data-si="'+ si +'" data-source="'+ ch +'">'
					 + ICON( 'input liicon' ) +'In: '+ ch +'&emsp;'
					 + RENDER.htmlRange( linear ? 100 : 10, gain, disabled )
					 + ICON( sources.mute ? 'volume mute' : 'volume' )
					 + ICON( sources.inverted ? 'inverted bl' : 'inverted' )
					 + ICON( linear ? 'linear bl' : 'linear' )
					 +'</li>';
			} );
		} );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		RENDER.toggle( 'sub' );
		COMMON.select.set( $( '#mixers select' ) );
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
		var data = RENDER.dataSort();
		if ( ! data ) return
		
		var li   = '';
		$.each( data, ( k, v ) => {
			var param = COMMON.json.clone( v.parameters );
			[ 'channels', 'monitor_channels', 'process_channels' ].forEach( k => delete param[ k ] );
			li += '<li data-name="'+ k +'">'+ ICON( 'processors liicon edit' )
				 +'<div class="li1">'+ k +'</div>'
				 +'<div class="li2">'+ v.type +' · '+ RENDER.json2string( param )+'</div>'
				 +'</li>'
		} );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		RENDER.toggle();
	} //-----------------------------------------------------------------------------------
	, pipeline    : () => {
		var nopip = ! PIP || ! PIP.length;
		$( '.i-flowchart' ).toggleClass( 'disabled', nopip );
		if ( nopip ) return
		
		var li = '';
		PIP.forEach( ( el, i ) => li += RENDER.pipe( el, i ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		RENDER.toggle();
		GRAPH.flowchart.refresh();
		$MENU.addClass( 'hide' );
	}
	, pipe        : ( el, i ) => {
		var icon     = ( el.bypassed ? 'bypass' : 'pipeline' ) +' liicon';
		var graph    = '';
		if ( el.type === 'Filter' ) {
			icon      += ' graph';
			icon      += FIL[ el.names[ 0 ] ].type === 'Conv' ? '' : ' edit';
			var icon_s = 'filters'
			var li1    = el.names.join( ' <gr>•</gr> ' );
			var li2    = '';
			el.channels.forEach( c => li2 += '<cc>'+ c +'</cc> ' );
			var $graph = $( '#pipeline li[data-index="'+ i +'"] .divgraph' );
			graph      = $graph.length ? $graph[ 0 ].outerHTML : '';
		} else {
			var icon_s = 'mixers'
			var li1    = el.name;
			var li2    = RENDER.mixerMap( MIX[ el.name ].mapping );
		}
		var li = '<li data-type="'+ el.type +'" data-index="'+ i +'" draggable="true">'+ ICON( icon ) + ICON( icon_s )
				+'<div class="li1">'+ li1 +'</div>'
				+'<div class="li2">'+ li2 +'</div>'
				+ graph
				+'</li>';
		return li
	} //-----------------------------------------------------------------------------------
	, devices     : () => {
		var li  = '';
		[ 'playback', 'capture' ].forEach( d => {
			var dev = DEV[ d ];
			var data = COMMON.json.clone( dev );
			var device = dev.device;
			if ( d === 'playback' ) device += ' - '+ S.cardname.replace( / *-* A2DP/, '' );
			[ 'device', 'type' ].forEach( k => delete data[ k ] );
			li += '<li data-type="'+ d +'">'+ ICON( d === 'capture' ? 'input' : 'output' )
				 +'<div class="li1">'+ UTIL.key2label( d ) +' <gr>·</gr> '+ RENDER.typeReplace( dev.type )
				 + ( 'device' in dev ? ' <gr>·</gr> '+ device +'</div>' : '' )
				 +'<div class="li2">'+ RENDER.json2string( data ) +'</div>'
				 +'</li>';
		} );
		$( '#devices .entries.main' ).html( li );
		var labels = '';
		var values = '';
		D0.main.forEach( k => {
			if ( k in DEV ) {
				labels += UTIL.key2label( k ) +'<br>';
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
				labels += UTIL.key2label( k ) +'<br>';
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
		if ( LIST.equal( 'camilla' ) ) return
		
		var li = '';
		S.ls.configs.forEach( f => {
			var current = f === S.configname ? '<grn>•</grn>&ensp;' : '';
			var $pre = $( '#config li[data-id="'+ f +'"] pre' );
			var pre  = $pre.length ? $pre[ 0 ].outerHTML + ICON( 'close infoclose' ) : '';
			li += '<li data-id="'+ f +'">'+ ICON( 'file liicon' ) + current +'<a class="name">'+ f +'</a>'+ pre +'</li>';
		} );
		LIST.render( 'camilla', li );
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
		$MENU.addClass( 'hide' );
		GRAPH.refresh();
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
var SETTING   = {
	  filter        : ( type, subtype, name, edit ) => {
		if ( edit ) {
			var values = { name: name, type: type }
			var list   = F[ type ];
			var kv     = F.values[ type ]; // keep order - list : values
			if ( subtype ) {
				values.subtype = subtype;
				list           = list[ subtype ];
				kv             = kv[ subtype ];
			}
			var param  = FIL[ name ].parameters;
			$.each( kv, ( k, v ) => {
				if ( ! ( k in values ) ) { // exclude: name, type, subtype
					var val = param[ k ];
					if ( k === 'filename' ) val = val.split( '/' ).pop();
					values[ k ] = val;
				}
			} );
			if ( subtype === 'GraphicEqualizer' ) values.bands = param.gains.length;
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
		INFO( {
			  icon         : V.tab
			, title        : title
			, list         : list
			, boxwidth     : 198
			, values       : values
			, checkblank   : true
			, checkchanged : edit
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).css( 'min-width', '80px' );
				if ( subtype === 'FivePointPeq' ) {
					$( '#infoList tr' ).each( ( i, tr ) => {
						var $td = $( tr ).find( 'td' );
						if ( i < 4 ) {
							if ( i < 3 ) {
								$td.eq( 1 ).prop( 'colspan', 3 );
							} else {
								$td.css( 'text-align', 'center' );
							}
						} else {
							$td.each( ( j, t ) => {
								if ( j === 0 ) return
								
								var w = j === 1 ? '85px' : '50px';
								$( t ).css( { 'min-width': w, width: w } );
								$( t ).find( 'input' ).css( { width: w, 'text-align': 'right' } );
							} );
						}
					} );
				}
				var $select = $( '#infoList select' );
				$select.eq( 0 ).on( 'input', function() {
					var val = _INFO.val();
					SETTING.filter( val.type, '', val.name );
				} );
				$select.eq( 1 ).on( 'input', function() {
					var val = _INFO.val();
					if ( val.type === 'Conv' ) {
						if ( ( val.subtype === 'Raw' && ! S.ls.coeffs ) || ( val.subtype === 'Wav' && ! S.ls.coeffswav ) ) {
							INFO( {
								  icon    : V.tab
								, title   : title
								, message : 'Filter files not available.'
								, ok      : () => SETTING.filter( 'Conv', '', val.name )
							} );
							return
						}
					}
					SETTING.filter( val.type, val.subtype, val.name );
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
				var val        = _INFO.val();
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
					$.each( F0.FivePointPeq, ( k, v ) => {
						val[ k ].forEach( ( p, i ) => {
							val[ v[ i ] ] = p;
							delete val[ k ];
						} );
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
				if ( 'filename' in param ) param.filename = '/srv/http/data/camilladsp/coeffs/'+ param.filename;
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
				SETTING.save( title, name ? 'Change ...' : 'Save ...' );
				RENDER.filters();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, mixer         : name => {
		var title = name ? 'Mixer' : 'Add Mixer'
		INFO( {
			  icon         : V.tab
			, title        : title
			, message      : name ? 'Rename <wh>'+ name +'</wh>' : ''
			, list         : [ 'To', 'text' ]
			, values       : name
			, checkblank   : true
			, checkchanged : name
			, ok           : () => {
				var newname = _INFO.val();
				if ( newname in MIX ) {
					INFO( {
						  icon    : V.tab
						, title   : title
						, message : 'Mixer: <wh>'+ newname +'</wh> already exists.'
						, ok      : () => SETTING.mixer( newname )
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
				SETTING.save( title, name ? 'Change ...' : 'Save ...' );
				RENDER.mixers();
			}
		} );
	}
	, mixerMap      : ( name, index ) => {
		var $li     = $( 'li.active' );
		var mapping = MIX[ $li.data( 'name' ) ].mapping;
		if ( index === 'dest' ) {
			var title = 'Add Destination / Out';
			INFO( {
				  icon       : V.tab
				, title      : title
				, message    : 'Channel:'
				, list       : [ '', 'radio', [ ...Array( DEV.playback.channels ).keys() ] ]
				, beforeshow : () => {
					if ( mapping.length ) {
						var ch    = [];
						mapping.forEach( m => ch.push( m.dest ) );
						SETTING.mixerMapCheck( ch, 'playback' );
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
						  dest    : _INFO.val()
						, mute    : false
						, sources : sources
					}
					MIX[ name ].mapping.push( mapping );
					MIX[ name ].mapping.sort( ( a, b ) => a.dest - b.dest );
					SETTING.save( title, 'Save ...' );
					RENDER.mixersSub( name );
				}
			} );
		} else {
			var title = 'Add Source / In';
			INFO( {
				  icon       : V.tab
				, title      : title
				, message    : 'Channel:'
				, list       : [ '', 'radio', [ ...Array( DEV.capture.channels ).keys() ] ]
				, beforeshow : () => {
					mapping.forEach( m => {
						if ( ! m.sources.length || m.dest !== $li.data( 'dest' ) ) return
						
						var ch    = [];
						m.sources.forEach( s => ch.push( s.channel ) );
						SETTING.mixerMapCheck( ch, 'capture' );
					} );
				}
				, ok         : () => {
					var source = {
						  channel  : _INFO.val()
						, gain     : 0
						, inverted : false
						, mute     : false
					}
					MIX[ name ].mapping[ index ].sources.push( source );
					MIX[ name ].mapping[ index ].sources.sort( ( a, b ) => a.channel - b.channel );
					SETTING.save( title, 'Save ...' );
					RENDER.mixersSub( name );
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
	, processor     : ( name, edit ) => {
		if ( edit ) {
			var values = {}
			var param  = PRO[ name ].parameters;
			$.each( P.values.Compressor, ( k, v ) => { values[ k ] = param[ k ] } );
		} else {
			var values = P.values.Compressor;
			if ( name ) values.name = name;
		}
		var title = edit ? 'Processor' : 'Add Processor'
		INFO( {
			  icon         : V.tab
			, title        : title
			, list         : edit ? P[ PRO[ name ].type ] : P.Compressor
			, boxwidth     : 150
			, values       : values
			, checkblank   : true
			, checkchanged : edit
			, ok           : () => {
				var val        = _INFO.val();
				var typenew    = val.type;
				var namenew    = val.name;
				[ 'name', 'type' ].forEach( k => delete val[ k ] );
				PRO[ namenew ] = { type: typenew, parameters: val }
				if ( edit && name !== namenew ) delete PRO[ name ];
				SETTING.save( title, edit ? 'Change ...' : 'Save ...' );
				RENDER.processors();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, pipeline      : ( index, edit ) => {
		if ( ! SETTING.pipelineNone( 'filters' ) ) return
		
		var channels = '';
		[ ...Array( DEV.playback.channels ).keys() ].forEach( c => {
			channels += '<label><input type="checkbox" value="'+ c +'">'+ c +'</label>&emsp;';
		} );
		if ( edit ) {
			var filters  = [];
			$.each( FIL, ( k, v ) => {
				if ( v.type !== 'Conv' ) filters.push( k );
			} );
		} else {
			var filters  = Object.keys( FIL );
		}
		var list     = [ [ ICON( 'output gr' ), 'html', channels ] ];
		var select   = [ ICON( 'filters gr' ),  'select', { kv: filters, suffix: ICON( 'remove' ) } ];
		if ( edit ) {
			var data = COMMON.json.clone( PIP[ index ] );
			var nL   = edit ? data.names.length : 1;
			for ( var i = 0; i < nL; i++ ) list.push( select );
		} else {
			list.push( select );
		}
		INFO( {
			  icon         : V.tab
			, title        : edit ? 'Pipeline Filter' : 'Add Pipeline'
			, tablabel     : edit ? '' : [ ICON( 'filters' ) +' Filter', ICON( 'mixers' ) +' Mixer' ]
			, tab          : edit ? '' : [ '', SETTING.pipelineMixer ]
			, list         : list
			, values       : edit ? [ ...data.channels, ...data.names ] : ''
			, beforeshow   : () => {
				$( '#infoList td' ).eq( 0 ).css( 'width', '40px' );
				$( '#infoList tr' ).eq( 0 ).append( '<td>'+ ICON( 'add' ) +'</td>' );
				if ( edit ) {
					$( '#infoOk' ).addClass( 'disabled' );
				} else {
					$( '#infoList input' ).prop( 'checked', true );
				}
				var setChanged = () => {
					if ( edit ) {
						$input = $( '#infoList' ).find( 'input, select' );
						$( '#infoOk' ).toggleClass( 'disabled', I.values.join( '' ) === _INFO.val().join( '' ) );
					}
					setDisabled();
				}
				var setDisabled = () => {
					var $remove = $( '#infoList .i-remove' );
					$remove.toggleClass( 'disabled', $remove.length === 1 );
					$( '#infoList input:checked' ).prop( 'disabled', $( 'input:checked' ).length === 1 );
					$( '#infoList .i-add' ).toggleClass( 'disabled', FIL[ $( '#infoList select' ).val() ].type === 'Conv' );
				}
				setDisabled();
				var select    = '<select>'+ COMMON.htmlOption( filters ) +'</select';
				$( '#infoList' ).on( 'input', function() {
					setChanged();
				} ).on( 'click', '.i-add', function() {
					var $trlast = $( '#infoList tr' ).last();
					$( '#infoList table' ).append( $trlast.clone() );
					var $trnew  = $( '#infoList tr' ).last();
					$trnew.find( 'td' ).eq( 1 ).html( select );
					COMMON.select.set( $trnew.find( 'select' ) );
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
				SETTING.pipelineSave();
			}
		} );
	}
	, pipelineMixer : index => {
		if ( ! SETTING.pipelineNone( 'mixers' ) ) return
		
		var edit = index !== undefined;
		INFO( {
			  icon         : V.tab
			, title        : edit ? 'Pipeline Mixer' : 'Add Pipeline'
			, tablabel     : edit ? '' : [ ICON( 'filters' ) +' Filter', ICON( 'mixers' ) +' Mixer' ]
			, tab          : edit ? '' : [ SETTING.pipeline, '' ]
			, list         : [ 'Mixers', 'select', Object.keys( MIX ) ]
			, values       : edit ? PIP[ index ].name : ''
			, checkchanged : edit
			, ok           : () => {
				data = {
					  type : 'Mixer'
					, name : _INFO.val()
				}
				edit ? PIP[ index ] = data : PIP.push( data );
				SETTING.pipelineSave();
			}
		} );
	}
	, pipelineNone  : type => {
		if ( Object.keys( S.config[ type ] ).length ) return true
		
		INFO( {
			  icon    : V.tab
			, title   : 'Add Pipeline'
			, message : 'No '+ type +' found.'
			, ok      : type === 'filters' ? SETTING.pipelineMixer : SETTING.pipeline
		} );
		return false
	}
	, pipelineSave  : () => {
		SETTING.save( 'Add Pipeline', 'Save ...' );
		RENDER.pipeline();
	}
	, pipelineTr    : () => {
		
	} //-----------------------------------------------------------------------------------
	, device        : ( dev, type ) => {
		var type        = type || 'Alsa';
		var vtype       = type === 'File' && dev === 'playback' ? 'FileP' : type;
		var values      = DEV[ dev ][ type ] === type ? DEV[ dev ][ type ] : COMMON.json.clone( D.values[ vtype ] );
		values.type     = type;
		values.channels = DEV[ dev ].channels;
		if ( DEV[ dev ].type === type ) $.each( values, ( k, v ) => { values[ k ] = DEV[ dev ][ k ] } );
		var title       = UTIL.key2label( dev );
		INFO( {
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
						SETTING.device( dev, typenew );
					} else {
						INFO( {
							  icon    : V.tab
							, title   : title
							, message : 'No <c>'+ typenew +'</c> available.'
							, ok      : () => SETTING.device( dev, type )
						} );
					}
				} );
			}
			, ok           : () => {
				DEV[ dev ] = _INFO.val();
				SETTING.save( title, 'Change ...' );
			}
		} );
	}
	, main          : () => {
		var values   = {};
		D0.main.forEach( k => {
			values[ k ] = DEV[ k ];
		} );
		var title    = UTIL.tabTitle();
		INFO( {
			  icon         : V.tab
			, title        : title
			, list         : D.main
			, boxwidth     : 120
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, ok           : () => {
				var val = _INFO.val();
				$.each( val, ( k, v ) => { DEV[ k ] = v } );
				SETTING.save( title, 'Change ...' );
				RENDER.devices();
			}
		} );
	} //-----------------------------------------------------------------------------------
	, resampler     : ( type, profile ) => {
		var list    = D.resampler[ type ];
		var values  = D.resampler.values[ type ];
		var current = DEV.resampler && DEV.resampler.type === values.type;
		if ( profile ) values.profile = profile;
		if ( current ) $.each( DEV.resampler, ( k, v ) => { values[ k ] = v } );
		INFO( {
			  ...SW
			, list         : list
			, boxwidth     : 160
			, values       : values
			, checkblank   : true
			, checkchanged : current
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).css( 'min-width', '100px' );
				$( 'select' ).eq( 0 ).on( 'input', function() {
					SETTING.resampler( $( this ).val() );
				} );
				if ( values.type === 'AsyncSinc' ) {
					$( 'select' ).eq( 1 ).on( 'input', function() {
						var profile = $( this ).val();
						if ( type === 'Custom' ) {
							SETTING.resampler( 'AsyncSinc', profile );
						} else {
							if ( profile === 'Custom' ) SETTING.resampler( 'Custom' );
						}
					} );
				}
			}
			, cancel       : SWITCH.cancel
			, ok           : () => {
				var val        = _INFO.val();
				if ( val.type === 'Synchronous' && DEV.enable_rate_adjust ) DEV.enable_rate_adjust = false;
				DEV.resampler = val;
				SETTING.save( SW.title, 'Change ...' );
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
			SETTING.rangeSet();
		} else if ( type === 'press' ) {
			V.intervalgain = setInterval( () => {
				R.up ? R.val++ : R.val--;
				SETTING.rangeSet();
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
			SETTING.rangeSet();
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
		SETTING.save();
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
			WSCAMILLA.send( '{ "SetConfigJson": "'+ config +'" }' );
			GRAPH.refresh();
			V.debounce = setTimeout( () => {
				LOCAL();
				SETTING.statusPush();
				BASH( [ 'saveconfig' ] );
			}, 1000 );
		}, WSCAMILLA ? 0 : 300 );
		if ( titlle ) BANNER( V.tab, titlle, msg );
		if ( V.tab === 'devices' ) RENDER.devices();
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
		WS.send( JSON.stringify( status ) );
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
		INFO( {
			  icon    : V.tab
			, title   : title
			, message : message
			, file    : { oklabel: ICON( 'file' ) +'Upload', type: dir === 'coeffs' ? '.dbl,.pcm,.raw,.wav' : '.yml' }
			, cancel  : UTIL.webSocket
			, ok      : () => {
				NOTIFY( V.tab, title, 'Upload ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'camilla' );
				formdata.append( 'dir', dir );
				formdata.append( 'file', I.infofile );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( message => {
						if ( message ) {
							BANNER_HIDE();
							_INFO.warning(  V.tab,  title, message );
						}
					} );
			}
		} );
	}
}
var UTIL    = {
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
			INFO( {
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
		
		var capitalized = array.map( el => UTIL.key2label( el ) );
		return capitalized
	}
	, tabTitle      : () => COMMON.capitalize( V.tab )
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
					RENDER.volume();
				}
			}
		);
	}
	, webSocket     : () => {
		if ( WSCAMILLA && WSCAMILLA.readyState < 2 ) return
		
		WSCAMILLA           = new WebSocket( 'ws://'+ location.host +':1234' );
		WSCAMILLA.onopen    = () => {
			var interval = setTimeout( () => {
				if ( WSCAMILLA && WSCAMILLA.readyState === 1 ) { // 0=created, 1=ready, 2=closing, 3=closed
					clearTimeout( interval );
					UTIL.wsGetState();
					UTIL.wsGetConfig();
					V.intervalstatus = setInterval( () => {
						if ( V.local ) return
						
						UTIL.wsGetState();
						if ( DEV.enable_rate_adjust ) WSCAMILLA.send( '"GetRateAdjust"' );
					}, 1000 );
				}
			}, 100 );
		}
		WSCAMILLA.onclose   = () => {
			WSCAMILLA = null;
			[ 'intervalstatus', 'intervalvu' ].forEach( k => clearInterval( V[ k ] ) );
			RENDER.statusStop();
		}
		WSCAMILLA.onmessage = response => {
			var data  = JSON.parse( response.data );
			var cmd   = Object.keys( data )[ 0 ];
			var value = data[ cmd ].value;
			var cp, p, v;
			switch ( cmd ) {
				case 'GetSignalLevels':
					if ( S.state !== 'play' ) {
						RENDER.statusStop();
						return
					}
					
					[ 'playback_peak', 'playback_rms', 'capture_peak', 'capture_rms' ].forEach( k => {
						cp = k[ 0 ];
						value[ k ].forEach( ( db, i ) => {
							if ( S.volumemute && cp === 'p' ) db = -99;
							RENDER.vuLevel( k.slice( -1 ) === 's', cp + i, db );
						} );
					} );
					break;
				case 'GetBufferLevel':
				case 'GetCaptureRate':
				case 'GetProcessingLoad':
				case 'GetRateAdjust':
					if ( S.state !== 'play' ) {
						RENDER.statusStop();
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
						if ( S.state !== 'play' ) RENDER.statusStop();
					} else {
						if ( ! V.signal ) { // restore after 1st set
							V.signal = true;
							RENDER.vuBarToggle();
						}
						V.intervalvu = setInterval( () => WSCAMILLA.send( '"GetSignalLevels"' ), 100 );
					}
					break;
				case 'GetConfigJson':
					S.config = JSON.parse( value );
					CONFIG.valuesAssign();
					RENDER.status();
					RENDER.tab();
					CONTENT();
					WSCAMILLA.send( '"GetSupportedDeviceTypes"' );
					if ( V.confswitch ) {
						delete V.confswitch;
						$( '.divgraph' ).remove();
						SETTING.statusPush();
					}
					break;
				case 'GetSupportedDeviceTypes':
					var type = {};
					[ 'playback', 'capture' ].forEach( ( k, i ) => {
						type[ k ] = {};
						value[ i ].forEach( t => {
							v = RENDER.typeReplace( t );
							type[ k ][ v ] = t; // [ 'Alsa', 'Bluez' 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
						} );
					} );
					D0.list.typeC[ 2 ] = type.capture;
					D0.list.typeP[ 2 ] = type.playback;
					break;
				case 'Invalid':
					INFO( {
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
			WSCAMILLA.send( '"GetConfigJson"' );
		}, WSCAMILLA.readyState === 1 ? 0 : 300 ); 
	}
	, wsGetState    : () => {
		var getstate = [ 'GetState', 'GetCaptureRate', 'GetClippedSamples', 'GetProcessingLoad' ];
		if ( S.config && DEV.enable_rate_adjust ) getstate.push( 'GetBufferLevel', 'GetRateAdjust' );
		getstate.forEach( k => WSCAMILLA.send( '"'+ k +'"' ) );
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
	VOLUME.max();
	RENDER.volume();
	VOLUME.set();
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.volume ) return
	
	if ( V.drag ) {
		VOLUME.push();
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
		VOLUME.max();
		$( '#divvolume .level' ).text( S.volume );
		UTIL.volumeAnimate( S.volume, current );
		VOLUME.set();
	}
	V.volume = V.drag = false;
} ).on( 'mouseleave', function() {
	V.volume = V.drag = false;
} );
$( '#volume-0, #volume-100' ).on( 'click', function() {
	var current = S.volume;
	S.volume    = this.id === 'volume-0' ? 0 : 100;
	VOLUME.max();
	$( '#divvolume .level' ).text( S.volume );
	UTIL.volumeAnimate( S.volume, current );
	VOLUME.set();
} );
$( '#divvolume' ).on( 'click', '.col-l i, .i-plus', function() {
	var up = $( this ).hasClass( 'i-plus' );
	if ( ( ! up && S.volume === 0 ) || ( up && S.volume === 100 ) ) return
	
	up ? S.volume++ : S.volume--;
	VOLUME.max();
	RENDER.volume();
	VOLUME.set();
} ).on( 'click', '.col-r .i-volume, .level', function() {
	UTIL.volumeAnimate( S.volumemute, S.volume );
	VOLUME.toggle();
	$( '#out .peak' ).css( 'transition-duration', '0s' );
	setTimeout( () => $( '#out .peak' ).css( 'transition-duration', '' ), 100 );

} ).press( {
	  delegate : '.col-l i, .i-plus'
	, action   : e => {
		var up           = $( e.target ).hasClass( 'i-plus' );
		V.intervalvolume = setInterval( () => {
			up ? S.volume++ : S.volume--;
			VOLUME.max();
			VOLUME.set();
			RENDER.volumeThumb();
			$( '#divvolume .level' ).text( S.volume );
			if ( S.volume === 0 || S.volume === 100 ) clearInterval( V.intervalvolume );
		}, 100 );
	}
	, end     : () => {
		clearInterval( V.intervalvolume );
		VOLUME.push();
	}
} );
// common ---------------------------------------------------------------------------------
$( '.entries' ).on( 'click', '.i-minus, .i-plus, .db', function() { // filters, mixersSub
	SETTING.rangeGet( $( this ), 'click' );
} ).press( {
	  delegate : '.i-minus, .i-plus'
	, action   :  e => SETTING.rangeGet( $( e.currentTarget ), 'press' )
	, end      : () => clearInterval( V.intervalgain ) // on end
} );
$( '#divstate' ).on( 'click', '.clipped', function() {
	LOCAL( 2000 );
	$( '.divclipped' ).addClass( 'hide' );
	WSCAMILLA.send( '"ResetClippedSamples"' );
} );
$( '#configuration' ).on( 'input', function() {
	if ( V.local ) return
	
	var name = $( this ).val();
	var path = '/srv/http/data/camilladsp/configs'+ ( S.bluetooth ? '-bt/' : '/' ) + name;
	BASH( [ 'confswitch', path, 'CMD CONFIG' ], () => {
		V.confswitch = true;
		WSCAMILLA.send( '{ "SetConfigFilePath": "'+ path +'" }' );
		WSCAMILLA.send( '"Reload"' );
		S.configname = name;
		setTimeout( () => UTIL.wsGetConfig(), 300 );
	} );
	NOTIFY( 'camilladsp', 'Configuration', 'Switch ...' );
} );
$( '.tab .headtitle' ).on( 'click', function() {
	if ( $( '#'+ V.tab +' .entries.main' ).hasClass( 'hide' ) ) $( '#'+ V.tab +' .i-back' ).trigger( 'click' );
} );
$( 'heading' ).on( 'click', '.i-folderfilter', function() {
	RENDER.filtersSub();
} ).on( 'click', '.i-add', function() {
	if ( V.tab === 'filters' ) {
		SETTING.filter( 'Biquad' );
	} else if ( V.tab === 'config' ) {
		SETTING.upload();
	} else {
		SETTING[ V.tab.replace( /s$/, '' ) ]();
	}
} ).on( 'click', '.i-flowchart', function() {
	var $flowchart = $( '#pipeline canvas' );
	$flowchart.length ? $flowchart.remove() : GRAPH.flowchart.plot();
} );
$( '.entries' ).on( 'click', '.liicon', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	var $li   = $this.parent();
	if ( MENU.isActive( $li, e ) ) return
	
	$( '#'+ V.tab +' li' ).removeClass( 'active' );
	$li.addClass( 'active' );
	$MENU.find( '.copy, .rename, .info' ).toggleClass( 'hide', V.tab !== 'config' );
	[ 'edit', 'graph' ].forEach( k => $( '#menu .'+ k ).toggleClass( 'hide', ! $this.hasClass( k ) ) )
	$( '#menu .delete' ).toggleClass( 'gr', V.tab === 'config' && S.ls.configs.length === 1 );
	if ( V.tab === 'mixers' && $( '#mixers .entries.sub' ).hasClass( 'hide' ) ) {
		$MENU.find( '.edit, .rename' ).toggleClass( 'hide' );
	}
	if ( V.tab === 'pipeline' ) {
		var bypassed = PIP[ $li.index() ].bypassed === true;
		$( '#menu .bypass' ).toggleClass( 'hide', bypassed );
		$( '#menu .restore' ).toggleClass( 'hide', ! bypassed );
		$( '#menu .edit' ).toggleClass( 'disabled', $li.data( 'type' ) === 'Mixer' && Object.keys( MIX ).length < 2 );
	} else {
		$MENU.find( '.bypass, .restore' ).addClass( 'hide' );
	}
	MENU.show( $li );
} ).on( 'click', '.i-back', function() {
	if ( V.tab === 'mixers' ) {
		var name = $( '#mixers .lihead a' ).text();
		if ( ! MIX[ name ].mapping.length ) { // no mapping left
			delete MIX[ name ];
			SETTING.save( 'Mixer', 'Remove ...' );
		}
	}
	$( '#'+ V.tab +' .entries' ).toggleClass( 'hide' );
	RENDER[ V.tab ]();
} ).on( 'click', '.graphclose', function() {
	var $this = $( this );
	$this.parents( 'li' ).removeClass( 'graph' );
	$this.parent().remove();
} );
$( '#menu a' ).on( 'click', function( e ) {
	var cmd = MENU.command( $( this ), e );
	if ( ! cmd ) return
	
	var $li = $( 'li.active' );
	if ( cmd === 'graph' ) {
		var $divgraph = $li.find( '.divgraph' );
		if ( $divgraph.length ) {
			$li.removeClass( 'graph' );
			$divgraph.remove();
		} else {
			GRAPH[ V.tab ].plot( $li );
		}
		return
	}
	
	switch ( V.tab ) {
		case 'filters':
			var title = file ? 'Filter File' : 'Filter';
			var name  = $li.data( 'name' );
			var file  = $li.find( '.i-file' ).length;
			switch ( cmd ) {
				case 'edit':
					if ( file ) {
						INFO( {
							  icon         : V.tab
							, title        : title
							, message      : 'Rename <wh>'+ name +'</wh>'
							, list         : [ 'To', 'text' ]
							, values       : name
							, checkblank   : true
							, checkchanged : true
							, ok           : () => { // in filters Conv
								var newname    = _INFO.val();
								BASH( [ 'coefrename', name, newname, 'CMD NAME NEWNAME' ] );
								$.each( FIL, ( k, v ) => {
									if ( v.type === 'Conv' && v.parameters.filename === name ) FIL[ name ].parameters.filename = newname;
								} );
								SETTING.save( title, 'Rename ...' );
							}
						} );
					} else {
						var type    = FIL[ name ].type;
						var subtype = 'type' in FIL[ name ].parameters ? FIL[ name ].parameters.type : '';
						SETTING.filter( type, subtype, name, 'edit' );
					}
					break;
				case 'delete':
					if ( UTIL.inUse( name ) ) return
					INFO( {
						  icon    : V.tab
						, title   : title
						, message : '<wh>'+ name +'</wh> ?'
						, oklabel : ICON( 'remove' ) +'Delete'
						, okcolor : CLR.red
						, ok      : () => {
							file ? BASH( [ 'coefdelete', name, 'CMD NAME' ] ) : delete FIL[ name ];
							SETTING.save( title, 'Delete ...' );
							$li.remove();
						}
					} );
					break;
			}
			break;
		case 'mixers':
			var name  = $li.data( 'name' );
			var main  = $( '#mixers .entries.sub' ).hasClass( 'hide' );
			switch ( cmd ) {
				case 'delete':
					var dest = $li.hasClass( 'liinput main' );
					var mi   = $li.data( 'index' );
					if ( main ) {
						if ( UTIL.inUse( name ) ) return
						
						var title = 'Mixer';
						var msg   = name;
					} else if ( dest ) {
						var title = 'Output';
						var msg   = ICON( 'output gr' ) +' Out: '+ $li.data( 'dest' );
					} else {
						var title = 'Input';
						var msg   = ICON( 'input gr' ) +' In: '+ $li.data( 'source' );
					}
					var message = '<wh>'+ msg +'</wh> ?';
					INFO( {
						  icon    : V.tab
						, title   : title
						, message : message
						, oklabel : ICON( 'remove' ) +'Delete'
						, okcolor : CLR.red
						, ok      : () => {
							if ( main ) {
								delete MIX[ name ];
							} else if ( dest ) {
								MIX[ name ].mapping.splice( mi, 1 );
							} else {
								MIX[ name ].mapping[ mi ].sources.splice( $li.data( 'si' ), 1 );
							}
							SETTING.save( title, 'Remove ...' );
							main ? RENDER.mixers( name ) : RENDER.mixersSub( name );
						}
					} );
					break;
				case 'rename':
					SETTING.mixer( name );
					break;
			}
			break;
		case 'processors':
			var title = 'Processors';
			var name  = $li.data( 'name' );
			switch ( cmd ) {
				case 'edit':
					SETTING.processor( name, 'edit' );
					break;
				case 'delete':
					INFO( {
						  icon    : V.tab
						, title   : title
						, message : '<wh>'+ name +'</wh> ?'
						, ok      : () => {
							delete PRO[ name ];
							SETTING.save( title, 'Remove ...' );
							$li.remove();
						}
					} );
					break;
			}
			break;
		case 'pipeline':
			var title = 'Pipeline';
			switch ( cmd ) {
				case 'edit':
					var i = $li.index();
					PIP[ i ].type === 'Filter' ? SETTING.pipeline( i, 'edit' ) : SETTING.pipelineMixer( i, 'edit' );
					break;
				case 'delete':
					var type = $li.data( 'type' ).toLowerCase();
					INFO( {
						  icon    : V.tab
						, title   : title
						, message : '<wh>'+ type +'</wh>'
						, ok      : () => {
							PIP.splice( $li.index(), 1 );
							SETTING.save( title, 'Remove '+ type +' ...' );
							$li.remove();
							if ( PIP.length ) {
								GRAPH.flowchart.refresh();
							} else {
								$( '.i-flowchart' ).addClass( 'disabled' );
								$( '#pipeline canvas' ).remove();
							}
						}
					} );
					break;
				case 'bypass':
				case 'restore':
					var i             = $li.index();
					var bypassed      = ! PIP[ i ].bypassed
					PIP[ i ].bypassed = bypassed;
					SETTING.save( title, bypassed ? 'Bypassed' : 'Restored' );
					$li.find( '.liicon' )
						.removeClass()
						.addClass( bypassed ? 'i-bypass' : 'i-pipeline' );
					break;
			}
			break;
		case 'devices':
			SETTING.device( $li.data( 'type' ) );
			break;
		case 'config':
			var name  = $li.find( '.name' ).text();
			var icon  = V.tab;
			var title = 'Configuration';
			switch ( cmd ) {
				case 'copy':
					INFO( {
						  icon         : icon
						, title        : title
						, message      : 'File: <c>'+ name +'</c>'
						, list         : [ 'Copy as', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = _INFO.val();
							BASH( [ 'confcopy', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							NOTIFY( icon, title, 'Copy ...' );
						}
					} );
					break;
				case 'delete':
					INFO( {
						  icon    : icon
						, title   : title
						, message : '<c>'+ name +'</c>'
						, oklabel : ICON( 'remove' ) +'Delete'
						, okcolor : CLR.red
						, ok      : () => {
							BASH( [ 'confdelete', name, S.bluetooth, 'CMD NAME BT' ] );
							NOTIFY( icon, title, 'Delete ...' );
						}
					} );
					break;
				break;
				case 'info':
					STATUS( 'camilla', $li.find( '.name' ).text(), 'info' );
					break;
				break;
				case 'rename':
					INFO( {
						  icon         : icon
						, title        : title
						, message      : 'Rename <c>'+ name +'</c>'
						, list         : [ 'To', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = _INFO.val();
							BASH( [ 'confrename', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							NOTIFY( icon, title, 'Rename ...' );
						}
					} );
					break;
			}
	}
} );
$( '.entries' ).on( 'input', 'input[type=range]', function() {
	SETTING.rangeGet( $( this ), 'input' );
} )
// filters --------------------------------------------------------------------------------
$( '#filters' ).on( 'click', '.name', function( e ) {
	e.stopPropagation();
	$( this ).parents( 'li' ).find( '.liicon' ).trigger( 'click' );
} ).on( 'click', '.i-add', function() {
	SETTING.upload();
} ).on( 'click', '.i-volume', function() {
	var $this   = $( this );
	var name    = $this.parents( 'li' ).data( 'name' );
	var checked = ! $this.hasClass( 'mute' );
	SETTING.muteToggle( $this, checked );
	FIL[ name ].parameters.mute = checked;
	SETTING.save();
} ).on( 'click', '.i-inverted, .i-linear', function() {
	var $this   = $( this );
	var name    = $this.parents( 'li' ).data( 'name' );
	var checked = ! $this.hasClass( 'bl' );
	$this.toggleClass( 'bl', checked );
	var param   = FIL[ name ].parameters;
	$this.hasClass( 'i-inverted' ) ? param.inverted = checked : SETTING.scaleSet( checked, param, $this );
	SETTING.save();
} ).on( 'click', 'li.eq', function( e ) {
	var name    = $( this ).data( 'name' );
	var param   = FIL[ name ].parameters;
	var peq     = param.type === 'FivePointPeq';
	if ( peq ) {
		var bands  = 5;
		var freq   = [];
		var values = [];
		var g_k    = [];
		$.each( F.values.BiquadCombo.FivePointPeq, ( k, v ) => {
			if ( k[ 0 ] === 'f' ) {
				freq.push( param[ k ] );
			} else if ( k[ 0 ] === 'g' ) {
				values.push( param[ k ] * 10 );
				g_k.push( k );
			}
		} );
	} else {
		var bands  = param.gains.length;
		var min    = Math.log10( param.freq_min ); // Hz > log10 : 20 > 1.3
		var max    = Math.log10( param.freq_max ); // Hz > log10 : 20000 > 4.3
		var width  = ( max - min ) / bands;        // log10 / band
		var hz     = min + width / 2;              // log10 midband
		var freq   = [];
		for ( var i = 0; i < bands; i++ ) {
			freq.push( Math.pow( 10, hz ) );
			hz += width;
		}
		var values = param.gains.map( g => g * 10 );
	}
	function flatButton() {
		if ( peq ) {
			var flat = ! g_k.some( k => param[ k ] !== 0 );
		} else {
			var flat = values.reduce( ( a, b ) => a + b, 0 ) === 0;
		}
		$( '#infoOk' ).toggleClass( 'disabled', flat );
	}
	INFO( {
		  icon       : 'equalizer'
		, title      : name
		, list       : COMMON.eq.html( -100, 100, freq )
		, width      : 50 * bands + 40
		, values     : values
		, beforeshow : () => {
			COMMON.eq.beforShow( {
				  init  : () => {
					values.forEach( ( v, i ) => $( '.label.dn a' ).eq( i ).text( ( v / 10 ).toFixed( 1 ) ) );
					flatButton();
				}
				, input : ( i, v ) => {
					var val = v / 10;
					peq ? param[ g_k[ i ] ] = val : param.gains[ i ] = val;
					$( '.label.dn a' ).eq( i ).text( val.toFixed( 1 ) );
				}
				, end   : () => {
					SETTING.save();
					flatButton();
				}
			} );
		}
		, oklabel    : ICON( 'set0' ) +'Flat'
		, oknoreset  : true
		, ok         : () => {
			peq ? g_k.forEach( k => { param[ k ] = 0 } ) : param.gains = Array( bands ).fill( 0 );
			SETTING.save();
			$( '.inforange input' ).val( 0 );
			$( '#infoOk' ).addClass( 'disabled' );
			$( '.label.dn a' ).text( '0.0' );
		}
	} );
} );
// mixers ---------------------------------------------------------------------------------
$( '#mixers' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	if ( $( e.target ).is( 'i' ) || $this.parent().hasClass( 'sub' ) ) return
	
	var name  = $this.find( '.li1' ).text();
	RENDER.mixersSub( name );
} ).on( 'click', '.i-volume', function() {
	var $this   = $( this );
	var M       = SETTING.mixerGet( $this );
	var mapping = MIX[ M.name ].mapping[ M.index ];
	SETTING.muteToggle( $this, M.checked );
	typeof M.si === 'number' ? mapping.sources[ M.si ].mute = M.checked : mapping.mute = M.checked;
	SETTING.save();
} ).on( 'click', '.i-inverted, .i-linear', function() {
	var $this  = $( this );
	var M      = SETTING.mixerGet( $this );
	var source = MIX[ M.name ].mapping[ M.index ].sources[ M.si ];
	$this.toggleClass( 'bl', M.checked );
	$this.hasClass( 'i-inverted' ) ? source.inverted = M.checked : SETTING.scaleSet( M.checked, source, $this );
	SETTING.save();
} ).on( 'input', 'select', function() {
	var M   = SETTING.mixerGet( $( this ) );
	var val = +$( this ).val();
	if ( typeof M.si === 'number' ) {
		MIX[ M.name ].mapping[ M.index ].sources[ M.si ].channel = val;
	} else {
		MIX[ M.name ].mapping[ M.index ].dest = val;
	}
	SETTING.save( M.name, 'Change ...' );
} ).on( 'click', '.i-add', function() {
	var $this = $( this );
	var M = SETTING.mixerGet( $this );
	SETTING.mixerMap( M.name, M.index );
} );
// processors -----------------------------------------------------------------------------
// pipeline -------------------------------------------------------------------------------
$( '#processors, #pipeline' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	if ( ! $( e.target ).is( 'i' ) ) $( this ).find( 'i' ).trigger( 'click' );
} );
// devices --------------------------------------------------------------------------------
$( '#divdevices heading .i-gear' ).on( 'click', function() {
	SETTING.main();
} );
$( '#devices' ).on( 'click', 'li', function() {
	SETTING.device( $( this ).data( 'type' ) );
} );
// config ---------------------------------------------------------------------------------
$( '#config' ).on( 'click', '.i-add', function() {
	SETTING.upload();
} ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	if ( MENU.isActive( $this, e ) ) return
	
	$this.find( '.liicon' ).trigger( 'click' );
} );
// ----------------------------------------------------------------------------------------
$( '#bar-bottom div' ).off( 'click' ).on( 'click', function() {
	V.tab = this.id.slice( 3 );
	RENDER.tab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
