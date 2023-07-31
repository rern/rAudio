V              = {
	  tab    : 'devices'
	, signal : {}
	, status : {}
}
var ws         = new WebSocket( 'ws://'+ window.location.host +':1234' );
var wssignal   = [ 'GetSignalRange', 'GetCaptureSignalPeak', 'GetCaptureSignalRms', 'GetPlaybackSignalPeak', 'GetPlaybackSignalRms' ];
var wsstatus   = [ 'GetState', 'GetCaptureRate', 'GetRateAdjust', 'GetClippedSamples', 'GetBufferLevel' ];
var dirconfig  = '/srv/http/data/camilladsp/configs/';
ws.onmessage   = response => {
	var data  = JSON.parse( response.data );
	var cmd   = Object.keys( data )[ 0 ];
	var value = data[ cmd ].value;
	if ( wssignal.includes( cmd ) ) {
		var el = cmd.replace( 'Get', '#' )
		$( el ).css( 'width', value );
	} else if ( wsstatus.includes( cmd ) ) {
		V.status[ cmd ] = value;
		if ( cmd === 'GetBufferLevel' ) {
			S.status = '';
			wsstatus.forEach( k => S.status += V.status[ k ] +'<br>' );
			$( '#statusvalue' ).html( S.status );
		}
	} else if ( cmd === 'GetVolume' ) {
		S.volume = value;
	} else if ( cmd === 'GetMute' ) {
		S.mute = value;
	} else if ( cmd === 'GetConfigjson' ) {
		S.config = value;
		DEV      = S.config.devices;
		FIL      = S.config.filters;
		MIX      = S.config.mixers;
		PIP      = S.config.pipeline;
	} else if ( cmd === 'GetConfigName' ) {
		S.fileconf = value;
	} else if ( cmd === 'Invalid' ) {
		info( {
			  icon    : 'warning'
			, title   : 'Error'
			, message : data.Invalid.error
		} );
	}
}
var select2opt = { minimumResultsForSearch: 'Infinity' }
var format     = {};
[ 'S16LE', 'S24LE', 'S24LE3', 'S32LE', 'FLOAT32LE', 'FLOAT64LE', 'TEXT' ].forEach( k => format[ stringReplace( k ) ] = k );
var L  = {
	  devicetype : { capture: {}, playback: {} }
	, format     : format
	, freeasync  : {
		  keys          : [ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ]
		, interpolation : [ 'Cubic', 'Linear', 'Nearest' ]
		, window        : [ 'Blackman', 'Blackman2', 'BlackmanHarris', 'BlackmanHarris2', 'Hann', 'Hann2' ]
	}
	, samplerate : [ 44100, 48000, 88200, 96000, 176400, 192000, 352800, 384000, 705600, 768000, 'Other' ]
	, sampletype : [ 'Synchronous', 'FastAsync', 'BalancedAsync', 'AccurateAsync', 'FreeAsync' ]
	, sampling   : [ 'samplerate', 'chunksize', 'queuelimit', 'silence_threshold', 'silence_timeout', 'rate_measure_interval' ]
	, subtype    : {
		  Biquad      : [ 'Lowpass', 'Highpass', 'Lowshelf', 'Highshelf', 'LowpassFO', 'HighpassFO', 'LowshelfFO', 'HighshelfFO'
						, 'Peaking', 'Notch', 'Bandpass', 'Allpass', 'AllpassFO', 'LinkwitzTransform', 'Free' ]
		, BiquadCombo : [ 'ButterworthLowpass', 'ButterworthHighpass', 'LinkwitzRileyLowpass', 'LinkwitzRileyHighpass' ]
		, Conv        : [ 'Raw', 'Wave', 'Values' ]
		, Dither      : [ 'Simple', 'Uniform', 'Lipshitz441', 'Fweighted441', 'Shibata441', 'Shibata48', 'None' ]
	}
	, type       : [ 'Biquad', 'BiquadCombo', 'Conv', 'Delay', 'Gain', 'Volume', 'Loudness', 'DiffEq', 'Dither' ]
}
var Fkv        = {
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
var F          = {
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
// capture / playback
var CPkv       = {
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
var CP         = { // capture / playback
	  capture : {
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
			  select : { filename: '', format: '' }
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
var C          = {
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
var plots      = {
	  gain    : {
		  yaxis : 'y'
		, type : 'scatter'
		, name : 'Gain'
		, line : { width : 4, color: C.m, shape: 'spline' }
	}
	, phase   : {
		  yaxis : 'y2'
		, type  : 'scatter'
		, name  : 'Phase'
		, line : { width : 2, color : C.r }
	}
	, delay   : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Delay'
		, line : { width : 2, color: C.o }
	}
	, impulse : {
		  yaxis : 'y3'
		, type  : 'scatter'
		, name  : 'Impulse'
		, line : { width : 1, color: C.o }
	}
	, time    : {
		  yaxis : 'y4'
		, type  : 'scatter'
		, name  : 'Time'
		, line : { width : 1, color: C.g }
	}
}
var ycommon    = {
	  overlaying : 'y'
	, side       : 'right'
	, anchor     : 'free'
	, autoshift  : true
}
var axes       = {
	  freq  : {
		  title     : {
			  text     : 'Frequency'
			, font     : { color: C.wl }
			, standoff : 10
		}
		, tickfont  : { color: C.wl }
		, tickvals  : [ 0, 232, 464, 696, 928 ]
		, ticktext  : [ '', '10Hz', '100Hz', '1kHz', '10kHz' ]
		, range     : [ 10, 1000 ]
		, gridcolor : C.grd
	}
	, gain  : {
		  title        : {
			  text     : 'Gain'
			, font     : { color: C.m }
			, standoff : 0
		}
		, tickfont      : { color: C.m }
		, zerolinecolor : C.w
		, linecolor     : C.md
		, gridcolor     : C.md
	}
	, gainx : {
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
	, phase : {
		  title      : {
			  text     : 'Phase'
			, font     : { color: C.r }
			, standoff : 0
		}
		, tickfont      : { color: C.r }
		, overlaying    : 'y'
		, side          : 'right'
		, range         : [ -190, 193 ]
		, tickvals      : [ -180, -90, 0, 90, 180 ]
		, ticktext      : [ 180, 90, 0, 90, 180 ]
		, zerolinecolor : C.w
		, linecolor     : C.rd
		, gridcolor     : C.rd
	}
	, delay : {
		  title      : {
			  text     : 'Delay'
			, font     : { color: C.o }
			, standoff : 5
		}
		, tickfont      : { color: C.o }
		, shift         : 10
		, zerolinecolor : C.w
		, linecolor     : C.od
		, gridcolor     : C.od
		, ...ycommon
	}
	, impulse : {
		  title      : {
			  text     : 'Impulse'
			, font     : { color: C.g }
			, standoff : 5
		}
		, tickfont   : { color: C.g }
		, linecolor  : C.gd
		, gridcolor  : C.gd
		, ...ycommon
	}
	, time    : {
		  title      : {
			  text     : 'Time'
			, font     : { color: C.o }
			, standoff : 5
		}
		, tickfont   : { color: C.o }
		, shift      : 10
		, linecolor  : C.od
		, gridcolor  : C.od
		, ...ycommon
	}
}
V.graph       = { filters: {}, pipeline: {}, flowchart: {} }
var flowchart = {
	  node   : $( '#divpipeline .flowchart' )[ 0 ]
	, width  : 565
	, height : 300
	, color  : {
		  filter : C.md
		, in     : '#000'
		, mixer  : C.rd
		, out    : C.gd
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.close' ).off( 'click' ).on( 'click', function() {
	location.href = '/';
} );
$( '.refresh' ).on( 'click', function() {
	info( {
		  icon         : 'camilladsp'
		, title        : 'Interface Settings'
		, checkbox     : [ 'Reset clipped samples', 'Refresh status every second' ]
		, checkchanged : true
		, ok           : () => {
			var val = infoVal();
			if ( val[ 0 ] ) ws.send( '"Reload"' );
			if ( val[ 1 ] ) {
				V.intstatus = setInterval( () => {
					wsstatus.forEach( k => ws.send( '"'+ k +'"' ) );
				}, 1000 );
			} else {
				clearInterval( V.intstatus );
			}
		}
	} );
} );
$( '#configuration' ).on( 'change', function() {
	var name = $( this ).val();
	setConfig( name );
	notify( 'camilladsp', 'Configuration', 'Switch ...' );
} );
$( '#setting-configuration' ).on( 'click', function() {
	var content = '<table style="border-collapse: collapse; width: 300px;">'
	S.lsconf.forEach( f => {
		if ( f === 'default_config.yml' ) return
		
		content +=   '<tr style="border: 1px solid var( --cgl ); border-style: solid none;">'
					+'<td>'+ ico( 'file gr' ) +'</td><td>'+ f +'</td><td>'+ ico( 'remove gr' ) + ico( 'copy gr' ) +'</td>'
					+'</tr>';
	} );
	content += '<tr><td></td><td colspan="2" style="text-align: right"><a class="add">'+ ico( 'add' )+'New file</a></td></tr></table>';
	var icon  = 'camilladsp';
	var title = 'Configuration';
	info( {
		  icon        : icon
		, title       : title
		, content     : content
		, beforeshow  : () => {
			$( '#infoContent' ).on( 'click', '.add', function() {
				infoFileUpload( 'camilladsp' );
			} ).on( 'click', '.i-file, .i-copy', function() {
				var $this  = $( this );
				var rename = $this.hasClass( 'i-file' );
				var name   = rename ? $this.parent().next().text() : $this.parent().prev().text();
				info( {
					  icon         : icon
					, title        : title
					, message      : rename ? 'Rename <wh>'+ name +'</wh> to:' : 'Copy <wh>'+ name +'</wh> as:'
					, textlabel    : 'Name'
					, values       : name
					, checkblank   : true
					, checkchanged : true
					, cancel       : () => $( '#setting-configuration' ).trigger( 'click' )
					, ok           : () => {
						var newname = infoVal();
						bash( [ rename ? 'confrename' : 'confcopy', name, newname, 'CMD NAME NEWNAME' ], () => {
							if ( rename && name === S.fileconf ) setConfig( newname );
						} );
						notify( icon, title, rename ? 'Rename ...' : 'Copy ...' );
					}
				} );
			} ).on( 'click', '.i-remove', function() {
				var file = $( this ).parent().prev().text();
				info( {
					  icon    : icon
					, title   : title
					, message : 'Delete <wh>'+ file +'</wh> ?'
					, cancel  : () => $( '#setting-configuration' ).trigger( 'click' )
					, oklabel : ico( 'remove' ) +'Delete'
					, okcolor : red
					, ok      : () => {
						bash( [ 'confdelete', file, 'CMD NAME' ], () => setConfig( 'camilladsp' ) );
						notify( icon, title, 'Delete ...' );
					}
				} );
			} );
		}
		, okno       : true
	} );
} );
$( '#divsettings' ).on( 'click', '.settings', function() {
	var textlabel  = L.sampling.slice( 1 );
	textlabel.push( 'Other' );
	var values     = {};
	L.sampling.forEach( k => values[ k ] = DEV[ k ] );
	if ( ! L.samplerate.includes( DEV.samplerate ) ) values.samplerate = 'Other';
	values.other = values.samplerate;
	var title = key2label( V.tab );
	info( {
		  icon         : V.tab
		, title        : title
		, selectlabel  : 'Sample Rate'
		, select       : L.samplerate
		, textlabel    : labelArraySet( textlabel )
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
				otherToggle( $trother, $( this ).val() );
			} );
		}
		, ok           : () => {
			var val = infoVal();
			if ( val.samplerate === 'Other' ) val.samplerate = val.other;
			delete val.other;
			$.each( val, ( k, v ) => DEV[ k ] = v );
			saveConfig( V.tab, title, 'Change ...' );
		}
	} );
} ).on( 'click', '.i-flowchart', function() {
	var $flowchart = $( '.flowchart' );
	if ( $flowchart.hasClass( 'hide' ) ) {
		if ( typeof( d3 ) !== 'object' ) {
			$.when(
				$.getScript( '/assets/js/pipelineplotter.js' ),
				$.getScript( '/assets/js/plugin/'+ jfiles.d3 ),
				$.Deferred( deferred => deferred.resolve() )
			).done( () => createPipelinePlot() );
		} else {
			if ( JSON.stringify( PIP ) === JSON.stringify( V.graph.flowchart ) ) {
				$flowchart.removeClass( 'hide' );
			} else {
				createPipelinePlot();
			}
		}
	} else {
		$flowchart.addClass( 'hide' );
	}
} );
$( '#setting-capture' ).on( 'click', function() {
	infoDevices( 'capture' );
} )
$( '#setting-playback' ).on( 'click', function() {
	infoDevices( 'playback' );
} );
$( '#enable_rate_adjust, #enable_resampling' ).on( 'click', function() {
	var id = this.id;
	var $setting = $( '#setting-'+ id );
	if ( DEV[ id ] ) {
		DEV[ id ] = false;
		saveConfig( 'devices', id === 'enable_rate_adjust' ? 'Rate Adjust' : 'Resampling', 'Disable ...' );
		$setting.addClass( 'hide' );
		render.devices();
	} else {
		$setting.trigger( 'click' );
	}
} );
$( '#setting-enable_rate_adjust' ).on( 'click', function() {
	var $this = $( this );
	var title = 'Rate Adjust';
	info( {
		  icon         : V.tab
		, title        : title
		, numberlabel  : [ 'Adjust period', 'Target level' ]
		, boxwidth     : 100
		, values       : { adjust_period: DEV.adjust_period, target_level: DEV.target_level }
		, checkchanged : DEV.enable_rate_adjust
		, cancel       : switchCancel
		, ok           : () => {
			var val =  infoVal();
			[ 'adjust_period', 'target_level' ].forEach( k => DEV[ k ] = val[ k ] );
			DEV.enable_rate_adjust = true;
			saveConfig( V.tab, title, DEV.enable_rate_adjust ? 'Change ...' : 'Enable ...' );
			$this.removeClass( 'hide' );
			render.devices();
		}
	} );
} );
$( '#setting-enable_resampling' ).on( 'click', function() {
	infoResampling( DEV.resampler_type === 'FreeAsync' );
} );
$( '#stop_on_rate_change' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	DEV.stop_on_rate_change = checked;
	saveConfig( 'devices', 'Stop on Rate Change', checked ? 'Enable ...' : 'Disable ...' );
} );
$( '.headtitle' ).on( 'click', '.i-add', function() {
	if ( V.tab === 'filters' ) {
		infoFilters( 'Biquad', 'Lowpass' );
	} else if ( V.tab === 'mixers' ) {
		infoMixer();
	} else if ( V.tab === 'pipeline' ) {
		infoPipeline();
	}
} ).on( 'click', '.mixer-icon', function() {
	infoMixersMapping();
} );
$( '#divfilters' ).on( 'click', 'li', function( e ) {
	if ( $( e.target ).is( 'input' ) || $( e.target ).is( 'i' ) ) return
	
	V.li = $( this );
	infoFilters( '', V.li.find( '.name' ).text(), 'existing' );
} ).on( 'click', 'li i', function( e ) {
	var $this  = $( this );
	V.li       = $this.parents( 'li' );
	var action = $this.prop( 'class' ).slice( 2 );
	var name   = $this.parents( 'li' ).data( 'name' );
	var file   = $this.parents( 'li' ).find( '.i-file' ).length;
	var title  = file ? 'Filter File' : 'Filter';
	if ( action === 'graph' ) {
		graphToggle();
	} else if ( action === 'file' ) {
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
				bash( [ 'coeffrename', name, newname, 'CMD NAME NEWNAME' ] );
				$.each( FIL, ( k, v ) => {
					if ( v.type === 'Conv' && v.parameters.filename === name ) FIL[ name ].parameters.filename = newname;
				} );
				saveConfig( V.tab, title, 'Rename ...' );
			}
		} );
	} else if ( action === 'remove' ) {
		if ( inUse( name ) ) return
		
		info( {
			  icon         : V.tab
			, title        : title
			, message      : 'Delete: <wh>'+ name +'</wh> ?'
			, oklabel      : ico( 'remove' ) +'Delete'
			, okcolor      : red
			, ok           : () => {
				if ( file ) bash( [ 'coeffdelete', name, 'CMD NAME' ] );
				saveConfig( V.tab, title, 'Delete ...' );
				V.li.remove();
			}
		} );
	} else if ( action === 'add' ) {
		infoFileUpload( 'filters' );
	}
} ).on( 'keyup', 'input[type=number]', function() {
	gainUpDown( $( this ) );
} ).on( 'click input keyup', 'input[type=range]', function( e ) {
	var $this = $( this );
	var val   = +$this.val();
	$this.prev().val( dbFormat( val ) );
	if ( $this.hasClass( 'range' ) ) {
		ws.send( '{ "SetVolume": '+ val +' }' );
	} else {
		V.li     = $this.parents( 'li' );
		var name = V.li.data( 'name' );
		FIL[ name ].parameters.gain = val;
		saveConfig();
	}
	if ( e.type === 'click' ) gainSave( name ); // name - not main
} ).on( 'click', '.mutemain', function() {
	S.mute    = ! S.mute;
	muteToggle( $( this ), S.mute );
	ws.send( '{ "SetMute": '+ S.mute +'} ' );
} );
$( '#divmixers' ).on( 'click', 'li', function( e ) {
	var $this  = $( this );
	if ( $( e.target ).is( 'i' ) || $( '#divmixers .liinput' ).length ) return
	
	var name   = $this.find( '.li1' ).text();
	var data   = jsonClone( MIX[ name ].mapping );
	renderSub.mixers( name, data );
} ).on( 'click', 'li i', function() {
	var $this  = $( this );
	V.li       = $this.parents( 'li' );
	var action = $this.prop( 'class' ).slice( 2 );
	var main   = ! $( '#divmixers .lihead' ).length;
	var name   = V.li.data( 'name' );
	var title  = key2label( V.tab );
	if ( action === 'mixers' ) { // rename
		infoMixer( name );
	} else if ( action === 'back' ) {
		if ( ! $( '#divmixers input' ).length ) {
			delete MIX[ $( '#divmixers .lihead' ).text() ];
			saveConfig( V.tab, title, 'Remove ...' );
		}
		render.mixers();
	} else if ( action === 'add' ) {
		var index = V.li.hasClass( 'lihead' ) ? '' : V.li.data( 'index' );
		infoMixersMapping( name, index );
	} else if ( action === 'remove' ) {
		var dest = V.li.hasClass( 'liinput main' );
		if ( main ) {
			if ( inUse( name ) ) return
			
			var message = 'Delete <wh>'+ name +'</wh> ?';
		} else if ( dest ) {
			var message = 'Delete this destination?';
		} else {
			var message = 'Delete this source?';
		}
		info( {
			  icon    : V.tab
			, title   : title
			, message : message
			, ok      : () => {
				if ( main ) {
					delete MIX[ name ];
				} else {
					var mi = V.li.siblings( '.main' ).data( 'index' );
					var si = V.li.data( 'index' );
					MIX[ name ].mapping[ mi ].sources.splice( si, 1 );
				}
				saveConfig( V.tab, title, 'Remove ...' );
				V.li.remove();
			}
		} );
	}
} ).on( 'change', 'select', function() {
	var $this      = $( this );
	V.li           = $this.parents( 'li' );
	var name  = V.li.data( 'name' );
	var index = V.li.data( 'index' );
	var si    = V.li.data( 'si' );
	MIX[ name ].mapping[ index ].sources[ si ].channel = +$this.val();
	saveConfig( V.tab, 'Mixer', 'Change ...');
} ).on( 'keyup', 'input[type=number]', function() {
	gainUpDown( $( this ) );
} ).on( 'click input keyup', 'input[type=range]', function( e ) {
	var $this = $( this );
	var val   = +$this.val();
	$this.prev().val( dbFormat( val ) );
	V.li      = $( this ).parents( 'li' );
	var name  = V.li.data( 'name' );
	var index = V.li.data( 'index' );
	var si    = V.li.data( 'si' );
	MIX[ name ].mapping[ index ].sources[ si ].gain = val;
	saveConfig();
	if ( e.type === 'click' ) gainSave();
} ).on( 'click', 'li input:checkbox', function() {
	var $this   = $( this );
	V.li        = $this.parents( 'li' );
	var name    = V.li.data( 'name' );
	var index   = V.li.data( 'index' );
	var si      = V.li.data( 'si' );
	var source  = MIX[ name ].mapping[ index ].sources[ si ];
	var checked = $this.prop( 'checked' );;
	if ( $this.hasClass( 'mute' ) ) {
		source.mute = checked;
		$this.prev().prop( 'disabled', tf );
	} else {
		source.inverted = checked;
	}
	saveConfig( V.tab, 'Mute', 'change ...' );
} ).on( 'click', '.mutedest', function() {
	var $this    = $( this );
	var name     = V.li.data( 'name' );
	var index    = $this.parent().data( 'index' );
	var mapping  = MIX[ name ].mapping[ index ];
	mapping.mute = ! mapping.mute;
	muteToggle( $this, mapping.mute );
	saveConfig( V.tab, 'Mute', 'change ...' );
} );
$( '#divpipeline' ).on( 'click', 'li', function( e ) { 
	if ( $( e.target ).is( 'i' )
		|| $( '#divpipeline .lihead' ).length
		|| $( e.target ).parents( '.ligraph' ).length
	) return
	
	var $this = $( this );
	var index = $this.data( 'index' );
	var data  = jsonClone( PIP[ index ] );
	if ( data.type === 'Filter' ) {
		renderSub.pipeline( index, data );
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
				saveConfig( V.tab, 'Add Mixer' );
			}
		} );
	}
} ).on( 'click', 'li i', function( e ) {
	var $this  = $( this );
	V.li       = $this.parents( 'li' );
	var title  = key2label( V.tab );
	var index  = V.li.data( 'index' );
	var action = $this.prop( 'class' ).slice( 2 );
	if ( action === 'graph' ) {
		graphToggle();
	} else if ( action === 'back' ) {
		if ( ! $( '#divpipeline .i-filters' ).length ) {
			var pi = $( '#divpipeline .lihead' ).data( 'index' );
			PIP.splice( pi, 1 );
			saveConfig( V.tab, title, 'Remove filter ...' );
		}
		render.pipeline();
	} else if ( action === 'add' ) {
		var title = 'Add Filter';
		info( {
			  icon        : V.tab
			, title       : title
			, selectlabel : 'Filter'
			, select      : Object.keys( FIL )
			, ok          : () => {
				PIP[ index ].names.push( infoVal() );
				saveConfig( V.tab, title, 'Save ...' );
				if ( ! $( '.flowchart' ).hasClass( 'hide' ) ) createPipelinePlot();
			}
		} );
	} else if ( action === 'remove' ) {
		var main = ! $( '#divpipeline .lihead' ).length;
		info( {
			  icon    : V.tab
			, title   : title
			, message : main ? 'Delete this filter?' : 'Delete <wh>'+ V.li.data( 'name' ) +'</wh> ?'
			, ok      : () => {
				if ( main ) {
					PIP.splice( index, 1 );
				} else {
					var pi = $( '#divpipeline .lihead' ).data( 'index' );
					var ni = V.li.data( 'index' );
					PIP[ pi ].names.splice( ni, 1 );
				}
				saveConfig( V.tab, title, 'Remove filter ...' );
				V.li.remove();
				if ( ! $( '.flowchart' ).hasClass( 'hide' ) ) createPipelinePlot();
			}
		} );
	}
} );
$( '#bar-bottom div' ).on( 'click', function() {
	V.tab = this.id;
	renderTab();
} );

} ); // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function dbFormat( num ) {
	return num % 1 === 0 ? num + '.0' : num
}
function deviceKeys( dev, type ) {
	var key_val = CP[ dev ][ type ];
	var keys    = [ 'type' ];
	$.each( key_val, ( k, v ) => keys = [ ...keys, ...Object.keys( v ) ] );
	return keys
}
function gainUpDown( $this ) {
	clearTimeout( V.gaintimeout );
	V.gainupdn = true;
	$this.next()
		.val( +$this.val() )
		.trigger( 'click' );
}
function gainSave( name ) {
	var filters = V.tab === 'filters';
	var graph   = filters && V.li.find( '.ligraph:not(.hide)' ).length;
	if ( graph && ! V.gainupdn ) {
		graphPlot();
		graph = false;
	}
	V.gaintimeout = setTimeout( () => {
		! filters || name ? bash( [ 'settings/camilla.py', 'save' ] ) : bash( [ 'volumesave', S.volume, 'CMD VAL' ] );
		if ( graph ) graphPlot();
		delete V.gainupdn;
	}, 1000 );
}
function graphPlot( $li ) {
	if ( ! $li ) $li = V.li;
	$li.addClass( 'disabled' );
	if ( typeof( Plotly ) !== 'object' ) {
		$.getScript( '/assets/js/plugin/'+ jfiles.plotly, () => graphPlot() );
		return
	}
	
	var type    = $li.parents( '.tab' ).prop( 'id' ).slice( 3 );
	var filters = type === 'filters';
	var val     = $li.data( filters ? 'name' : 'index' );
	V.graph[ type ][ val ] = jsonClone( S.config[ type ][ val ] );
	var filterdelay = false;
	if ( filters ) {
		filterdelay = FIL[ val ].type === 'Delay';
	} else {
		var pipelinedelay = false;
		PIP[ val ].names.some( n => {
			if ( FIL[ n ].type === 'Delay' ) pipelinedelay = true;
		} );
	}
	notify( type, key2label( type ), 'Plot ...' );
	bash( [ 'settings/camilla.py', type +' '+ val ], data => {
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
		plots.delay.y = data.groupdelay;
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
			, dragmode      : 'pan'
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
		if ( ! $li.find( '.ligraph' ).length ) $li.append( '<div class="ligraph" data-val="'+ val +'"></div>' );
		var $ligraph = $li.find( '.ligraph' );
		Plotly.newPlot( $ligraph[ 0 ], plot, layout, options );
		$svg = $ligraph.find( 'svg' );
		$svg.find( '.plot' ).before( $svg.find( '.overplot' ) );
		bannerHide();
		$li.removeClass( 'disabled' );
	}, 'json' );
}
function graphToggle() {
	var $ligraph = V.li.find( '.ligraph' );
	if ( ! $ligraph.length ) {
		graphPlot();
		return
	}
	
	if ( ! $ligraph.hasClass( 'hide' ) ) {
		$ligraph.addClass( 'hide' );
	} else {
		var val   = $ligraph.data( 'val' );
		var query = V.graph[ V.tab ][ val ];
		if ( JSON.stringify( S.config[ V.tab ][ val ] ) === JSON.stringify( query ) ) {
			$ligraph.removeClass( 'hide' );
		} else {
			delete query;
			graphPlot();
		}
	}
}
function htmlOption( list ) {
	if ( typeof( list ) === 'number' ) list = [ ...Array( list ).keys() ];
	var options = '';
	list.forEach( k => options += '<option>'+ k +'</option>' );
	return options
}
function infoDevices( dev, type ) {
	var key_val, kv, k, v;
	var data        = jsonClone( DEV[ dev ] );
	var type        = type || data.type;
	// select
	var selectlabel = [ 'type' ];
	var select      = [ L.devicetype[ dev ] ];
	var values      = { type: type }
	key_val         = CP[ dev ][ type ];
	if ( 'select' in key_val ) {
		kv          = jsonClone( key_val.select );
		k           = Object.keys( kv );
		k.forEach( key => {
			if ( key === 'format' ) {
				var s = L.format;
				var v = { format: data.format };
			} else if ( key === 'device' ) {
				var s = S.device;
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
	selectlabel     = labelArraySet( selectlabel );
	// text
	var textlabel = false;
	if ( 'text' in key_val ) {
		kv        = jsonClone( key_val.text );
		k         = Object.keys( kv );
		textlabel = labelArraySet( k );
		k.forEach( key => {
			if ( key in data ) kv[ key ] = data[ key ];
		} );
		values    = { ...values, ...kv };
	}
	// number
	var numberlabel = false;
	if ( 'number' in key_val ) {
		kv          = jsonClone( key_val.number );
		k           = Object.keys( kv );
		numberlabel = labelArraySet( k );
		k.forEach( key => {
			if ( key in data ) kv[ key ] = data[ key ];
		} );
		values      = { ...values, ...kv };
	}
	// checkbox
	var checkbox    = false;
	if ( 'checkbox' in key_val ) {
		kv       = jsonClone( key_val.checkbox );
		k        = Object.keys( kv );
		checkbox = labelArraySet( k );
		k.forEach( key => {
			if ( key in data ) kv[ key ] = data[ key ];
		} );
		values   = { ...values, ...kv };
	}
	$.each( v, ( k, v ) => values[ k ] = v );
	var title = key2label( dev ) +' Device';
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
			$select.eq( 0 ).on( 'change', function() {
				infoDevices( dev, $( this ).val() );
			} );
		}
		, ok           : () => {
			var val = infoVal();
			$.each( val, ( k, v ) => DEV[ dev ][ k ] = v );
			saveConfig( V.tab, title, 'Change ...' );
		}
	} );
}
function infoFileUpload( icon ) {
	if ( icon === 'filters' ) {
		var title   = 'Add Filter File';
		var cmd     = 'camillacoeffs';
		var message = 'Upload filter file:';
	} else {
		var title   = 'Add Configuration';
		var cmd     = 'camillaconfigs';
		var message = 'Upload configuration file:'
	}
	info( {
		  icon        : icon
		, title       : title
		, message     : message
		, fileoklabel : ico( 'file' ) +'Upload'
		, cancel      : () => icon === 'filters' ? '' : $( '#setting-configuration' ).trigger( 'click' )
		, ok          : () => {
			notify( icon, title, 'Upload ...' );
			var formdata = new FormData();
			formdata.append( 'cmd', cmd );
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
function infoFilters( type, subtype, name, existing ) {
	var key_val, key, kv, k, v;
	var existing = false;
	if ( ! type ) { // subtype = existing name
		existing = true;
		name     = subtype;
		var data = jsonClone( FIL[ name ] );
		v        = { type : data.type }
		$.each( data.parameters, ( key, val ) => v[ key === 'type' ? 'subtype' : key ] = val );
		type     = v.type;
		subtype  = v.subtype;
	}
	// select
	var selectlabel = [ 'type' ];
	var select      = [ L.type ];
	var values      = { type: type }
	if ( subtype ) {
		selectlabel.push( 'subtype' )
		select.push( L.subtype[ type ] );
		values.subtype = subtype;
		key_val        = F[ subtype ];
	}
	if ( ! key_val ) key_val = F[ type ];
	if ( subtype === 'Uniform' ) key_val.amplitude = 1;
	if ( 'select' in key_val ) {
		kv          = jsonClone( key_val.select );
		k           = Object.keys( kv );
		selectlabel = [ ...selectlabel, ...k ];
		subtype     = subtype === 'Raw' ? [ S.lscoef, L.format ] : [ S.lscoef ];
		select      = [ ...select, ...subtype ];
		if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
		values      = { ...values, ...kv };
	}
	selectlabel     = labelArraySet( selectlabel );
	// text
	var textlabel   = [ 'name' ];
	values.name     = name;
	if ( 'text' in key_val ) {
		kv        = jsonClone( key_val.text );
		k         = Object.keys( kv );
		textlabel = [ ...textlabel, ...k ];
		if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
		values    = { ...values, ...kv };
	}
	textlabel       = labelArraySet( textlabel );
	// number
	var numberlabel = false;
	if ( 'number' in key_val ) {
		kv          = jsonClone( key_val.number );
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
		numberlabel = labelArraySet( numberlabel );
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
		kv       = jsonClone( key_val.checkbox );
		k        = Object.keys( kv );
		checkbox = labelArraySet( k );
		if ( v ) k.forEach( key => kv[ key ] = v[ key ] );
		values   = { ...values, ...kv };
	}
	var title       = name ? 'Filter' : 'New Filter';
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
				var subtype = type in L.subtype ? L.subtype[ type ][ 0 ] : '';
				infoFilters( type, subtype, infoVal().name, existing );
			} );
			if ( $select.length > 1 ) {
				$select.eq( 1 ).on( 'change', function() {
					var type    = $selecttype.val();
					var subtype = $( this ).val();
					infoFilters( type, subtype, name, existing );
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
			var val     = infoVal();
			newname     = val.name;
			type        = val.type;
			var param   = { type: val.subtype };
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
			saveConfig( V.tab, title, newname ? 'Change ...' : 'Save ...' );
			if ( V.li.find( '.ligraph:not(.hide)' ).length ) graphPlot();
		}
	} );
}
function infoMixer( name ) {
	var title = name ? 'Mixer' : 'New Mixer'
	info( {
		  icon         : V.tab
		, title        : title
		, message      : name ? 'Rename <wh>'+ name +'</wh> to:' : ''
		, textlabel    : 'Name'
		, values       : name
		, checkblank   : true
		, checkchanged : name
		, ok           : () => {
			var val = infoVal();
			if ( val in MIX ) {
				info( {
					  icon    : V.tab
					, title   : 'New Mixer'
					, message : 'Mixer: <wh>'+ val +'</wh> already exists.'
					, ok      : () => infoMixer( val )
				} );
				return
			}
			
			if ( name ) {
				MIX[ val ] = MIX[ name ];
				delete MIX[ name ];
				PIP.forEach( p => {
					if ( p.type === 'Mixer' && p.name === name ) p.name = val;
				} );
			} else {
				MIX[ val ] = {
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
			saveConfig( V.tab, title, name ? 'Change ...' : 'Save ...' );
		}
	} );
}
function infoMixersMapping( name, index ) {
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
		var title = 'New Destination';
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
				saveConfig( V.tab, title, 'Save ...' );
			}
		} );
	} else {
		var title = 'New Source';
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
				saveConfig( V.tab, title, 'Save ...' );
				renderSub.mixers();
			}
		} );
	}
}
function infoPipeline() {
	var title = 'New Pipeline';
	var filters = Object.keys( FIL );
	info( {
		  icon        : V.tab
		, title       : title
		, tablabel    : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
		, tab         : [ '', infoPipelineMixer ]
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
			saveConfig( V.tab, titlle, 'Save ...' )
		}
	} );
}
function infoPipelineMixer() {
	var title = 'New Pipeline';
	info( {
		  icon         : V.tab
		, title        : title
		, tablabel     : [ ico( 'filters' ) +' Filter', ico( 'mixers' ) +' Mixer' ]
		, tab          : [ infoPipeline, '' ]
		, selectlabel  : 'Mixers'
		, select       : Object.keys( MIX )
		, ok          : () => {
			PIP.push( {
				  type : 'Mixer'
				, name : infoVal()
			} );
			saveConfig( V.tab, title, 'Save ...' )
		}
	} );
}
function infoResampling( freeasync ) {
	var selectlabel = [ 'Resampler type', 'Capture samplerate' ];
	var select      = [ L.sampletype, L.samplerate ];
	var numberlabel = [ 'Other' ];
	var values      = {};
	[ 'resampler_type', 'capture_samplerate' ].forEach( k => values[ k ] = DEV[ k ] );
	if ( ! L.samplerate.includes( DEV.capture_samplerate ) ) values.capture_samplerate = 'Other';
	values.other = values.capture_samplerate;
	if ( freeasync ) {
		selectlabel.push( 'interpolation', 'window' );
		select.push( L.freeasync.interpolation, L.freeasync.window );
		numberlabel.push( 'Sinc length', 'Oversampling ratio', 'Frequency cutoff' );
		var f  = DEV.resampler_type.FreeAsync || {};
		values = {
			  resampler_type     : 'FreeAsync'
			, capture_samplerate : values.capture_samplerate
			, interpolation      : f.interpolation      || 'Linear'
			, window             : f.window             || 'Blackman2'
			, other              : values.capture_samplerate
			, sinc_len           : f.sinc_len           || 128
			, oversampling_ratio : f.oversampling_ratio || 1024
			, f_cutoff           : f.f_cutoff           || 0.925
		}
	}
	var title = 'Resampling'
	info( {
		  icon         : V.tab
		, title        : title
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
					infoResampling( 'freeasync' );
				} else if ( $trnumber.length > 1 ) {
					infoResampling();
				}
			} );
			$( '.trselect select' ).eq( 1 ).on( 'change', function() {
				otherToggle( $trother, $( this ).val() );
			} );
		}
		, cancel       : switchCancel
		, ok           : () => {
			var val = infoVal();
			if ( val.capture_samplerate === 'Other' ) val.capture_samplerate = val.other;
			[ 'resampler_type', 'capture_samplerate' ].forEach( k => DEV[ k ] = val[ k ] );
			if ( freeasync ) {
				var v = {}
				L.freeasync.keys.forEach( k => v[ k ] = val[ k ] );
				DEV.resampler_type = { FreeAsync: v }
			}
			DEV.enable_resampling = true;
			saveConfig( V.tab, title, 'Change ...' );
			$( '#setting-enable_resampling' ).removeClass( 'hide' );
			render.devices();
		}
	} );
}
function inUse( name ) {
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
function key2label( key ) {
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
function labelArraySet( array ) {
	var capitalized = array.map( el => key2label( el ) );
	return capitalized
}
function muteToggle( $this, mute ) {
	$this
		.toggleClass( 'infobtn-primary', mute )
		.find( 'i' )
			.toggleClass( 'i-mute', mute )
			.toggleClass( 'i-volume', ! mute );
}
function otherToggle( $trother, rate ) {
	var other = rate === 'Other';
	$trother.toggleClass( 'hide', ! other );
	if ( ! other ) $trother.find( 'input' ).val( rate );
}
function pipelineOrder( array, ai, bi ) {
	var a = array[ ai ];
	array.splice( ai, 1 );
	array.splice( bi, 0, a );
}
function pipelineSort() {
	if ( 'sortable' in V ) V.sortable.destroy();
	V.sortable = new Sortable( $( '#divpipeline .entries' )[ 0 ], {
		  ghostClass : 'sortable-ghost'
		, delay      : 400
		, onUpdate   : function ( e ) {
			var ai = e.oldIndex;
			var bi = e.newIndex;
			var $lihead = $( '#divpipeline .lihead' );
			if ( $lihead.length ) {
				var pi = $lihead.data( 'index' );
				pipelineOrder( PIP[ pi ].names, ai - 1, bi - 1 );
			} else {
				pipelineOrder( PIP, ai, bi );
			}
			saveConfig( 'pipeline', 'Pipeline', 'Change order ...' );
			if ( ! $( '.flowchart' ).hasClass( 'hide' ) ) createPipelinePlot();
		}
	} );
}
var render   = {
	  devices  : () => {
		[ 'playback', 'capture' ].forEach( ( k, i ) => {
			S.devicetype[ i ].sort().forEach( t => {
				var v = t.replace( 'Alsa', 'ALSA' )
						 .replace( 'Std',  'std' );
				L.devicetype[ k ][ v ] = t; // [ 'Alsa', 'CoreAudio', 'Pulse', 'Wasapi', 'Jack', 'Stdin/Stdout', 'File' ]
			} );
		} );
		[ 'sampling', 'capture', 'playback' ].forEach( k => renderDevice( k ) );
		var keys = [];
		if ( DEV.enable_rate_adjust ) keys.push( 'adjust_period', 'target_level' );
		if ( DEV.enable_resampling ) keys.push( 'resampler_type', 'capture_samplerate' );
		keys.length ? renderDevice( 'options', keys ) : $( '#divoptions .statuslist' ).empty();
		var ch   = DEV.capture.channels > DEV.playback.channels ? DEV.caprtue.channels : DEV.playback.channels;
		$( '.flowchart' ).attr( 'viewBox', '20 '+ ch * 30 +' 500 '+ ch * 80 );
	}
	, filters  : () => {
		var data      = jsonClone( FIL );
		var li        = '';
		var classvol  = S.mute ? 'infobtn-primary' : '';
		var iconvol   = S.mute ? 'mute' : 'volume';
		var step_val  = ' step="0.1" value="'+ dbFormat( S.volume ) +'"';
		var li = '<li class="liinput main"><a class="mutemain infobtn '+ classvol +'">'+ ico( iconvol ) +'</a><span class="name">Main Gain</span>'
				+'<input type="number"'+ step_val +'>'
				+'<input type="range" class="range"'+ step_val +' min="-55" max="5">'
				+'</li>';
		$.each( data, ( k, v ) => {
			var param = v.parameters;
			var val   = JSON.stringify( param )
							.replace( /[{"}]/g, '' )
							.replace( 'type:', '' )
							.replace( /,/g, ', ' );
			if ( 'gain' in param ) {
				var step_val  =  ' step="0.1" value="'+ dbFormat( param.gain ) +'"';
				var licontent =  '<div class="liinput"><span class="name">'+ k +'</span>'
								+'<input type="number"'+ step_val +'>'
								+'<input type="range"'+ step_val +' min="-6" max="6">'
								+ ico( 'remove' ) +'</div>';
			} else {
				var licontent =  ico( 'remove' )
								+'<div class="li1 name">'+ k +'</div>'
								+'<div class="li2">'+ v.type +': '+ val +'</div>';
			}
			li += '<li data-name="'+ k +'">'+ ico( 'graph' ) + licontent  +'</li>';
		} );
		if ( S.lscoef.length ) {
			li += '<li class="lihead files">Files '+ ico( 'add' ) +'</li>';
			S.lscoef.forEach( k => li += '<li data-name="'+ k +'">'+ ico( 'file' ) + ico( 'remove' ) + k +'</li>' );
		}
		$( '#div'+ V.tab +' .entries' ).html( li );
	}
	, mixers   : () => {
		var data = renderDataSort( 'mixers' );
		var li = '';
		$.each( data, ( k, v ) => {
			li +=    '<li data-name="'+ k +'">'+ ico( V.tab ) + ico( 'remove' )
					+'<div class="li1">'+ k +'</div>'
					+'<div class="li2">In: '+ v.channels.in +' - Out: '+ v.channels.out +'</div>'
					+'</li>';
		} );
		$( '#div'+ V.tab +' .entries' ).html( li );
	}
	, pipeline : () => {
		var data = jsonClone( PIP );
		var li = '';
		data.forEach( ( el, i ) => {
			if ( el.type === 'Filter' ) {
				var icon = 'graph'
				var each = '<div class="li1">' + el.type +'</div>'
						  +'<div class="li2">channel '+ el.channel +': '+ el.names.join( ', ' ) +'</div>';
			} else {
				var icon = 'mixers'
				var each = el.name;
			}
			li += '<li data-type="'+ el.type +'" data-index="'+ i +'">'+ ico( icon ) + ico( 'remove' ) + each +'</li>';
		} );
		$( '#div'+ V.tab +' .entries' ).html( li );
		pipelineSort();
	}
}
var renderSub = {
	  mixers   : ( name, data ) => {
		V.mixers      = { name: name, data: data }
		var chmapping = data.length;
		var chin      = DEV.capture.channels;
		var chout     = DEV.playback.channels;
		var iconadd   = chout === chmapping ? '' : ico( 'add' );
		var li        = '<li class="lihead" data-name="'+ name +'">'+ name + iconadd + ico( 'back' ) +'</li>';
		var optsource = htmlOption( chin );
		data.forEach( ( kv, i ) => {
			var dest     = kv.dest;
			var classvol = kv.mute ? 'infobtn-primary' : '';
			var iconvol  = kv.mute ? 'mute' : 'volume';
			var i_name   = ' data-index="'+ i +'" data-name="'+ name +'"';
			li        += '<div class="divdest">'
						+'<li class="liinput main"'+ i_name +' data-dest="'+ dest +'">'
						+'<a class="mutedest infobtn '+ classvol +'">'+ ico( iconvol ) +'</a>Out '+ dest
						+'</li>'
						+'<li class="liinput column"'+ i_name +'><div>In</div><div></div><div>Gain</div><div>Mute</div><div>Invert</div>'+ ico( 'add' ) +'</li>';
			kv.sources.forEach( ( s, si ) => {
				var source   = data[ i ].sources[ si ];
				var channel  = source.channel;
				var opts     = optsource.replace( '>'+ channel, ' selected>'+ channel );
				var step_val =  ' step="0.1" value="'+ dbFormat( source.gain ) +'"';
				li += '<li class="liinput"'+ i_name +'" data-si="'+ si +'"><select>'+ opts +'</select>'
					 +'<input type="number"'+ step_val +'>'
					 +'<input type="range"'+ step_val +' min="-6" max="6"'+ ( source.mute ? ' disabled' : '' ) +'>'
					 +'<input type="checkbox" class="mute"'+ ( source.mute ? ' checked' : '' ) +'>'
					 +'<input type="checkbox"'+ ( source.inverted ? ' checked' : '' ) +'>'+ ico( 'remove' ) +'</li>';
			} );
			li      += '</div>';
		} );
		$( '#divmixers .entries' ).html( li );
		$( '#divmixers .entries select' ).select2( select2opt );
	}
	, pipeline : ( index, data ) => {
		V.pipeline = { index: index, data: data }
		var li     = '<li class="lihead" data-index="'+ index +'">Channel '+ data.channel + ico( 'add' ) + ico( 'back' ) +'</li>';
		data.names.forEach( ( name, i ) => {
			li += '<li data-index="'+ i +'" data-name="'+ name +'">'+ ico( 'filters' ) + ico( 'remove' ) + name +'</li>';
		} );
		$( '#divpipeline .entries' ).html( li );
		pipelineSort();
	}
}
function renderDataSort( tab ) {
	var kv   = S.config[ tab ];
	var data = {};
	var keys = Object.keys( kv );
	keys.sort().forEach( k => data[ k ] = kv[ k ] );
	return data
}
function renderDevice( section, keys ) {
	if ( [ 'capture', 'playback' ].includes( section ) ) {
		var kv = jsonClone( DEV[ section ] );
		keys   = deviceKeys( section, kv.type );
	} else {
		var kv = DEV;
		if ( section === 'sampling' ) keys = L.sampling;
	}
	if ( section === 'options' ) {
		var labels = '<hr>';
		var values = '<hr>';
	} else {
		var labels = '';
		var values = '';
	}
	keys.forEach( k => {
		labels += key2label( k ) +'<br>';
		values += kv[ k ] +'<br>';
	} );
	if ( DEV.resampler_type === 'FreeAsync' ) {
		[ 'sinc_len', 'oversampling_ratio', 'interpolation', 'window', 'f_cutoff' ].forEach( k => {
			labels += key2label( k ) +'<br>';
			values += DEV.resampler_type.FreeAsync[ k ] +'<br>';
		} );
	}
	$( '#div'+ section +' .entries' ).html(
		 '<div class="col-l text gr">'+ labels +'</div>'
		+'<div class="col-r text">'+ stringReplace( values ) +'</div><div style="clear:both"></div>'
	);
}
function renderPage() {
	$( '#statusvalue' ).html( S.status );
	$( '#configuration' )
		.html( htmlOption( S.lsconf ) )
		.val( S.fileconf );
	DEV = S.config.devices;
	FIL = S.config.filters;
	MIX = S.config.mixers;
	PIP = S.config.pipeline;
	renderTab();
	showContent();
}
function renderTab() {
	var title = key2label( V.tab );
	if ( V.tab === 'pipeline' && PIP.length ) title += ico( 'flowchart' );
	title    += ico( V.tab === 'devices' ? 'gear settings' : 'add' );
	$( '#divsettings .headtitle' ).eq( 0 ).html( title );
	$( '.tab' ).addClass( 'hide' );
	$( '#div'+ V.tab ).removeClass( 'hide' );
	$( '#bar-bottom div' ).removeClass( 'active' );
	$( '#'+ V.tab ).addClass( 'active' );
	if ( $( '#div'+ V.tab +' .entries' ).is( ':empty' ) ) render[ V.tab ]();
}
function saveConfig( icon, titlle, msg ) {
	var config = JSON.stringify( S.config ).replace( /"/g, '\\"' );
	ws.send( '{ "SetConfigJson": "'+ config +'" }' );
	ws.send( '"Reload"' );
	if ( icon ) { // all except gain
		notify( icon, titlle, msg, 3000 );
		bash( [ 'settings/camilla.py', 'save' ] );
	}
}
function setConfig( name ) {
	ws.send( '{ "SetConfigName": "/srv/http/data/camilladsp/configs/'+ name +'" }' );
	ws.send( '"Reload"' );
	ws.send( '"GetConfigjson"' );
}
function stringReplace( k ) {
	return k
			.replace( 'Alsa',  'ALSA' )
			.replace( 'Std',   'std' )
			.replace( 'FLOAT', 'Float' )
			.replace( 'TEXT',  'Text' )
}
