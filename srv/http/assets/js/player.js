$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.playback' ).click( function() {
	if ( $( this ).hasClass( 'disabled' ) ) return
	
	bash( [ 'cmd.sh', S.player === 'mpd' ? 'mpcplayback' : 'playerstop' ] );
} );
$( '.btoutputall' ).click( function() {
	SW.icon  = 'volume';
	SW.title = 'Output All';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Enable all while Bluetooth connected' ]
		, values       : S.btoutputall
		, checkchanged : true
		, ok           : () => {
			var checked = infoVal();
			notify( SW.icon, SW.title, ( checked ? 'Enable' : 'Disable' ) +' all while Bluetooth connected' );
			bash( checked ? [ 'btoutputall' ] : [ 'btoutputall', 'OFF' ] );
		}
	} );
} );
$( '#audiooutput' ).change( function() {
	notify( 'volume', 'Audio Output Device', 'Change ...' );
	bash( [ 'audiooutput', $( this ).val(), 'CMD CARD' ] );
} );
$( '#hwmixer' ).change( function() {
	notify( 'volume', 'Hardware Mixer', 'Change ...' );
	bash( [ 'hwmixer', D.aplayname, $( this ).val(), 'CMD APLAYNAME HWMIXER' ] );
} );
var htmlvolume = `
<div id="infoRange">
	<div class="name"></div>
	<div class="value"></div>
	<a class="min">0</a><input type="range" min="0" max="100"><a class="max">100</a>
</div
><div class="infofooter">-6.83 dB</div>
`;
$( '#setting-hwmixer, #setting-btreceiver' ).click( function() {
	var bt = this.id === 'setting-btreceiver';
	bash( [ 'volumeget' ], v => {
		var nodb    = v.db === false;
		var nomixer = D.mixertype === 'none';
		if ( bt ) {
			var cmd       = 'volumebt';
			var cmdodb    = 'volume0dbbt';
			var mixer     = S.btaplayname;
		} else {
			var cmd       = 'volume';
			var cmdodb    = 'volume0db';
			var mixer     = D.hwmixer;
		}
		info( {
			  icon       : SW.icon
			, title      : SW.title
			, rangelabel : bt ? mixer.replace( ' - A2DP', '' ) : mixer
			, values     : v.vol
			, rangesub   : nomixer ? '0dB (No Mixer)' : v.db +' dB'
			, confirm    : warning
			, confirmno  : () => v.db
			, beforeshow : () => {
				$( '#infoOk' ).toggleClass( 'hide', nodb || nomixer || v.db === 0 );
				$( '#infoRange input' ).on( 'input', function() {
					bash( [ cmd, mixer, $( this ).val(), 'CMD MIXER VOL' ] );
				} ).on( 'touchend mouseup keyup', function() {
					bash( [ 'volumepush' ] );
				} ).prop( 'disabled', D.mixertype === 'none' );
			}
			, oklabel    : ico( 'set0' ) +'0dB'
			, ok         : () => {
				bash( [ cmdodb ] );
			}
			, oknoreset  : true
		} );
	}, 'json' );
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
				S.novolume = true;
				bash( [ 'novolume', D.hwmixer, D.aplayname, 'CMD HWMIXER APLAYNAME' ] );
				notifyCommon( 'Enable ...' );
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
		$( this ).prop( 'checked', true );
	}
} );
$( '#dop' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	var cmd = checked ? [ 'dop', D.aplayname ] : [ 'dop', D.aplayname, 'OFF' ]; // OFF with args - value by index
	bash( cmd );
} );
$( '#setting-crossfade' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'Seconds'
		, focus        : 0
		, boxwidth     : 60
		, values       : S.crossfadeconf
		, checkchanged : S.crossfade
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-replaygain' ).click( function() {
	var hardware = D.mixertype === 'software' && D.mixers;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, radio        : { Auto: 'auto', Album: 'album', Track: 'track' }
		, footer       : hardware ? '<label><input type="checkbox"><wh>Gain control by Mixer device</wh></label>' : ''
		, values       : hardware ? values2info( [ 'TYPE', 'HARDWARE' ], S.hostapd ) : { TYPE: S.replaygainconf.TYPE }
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
		, checkchanged : true
		, checkblank   : true
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
		, checkchanged : true
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-soxr' ).click( function() {
	S.soxrquality === 'custom' ? infoSoxrCustom() : infoSoxr();
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
	bash( [ 'customget', D.aplayname, 'CMD APLAYNAME' ], val => {
		var val       = val.split( '^^' );
		var global = val[ 0 ].trim(); // remove trailing
		var output = val[ 1 ].trim();
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, content      : custominfo.replace( 'N', S.asoundcard )
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
				bash( [ 'custom', global, output, D.aplayname, 'CMD GLOBAL OUTPUT APLAYNAME' ], mpdstart => {
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
	delete S.soxrconf.PLUGIN
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Presets', 'Custom' ]
		, tab          : [ '', infoSoxrCustom ]
		, content      : soxr
		, values       : values2info(
			  [ 'QUALITY', 'THREAD' ]
			, S.soxrconf
		)
		, checkblank   : true
		, checkchanged : S.soxr
		, boxwidth     : 180
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function infoSoxrCustom() {
	delete S.soxrcustomconf.PLUGIN
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Presets', 'Custom' ]
		, tab          : [ infoSoxr, '' ]
		, content      : soxrcustom
		, values       : values2info(
			  [ 'QUALITY', 'PRECISION', 'PHASE_RESPONSE', 'PASSBAND_END', 'STOPBAND_BEGIN', 'ATTENUATION', 'FLAGS' ]
			, S.soxrcustomconf
		)
		, checkblank   : true
		, checkchanged : S.soxr
		, boxwidth     : 85
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
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
		if ( ! $( '#divbtreceiver .col-l i' ).length ) $( '#divbtreceiver .col-l' ).append( ico( 'bluetooth' ) );
		$( '#divbtreceiver' ).removeClass( 'hide' );
		$( '#btaplayname' ).html( '<option>'+ S.btaplayname.replace( / - A2DP$/, '' ) +'</option>' );
		$( '#setting-btreceiver' ).removeClass( 'hide' );
		$( '#divaudiooutput, #divhwmixer, #divmixertype' ).toggleClass( 'hide', ! S.btoutputall );
	} else {
		$( '#divbtreceiver' ).addClass( 'hide' );
		$( '#divaudiooutput, #divhwmixer, #divmixertype' ).removeClass( 'hide' );
	}
	if ( S.asoundcard === -1 ) {
		$( '#divoutput, #divbitperfect, #divvolume' ).addClass( 'hide' );
	} else {
		D               = S.devices[ S.asoundcard ];
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
//		$( '#dop' ).toggleClass( 'disabled', D.aplayname.slice( 0, 7 ) === 'bcm2835' );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.dabradio );
		if ( S.camilladsp ) {
			var label = ico( 'camilladsp' );
		} else if ( S.equalizer ) {
			var label = 'Equalizer'+ ico( 'equalizer' );
		} else {
			var label = 'Device';
		}
		$( '#divaudiooutput .col-l' ).html( label );
	}
	if ( $( '#infoRange .value' ).length ) {
		bash( [ 'volumeget' ], v => {
			$( '#infoRange .value' ).text( v.vol );
			$( '#infoRange input' ).val( v.vol );
			$( '.infofooter' ).text( v.db +' dB' );
			$( '#infoButton a' ).eq( 1 ).toggleClass( 'hide', v.db === '0.00' );
		}, 'json' );
	}
	$.each( S.lists, ( k, v ) => $( '#'+ k ).toggleClass( 'hide', ! v ) );
	$( '#divlists' ).toggleClass( 'hide', $( '#divlists .subhead.hide' ).length === 3 );
	showContent();
}
function setMixerType( mixertype ) {
	var hwmixer = D.mixers ? D.hwmixer : '';
	notify( 'mpd', 'Mixer Control', 'Change ...' );
	bash( [ 'mixertype', mixertype, hwmixer, D.aplayname, 'CMD MIXERTYPE HWMIXER APLAYNAME' ] );
}
