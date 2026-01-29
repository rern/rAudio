W.volume     = values => {
	if ( ! ( 'db' in values ) || ! $( '#infoList .inforange' ).length ) return
	
	var volume      = SW.id === 'mixer' ? 'volume' : 'volumebt';
	$( '#infoList' ).removeClass( 'hide' );
	$( '.confirm' ).addClass( 'hide' );
	V.local = true;
	UTIL.volumeSet( values );
}

var CONFIG   = {
	  _disable     : {
		  mixertype : () => {
			UTIL.novolume.warning();
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
	, btsender      : values => {
		UTIL.mixer( values );
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
	, mixer        : values => {
		UTIL.mixer( values );
	}
	, mixertype    : () => {
		INFO( {
			  ...SW
			, list         : [ '', 'radio', { kv: { 'DAC hardware <gr>(Mixer)</gr>': 'hardware', 'MPD software': 'software' }, sameline: false } ]
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
			, [ 'Gain control with Device Mixer', 'checkbox' ]
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
	  mixer        : values => {
		var bt  = SW.id === 'btsender';
		var val = values.val;
		INFO( {
			  icon       : bt ? 'btsender' : 'volume'
			, title      : ( bt ? 'Sender' : 'Device' ) + ' Mixer Volume'
			, list       : [ bt ? 'BlueALSA' : S.output.mixer, 'range' ]
			, footer     : '<br>'+ UTIL.warning
			, values     : val
			, beforeshow : () => {
				if ( S.volumemax ) $( '#infoButton' ).addClass( 'hide' );
				$( '.infofooter' ).addClass( 'hide' );
				var $range  = $( '#infoList input' );
				$( '#infoList' ).css( 'height', '160px' );
				$( '.inforange' ).append( '<div class="sub gr"></div>' );
				var volume  = bt ? 'volumebt' : 'volume';
				var cmd     = bt ? [ 'volume', S.btmixer, 'bluealsa', val ] : [ 'volume', S.output.mixer, S.output.card, val ];
				$range.on( 'input', function() {
					var target      = +this.value;
					BASH( [ ...cmd, target, 'CMD CONTROL CARD CURRENT TARGET' ] );
				} );
				$( '.inforange i' ).on( 'click', function() {
					$range
						.trigger( 'input' )
						.trigger( 'keyup' );
				} );
				UTIL.volumeSet( values );
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
				var cmd0db = bt ? 'volume0dbbt' : 'volume0db';
				if ( values.db > -2 ) {
					BASH( [ cmd0db ] );
				} else {
					if ( ! $( '.infofooter' ).hasClass( 'hide' ) ) BASH( [ cmd0db ] );
					$( '#infoList table, .infofooter' ).toggleClass( 'hide' );
				}
			}
		} );
	}
	, mixerSet  : mixertype => {
		NOTIFY( 'mpd', 'Mixer Control', 'Change ...' );
		BASH( [ 'mixertype', mixertype, S.output.name, 'CMD MIXERTYPE DEVICE' ] );
	}
	, novolume  : {
		  warning : () => {
			INFO( {
				  ...SW
				, message : UTIL.warning
				, cancel  : SWITCH.cancel
				, ok      : UTIL.novolume.set
			} );
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
	, volumeSet : values => {
		V.local    = false;
		var volume = SW.id === 'btsender' ? 'volumebt' : 'volume';
		var val    = values.val;
		var db     = values.db;
		$( '.inforange .value' ).text( val );
		$( '.inforange input' ).val( val );
		$( '.inforange .sub' ).text( db +' dB' );
		$( '#infoOk' ).toggleClass( 'disabled', db === 0 || db === '' );
		if ( ! $( '#code'+ SW.id ).hasClass( 'hide' ) ) STATUS( SW.id );
	}
	, warning   : V.i_warning +'<wh>Lower speakers / headphones volume<br><br>'
				 +'<gr>Signal will be set to original level at 0dB.</gr><br>'
				 +'Beware of too high volume.</wh>'
}

function renderPage() {
	headIcon();
	$( '.button-lib-update' ).toggleClass( 'bl', S.updating_db );
	var htmlstatus = S.version
					+'<br>'+ S.lastupdate +' <gr>'+ S.updatetime +'</gr>'
					+'<div id="database">';
	C              = S.counts;
	[ 'song'
	, 'album',     'albumartist', 'artist', 'composer', 'conductor', 'date', 'genre'
	, 'playlists', 'webradio',    'dabradio' ].forEach( k => {
		var count = C[ k ];
		if ( count ) htmlstatus += '<a>'+ ICON( k +' gr' ) + count.toLocaleString() +'</a>';
	} );
	$( '#divstatus .value' ).html( htmlstatus +'</div>' );
	var bluetooth = S.btmixer !== false;
	if ( bluetooth ) {
		$( '#btreceiver' ).html( '<option>'+ S.btmixer.replace( / *-* A2DP/, '' ) +'</option>' );
		$( '#btsender' ).html( '<option>BlueALSA</option>' );
		$( '#divbtreceiver, #divbtsender' ).removeClass( 'hide' );
	} else {
		$( '#divbtreceiver, #divbtsender' ).addClass( 'hide' );
	}
	$( '#divmixertype .col-l i' ).remove();
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) $( '#divmixertype .col-l' ).append( ICON( k ) );
	} );
	if ( S.asoundcard === -1 ) {
		$( '#divoutput' ).toggleClass( 'hide', ! bluetooth );
		$( '#divbitperfect' ).addClass( 'hide' );
	} else {
		var devicehide = bluetooth && ! S.devicewithbt;
		var novolume   = ! [ 'camilladsp', 'crossfade', 'equalizer', 'mixertype', 'normalization', 'replaygain', 'soxr' ].some( k => S[ k ] );
		$( '#divoutput' ).removeClass( 'hide' );
		$( '#divbitperfect' ).toggleClass( 'hide', bluetooth && ! S.devicewithbt );
		$( '#divdevice, #divmixer, #divmixertype' ).toggleClass( 'hide', devicehide );
		$( '#device' )
			.html( COMMON.select.option( Object.keys( S.devices ) ) )
			.val( S.output.name );
		if ( ! devicehide && S.mixers ) {
			$( '#mixer' ).html( COMMON.select.option( S.mixers ) );
			$( '#setting-mixer' ).toggleClass( 'hide', novolume );
			$( '#divmixer' ).removeClass( 'hide' );
		} else {
			$( '#divmixer' ).addClass( 'hide' );
		}
		$( '#mixertype, #setting-mixertype' ).toggleClass( 'disabled', S.camilladsp );
		$( '#novolume' )
			.prop( 'checked', novolume )
			.toggleClass( 'disabled', novolume );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.ffmpeg && S.dabradio );
	}
	[ 'albumignore', 'mpdignore', 'nonutf8' ].forEach( k => $( '#'+ k ).toggleClass( 'hide', ! S.lists[ k ] ) );
	if ( I.range ) $( '#infoX' ).trigger( 'click' );
	CONTENT();
	var w          = 0;
	$( '#database a' ).each( ( i, el ) => {
		var elW = $( el ).width();
		if ( elW > w ) w = elW;
	} );
	$( '#database a' ).css( 'width', ( w + 15 ) +'px' );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.button-lib-update' ).on( 'click', COMMON.libraryUpdate );
$( '#device' ).on( 'input', function() {
	var device = this.value;
	if ( device === S.output.name ) return
	
	NOTIFY( 'volume', 'Output Device', 'Change ...' );
	BASH( [ 'device', device, 'CMD DEVICE' ] );
} );
$( '#mixer' ).on( 'input', function() {
	var mixer = this.value;
	if ( mixer === S.output.mixer ) return
	
	NOTIFY( 'volume', 'Mixer', 'Change ...' );
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
