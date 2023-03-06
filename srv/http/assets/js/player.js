$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.playback' ).click( function() {
	if ( ! $( this ).hasClass( 'disabled' ) ) {
		var cmd = S.player === 'mpd' ? 'mpcplayback' : 'playerstop';
		bash( '/srv/http/bash/cmd.sh '+ cmd );
	}
} );
$( '#audiooutput' ).change( function() {
	notify( 'volume', 'Audio Output Device', 'Change ...' );
	bash( [ 'audiooutput', $( this ).val() ] );
} );
$( '#hwmixer' ).change( function() {
	notify( 'volume', 'Hardware Mixer', 'Change ...' );
	bash( [ 'hwmixer', D.aplayname, $( this ).val() ] );
} );
$( '#setting-hwmixer, #setting-btreceiver' ).click( function() {
	var bt = this.id === 'setting-btreceiver';
	bash( [ bt ? 'volumegetbt' : 'volumeget' ], voldb => {
		var voldb   = voldb.split( ' ' );
		var vol     = voldb[ 0 ];
		var db      = voldb[ 1 ];
		var nodb    = typeof db === 'undefined';
		var nomixer = D.mixertype === 'none';
		if ( bt ) {
			var cmd       = 'volume0dbbt';
			var cmdamixer = '-D bluealsa';
			var cmdpush   = 'volumepushbt';
			var mixer     = S.btaplayname;
		} else {
			var cmd       = 'volume0db';
			var cmdamixer = '-c '+ S.asoundcard;
			var cmdpush   = 'volumepush';
			var mixer     = D.hwmixer;
		}
		info( {
			  icon       : SW.icon
			, title      : SW.title
			, message    : mixer.replace( ' - A2DP', '' )
			, rangevalue : vol
			, footer     : nodb ? '' : ( nomixer ? '0dB (No Mixer)' : db +' dB' )
			, beforeshow : () => {
				$( '#infoContent' ).before( '<div class="warning infomessage hide">'+ warning +'</a>' );
				$( '#infoButtons' ).toggleClass( 'hide', nodb || nomixer || db === '0.00' );
				$( '#infoRange input' ).on( 'click input keyup', function() {
					bash( 'amixer '+ cmdamixer +' -Mq sset "'+ mixer +'" '+ $( this ).val() +'%' );
				} ).on( 'touchend mouseup keyup', function() {
					bash( [ cmdpush ] );
				} ).prop( 'disabled', D.mixertype === 'none' );
				$( '#infoOk' ).off( 'click' ).click( function() {
					if ( $( '.infofooter' ).text() > '0.00 dB' ) {
						bash( [ cmd ] );
					} else {
						if ( ! $( '.warning' ).hasClass( 'hide' ) ) bash( [ cmd ] );
						$( '#infoContent, .warning' ).toggleClass( 'hide' );
					}
				} );
				$( '#infoX' ).off( 'click' ).click( function() {
					$( '.warning' ).hasClass( 'hide' ) ? infoButtonReset() : $( '#infoContent, .warning' ).toggleClass( 'hide' );
				} );
			}
			, oklabel    : ico( 'set0' ) +'0dB'
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
	if ( checked ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : warning
			, cancel  : switchCancel
			, ok      : () => {
				notify( SW.icon, SW.title, 'Enable ...' );
				bash( [ 'novolume', D.aplayname, D.card, D.hwmixer ] );
			}
		} );
	} else {
		info( {
			  icon         : SW.icon
			, title        : SW.title
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
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'Seconds'
		, focus        : 0
		, boxwidth     : 60
		, values       : S.crossfadeconf || 1
		, checkchanged : S.crossfade
		, checkblank   : 1
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-replaygain' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, radio        : { Auto: 'auto', Album: 'album', Track: 'track' }
		, footer       : D.mixertype === 'software' && D.mixers ? '<label><input type="checkbox"><wh>Gain control - Mixer device</wh></label>' : ''
		, values       : S.replaygainconf
		, checkchanged : S.replaygain
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '.filetype' ).click( function() {
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
	$( this ).toggleClass( 'i-chevron-down i-chevron-up' );
} );
$( '#setting-buffer' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'audio_buffer_size <gr>(kB)</gr>'
		, focus        : 0
		, footer       : '(default: 4096)'
		, footeralign  : 'right'
		, boxwidth     : 110
		, values       : S.bufferconf
		, checkchanged : S.buffer
		, checkblank   : 1
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-outputbuffer' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'max_output_buffer_size <gr>(kB)</gr>'
		, focus        : 0
		, footer       : '(default: 8192)'
		, footeralign  : 'right'
		, boxwidth     : 110
		, values       : S.outputbufferconf
		, checkchanged : S.outputbuffer
		, checkblank   : 1
		, cancel       : switchCancel
		, ok           : switchEnable
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
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, content      : custominfo.replace( 'N', S.asoundcard )
			, values       : [ valglobal, valoutput ]
			, checkchanged : S.custom
			, cancel       : switchCancel
			, ok           : () => {
				var values = infoVal();
				if ( ! values[ 0 ] && ! values[ 1 ] ) {
					bash( [ 'customdisable' ] );
					notify( SW.icon, SW.title, 'Disable ...', 3000 );
					return
				}
				
				bash( [ 'custom', true, values[ 0 ], values[ 1 ], D.aplayname ], mpdstart => {
					if ( ! mpdstart ) {
						bannerHide();
						info( {
							  icon    : SW.icon
							, title   : SW.title
							, message : 'MPD failed with the added lines'
										+'<br>Restored to previous configurations.'
						} );
					}
				}, 'json' );
				notify( SW.icon, SW.title, S.custom ? 'Change ...' : 'Enable ...' );
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
<tr class="hide"><td><input type="text" value="custom"></td></tr>
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
${ iconwarning }<wh>Lower speakers / headphones volume

<gr>Signal will be set to original level at 0dB.</gr>
Beware of too high volume.</wh>
<br>`;

function infoSoxr( quality ) {
	var custom = quality === 'custom';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tab          : [ 'Presets', 'Custom' ]
		, tabfunction  : [ infoSoxrPreset, infoSoxrCustom ]
		, tabactive    : custom ? 1 : 0
		, content      : custom ? soxrcustom : soxr
		, values       : custom ? S.soxrcustomconf : S.soxrconf
		, checkblank   : 1
		, checkchanged : S.soxr && quality === S.soxrquality
		, boxwidth     : custom ? 85 : 180
		, cancel       : switchCancel
		, ok           : switchEnable
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
		.removeClass( 'i-pause i-play' )
		.addClass( S.state === 'play' ? 'i-pause' : 'i-play' )
		.toggleClass( 'disabled', S.player !== 'mpd' && S.state !== 'play' );
}
function renderPage() {
	playbackIcon();
	var htmlstatus =  S.version +'<br>'
					+ ico( 'song' ) + ( S.counts.song || 0 ).toLocaleString()
					+ ico( 'album' ) + ( S.counts.album || 0 ).toLocaleString() +'<wide>'
					+ ico( 'artist' ) + ( S.counts.arttist || 0 ).toLocaleString()
					+ ico( 'webradio' ) + ( S.counts.webradio || 0 ).toLocaleString() +'</wide>';
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
		if ( D.mixerdevices ) {
			var htmlhwmixer = D.mixermanual ? '<option value="auto">Auto</option>' : '';
			D.mixerdevices.forEach( mixer => htmlhwmixer += '<option value="'+ mixer +'">'+ mixer +'</option>' );
		} else {
			var htmlhwmixer = '<option value="">( not available )</option>';
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
			var label = ico( 'camilladsp' );
		} else if ( S.equalizer ) {
			var label = 'Equalizer'+ ico( 'equalizer' );
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
