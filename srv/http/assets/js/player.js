$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.btoutputall' ).on( 'click', function() {
	SW.icon  = 'volume';
	SW.title = 'Output All';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Enable all while Bluetooth connected', 'checkbox' ]
		, values       : S.btoutputall
		, checkchanged : true
		, ok           : () => {
			var checked = infoVal();
			notify( SW.icon, SW.title, ( checked ? 'Enable' : 'Disable' ) +' all while Bluetooth connected' );
			bash( checked ? [ 'btoutputall' ] : [ 'btoutputall', 'OFF' ] );
		}
	} );
} );
$( '#audiooutput' ).on( 'input', function() {
	notify( 'volume', 'Audio Output Device', 'Change ...' );
	bash( [ 'audiooutput', $( this ).val(), 'CMD CARD' ] );
} );
$( '#hwmixer' ).on( 'input', function() {
	notify( 'volume', 'Hardware Mixer', 'Change ...' );
	bash( [ 'hwmixer', D.aplayname, $( this ).val(), 'CMD APLAYNAME HWMIXER' ] );
} );
$( '#setting-hwmixer, #setting-bluealsa' ).on( 'click', function() {
	if ( this.id.slice( -1 ) === 'a' ) {
		var cmd    = 'volumebt';
		var cmd0db = 'volume0dbbt';
		S.control  = S.btaplayname;
		S.card     = '';
	} else {
		var cmd    = 'volume';
		var cmd0db = 'volume0db';
		S.control  = D.hwmixer;
		S.card     = D.card;
	}
	info( {
		  icon        : SW.icon
		, title       : SW.title
		, list        : [ S.control.replace( ' - A2DP', '' ), 'range' ]
		, beforeshow  : () => {
			$( '.inforange' ).append( '<div class="sub gr"></div>' );
			$( '#infoContent' ).after( '<div class="confirm infomessage hide" style="padding: 15px">'+ warning +'</div>' );
			volumeInfoSet();
		}
		, rangechange : val => volumeSetAt( val )
		, rangestop   : () => bash( [ 'volumepush' ] )
		, cancel      : () => {
			if ( ! $( '.confirm' ).hasClass( 'hide' ) ) {
				local();
				$( '#infoContent, .confirm' ).toggleClass( 'hide' );
				setTimeout( () => I.oknoreset = true, 300 );
			}
		}
		, oklabel     : ico( 'set0' ) +'0dB'
		, ok          : () => {
			if ( parseFloat( $( '.inforange .sub' ).text() ) < 0 && $( '.confirm' ).hasClass( 'hide' ) ) {
				$( '#infoContent, .confirm' ).toggleClass( 'hide' );
			} else {
				bash( [ cmd0db ] );
			}
		}
		, oknoreset    : true
	} );
} );
$( '#mixertype' ).on( 'input', function() {
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
$( '#setting-mixertype' ).on( 'click', function() {
	S.control = '';
	S.card    = '';
	info( {
		  icon        : SW.icon
		, title       : SW.title
		, list        : [ 'MPD Software', 'range' ]
		, values      : S.volumempd
		, rangechange : val => volumeSetAt( val )
		, rangestop   : val => volumePush( val, 'mpd' )
		, okno        : true
	} );
} );
$( '#novolume' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : warning
			, cancel  : switchCancel
			, ok      : () => {
				S.novolume = true;
				bash( [ 'novolume', D.card, D.hwmixer, D.aplayname, 'CMD CARD HWMIXER APLAYNAME' ] );
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
$( '#dop' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	var cmd = checked ? [ 'dop', D.aplayname ] : [ 'dop', D.aplayname, 'OFF' ]; // OFF with args - value by index
	bash( cmd );
} );
$( '#setting-crossfade' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Seconds', 'number' ]
		, focus        : 0
		, boxwidth     : 60
		, values       : S.crossfadeconf
		, checkchanged : S.crossfade
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-replaygain' ).on( 'click', function() {
	var hardware = D.mixertype === 'software' && D.mixers;
	if ( ! hardware ) delete S.replaygainconf.HARDWARE;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ '', 'radio', { Auto: 'auto', Album: 'album', Track: 'track' }, 'br' ]
		, footer       : hardware ? '<label><input type="checkbox"><wh>Gain control by Mixer device</wh></label>' : ''
		, values       : S.replaygainconf
		, checkchanged : S.replaygain
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '.filetype' ).on( 'click', function() {
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
$( '#setting-buffer' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'audio_buffer_size <gr>(kB)</gr>', 'number' ]
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
$( '#setting-outputbuffer' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'max_output_buffer_size <gr>(kB)</gr>', 'number' ]
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
$( '#setting-soxr' ).on( 'click', function() {
	S.soxrquality === 'custom' ? infoSoxrCustom() : infoSoxr();
} );
var custominfo = `\
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
	mixer_device   "hw:N"</pre></td></tr>
<tr><td><textarea style="padding-left: 39px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
$( '#setting-custom' ).on( 'click', function() {
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
	<td><input type="number"></td><td style="width: 115px">&nbsp;<gr>0-100</gr></td>
</tr>
<tr><td>Passband End</td>
	<td><input type="number"></td><td>&nbsp;<gr>0-100%</gr></td>
</tr>
<tr><td>Stopband Begin</td>
	<td><input type="number"></td><td>&nbsp;<gr>100-150%</gr></td>
</tr>
<tr><td>Attenuation</td>
	<td><input type="number"></td><td>&nbsp;<gr>0-30dB</gr></td>
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
		, values       : S.soxrconf
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
		, values       : S.soxrcustomconf
		, checkblank   : true
		, checkchanged : S.soxr
		, boxwidth     : 85
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function renderPage() {
	playbackButton();
	var htmlstatus =  S.version +'<br>';
	[ 'song', 'webradio' ].forEach( k => htmlstatus += ico( k +' gr' ) +'&nbsp;'+ ( S[ 'count'+ k ] || 0 ).toLocaleString() +'&emsp;' );
	htmlstatus += '<br>'+ S.lastupdate;
	$( '#divstatus .value' ).html( htmlstatus );
	var icondsp = '';
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) icondsp = ico( k );
	} );
	if ( icondsp ) $( '.i-camilladsp, .i-equalizer' ).remove();
	if ( S.btaplayname ) {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#divbluealsa' ).removeClass( 'hide' );
		$( '#btaplayname' ).html( '<option>'+ S.btaplayname.replace( / - A2DP$/, '' ) +'</option>' );
		$( '#divaudiooutput, #divhwmixer, #divmixertype' ).toggleClass( 'hide', ! S.btoutputall );
	} else {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#divaudiooutput .col-l' ).html( $( '#divaudiooutput .col-l' ).html() + icondsp );
		$( '#divbluealsa' ).addClass( 'hide' );
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
		$( '#setting-hwmixer' ).toggleClass( 'hide', ! ( 'volume' in S ) );
		$( '#divmixertype' ).toggleClass( 'hide', S.camilladsp );
		$( '#setting-mixertype' ).toggleClass( 'hide', D.mixertype !== 'software' );
		$( '#novolume' ).prop( 'checked', S.novolume );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.dabradio );
	}
	$.each( S.lists, ( k, v ) => $( '#divlists .subhead[data-status="'+ k +'"]' ).toggleClass( 'hide', ! v ) );
	$( '#divlists' ).toggleClass( 'hide', ! Object.values( S.lists ).includes( true ) );
	if ( I.range ) $( '#setting-'+ ( S.btaplayname ? 'bluealsa' : 'hwmixer' ) ).trigger( 'click' );
	showContent();
}
function setMixerType( mixertype ) {
	var hwmixer = D.mixers ? D.hwmixer : '';
	notify( 'mpd', 'Mixer Control', 'Change ...' );
	bash( [ 'mixertype', D.card, mixertype, hwmixer, D.aplayname, 'CMD CARD MIXERTYPE HWMIXER APLAYNAME' ] );
}
function volumeGetPush() {
	bash( [ 'volumepush' ] );
}
function volumeInfoSet() {
	var val = S.volume.val || 0;
	var db  = S.volume.db;
	$( '.inforange .value' ).text( val );
	$( '.inforange input' ).val( val );
	$( '.inforange .sub' ).text( val ? db +' dB' : 'Mute' );
	$( '#infoOk' ).toggleClass( 'disabled', db === 0 || db === '' );
	V.local = false;
}
function playbackButton() {
	if ( S.pllength ) {
		var btn = S.state === 'play' ? 'pause' : 'play';
	} else {
		var btn = 'play disabled';
	}
	$( '.playback' ).prop( 'class', 'playback i-'+ btn );
}
function psVolume( data ) {
	data.type === 'mpd' ? S.volumempd = data.val : S.volume = data;
	if ( ! $( '.inforange' ).length ) return
	
	if ( data.type === 'mpd' ) { // info software volume
		$( '.inforange .value' ).text( S.volumempd );
		$( '#infoContent input' ).val( S.volumempd );
		return
	}
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		V.local = true;
		$( '#infoContent' ).removeClass( 'hide' );
		$( '.confirm' ).addClass( 'hide' );
		volumeInfoSet();
	}, 300 );
}
