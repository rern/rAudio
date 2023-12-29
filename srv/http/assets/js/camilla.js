// variables //////////////////////////////////////////////////////////////////////////////
V            = {
	  clipped    : false
	, graph      : { filters: [], pipeline: [] }
	, prevconfig : {}
	, sortable   : {}
	, tab        : 'filters'
	, timeoutred : true
	, wscamilla  : null
}
// filters //////////////////////////////////////////////////////////////////////////////
var F0         = {
	  type       : [
		  'Type'
		, 'select'
		, [ 'Gain', /*'Volume', */'Loudness', 'Delay', 'Conv', 'Biquad', 'BiquadCombo', 'Dither', 'Limiter', 'DiffEq' ] // omit Volume - use alsa directly
	]
	, subtype    : {
		  Conv        : [
			  'Subtype'
			, 'select'
			, [ 'Dummy', 'Raw', 'Wav', 'Values' ]
		]
		, Biquad      : [
		    'Subtype'
		  , 'select'
		  , [ 'Free', 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
			, 'Peaking', 'Notch', 'GeneralNotch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform' ]
		]
		, BiquadCombo : [
			  'Subtype'
			, 'select'
			, [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass', 'Tilt', 'FivePointPeq', 'GraphicEqualizer' ]
		]
		, Dither      : [
			  'Subtype'
			, 'select'
			, [ 'None', 'Flat', 'Highpass', 'Fweighted441', 'FweightedShort441', 'FweightedLong441', 'Gesemann441', 'Gesemann48', 'Lipshitz441', 'LipshitzLong441'
			  , 'Shibata441', 'ShibataHigh441', 'ShibataLow441', 'Shibata48', 'ShibataHigh48', 'ShibataLow48', 'Shibata882', 'ShibataLow882', 'Shibata96', 'ShibataLow96', 'Shibata192', 'ShibataLow192' ]
		]
	}
	, freq       : [ 'Frequency', 'number' ]
	, gain       : [ 'Gain',      'number' ]
	, q          : [ 'Q',         'number' ]
	, qbandwidth : [ '',          'radio', { Q: 'q', Bandwidth: 'bandwidth' } ]
	, name       : [ 'Name',      'text' ]
	, fader      : [ 'Fader',     'text' ]
	, FivePointPeq : {
		  Lowshelf  : [ 'fls', 'gls', 'qls' ]
		, Peaking1  : [ 'fp1', 'gp1', 'qp1' ]
		, Peaking2  : [ 'fp2', 'gp2', 'qp2' ]
		, Peaking3  : [ 'fp3', 'gp3', 'qp3' ]
		, Highshelf : [ 'fhs', 'ghs', 'qhs' ]
	}
}
var F1         = {
	  pass   : [ F0.name, F0.type, F0.subtype.Biquad, F0.freq, F0.q ]
	, conv   : [ F0.name, F0.type, F0.subtype.Cov ]
	, fader  : [ F0.name, F0.type, F0.fader ]
	, combo  : [ F0.name, F0.type, F0.subtype.BiquadCombo, [ 'Order', 'number' ], F0.freq ]
}
var Flist      = {
	  pass    : F1.pass
	, shelf   : [ ...F1.pass.slice( 0, 4 ), F0.gain, F0.q, [ '', 'radio', { Q: 'q', Slope: 'slope' } ] ]
	, passFO  : F1.pass.slice( 0, 4 )
	, shelfFO : [ ...F1.pass.slice( 0, 4 ), F0.gain ]
	, notch   : [ ...F1.pass, F0.qbandwidth ]
}
var F        = {
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
		, [ '',          'radio', { ms: 'ms', mm: 'mm', Samples: 'samples' } ]
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
			, [ 'Format',           'select', [ 'TEXT' ] ]
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
	, Biquad : {
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
		, Notch             : Flist.notch
		, GeneralNotch      : [
			  F0.name
			, F0.type
			, [ 'Zero frequency',  'number' ]
			, [ 'Pole frequency',  'number' ]
			, [ 'Pole Q',          'number' ]
			, [ 'Normalize at DC', 'checkbox' ]
		]
		, Bandpass          : Flist.notch
		, Allpass           : Flist.notch
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
	, values  : {
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
		, notch             : { name: '', type: '', subtype: '', freq: 1000, q: 0, unit: 'q' }
		, GeneralNotch      : { name: '', type: '', subtype: '', freq_z: 0, freq_p: 0, q_p: 0, normalize_at_dc:false }
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
var P        = { // processor
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
var format   = {};
[ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ].forEach( k => {
	var key       = k
					.replace( 'FLOAT', 'Float' )
					.replace( 'TEXT',  'Text' );
	format[ key ] = k;
} );
var D0      = {
	  main       : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout' ]
	, samplerate : [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ]
}
var Dlist        = {
	  type               : [ 'Type',               'select', [ 'AsyncSinc', 'AsyncPoly', 'Synchronous' ] ]
	, profile            : [ 'Profile',            'select', [ 'Accurate ', 'Balanced', 'Fast', 'VeryFast', 'Custom' ] ]
	, typeC              : [ 'Type',               'select' ] // option: wait for ws 'GetSupportedDeviceTypes'
	, typeP              : [ 'Type',               'select' ] // ^
	, deviceC            : [ 'Device',             'select' ] // ^
	, deviceP            : [ 'Device',             'select' ] // ^
	, format             : [ 'Format',             'select', format ]
	, filename           : [ 'Filename',           'select', S.lsraw ]
	, channels           : [ 'Channels',           'number' ]
	, extra_samples      : [ 'Extra samples',      'number' ]
	, skip_bytes         : [ 'Skip bytes',         'number' ]
	, read_bytes         : [ 'Read bytes',         'number' ]
	, capture_samplerate : [ 'Capture samplerate', 'number' ]
	, exclusive          : [ 'Exclusive',          'checkbox' ]
	, loopback           : [ 'Loopback',           'checkbox' ]
	, change_format      : [ 'Change format',      'checkbox' ]
}
var D1      = {
	  AlsaC : [ Dlist.typeC, Dlist.deviceC, Dlist.format, Dlist.channels ]
	, AlsaP : [ Dlist.typeP, Dlist.deviceP, Dlist.format, Dlist.channels ]
	, extra : [ Dlist.extra_samples, Dlist.skip_bytes, Dlist.read_bytes ]
}
var D       = {
	  main      : [
		  [ 'Sample Rate',       'select', D0.samplerate ]
		, [ 'Other',             'number' ]
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
		, Jack      : [ Dlist.typeC, Dlist.channels ]
		, Stdin     : [ Dlist.typeC, Dlist.format, Dlist.channels, ...D1.extra ]
		, File      : [ Dlist.typeC, Dlist.filename, Dlist.format, Dlist.channels, ...D1.extra ]
	}
	, playback  : {
		  Alsa      : D1.AlsaP
		, CoreAudio : [ ...D1.AlsaP, Dlist.change_format ]
		, Pulse     : D1.AlsaP
		, Wasapi    : [ ...D1.AlsaP, Dlist.exclusive, Dlist.loopback ]
		, Jack      : [ Dlist.typeP, Dlist.channels ]
		, Stdout    : [ Dlist.typeP, Dlist.format, Dlist.channels ]
		, File      : [ Dlist.typeP, Dlist.filename, Dlist.format, Dlist.channels ]
	}
	, values    : {
		  Alsa      : { type: '', device: '',   format: '', channels: 2 }
		, CoreAudio : { type: '', device: '',   format: '', channels: 2, change_format: '' }
		, Pulse     : { type: '', device: '',   format: '', channels: 2 }
		, Wasapi    : { type: '', device: '',   format: '', channels: 2, exclusive: false, loopback: false }
		, Jack      : { type: '',                           channels: 2 }
		, Stdin     : { type: '',               format: '', channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		, Stdout    : { type: '',               format: '', channels: 2 }
		, File      : { type: '', filename: '', format: '', channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		, FileP     : { type: '', filename: '', format: '', channels: 2 }
	}
	, resampler : {
		  AsyncSinc    : [
			  Dlist.type
			, Dlist.profile
			, Dlist.capture_samplerate
		]
		, Custom       : [
			  Dlist.type
			, Dlist.profile
			, [ 'Sinc length',         'number' ]
			, [ 'Oversampling factor', 'number' ]
			, [ 'F cutoff',            'number' ]
			, [ 'Interpolation',       'select', [ 'Nearest', 'Linear', 'Quadratic', 'Cubic' ] ]
			, [ 'Window',              'select', [ 'Hann2', 'Blackman2', 'BlackmanHarris2', 'BlackmanHarris2' ] ]
			, Dlist.capture_samplerate
		]
		, AsyncPoly    : [
			  Dlist.type
			, [ 'Interpolation',      'select', [ 'Linear', 'Cubic', 'Quintic', 'Septic' ] ]
			, Dlist.capture_samplerate
		]
		, Synchronous : [
			  Dlist.type
			, Dlist.capture_samplerate
		]
		, values      : {
			  AsyncSinc   : { type: 'AsyncSinc', profile: 'Balanced', capture_samplerate: '' }
			, Custom      : { type: 'AsyncSinc', profile: 'Custom', sinc_len: 128, oversampling_factor: 256, f_cutoff: 0.9, interpolation: 'Cubic', window: 'Hann2', capture_samplerate: '' }
			, AsyncPoly   : { type: 'AsyncSinc', interpolation: 'Cubic', capture_samplerate: '' }
			, Synchronous : { type: 'Synchronous', capture_samplerate: '' }
		}
	}
}
// graph //////////////////////////////////////////////////////////////////////////////
var color    = {
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
var plots    = {
	  magnitude  : {
		  yaxis : 'y'
		, type  : 'scatter'
		, name  : 'Gain'
		, line  : { width : 3, color: color.m }
	}
	, phase      : {
		  yaxis : 'y2'
		, type  : 'scatter'
		, name  : 'Phase'
		, line  : { width : 2, color : color.r }
	}
	, groupdelay : {
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
}
var ycommon  = {
	  overlaying : 'y'
	, side       : 'right'
	, anchor     : 'free'
	, autoshift  : true
}
var axes     = {
	  freq       : {
		  title     : {
			  text     : 'Frequency'
			, font     : { color: color.wl }
			, standoff : 10
		}
		, tickfont  : { color: color.wl }
		, tickvals  : [ 0,   232,    464,     696,    928 ]
		, ticktext  : [ '', '10Hz', '100Hz', '1kHz', '10kHz' ]
		, range     : [ 10, 1000 ]
		, gridcolor : color.grd
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

// functions //////////////////////////////////////////////////////////////////////////////
function renderPage() { // common from settings.js
	V.wscamilla && V.wscamilla.readyState === 1 ? util.wsGetConfig() : util.webSocket();
}
function psOnClose() {
	if ( V.off ) return
	
	clearInterval( V.intervalvu );
	if ( V.wscamilla ) V.wscamilla.close();
}
function psVolume( data ) {
	var vol = data.val;
	if ( [ 'mute', 'unmute' ].includes( data.type ) ) {
		V.local = false;
		if ( data.type === 'mute' ) {
			vol          = 0;
			S.volumemute = data.val;
		} else {
			S.volumemute = 0;
		}
	}
	if ( ! V.local ) {
		if ( data.type === 'dragpress' ) {
			V.dragpress = true;
			setTimeout( () => V.dragpress = false, 300 );
		}
		util.volume( vol, 'push' );
	}
}

var graph    = {
	  gain     : () => {
		var $divgraph = $( '.divgraph' );
		if ( ! $divgraph.length ) return
		
		V.timeoutgain = setTimeout( () => {
			$divgraph.each( ( i, el ) => {
				var $this = $( el );
				$this.hasClass( 'hide' ) ? $this.remove() : graph.plot( $this.parent() );
			} );
		}, 300 );
	}
	, pipeline : () => {
		if ( ! $( '.flowchart' ).hasClass( 'hide' ) ) createPipelinePlot();
	}
	, plot     : $li => {
		if ( ! $li ) $li = V.li;
		$li.addClass( 'disabled' );
		if ( typeof Plotly !== 'object' ) {
			$.getScript( '/assets/js/plugin/'+ jfiles.plotly, () => graph.plot() );
			return
		}
		
		var filters = V.tab === 'filters';
		var val     = $li.data( filters ? 'name' : 'index' );
		V.graph[ V.tab ].push( val );
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
		notify( V.tab, util.key2label( V.tab ), 'Plot ...' );
		var cmd = filters ? " '"+ JSON.stringify( FIL[ val ] ) +"'" : " '"+ JSON.stringify( S.config ) +"' "+ val;
		bash( [ 'settings/camilla.py', V.tab + cmd ], data => { // groupdelay = delay, magnitude = gain
			var impulse   = 'impulse' in data;
			if ( filterdelay ) {
				plots.magnitude.y   = 0;
			} else {
				plots.magnitude.y   = data.magnitude;
				var scale  = {
					  groupdelay : { min: -10, max: 10 }
					, impulse    : { min: -1, max: 1 }
					, magnitude  : { min: -6, max: 6 }
				}
				var minmax = {};
				[ 'groupdelay', 'impulse', 'magnitude' ].forEach( d => {
					if ( ! ( d in data ) ) return
					
					var v = data[ d ];
					minmax[ d ] = { value  : v };
					[ 'min', 'max' ].forEach( k => minmax[ d ][ k ] = Math[ k ]( ...v ) );
					if ( minmax[ d ].max < scale[ d ].max ) minmax[ d ].max = scale[ d ].max;
					if ( minmax[ d ].min > scale[ d ].min ) minmax[ d ].min = scale[ d ].min;
					minmax[ d ].abs = Math.max( Math.abs( minmax[ d ].min ), Math.abs( minmax[ d ].max ) );
					var range  = minmax[ d ];
					if ( d !== 'magnitude' ) {
						range.min = -range.abs;
					} else {
						if ( range.min <= scale[ d ].min ) range.min -= 1;
						if ( range.max >= scale[ d ].max ) range.max += 1;
					}
					axes[ d ].range = [ range.min, range.max ];
					if ( d === 'impulse' ) {
						axes[ d ].dtick = range.abs < 1 ? 0.2 : ( range.abs < 2 ? 0.5 : 1 );
					} else {
						axes[ d ].dtick = range.abs < 10 ? 2 : ( range.abs < 20 ? 5 : 10 );
					}
				} );
			}
			plots.phase.y      = data.phase;
			plots.groupdelay.y = delay0 ? 0 : data.groupdelay;
			var plot           = [ plots.magnitude, plots.phase, plots.groupdelay ];
			var layout         = {
				  xaxis         : axes.freq
				, yaxis         : axes.magnitude
				, yaxis2        : axes.phase
				, yaxis3        : axes.groupdelay
				, margin        : { t: impulse ? 40 : 10, r: 40, b: 90, l: 45 }
				, paper_bgcolor : '#000'
				, plot_bgcolor  : '#000'
				, showlegend    : false
				, hovermode     : false
				, dragmode      : 'zoom'
				, font          : {
					  family : 'Inconsolata'
					, size   : 14
				}
			}
			if ( impulse ) { // Conv
				var imL  = data.impulse.length;
				var raw  = imL < 4500;
				var each = raw ? imL / 80 : imL / 120;
				var iL   = raw ? 5 : 7;
				var ticktext = [];
				var tickvals = [];
				for ( i = 0; i < iL; i++ ) {
					ticktext.push( i * 20 );
					tickvals.push( i * 20 * each );
				}
				ticktext[ i - 1 ]  = '';
				axes.time.range    = [ 0, imL ];
				axes.time.tickvals = tickvals;
				axes.time.ticktext = ticktext;
				layout.xaxis2      = axes.time;
				layout.yaxis4      = axes.impulse;
				plots.impulse.y    = data.impulse;
				plot.push( plots.impulse );
			}
			if ( ! $li.find( '.divgraph' ).length ) $li.append( '<div class="divgraph" data-val="'+ val +'"></div>' );
			var $divgraph = $li.find( '.divgraph' );
			var options   = {
				  displayModeBar : false
				, scrollZoom     : true
			}
			Plotly.newPlot( $divgraph[ 0 ], plot, layout, options );
			$svg = $divgraph.find( 'svg' );
			$svg.find( '.plot' ).before( $svg.find( '.overplot' ) );
			elementScroll( $divgraph.parent() );
			bannerHide();
			$divgraph
				.append( '<i class="i-close graphclose"></i>' )
				.removeClass( 'hide' );
			$li.removeClass( 'disabled' );
		}, 'json' );
	}
}
var render   = {
	  page        : () => {
		console.log('page')
		if ( S.bluetooth ) S.lsconfigs = S[ 'lsconfigs-bt' ];
		if ( ! S.range ) S.range = { MIN: -10, MAX: 10 };
		S.lscoefraw = [];
		S.lscoefwav = [];
		S.lscoeffs.forEach( f => {
			f.slice( -4 ) === '.wav' ? S.lscoefwav.push( f ) : S.lscoefraw.push( f );
		} );
		$( '.container' ).removeClass( 'hide' );
		render.status();
		bannerHide();
	}
	, status      : () => {
		console.log('status')
		render.statusValue();
		if ( S.bluetooth ) {
			if ( ! $( '#divconfiguration .col-l i' ).length ) $( '#divconfiguration a' ).after( ico( 'bluetooth' ) );
		} else {
			$( '#divconfiguration .col-l i' ).remove();
		}
		$( '#configuration' )
			.html( htmlOption( S.lsconfigs ) )
			.val( S.configname );
		$( '#configuration' ).prop( 'disabled', $( '#configuration option' ).length === 1 );
		if ( $( '.vubar' ).length ) return
		
		var vugrid  = '<div id="vugrid">';
		for ( i = 0; i < 4; i++ ) vugrid  += '<a class="g'+ i +'"></>';
		var vulabel = '<div id="vulabel">';
		[ '', -96, -48, -24, -12, -6, 0, 6 ].forEach( ( l, i ) => vulabel += '<a class="l'+ i +'">'+ l +'</a>' );
		var vubar   = '<div id="vu">'
					 + vugrid +'</div>'
					 +'<div id="in">';
		[ 'capture', 'playback' ].forEach( k => {
			var lb = false;
			var cp = k[ 0 ];
			if ( ! lb && k === 'playback' ) {
				lb = true;
				vubar += '</div>'+ vulabel +'</div><div id="out">';
			}
			for ( i = 0; i < DEV[ k ].channels; i++ ) {
				vubar += '<div class="vubar"></div>'
						+'<div class="vubar peak '+ cp + i +' "></div>'
						+'<div class="vubar rms '+ cp + i +' "></div>';
			}
		} );
		$( '#divvu .value' ).html( vubar +'</div></div>' );
		var ch   = DEV.capture.channels > DEV.playback.channels ? DEV.capture.channels : DEV.playback.channels;
		$( '.flowchart' ).attr( 'viewBox', '20 '+ ch * 30 +' 500 '+ ch * 80 );
	}
	, statusValue : () => {
		console.log('statusValue')
		var play = S.state === 'play';
		if ( S.player === 'mpd' ) {
			if ( S.pllength ) {
				var btn = play ? 'pause' : 'play';
			} else {
				var btn = 'play disabled';
			}
		} else {
			var btn = play ? 'stop' : 'play disabled';
		}
		$( '.icon' ).prop( 'class', 'icon i-'+ S.player );
		$( '.playback' ).prop( 'class', 'playback i-'+ btn );
		if ( S.volume !== false ) {
			$( '#divvolume' ).removeClass( 'hide' );
			$( '#volume .thumb' ).css( 'margin-left', $( '#volume .slide' ).width() / 100 * S.volume );
			render.volume();
		} else {
			$( '#divvolume' ).addClass( 'hide' );
		}
		$( '.rateadjust' ).toggleClass( 'hide', ! S.enable_rate_adjust );
	}
	, tab         : () => {
		console.log('tab')
		var title = util.key2label( V.tab );
		if ( V.tab === 'filters' ) {
			title += ico( 'folder-filter' );
		} else if ( V.tab === 'pipeline' && PIP.length ) {
			title += ico( 'flowchart' );
		} else if ( V.tab === 'config' ) {
			title += 'uration';
		}
		if ( V.tab === 'filters' || V.tab === 'mixers' ) title += ico( 'gear' );
		title    += ico( V.tab === 'devices' ? 'gear' : 'add' );
		$( '#divsettings .headtitle' ).eq( 0 ).html( title );
		$( '#divsettings .tab' ).addClass( 'hide' );
		$( '#'+ V.tab ).removeClass( 'hide' );
		$( '#bar-bottom div' ).removeClass( 'active' );
		$( '#tab'+ V.tab ).addClass( 'active' );
		if ( V.tab === 'config' ) {
			render.config();
			return
		}
		
		var $main = $( '#'+ V.tab +' .entries.main' );
		if ( $main.is( ':empty' ) ) {
			render.prevconfig();
			render[ V.tab ]();
		} else {
			if ( ! jsonChanged( S.config[ V.tab ], V.prevconfig[ V.tab ] ) ) return
			
			render.prevconfig();
			if ( $main.hasClass( 'hide' ) ) {
				var data = V.tab === 'pipeline' ? 'index' : 'name';
				var val  = $( '#'+ V.tab +' .entries.sub li' ).eq( 0 ).data( data );
				render[ V.tab +'Sub' ]( val );
			} else {
				render[ V.tab ]();
			}
		}
	}
	, vuClear() {
		if ( ! ( 'intervalvu' in V ) ) return
			
		clearInterval( V.intervalvu );
		delete V.intervalvu;
		setTimeout( () => {
			$( '.peak' ).css( { left: 0, background: 'var( --cga )' } );
			$( '.rms' ).css( 'width', 0 );
			$( '#divstate .value a:not(.clipped)' ).text( '·' );
		}, 300 );
	}
	, volume      : () => {
		console.log('volume')
		$( '#volume-text' )
			.text( S.volumemute || S.volume )
			.toggleClass( 'bl', S.volumemute > 0 );
		$( '#divvolume .i-volume' ).toggleClass( 'mute bl', S.volumemute > 0 );
	} //---------------------------------------------------------------------------------------------
	, filters     : () => {
		console.log('filters')
		if ( ! Object.keys( FIL ).length ) return
		
		var data     = render.dataSort( 'filters' );
		var li       = '';
		$.each( data, ( k, v ) => li += render.filter( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	}
	, filter      : ( k, v ) => {
		var param      = v.parameters;
		var linear     = '';
		var iconmute   = '';
		var iconlinear = '';
		var disabled   = '';
		if ( v.type === 'Gain' ) {
			linear     = param.scale === 'linear';
			iconlinear = ico( param.inverted ? 'inverted bl' : 'inverted' ) + ico( linear ? 'linear bl' : 'linear' );
			iconmute   = ico( param.mute ? 'mute bl' : 'volume' );
			disabled   = param.mute ? ' disabled' : '';
		}
		if ( linear ) {
			var min  = -10;
			var max  = 10;
			var step = 0.1;
		} else {
			var min  = S.range.FILTERSMIN;
			var max  = S.range.FILTERSMAX;
			var step = S.range.FILTERSSTEP;
		}
		if ( 'gain' in param ) {
			var gain = util.dbRound( param.gain );
			var li   = '<div class="liinput"><div class="filter'+ ( iconlinear ? ' linear' : '' ) +'"><div class="li1">'+ k +'</div>'
					+'<div class="li2">'
					+ ( 'freq' in param ? param.freq +'Hz ' : v.type )
					+ ( 'q' in param ? 'Q:'+ param.q : '' )
					+ ( 'slope' in param ?  'S:'+ param.slope : '' )
					+'</div>'
					+'</div>'+ iconmute
					+'<c class="db">'+ gain +'</c>'
					+'<input type="range" step="'+ step +'" value="'+ gain +'" min="'+ min +'" max="'+ max +'"'+ disabled +'>'
					+'<div class="divgain filter">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) + iconlinear
					+'</div>'
					+'</div>';
		} else {
			var paramdata = [ 'FivePointPeq', 'GraphicEqualizer' ].includes( param.type ) ? param.type : render.json2string( param );
			var li        =  '<div class="li1">'+ k +'</div>'
							+'<div class="li2">'+ v.type +' · '+ paramdata +'</div>';
		}
		var $graph = $( '#filters .entries.main li[data-name="'+ k +'"]' ).find( '.divgraph' );
		if ( $graph.length ) li += $graph[ 0 ].outerHTML;
		var icon  = param.type === 'GraphicEqualizer' ? 'equalizer' : 'filters';
		return '<li data-name="'+ k +'">'+ ico( icon +' liicon edit graph' ) + li  +'</li>'
	}
	, filtersSub  : k => {
		console.log('filtersSub')
		var li = '<li class="lihead main files">'+ ico( 'folder-filter' ) +'FIR coefficients'+ ico( 'add' ) + ico( 'back' ) +'</li>';
		if ( S.lscoeffs.length ) S.lscoeffs.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file liicon' ) + k +'</li>' );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
	} //---------------------------------------------------------------------------------------------
	, mixers      : () => {
		console.log('mixers')
		if ( ! Object.keys( MIX ).length ) return
		
		var data = render.dataSort( 'mixers' );
		var li = '';
		$.each( data, ( k, v ) => li+= render.mixer( k, v ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	}
	, mixer       : ( k, v ) => {
		return   '<li data-name="'+ k +'">'+ ico( 'mixers liicon edit' )
				+'<div class="li1">'+ k +'</div>'
				+'<div class="li2">In: '+ v.channels.in +' - Out: '+ v.channels.out +'</div>'
				+'</li>'
	}
	, mixersSub   : name => {
		console.log('mixersSub')
		var data      = MIX[ name ].mapping;
		var chmapping = data.length;
		var chin      = DEV.capture.channels;
		var chout     = DEV.playback.channels;
		var iconadd   = chout === chmapping ? '' : ico( 'add' );
		var li        = '<li class="lihead" data-name="'+ name +'">'+ ico( 'mixers' ) + name + iconadd + ico( 'back' ) +'</li>';
		var optin     = htmlOption( chin );
		var optout    = htmlOption( chout );
		data.forEach( ( kv, i ) => {
			var dest     = kv.dest;
			var opts     = optout.replace( '>'+ dest, ' selected>'+ dest );
			var i_name   = ' data-index="'+ i +'" data-name="'+ name +'"';
			li       +=  '<li class="liinput main dest'+ i +'"'+ i_name +' data-dest="'+ dest +'">'+ ico( 'output liicon' )
						+'<div><select>'+ opts +'</select></div>'
						+'<div>'+ ico( kv.mute ? 'volume mute bl' : 'volume' ) + ico( 'add' )
						+'</li>';
			kv.sources.forEach( ( s, si ) => {
				var source   = data[ i ].sources[ si ];
				var channel  = source.channel;
				var opts     = optin.replace( '>'+ channel, ' selected>'+ channel );
				var val      = util.dbRound( source.gain );
				var disabled = source.mute ? ' disabled' : '';
				var linear   = source.scale === 'linear';
				if ( linear ) {
					var min  = -10;
					var max  = 10;
					var step = 0.1;
				} else {
					var min  = S.range.MIXERSMIN;
					var max  = S.range.MIXERSMAX;
					var step = S.range.MIXERSSTEP;
				}
				li += '<li class="liinput dest'+ i +'"'+ i_name +' dest'+ i +'" data-si="'+ si +'">'+ ico( 'input liicon' ) +'<select>'+ opts +'</select>'
					 + ico( source.mute ? 'volume mute bl' : 'volume' ) +'<c class="db">' + val +'</c>'
					 +'<input type="range" step="'+ step +'" value="'+ val +'" min="'+ min +'" max="'+ max +'" '+ disabled +'>'
					 +'<div class="divgain '+ disabled +'">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) +'</div>'
					 + ico( source.inverted ? 'inverted bl' : 'inverted' ) + ico( linear ? 'linear bl' : 'linear' )
					 +'</li>';
			} );
		} );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
		selectSet( $( '#mixers select' ) );
	} //---------------------------------------------------------------------------------------------
	, processors  : () => {
		console.log('processors')
		if ( ! PRO || ! Object.keys( PRO ).length ) return
		
		var data = render.dataSort( 'processors' );
		var li = '';
		$.each( data, ( k, v ) => {
			var param = jsonClone( v.parameters );
			[ 'channels', 'monitor_channels', 'process_channels' ].forEach( k => delete param[ k ] );
			li+= '<li data-name="'+ k +'">'+ ico( 'processors liicon edit' )
				+'<div class="li1">'+ k +'</div>'
				+'<div class="li2">'+ v.type +' · '+ render.json2string( param )+'</div>'
				+'</li>'
		} );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
	} //---------------------------------------------------------------------------------------------
	, pipeline    : () => {
		if ( ! PIP.length ) return
		
		var li = '';
		PIP.forEach( ( el, i ) => li += render.pipe( el, i ) );
		$( '#'+ V.tab +' .entries.main' ).html( li );
		render.toggle();
		render.sortable( 'main' );
	}
	, pipe        : ( el, i ) => {
		var icon = 'pipeline liicon';
		if ( el.type === 'Filter' ) {
			icon  += ' graph';
			var li = '<div class="li1">' + el.type +'</div>'
						+'<div class="li2">channel '+ el.channel +': '+ el.names.join( ', ' ) +'</div>';
		} else {
			var li = '<gr>Mixer:</gr> '+ el.name;
		}
		var $graph = $( '#filters .entries.main li[data-index="'+ i +'"]' ).find( '.divgraph' );
		if ( $graph.length ) li += $graph[ 0 ].outerHTML;
		return '<li data-type="'+ el.type +'" data-index="'+ i +'">'+ ico( icon ) + li +'</li>'
	}
	, pipelineSub : index => {
		var data = PIP[ index ];
		var li   = '<li class="lihead main" data-index="'+ index +'">'+ ico( 'pipeline' ) +'Channel '+ data.channel + ico( 'add' ) + ico( 'back' ) +'</li>';
		data.names.forEach( ( name, i ) => li += render.pipeFilter( name, i ) );
		$( '#'+ V.tab +' .entries.sub' ).html( li );
		render.toggle( 'sub' );
		render.sortable( 'sub' );
	}
	, pipeFilter  : ( name, i ) => {
		return '<li data-index="'+ i +'" data-name="'+ name +'">'+ ico( 'filters liicon' )
			  +'<div class="li1">'+ name +'</div>'
			  +'<div class="li2">'+ FIL[ name ].type +' · '+ render.json2string( FIL[ name ].parameters ) +'</div>'
			  +'</li>'
	}
	, sortable    : el => {
		if ( el in V.sortable ) return
		
		V.sortable[ el ] = new Sortable( $( '#pipeline .entries.'+ el )[ 0 ], {
			  ghostClass : 'sortable-ghost'
			, delay      : 400
			, onUpdate   : function ( e ) {
				var ai      = e.oldIndex;
				var bi      = e.newIndex;
				var pip     = PIP;
				var $lihead = $( '#pipeline .lihead' );
				if ( $lihead.length ) {
					pip = PIP[ $lihead.data( 'index' ) ].names;
					ai--;
					bi--;
				}
				var a = pip[ ai ];
				pip.splice( ai, 1 );
				pip.splice( bi, 0, a );
				setting.save( 'Pipeline', 'Change order ...' );
				graph.pipeline();
			}
		} );
	} //---------------------------------------------------------------------------------------------
	, devices     : () => {
		var li  = '';
		[ 'playback', 'capture' ].forEach( d => {
			var dev = DEV[ d ];
			var data = jsonClone( dev );
			[ 'device', 'type' ].forEach( k => delete data[ k ] );
			li += '<li data-type="'+ d +'">'+ ico( d === 'capture' ? 'input' : 'output' )
					+'<div class="li1">'+ util.key2label( d ) +' <gr>·</gr> '+ render.typeReplace( dev.type )
					+ ( 'device' in dev ? ' <gr>·</gr> '+ dev.device +'</div>' : '' )
					+'<div class="li2">'+ render.json2string( data ) +'</div>'
					+'</li>';
		} );
		$( '#devices .entries.main' ).html( li );
		var labels = '';
		var values = '';
		D0.main.forEach( k => {
			if ( k in DEV ) {
				labels += util.key2label( k ) +'<br>';
				values += DEV[ k ].toLocaleString() +'<br>';
			}
		} );
		var keys = [];
		if ( S.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
		if ( S.stop_on_rate_change ) keys.push( 'rate_measure_interval' );
		if ( keys.length ) {
			labels += '<hr>';
			values += '<hr>';
			keys.forEach( k => {
				labels += util.key2label( k ) +'<br>';
				values += DEV[ k ] +'<br>';
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
		switchSet();
		$( '#divenable_rate_adjust input' ).toggleClass( 'disabled', S.resampler && DEV.resampler.type === 'Synchronous' );
	} //---------------------------------------------------------------------------------------------
	, config      : () => {
		var li  = '';
		S.lsconfigs.forEach( f => {
			li += '<li>'+ ico( 'file liicon' ) +'<a class="name">'+ f +'</a></li>';
		} );
		$( '#'+ V.tab +' .entries.main' ).html( li );
	} //---------------------------------------------------------------------------------------------
	, dataSort    : () => {
		var kv   = S.config[ V.tab ];
		var data = {};
		var keys = Object.keys( kv );
		keys.sort().forEach( k => data[ k ] = kv[ k ] );
		return data
	}
	, json2string : json => {
		return JSON.stringify( json )
					.replace( /[{"}]/g, '' )
					.replace( /type:|filename:.*\/|format:TEXT,|skip_bytes_lines:.*|read_bytes_lines:.*/g, '' )
					.replace( /,$/, '' )
					.replace( /([:,])/g, '$1 ' )
	}
	, prevconfig  : () => V.prevconfig[ V.tab ] = jsonClone( S.config[ V.tab ] )
	, toggle      : ( sub ) => {
		var $main = $( '#'+ V.tab +' .entries.main' );
		var $sub  = $( '#'+ V.tab +' .entries.sub' );
		if ( sub || $main.hasClass( 'hide' ) ) {
			$main.addClass( 'hide' );
			$sub.removeClass( 'hide' );
		} else {
			$main.removeClass( 'hide' );
			$sub.addClass( 'hide' );
		}
		$( '#menu' ).addClass( 'hide' );
		if ( [ 'filters', 'pipeline' ].includes( V.tab ) && V.graph[ V.tab ].length ) {
			var val = V.tab === 'filters' ? 'name' : 'index';
			$( '#'+ V.tab +' .entries.main li' ).each( ( i, el ) => {
				var $el  = $( el );
				if ( V.graph[ V.tab ].includes( $el.data( val ) ) ) graph.plot( $el );
			} );
		}
	}
	, typeReplace : str => {
		return str
				.replace( 'Alsa', 'ALSA' )
				.replace( 'Std',  'std' )
	}
}
var setting  = {
	  filter        : ( type, subtype, name ) => {
		var list  = subtype ? F[ type ][ subtype ] : F[ type ];
		if ( type === 'Biquad' ) {
			if ( [ 'Hig', 'Low' ].includes( subtype.slice( 0, 3 ) ) ) {
				var vsubtype = subtype.replace( /High|Low/, '' );
			} else if ( subtype.slice( -4 ) === 'pass' ) {
				var vsubtype = 'notch';
			} else if ( subtype === 'AllpassFO' ) {
				var vsubtype = 'passFO';
			} else {
				var vsubtype = type;
			}
		} else if ( type === 'BiquadCombo' ) {
			var vsubtype = [ 'Tilt', 'FivePointPeq', 'GraphicEqualizer' ].includes( subtype ) ? subtype : type;
		} else {
			var vsubtype = type;
		}
		var values  = F.values[ vsubtype ];
		values.type = type;
		if ( subtype ) values.subtype = subtype;
		if ( name ) {
			values.name = name;
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
			, checkchanged : name in FIL
			, beforeshow   : () => {
				if ( name ) $( '#infoList select' ).slice( 0, 2 ).prop( 'disabled', true );
				$( '#infoList td:first-child' ).css( 'min-width', '125px' );
				var $select = $( '#infoList select' );
				$select.eq( 0 ).on( 'input', function() {
					var val     = infoVal();
					var subtype = val.type in F0.subtype ? F0.subtype[ val.type ][ 2 ][ 0 ] : '';
					setting.filter( val.type, subtype, val.name );
				} );
				if ( subtype ) {
					$select.eq( 1 ).on( 'input', function() {
						var val = infoVal();
						if ( val.type === 'Conv' && [ 'Raw', 'Wav' ].includes( val.subtype ) && ! S.lscoeffs.length ) {
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
				}
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
					[ 'a', 'b' ].forEach( k => val[ k ] = util.list2array( val[ k ] ) );
				} else if ( subtype === 'FivePointPeq' ) {
					Object.keys( F0.FivePointPeq ).forEach( k => {
						var v = util.list2array( val[ k ] );
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
					val.values = util.list2array( val.values );
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
				$.each( val, ( k, v ) => param[ k ] = v );
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
	} //---------------------------------------------------------------------------------------------
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
					MIX[ newname ] = {
						  channels : {
							  in  : DEV.capture.channels
							, out : DEV.playback.channels
						}
						, mapping  : [ {
							  dest    : 0
							, sources : [ {
								  channel  : 0
								, gain     : 0
								, inverted : false
								, mute     : false
							} ]
							, mute    : false
						} ]
					}
				}
				setting.save( title, name ? 'Change ...' : 'Save ...' );
				render.mixers();
			}
		} );
	}
	, mixerMap      : ( name, index ) => {
		if ( index === '' ) {
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
	} //---------------------------------------------------------------------------------------------
	, processor     : name => {
		var type   = name ? PRO[ name ].type : 'Compressor';
		var values = jsonClone( P.values[ type ] );
		if ( name ) {
			$.each( PRO[ name ].parameters, ( k, v ) => values[ k ] = v );
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
				[ 'monitor_channels', 'process_channels' ].forEach( k => val[ k ] = util.list2array( val[ k ] ) );
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
	} //---------------------------------------------------------------------------------------------
	, pipeline      : () => {
		var filters = Object.keys( FIL );
		info( {
			  icon       : V.tab
			, title      : 'Add Pipeline'
			, tablabel   : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab        : [ '', setting.pipelineMixer ]
			, list       : [
				  [ 'Channel', 'select', [ ...Array( DEV.playback.channels ).keys() ] ]
				, [ 'Filters', 'select', filters ]
			]
			, beforeshow : () => {
				$( '#infoList .select2-container' ).eq( 0 ).addClass( 'channel' )
				$( '#infoList td' ).last().append( ico( 'add' ) );
				var tradd = '<tr class="trlist"><td></td><td><input type="text" disabled value="VALUE">'+ ico( 'remove' ) +'</td></tr>';
				$( '#infoList' ).on( 'click', '.i-add', function() {
					$( '#infoList table' ).append( tradd.replace( 'VALUE', $( '#infoList select' ).eq( 1 ).val() ) );
				} ).on( 'click', '.i-remove', function() {
					$( this ).parents( 'tr' ).remove();
				} );
			}
			, ok         : () => {
				var $input = $( '#infoList input' );
				if ( $input.length ) {
					var names = [];
					$input.each( ( i, el ) => names.push( $( el ).val() ) );
				} else {
					var names = filters[ 0 ];
				}
				PIP.push( {
					  type    : 'Filter'
					, channel : +$( '#infoList select' ).eq( 0 ).val()
					, names   : names
				} );
				setting.pipelineSave();
			}
		} );
	}
	, pipelineMixer : () => {
		if ( ! Object.keys( MIX ).length ) {
			info( {
				  icon    : V.tab
				, title   : 'Add Pipeline'
				, message : 'No mixers found.'
				, ok      : setting.pipeline
			} );
			return
		}
		
		info( {
			  icon     : V.tab
			, title    : 'Add Pipeline'
			, tablabel : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab      : [ setting.pipeline, '' ]
			, list     : [ 'Mixers', 'select', Object.keys( MIX ) ]
			, ok       : () => {
				PIP.push( {
					  type : 'Mixer'
					, name : infoVal()
				} );
				setting.pipelineSave();
			}
		} );
	}
	, pipelineSave  : () => {
		setting.save( 'Add Pipeline', 'Save ...' );
		render.pipeline();
	}
	, sortRefresh   : k => {
		V.sortable[ k ].destroy();
		delete V.sortable[ k ];
		render.sortable( k );
	} //---------------------------------------------------------------------------------------------
	, device        : ( dev, type ) => {
		var type    = type || 'Alsa';
		var vtype   = type === 'File' && dev === 'playback' ? 'FileP' : type;
		var values  = jsonClone( D.values[ vtype ] );
		values.type = type;
		if ( DEV[ dev ].type === type ) $.each( values, ( k, v ) => values[ k ] = DEV[ dev ][ k ] );
		var title   = util.key2label( dev );
		info( {
			  icon         : V.tab
			, title        : title
			, list         : D[ dev ][ type ]
			, boxwidth     : 198
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, beforeshow   : () => {
				$( '#infoList input[type=number]' ).css( 'width', '70px' );
				$( '#infoList td:first-child' ).css( 'width', '128px' );
				$( '#infoList select' ).eq( 0 ).on( 'input', function() {
					var typenew = $( this ).val();
					if ( typenew === 'File' && ! S.lsraw.length ) {
						info( {
							  icon    : V.tab
							, title   : title
							, message : 'No raw files available.'
							, ok      : () => setting.device( dev, type )
						} );
					} else {
						setting.device( dev, typenew );
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
		var values = {};
		D0.main.forEach( k => {
			values[ k ] = DEV[ k ];
			if ( k === 'samplerate' ) values.other = DEV.samplerate;
		} );
		if ( ! D0.samplerate.includes( DEV.samplerate ) ) values.samplerate = 'Other';
		var title = util.key2label( V.tab );
		info( {
			  icon         : V.tab
			, title        : title
			, list         : D.main
			, boxwidth     : 120
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, beforeshow   : () => {
				var $trother = $( '#infoList tr' ).eq( 1 );
				$trother.toggleClass( 'hide', values.samplerate !== 'Other' );
				$( '#infoList select' ).on( 'input', function() {
					var rate  = $( this ).val();
					var other = rate === 'Other';
					$trother.toggleClass( 'hide', ! other );
					if ( ! other ) $trother.find( 'input' ).val( rate );
				} );
			}
			, ok           : () => {
				var val = infoVal();
				if ( val.samplerate === 'Other' ) val.samplerate = val.other;
				delete val.other;
				$.each( val, ( k, v ) => DEV[ k ] = v );
				setting.save( title, 'Change ...' );
				render.devices();
			}
		} );
	} //---------------------------------------------------------------------------------------------
	, resampler     : ( type, profile ) => {
		var Dtype  = D.resampler[ type ];
		var values = D.resampler.values[ type ];
		if (profile ) values.profile = profile;
		if ( S.resampler ) DEV.resample.each( ( k, v ) => values[ k ] = v );
		values.capture_samplerate = DEV.capture_samplerate || DEV.samplerate;
		info( {
			  icon         : V.tab
			, title        : SW.title
			, list         : Dtype
			, boxwidth     : 160
			, values       : values
			, checkblank   : true
			, checkchanged : S.resampler
			, beforeshow   : () => {
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
				var val = infoVal();
				DEV.capture_samplerate = val.capture_samplerate === DEV.samplerate ? null : val.capture_samplerate;
				delete val.capture_samplerate;
				if ( val.type === 'Synchronous' && S.enable_rate_adjust ) DEV.enable_rate_adjust = false;
				DEV.resampler = val;
				setting.switchSave( 'resampler' );
			}
		} );
	} //---------------------------------------------------------------------------------------------
	, save          : ( titlle, msg ) => {
		setTimeout( () => {
			var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
			V.wscamilla.send( '{ "SetConfigJson": "'+ config +'" }' );
			setTimeout( () => bash( [ 'saveconfig' ] ), 300 );
		}, V.wscamilla ? 0 : 300 );
		if ( msg ) banner( V.tab, titlle, msg );
	}
	, switchSave    : ( id, disable ) => {
		if ( disable === 'disable' ) {
			var msg   = 'Disable ...';
			DEV[ id ] = null;
		} else {
			var msg   = DEV[ id ] ? 'Change ...' : 'Enable ...';
			DEV[ id ] = true;
		}
		setting.save( SW.title, msg );
		render.devices();
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
			  icon        : V.tab
			, title       : title
			, message     : message
			, fileoklabel : ico( 'file' ) +'Upload'
			, filetype    : dir === 'coeffs' ? '.dbl,.pcm,.raw,.wav' : '.yml'
			, cancel      : () => {
				util.webSocket();
			}
			, ok          : () => {
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
				util.webSocket();
			}
		} );
	}
}
var util     = {
	  db2percent   : v => {
		var value = 0;
		if ( v >= -12 ) {
			value = 81.25 + 12.5 * v / 6
		} else if ( v >= -24 ) {
			value = 68.75 + 12.5 * v / 12
		} else {
			value = 56.25 + 12.5 * v / 24
		}
		return value < 0 ? 0 : ( value > 100 ? 100 : value )
	}
	, dbRound      : num => {
		return Math.round( num * 10 ) / 10
	}
	, inUse        : name => {
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
	, key2label    : key => {
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
	, labels2array : array => {
		if ( ! array ) return false
		
		var capitalized = array.map( el => util.key2label( el ) );
		return capitalized
	}
	, list2array   : list => { // '1, 2, 3' > [ 1, 2, 3 ]
		return list.replace( /[ \]\[]/g, '' ).split( ',' ).map( Number )
	}
	, volume       : ( pageX, type ) => {
		var bandW   = $( '#volume .slide' ).width();
		if ( V.start ) {
			var posX = pageX - $( '#volume .slide' ).offset().left;
			posX     = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
			var vol  = Math.round( posX / bandW * 100 );
		} else {
			var vol  = pageX;
			var posX = bandW * vol / 100;
		}
		if ( V.drag ) {
			S.volume = vol;
			util.volumeThumb();
			volumeSetAt();
		} else {
			var diff = V.dragpress ? 3 : Math.abs( vol - S.volume );
			$( '#volume,  #divvolume .divgain i' ).addClass( 'disabled' );
			$( '#volume .thumb' ).animate(
				  { 'margin-left': posX }
				, {
					  duration : diff * 40
					, easing   : 'linear'
					, complete : () => $( '#volume,  #divvolume .divgain i' ).removeClass( 'disabled' )
				}
			);
			S.volume = vol;
			if ( ! type ) { // not from push
				volumePush( vol );
				volumeSetAt();
			}
		}
		render.volume();
	}
	, volumeThumb  : () => {
		$( '#volume .thumb' ).css( 'margin-left', $( '#volume .slide' ).width() / 100 * S.volume );
	}
	, webSocket    : () => {
		if ( V.wscamilla && V.wscamilla.readyState < 2 ) return
		
		var cmd_el            = {
			  GetBufferLevel    : 'buffer'
			, GetCaptureRate    : 'capture'
			, GetClippedSamples : 'clipped'
			, GetProcessingLoad : 'load'
			, GetRateAdjust     : 'rate'
		}
		V.wscamilla           = new WebSocket( 'ws://'+ window.location.host +':1234' );
		V.wscamilla.onready   = () => { // custom
			util.wsGetConfig();
			V.intervalstatus = setInterval( () => {
				if ( V.local ) return
				
				[ 'GetState', 'GetBufferLevel', 'GetCaptureRate', 'GetClippedSamples', 'GetProcessingLoad' ].forEach( k => {
					V.wscamilla.send( '"'+ k +'"' );
				} );
				if ( S.enable_rate_adjust ) V.wscamilla.send( '"GetRateAdjust"' );
			}, 1000 );
		}
		V.wscamilla.onopen    = () => {
			websocketReady( V.wscamilla );
		}
		V.wscamilla.onclose   = () => {
			render.vuClear();
			clearInterval( V.intervalstatus );
		}
		V.wscamilla.onmessage = response => {
			var data    = JSON.parse( response.data );
			var cmd     = Object.keys( data )[ 0 ];
			var value   = data[ cmd ].value;
			var cp, v;
			switch ( cmd ) {
				case 'GetSignalLevels':
					[ 'playback_peak', 'playback_rms', 'capture_peak', 'capture_rms' ].forEach( k => {
						cp = k[ 0 ];
						value[ k ].forEach( ( val, i ) => {
							v = util.db2percent( val );
							if ( k.slice( -1 ) === 's' ) {
								$( '.rms.'+ cp + i ).css( 'width', v +'%' );
							} else {
								$( '.peak.'+ cp + i ).css( 'left', v +'%' );
								if ( val > 0 ) {
									if ( ! V.timeoutred ) return
									
									clearTimeout( V.timeoutred );
									V.timeoutred = false;
									$( '.peak, .clipped' )
										.css( 'transition-duration', '0s' )
										.addClass( 'red' );
								} else {
									if ( V.timeoutred ) return
									
									V.timeoutred = setTimeout( () => {
										$( '.peak, .clipped' )
											.css( 'transition-duration', '' )
											.removeClass( 'red' );
									}, 200 );
								}
							}
						} );
					} );
					break;
				case 'GetBufferLevel':
				case 'GetCaptureRate':
				case 'GetProcessingLoad':
				case 'GetRateAdjust':
					if ( S.state !== 'play' ) {
						render.vuClear();
						return
					}
					
					$( '#divstate .'+ cmd_el[ cmd ] ).text( value.toLocaleString() );
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
					if ( 'intervalvu' in V || S.state !== 'play' ) return
					
					$( '.peak' ).css( { background: 'var( --cm )', 'transition-duration': '0s' } );
					setTimeout( () => $( '.peak' ).css( 'transition-duration', '' ), 200 );
					V.intervalvu = setInterval( () => V.wscamilla.send( '"GetSignalLevels"' ), 100 );
					break;
				case 'GetConfigJson':
					S.config = JSON.parse( value );
					DEV = S.config.devices;
					FIL = S.config.filters;
					MIX = S.config.mixers;
					PIP = S.config.pipeline;
					PRO = S.config.processors;
					[ 'capture_samplerate', 'enable_rate_adjust', 'resampler', 'stop_on_rate_change' ].forEach( k => {
						S[ k ] = ! [ null, false ].includes( DEV[ k ] );
					} );
					if ( ! $( '#data' ).hasClass( 'hide' ) ) $( '#data' ).html( highlightJSON( S ) );
					render.page();
					render.tab();
					break;
				case 'GetConfigFilePath':
					S.configname = value.split( '/' ).pop();
					break;
				case 'GetSupportedDeviceTypes':
					S.devicetype = { 
						  capture  : value[ 1 ].sort()
						, playback : value[ 0 ].sort()
					};
					var type = {};
					[ 'capture', 'playback' ].forEach( k => {
						type[ k ] = {};
						S.devicetype[ k ].forEach( t => {
							v = render.typeReplace( t );
							type[ k ][ v ] = t; // [ 'Alsa', 'Bluez' 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
						} );
					} );
					Dlist.typeC[ 2 ]   = type.capture;
					Dlist.typeP[ 2 ]   = type.playback;
					Dlist.deviceC[ 2 ] = S.devices.capture;
					Dlist.deviceP[ 2 ] = S.devices.playback;
					showContent();
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
	, wsGetConfig  : () => {
		setTimeout( () => {
			[ 'GetConfigFilePath', 'GetConfigJson', 'GetSupportedDeviceTypes' ].forEach( cmd => V.wscamilla.send( '"'+ cmd +'"' ) );
		}, V.wscamilla.readyState === 1 ? 0 : 300 ); 
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#volume' ).on( 'touchstart mousedown', function( e ) {
	V.start = true;
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.start ) return
	
	V.drag = true;
	util.volume( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.start ) return
	
	V.drag ? volumePush() : util.volume( e.pageX || e.changedTouches[ 0 ].pageX );
	V.start = false;
	setTimeout( () => V.drag = false, 1000 );
} ).on( 'mouseleave', function() {
	if ( V.start ) $( '#volume' ).trigger( 'mouseup' );
} );
$( '#voldn, #volup' ).on( 'click', function() {
	var up = this.id === 'volup';
	if ( ( ! up && S.volume === 0 ) || ( up && S.volume === 100 ) ) return
	
	up ? S.volume++ : S.volume--;
	volumePush( S.volume );
	volumeSetAt();
	$( '#volume-text' ).text( S.volume );
} ).on( 'touchend mouseup', function() {
	clearInterval( V.intervalvolume );
	volumePush();
} ).on( 'mouseleave', function() {
	if ( V.press ) $( '#voldn' ).trigger( 'mouseup' );
} ).press( function( e ) {
	var up           = e.target.id === 'volup';
	V.intervalvolume = setInterval( () => {
		up ? S.volume++ : S.volume--;
		volumeSetAt();
		util.volumeThumb();
		$( '#volume-text' ).text( S.volume );
		if ( S.volume === 0 || S.volume === 100 ) {
			clearInterval( V.intervalvolume );
			volumePush();
		}
	}, 100 );
} );
$( '#volmute' ).on( 'click', function() {
	S.volumemute ? volumePush( S.volumemute, 'unmute' ) : volumePush( S.volume, 'mute' );
	volumeSet( S.volumemute, 'toggle' );
} );
$( '#filters, #mixers' ).on( 'click', '.divgain i', function() {
	var $this = $( this );
	var cmd   = $this.prop( 'class' ).replace( ' bl', '' ).slice( 2 );
	if ( [ 'inverted', 'linear' ].includes( cmd ) ) {
		var linear = cmd === 'linear';
		var name   = $this.parents( 'li' ).data( 'name' );
		var val    = ! $this.hasClass( 'bl' );
		$this.toggleClass( 'bl', val );
		if ( linear ) val = val ? 'linear' : 'dB';
		FIL[ name ].parameters[ linear ? 'scale' : 'inverted' ] = val;
		setting.save( 'Gain', 'Change ...' );
		return
	} else if ( cmd === 'inverted' ) {
		
	}
	
	if ( $this.parent().hasClass( 'disabled' ) ) return
	
	clearTimeout( V.timeoutgain );
	var $gain = $this.parent().prev();
	var val   = +$gain.val();
	if ( cmd === 'set0' ) {
		if ( val === 0 ) return
		
		val  = 0;
	} else if ( cmd === 'minus' ) {
		if ( val === $gain.prop( 'min' ) ) return
		
		val -= 0.1;
	} else if ( cmd === 'plus' ) {
		if ( val === $gain.prop( 'max' ) ) return
		
		val += 0.1;
	}
	$gain
		.val( val )
		.trigger( 'input' );
	if ( V.li.find( '.divgraph' ).length || $( '#pipeline .divgraph' ).length ) graph.gain();
} ).on( 'touchend mouseup mouseleave', function() {
	clearInterval( V.intervalgain );
} ).press( '.divgain i', function( e ) {
	var $this = $( e.currentTarget );
	var $gain = $this.parent().prev();
	var val   = +$gain.val();
	var up    = $this.hasClass( 'i-plus' );
	V.intervalgain = setInterval( () => {
		val = up ? val + 0.1 : val - 0.1;
		$gain.val( val ).trigger( 'input' );
	}, 100 );
} );
$( '#divstate' ).on( 'click', '.clipped', function() {
	local( 2000 );
	$( '.divclipped' ).addClass( 'hide' );
	V.wscamilla.send( '"ResetClippedSamples"' );
} );
$( '#configuration' ).on( 'input', function() {
	if ( V.local ) return
	
	var name = $( this ).val();
	var path = '/srv/http/data/camilladsp/configs'+ ( S.bluetooth ? '-bt/' : '/' ) + name;
	bash( [ 'confswitch', path, 'CMD PATH' ], () => {
		V.wscamilla.send( '{ "SetConfigFilePath": "'+ path +'" }' );
		V.wscamilla.send( '"Reload"' );
		S.configname = name;
		setTimeout( () => util.wsGetConfig(), 300 );
	} );
	notify( 'camilladsp', 'Configuration', 'Switch ...' );
} );
$( '#setting-configuration' ).on( 'click', function() {
	$( '#tabconfig' ).trigger( 'click' );
} );
$( '#divtabs' ).on( 'click', '.graphclose', function() {
	var $this = $( this );
	var $li   = $this.parents( 'li' );
	$this.parent().remove();
	var val = $li.data( V.tab === 'filters' ? 'name' : 'index' );
	V.graph[ V.tab ] = V.graph[ V.tab ].filter( v => v !== val );
} );
$( '.headtitle' ).on( 'click', '.i-folder-filter', function() {
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
	var $flowchart = $( '.flowchart' );
	if ( $flowchart.hasClass( 'hide' ) ) {
		if ( typeof d3 !== 'object' ) {
			$.when(
				$.getScript( '/assets/js/pipelineplotter.js' ),
				$.getScript( '/assets/js/plugin/'+ jfiles.d3 ),
				$.Deferred( deferred => deferred.resolve() )
			).done( () => createPipelinePlot() );
		} else {
			createPipelinePlot();
		}
	} else {
		$flowchart.addClass( 'hide' );
	}
} ).on( 'click', '.i-gear', function() {
	if ( V.tab === 'devices' )  {
		setting.main();
		return
	}
	
	var max    = 150;
	var min    = -150;
	var TAB    = V.tab.toUpperCase();
	var values = {};
	[ 'MAX', 'MIN', 'STEP' ].forEach( k => values[ TAB + k ] = S.range[ TAB + k ] );
	var list   = [
		  [ 'Max',  'number', { step: 1, min: min, max: max } ]
		, [ 'Min',  'number', { step: 1, min: min, max: max } ]
		, [ 'Step', 'radio',  [ 0.1, 0.5, 1.0 ] ]
	];
	info( {
		  icon         : V.tab
		, title        : 'Gain Slider dB'
		, list         : list
		, boxwidth     : 70
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoList' ).on( 'input', 'input', function() {
				var $this = $( this );
				var val = +$this.val();
				if ( $this.index() ) { // min
					if ( val < min ) $this.val( min );
				} else {
					if ( val > max ) $this.val( max );
				}
			} );
		}
		, ok         : () => {
			var val = infoVal();
			$.each( val, ( k, v ) => S.range[ k ] = v );
			bash( [ 'camilla', ...Object.values( S.range ), 'CFG '+ Object.keys( S.range ).join( ' ' ) ] );
		}
	} );
} );
$( '.entries' ).on( 'click', '.liicon', function( e ) {
	e.stopPropagation();
	var $this  = $( this );
	V.li       = $this.parent();
	var active = V.li.hasClass( 'active' );
	$( '#menu' ).addClass( 'hide' );
	$( '#'+ V.tab +' li' ).removeClass( 'active' );
	if ( active ) return
	
	V.li.addClass( 'active' );
	contextMenu();
	$( '#menu .graph' ).toggleClass( 'hide', ! $this.hasClass( 'graph' ) );
	$( '#menu .edit' ).toggleClass( 'hide', ! $this.hasClass( 'edit' ) );
	$( '#menu' ).find( '.copy, .rename, .view' ).toggleClass( 'hide', V.tab !== 'config' );
} ).on( 'click', '.i-back', function() {
	if ( V.tab === 'mixers' ) {
		var name = $( '#mixers .lihead' ).text();
		if ( ! MIX[ name ].mapping.length ) { // no mapping left
			delete MIX[ name ];
			setting.save( 'Mixer', 'Remove ...' );
		}
	} else if ( V.tab === 'pipeline' ) {
		if ( ! $( '#pipeline .i-filters' ).length ) {
			var pi = $( '#pipeline .lihead' ).data( 'index' );
			PIP.splice( pi, 1 );
			setting.save( 'Pipeline', 'Remove filter ...' );
		} 
	}
	$( '#'+ V.tab +' .entries.main' ).removeClass( 'hide' );
	render[ V.tab ]();
} );
$( 'body' ).on( 'click', function( e ) {
	if ( $( e.target ).hasClass( 'liicon' ) ) return
	
	$( '#menu' ).addClass( 'hide' );
	$( '#'+ V.tab +' .entries li' ).removeClass( 'active' );
} );
$( '#menu a' ).on( 'click', function( e ) {
	var $this = $( this );
	var cmd   = $this.prop( 'class' );
	if ( cmd === 'graph' ) {
		graph.plot();
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
					if ( util.inUse( name ) ) return
					
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
				case 'edit':
					setting.mixer( name );
					break;
				case 'delete':
					var dest = V.li.hasClass( 'liinput main' );
					if ( main ) {
						if ( util.inUse( name ) ) return
						
						var title = 'Mixer';
						var msg = name;
					} else if ( dest ) {
						var mi    = V.li.data( 'index' );
						var title = 'Destination';
						var msg   = '#'+ mi;
					} else {
						var mi    = V.li.siblings( '.main' ).data( 'index' );
						var title = 'Source';
						var si    = V.li.data( 'index' );
						var msg   = '#'+ si;
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
								MIX[ name ].mapping[ mi ].sources.splice( si, 1 );
							}
							setting.save( title, 'Remove ...' );
							V.li.remove();
						}
					} );
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
			var main = $( '#pipeline .entries.sub' ).hasClass( 'hide' );
			var type = main ? V.li.data( 'type' ).toLowerCase() : 'filter';
			info( {
				  icon    : V.tab
				, title   : title
				, message : main ? 'Delete this '+ type +'?' : 'Delete <wh>'+ V.li.data( 'name' ) +'</wh> ?'
				, ok      : () => {
					if ( main ) {
						var index = V.li.data( 'index' );
						PIP.splice( index, 1 );
					} else {
						var pi = $( '#pipeline .lihead' ).data( 'index' );
						var ni = V.li.data( 'index' );
						PIP[ pi ].names.splice( ni, 1 );
					}
					setting.save( title, 'Remove '+ type +' ...' );
					V.li.remove();
					setting.sortRefresh( main ? 'main' : 'sub' );
					graph.pipeline();
				}
			} );
			break;
		case 'devices':
			setting.device( V.li.data( 'type' ) );
			break;
		case 'config':
			var name = V.li.find( '.name' ).text();
			switch ( cmd ) {
				case 'copy':
					info( {
						  icon         : V.tab
						, title        : 'Configuration'
						, message      : 'File: <wh>'+ name +'</wh>'
						, list         : [ 'Copy as', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = infoVal();
							bash( [ 'confcopy', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							notify( V.tab, SW.title, 'Copy ...' );
						}
					} );
					break;
				case 'rename':
					info( {
						  icon         : V.tab
						, title        : 'Configuration'
						, list         : [ 'Rename to', 'text' ]
						, values       : [ name ]
						, checkchanged : true
						, ok           : () => {
							var newname = infoVal();
							bash( [ 'confrename', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ] );
							notify( V.tab, SW.title, 'Rename ...' );
						}
					} );
					break;
				case 'delete':
					info( {
						  icon    : V.tab
						, title   : 'Configuration'
						, message : 'Delete <wh>'+ name +'</wh> ?'
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => {
							bash( [ 'confdelete', name, S.bluetooth, 'CMD NAME BT' ] );
							notify( V.tab, SW.title, 'Delete ...' );
						}
					} );
					break;
				break;
			}
	}
} );
$( '#filters' ).on( 'click', '.i-add', function() {
	setting.upload();
} ).on( 'click', '.i-volume, .i-mute', function() {
	var $this = $( this );
	var name = $this.parents( 'li' ).data( 'name' );
	var mute = ! $this.hasClass( 'bl' );
	$this.toggleClass( 'mute bl', mute );
	FIL[ name ].parameters.mute = mute;
	setting.save( 'Gain', 'Change ...' );
} ).on( 'input', 'input[type=range]', function() {
	var $this = $( this );
	var val   = +$this.val();
	$this.prev().text( util.dbRound( val ) );
	V.li     = $this.parents( 'li' );
	var name = V.li.data( 'name' );
	FIL[ name ].parameters.gain = val;
	setting.save();
} ).on( 'touchend mouseup keyup', 'input[type=range]', function() {
	graph.gain();
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
	for ( i = 0; i < bands - 1; i++ ) {
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
$( '#mixers' ).on( 'click', 'li', function( e ) {
	var $this  = $( this );
	if ( $( e.target ).is( 'i' ) || $this.parent().hasClass( 'sub' ) ) return
	
	var name   = $this.find( '.li1' ).text();
	render.mixersSub( name );
} ).on( 'click', 'li i', function() {
	var $this  = $( this );
	if ( $this.is( '.liicon, .i-mixers, .i-back' ) || $this.parent().hasClass( 'divgain' ) ) return
	
	V.li       = $this.parents( 'li' );
	var name   = V.li.data( 'name' );
	var title  = util.key2label( V.tab );
	if ( $this.hasClass( 'i-add' ) ) {
		var index = V.li.hasClass( 'lihead' ) ? '' : V.li.data( 'index' );
		setting.mixerMap( name, index );
	} else {
		var index   = V.li.data( 'index' );
		var si      = V.li.data( 'si' );
		var mapping = MIX[ name ].mapping[ index ];
		var source  = mapping.sources[ si ];
		var checked = ! $this.hasClass( 'bl' );
		if ( $this.hasClass( 'i-volume' ) ) {
			if ( V.li.hasClass( 'main' ) ) {
				mapping.mute = checked;
			} else {
				source.mute = checked;
				V.li.find( 'input[type=range]' ).prop( 'disabled', checked );
				V.li.find( '.divgain' ).toggleClass( 'disabled', checked );
			}
			$this.toggleClass( 'mute bl', checked );
		} else if ( $this.hasClass( 'i-inverted' ) ) {
			$this.toggleClass( 'bl', checked );
			source.inverted = checked;
		} else if ( $this.hasClass( 'i-linear' ) ) {
			$this.toggleClass( 'bl', checked );
			source.scale = checked ? 'linear' : null;
		}
		setting.save( 'Mixer', 'Change ...' );
	}
} ).on( 'input', 'select', function() {
	var $this = $( this );
	V.li      = $this.parents( 'li' );
	var name  = V.li.data( 'name' );
	var mi    = V.li.data( 'index' );
	var val   = +$this.val();
	if ( V.li.hasClass( 'main' ) ) {
		MIX[ name ].mapping[ mi ].dest = val;
	} else {
		var si    = V.li.data( 'si' );
		MIX[ name ].mapping[ mi ].sources[ si ].channel = val;
	}
	setting.save( 'Mixer', 'Change ...');
} ).on( 'input', 'input[type=range]', function() {
	var $this = $( this );
	var val   = +$this.val();
	$this.prev().text( util.dbRound( val ) );
	V.li      = $( this ).parents( 'li' );
	var name  = V.li.data( 'name' );
	var index = V.li.data( 'index' );
	var si    = V.li.data( 'si' );
	MIX[ name ].mapping[ index ].sources[ si ].gain = val;
	setting.save();
} ).on( 'touchend mouseup keyup', 'input[type=range]', function() {
	graph.gain();
} );
$( '#processors' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	$( this ).find( '.liicon' ).trigger( 'click' );
} );
$( '#pipeline' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	if ( $( e.target ).is( 'i' ) || $this.parent().is( '.sub, .divgain' ) ) return
	
	var index = $this.data( 'index' );
	if ( $this.data( 'type' ) === 'Filter' ) {
		render.pipelineSub( index );
	} else {
		var names  = Object.keys( MIX );
		if ( names.length === 1 ) return
		
		var values = $this.find( '.li2' ).text();
		info( {
			  icon    : V.tab
			, title   : 'Pipeline'
			, message : values
			, list    : [ '', 'select', names ]
			, values  : values
			, ok      : () => {
				PIP[ index ].name = infoVal();
				setting.save( 'Add Mixer', 'Save ...' );
			}
		} );
	}
} ).on( 'click', 'li i', function() {
	var $this = $( this );
	if ( $this.is( '.liicon, .i-back' ) ) return
	
	V.li      = $this.parents( 'li' );
	var title = util.key2label( V.tab );
	var index = V.li.data( 'index' );
	if ( $this.hasClass( 'i-add' ) ) {
		var title = 'Add Filter';
		info( {
			  icon  : V.tab
			, title : title
			, list  : [ 'Filter', 'select', Object.keys( FIL ) ]
			, ok    : () => {
				PIP[ index ].names.push( infoVal() );
				setting.save( title, 'Save ...' );
				setting.sortRefresh( 'sub' );
				render.pipelineSub( index );
				graph.pipeline();
			}
		} );
	}
} );
$( '#devices' ).on( 'click', 'li', function() {
	setting.device( $( this ).data( 'type' ) );
} );
$( '#config' ).on( 'click', '.i-add', function() {
	setting.upload();
} ).on( 'click', 'li', function( e ) {
	if ( $( e.target ).hasClass( 'liicon' ) ) return
	
	var $this = $( this )
	var $pre  = $this.find( 'pre' );
	if ( $pre.length ) {
		$pre.toggleClass( 'hide' );
	} else {
		var dir = '/srv/http/data/camilladsp/configs';
		if ( S.bluetooth ) dir += '-bt';
		bash( [ 'statusconfiguration', dir +'/'+ $this.text(), 'CMD FILE' ], config => {
			$this.append( '<pre class="status">'+ config +'</pre>' );
		} );
	}
} );
$( '.switch' ).on( 'click', function() {
	var id = this.id;
	var $setting = $( '#setting-'+ id );
	DEV[ id ] ? setting.switchSave( id, 'disable' ) : $setting.trigger( 'click' );
} );
$( '#setting-enable_rate_adjust' ).on( 'click', function() {
	var $this = $( this );
	if ( $this.siblings( 'input' ).hasClass( 'disabled' ) ) {
		info( {
			  icon    : V.tab
			, title   : SW.title
			, message : 'Resampler type is <wh>Synchronous</wh>'
		} );
		switchCancel();
		return
	}
	
	info( {
		  icon         : V.tab
		, title        : SW.title
		, list         : [
			  [ 'Adjust period', 'number' ]
			, [ 'Target level', 'number' ]
		]
		, boxwidth     : 100
		, values       : {
			  adjust_period : DEV.adjust_period
			, target_level  : DEV.target_level
		}
		, checkchanged : S.enable_rate_adjust
		, cancel       : switchCancel
		, ok           : () => {
			var val =  infoVal();
			[ 'adjust_period', 'target_level' ].forEach( k => DEV[ k ] = val[ k ] );
			setting.switchSave( 'enable_rate_adjust' );
		}
	} );
} );
$( '#setting-stop_on_rate_change' ).on( 'click', function() {
	info( {
		  icon         : V.tab
		, title        : SW.title
		, list         : [ 'Rate mearsure interval', 'number' ]
		, boxwidth     : 65
		, values       : DEV.rate_measure_interval
		, checkchanged : S.stop_on_rate_change
		, cancel       : switchCancel
		, ok           : () => {
			DEV.rate_measure_interval = infoVal();
			setting.switchSave( 'stop_on_rate_change' );
		}
	} );
} );
$( '#setting-resampler' ).on( 'click', function() {
	setting.resampler( S.resampler ? DEV.resampler.type : 'AsyncSinc' );
} );
$( '#bar-bottom div' ).on( 'click', function() {
	V.tab = this.id.slice( 3 );
	render.tab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
