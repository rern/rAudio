var warning  = iconwarning +'<wh>Lower speakers / headphones volume<br><br>'
			  +'<gr>Signal will be set to original level at 0dB.</gr><br>'
			  +'Beware of too high volume.</wh>';

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
		var cmd     = [ 'volumebt', S.btmixer ];
		var cmdlist = 'CMD MIXER VAL';
		var cmd0db  = 'volume0dbbt';
	} else {
		var control = S.output.mixer;
		var cmd     = [ 'volume', S.output.card, S.output.mixer ];
		var cmdlist = 'CMD CARD MIXER VAL';
		var cmd0db  = 'volume0db';
	}
	info( {
		  icon       : SW.icon
		, title      : 'Volume Control'
		, list       : [ control, 'range' ]
		, prompt     : '<br>'+ warning
		, beforeshow : () => {
			var $inputrange = $( '#infoList input' );
			$( '#infoList, .infoprompt' ).css( 'height', '150px' );
			$( '.inforange' ).append( '<div class="sub gr"></div>' );
			 $inputrange.on( 'input', function() {
				bash( [ ...cmd, +$( this ).val(), cmdlist ] );
			} ).on( 'touchend mouseup keyup', function() {
				bash( [ 'volumepush', bluealsa, 'CMD BT' ] );
			} );
			$( '.inforange i' ).on( 'click', function() {
				S.volume.val = +$inputrange.val();
				 $inputrange
					.trigger( 'input' )
					.trigger( 'keyup' );
			} );
			volumeInfoSet( bluealsa );
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
			if ( S.volume.db > -2 ) {
				bash( [ cmd0db ] );
			} else {
				if ( ! $( '.infoprompt' ).hasClass( 'hide' ) ) bash( [ cmd0db ] );
				$( '#infoList, .infoprompt' ).toggleClass( 'hide' );
			}
		}
		, oknoreset    : true
	} );
} );
$( '#mixertype' ).on( 'click', function() {
	if ( S.mixertype ) {
		if ( S.volume.db > -2 ) {
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
		  icon    : SW.icon
		, title   : 'Volume Type'
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
} );
$( '#dop' ).on( 'click', function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'mpd', 'DSP over PCM', checked );
	var cmd = [ 'dop', S.output.aplayname ];
	if ( ! checked ) cmd.push( 'OFF' ); // OFF with args - value by index
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
	var hardware = S.output.mixertype === 'software' && S.mixers;
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
		, list         : [ 'kB', 'number', { updn: { step: 1024, min: 4096, max: 40960 } } ]
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
		, list         : [ 'kB', 'number', { updn: { step: 1024, min: 8192, max: 81920 } } ]
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
			  icon         : SW.icon
			, title        : SW.title
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
	if ( S.volume.db > -2 ) {
		infoNoVolumeSet();
	} else {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : warning
			, cancel  : switchCancel
			, ok      : infoNoVolumeSet
		} );
	}
}
function infoNoVolumeSet() {
	notifyCommon( 'Enable ...' );
	bash( [ 'novolume' ], () => {
		if ( ! S.custom ) return
		
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : icoLabel( "User's Configurations" ) +' is currently enabled.'
						+'<br>Remove any volume related settings.'
		} );
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
function noVolumeSet() {
	S.novolume = ! S.volume.db && ! [ 'mixertype', 'crossfade', 'normalization', 'replaygain', 'soxr'
										  , 'camilladsp', 'equalizer' ].some( k => S[ k ] );
	$( '#novolume' ).prop( 'checked', S.novolume );
}
function renderPage() {
	playbackButton();
	renderStatus();
	var icondsp = '';
	[ 'camilladsp', 'equalizer' ].forEach( k => {
		if ( S[ k ] ) icondsp = ico( k );
	} );
	if ( icondsp ) $( '.i-camilladsp, .i-equalizer' ).remove();
	if ( S.bluetooth ) {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#btreceiver' ).html( '<option>'+ S.btmixer.replace( / *-* A2DP$/, '' ) +'</option>' );
		$( '#divbluealsa' ).removeClass( 'hide' );
	} else {
		if ( icondsp ) $( '#divbluealsa .col-l' ).append( icondsp );
		$( '#divdevice .col-l' ).html( $( '#divdevice .col-l' ).html() + icondsp );
		$( '#divbluealsa' ).addClass( 'hide' );
	}
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
		noVolumeSet();
		$( '#divmixertype' ).toggleClass( 'hide', S.camilladsp );
		$( '#dop' ).prop( 'checked', S.dop );
		$( '#ffmpeg' ).toggleClass( 'disabled', S.dabradio );
	}
	[ 'albumignore', 'mpdignore', 'nonutf8' ].forEach( k => $( '#'+ k ).toggleClass( 'hide', ! S.lists[ k ] ) );
	if ( I.range ) $( '#infoX' ).trigger( 'click' );
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
	bash( [ 'mixertype', mixertype, S.output.name, 'CMD MIXERTYPE DEVICE' ] );
}
function psVolume( data ) {
	data.type === 'mpd' ? S.volumempd = data.val : S.volume = data;
	noVolumeSet();
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
function volumeInfoSet( bluealsa ) {
	V.local = false; // from psValue()
	var volume = bluealsa ? S.btvolume : S.volume;
	var val = volume.val;
	var db  = volume.db;
	$( '.inforange .value' ).text( val );
	$( '.inforange input' ).val( val );
	$( '.inforange .sub' ).text( val ? db +' dB' : 'Mute' );
	$( '#infoOk' ).toggleClass( 'disabled', db === 0 || db === '' );
}
