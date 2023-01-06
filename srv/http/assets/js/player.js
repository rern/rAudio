$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.playback' ).click( function() {
	if ( ! $( this ).hasClass( 'disabled' ) ) {
		var cmd = S.player === 'mpd' ? 'mpcplayback' : 'playerstop';
		bash( '/srv/http/bash/cmd.sh '+ cmd );
	}
} );
$( '#setting-btreceiver' ).click( function() {
	bash( [ 'volumegetbt' ], voldb => {
		var voldb = voldb.split( ' ' );
		var vol   = voldb[ 0 ];
		var db    = voldb[ 1 ];
		info( {
			  icon       : 'volume'
			, title      : 'Bluetooth Volume'
			, message    : S.btaplayname.replace( / - A2DP$/, '' )
			, rangevalue : vol
			, footer     : db +' dB'
			, beforeshow : () => {
				$( '#infoButtons' ).toggleClass( 'hide', db === '0.00' );
				$( '#infoRange input' ).on( 'click input', function() {
					bash( 'amixer -MD bluealsa -q sset "'+ S.btaplayname +'" '+ $( this ).val() +'%' );
				} ).on( 'touchend mouseup keyup', function() {
					bash( [ 'volumepushbt' ] );
				} );
				$( '#infoOk' ).toggleClass( db === '0.00' );
			}
			, oklabel    : ico.set0 +'0dB'
			, ok         : () => volume0db( 'volume0dbbt', $( '#setting-btreceiver' ) )
		} );
	} );
} );
$( '#audiooutput' ).change( function() {
	notify( 'mpd', 'Audio Output Device', 'Change ...' );
	bash( [ 'audiooutput', $( this ).val() ] );
} );
$( '#hwmixer' ).change( function() {
	notify( 'mpd', 'Hardware Mixer', 'Change ...' );
	bash( [ 'hwmixer', D.aplayname, $( this ).val() ] );
} );
$( '#setting-hwmixer' ).click( function() {
	bash( [ 'volumeget' ], voldb => {
		var voldb    = voldb.split( ' ' );
		var vol      = voldb[ 0 ];
		var db       = voldb[ 1 ];
		var nodb     = typeof db === 'undefined';
		var nomixer  = D.mixertype === 'none';
		info( {
			  icon       : 'volume'
			, title      : 'Mixer Device Volume'
			, message    : D.hwmixer
			, rangevalue : vol
			, footer     : nodb ? '' : ( nomixer ? '0dB (No Volume)' : db +' dB' )
			, beforeshow : () => {
				$( '#infoRange input' ).prop( 'disabled', D.mixertype === 'none' );
				$( '#infoRange input' ).on( 'click input keyup', function() {
					bash( 'amixer -c '+ S.asoundcard +' -Mq sset "'+ D.hwmixer +'" '+ $( this ).val() +'%' );
				} ).on( 'touchend mouseup keyup', function() {
					bash( [ 'volumepush' ] );
				} );
				$( '#infoOk' ).toggleClass( 'hide', nodb || nomixer || db === '0.00' );
			}
			, oklabel    : ico.set0 +'0dB'
			, ok         : () => volume0db( 'volume0db', $( '#setting-hwmixer' ) )
		} );
	} );
} );
$( '#mixertype' ).change( function() {
	var mixertype = $( this ).val();
	if ( mixertype === 'none' ) {
		info( {
			  icon    : 'volume'
			, title   : 'Volume Control'
			, message : warning
			, cancel  : () => $( '#mixertype' ).val( D.mixertype )
			, ok      : () => setMixerType( mixertype )
		} );
	} else {
		setMixerType( mixertype );
	}
} );
$( '#novolume' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	var icon    = 'volume';
	var title   = 'No Volume';
	if ( checked ) {
		info( {
			  icon    : icon
			, title   : title
			, message : warning
			, cancel  : () => cancelSwitch( 'novolume' )
			, ok      : () => {
				notify( icon, title, 'Enable ...' );
				bash( [ 'novolume', D.aplayname, D.card, D.hwmixer ] );
			}
		} );
	} else {
		info( {
			  icon         : icon
			, title        : title
			, message      : `\
<wh>No volume</wh> will be disabled on:
&emsp; • Select a Mixer Control
&emsp; • Enable any Volume options`
			, messagealign : 'left'
		} );
		$( this ).prop( 'checked', 1 );
	}
} );
$( '#dop' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	bash( [ 'dop', checked, D.aplayname ] );
} );
$( '#setting-crossfade' ).click( function() {
	var icon  = 'mpd';
	var title = 'Cross-Fading';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : 'Seconds'
		, focus        : 0
		, boxwidth     : 60
		, values       : S.crossfadeconf || 1
		, checkchanged : S.crossfade
		, checkblank   : 1
		, cancel       : () => cancelSwitch( 'crossfade' )
		, ok           : () => {
			bash( [ 'crossfade', true, infoVal() ] );
			notify( icon, title, S.crossfade ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-replaygain' ).click( function() {
	var icon  = 'mpd';
	var title = 'ReplayGain';
	info( {
		  icon         : icon
		, title        : title
		, radio        : { Auto: 'auto', Album: 'album', Track: 'track' }
		, values       : S.replaygainconf
		, checkchanged : S.replaygain
		, cancel       : () => cancelSwitch( 'replaygain' )
		, ok           : () => {
			bash( [ 'replaygain', true, infoVal() ] );
			notify( icon, title, S.replaygain ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '.filetype' ).click( function() {
	if ( $( '#divfiletype' ).is( ':empty' ) ) {
		bash( [ 'filetype' ], data => {
			$( '#divfiletype' )
				.html( data )
				.toggleClass( 'hide' );
		} );
	} else {
		$( '#divfiletype' ).toggleClass( 'hide' );
	}
} );
$( '#setting-buffer' ).click( function() {
	var icon  = 'mpd';
	var title = 'Custom Audio Buffer';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : 'audio_buffer_size <gr>(kB)</gr>'
		, focus        : 0
		, footer       : '(default: 4096)'
		, footeralign  : 'right'
		, boxwidth     : 110
		, values       : S.bufferconf
		, checkchanged : S.buffer
		, checkblank   : 1
		, cancel       : () => cancelSwitch( 'buffer' )
		, ok           : () => {
			bash( [ 'buffer', true, infoVal() ] );
			notify( icon, title, S.buffer ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-outputbuffer' ).click( function() {
	var icon  = 'mpd';
	var title = 'Custom Output Buffer';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : 'max_output_buffer_size <gr>(kB)</gr>'
		, focus        : 0
		, footer       : '(default: 8192)'
		, footeralign  : 'right'
		, boxwidth     : 110
		, values       : S.outputbufferconf
		, checkchanged : S.outputbuffer
		, checkblank   : 1
		, cancel       : () => cancelSwitch( 'outputbuffer' )
		, ok           : () => {
			bash( [ 'outputbuffer', true, infoVal() ] );
			notify( icon, title, S.outputbuffer ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-soxr' ).click( function() {
	infoSoxr( S.soxrquality || 'very high' );
} );
var custominfo = `\
<table width="100%">
<tr><td><code>mpd.conf</code></td></tr>
<tr><td><pre>
...
user                   "mpd"</pre></td></tr>
	<tr><td><textarea></textarea></td></tr>
	<tr><td><pre>
...
audio_output {
	...
	mixer_device   "hw:N"</pre></td></tr>
<tr><td><textarea style="padding-left: 39px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
$( '#setting-custom' ).click( function() {
	bash( [ 'customget', D.aplayname ], val => {
		var val       = val.split( '^^' );
		var valglobal = val[ 0 ].trim(); // remove trailing
		var valoutput = val[ 1 ].trim();
		var icon      = 'mpd';
		var title     = "User's Configurations";
		info( {
			  icon         : icon
			, title        : title
			, content      : custominfo.replace( 'N', S.asoundcard )
			, values       : [ valglobal, valoutput ]
			, checkchanged : S.custom
			, cancel       : () => cancelSwitch( 'custom' )
			, ok           : () => {
				var values = infoVal();
				if ( ! values[ 0 ] && ! values[ 1 ] ) {
					bash( [ 'customdisable' ] );
					notify( icon, title, 'Disable ...', 3000 );
					return
				}
				
				bash( [ 'custom', true, values[ 0 ], values[ 1 ], D.aplayname ], mpdstart => {
					if ( ! mpdstart ) {
						bannerHide();
						info( {
							  icon    : icon
							, title   : title
							, message : 'MPD failed with the added lines'
										+'<br>Restored to previous configurations.'
						} );
					}
				}, 'json' );
				notify( icon, title, S.custom ? 'Change ...' : 'Enable ...' );
			}
		} );
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

var soxr       = `\
<table>
<tr><td>Quality</td>
	<td><select>
		<option value="very high">Very high</option>
		<option value="high">High</option>
		<option value="medium">Medium</option>
		<option value="low">Low</option>
		<option value="quick">Quick</option>
	</select></td>
</tr>
<tr><td>Threads</td>
	<td><label><input type="radio" name="soxr" value="0">Auto</label>&emsp;
		<label><input type="radio" name="soxr" value="1">Single</label></td>
</tr>
<table>`;
var soxrcustom = `
<table>
<tr><td>Precision</td>
	<td><select>
		<option value="16">16</option>
		<option value="20">20</option>
		<option value="24">24</option>
		<option value="28">28</option>
		<option value="32">32</option>
		</select></td><td>&nbsp;<gr>bit</gr></td>
</tr>
<tr><td>Phase Response</td>
	<td><input type="text"></td><td style="width: 115px">&nbsp;<gr>0-100</gr></td>
</tr>
<tr><td>Passband End</td>
	<td><input type="text"></td><td>&nbsp;<gr>0-100%</gr></td>
</tr>
<tr><td>Stopband Begin</td>
	<td><input type="text"></td><td>&nbsp;<gr>100-150%</gr></td>
</tr>
<tr><td>Attenuation</td>
	<td><input type="text"></td><td>&nbsp;<gr>0-30dB</gr></td>
</tr>
<tr><td>Bitmask Flag</td>
	<td colspan="2"><select>
			<option value="0">0 - Rolloff - Small</option>
			<option value="1">1 - Rolloff - Medium</option>
			<option value="2">2 - Rolloff - None</option>
			<option value="8">8 - High precision</option>
			<option value="16">16 - Double precision</option>
			<option value="32">32 - Variable rate</option>
		</select>
	</td>
</tr>
</table>`;
var warning = `
<wh>${ iconwarning }Lower speakers / headphones volume

<gr>Signal will be set to original level at 0dB.</gr>
Beware of too high volume.</wh>`;

function infoSoxr( quality ) {
	var custom = quality === 'custom';
	var icon   = 'mpd';
	var title   = 'SoX Resampler';
	info( {
		  icon         : icon
		, title        : title
		, tab          : [ 'Presets', 'Custom' ]
		, tabfunction  : [ infoSoxrPreset, infoSoxrCustom ]
		, tabactive    : custom ? 1 : 0
		, content      : custom ? soxrcustom : soxr
		, values       : custom ? S.soxrcustomconf : S.soxrconf
		, checkblank   : 1
		, checkchanged : S.soxr && quality === S.soxrquality
		, boxwidth     : custom ? 85 : 180
		, cancel       : () => cancelSwitch( 'soxr' )
		, ok           : () => {
			if ( custom ) {
				bash( [ 'soxr', true, 'custom', ...infoVal() ] );
			} else {
				bash( [ 'soxr', true, ...infoVal() ] );
			}
			notify( icon, title, S.soxr ? 'Change ...' : 'Enable ...' );
		}
	} );
}
function infoSoxrCustom() {
	infoSoxr( 'custom' );
}
function infoSoxrPreset() {
	infoSoxr( S.soxrquality === 'custom' ? 'very high' : S.soxrquality );
}
function playbackIcon() {
	$( '.playback' )
		.removeClass( 'fa-pause fa-play fa-stop' )
		.addClass( 'fa fa-'+ S.state )
		.toggleClass( 'disabled', S.player !== 'mpd' && S.state !== 'play' );
}
function renderPage() {
	playbackIcon();
	var htmlstatus =  S.version +'<br>'
					+ ico.song + ( S.counts.song || 0 ).toLocaleString()
					+ ico.album + ( S.counts.album || 0 ).toLocaleString() +'<wide>'
					+ ico.artist + ( S.counts.arttist || 0 ).toLocaleString()
					+ ico.webradio + ( S.counts.webradio || 0 ).toLocaleString() +'</wide>';
	$( '#statusvalue' ).html( htmlstatus );
	if ( S.btaplayname ) {
		$( '#divbtreceiver' ).removeClass( 'hide' );
		$( '#btaplayname' ).html( '<option>'+ S.btaplayname.replace( / - A2DP$/, '' ) +'</option>' );
		$( '#setting-btreceiver' ).removeClass( 'hide' );
	} else {
		$( '#divbtreceiver' ).addClass( 'hide' );
	}
	if ( S.asoundcard === -1 ) {
		$( '#divoutput, #divbitperfect, #divvolume' ).addClass( 'hide' );
	} else {
		D               = S.devices[ S.asoundcard ];
		S.resampled     = S.crossfade || S.normalization || S.replaygain || S.camilladsp || S.equalizer || S.soxr;
		S.novolume      = D.mixertype === 'none' && ! S.resampled;
		var htmldevices = '';
		$.each( S.devices, ( i, el ) => {
			if ( el.aplayname !== 'Loopback' ) htmldevices += '<option value="'+ el.card +'">'+ el.name +'</option>';
		} );
		$( '#divoutput, #divbitperfect, #divvolume' ).removeClass( 'hide' );
		$( '#audiooutput' )
			.html( htmldevices )
			.val( S.asoundcard );
		var htmlhwmixer      = D.mixermanual ? '<option value="auto">Auto</option>' : '';
		if ( 'mixerdevices' in D ) {
			D.mixerdevices.forEach( mixer => htmlhwmixer += '<option value="'+ mixer +'">'+ mixer +'</option>' );
		}
		$( '#hwmixer' )
			.html( htmlhwmixer )
			.val( D.hwmixer );
		var htmlmixertype = '<option value="none">None / 0dB</option>';
		if ( D.mixers ) htmlmixertype += '<option value="hardware">Mixer device</option>';
		htmlmixertype    += '<option value="software">MPD software</option>';
		$( '#mixertype' )
			.html( htmlmixertype )
			.val( D.mixertype );
		$( '#setting-hwmixer' ).toggleClass( 'hide', D.mixers === 0 );
		$( '#novolume' ).prop( 'checked', S.novolume );
		$( '#divdop' ).toggleClass( 'disabled', D.aplayname.slice( 0, 7 ) === 'bcm2835' );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.dabradio );
		if ( S.camilladsp ) {
			var label = ico.camilladsp;
		} else if ( S.equalizer ) {
			var label = 'Equalizer'+ ico.equalizer;
		} else {
			var label = 'Device';
		}
		$( '#divaudiooutput div' ).eq( 0 ).html( label );
	}
	if ( $( '#infoRange .value' ).length ) {
		var cmd = I.title === 'Mixer Device Volume' ? [ 'volumeget' ] : [ 'volumegetbt' ];
		bash( cmd, voldb => {
			var voldb = voldb.split( ' ' );
			var vol   = voldb[ 0 ];
			var db    = voldb[ 1 ];
			$( '#infoRange .value' ).text( vol );
			$( '#infoRange input' ).val( vol );
			$( '.infofooter' ).text( db +' dB' );
			$( '#infoButtons a' ).eq( 1 ).toggleClass( 'hide', db === '0.00' );
		} );
	}
	$( '#divlists' ).toggleClass( 'hide', ! S.lists.includes( true ) );
	for ( i = 0; i < 3; i++ ) $( '#divlists .sub' ).eq( i ).toggleClass( 'hide', ! S.lists[ i ] );
	showContent();
}
function setMixerType( mixertype ) {
	var hwmixer = D.mixers ? D.hwmixer : '';
	notify( 'mpd', 'Mixer Control', 'Change ...' );
	bash( [ 'mixertype', mixertype, D.aplayname, hwmixer ] );
}
function volume0db( cmd, $setting ) {
	if ( $( '.infofooter' ).text().slice( 0, -3 ) > 0 ) {
		bash( [ cmd ], () => $setting.click() )
	} else {
		info( {
			  icon    : 'volume'
			, title   : cmd  === 'volume0db' ? 'Mixer Device Volume' : 'Bluetooth Volume'
			, message : warning
			, ok      : () => bash( [ cmd ], () => $setting.click() )
		} );
	}
}
