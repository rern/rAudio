var typelist = { 'None / 0dB': 'none', 'Mixer device': 'hardware', 'MPD software': 'software' }
var warning  = iconwarning +'<wh>Lower speakers / headphones volume<br><br>'
			  +'<gr>Signal will be set to original level at 0dB.</gr><br>'
			  +'Beware of too high volume.</wh>';

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#audiooutput' ).on( 'input', function() {
	var $this     = $( this );
	var aplayname = $this.val();
	var output    = $this.find( 'option:selected' ).text()
	notify( 'volume', 'Audio Output Device', 'Change ...' );
	bash( [ 'audiooutput', output, aplayname, 'CMD OUTPUT APLAYNAME' ] );
} );
$( '#hwmixer' ).on( 'input', function() {
	notify( 'volume', 'Hardware Mixer', 'Change ...' );
	bash( [ 'hwmixer', $( this ).val(), 'CMD HWMIXER' ] );
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
	}
	info( {
		  icon       : SW.icon
		, title      : SW.title
		, list       : [ S.control.replace( ' - A2DP', '' ), 'range' ]
		, prompt     : '<br>'+ warning
		, beforeshow : () => {
			$( '#infoList, .infoprompt' ).css( 'height', '150px' );
			$( '.inforange' ).append( '<div class="sub gr"></div>' );
			$( '#infoList input' ).on( 'input', function() {
				volumeSetAt( +$( this ).val() );
			} ).on( 'touchend mouseup keyup', function() {
				bash( [ 'volumepush' ] );
			} );
			volumeInfoSet();
		}
		, cancel     : () => {
			if ( ! $( '.infoprompt' ).hasClass( 'hide' ) ) {
				local();
				$( '#infoList, .infoprompt' ).toggleClass( 'hide' );
				setTimeout( () => I.oknoreset = true, 300 );
			}
		}
		, oklabel    : ico( 'set0' ) +'0dB'
		, ok         : () => {
			if ( S.volume.db >= 0 ) {
				bash( [ cmd0db ] );
			} else {
				if ( ! $( '.infoprompt' ).hasClass( 'hide' ) ) bash( [ cmd0db ] );
				$( '#infoList, .infoprompt' ).toggleClass( 'hide' );
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
			, cancel  : () => $( '#mixertype' ).val( S.device.mixertype )
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
		, beforeshow  : () => {
			$( '#infoList input' ).on( 'input', function() {
				volumeSetAt( +$( this ).val() );
			} ).on( 'touchend mouseup keyup', function() {
				volumePush( +$( this ).val(), 'mpd' );
			} );
		}
		, okno        : true
	} );
} );
$( '#novolume' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		if ( S.camilladsp || S.equalizer ) {
			info( {
				  icon    : SW.icon
				, title   : SW.title
				, message :  '<wh>No Volume</wh> also disable:<br><br>'
							+ icoTab( 'Features' )
							+ ( S.camilladsp ? icoLabel( 'DSP', 'camilladsp' ) : icoLabel( 'Equalizer', 'equalizer' ) )
				, cancel  : switchCancel
				, ok      : infoNoVolume
			} );
		} else {
			infoNoVolume();
		}
	} else {
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, message      : '<wh>No volume</wh> will be disabled on:'
							+'<br>&emsp; • Mixer Device not <c>None / 0dB</c>'
							+'<br>&emsp; • Enable any Volume options or SoXR'
							+'<br>&emsp; • Enable Features: DSP or Equalizer'
			, messagealign : 'left'
		} );
		$( this ).prop( 'checked', true );
	}
} );
$( '#dop' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	var cmd = checked ? [ 'dop', S.device.aplayname ] : [ 'dop', S.device.aplayname, 'OFF' ]; // OFF with args - value by index
	bash( cmd );
} );
$( '#setting-crossfade' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Seconds', 'number', { updn: { step: 1, min: 0, max: 10 } } ]
		, focus        : 0
		, boxwidth     : 70
		, values       : S.crossfadeconf
		, checkchanged : S.crossfade
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-replaygain' ).on( 'click', function() {
	var hardware = S.device.mixertype === 'software' && S.mixerlist;
	if ( ! hardware ) delete S.replaygainconf.HARDWARE;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ '', 'radio', { kv: { Auto: 'auto', Album: 'album', Track: 'track' }, sameline: false } ]
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
		, message      : '<c>audio_buffer_size</c>'
		, list         : [ 'kB', 'number', { updn: { step: 1024, min: 1024, max: 8192 } } ]
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
		, message      : '<c>max_output_buffer_size</c>'
		, list         : [ 'kB', 'number', { updn: { step: 1024, min: 1024, max: 16384 } } ]
		, focus        : 0
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
    mixer_device   "hw:${ S.device.card }"
</pre></td></tr>
<tr><td><textarea style="padding-left: 39px"></textarea></td></tr>
<tr><td><pre style="margin-top: -20px">
}</pre></td></tr>
</table>`;
	bash( [ 'customget' ], val => {
		var val       = val.split( '^^' );
		var global = val[ 0 ].trim(); // remove trailing
		var output = val[ 1 ].trim();
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, list         : htmllist
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
				bash( [ 'custom', global, output, 'CMD GLOBAL OUTPUT' ], mpdstart => {
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

function infoNoVolume() {
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : warning
		, cancel  : switchCancel
		, ok      : () => {
			S.novolume = true;
			bash( [ 'novolume' ] );
			notifyCommon( 'Enable ...' );
		}
	} );
}
function infoSoxr( quality ) {
	delete S.soxrconf.PLUGIN
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Presets', 'Custom' ]
		, tab          : [ '', infoSoxrCustom ]
		, list         : [
			  [ 'Quality', 'select', { 'Very high': 'very high', High: 'high', Medium: 'medium', Low: 'low', Quick: 'quick' } ]
			, [ 'Threads', 'radio',  { Auto: 0, Single: 1 } ]
		]
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
	var flag = {
		  'Rolloff - Small'  : 0
		, 'Rolloff - Medium' : 1
		, 'Rolloff - None'   : 2
		, 'High precision'   : 8
		, 'Double precision' : 16
		, 'Variable rate'    : 32
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Presets', 'Custom' ]
		, tab          : [ infoSoxr, '' ]
		, list         : [
			  [ 'Type',           'hidden' ]
			, [ 'Precision',      'select', { kv: [ 16, 20, 24, 28, 32 ], suffix: 'bit' } ]
			, [ 'Phase Response', 'number', { suffix: '0-100' } ]
			, [ 'Passband End',   'number', { suffix: '0-100%' } ]
			, [ 'Stopband Begin', 'number', { suffix: '100-150%' } ]
			, [ 'Attenuation',    'number', { suffix: '0-30dB' } ]
			, [ 'Bitmask Flag',   'select', { kv: flag, colspan: 2 } ]
		]
		, values       : S.soxrcustomconf
		, checkblank   : true
		, checkchanged : S.soxr
		, boxwidth     : 105
		, beforeshow   : () => {
			$( '#infoList .select2-container' ).last().attr( 'style', 'width: 100% !important' )
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function renderPage() {
	playbackButton();
	renderStatus();
	var icondsp = '';
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) icondsp = ico( k );
	} );
	if ( icondsp ) $( '.i-camilladsp, .i-equalizer' ).remove();
	if ( S.btaplayname ) {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#divbluealsa' ).removeClass( 'hide' );
		$( '#btaplayname' ).html( '<option>'+ S.btaplayname.replace( / - A2DP$/, '' ) +'</option>' );
		$( '#divaudiooutput, #divhwmixer, #divmixertype' ).toggleClass( 'hide', ! S.devicewithbt );
	} else {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#divaudiooutput .col-l' ).html( $( '#divaudiooutput .col-l' ).html() + icondsp );
		$( '#divbluealsa' ).addClass( 'hide' );
		$( '#divaudiooutput, #divhwmixer, #divmixertype' ).removeClass( 'hide' );
	}
	if ( S.asoundcard === -1 ) {
		$( '#divoutput, #divbitperfect, #divvolume' ).addClass( 'hide' );
	} else {
		$( '#divoutput, #divbitperfect, #divvolume' ).removeClass( 'hide' );
		$( '#audiooutput' )
			.html( htmlOption( S.devicelist ) )
			.val( S.device.aplayname );
		if ( S.mixerlist ) {
			$( '#hwmixer' )
				.html( htmlOption( S.mixerlist ) )
				.val( S.device.hwmixer );
			$( '#divhwmixer' ).removeClass( 'hide' );
		} else {
			$( '#divhwmixer' ).addClass( 'hide' );
			delete typelist[ 'Mixer device' ];
		}
		$( '#mixertype' )
			.html( htmlOption( typelist ) )
			.val( S.device.mixertype );
		$( '#setting-hwmixer' ).toggleClass( 'hide', ! ( 'volume' in S ) );
		$( '#divmixertype' ).toggleClass( 'hide', S.camilladsp );
		$( '#setting-mixertype' ).toggleClass( 'hide', S.device.mixertype !== 'software' );
		$( '#divdevicewithbt' ).toggleClass( 'hide', ! S.bluetooth );
		$( '#novolume' ).prop( 'checked', S.novolume );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.dabradio );
	}
	$.each( S.lists, ( k, v ) => $( '#divlists .subhead[data-status="'+ k +'"]' ).toggleClass( 'hide', ! v ) );
	$( '#divlists' ).toggleClass( 'hide', ! Object.values( S.lists ).includes( true ) );
	if ( I.range ) $( '#setting-'+ ( S.btaplayname ? 'bluealsa' : 'hwmixer' ) ).trigger( 'click' );
	showContent();
}
function renderStatus() {
	var htmlstatus =  S.version +'<br>';
	[ 'song', 'webradio' ].forEach( k => htmlstatus += ico( k +' gr' ) +'&nbsp;'+ ( S.counts[ k ] || 0 ).toLocaleString() +'&emsp;' );
	if ( S.updating_db ) htmlstatus += ico( 'library gr blink' );
	htmlstatus += '<br>'+ S.lastupdate;
	if ( S.updatetime ) htmlstatus += '<wide> <gr>'+ S.updatetime +'</gr></wide>';
	$( '#divstatus .value' ).html( htmlstatus );
}
function setMixerType( mixertype ) {
	notify( 'mpd', 'Mixer Control', 'Change ...' );
	bash( [ 'mixertype', mixertype, 'CMD MIXERTYPE' ] );
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
function psVolume( data ) {
	data.type === 'mpd' ? S.volumempd = data.val : S.volume = data;
	if ( ! $( '.inforange' ).length ) return
	
	if ( data.type === 'mpd' ) { // info software volume
		$( '.inforange .value' ).text( S.volumempd );
		$( '#infoList input' ).val( S.volumempd );
		return
	}
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		V.local = true;
		$( '#infoList' ).removeClass( 'hide' );
		$( '.confirm' ).addClass( 'hide' );
		volumeInfoSet();
	}, 300 );
}
