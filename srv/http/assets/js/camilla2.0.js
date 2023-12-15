// var //////////////////////////////////////////////////////////////////////////////
V            = {
	  clipped    : 0
	, graph      : { filters: {}, pipeline: {} }
	, graphlist  : {}
	, prevconfig : {}
	, sortable   : {}
	, tab        : 'filters'
}
var wscamilla;
var format   = {};
[ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ].forEach( k => {
	var key       = k
					.replace( 'FLOAT', 'Float' )
					.replace( 'TEXT',  'Text' );
	format[ key ] = k;
} );
var samplerate = [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ];
// const //////////////////////////////////////////////////////////////////////////////
var C        = {
	  format     : format
	, samplerate : samplerate
	, sampling   : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout' ]
	// filters
	, type       : [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'Gain', 'Loudness', 'DiffEq', 'Dither', 'Limiter' ] // omit Volume - use raAudio volume
	, subtype    : {
		  Biquad      : [ 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
						, 'Peaking', 'Notch', 'GeneralNotch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform', 'Free' ]
		, BiquadCombo : [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass', 'Tilt', 'GraphicEqualizer' ]
		, Conv        : [ 'Raw', 'Wav', 'Values', 'Dummy' ]
		, Dither      : [ 'None', 'Flat', 'Highpass',        'Fweighted441',  'FweightedLong441', 'FweightedShort441', 'Gesemann441', 'Gesemann48'
						, 'Lipshitz441',  'LipshitzLong441', 'Shibata441',    'ShibataHigh441',   'ShibataLow441',     'Shibata48',   'ShibataHigh48'
						, 'ShibataLow48', 'Shibata882',      'ShibataLow882', 'Shibata96',        'ShibataLow96',      'Shibata192',  'ShibataLow192' ]
	}
	, resampler  : {
		, type          : [ 'AsyncSinc', 'AsyncPoly', 'Synchronous' ]
		, AsyncSinc     : {
			  sub           : [ 'profile', 'capture_samplerate' ]
			, profile       : [ 'Accurate ', 'Balanced', 'Fast', 'VeryFast', 'Custom' ]
				, custom        : [ 'sinc_len', 'oversampling_factor', 'interpolation', 'window', 'f_cutoff' ] // f_cutoff: 0.9 - 0.99
				, interpolation : [ 'Nearest', 'Linear', 'Quadratic', 'Cubic' ]
				, window        : [ 'Hann2', 'Blackman2', 'BlackmanHarris2', 'BlackmanHarris2' ]
		}
		, AsyncPoly     : {
			  sub           : [ 'interpolation', 'capture_samplerate' ]
				, interpolation : [ 'Linear', 'Cubic', 'Quintic', 'Septic' ]
		}
		, Synchronous   : [ 'capture_samplerate' ] // not with rate_adjust enabled - AsyncSinc / AsyncPoly only
		, capture_samplerate : samplerate
	}
}
// capture / playback //////////////////////////////////////////////////////////////////////////////
var CPkv     = {
	  tc     : {
		  number : { channels: 2 }
	}
	, tcsd   : {
		  select : { device: '', format: '' }
		, number : { channels: 2 }
	}
	, wasapi : {
		  select : { device: '', format: '' }
		, number   : { channels: 2 }
		, checkbox : { exclusive: false, loopback: false }
	}
}
var CP       = {
	  capture  : {
		  Alsa      : CPkv.tcsd
		, CoreAudio : {
			  select : { device: '', format: '' }
			, number   : { channels: 2 }
			, checkbox : { change_format: false }
		}
		, Pulse     : CPkv.tcsd
		, Wasapi    : CPkv.wasapi
		, Jack      : CPkv.tc
		, Stdin     : {
			  select : { format: '' }
			, number : { channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		}
		, File      : {
			  select : { format: '' }
			, text   : { filename: '' }
			, number : { channels: 2, extra_samples: 0, skip_bytes: 0, read_bytes: 0 }
		}
	}
	, playback : {
		  Alsa      : CPkv.tcsd
		, CoreAudio : {
			  select   : { device: '', format: '' }
			, number   : { channels: 2 }
			, checkbox : { exclusive: false, change_format: false }
		}
		, Pulse     : CPkv.tcsd
		, Wasapi    : CPkv.wasapi
		, Jack      : CPkv.tc
		, Stdout    : {
			  select : { format: '' }
			, number : { channels: 2 }
		}
		, File      : {
			  select : { filename: '', format: '' }
			, number : { channels: 2 }
		}
	}
}
// filters parameters ///////////////////////////////////////////////////////////////////
var Fkv      = {
	  pass    : {
		  number : { freq: 1000, q: 0 }
	  }
	, shelf   : {
		  number : { gain: 0, freq: 1000, q: 0 }
		, radio  : [ 'Q', 'Samples' ]
	}
	, passFO  : {
		  number : { freq: 1000 }
	}
	, shelfFO : {
		  number : { gain: 0, freq: 1000 }
	}
	, notch   : {
		  number : { freq: 1000, q: 0 }
		, radio  : [ 'Q', 'Bandwidth' ]
	}
}
var F        = {
	  Lowpass           : Fkv.pass
	, Highpass          : Fkv.pass
	, Lowshelf          : Fkv.shelf
	, Highshelf         : Fkv.shelf
	, LowpassFO         : Fkv.passFO
	, HighpassFO        : Fkv.passFO
	, LowshelfFO        : Fkv.shelfFO
	, HighshelfFO       : Fkv.shelfFO
	, Peaking           : {
		  number : { gain: 0, freq: 1000, q: 0 }
		, radio  : [ 'Q', 'Bandwidth' ]
	}
	, Notch             : Fkv.notch
	, Bandpass          : Fkv.notch
	, Allpass           : Fkv.notch
	, AllpassFO         : Fkv.passFO
	, LinkwitzTransform : {
		number: { q_act: 1.5, q_target: 0.5, freq_act: 50, freq_target: 25 }
	}
	, Free              : {
		number: { a1: 0, a2: 0, b0: -1, b1: 1, b2: 0 }
	}
	, BiquadCombo       : {
		number: { order: 2, freq: 1000 }
	}
	, BiquadComboTilt   : {
		number: { gain: 0 }
	}
	, BiquadComboEQ     : {
		number: { freq_min: 20, freq_max: 20000, band: 8 }
	}
	, Raw               : { 
		  select : { filename: '' }
		, number : { skip_bytes_lines: 0, read_bytes_lines: 0 }
	}
	, Wav               : {
		  select : { filename: '' }
		, number : { channel: 0 }
	}
	, Values            : {
		  text   : { values: '1, 0, 0, 0' }
		, number : { length: 0 }
	}
	, Delay             : {
		  number   : { delay: 0 }
		, radio    : [ 'ms', 'mm', 'Samples' ]
		, checkbox : { subsample: false }
	}
	, Gain              : {
		  number   : { gain: 0 }
		, radio    : [ 'dB', 'Linear' ]
		, checkbox : { inverted: false, mute: false }
	}
	, Volume            : {
		number : { ramp_time: 200 }
		text   : { fader: 'Aux1' }
	}
	, Loudness          : {
		number: { reference_level: -25, high_boost: 7, low_boost: 7, attenuate_mid: true }
	}
	, DiffEq            : {
		text: { a: '1, 0', b: '1, 0' }
	}
	, Dither            : {
		number: { bits: 16 }
	}
	, Limter            : {
		  number   : { clip_limit: 200 }
		, checkbox : { soft_clip: false }
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
	wscamilla && wscamilla.readyState === 1 ? util.wsGetConfig() : util.webSocket();
}
function psOnClose() {
	if ( V.off ) return
	
	clearInterval( V.intervalvu );
	if ( wscamilla ) wscamilla.close();
	$( '#divstate .label' ).html( 'Buffer · Sampling' );
}
function playbackButton() {
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
	, list     : () => {
		var $divgraph = $( '#'+ V.tab +' .divgraph' );
		if ( $divgraph.length ) {
			$divgraph.each( ( i, el ) => {
				var $this = $( el );
				var val   = $this.data( 'val' );
				if ( jsonChanged( S.config[ V.tab ][ val ], V.graph[ V.tab ][ val ] ) ) {
					if ( $this.hasClass( 'hide' ) ) {       // remove - changed + hide
						$this.remove();
						return
						
					}
				}
				V.graphlist[ val ] = $this[ 0 ].outerHTML; // include in re-render
			} );
		}
	}
	, pipeline : () => {
		if ( ! $( '.flowchart' ).hasClass( 'hide' ) ) createPipelinePlot();
	}
	, plot     : ( $li ) => {
		if ( ! $li ) $li = V.li;
		$li.addClass( 'disabled' );
		if ( typeof Plotly !== 'object' ) {
			$.getScript( '/assets/js/plugin/'+ jfiles.plotly, () => graph.plot() );
			return
		}
		var filters = V.tab === 'filters';
		var val     = $li.data( filters ? 'name' : 'index' );
		V.graph[ V.tab ][ val ] = jsonClone( S.config[ V.tab ][ val ] );
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
			$divgraph.append( '<i class="i-close graphclose"></i>' );
			$li.removeClass( 'disabled' );
		}, 'json' );
	}
	, refresh  : () => {
		var $divgraph = $( '#'+ V.tab +' .divgraph' ).not( '.hide' );
		if ( $divgraph.length ) $divgraph.each( ( i, el ) => graph.plot( $( el ).parent() ) );
	}
	, toggle   : () => {
		var $divgraph = V.li.find( '.divgraph' );
		if ( ! $divgraph.length ) {
			graph.plot();
			return
		}
		
		if ( ! $divgraph.hasClass( 'hide' ) ) {
			$divgraph.addClass( 'hide' );
		} else {
			var val     = $divgraph.data( 'val' );
			if ( jsonChanged( S.config[ V.tab ][ val ], V.graph[ V.tab ][ val ] ) ) {
				graph.plot();
			} else {
				$divgraph.removeClass( 'hide' );
				elementScroll( $divgraph.parent() );
			}
		}
	}
}
var render   = {
	  page        : () => {
		if ( S.bluetooth ) S.lsconfigs = S[ 'lsconfigs-bt' ];
		if ( ! S.range ) S.range = { MIN: -10, MAX: 10 };
		S.lscoefraw = [];
		S.lscoefwav = [];
		S.lscoeffs.forEach( f => {
			f.slice( -4 ) === '.wav' ? S.lscoefwav.push( f ) : S.lscoefraw.push( f );
		} );
		$( '.container' ).removeClass( 'hide' );
		render.status();
		render[ V.tab ]();
		bannerHide();
	}
	, status      : () => {
		V.statusget   = [ 'GetState', 'GetCaptureRate', 'GetBufferLevel', 'GetProcessingLoad' ];
		if ( DEV.enable_rate_adjust ) V.statusget.push( 'GetRateAdjust' );
		if ( DEV.resampler ) V.statusget.push( 'GetRateAdjust' );
		V.statuslast = V.statusget[ V.statusget.length - 1 ];
		render.statusValue();
		$( '#divconfiguration .name' ).html( 'Configuration'+ ( S.bluetooth ? ico( 'bluetooth' ) : '' ) );
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
						+'<div class="vubar '+ k +'_peak'+ i +' peak"></div>'
						+'<div class="vubar '+ k +'_rms' + i +'"></div>';
			}
		} );
		$( '#divvu .value' ).html( vubar +'</div></div>' );
		var ch   = DEV.capture.channels > DEV.playback.channels ? DEV.capture.channels : DEV.playback.channels;
		$( '.flowchart' ).attr( 'viewBox', '20 '+ ch * 30 +' 500 '+ ch * 80 );
	}
	, statusValue : () => {
		if ( ! ( 'status' in S ) ) S.status = { GetState: blinkdot }
		playbackButton();
		var label  = [ 'Buffer', 'Load' ];
		var status = [ S.status.GetState.toLocaleString(), S.status.GetProcessingLoad ];
		if ( [ 'Running', 'Starting' ].includes( status ) ) {
			if ( DEV.enable_rate_adjust ) {
				label.push( 'Adj' );
				status.push( S.status.GetRateAdjust.toLocaleString() );
			}
		}
		label  = label.join( ' <gr>·</gr> ' );
		status = status.join( ' <gr>·</gr> ' );
		if ( S.status.GetClippedSamples ) {
			label  += '<div class="clipped">Clipped</div>';
			status += '<div class="clipped txt">'+ S.status.GetClippedSamples.toLocaleString() +'</div>';
		}
		$( '#divstate .label' ).html( label );
		$( '#divstate .value' ).html( status );
		if ( S.volume !== false ) {
			$( '#divvolume' ).removeClass( 'hide' );
			$( '#volume .thumb' ).css( 'margin-left', $( '#volume .slide' ).width() / 100 * S.volume );
			render.volume();
		} else {
			$( '#divvolume' ).addClass( 'hide' );
		}
	}
	, tab         : () => {
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
		
		if ( $( '#'+ V.tab +' .entries.main' ).is( ':empty' ) ) {
			render.prevconfig();
			render[ V.tab ]();
		} else {
			if ( ! jsonChanged( S.config[ V.tab ], V.prevconfig[ V.tab ] ) ) return
			
			render.prevconfig();
			if ( ! $( '#'+ V.tab +' .entries.main' ).hasClass( 'hide' ) ) {
				render[ V.tab ]();
			} else {
				var data = V.tab === 'mixers' ? 'name' : 'index';
				var val  = $( '#'+ V.tab +' .entries.sub .lihead' ).data( data );
				render[ V.tab +'Sub' ]( val );
			}
		}
	}
	, vu          : () => {
		$( '.peak' ).css( 'background', 'var( --cm )' );
		V.intervalvu = setInterval( () => [ 'GetSignalLevels', 'GetClippedSamples' ].forEach( k => wscamilla.send( '"'+ k +'"' ) ), 100 );
	}
	, vuClear() {
		if ( ! ( 'intervalvu' in V ) ) return
			
		clearInterval( V.intervalvu );
		delete V.intervalvu;
		$( '.peak' ).css( { left: 0, background: 'var( --cga )' } );
		$( '.rms' ).css( 'width', 0 );
	}
	, volume      : () => {
		$( '#volume-text' )
			.text( S.volumemute || S.volume )
			.toggleClass( 'bl', S.volumemute > 0 );
		$( '#divvolume .i-volume' ).toggleClass( 'mute bl', S.volumemute > 0 );
	} //---------------------------------------------------------------------------------------------
	, filters     : () => {
		graph.list();
		var data     = render.dataSort( 'filters' );
		var li       = '';
		$.each( data, ( k, v ) => li += render.filter( k, v ) );
		render.toggle( li );
		graph.refresh();
	}
	, filter      : ( k, v ) => {
		var param     = v.parameters;
		if ( 'gain' in v.parameters ) {
			var val       = util.dbRound( param.gain );
			var licontent =  '<div class="liinput"><div class="filter"><div class="li1">'+ k +'</div>'
							+'<div class="li2">'+ param.freq +'Hz '+ ( 'q' in param ? 'Q:'+ param.q : 'S:'+ param.slope ) +'</div>'
							+'</div>'
							+'<c class="db">'+ val +'</c>'
							+'<input type="range" step="0.1" value="'+ val +'" min="'+ S.range.FILTERSMIN +'" max="'+ S.range.FILTERSMAX +'">'
							+'<div class="divgain filter">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) +'</div>'
							+'</div>';
			if ( k in V.graphlist ) licontent += V.graphlist[ k ];
		} else {
			var licontent =  '<div class="li1">'+ k +'</div>'
							+'<div class="li2">'+ v.type +' · '+ render.json2string( param ) +'</div>';
		}
		return '<li data-name="'+ k +'">'+ ico( 'filters liicon edit graph' ) + licontent  +'</li>';
	}
	, filtersSub  : ( k ) => {
		var li = '<li class="lihead main files">'+ ico( 'folder-filter' ) +'FIR coefficients'+ ico( 'add' ) + ico( 'back' ) +'</li>';
		if ( S.lscoeffs.length ) S.lscoeffs.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file liicon' ) + k +'</li>' );
		render.toggle( li, 'sub' );
	} //---------------------------------------------------------------------------------------------
	, mixers      : () => {
		var data = render.dataSort( 'mixers' );
		var li = '';
		$.each( data, ( k, v ) => li+= render.mixer( k, v ) );
		render.toggle( li );
	}
	, mixer       : ( k, v ) => {
		return   '<li data-name="'+ k +'">'+ ico( 'mixers liicon edit' )
				+'<div class="li1">'+ k +'</div>'
				+'<div class="li2">In: '+ v.channels.in +' - Out: '+ v.channels.out +'</div>'
				+'</li>'
	}
	, mixersSub   : ( name ) => {
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
				var disabled = ( source.mute ? ' disabled' : '' );
				li += '<li class="liinput dest'+ i +'"'+ i_name +' dest'+ i +'" data-si="'+ si +'">'+ ico( 'input liicon' ) +'<select>'+ opts +'</select>'
					 + ico( source.mute ? 'volume mute bl' : 'volume' ) +'<c class="db">'+ val +'</c>'
					 +'<input type="range" step="0.1" value="'+ val +'" min="'+ S.range.MIXERSMIN +'" max="'+ S.range.MIXERSMAX +'" '+ disabled +'>'
					 +'<div class="divgain '+ disabled +'">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) +'</div>'
					 + ico( source.inverted ? 'inverted bl' : 'inverted' )
					 +'</li>';
			} );
		} );
		render.toggle( li, 'sub' );
		selectSet( $( '#mixers select' ) );
	} //---------------------------------------------------------------------------------------------
	, pipeline    : () => {
		graph.list();
		var li = '';
		PIP.forEach( ( el, i ) => li += render.pipe( el, i ) );
		render.toggle( li );
		render.sortable( 'main' );
		graph.refresh();
	}
	, pipe        : ( el, i ) => {
		if ( el.type === 'Filter' ) {
			var graph = 'graph';
			var each  =  '<div class="li1">' + el.type +'</div>'
						+'<div class="li2">channel '+ el.channel +': '+ el.names.join( ', ' ) +'</div>';
			if ( i in V.graphlist ) each += V.graphlist[ i ];
		} else {
			var graph = '';
			var each  = '<gr>Mixer:</gr> '+ el.name;
		}
		return '<li data-type="'+ el.type +'" data-index="'+ i +'">'+ ico( 'pipeline liicon '+ graph ) + each +'</li>'
	}
	, pipelineSub : ( index ) => {
		var data = PIP[ index ];
		var li   = '<li class="lihead main" data-index="'+ index +'">'+ ico( 'pipeline' ) +'Channel '+ data.channel + ico( 'add' ) + ico( 'back' ) +'</li>';
		data.names.forEach( ( name, i ) => li += render.pipeFilter( name, i ) );
		render.toggle( li, 'sub' );
		render.sortable( 'sub' );
	}
	, pipeFilter  : ( name, i ) => {
		return '<li data-index="'+ i +'" data-name="'+ name +'">'+ ico( 'filters liicon' )
			  +'<div class="li1">'+ name +'</div>'
			  +'<div class="li2">'+ FIL[ name ].type +' · '+ render.json2string( FIL[ name ].parameters ) +'</div>'
			  +'</li>'
	}
	, sortable    : ( el ) => {
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
		C.sampling.forEach( k => {
			labels += util.key2label( k ) +'<br>';
			values += DEV[ k ].toLocaleString() +'<br>';
		} );
		[ 'enable_rate_adjust', 'stop_on_rate_change', 'enable_resampling' ].forEach( k => S[ k ] = DEV[ k ] );
		if ( DEV.enable_rate_adjust || DEV.stop_on_rate_change || DEV.enable_resampling ) {
			labels += '<hr>';
			values += '<hr>';
			if ( DEV.enable_rate_adjust ) {
				[ 'adjust_period', 'target_level' ].forEach( k => {
					labels += util.key2label( k ) +'<br>';;
					values += DEV[ k ] +'<br>';
				} );
			}
			if ( DEV.stop_on_rate_change ) {
				labels += util.key2label( 'rate_measure_interval' ) +'<br>';;
				values += DEV.rate_measure_interval +'<br>';
			}
			if ( DEV.enable_resampling ) {
				labels += 'Resampler Type<br>';
				values += DEV.resampler.type +'<br>';
				if ( DEV.resampler.type === 'AsyncSinc' ) {
					labels += 'Profile<br>';
					values += DEV.resample.profile +'<br>';
				} else if ( DEV.resampler.type === 'AsyncPoly' ) {
					labels += 'Interpolation<br>';
					values += DEV.resample.interpolation +'<br>';
				}
				labels += 'capture_samplerate<br>';
				values += DEV.capture_samplerate;
			}
		}
		$( '#divsampling .label' ).html( labels );
		$( '#divsampling .value' ).html( values.replace( /bluealsa|Bluez/, 'BlueALSA' ) );
		switchSet();
		$( '#divenable_rate_adjust input' ).toggleClass( 'disabled', DEV.enable_resampling && DEV.resampler.type === 'Synchronous' );
	} //---------------------------------------------------------------------------------------------
	, config      : () => {
		var li  = '';
		S.lsconfigs.forEach( f => {
			li += '<li>'+ ico( 'file liicon' ) +'<a class="name">'+ f +'</a></li>';
		} );
		$( '#config .entries.main' ).html( li );
	} //---------------------------------------------------------------------------------------------
	, dataSort    : () => {
		var kv   = S.config[ V.tab ];
		var data = {};
		var keys = Object.keys( kv );
		keys.sort().forEach( k => data[ k ] = kv[ k ] );
		return data
	}
	, json2string : ( json ) => {
		return JSON.stringify( json )
					.replace( /[{"}]/g, '' )
					.replace( /type:|filename:.*\/|format:TEXT,|skip_bytes_lines:.*|read_bytes_lines:.*/g, '' )
					.replace( /,$/, '' )
					.replace( /([:,])/g, '$1 ' )
	}
	, prevconfig  : () => V.prevconfig[ V.tab ] = jsonClone( S.config[ V.tab ] )
	, toggle      : ( li, sub ) => {
		var ms = sub ? [ 'main', 'sub' ] : [ 'sub', 'main' ];
		$( '#'+ V.tab +' .entries.'+ ms[ 0 ] ).addClass( 'hide' );
		$( '#'+ V.tab +' .entries.'+ ms[ 1 ] )
			.html( li )
			.removeClass( 'hide' );
		$( '#menu' ).addClass( 'hide' );
	}
	, typeReplace : ( str ) => {
		return str
				.replace( 'Alsa', 'ALSA' )
				.replace( 'Std',  'std' )
	}
}
var setting  = {
	  filter        : ( type, subtype, name, newname ) => {
		if ( name ) {
			var ekv = { type : type }
			$.each( FIL[ name ].parameters, ( k, v ) => ekv[ k === 'type' ? 'subtype' : k ] = v );
		}
		// select
		var selectlabel = [ 'type' ];
		var select      = [ jsonClone( C.type ) ];
		var values      = { type: type }
		if ( subtype ) {
			selectlabel.push( 'subtype' )
			select.push( jsonClone( C.subtype[ type ] ) );
			values.subtype = subtype;
			var key_val    = subtype in F ? jsonClone( F[ subtype ] ) : jsonClone( F[ type ] );
		}
		if ( ! key_val ) var key_val = jsonClone( F[ type ] );
		if ( 'select' in key_val ) {
			var kv      = key_val.select;
			var k       = Object.keys( kv );
			selectlabel = [ ...selectlabel, ...k ];
			if ( [ 'Raw', 'Wav' ].includes( subtype ) ) {
				var lscoef = jsonClone( S[ subtype === 'Raw' ? 'lscoefraw' : 'lscoefwav' ] );
				select     = [ ...select, lscoef ];
			}
			if ( name ) k.forEach( key => kv[ key ] = ekv[ key ] );
			values      = { ...values, ...kv };
		}
		selectlabel     = util.labels2array( selectlabel );
		// text
		var textlabel   = [ 'name' ];
		values.name     = name || newname;
		if ( 'text' in key_val ) {
			var kv    = key_val.text;
			var k     = Object.keys( kv );
			textlabel = [ ...textlabel, ...k ];
			if ( name ) k.forEach( key => kv[ key ] = ekv[ key ] );
			values    = { ...values, ...kv };
		}
		textlabel       = util.labels2array( textlabel );
		// number
		var numberlabel = false;
		if ( 'number' in key_val ) {
			var kv      = key_val.number;
			var k       = Object.keys( kv );
			numberlabel = k;
			if ( name ) {
				k.forEach( key => {
					if ( [ 'q', 'samples' ].includes( key ) ) {
						if ( ! ( 'q' in ekv ) ) {
							delete kv.q;
							key = 'samples';
						}
						numberlabel[ numberlabel.length - 1 ] = key;
					}
					kv[ key ] = ekv[ key ];
				} );
			}
			values      = { ...values, ...kv };
			numberlabel = util.labels2array( numberlabel );
		}
		// radio - q / samples
		var radio       = false;
		if ( 'radio' in key_val ) {
			radio  = key_val.radio;
			values = { ...values, radio: numberlabel[ numberlabel.length - 1 ] };
		}
		// checkbox
		var checkbox    = false;
		if ( 'checkbox' in key_val ) {
			var kv   = key_val.checkbox;
			var k    = Object.keys( kv );
			checkbox = util.labels2array( k );
			if ( name ) k.forEach( key => kv[ key ] = ekv[ key ] );
			values   = { ...values, ...kv };
		}
		if ( 'filename' in values ) values.filename = values.filename.split( '/' ).pop();
		var title       = name ? 'Filter' : 'Add Filter';
		info( {
			  icon         : V.tab
			, title        : title
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
				var $tdname = $( '#infoContent td' ).filter( function() {
					return $( this ).text() === 'Name'
				} );
				$( '#infoContent tr' ).eq( 0 ).before( $tdname.parent() );
				var $select     = $( '#infoContent select' );
				var $selecttype = $select.eq( 0 );
				$selecttype.on( 'input', function() {
					var type    = $( this ).val();
					var subtype = type in C.subtype ? C.subtype[ type ][ 0 ] : '';
					setting.filter( type, subtype, '', infoVal().name );
				} );
				if ( $select.length > 1 ) {
					$select.eq( 1 ).on( 'input', function() {
						var type    = $selecttype.val();
						var subtype = $( this ).val();
						if ( subtype === 'Tilt' ) {
							subtype += 'Tilt';
						} else if ( subtype === 'GraphicEqualizer' ) {
							subtype += 'EQ';
						}
						setting.filter( type, subtype, '', infoVal().name );
					} );
				}
				if ( radio ) {
					var $tr    = $( '#infoContent .trradio' ).prev();
					var itr    = $tr.index()
					var $label = $tr.find( 'td' ).eq( 0 );
					var $radio = $( '#infoContent input:radio' );
					$radio.on( 'input', function() {
						var val       = $( this ).filter( ':checked' ).val();
						I.keys[ itr ] = val.toLowerCase();
						$label.text( val );
					} );
				}
			}
			, ok           : () => {
				var val     = infoVal();
				var newname = val.name;
				type        = val.type;
				subtype     = val.subtype;
				var param   = { type: subtype };
				[ 'name', 'type', 'subtype', 'radio' ].forEach( k => delete val[ k ] );
				$.each( val, ( k, v ) => param[ k ] = v );
				if ( 'filename' in param ) {
					param.filename = '/srv/http/data/camilladsp/coeffs/'+ param.filename;
					if ( subtype === 'Raw' ) param.format = 'TEXT';
				}
				FIL[ newname ] = { type: type, parameters : param }
				if ( name !== newname ) {
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
	, mixer         : ( name ) => {
		var title = name ? 'Mixer' : 'Add Mixer'
		info( {
			  icon         : V.tab
			, title        : title
			, message      : name ? 'Rename <wh>'+ name +'</wh> to:' : ''
			, textlabel    : 'Name'
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
		var option = {
			  dest   : htmlOption( DEV.playback.channels )
			, source : htmlOption( DEV.capture.channels )
		}
		var trdest   = `
	<tr class="trsource">
		<td><select data-k="dest">${ option.dest }</select></td>
	</tr>
	<tr style="height: 10px"></tr>
	`;
		var trsource = `
	<tr class="trhead">
		<td>Source</td><td>Gain</td><td>Mute</td><td>Invert</td>
	</tr>
	<tr style="height: 10px"></tr>
	<tr class="trsource">
		<td><select data-k="channel">${ option.source }</select></td><td><input type="number" data-k="gain" value="0"></td>
		<td><input type="checkbox" data-k="mute"></td><td><input type="checkbox" data-k="inverted">
	</tr>
	`;
		
		if ( index === '' ) {
			var title = 'Add Destination';
			info( {
				  icon         : V.tab
				, title        : title
				, content      : '<table class="tablemapping">'+ trdest + trsource +'</table>'
				, contentcssno : true
				, values       : [ MIX[ name ].mapping.length, 0, 0, false, false ]
				, checkblank   : true
				, ok           : () => {
					var s = {}
					$( '.trsource' ).find( 'select, input' ).each( ( i, el ) => {
						var $this = $( el )
						s[ $this.data( 'k' ) ] = $this.is( ':checkbox' ) ? $this.prop( 'checked' ) : +$this.val();
					} );
					var mapping = {
						  dest    : +$( '.trsource select' ).val()
						, mute    : false
						, sources : [ s ]
					}
					MIX[ name ].mapping.push( mapping );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		} else {
			var title = 'Add Source';
			info( {
				  icon         : V.tab
				, title        : title
				, content      : '<table class="tablemapping">'+ trsource +'</table>'
				, contentcssno : true
				, values       : [ 0, 0, false, false ]
				, checkblank   : true
				, ok           : () => {
					var s = {}
					$( '.trsource' ).find( 'select, input' ).each( ( i, el ) => {
						var $this = $( el )
						s[ $this.data( 'k' ) ] = $this.is( ':checkbox' ) ? $this.prop( 'checked' ) : +$this.val();
					} );
					MIX[ name ].mapping[ index ].sources.push( s );
					setting.save( title, 'Save ...' );
					render.mixersSub( name );
				}
			} );
		}
	} //---------------------------------------------------------------------------------------------
	, pipeline      : () => {
		var filters = Object.keys( FIL );
		info( {
			  icon        : V.tab
			, title       : 'Add Pipeline'
			, tablabel    : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab         : [ '', setting.pipelineMixer ]
			, selectlabel : [ 'Channel', 'Filters' ]
			, select      : [ [ ...Array( DEV.playback.channels ).keys() ], filters ]
			, beforeshow  : () => {
				$( '#infoContent .select2-container' ).eq( 0 ).addClass( 'channel' )
				$( '#infoContent td' ).last().append( ico( 'add' ) );
				var tradd = '<tr class="trlist"><td></td><td><input type="text" disabled value="VALUE">'+ ico( 'remove' ) +'</td></tr>';
				$( '#infoContent' ).on( 'click', '.i-add', function() {
					$( '#infoContent table' ).append( tradd.replace( 'VALUE', $( '#infoContent select' ).eq( 1 ).val() ) );
				} ).on( 'click', '.i-remove', function() {
					$( this ).parents( 'tr' ).remove();
				} );
			}
			, ok          : () => {
				var $input = $( '#infoContent input' );
				if ( $input.length ) {
					var names = [];
					$input.each( ( i, el ) => names.push( $( el ).val() ) );
				} else {
					var names = filters[ 0 ];
				}
				PIP.push( {
					  type    : 'Filter'
					, channel : +$( '#infoContent select' ).eq( 0 ).val()
					, names   : names
				} );
				setting.pipelineSave();
			}
		} );
	}
	, pipelineMixer : () => {
		info( {
			  icon         : V.tab
			, title        : 'Add Pipeline'
			, tablabel     : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
			, tab          : [ setting.pipeline, '' ]
			, selectlabel  : 'Mixers'
			, select       : Object.keys( MIX )
			, ok          : () => {
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
	, sortRefresh   : ( k ) => {
		V.sortable[ k ].destroy();
		delete V.sortable[ k ];
		render.sortable( k );
	} //---------------------------------------------------------------------------------------------
	, device        : ( dev, type ) => {
		var key_val, kv, k, v;
		var data        = jsonClone( DEV[ dev ] );
		var type        = type || data.type;
		// select
		var selectlabel = [ 'type' ];
		var select      = [ jsonClone( C.devicetype[ dev ] ) ];
		var values      = { type: type }
		key_val         = jsonClone( CP[ dev ][ type ] );
		if ( 'select' in key_val ) {
			kv          = key_val.select;
			k           = Object.keys( kv );
			k.forEach( key => {
				if ( key === 'format' ) {
					var s = jsonClone( C.format );
					var v = { format: data.format };
				} else if ( key === 'device' ) {
					var s = jsonClone( C.devices[ dev ] );
					var v = { device: data.device };
				} else if ( key === 'filename' ) {
					var s   = S.lscoef.length ? S.lscoeffs : [ '(n/a)' ];
					var v   = { filename: data.filename };
				}
				selectlabel = [ ...selectlabel, key ];
				select      = [ ...select, s ];
				values      = { ...values, ...v };
			} );
		}
		selectlabel     = util.labels2array( selectlabel );
		// text
		var textlabel = false;
		if ( 'text' in key_val ) {
			kv        = key_val.text;
			k         = Object.keys( kv );
			textlabel = util.labels2array( k );
			k.forEach( key => {
				if ( key in data ) kv[ key ] = data[ key ];
			} );
			values    = { ...values, ...kv };
		}
		// number
		var numberlabel = false;
		if ( 'number' in key_val ) {
			kv          = key_val.number;
			k           = Object.keys( kv );
			numberlabel = util.labels2array( k );
			k.forEach( key => {
				if ( key in data ) kv[ key ] = data[ key ];
			} );
			values      = { ...values, ...kv };
		}
		// checkbox
		var checkbox    = false;
		if ( 'checkbox' in key_val ) {
			kv       = key_val.checkbox;
			k        = Object.keys( kv );
			checkbox = util.labels2array( k );
			k.forEach( key => {
				if ( key in data ) kv[ key ] = data[ key ];
			} );
			values   = { ...values, ...kv };
		}
		$.each( v, ( k, v ) => values[ k ] = v );
		var title = util.key2label( dev );
		info( {
			  icon         : V.tab
			, title        : title
			, selectlabel  : selectlabel
			, select       : select
			, textlabel    : textlabel
			, numberlabel  : numberlabel
			, checkbox     : checkbox
			, boxwidth     : 198
			, order        : [ 'select', 'text', 'number', 'checkbox' ]
			, values       : values
			, checkblank   : true
			, checkchanged : type === data.type
			, beforeshow   : () => {
				$( '#infoContent input[type=number]' ).css( 'width', '70px' );
				$( '#infoContent td:first-child' ).css( 'width', '128px' );
				var $select = $( '#infoContent select' );
				$select.eq( 0 ).on( 'input', function() {
					setting.device( dev, $( this ).val() );
				} );
			}
			, ok           : () => {
				DEV[ dev ] = infoVal();
				setting.save( title, 'Change ...' );
			}
		} );
	}
	, devicesampling : () => {
		var textlabel  = [ ...C.sampling ].slice( 1 );
		textlabel.push( 'Other' );
		var values     = {};
		C.sampling.forEach( k => values[ k ] = DEV[ k ] );
		if ( ! C.samplerate.includes( DEV.samplerate ) ) values.samplerate = 'Other';
		values.other = values.samplerate;
		var title = util.key2label( V.tab );
		info( {
			  icon         : V.tab
			, title        : title
			, selectlabel  : 'Sample Rate'
			, select       : C.samplerate
			, textlabel    : util.labels2array( textlabel )
			, boxwidth     : 120
			, order        : [ 'select', 'text' ]
			, values       : values
			, checkblank   : true
			, checkchanged : true
			, beforeshow   : () => {
				$( '.trselect' ).after( $( 'tr' ).last() );
				var $trother = $( '.trtext' ).eq( 0 );
				$trother.toggleClass( 'hide', values.samplerate !== 'Other' );
				$( '.trselect select' ).on( 'input', function() {
					setting.hidetrinfo( $trother, $( this ).val() );
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
	, resampling    : ( type ) => {
		var type        = type || DEV.ressampler.type;
		var samplerate  = DEV.capture_samplerate;
		var selectlabel = [ 'Type' ];
		var select      = [ C.typeresampler ];
		C.subtype[ type ].forEach( k => {
			selectlabel.push( key2label( k ) );
			select.push( C[ k ] );
		} );
		var numberlabel = [ 'Other' ];
		var capturerate = C.samplerate.includes( samplerate ) ? samplerate : 'Other';
		var values      = {
			  capture_samplerate : capturerate
			, other              : capturerate
		}
		info( {
			  icon         : V.tab
			, title        : SW.title
			, selectlabel  : selectlabel
			, select       : select
			, numberlabel  : numberlabel
			, boxwidth     : 160
			, order        : [ 'select', 'number' ]
			, values       : values
			, checkchanged : DEV.enable_resampling
			, beforeshow   : () => {
				var $trnumber = $( '.trnumber' );
				var $trother = $trnumber.eq( 0 );
				var indextr  = [ 0 ]
				indextr.forEach( i => $( '.trselect' ).eq( 1 ).after( $trnumber.eq( i ) ) );
				$trother.toggleClass( 'hide', values.capture_samplerate !== 'Other' );
				$( '.trselect select' ).eq( 0 ).on( 'input', function() {
					setting.resampling( $( this.val() );
				} );
				$( '.trselect select' ).eq( 1 ).on( 'input', function() {
					setting.hidetrinfo( $trother, $( this ).val() );
				} );
			}
			, cancel       : switchCancel
			, ok           : () => {
				var val = infoVal();
				if ( val.capture_samplerate === 'Other' ) val.capture_samplerate = val.other;
				C.resampler[ val.type ].forEach( k => DEV[ k ] = val[ k ] );
				setting.switchSave( 'enable_resampling' );
			}
		} );
	} //---------------------------------------------------------------------------------------------
	, hidetrinfo    : ( $trother, rate ) => {
		var other = rate === 'Other';
		$trother.toggleClass( 'hide', ! other );
		if ( ! other ) $trother.find( 'input' ).val( rate );
	}
	, switchSave    : ( id, disable ) => {
		if ( disable === 'disable' ) {
			var msg   = 'Disable ...';
			DEV[ id ] = false;
		} else {
			var msg   = DEV[ id ] ? 'Change ...' : 'Enable ...';
			DEV[ id ] = true;
		}
		setting.save( SW.title, msg );
		render.devices();
	}
	, save          : ( titlle, msg ) => {
		setTimeout( () => {
			var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
			wscamilla.send( '{ "SetConfigJson": "'+ config +'" }' );
			wscamilla.send( '"Reload"' );
			setTimeout( util.save2file, 300 );
		}, wscamilla ? 0 : 300 );
		util.webSocket(); // websocket migth be closed by setting.filter()
		if ( msg ) banner( V.tab, titlle, msg );
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
	  db2percent   : ( v ) => {
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
	, dbRound      : ( num ) => {
		return Math.round( num * 10 ) / 10
	}
	, inUse        : ( name ) => {
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
	, key2label    : ( key ) => {
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
	, labels2array : ( array ) => {
		var capitalized = array.map( el => util.key2label( el ) );
		return capitalized
	}
	, save2file    : () => {
		bash( [ 'saveconfig' ] );
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
		if ( wscamilla && wscamilla.readyState < 2 ) return
		
// GetSignalLevels          <<< CHANGED - Get***SignalRms Get***SignalPeak
// GetConfigFilePath        <<< CHANGED - GetConfigName
// SetConfigFilePath, value <<< CHANGED - SetConfigName
// GetProcessingLoad        <<< NEW
		wscamilla           = new WebSocket( 'ws://'+ window.location.host +':1234' );
		wscamilla.onready   = () => { // custom
			util.wsGetConfig();
			S.status         = { GetState: '&emsp;'+ blinkdot }
			V.intervalstatus = setInterval( () => {
				if ( ! V.local ) V.statusget.forEach( k => wscamilla.send( '"'+ k +'"' ) );
			}, 1000 );
		}
		wscamilla.onopen    = () => {
			websocketReady( wscamilla );
		}
		wscamilla.onclose   = () => {
			render.vuClear();
			clearInterval( V.intervalstatus );
			util.save2file();
			$( '#divstate .value' ).html( '&emsp;·&ensp;·&ensp;·' );
		}
		wscamilla.onmessage = response => {
			var data  = JSON.parse( response.data );
			var cmd   = Object.keys( data )[ 0 ];
			var value = data[ cmd ].value;
			var cl, cp, css, v;
			switch ( cmd ) {
				case 'GetSignalLevels':
				// { capture_peak: [ ... ], capture_rms: [ ... ], playback_peak: [ ... ], playback_rms: [ ... ] }
					V.peaks = [];
					value.val.each( ( K, V ) => {
						V.forEach( ( v, i ) => {
							val = S.volumemute && K === 'playback_rms' ? 0 : util.db2percent( v );
							$( '.'+ K + i ).css( 'width', val +'%' );
							if ( K === 'playback_peak' ) V.peaks.push( val );
						} );
					} );
					break;
				case 'GetClippedSamples':
					if ( ! ( 'status' in S ) ) return
					
					if ( ! ( 'GetClippedSamples' in S.status ) ) {
						S.status.GetClippedSamples = value;
						return
					}
					
					if ( value > S.status.GetClippedSamples ) {
						S.status.GetClippedSamples = value;
						clearTimeout( V.timeoutclipped );
						$( '.peak, .clipped.txt' )
							.css( 'transition-duration', 0 )
							.addClass( 'red' );
						// set clipped value to previous peak
						V.peaks.forEach( ( v, i ) => $( '.playback_peak' + i ).css( 'left', v +'%' ) );
						V.timeoutclipped = setTimeout( () => {
							$( '.peak, .clipped.txt' )
								.removeClass( 'red' )
								.css( 'transition-duration', '' );
						}, 1000 );
					}
					S.status.GetClippedSamples = value;
					break;
				case 'GetState':
				case 'GetCaptureRate':
				case 'GetBufferLevel':
				case 'GetRateAdjust':
					if ( ! ( 'status' in S ) ) S.status = { GetState: blinkdot }
					if ( cmd === 'GetState' ) {
						if ( value !== 'Running' ) {
							render.vuClear();
							if ( S.status.GetState !== value ) {
								S.status.GetState = value;
								render.statusValue();
							}
						} else {
							S.status.GetState = value;
							if ( ! ( 'intervalvu' in V ) ) {
								$( '.peak' ).css( 'background', '' );
								render.vu();
							}
						}
					} else {
						S.status[ cmd ] = value;
						if ( cmd === V.statuslast ) render.statusValue();
					}
					break;
				// config
				case 'GetConfigJson':
					S.config = JSON.parse( value );
					DEV = S.config.devices;
					FIL = S.config.filters;
					MIX = S.config.mixers;
					PIP = S.config.pipeline;
					[ 'enable_rate_adjust', 'stop_on_rate_change' ].forEach( k => S[ k ] = DEV[ k ] );
					if ( 'resampler' in DEV ) {
						S.enable_resampling = true;
						S.resampler         = DEV.resampler;
					} else {
						S.enable_resampling = false;
					}
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
					[ 'devices', 'devicetype' ].forEach( k => C[ k ] = { capture: {}, playback: {} } );
					[ 'capture', 'playback' ].forEach( k => {
						S.devices[ k ].forEach( d => {
							v = d.replace( /bluealsa|Bluez/, 'BlueALSA' );
							C.devices[ k ][ v ] = d;
						} );
						S.devicetype[ k ].forEach( t => {
							v = render.typeReplace( t );
							C.devicetype[ k ][ v ] = t; // [ 'Alsa', 'Bluez' 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
						} );
					} );
					showContent();
					render.status();
					render.tab();
					break;
				case 'ResetClippedSamples':
					$( '.clipped' ).remove();
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
			[ 'GetConfigFilePath', 'GetConfigJson', 'GetSupportedDeviceTypes' ].forEach( cmd => wscamilla.send( '"'+ cmd +'"' ) );
		}, wscamilla.readyState === 1 ? 0 : 300 ); 
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.close' ).on( 'click', function() {
	util.save2file();
} );
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
	if ( $this.parent().hasClass( 'disabled' ) ) return
	
	clearTimeout( V.timeoutgain );
	var $gain = $this.parent().prev();
	var $db   = $gain.prev();
	var val   = +$gain.val();
	if ( $this.hasClass( 'i-set0' ) ) {
		if ( val === 0 ) return
		
		val  = 0;
	} else if ( $this.hasClass( 'i-minus' ) ) {
		if ( val === $gain.prop( 'min' ) ) return
		
		val -= 0.1;
	} else if ( $this.hasClass( 'i-plus' ) ) {
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
	wscamilla.send( '"ResetClippedSamples"' );
} );
$( '#configuration' ).on( 'input', function() {
	if ( V.local ) return
	
	var name = $( this ).val();
	bash( [ 'confswitch', name, 'CMD NAME' ], () => {
		wscamilla.send( '{ "SetConfigFilePath": "/srv/http/data/camilladsp/configs/'+ name +'" }' );
		wscamilla.send( '"Reload"' );
		S.configname = name;
		setTimeout( () => util.wsGetConfig(), 300 );
	} );
	notify( 'camilladsp', 'Configuration', 'Switch ...' );
	V.graph  = { filters: {}, pipeline: {} }
} );
$( '#setting-configuration' ).on( 'click', function() {
	$( '#tabconfig' ).trigger( 'click' );
} );
$( '#divtabs' ).on( 'click', '.graphclose', function() {
	$( this ).parent().addClass( 'hide' );
} );
$( '.headtitle' ).on( 'click', '.i-folder-filter', function() {
	render.filtersSub();
} ).on( 'click', '.i-add', function() {
	if ( V.tab === 'filters' ) {
		setting.filter( 'Biquad', 'Lowpass' );
	} else if ( V.tab === 'mixers' ) {
		setting.mixer();
	} else if ( V.tab === 'pipeline' ) {
		setting.pipeline();
	} else if ( V.tab === 'config' ) {
		setting.upload();
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
		setting.devicesampling();
		return
	}
	
	var TAB    = V.tab.toUpperCase();
	var values = {};
	[ 'MAX', 'MIN' ].forEach( k => values[ TAB + k ] = S.range[ TAB + k ] );
	info( {
		  icon       : V.tab
		, title      : 'Gain Slider Range'
		, numberlabel : [ 'Max', 'Min' ]
		, footer      : '(50 ... -50)'
		, boxwidth   : 110
		, values     : values
		, beforeshow : () => {
			var $input = $( '#infoContent input' );
			var $max   = $input.eq( 0 );
			var $min   = $input.eq( 1 );
			$( '#infoContent' ).on( 'blur', 'input', function() {
				if ( $max.val() > 50 ) {
					$max.val( 50 );
				} else if ( $max.val() < 0 ) {
					$max.val( 0 );
				}
				if ( $min.val() < -50 ) {
					$min.val( -50 );
				} else if ( $min.val() > 0 ) {
					$min.val( 0 );
				}
			} );
		}
		, ok         : () => {
			var val = infoVal();
			[ 'MAX', 'MIN' ].forEach( k => S.range[ TAB + k ] = val[ TAB + k ] );
			$( '#'+ V.tab +' input[type=range]' ).prop( { min: S.range[ TAB +'MIN' ], max: S.range[ TAB +'MAX' ] } );
			bash( [ 'camilla', ...Object.values( S.range ), 'CFG '+ Object.keys( S.range ).join( ' ' ) ] );
		}
	} );
} );
$( '.entries' ).on( 'click', '.liicon', function() {
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
			setting.save( title, 'Remove ...' );
		}
	} else if ( V.tab === 'pipeline' ) {
		if ( ! $( '#pipeline .i-filters' ).length ) {
			var pi = $( '#pipeline .lihead' ).data( 'index' );
			PIP.splice( pi, 1 );
			setting.save( title, 'Remove filter ...' );
		} 
	}
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
		graph.toggle();
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
							, textlabel    : 'Name'
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
			var title = 'Mixer';
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
						
						var msg = name;
					} else if ( dest ) {
						var mi  = V.li.data( 'index' );
						var msg = 'output #'+ mi;
					} else {
						var mi  = V.li.siblings( '.main' ).data( 'index' );
						var si  = V.li.data( 'index' );
						var msg = 'input #'+ si;
					}
					var message = 'Delete <wh>'+ msg +'</wh> ?';
					info( {
						  icon    : V.tab
						, title   : title
						, message : message
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
		case 'pipeline':
			var main = $( '#pipeline .entries.sub' ).hasClass( 'hide' );
			var type = main ? V.li.data( 'type' ).toLowerCase() : 'filter';
			info( {
				  icon    : V.tab
				, title   : 'Pipeline'
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
					setting.save( 'Pipeline', 'Remove '+ type +' ...' );
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
						, textlabel    : 'Copy as'
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
						, textlabel    : 'Rename to'
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
			, select  : names
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
			  icon        : V.tab
			, title       : title
			, selectlabel : 'Filter'
			, select      : Object.keys( FIL )
			, ok          : () => {
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
			, message : 'Resampling type is <wh>Synchronous</wh>'
		} );
		switchCancel();
		return
	}
	
	info( {
		  icon         : V.tab
		, title        : SW.title
		, numberlabel  : [ 'Adjust period', 'Target level' ]
		, boxwidth     : 100
		, values       : {
			  adjust_period       : DEV.adjust_period
			, target_level        : DEV.target_level
		}
		, checkchanged : DEV.enable_rate_adjust
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
		, numberlabel  : 'Rate mearsure interval'
		, boxwidth     : 65
		, values       : DEV.rate_measure_interval
		, checkchanged : DEV.stop_on_rate_change
		, cancel       : switchCancel
		, ok           : () => {
			DEV.rate_measure_interval = infoVal();
			setting.switchSave( 'stop_on_rate_change' );
		}
	} );
} );
$( '#setting-enable_resampling' ).on( 'click', function() {
	setting.resampling();
} );
$( '#bar-bottom div' ).on( 'click', function() {
	V.tab = this.id.slice( 3 );
	render.tab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
