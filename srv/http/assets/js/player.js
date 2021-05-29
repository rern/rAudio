$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function lines2line( lines ) {
	var val = '';
	var lines = lines.split( '\n' ).filter( e => e );
	lines.forEach( function( el ) {
		val += '^'+ el;
	} );
	return val.substring( 1 );
}
function setMixerType( mixertype ) {
	var hwmixer = device.mixers ? device.hwmixer : '';
	notify( 'Mixer Control', 'Change ...', 'mpd' );
	bash( [ 'mixertype', mixertype, device.aplayname, hwmixer ] );
}
renderPage = function( list ) {
	if ( typeof list === 'string' ) { // on load, try catching any errors
		var list2G = list2JSON( list );
		if ( !list2G ) return
	} else {
		G = list;
	}
	var htmlstatus =  G.version +'<br>'
	if ( G.counts ) {
		htmlstatus += G.counts.song.toLocaleString() +'&nbsp;<i class="fa fa-music gr"></i>&emsp;'
					+ G.counts.webradio.toLocaleString() +'&nbsp;<i class="fa fa-webradio gr"></i>';
	} else {
		htmlstatus += '<gr>Updating ...</gr>';
	}
	if ( !G.active ) htmlstatus += '<br><i class="fa fa-warning red"></i>&ensp;MPD not running'
	$( '#statusvalue' ).html( htmlstatus );
	if ( G.asoundcard == -1 ) {
		$( '.soundcard' ).addClass( 'hide' );
	} else {
		$( '.soundcard' ).removeClass( 'hide' );
		device = G.devices[ G.asoundcard ];
		var htmldevices = '';
		$.each( G.devices, function() {
			htmldevices += '<option value="'+ this.card +'">'+ this.name +'</option>';
		} );
		$( '#audiooutput' )
			.html( htmldevices )
			.prop( 'disabled', G.devices.length < 2 );
		$( '#audiooutput option' ).eq( G.asoundcard ).prop( 'selected', 1 );
		var htmlhwmixer = device.mixermanual ? '<option value="auto">Auto</option>' : '';
		device.mixerdevices.forEach( function( mixer ) {
			htmlhwmixer += '<option value="'+ mixer +'">'+ mixer +'</option>';
		} );
		$( '#hwmixer' )
			.html( htmlhwmixer )
			.val( device.hwmixer )
			.prop( 'disabled', device.mixers < 2 );
		var htmlmixertype = '<option value="none">None / 0dB</option>';
		if ( device.mixers ) htmlmixertype += '<option value="hardware">Mixer device</option>';
		htmlmixertype += '<option value="software">MPD software</option>';
		$( '#mixertype' )
			.html( htmlmixertype )
			.val( device.mixertype );
		$( '#audiooutput, #hwmixer, #mixertype' ).selectric( 'refresh' );
		$( '#setting-hwmixer' ).toggleClass( 'hide', device.mixers === 0 );
		$( '#novolume' ).prop( 'checked', device.mixertype === 'none' && !G.crossfade && !G.normalization && !G.replaygain );
		$( '#divdop' ).toggleClass( 'disabled', device.aplayname.slice( 0, 7 ) === 'bcm2835' );
		$( '#dop' ).prop( 'checked', device.dop == 1 );
	}
	$( '#crossfade' ).prop( 'checked', G.crossfade );
	$( '#setting-crossfade' ).toggleClass( 'hide', !G.crossfade );
	$( '#normalization' ).prop( 'checked', G.normalization );
	$( '#replaygain' ).prop( 'checked', G.replaygain );
	$( '#setting-replaygain' ).toggleClass( 'hide', !G.replaygain );
	$( '#buffer' ).prop( 'checked', G.buffer );
	$( '#setting-buffer' ).toggleClass( 'hide', !G.buffer );
	$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
	$( '#setting-bufferoutput' ).toggleClass( 'hide', !G.bufferoutput );
	$( '#ffmpeg' ).prop( 'checked', G.ffmpeg );
	$( '#autoupdate' ).prop( 'checked', G.autoupdate );
	$( '#custom' ).prop( 'checked', G.custom );
	$( '#setting-custom' ).toggleClass( 'hide', !G.custom );
	$( '#soxr' ).prop( 'checked', G.soxr );
	$( '#setting-soxr' ).toggleClass( 'hide', !G.soxr );
	[ 'crossfade', 'mpdconf', 'mount' ].forEach( function( id ) {
		codeToggle( id, 'status' );
	} );
	if ( $( '#infoRange .value' ).text() ) {
		bash( '/srv/http/bash/cmd.sh volumeget', function( level ) {
			$( '#infoRange .value' ).text( level );
			$( '#infoRange input' ).val( level );
		}, 'json' );
	}
	resetLocal();
	showContent();
}
refreshData = function() {
	bash( '/srv/http/bash/player-data.sh', function( list ) {
		renderPage( list );
	} );
}
refreshData();
//---------------------------------------------------------------------------------------
var device;
$( '.enable' ).click( function() {
	var idname = {
		  buffer       : 'Custom Audio Buffer'
		, bufferoutput : 'Custom Output Buffer'
		, crossfade    : 'Crossfade'
		, custom       : "User's Custom Settings"
		, replaygain   : 'Replay Gain'
		, soxr         : 'SoXR Custom Settings'
	}
	var id = this.id;
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-'+ id ).click();
	} else {
		bash( [ id +'disable' ] );
		notify( idname[ id ], 'Disable ...', 'mpd' );
	}
} );
$( '.enablenoset' ).click( function() {
	var idname = {
		  autoupdate    : 'Auto Update'
		, ffmpeg        : 'FFmpeg Decoder'
		, normalization : 'Normalization'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, 'mpd' );
	bash( [ id, checked ] );
} );
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard
var setmpdconf = '/srv/http/bash/mpd-conf.sh';
var warning = '<wh><i class="fa fa-warning fa-lg"></i>&ensp;Lower amplifier volume.</wh>'
			 +'<br><br>Signal will be set to original level (0dB).'
			 +'<br>Beware of too high volume from speakers.';
$( '#audiooutput' ).change( function() {
	var card = $( this ).val();
	var dev = G.devices[ card ];
	notify( 'Audio Output Device', 'Change ...', 'mpd' );
	bash( [ 'audiooutput', dev.aplayname, card, dev.name, dev.hwmixer ] );
} );
$( '#hwmixer' ).change( function() {
	var hwmixer = $( this ).val();
	notify( 'Hardware Mixer', 'Change ...', 'mpd' );
	bash( [ 'hwmixer', device.aplayname, hwmixer ] );
} );
$( '#setting-hwmixer' ).click( function() {
	var novolume = device.mixertype === 'none';
	bash( [ 'volumeget' ], function( voldb ) {
		var voldb = voldb.split( '^^' );
		var db0 = voldb[ 1 ] === '0.00';
		info( {
			  icon          : 'volume'
			, title         : 'Mixer Device Volume'
			, message       : device.hwmixer
			, rangevalue    : voldb[ 0 ]
			, footer        : ( novolume ? '0dB (No Volume)' : ( db0 ? '0dB' : 'n' ) )
			, beforeshow    : function() {
				if ( novolume ) {
					$( '#infoRange input' ).prop( 'disabled', 1 );
				} else {
					$( '#infoButtons a' ).toggleClass( 'hide', db0 );
					$( '.infofooter' ).toggleClass( 'hide', $( '.infofooter' ).text() === 'n' );
					$( '#infoRange input' ).on( 'click input', function() {
						var val = $( this ).val();
						$( '#infoRange .value' ).text( val );
						bash( 'amixer -M sset "'+ device.hwmixer +'" '+ val +'%' );
					} ).on( 'mouseup touchend', function() {
						bash( '/srv/http/bash/cmd.sh volumepushstream' );
						$( '#infoButtons a' ).removeClass( 'hide' );
						$( '.infofooter' ).addClass( 'hide' );
					} );
				}
			}
			, buttonnoreset : 1
			, buttonlabel   : novolume ? '' : '<i class="fa fa-undo"></i>0dB'
			, button        : novolume ? '' : function() {
				bash( [ 'volume0db', device.hwmixer ], function() {
					$( '#infoButtons a' ).addClass( 'hide' );
					$( '.infofooter' ).removeClass( 'hide' );
				} );
			}
			, nook          : 1
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
			, cancel  : function() {
				$( '#mixertype' )
					.val( device.mixertype )
					.selectric( 'refresh' );
			}
			, ok      : function() {
				setMixerType( mixertype );
			}
		} );
	} else {
		setMixerType( mixertype );
	}
} );
$( '#novolume' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		info( {
			  icon    : 'volume'
			, title   : 'No Volume'
			, message : warning
			, ok      : function() {
				notify( 'No Volume', 'Enable ...', 'mpd' );
				bash( [ 'novolume', device.aplayname, device.card, device.hwmixer ] );
			}
		} );
	} else {
		info( {
			  icon         : 'volume'
			, title        : 'No Volume'
			, message      : '<wh>No volume</wh> will be disabled on:'
							+'<br>&emsp; &bull; Select a Mixer Control'
							+'<br>&emsp; &bull; Enable any Volume options'
			, messagealign : 'left'
		} );
		$( this ).prop( 'checked', 1 );
	}
} );
$( '#dop' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'DSP over PCM', checked, 'mpd' );
	bash( [ 'dop', checked, device.aplayname ] );
} );
$( '#setting-crossfade' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Crossfade'
		, textlabel    : 'Seconds'
		, boxwidth     : 60
		, values       : G.crossfadeval || 1
		, checkchanged : ( G.crossfade ? 1 : 0 )
		, checkblank   : [ 0 ]
		, cancel       : function() {
			$( '#crossfade' ).prop( 'checked', G.crossfade );
		}
		, ok           : function() {
			crossfadeval = infoVal();
			bash( [ 'crossfadeset', crossfadeval ] );
			notify( 'Crossfade', G.crossfade ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-replaygain' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Replay Gain'
		, radio        : { Auto: 'auto', Album: 'album', Track: 'track' }
		, values       : G.replaygainval || 'auto'
		, checkchanged : ( G.replaygain ? 1 : 0 )
		, cancel       : function() {
			$( '#replaygain' ).prop( 'checked', G.replaygain );
		}
		, ok           : function() {
			replaygainval = infoVal();
			bash( [ 'replaygainset', replaygainval ] );
			notify( 'Replay Gain', G.replaygain ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#filetype' ).click( function() {
	$( '#divfiletype' ).toggleClass( 'hide' );
} );
$( '#setting-buffer' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Custom Audio Buffer'
		, message      : '<code>audio_buffer_size</code> (default: 4096)'
		, textlabel    : 'Size <gr>(kB)</gr>'
		, boxwidth     : 125
		, values       : G.bufferval || 4096
		, checkchanged : ( G.buffer ? 1 : 0 )
		, checkblank   : [ 0 ]
		, cancel       : function() {
			$( '#buffer' ).prop( 'checked', G.buffer );
		}
		, ok           : function() {
			bash( [ 'bufferset', infoVal() ] );
			notify( 'Custom Audio Buffer', G.buffer ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-bufferoutput' ).click( function() {
	info( {
		  icon         : 'mpd'
		, title        : 'Custom Output Buffer'
		, message      : '<code>max_output_buffer_size</code> (default: 8192)'
		, textlabel    : 'Size <gr>(kB)</gr>'
		, boxwidth     : 125
		, values       : G.bufferoutputval || 8192
		, checkchanged : ( G.bufferoutput ? 1 : 0 )
		, checkblank   : [ 0 ]
		, cancel       : function() {
			$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
		}
		, ok           : function() {
			bash( [ 'bufferoutputset', infoVal() ] );
			notify( 'Custom Output Buffer', G.bufferoutput ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var soxrinfo = heredoc( function() { /*
	<table>
		<tr><td>Precision</td>
			<td width="100"><select>
				<option value="16">16</option>
				<option value="20">20</option>
				<option value="24">24</option>
				<option value="28">28</option>
				<option value="32">32</option>
				</select></td><td>&nbsp;<gr>bit</gr></td>
		</tr>
		<tr><td>Phase Response</td>
			<td><input type="text"></td><td>&nbsp;<gr>0-100</gr></td>
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
		<tr><td>Rolloff</td>
			<td colspan="2"><select>
					<option value="0">0 - Small</option>
					<option value="1">1 - Medium</option>
					<option value="2">2 - None</option>
					<option value="8">8 - High precision</option>
					<option value="16">16 - Double precision</option>
					<option value="32">32 - Variable rate</option>
				</select>
			</td>
		</tr>
	</table>
*/ } );
$( '#setting-soxr' ).click( function() {
	var defaultval = [ 20, 50, 91.3, 100, 0, 0 ];
	var values = G.soxr ? G.soxrval.split( ' ' ) : defaultval;
	info( {
		  icon          : 'mpd'
		, title         : 'SoXR Custom Settings'
		, content       : soxrinfo
		, nofocus       : 1
		, values        : values
		, checkchanged  : ( G.soxr ? 1 : 0 )
		, checkblank    : [ 1, 2, 3, 4 ]
		, beforeshow    : function() {
			setTimeout( function() {
				var $extra = $( '#infoContent tr:eq( 5 )' );
				$extra.find( '.selectric, .selectric-wrapper' ).css( 'width', '185px' );
				$extra.find( '.selectric-items' ).css( 'min-width', '185px' );
			}, 0 );
		}
		, boxwidth      : 90
		, cancel        : function() {
			$( '#soxr' ).prop( 'checked', G.soxr );
		}
		, ok            : function() {
			var soxrval = infoVal().join( ' ' );
			bash( [ 'soxrset', soxrval ] );
			notify( 'SoXR Custom Settings', G.soxr ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var custominfo = heredoc( function() { /*
<table>
	<tr><td style="text-align: left"><code>/etc/mpd.conf</code>
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
</table>
*/ } );
$( '#setting-custom' ).click( function() {
	var valglobal = G.userglobal.replace( /\^/g, '\t' ).replace( /\|/g, '\n' );
	var valoutput = G.useroutput.replace( /\^/g, '\t' ).replace( /\|/g, '\n' );
	info( {
		  icon         : 'mpd'
		, title        : "User's Configurations"
		, content      : custominfo
		, boxwidth     : 320
		, values       : [ valglobal, valoutput ]
		, checkchanged : ( G.custom ? 1 : 0 )
		, cancel       : function() {
			$( '#custom' ).prop( 'checked', G.custom );
		}
		, ok           : function() {
			var values = infoVal();
			var customglobal = lines2line( values[ 0 ] );
			var customoutput = lines2line( values[ 1 ] );
			bash( [ 'customset', customglobal, customoutput, device.aplayname ], function( std ) {
				if ( std == -1 ) {
					bannerHide();
					info( {
						  icon    : 'mpd'
						, title   : "User's Configurations"
						, message : 'MPD failed with the added lines'
									+'<br>Restored to previous configurations.'
					} );
				}
			} );
			notify( "User's Custom Settings", G.custom ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
