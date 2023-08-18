// var //////////////////////////////////////////////////////////////////////////////
V            = {
	  clipped    : 0
	, graph      : { filters: {}, pipeline: {} }
	, graphlist  : {}
	, graphplot  : []
	, prevconfig : {}
	, sortable   : {}
	, tab        : 'filters'
}
var default_v = {
	range : {
		  VOLUMEMIN : -50
		, VOLUMEMAX : 0
		, GAINMIN   : -10
		, GAINMAX   : 10
	}
}
var ws;
var format   = {};
[ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ].forEach( k => {
	var key       = k
					.replace( 'FLOAT', 'Float' )
					.replace( 'TEXT',  'Text' );
	format[ key ] = k;
} );
// const //////////////////////////////////////////////////////////////////////////////
var C        = {
	  format     : format
	, freeasync  : {
		  keys          : [ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ]
		, interpolation : [ 'Cubic', 'Linear', 'Nearest' ]
		, window        : [ 'Blackman', 'Blackman2', 'BlackmanHarris', 'BlackmanHarris2', 'Hann', 'Hann2' ]
	}
	, samplerate : [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ]
	, sampletype : [ 'AccurateAsync', 'BalancedAsync', 'FastAsync', 'FreeAsync', 'Synchronous' ]
	, sampling   : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout' ]
	, signal     : [ 'GetCaptureSignalPeak', 'GetCaptureSignalRms', 'GetPlaybackSignalPeak', 'GetPlaybackSignalRms', 'GetClippedSamples' ]
	, subtype    : {
		  Biquad      : [ 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
						, 'Peaking', 'Notch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform', 'Free' ]
		, BiquadCombo : [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass' ]
		, Conv        : [ 'Raw', 'Wave', 'Values' ]
		, Dither      : [ 'Simple', 'Uniform', 'Lipshitz441', 'Fweighted441', 'Shibata441', 'Shibata48', 'None' ]
	}
	, type       : [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'Gain', 'Volume', 'Loudness', 'DiffEq', 'Dither' ]
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
// filters //////////////////////////////////////////////////////////////////////////////
var Fkv      = {
	  pass    : {
		  number : { freq: 1000, q: 0.5 }
	  }
	, shelf   : {
		  number : { gain: 6, freq: 1000, q: 6 }
		, radio  : [ 'Q', 'Samples' ]
	}
	, passFO  : {
		  number : { freq: 1000 }
	}
	, shelfFO : {
		  number : { gain: 6, freq: 1000 }
	}
	, notch   : {
		  number : { freq: 1000, q: 0.5 }
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
		  number : { gain: 6, freq: 1000, q: 1.5 }
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
// graph //////////////////////////////////////////////////////////////////////////////
var color    = {
	  g  : 'hsl( 100, 90%,  30% )'
	, gd : 'hsl( 100, 90%,  20% )'
	, gr : 'hsl( 200, 3%,   30% )'
	, grd: 'hsl( 200, 3%,   20% )'
	, m  : 'hsl( 200, 100%, 40% )'
	, md : 'hsl( 200, 100%, 20% )'
	, o  : 'hsl( 30,  80%,  50% )'
	, od : 'hsl( 30,  80%,  20% )'
	, r  : 'hsl( 0,   70%,  50% )'
	, rd : 'hsl( 0,   70%,  20% )'
	, w  : 'hsl( 200, 3%,   60% )'
	, wl : 'hsl( 200, 3%,   80% )'
}
var plots    = {
	  gain    : {
		  yaxis : 'y'
		, type : 'scatter'
		, name : 'Gain'
		, line : { width : 4, color: color.m, shape: 'spline' }
	}
	, phase   : {
		  yaxis : 'y2'
		, type  : 'scatter'
		, name  : 'Phase'
		, line : { width : 2, color : color.r }
	}
	, delay   : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Delay'
		, line : { width : 2, color: color.o }
	}
	, impulse : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Impulse'
		, line : { width : 1, color: color.o }
	}
	, time    : {
		  yaxis : 'y4'
		, type  : 'scatter'
		, name  : 'Time'
		, line : { width : 1, color: color.g }
	}
}
var ycommon  = {
	  overlaying : 'y'
	, side       : 'right'
	, anchor     : 'free'
	, autoshift  : true
}
var axes     = {
	  freq    : {
		  title     : {
			  text     : 'Frequency'
			, font     : { color: color.wl }
			, standoff : 10
		}
		, tickfont  : { color: color.wl }
		, tickvals  : [ 0, 232, 464, 696, 928 ]
		, ticktext  : [ '', '10Hz', '100Hz', '1kHz', '10kHz' ]
		, range     : [ 10, 1000 ]
		, gridcolor : color.grd
	}
	, gain    : {
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
	, gainx   : {
		  title        : {
			  text     : ''
			, font     : { color: '#000' }
			, standoff : 0
		}
		, tickfont      : { color: '#000' }
		, zerolinecolor : '#000'
		, linecolor     : '#000'
		, gridcolor     : '#000'
	}
	, phase   : {
		  title      : {
			  text     : 'Phase'
			, font     : { color: color.r }
			, standoff : 0
		}
		, tickfont      : { color: color.r }
		, overlaying    : 'y'
		, side          : 'right'
		, range         : [ -190, 193 ]
		, tickvals      : [ -180, -90, 0, 90, 180 ]
		, ticktext      : [ 180, 90, 0, 90, 180 ]
		, zerolinecolor : color.w
		, linecolor     : color.rd
		, gridcolor     : color.rd
	}
	, delay   : {
		  title      : {
			  text     : 'Delay'
			, font     : { color: color.o }
			, standoff : 5
		}
		, tickfont      : { color: color.o }
		, shift         : 10
		, zerolinecolor : color.w
		, linecolor     : color.od
		, gridcolor     : color.od
		, ...ycommon
	}
	, impulse : {
		  title      : {
			  text     : 'Impulse'
			, font     : { color: color.g }
			, standoff : 5
		}
		, tickfont   : { color: color.g }
		, linecolor  : color.gd
		, gridcolor  : color.gd
		, ...ycommon
	}
	, time    : {
		  title      : {
			  text     : 'Time'
			, font     : { color: color.o }
			, standoff : 5
		}
		, tickfont   : { color: color.o }
		, shift      : 10
		, linecolor  : color.od
		, gridcolor  : color.od
		, ...ycommon
	}
}

// functions //////////////////////////////////////////////////////////////////////////////
function renderPage() { // common from settings.js
	render.page();
}
function pushstreamDisconnect() { // from common.js
	if ( ws ) ws.close();
}

var gain     = {
	  mute      : ( mute ) => {
		var set = false;
		if ( typeof mute === 'boolean' ) { //set
			S.mute  = mute;
			ws.send( '{ "SetMute": '+ S.mute +'} ' );
		} else { // status
			mute    = S.mute;
		}
		$( '#divvolume .i-mute' ).toggleClass( 'bl', mute );
		$( '#volume' ).prop( 'disabled', mute );
		$( '#divvolume .divgain' ).toggleClass( 'disabled', mute );
	}
}
var graph    = {
	  list     : () => {
		var $divgraph = $( '#'+ V.tab +' .divgraph' );
		if ( $divgraph.length ) {
			V.graphplot = [];
			$divgraph.each( ( i, el ) => {
				var $this = $( el );
				var val   = $this.data( 'val' );
				if ( jsonChanged( S.config[ V.tab ][ val ], V.graph[ V.tab ][ val ] ) ) {
					if ( $this.hasClass( 'hide' ) ) {       // remove - changed + hide
						$this.remove();
						return
					}
					
					V.graphplot.push( val );               // refresh after re-render tab
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
		var tab     = $li.data( 'name' ) ? 'filters' : 'pipeline';
		var filters = tab === 'filters';
		var val     = $li.data( filters ? 'name' : 'index' );
		V.graph[ tab ][ val ] = jsonClone( S.config[ tab ][ val ] );
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
		notify( tab, util.key2label( tab ), 'Plot ...' );
		bash( [ 'settings/camilla.py', tab +' '+ val ], data => {
			var options   = {
				  displayModeBar : false
				, scrollZoom     : true
			}
			if ( filterdelay ) {
				plots.gain.y = 0;
				plots.phase.line.width = 1;
			} else {
				plots.gain.y = data.magnitude;
				plots.phase.line.width = filters ? 4 : ( pipelinedelay ? 1 : 2 );
			}
			plots.phase.y = data.phase;
			plots.delay.y = delay0 ? 0 : data.groupdelay;
			var plot      = [ plots.gain, plots.phase, plots.delay ];
			var layout    = {
				  xaxis         : axes.freq
				, yaxis         : axes.gain
				, yaxis2        : axes.phase
				, yaxis3        : axes.delay
				, margin        : { t: 0, r: 40, b: 90, l: 45 }
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
			if ( 'impulse' in data ) { // Conv
				plots.impulse.y = data.impulse;
				plots.time.y    = data.time;
				layout.yaxis3   = axes.impulse;
				layout.yaxis4   = axes.time;
				plot.push( plots.impluse, plots.time );
			}
			if ( ! $li.find( '.divgraph' ).length ) $li.append( '<div class="divgraph" data-val="'+ val +'"></div>' );
			var $divgraph = $li.find( '.divgraph' );
			Plotly.newPlot( $divgraph[ 0 ], plot, layout, options );
			$svg = $divgraph.find( 'svg' );
			$svg.find( '.plot' ).before( $svg.find( '.overplot' ) );
			bannerHide();
			$divgraph.append( '<i class="i-close graphclose"></i>' );
			$li.removeClass( 'disabled' );
		}, 'json' );
	}
	, refresh  : () => {
		if ( V.graphplot.length ) V.graphplot.forEach( n => graph.plot( $( '#filters li[data-name='+ n +']' ) ) );
		V.graphplot = [];
		V.graphlist = {}
	}
	, gain     : () => {
		var $divgraph = V.li.find( '.divgraph' );
		if ( ! $divgraph.length ) return
		
		$divgraph.hasClass( 'hide' ) ? $divgraph.remove() : graph.plot();
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
			jsonChanged( S.config[ V.tab ][ val ], V.graph[ V.tab ][ val ] ) ? graph.plot() : $divgraph.removeClass( 'hide' );
		}
	}
}
var render   = {
	  page        : () => {
		if ( V.local ) return
		
		DEV = S.config.devices;
		FIL = S.config.filters;
		MIX = S.config.mixers;
		PIP = S.config.pipeline;
		render.status();
		render.tab();
		showContent();
		[ 'devices', 'devicetype' ].forEach( k => C[ k ] = { capture: {}, playback: {} } );
		[ 'capture', 'playback' ].forEach( k => {
			S.devices[ k ].forEach( d => {
				var v = d
							.replace( 'bluealsa', 'BlueALSA' )
							.replace( 'Bluez',    'BlueALSA' );
				C.devices[ k ][ v ] = d;
			} );
			S.devicetype[ k ].forEach( t => {
				var v = t
							.replace( 'Alsa',     'ALSA' )
							.replace( 'Std',      'std' );
				C.devicetype[ k ][ v ] = t; // [ 'Alsa', 'Bluez' 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
			} );
		} );
		S.lscoefraw = [];
		S.lscoefwav = [];
		S.lscoef.forEach( f => {
			f.slice( -4 ) === '.wav' ? S.lscoefwav.push( f ) : S.lscoefraw.push( f );
		} );
		if ( S.bluetooth ) S.lsconf = S.lsconfbt;
		if ( ! S.range ) S.range = default_v.range;
	}
	, tab         : () => {
		var title = util.key2label( V.tab );
		if ( V.tab === 'filters' ) {
			title += ico( 'folder-open' );
		} else if ( V.tab === 'pipeline' && PIP.length ) {
			title += ico( 'flowchart' );
		}
		title    += ico( V.tab === 'devices' ? 'gear' : 'add' );
		$( '#divsettings .headtitle' ).eq( 0 ).html( title );
		$( '.tab' ).addClass( 'hide' );
		$( '#'+ V.tab ).removeClass( 'hide' );
		$( '#bar-bottom div' ).removeClass( 'active' );
		$( '#tab'+ V.tab ).addClass( 'active' );
		if ( $( '#'+ V.tab +' .entries.main' ).is( ':empty' ) ) {
			render.prevconfig();
			render[ V.tab ]();
		} else {
			if ( V.tab === 'devices' ) {
				render.devices();
				return
			} else if ( V.tab === 'filters' && ! $( '#filters .entries.sub' ).hasClass( 'hide' ) ) {
				render.filtersSub();
				return
			}
			
			render.prevconfig();
			if ( $( '#'+ V.tab +' .entries.sub.hide' ).length ) {
				render[ V.tab ]();
			} else {
				var data = V.tab === 'mixers' ? 'name' : 'index';
				var val  = $( '#'+ V.tab +' .entries.sub .lihead' ).data( data );
				render[ V.tab +'Sub' ]( val );
			}
		}
	}
	, status      : () => {
		if ( ! ws ) util.websocket();
		V.statusget   = [ 'GetConfigName', 'GetVolume', 'GetMute', 'GetState', 'GetCaptureRate', 'GetBufferLevel' ]; // Clipped samples already got by signals
		if ( DEV.enable_rate_adjust ) V.statusget.push( 'GetRateAdjust' );
		V.statuslast = V.statusget[ V.statusget.length - 1 ];
		render.statusValue();
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
			var cp = k[ 0 ].toUpperCase();
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
		var label  = 'Buffer · Sampling';
		var status = S.status.GetState;
		if ( [ 'Running', 'Starting' ].includes( status ) ) {
			status = [];
			[ 'GetBufferLevel', 'GetCaptureRate' ].forEach( k => status.push( S.status[ k ].toLocaleString() ) );
			if ( DEV.enable_rate_adjust ) {
				label  += ' · Adj';
				status.push( S.status.GetRateAdjust.toLocaleString() );
			}
			status = status.join( ' <gr>·</gr> ' );
		}
		var clipped = S.status.GetClippedSamples;
		S.clipped > clipped ? S.clipped = 0 : clipped = clipped - S.clipped;
		if ( clipped ) {
			label  += '<br>Clipped';
			status += '<br><a class="clipped">'+ clipped.toLocaleString() +'</a>';
		}
		$( '#divstate .label' ).html( label );
		$( '#divstate .value' ).html( status );
		render.volume();
		$( '#divconfiguration .name' ).html( 'Configuration'+ ( S.bluetooth ? ico( 'bluetooth' ) : '' ) );
		$( '#configuration' )
			.html( htmlOption( S.lsconf ) )
			.val( S.configname );
	}
	, volume      : () => {
		V.volume = false;
		PIP.forEach( p => {
			if ( p.type !== 'Filter' ) return
			
			p.names.forEach( n => {
				if ( FIL[ n ].type === 'Volume' ) {
					V.volume = true;
					return false
				}
			} );
			if ( V.volume ) return false
		} );
		if ( V.volume ) {
			$( '#gain' ).text( util.dbRound( S.volume ) );
			$( '#volume' )
				.prop( { min: S.range.VOLUMEMIN, max: S.range.VOLUMEMAX } )
				.val( S.volume );
			gain.mute();
			$( '#divvolume' ).removeClass( 'hide' );
		} else {
			$( '#divvolume' ).addClass( 'hide' );
		}
	}
	, vu          : () => {
		$( '.peak' ).css( 'background', 'var( --cm )' );
		V.intervalvu = setInterval( () => C.signal.forEach( k => ws.send( '"'+ k +'"' ) ), 100 );
	}
	, vuClear() {
		if ( ! ( 'intervalvu' in V ) ) return
			
		clearInterval( V.intervalvu );
		delete V.intervalvu;
		$( '.peak' ).css( { left: 0, background: 'var( --cga )' } );
		$( '.rms' ).css( 'width', 0 );
	} //---------------------------------------------------------------------------------------------
	, filters     : () => {
		graph.list();
		var data     = render.dataSort( 'filters' );
		var li       = '';
		var classvol = S.mute ? 'infobtn-primary' : '';
		var iconvol  = S.mute ? 'mute' : 'volume';
		var step_val = ' step="0.1" value="'+ util.dbRound( S.volume ) +'"';
		var li       = '';
		$.each( data, ( k, v ) => li += render.filter( k, v ) );
		$( '#filters input[type=range]' ).prop( { min: S.range.GAINMIN, max: S.range.GAINMAX } );
		render.toggle( li );
		graph.refresh();
	}
	, filter      : ( k, v ) => {
		if ( 'gain' in v.parameters ) {
			var param     = v.parameters;
			var val       = util.dbRound( param.gain );
			var licontent =  '<div class="liinput"><div class="filter"><div class="li1">'+ k +'</div>'
							+'<div class="li2">'+ param.freq +'Hz '+ ( 'q' in param ? 'Q:'+ param.q : 'S:'+ param.slope ) +'</div>'
							+'</div>'
							+'<c class="db">'+ val +'</c>'
							+'<input type="range" step="0.1" value="'+ val +'" min="'+ S.range.GAINMIN +'" max="'+ S.range.GAINMAX +'">'
							+'<div class="divgain filter">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) +'</div>'
							+'</div>';
			if ( k in V.graphlist ) licontent += V.graphlist[ k ];
		} else {
			var licontent =  '<div class="li1">'+ k +'</div>'
							+'<div class="li2">'+ render.val2string( v ) +'</div>';
		}
		return '<li data-name="'+ k +'">'+ ico( 'filters liicon edit graph' ) + licontent  +'</li>';
	}
	, filtersSub  : ( k ) => {
		var li = '<li class="lihead files">Coefficient Files'+ ico( 'add' ) + ico( 'back' ) +'</li>';
		if ( S.lscoef.length ) S.lscoef.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file liicon' ) + k +'</li>' );
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
		var li        = '<li class="lihead" data-name="'+ name +'">'+ name + iconadd + ico( 'back' ) +'</li>';
		var optin     = htmlOption( chin );
		var optout    = htmlOption( chout );
		data.forEach( ( kv, i ) => {
			var dest     = kv.dest;
			var opts     = optout.replace( '>'+ dest, ' selected>'+ dest );
			var i_name   = ' data-index="'+ i +'" data-name="'+ name +'"';
			li       +=  '<li class="liinput main dest'+ i +'"'+ i_name +' data-dest="'+ dest +'">'+ ico( 'output liicon' )
						+'<div><select>'+ opts +'</select></div>'
						+'<div>'+ ico( kv.mute ? 'mute bl' : 'mute' ) + ico( 'add' )
						+'</li>';
			kv.sources.forEach( ( s, si ) => {
				var source   = data[ i ].sources[ si ];
				var channel  = source.channel;
				var opts     = optin.replace( '>'+ channel, ' selected>'+ channel );
				var val      = util.dbRound( source.gain );
				var disabled = ( source.mute ? ' disabled' : '' );
				li += '<li class="liinput dest'+ i +'"'+ i_name +' dest'+ i +'" data-si="'+ si +'">'+ ico( 'input liicon' ) +'<select>'+ opts +'</select>'
					 + ico( source.mute ? 'mute bl' : 'mute' ) +'<c class="db">'+ val +'</c>'
					 +'<input type="range" step="0.1" value="'+ val +'" min="'+ S.range.GAINMIN +'" max="'+ S.range.GAINMAX +'" '+ disabled +'>'
					 +'<div class="divgain '+ disabled +'">'+ ico( 'minus' ) + ico( 'set0' ) + ico( 'plus' ) +'</div>'
					 + ico( source.inverted ? 'inverted bl' : 'inverted' )
					 +'</li>';
			} );
		} );
		render.toggle( li, 'sub' );
		$( '#mixers input[type=range]' ).prop( { min: S.range.GAINMIN, max: S.range.GAINMAX } );
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
		var li   = '<li class="lihead" data-index="'+ index +'">Channel '+ data.channel + ico( 'add' ) + ico( 'back' ) +'</li>';
		data.names.forEach( ( name, i ) => li += render.pipeFilter( name, i ) );
		render.toggle( li, 'sub' );
		render.sortable( 'sub' );
	}
	, pipeFilter  : ( name, i ) => {
		return '<li data-index="'+ i +'" data-name="'+ name +'">'+ ico( 'filters liicon' )
			  +'<div class="li1">'+ name +'</div>'
			  +'<div class="li2">'+ render.val2string( FIL[ name ] ) +'</div>'
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
		[ 'enable_rate_adjust', 'stop_on_rate_change', 'enable_resampling' ].forEach( k => S[ k ] = DEV[ k ] );
		var labels = '';
		var values = '';
		[ 'capture', 'playback' ].forEach( ( k, i ) => {
			labels += util.key2label( k ) +'<br>';
			values += DEV[ k ].device +'<br>';
		} );
		C.sampling.forEach( k => {
			labels += util.key2label( k ) +'<br>';
			values += DEV[ k ].toLocaleString() +'<br>';
		} );
		var keys = [];
		if ( DEV.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
		if ( DEV.enable_resampling ) keys.push( 'resampler_type', 'capture_samplerate' );
		if ( DEV.stop_on_rate_change ) keys.push( 'rate_measure_interval' );
		if ( keys.length ) {
			labels += '<hr>';
			values += '<hr>';
			keys.forEach( k => {
				labels += util.key2label( k ) +'<br>';
				values += DEV[ k ] +'<br>';
			} );
		}
		$( '#divsampling .label' ).html( labels );
		$( '#divsampling .value' ).html( values.replace( /bluealsa|Bluez/, 'BlueALSA' ) );
		switchSet();
		$( '#divenable_rate_adjust input' ).toggleClass( 'disabled', DEV.enable_resampling && DEV.resampler_type === 'Synchronous' );
	} //---------------------------------------------------------------------------------------------
	, dataSort    : ( tab ) => {
		var kv   = S.config[ tab ];
		var data = {};
		var keys = Object.keys( kv );
		keys.sort().forEach( k => data[ k ] = kv[ k ] );
		return data
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
	, val2string  : ( val ) => {
		return val.type +': '+ JSON.stringify( val.parameters )
								.replace( /[{"}]/g, '' )
								.replace( 'type:', '' )
								.replace( /,/g, ', ' )
	}
}
var setting  = {
	  filter        : ( type, subtype, name, existing ) => {
		var data, lscoef, key_val, key, kv, k, v;
		var existing = false;
		if ( ! type ) { // subtype = existing name
			existing = true;
			name     = subtype;
			data     = jsonClone( FIL[ name ] );
			v        = { type : data.type }
			$.each( data.parameters, ( key, val ) => v[ key === 'type' ? 'subtype' : key ] = val );
			type     = v.type;
			subtype  = v.subtype;
		}
		// select
		var selectlabel = [ 'type' ];
		var select      = [ C.type ];
		var values      = { type: type }
		if ( subtype ) {
			selectlabel.push( 'subtype' )
			select.push( C.subtype[ type ] );
			values.subtype = subtype;
			key_val        = subtype in F ? jsonClone( F[ subtype ] ) : jsonClone( F[ type ] );
		}
		if ( ! key_val ) key_val = F[ type ];
		if ( subtype === 'Uniform' ) key_val.amplitude = 1;
		if ( 'select' in key_val ) {
			kv          = key_val.select;
			k           = Object.keys( kv );
			selectlabel = [ ...selectlabel, ...k ];
			if ( [ 'Raw', 'Wave' ].includes( subtype ) ) {
				lscoef = subtype === 'Raw' ? [ S.lscoefraw, C.format ] : [ S.lscoefwav ];
				select = [ ...select, ...lscoef ];
			}
			if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
			values      = { ...values, ...kv };
		}
		selectlabel     = util.labels2array( selectlabel );
		// text
		var textlabel   = [ 'name' ];
		values.name     = name;
		if ( 'text' in key_val ) {
			kv        = key_val.text;
			k         = Object.keys( kv );
			textlabel = [ ...textlabel, ...k ];
			if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
			values    = { ...values, ...kv };
		}
		textlabel       = util.labels2array( textlabel );
		// number
		var numberlabel = false;
		if ( 'number' in key_val ) {
			kv          = key_val.number;
			k           = Object.keys( kv );
			numberlabel = k;
			if ( v ) {
				k.forEach( key => {
					if ( [ 'q', 'samples' ].includes( key ) ) {
						if ( ! ( 'q' in v ) ) {
							delete kv.q;
							key = 'samples';
						}
						numberlabel[ numberlabel.length - 1 ] = key;
					}
					kv[ key ] = v[ key ];
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
			kv       = key_val.checkbox;
			k        = Object.keys( kv );
			checkbox = util.labels2array( k );
			if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
			values   = { ...values, ...kv };
		}
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
			, checkchanged : existing
			, beforeshow   : () => {
				$( '#infoContent td:first-child' ).css( 'min-width', '125px' );
				var $tdname = $( '#infoContent td' ).filter( function() {
					return $( this ).text() === 'Name'
				} );
				$( '#infoContent tr' ).eq( 0 ).before( $tdname.parent() );
				var $select     = $( '#infoContent select' );
				var $selecttype = $select.eq( 0 );
				$selecttype.on( 'change', function() {
					var type    = $( this ).val();
					var subtype = type in C.subtype ? C.subtype[ type ][ 0 ] : '';
					setting.filter( type, subtype, infoVal().name, existing );
				} );
				if ( $select.length > 1 ) {
					$select.eq( 1 ).on( 'change', function() {
						var type    = $selecttype.val();
						var subtype = $( this ).val();
						setting.filter( type, subtype, name, existing );
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
				var val        = infoVal();
				newname        = val.name;
				type           = val.type;
				var param      = { type: val.subtype };
				[ 'name', 'type', 'subtype', 'radio' ].forEach( k => delete val[ k ] );
				$.each( val, ( k, v ) => param[ k ] = v );
				FIL[ newname ] = { type: type, parameters : param }
				PIP.forEach( p => {
					if ( p.type === 'Filter' ) {
						p.names.forEach( ( f, i ) => {
							if ( f === name ) p.names[ i ] = newname;
						} );
					}
				} );
				setting.save( title, newname ? 'Change ...' : 'Save ...' );
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
		var select      = [ C.devicetype[ dev ] ];
		var values      = { type: type }
		key_val         = jsonClone( CP[ dev ][ type ] );
		if ( 'select' in key_val ) {
			kv          = key_val.select;
			k           = Object.keys( kv );
			k.forEach( key => {
				if ( key === 'format' ) {
					var s = C.format;
					var v = { format: data.format };
				} else if ( key === 'device' ) {
					var s = C.devices[ dev ];
					var v = { device: data.device };
				} else if ( key === 'filename' ) {
					var s   = S.lscoef.length ? S.lscoef : [ '(n/a)' ];
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
		var title = util.key2label( dev ) +' Device';
		var tab   = [ () => setting.device( 'capture' ), () => setting.device( 'playback' ), setting.devicesampling ];
		tab[ dev === 'capture' ? 0 : 1 ] = '';
		info( {
			  icon         : V.tab
			, title        : title
			, tablabel     : [ 'Capture', 'Playback', 'Sampling' ]
			, tab          : tab
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
				$select.eq( 0 ).on( 'change', function() {
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
			, tablabel     : [ 'Capture', 'Playback', 'Sampling' ]
			, tab          : [ () => setting.device( 'capture' ), () => setting.device( 'playback' ), '' ]
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
				$( '.trselect select' ).on( 'change', function() {
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
	, resampling    : ( freeasync ) => {
		var rateadjust  = DEV.enable_rate_adjust;
		var samplerate  = DEV.capture_samplerate;
		var selectlabel = [ 'Resampler type', 'Capture samplerate' ];
		var select      = [ rateadjust ? C.sampletype.slice( 0, -1 ) : C.sampletype, C.samplerate ];
		var numberlabel = [ 'Other' ];
		var capturerate = C.samplerate.includes( samplerate ) ? samplerate : 'Other';
		if ( freeasync ) {
			selectlabel.push( 'interpolation', 'window' );
			select.push( C.freeasync.interpolation, C.freeasync.window );
			numberlabel.push( 'Sinc length', 'Oversampling ratio', 'Frequency cutoff' );
			var f  = DEV.resampler_type.FreeAsync || {};
			var values = {
				  resampler_type     : 'FreeAsync'
				, capture_samplerate : capturerate
				, interpolation      : f.interpolation      || 'Linear'
				, window             : f.window             || 'Blackman2'
				, other              : capturerate
				, sinc_len           : f.sinc_len           || 128
				, oversampling_ratio : f.oversampling_ratio || 1024
				, f_cutoff           : f.f_cutoff           || 0.925
			}
		} else {
			var values      = {
				  resampler_type     : rateadjust && DEV.resampler_type === 'Synchronous' ? 'BalancedAsync' : DEV.resampler_type
				, capture_samplerate : capturerate
				, other              : capturerate
			}
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
				var indextr  = freeasync ? [ 2, 1, 0 ] : [ 0 ]
				indextr.forEach( i => $( '.trselect' ).eq( 1 ).after( $trnumber.eq( i ) ) );
				$trother.toggleClass( 'hide', values.capture_samplerate !== 'Other' );
				$( '.trselect select' ).eq( 0 ).on( 'change', function() {
					if ( $( this ).val() === 'FreeAsync' ) {
						setting.resampling( 'freeasync' );
					} else if ( $trnumber.length > 1 ) {
						setting.resampling();
					}
				} );
				$( '.trselect select' ).eq( 1 ).on( 'change', function() {
				setting.hidetrinfo( $trother, $( this ).val() );
				} );
			}
			, cancel       : switchCancel
			, ok           : () => {
				var val = infoVal();
				if ( val.capture_samplerate === 'Other' ) val.capture_samplerate = val.other;
				[ 'resampler_type', 'capture_samplerate' ].forEach( k => DEV[ k ] = val[ k ] );
				if ( freeasync ) {
					var v = {}
					C.freeasync.keys.forEach( k => v[ k ] = val[ k ] );
					DEV.resampler_type = { FreeAsync: v }
				}
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
		var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
		ws.send( '{ "SetConfigJson": "'+ config +'" }' );
		ws.send( '"Reload"' );
		if ( msg ) banner( V.tab, titlle, msg );
/*		V.timeoutpush = setTimeout( () => {
			bash( [ 'pushrefresh' ] );
			local( 1000 );
		}, 1000 );*/
	}
	, set           : () => {
		ws.send( '{ "SetConfigName": "/srv/http/data/camilladsp/configs/'+ name +'" }' );
		ws.send( '"Reload"' );
		bash( [ 'confswitch', name, 'CMD NAME' ] );
	}
	, upload        : ( icon ) => {
		if ( icon === 'filters' ) {
			var title   = 'Add Filter File';
			var dir     = 'coeffs';
			var message = 'Upload filter file:';
		} else {
			var title   = 'Add Configuration';
			var dir     = S.bluetooth ? 'configs-bt' : 'configs';
			var message = 'Upload configuration file:'
		}
		info( {
			  icon        : icon
			, title       : title
			, message     : message
			, fileoklabel : ico( 'file' ) +'Upload'
			, filetype    : dir === 'coeffs' ? '.dbl,.pcm,.raw,.txt,.wav' : '.yml'
			, cancel      : () => icon === 'filters' ? '' : $( '#setting-configuration' ).trigger( 'click' )
			, ok          : () => {
				notify( icon, title, 'Upload ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'camilla' );
				formdata.append( 'dir', dir );
				formdata.append( 'file', I.infofile );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( message => {
						if ( message ) {
							bannerHide();
							infoWarning(  icon,  title, message );
						}
					} );
			}
		} );
	}
}
var util     = {
	  db2percent( v ) {
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
	, dbRound     : ( num ) => {
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
	, websocket     : () => {
		ws           = new WebSocket( 'ws://'+ window.location.host +':1234' );
		ws.onopen    = () => V.intervalstatus = setInterval( () => V.statusget.forEach( k => ws.send( '"'+ k +'"' ) ), 1000 );
		ws.onclose   = () => {
			ws = null;
			render.vuClear();
			clearInterval( V.intervalstatus );
			bash( [ 'save' ] );
		}
		ws.onmessage = response => {
			var data  = JSON.parse( response.data );
			var cmd   = Object.keys( data )[ 0 ];
			var value = data[ cmd ].value;
			var cl, cp, css;
			switch ( cmd ) {
				case 'GetCaptureSignalPeak':
				case 'GetCaptureSignalRms':
				case 'GetPlaybackSignalPeak':
				case 'GetPlaybackSignalRms':
					cp = cmd[ 3 ];
					if ( cmd.slice( -1 ) === 'k' ) {
						if ( V.clipped ) break;
						
						cl  = '.peak';
						css = 'left';
						V[ cmd ] = value;
						V[ cp ] = [];
					} else {
						cl  = '.rms'
						css = 'width';
					}
					value.forEach( ( v, i ) => {
						v = util.db2percent( v );
						V[ cp ].push( v );
						$( '.'+ cmd[ 3 ] + i + cl ).css( css, v +'%' );
					} );
					break;
				case 'GetClippedSamples':
					if ( V.clipped ) {
						S.status.GetClippedSamples = value;
						break;
					}
					
					if ( value > S.status.GetClippedSamples ) {
						V.clipped = true;
						clearTimeout( V.timeoutclipped );
						$( '.peak, .clipped' )
							.css( 'transition-duration', 0 )
							.addClass( 'red' );
						V.timeoutclipped = setTimeout( () => {
							V.clipped = false;
							$( '.peak, .clipped' )
								.removeClass( 'red' )
								.css( 'transition-duration', '' );
							// set clipped value to previous peak
							[ 'C', 'P' ].forEach( ( k, i ) => $( '.peak.'+ k + i ).css( 'left', util.db2percent( V[ k ][ i ] ) +'%' ) );
						}, 1000 );
					}
					S.status.GetClippedSamples = value;
					break;
				case 'GetConfigName':
					S.configname = value.split( '/' ).pop();
					break;
				case 'GetVolume':
				case 'GetMute':
					S[ cmd.slice( 3 ).toLowerCase() ] = value;
					break;
				case 'GetState':
				case 'GetCaptureRate':
				case 'GetBufferLevel':
				case 'GetRateAdjust':
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
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.close' ).on( 'click', function() {
	bash( [ 'save' ] );
} );
$( '.log' ).on( 'click', function() {
	var $code = $( '#codelog' );
	$code.hasClass( 'hide' ) ? currentStatus( 'log' ) : $code.addClass( 'hide' );
} )
$( '.i-gear.range' ).on( 'click', function() {
	var head = '<td style="text-align: center">min</td>';
	var td   = '<td><input type="number"></td>';
	var tr   = '<tr><td style="padding-right: 5px; text-align: right;">Volume</gr></td>'+ td + td +'</tr>'
	info( {
		  icon       : 'camilladsp'
		, title      : 'Slider dB Range'
		, content    : '<table><tr><td></td>'+ head + head.replace( 'min', 'max' ) +'</tr>'
						+ tr + tr.replace( 'Volume', 'Gain' ) 
						+'<tr><td></td><td colspan="2"><gr>(Limit: -50 ... 50)</gr></td></tr>'
						+'</table>'
		, boxwidth   : 60
		, values     : S.range
		, beforeshow : () => {
			var minmax = [ -50, 0,  -10, 10 ];
			var limit  = [ -50, 50, -50, 50 ];
			$( '#infoContent' ).on( 'blur', 'input', function() {
				var $this = $( this );
				var i     = $this.index( 'input' );
				var mm    = minmax[ i ];
				var lm    = limit[ i ];
				var val   = $this.val();
				if ( i % 2 ? val < mm : val > mm ) $this.val( mm );
				if ( i % 2 ? val > lm : val < lm ) $this.val( lm );
			} );
		}
		, ok         : () => {
			var val = infoVal();
			bash( [ 'camilla', ...Object.values( val ), 'CFG '+ Object.keys( val ).join( ' ' ) ] );
		}
	} );
} )
$( '#divvolume .i-mute' ).on( 'click', function() {
	gain.mute( ! S.mute );
} );
$( '#volume' ).on( 'input', function() {
	S.volume = +$( this ).val();
	$( '#gain' ).text( util.dbRound( S.volume ) );
	ws.send( '{ "SetVolume": '+ S.volume +' }' );
} );
$( '.container' ).on( 'click', '.divgain i', function() {
	clearTimeout( V.timeoutgain );
	var $this = $( this );
	if ( $this.parent().hasClass( 'disabled' ) ) return
	
	var $gain = $this.parent().prev();
	var $db   = $gain.prev();
	var val   = +$gain.val();
	var set0  = $this.hasClass( 'i-set0' );
	if ( set0 ) {
		if ( val === 0 ) return
		
		val = 0;
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
	if ( this.id !== 'volume' && V.li.find( '.divgraph' ).length ) V.timeoutgain = setTimeout( graph.gain, set0 ? 0 : 1000 );
} );
$( '#divstate' ).on( 'click', '.clipped', function() {
	S.clipped = S.status.GetClippedSamples;
	bash( [ 'clippedreset', S.clipped, 'CMD CLIPPED' ] );
	render.status();
} );
$( '#configuration' ).on( 'change', function() {
	if ( V.local ) return
	
	var name = $( this ).val();
	setting.set( name );
	notify( 'camilladsp', 'Configuration', 'Switch ...' );
	V.graph  = { filters: {}, pipeline: {} }
	render[ V.tab ];
} );
$( '#setting-configuration' ).on( 'click', function() {
	var content = '<table style="border-collapse: collapse; width: 300px; margin: -20px auto 10px;">'
				 +'<tr><td colspan="3"><label class="add">File list: '+ ico( 'add' ) +'</label></td></tr>'
	S.lsconf.forEach( f => {
		var current = f === S.configname ? '<grn> • </grn>' : '';
		var tdicon  = '<td style="width: 30px; text-align: center;">';
		var ibt     = S.bluetooth ? ico( 'btreceiver' ) : '';
		var iremove = current ? '' : ico( 'remove gr' );
		content    += '<tr style="border: 1px solid var( --cgl ); border-style: solid none;">'
					 + tdicon + ibt + ico( 'file gr' ) +'</td><td><a class="name">'+ f +'</a>'+ current +'</td>'
					 + tdicon + iremove +'</td>'+ tdicon + ico( 'copy gr' ) +'</td>'
					 +'</tr>';
	} );
	var icon  = 'camilladsp';
	info( {
		  icon        : icon
		, title       : SW.title
		, content     : content
		, beforeshow  : () => {
			$( '#infoContent' ).on( 'click', '.add', function() {
				setting.upload( 'camilladsp' );
			} ).on( 'click', '.i-file, .i-copy', function() {
				var $this  = $( this );
				var rename = $this.hasClass( 'i-file' );
				var name   = $this.parents( 'tr' ).find( '.name' ).text();
				info( {
					  icon         : icon
					, title        : SW.title
					, message      : rename ? 'Rename <wh>'+ name +'</wh> to:' : 'Copy <wh>'+ name +'</wh> as:'
					, textlabel    : 'Name'
					, values       : name
					, checkblank   : true
					, checkchanged : true
					, cancel       : () => $( '#setting-configuration' ).trigger( 'click' )
					, ok           : () => {
						var newname = infoVal();
						bash( [ rename ? 'confrename' : 'confcopy', name, newname, S.bluetooth, 'CMD NAME NEWNAME BT',  ], () => {
							if ( rename && name === S.configname ) setting.set( newname );
						} );
						notify( icon, SW.title, rename ? 'Rename ...' : 'Copy ...' );
						rename ? S.lsconf[ S.lsconf.indexOf( name ) ] = newname : S.lsconf.push( newname );
						render.status();
					}
				} );
			} ).on( 'click', '.i-remove', function() {
				var file = $( this ).parent().prev().text();
				info( {
					  icon    : icon
					, title   : SW.title
					, message : 'Delete <wh>'+ file +'</wh> ?'
					, cancel  : () => $( '#setting-configuration' ).trigger( 'click' )
					, oklabel : ico( 'remove' ) +'Delete'
					, okcolor : red
					, ok      : () => {
						S.lsconf.slice( S.lsconf.indexOf( name ), 1 );
						bash( [ 'confdelete', file, S.bluetooth, 'CMD NAME BT' ] );
						banner( icon, SW.title, 'Delete ...' );
						render.status();
					}
				} );
			} );
		}
		, okno       : true
	} );
} );
$( '#divtabs' ).on( 'click', '.graphclose', function() {
	$( this ).parent().addClass( 'hide' );
} );
$( '.headtitle' ).on( 'click', '.i-folder-open', function() {
	render.filtersSub();
} ).on( 'click', '.i-add', function() {
	if ( V.tab === 'filters' ) {
		setting.filter( 'Biquad', 'Lowpass' );
	} else if ( V.tab === 'mixers' ) {
		setting.mixer();
	} else if ( V.tab === 'pipeline' ) {
		setting.pipeline();
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
	setting.device( 'capture' );
} );
$( '.entries' ).on( 'click', 'i', function() {
	var $this  = $( this );
	if ( ! $this.hasClass( 'liicon' ) ) return
	
	V.li       = $this.parent();
	var active = V.li.hasClass( 'active' );
	var $menu  = $( '#menu' );
	$menu.addClass( 'hide' );
	$( '#'+ V.tab +' li' ).removeClass( 'active' );
	if ( active ) return
	
	V.li.addClass( 'active' );
	if ( $menu.hasClass( 'hide' ) ) {
		var menutop = V.li.offset().top + 49;
		$menu
			.css( 'top',  menutop )
			.removeClass( 'hide' );
		var targetB = $menu.offset().top + $menu.height();
		var wH      = window.innerHeight;
		var wT      = $( window ).scrollTop();
		if ( targetB > ( wH - 40 + wT ) ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
		$menu.find( '.edit' ).toggleClass( 'hide', ! $this.hasClass( 'edit' ) );
		$menu.find( '.graph' ).toggleClass( 'hide', ! $this.hasClass( 'graph' ) );
	}
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
						setting.filter( '', name, 'existing' );
					}
					break;
			}
			break;
		case 'mixers':
			var title = 'Mixer';
			var name  = V.li.data( 'name' );
			var main  = $( '#mixers .entries.sub' ).hasClass( 'hide' );
			switch ( cmd ) {
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
				case 'edit':
					setting.mixer( name );
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
					render.volume();
				}
			} );
			break;
	}
} );
$( '.entries' ).on( 'click', '.i-back', function() {
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
$( '#filters' ).on( 'click', '.i-add', function() {
	setting.upload( 'filters' );
} ).on( 'input', 'input[type=range]', function() {
//	clearTimeout( V.timeoutpush );
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
	if ( $this.hasClass( 'i-back' ) || $this.parent().hasClass( 'divgain' ) ) return
	
	V.li       = $this.parents( 'li' );
	var action = $this.prop( 'class' ).replace( /i-| bl/g, '' );
	var name   = V.li.data( 'name' );
	var title  = util.key2label( V.tab );
	if ( action === 'add' ) {
		var index = V.li.hasClass( 'lihead' ) ? '' : V.li.data( 'index' );
		setting.mixerMap( name, index );
	} else {
		var index   = V.li.data( 'index' );
		var si      = V.li.data( 'si' );
		var mapping = MIX[ name ].mapping[ index ];
		var source  = mapping.sources[ si ];
		var checked = ! $this.hasClass( 'bl' );
		$this.toggleClass( 'bl', checked );
		if ( action === 'mute' ) {
			if ( V.li.hasClass( 'main' ) ) {
				mapping.mute = checked;
			} else {
				source.mute = checked;
				V.li.find( 'input[type=range]' ).prop( 'disabled', checked );
				V.li.find( '.divgain' ).toggleClass( 'disabled', checked );
			}
		} else if ( action === 'inverted' ) {
			source.inverted = checked;
		}
		setting.save( 'Mixer', 'Change ...' );
	}
} ).on( 'change', 'select', function() {
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
//	clearTimeout( V.timeoutpush );
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
	if ( $( e.target ).is( 'i' )
		|| $this.parent().hasClass( 'sub' )
		|| $( e.target ).parents( '.divgraph' ).length
	) return
	
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
	var $this  = $( this );
	if ( $this.hasClass( 'i-back' ) ) return
	
	V.li       = $this.parents( 'li' );
	var title  = util.key2label( V.tab );
	var index  = V.li.data( 'index' );
	var action = $this.prop( 'class' ).slice( 2 );
	if ( action === 'add' ) {
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
				render.volume();
				graph.pipeline();
			}
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
	setting.resampling( DEV.resampler_type === 'FreeAsync' );
} );
$( '#bar-bottom div' ).on( 'click', function() {
	V.tab = this.id.slice( 3 );
	render.tab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
