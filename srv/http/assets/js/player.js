var warning  = iconwarning +'<wh>Lower speakers / headphones volume<br><br>'
			  +'<gr>Signal will be set to original level at 0dB.</gr><br>'
			  +'Beware of too high volume.</wh>';

var setting  = {
	  noVolume      : () => {
		if ( S.volumedb > -2 ) {
			setting.noVolumeSet();
		} else {
			info( {
				  ...SW
				, message : warning
				, cancel  : switchCancel
				, ok      : setting.noVolumeSet
			} );
		}
	}
	, noVolumeSet : () => {
		notifyCommon( 'Enable ...' );
		bash( [ 'novolume' ], () => {
			if ( ! S.custom ) return
			
			info( {
				  ...SW
				, message : icoLabel( "User's Configurations" ) +' is currently enabled.'
							+'<br>Remove any volume related settings.'
			} );
		} );
	}
	, soxr        : () => {
		bash( [ 'confget', 'soxr', 'CMD NAME' ], values => {
			delete values.PLUGIN;
			info( {
				  ...SW
				, tablabel     : [ 'Presets', 'Custom' ]
				, tab          : [ '', setting.soxrCustom ]
				, list         : [
					  [ 'Quality', 'select', { 'Very high': 'very high', High: 'high', Medium: 'medium', Low: 'low', Quick: 'quick' } ]
					, [ 'Threads', 'radio',  { Auto: 0, Single: 1 } ]
				]
				, values       : values
				, checkblank   : true
				, checkchanged : S.soxr
				, boxwidth     : 180
				, cancel       : switchCancel
				, ok           : switchEnable
			} );
		}, 'json' );
	}
	, soxrCustom  : () => {
		bash( [ 'confget', 'soxr-custom', 'CMD NAME' ], values => {
			delete values.PLUGIN;
			var flag = {
				  'Rolloff - Small'  : 0
				, 'Rolloff - Medium' : 1
				, 'Rolloff - None'   : 2
				, 'High precision'   : 8
				, 'Double precision' : 16
				, 'Variable rate'    : 32
			}
			info( {
				  ...SW
				, tablabel     : [ 'Presets', 'Custom' ]
				, tab          : [ setting.soxr, '' ]
				, list         : [
					  [ 'Type',           'hidden' ]
					, [ 'Precision',      'select', { kv: [ 16, 20, 24, 28, 32 ], suffix: 'bit' } ]
					, [ 'Phase Response', 'number', { suffix: '0-100' } ]
					, [ 'Passband End',   'number', { suffix: '0-100%' } ]
					, [ 'Stopband Begin', 'number', { suffix: '100-150%' } ]
					, [ 'Attenuation',    'number', { suffix: '0-30dB' } ]
					, [ 'Bitmask Flag',   'select', { kv: flag, colspan: 2 } ]
				]
				, values       : values
				, checkblank   : true
				, checkchanged : S.soxr
				, boxwidth     : 105
				, beforeshow   : () => {
					$( '#infoList .select2-container' ).last().attr( 'style', 'width: 100% !important' )
				}
				, cancel       : switchCancel
				, ok           : switchEnable
			} );
		}, 'json' );
	}
}
function renderPage() {
	playbackButton();
	renderStatus();
	if ( S.bluetooth ) {
		$( '#btreceiver' ).html( '<option>'+ S.btmixer.replace( / *-* A2DP$/, '' ) +'</option>' );
		$( '#divbluealsa' ).removeClass( 'hide' );
	} else {
		$( '#divbluealsa' ).addClass( 'hide' );
	}
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) V.icondsp = ico( k );
	} );
	$( '#divdevice .col-l i' ).remove();
	if ( V.icondsp ) $( '#divbluealsa .col-l, #divdevice .col-l' ).append( V.icondsp );
	if ( S.asoundcard === -1 ) {
		$( '#divoutput, #divbitperfect, #divvolume' ).toggleClass( 'hide', ! S.bluetooth );
	} else {
		$( '#divoutput, #divbitperfect, #divvolume' ).removeClass( 'hide' );
		$( '#divdevice, #divmixer, #divmixertype' ).toggleClass( 'hide', S.bluetooth && ! S.devicewithbt );
		$( '#device' )
			.html( htmlOption( Object.keys( S.devices ) ) )
			.val( S.output.name );
		if ( S.mixers ) {
			$( '#mixer' )
				.html( htmlOption( S.mixers ) )
				.val( S.output.mixer );
			$( '#setting-mixer' ).toggleClass( 'hide', ! S.volume );
			$( '#divmixer' ).removeClass( 'hide' );
		} else {
			$( '#divmixer' ).addClass( 'hide' );
		}
		$( '#novolume' ).prop( 'checked', S.novolume );
		$( '#divmixertype' ).toggleClass( 'hide', S.camilladsp );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.ffmpeg && S.dabradio );
	}
	[ 'albumignore', 'mpdignore', 'nonutf8' ].forEach( k => $( '#'+ k ).toggleClass( 'hide', ! S.lists[ k ] ) );
	if ( I.range ) $( '#infoX' ).trigger( 'click' );
	showContent();
}
function renderStatus() {
	var htmlstatus =  S.version +'<br>';
	[ 'song', 'webradio' ].forEach( ( k, i ) => htmlstatus += ico( k +' gr' ) +' '+ S.counts[ i ].toLocaleString() +' &emsp;' );
	if ( S.updating_db ) htmlstatus += ico( 'library gr blink' );
	htmlstatus += '<br>'+ S.lastupdate;
	if ( S.updatetime ) htmlstatus += '<wide> <gr>'+ S.updatetime +'</gr></wide>';
	$( '#divstatus .value' ).html( htmlstatus );
}
function setMixerType( mixertype ) {
	notify( 'mpd', 'Mixer Control', 'Change ...' );
	bash( [ 'mixertype', mixertype, S.output.name, 'CMD MIXERTYPE DEVICE' ] );
}
function psVolume( data ) {
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
		volumeInfoSet();
	}, 300 );
}
function volumeInfoSet() {
	V.local = false;
	$( '.inforange .value' ).text( S.volume );
	$( '.inforange input' ).val( S.volume );
	$( '.inforange .sub' ).text( S.volumedb +' dB' );
	$( '#infoOk' ).toggleClass( 'disabled', S.volumedb === 0 || S.volumedb === '' );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#device' ).on( 'input', function() {
	notify( 'volume', 'Output Device', 'Change ...' );
	bash( [ 'device', $( this ).val(), 'CMD DEVICE' ] );
} );
$( '#mixer' ).on( 'input', function() {
	notify( 'volume', 'Mixer Device', 'Change ...' );
	bash( [ 'mixer', $( this ).val(), S.output.name, S.output.card, 'CMD MIXER DEVICE CARD' ] );
} );
$( '#setting-mixer, #setting-bluealsa' ).on( 'click', function() {
	var bluealsa = this.id.slice( -1 ) === 'a';
	if ( bluealsa ) {
		var control = S.btmixer.replace( / *-* A2DP/, '' );
		var cmd     = [ 'volume', S.btmixer, '', S.volume ];
		var cmd0db  = 'volume0dbbt';
	} else {
		var control = S.output.mixer;
		var cmd     = [ 'volume', S.output.mixer, S.output.card, S.volume ];
		var cmd0db  = 'volume0db';
	}
	info( {
		  icon       : SW.icon
		, title      : 'Mixer Volume'
		, list       : [ control, 'range' ]
		, footer     : '<br>'+ warning
		, values     : S.volume
		, beforeshow : () => {
			if ( S.volumemax ) $( '#infoButton' ).addClass( 'hide' );
			$( '.infofooter' ).addClass( 'hide' );
			var $range  = $( '#infoList input' );
			$( '#infoList' ).css( 'height', '160px' );
			$( '.inforange' ).append( '<div class="sub gr"></div>' );
			$range.on( 'input', function() {
				S.volume = +$range.val();
				volumeMaxSet();
				volumeInfoSet();
				bash( [ ...cmd, S.volume, 'CMD CONTROL CARD CURRENT TARGET' ] );
			} );
			$( '.inforange i' ).on( 'click', function() {
				S.volume = +$range.val();
				volumeMaxSet();
				$range
					.trigger( 'input' )
					.trigger( 'keyup' );
			} );
			volumeInfoSet();
		}
		, cancel     : () => {
			if ( ! $( '.infofooter' ).hasClass( 'hide' ) ) {
				local();
				$( '#infoList table, .infofooter' ).toggleClass( 'hide' );
				setTimeout( () => I.oknoreset = true, 300 );
			}
		}
		, oklabel    : ico( 'set0' ) +'0dB'
		, oknoreset  : true
		, ok         : () => {
			if ( S.volumedb > -2 ) {
				bash( [ cmd0db ] );
			} else {
				if ( ! $( '.infofooter' ).hasClass( 'hide' ) ) bash( [ cmd0db ] );
				$( '#infoList table, .infofooter' ).toggleClass( 'hide' );
			}
		}
	} );
} );
$( '#mixertype' ).on( 'click', function() {
	if ( S.mixertype ) {
		if ( S.volumedb > -2 ) {
			setMixerType( 'none' );
		} else {
			info( {
				  icon    : 'volume'
				, title   : 'Volume Control'
				, message : warning
				, cancel  : switchCancel
				, ok      : () => setMixerType( 'none' )
			} );
		}
	} else {
		S.mixers ? $( '#setting-mixertype' ).trigger( 'click' ) : setMixerType( 'software' );
	}
} );
$( '#setting-mixertype' ).on( 'click', function() {
	info( {
		  ...SW
		, list    : [ '', 'radio', { kv: { 'DAC hardware <gr>(Mixer Device)</gr>': 'hardware', 'MPD software': 'software' }, sameline: false } ]
		, values  : S.mixertype ? S.output.mixertype : 'hardware'
		, cancel  : switchCancel
		, ok      : () => setMixerType( infoVal() )
	} );
} );
$( '#novolume' ).on( 'click', function( e ) {
	e.stopImmediatePropagation();
	if ( S.novolume ) {
		switchCancel();
		info( {
			  icon    : 'set0'
			, title   : 'No Volume'
			, message : 'To disable: Enable any volume related settings'
		} );
	} else if ( S.camilladsp || S.equalizer ) {
		info( {
			  ...SW
			, message :  '<wh>No Volume</wh> also disable:<br><br>'
						+ icoTab( 'Features' )
						+ ( S.camilladsp ? icoLabel( 'DSP', 'camilladsp' ) : icoLabel( 'Equalizer', 'equalizer' ) )
			, cancel  : switchCancel
			, ok      : setting.noVolume
		} );
	} else {
		setting.noVolume();
	}
} );
$( '#dop' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	var cmd = [ 'dop', S.output.aplayname ];
	if ( ! checked ) cmd.push( 'OFF' ); // OFF with args - value by index
	bash( cmd );
} );
$( '#setting-crossfade' ).on( 'click', function() {
	bash( [ 'confget', 'crossfade', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, list         : [ 'Seconds', 'number', { updn: { step: 1, min: 0, max: 10 } } ]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.crossfade
			, checkblank   : true
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#setting-replaygain' ).on( 'click', function() {
	bash( [ 'confget', 'replaygain', 'CMD NAME' ], values => {
		if ( S.output.mixertype !== 'software' || ! S.mixers ) delete values.HARDWARE;
		info( {
			  ...SW
			, list         : [ '', 'radio', { kv: { Auto: 'auto', Album: 'album', Track: 'track' }, sameline: false } ]
			, footer       : values.HARDWARE ? '<label><input type="checkbox"><wh>Gain control by Mixer Device</wh></label>' : ''
			, values       : values
			, checkchanged : S.replaygain
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#ffmpegfiletype' ).on( 'click', function() {
	var $pre = $( '#prefiletype' );
	if ( $pre.is( ':empty' ) ) {
		bash( [ 'filetype' ], data => {
			$pre
				.html( data )
				.toggleClass( 'hide' );
		} );
	} else {
		$pre.toggleClass( 'hide' );
	}
	$( this ).toggleClass( 'active' );
} );
$( '#setting-buffer' ).on( 'click', function() {
	bash( [ 'confget', 'buffer', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, message      : '<c>audio_buffer_size</c>'
			, list         : [ 'kB', 'number', { updn: { step: 1024, min: 4096, max: 40960 } } ]
			, boxwidth     : 110
			, values       : values
			, checkchanged : S.buffer
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#setting-outputbuffer' ).on( 'click', function() {
	bash( [ 'confget', 'outputbuffer', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, message      : '<c>max_output_buffer_size</c>'
			, list         : [ 'kB', 'number', { updn: { step: 1024, min: 8192, max: 81920 } } ]
			, boxwidth     : 110
			, values       : values
			, checkchanged : S.outputbuffer
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#setting-soxr' ).on( 'click', function() {
	S[ 'soxr-custom' ] ? setting.soxrCustom() : setting.soxr();
} );
$( '#setting-custom' ).on( 'click', function() {
	var htmllist = `\
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
<tr><td><textarea style="padding-left: 39px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
	bash( [ 'customget', S.output.name, 'CMD DEVICE' ], val => {
		var val       = val.split( '^^' );
		var global = val[ 0 ].trim(); // remove trailing
		var output = val[ 1 ].trim();
		info( {
			  ...SW
			, list         : htmllist
			, boxwidth     : 370
			, values       : [ global, output ]
			, checkchanged : S.custom
			, cancel       : switchCancel
			, ok           : () => {
				var infoval = infoVal();
				global      = infoval[ 0 ];
				output      = infoval[ 1 ];
				if ( ! global && ! output ) {
					notify( SW.icon, SW.title, 'Disable ...', 3000 );
					bash( [ 'custom', 'OFF' ] );
					return
				}
				
				notifyCommon();
				bash( [ 'custom', global, output, S.output.name, 'CMD GLOBAL OUTPUT DEVICE' ], mpdstart => {
					if ( ! mpdstart ) {
						bannerHide();
						info( {
							  ...SW
							, message : 'MPD failed with the added lines'
										+'<br>Restored to previous configurations.'
						} );
					}
				}, 'json' );
			}
		} );
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
