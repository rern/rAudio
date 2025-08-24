W.mpdupdate  = data => {
	if ( 'done' in data ) {
		$.each( S.counts, ( k, v ) => { S[ k ] = data.done[ k ] } );
		S.updatetime  = data.updatetime
		S.updating_db = false;
		UTIL.renderStatus();
	}
}
W.volume     = data => {
	if ( ! ( 'db' in data ) ) return
	 
	S.volume   = data.val;
	S.volumedb = data.db;
	if ( ! $( '#infoList .inforange' ).length ) return
	
	$( '#novolume' ).prop( 'checked', S.novolume );
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		V.local = true;
		$( '#infoList' ).removeClass( 'hide' );
		$( '.confirm' ).addClass( 'hide' );
		UTIL.volumeSet();
	}, 300 );
}

var CONFIG   = {
	  _disable     : {
		  mixertype : () => {
			if ( S.volumedb > -2 ) {
				UTIL.mixerSet( 'none' );
			} else {
				INFO( {
					  icon    : 'volume'
					, title   : 'Volume Control'
					, message : UTIL.warning
					, cancel  : SWITCH.cancel
					, ok      : () => UTIL.mixerSet( 'none' )
				} );
			}
		}
		, novolume : () => {
			INFO( {
				  icon    : 'set0'
				, title   : 'No Volume'
				, message : 'To disable: Enable any volume related settings'
			} );
			$( '#novolume' ).prop( 'checked', true );
		}
	}
	, _prompt      : {
		  novolume : () => {
			if ( S.custom ) {
				INFO( {
					  ...SW
					, message : LABEL_ICON( "User's Configurations" ) +' is currently enabled.'
								+'<br>Remove any volume related settings.'
				} );
			}
			if ( S.camilladsp || S.equalizer ) {
				INFO( {
					  ...SW
					, message :  '<wh>No Volume</wh> also disable:<br><br>'
								+'<a class="helpmenu tab"><i class="i-'+ tab.toLowerCase() +'"></i> Features</a>'
								+ ( S.camilladsp ? LABEL_ICON( 'DSP', 'camilladsp' ) : LABEL_ICON( 'Equalizer', 'equalizer' ) )
					, cancel  : SWITCH.cancel
					, ok      : UTIL.novolume.warning
				} );
			} else {
				UTIL.novolume.warning();
			}
		}
	}
	, buffer       : values => {
		INFO( {
			  ...SW
			, message      : '<c>audio_buffer_size</c>'
			, list         : [ 'kB', 'number', { updn: { step: 1024, min: 4096, max: 40960 } } ]
			, boxwidth     : 110
			, values       : values
			, checkchanged : S.buffer
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	  }
	, crossfade    : values => {
		INFO( {
			  ...SW
			, list         : [ 'Seconds', 'number', { updn: { step: 1, min: 0, max: 10 } } ]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.crossfade
			, checkblank   : true
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, custom       : () => {
		BASH( 'data-config.sh custom', values => {
			var list = `\
<table width="100%">
<tr><td><c>mpd.conf</c></td></tr>
<tr><td><pre>
...
user                   "mpd"</pre></td></tr>
	<tr><td><textarea></textarea></td></tr>
	<tr><td><pre>
...
audio_output {
    ...
    mixer_device   "hw:${ S.output.card }"
</pre></td></tr>
<tr><td><textarea style="padding-left: 42px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
			var val    = values.split( '^^' );
			var global = val[ 0 ].trim(); // remove trailing
			var output = val[ 1 ].trim();
			INFO( {
				  ...SW
				, list         : list
				, boxwidth     : 370
				, values       : [ global, output ]
				, checkchanged : S.custom
				, cancel       : SWITCH.cancel
				, ok           : () => {
					var infoval = _INFO.val();
					global      = infoval[ 0 ];
					output      = infoval[ 1 ];
					if ( ! global && ! output ) {
						NOTIFY( SW.icon, SW.title, 'Disable ...', 3000 );
						BASH( [ 'custom', 'OFF' ] );
						return
					}
					
					NOTIFY_COMMON();
					BASH( [ 'custom', global, output, S.output.name, 'CMD GLOBAL OUTPUT DEVICE' ], error => {
						if ( error ) {
							BANNER_HIDE();
							INFO( {
								  ...SW
								, message : V.i_warning +'MPD failed with the added lines'
											+'<br>Current configuration restored.'
							} );
						}
					} );
				}
			} );
		} );
	}
	, mixer        : () => {
		var bluealsa = SW.id.slice( -1 ) === 'a';
		if ( bluealsa ) {
			var control = S.btmixer.replace( / *-* A2DP/, '' );
			var cmd     = [ 'volume', S.btmixer, '', S.volume ];
			var cmd0db  = 'volume0dbbt';
		} else {
			var title   = 'Mixer Volume'
			var control = S.output.mixer;
			var cmd     = [ 'volume', S.output.mixer, S.output.card, S.volume ];
			var cmd0db  = 'volume0db';
		}
		INFO( {
			  icon       : SW.icon
			, title      : SW.title +' Volume'
			, list       : [ control, 'range' ]
			, footer     : '<br>'+ UTIL.warning
			, values     : S.volume
			, beforeshow : () => {
				if ( S.volumemax ) $( '#infoButton' ).addClass( 'hide' );
				$( '.infofooter' ).addClass( 'hide' );
				var $range  = $( '#infoList input' );
				$( '#infoList' ).css( 'height', '160px' );
				$( '.inforange' ).append( '<div class="sub gr"></div>' );
				$range.on( 'input', function() {
					S.volume = +this.value;
					UTIL.volumeSet();
					BASH( [ ...cmd, S.volume, 'CMD CONTROL CARD CURRENT TARGET' ] );
				} );
				$( '.inforange i' ).on( 'click', function() {
					S.volume = +$range.val();
					$range
						.trigger( 'input' )
						.trigger( 'keyup' );
				} );
				UTIL.volumeSet();
			}
			, cancel     : () => {
				if ( ! $( '.infofooter' ).hasClass( 'hide' ) ) {
					LOCAL();
					$( '#infoList table, .infofooter' ).toggleClass( 'hide' );
					setTimeout( () => I.oknoreset = true, 300 );
				}
			}
			, oklabel    : ICON( 'set0' ) +'0dB'
			, oknoreset  : true
			, ok         : () => {
				if ( S.volumedb > -2 ) {
					BASH( [ cmd0db ] );
				} else {
					if ( ! $( '.infofooter' ).hasClass( 'hide' ) ) BASH( [ cmd0db ] );
					$( '#infoList table, .infofooter' ).toggleClass( 'hide' );
				}
			}
		} );
	}
	, mixertype    : () => {
		INFO( {
			  ...SW
			, list         : [ '', 'radio', { kv: { 'DAC hardware <gr>(Mixer Device)</gr>': 'hardware', 'MPD software': 'software' }, sameline: false } ]
			, values       : S.mixertype ? S.output.mixertype : 'hardware'
			, checkchanged : S.mixertype
			, cancel       : SWITCH.cancel
			, ok           : () => UTIL.mixerSet( _INFO.val() )
		} );
	}
	, outputbuffer : values => {
		INFO( {
			  ...SW
			, message      : '<c>max_output_buffer_size</c>'
			, list         : [ 'kB', 'number', { updn: { step: 1024, min: 8192, max: 81920 } } ]
			, boxwidth     : 110
			, values       : values
			, checkchanged : S.outputbuffer
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, replaygain   : values => {
		var list = [
			  [ '',                               'radio', { kv: { Auto: 'auto', Album: 'album', Track: 'track' } } ]
			, [ 'Gain control with Mixer Device', 'checkbox' ]
		];
		if ( S.output.mixertype !== 'software' || ! S.mixers ) {
			delete values.HARDWARE;
			list = list[ 0 ];
		}
		INFO( {
			  ...SW
			, list         : list
			, values       : values
			, checkchanged : S.replaygain
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, soxr         : values => {
		values.QUALITY === 'custom' ? UTIL.soxr.custom( values ) : UTIL.soxr.preset( values );
	}
}
var UTIL     = {
	  mixerSet  : mixertype => {
		NOTIFY( 'mpd', 'Mixer Control', 'Change ...' );
		BASH( [ 'mixertype', mixertype, S.output.name, 'CMD MIXERTYPE DEVICE' ] );
	}
	, novolume  : {
		  warning : () => {
			if ( S.volumedb > -2 ) {
				UTIL.novolume.set();
			} else {
				INFO( {
					  ...SW
					, message : UTIL.warning
					, cancel  : SWITCH.cancel
					, ok      : UTIL.novolume.set
				} );
			}
		}
		, set     : () => {
			NOTIFY_COMMON( 'Enable ...' );
			BASH( [ 'novolume' ] );
		}
	}
	, soxr      : {
		  preset : values => {
			INFO( {
				  ...SW
				, tablabel     : [ 'Presets', 'Custom' ]
				, tab          : [ '', () => SETTING( 'soxr soxr-custom', UTIL.soxr.custom ) ]
				, list         : [
					  [ 'Quality', 'select', { 'Very high': 'very high', High: 'high', Medium: 'medium', Low: 'low', Quick: 'quick' } ]
					, [ 'Threads', 'radio',  { Auto: 0, Single: 1 } ]
				]
				, values       : values
				, checkblank   : true
				, checkchanged : S.soxr
				, boxwidth     : 120
				, cancel       : SWITCH.cancel
				, ok           : SWITCH.enable
			} );
		}
		, custom : values => {
			var flag = {
				  'Rolloff - Small'  : 0
				, 'Rolloff - Medium' : 1
				, 'Rolloff - None'   : 2
				, 'High precision'   : 8
				, 'Double precision' : 16
				, 'Variable rate'    : 32
			}
			INFO( {
				  ...SW
				, tablabel     : [ 'Presets', 'Custom' ]
				, tab          : [ () => SETTING( 'soxr soxr', UTIL.soxr.preset ), '' ]
				, list         : [
					  [ 'Type',           'hidden' ]
					, [ 'Precision',      'select', { kv: [ 16, 20, 24, 28, 32 ], suffix: 'bit' } ]
					, [ 'Phase Response', 'number', { suffix: '(0-100)' } ]
					, [ 'Passband End',   'number', { suffix: '(0-100%)' } ]
					, [ 'Stopband Begin', 'number', { suffix: '(100-150%)' } ]
					, [ 'Attenuation',    'number', { suffix: '(0-30dB)' } ]
					, [ 'Bitmask Flag',   'select', { kv: flag, colspan: 2, width: 160 } ]
				]
				, values       : values
				, checkblank   : true
				, checkchanged : S.soxr
				, boxwidth     : 70
				, cancel       : SWITCH.cancel
				, ok           : SWITCH.enable
			} );
		}
	}
	, statusSet : () => {
		var updating   = S.updating_db ? '&ensp;'+ ICON( 'library gr blink' ) : '';
		var htmlstatus = S.version
						+'<br>'+ S.lastupdate +' <gr>'+ S.updatetime + updating +'</gr>'
						+'<div id="database">';
		[ 'song', 'album', 'albumartist', 'artist', 'composer', 'conductor', 'date', 'genre', 'webradio', 'dabradio' ].forEach( k => {
			var count = S.counts[ k ];
			if ( count ) htmlstatus += '<a>'+ ICON( k +' gr' ) + count.toLocaleString() +'</a>';
		} );
		$( '#divstatus .value' ).html( htmlstatus +'</div>' );
	}
	, volumeSet : () => {
		V.local = false;
		$( '.inforange .value' ).text( S.volume );
		$( '.inforange input' ).val( S.volume );
		$( '.inforange .sub' ).text( S.volumedb +' dB' );
		$( '#infoOk' ).toggleClass( 'disabled', S.volumedb === 0 || S.volumedb === '' );
	}
	, warning   : V.i_warning +'<wh>Lower speakers / headphones volume<br><br>'
				 +'<gr>Signal will be set to original level at 0dB.</gr><br>'
				 +'Beware of too high volume.</wh>'
}

function renderPage() {
	headIcon();
	UTIL.statusSet();
	if ( S.bluetooth ) {
		$( '#btreceiver' ).html( '<option>'+ S.btmixer.replace( / *-* A2DP$/, '' ) +'</option>' );
		$( '#divbluealsa' ).removeClass( 'hide' );
	} else {
		$( '#divbluealsa' ).addClass( 'hide' );
	}
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) V.icondsp = ICON( k );
	} );
	$( '#divdevice .col-l i' ).remove();
	if ( V.icondsp ) $( '#divbluealsa .col-l, #divdevice .col-l' ).append( V.icondsp );
	if ( S.asoundcard === -1 ) {
		$( '#divoutput, #divbitperfect, #divvolume' ).toggleClass( 'hide', ! S.bluetooth );
	} else {
		$( '#divoutput, #divbitperfect, #divvolume' ).removeClass( 'hide' );
		$( '#divdevice, #divmixer, #divmixertype' ).toggleClass( 'hide', S.bluetooth && ! S.devicewithbt );
		$( '#device' )
			.html( COMMON.select.option( Object.keys( S.devices ) ) )
			.val( S.output.name );
		if ( S.mixers ) {
			$( '#mixer' )
				.html( COMMON.select.option( S.mixers ) )
				.val( S.output.mixer );
			$( '#setting-mixer' ).toggleClass( 'hide', ! S.volume || S.novolume );
			$( '#divmixer' ).removeClass( 'hide' );
		} else {
			$( '#divmixer' ).addClass( 'hide' );
		}
		$( '#mixertype, #setting-mixertype' ).toggleClass( 'disabled', S.camilladsp );
		$( '#novolume' ).prop( 'checked', S.novolume );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.ffmpeg && S.dabradio );
	}
	[ 'albumignore', 'mpdignore', 'nonutf8' ].forEach( k => $( '#'+ k ).toggleClass( 'hide', ! S.lists[ k ] ) );
	if ( I.range ) $( '#infoX' ).trigger( 'click' );
	CONTENT();
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.col-l.text gr' ).on( 'click', function() {
	console.log(0)
} );
$( '#device' ).on( 'input', function() {
	var device = this.value;
	if ( device === S.output.name ) return
	
	NOTIFY( 'volume', 'Output Device', 'Change ...' );
	BASH( [ 'device', device, 'CMD DEVICE' ] );
} );
$( '#mixer' ).on( 'input', function() {
	var mixer = this.value;
	if ( mixer === S.output.mixer ) return
	
	NOTIFY( 'volume', 'Mixer Device', 'Change ...' );
	BASH( [ 'mixer', mixer, S.output.name, S.output.card, 'CMD MIXER DEVICE CARD' ] );
} );
$( '#ffmpegfiletype' ).on( 'click', function() {
	var $pre = $( '#prefiletype' );
	if ( $pre.is( ':empty' ) ) {
		BASH( [ 'filetype' ], data => {
			$pre
				.html( data )
				.toggleClass( 'hide' );
		} );
	} else {
		$pre.toggleClass( 'hide' );
	}
	$( this ).toggleClass( 'active' );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
