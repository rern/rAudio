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
refreshData = function() {
	bash( '/srv/http/bash/mpd-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
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
			device = G.devices[ G.devices.length - 1 ];
			$( '#audiooutput' )
				.html( '<option data-card="'+ device.card +'">'+ device.name +'</option>' )
				.prop( 'disabled', 1 );
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
		$( '#autoupdate' ).prop( 'checked', G.autoupdate );
		$( '#ffmpeg' ).prop( 'checked', G.ffmpeg );
		$( '#buffer' ).prop( 'checked', G.buffer );
		$( '#setting-buffer' ).toggleClass( 'hide', !G.buffer );
		$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
		$( '#setting-bufferoutput' ).toggleClass( 'hide', !G.bufferoutput );
		$( '#custom' ).prop( 'checked', G.custom );
		$( '#setting-custom' ).toggleClass( 'hide', !G.custom );
		$( '#soxr' ).prop( 'checked', G.soxr );
		$( '#setting-soxr' ).toggleClass( 'hide', !G.soxr );
		[ 'crossfade', 'mpdconf' ].forEach( function( id ) {
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
$( '#audiooutput, #hwmixer, #mixertype' ).selectric();
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard
var setmpdconf = '/srv/http/bash/mpd-conf.sh';
var warning = '<wh><i class="fa fa-warning fa-lg"></i>&ensp;Lower amplifier volume.</wh>'
			 +'<br><br>Signal level will be set to full amplitude to 0dB'
			 +'<br>Too high volume can damage speakers and ears';
$( '#hwmixer' ).change( function() {
	var hwmixer = $( this ).val();
	notify( 'Hardware Mixer', 'Change ...', 'mpd' );
	bash( [ 'hwmixer', device.aplayname, hwmixer ] );
} );
$( '#setting-hwmixer' ).click( function() {
	var control = device.hwmixer;
	bash( '/srv/http/bash/cmd.sh volumeget', function( level ) {
		info( {
			  icon       : 'volume'
			, title      : 'Mixer Device Volume'
			, message    : control
			, rangevalue : level
			, preshow    : function() {
				if ( device.mixertype === 'none' ) {
					$( '#infoRange input' ).prop( 'disabled', 1 );
					$( '#infoFooter' )
						.html( '<br>Volume Control: None / 0dB' )
						.removeClass( 'hide' );
					return
				}
				
				$( '#infoRange input' ).on( 'click input', function() {
					var val = $( this ).val();
					$( '#infoRange .value' ).text( val );
					bash( 'amixer -M sset "'+ control +'" '+ val +'%' );
				} ).on( 'mouseup touchend', function() {
					if ( device.mixertype !== 'software' ) bash( '/srv/http/bash/cmd.sh volumepushstream' );
				} );
			}
			, nobutton   : 1
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
			  icon    : 'volume'
			, title   : 'No Volume'
			, message : '<wh>No volume</wh> will be disabled on:'
						+'<br>&emsp; &bull; Select a Mixer Control'
						+'<br>&emsp; &bull; Enable any Volume options'
			, msgalign : 'left'
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
		  icon    : 'mpd'
		, title   : 'Crossfade'
		, message : 'Seconds:'
		, radio   : { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
		, checked : G.crossfadeval || 1
		, preshow       : function() {
			// verify changes
			if ( G.crossfade ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoRadio' ).change( function() {
					$( '#infoOk' ).toggleClass( 'disabled', +$( this ).find( 'input:checked' ).val() === G.crossfadeval );
				} );
			}
		}
		, cancel    : function() {
			$( '#crossfade' ).prop( 'checked', G.crossfade );
		}
		, ok      : function() {
			crossfadeval = $( 'input[name=inforadio]:checked' ).val();
			bash( [ 'crossfadeset', crossfadeval ] );
			notify( 'Crossfade', G.crossfade ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-replaygain' ).click( function() {
	info( {
		  icon    : 'mpd'
		, title   : 'Replay Gain'
		, radio   : { Auto: 'auto', Album: 'album', Track: 'track' }
		, checked : G.replaygainval || 'auto'
		, preshow       : function() {
			// verify changes
			if ( G.replaygain ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoRadio' ).change( function() {
					$( '#infoOk' ).toggleClass( 'disabled', $( this ).find( 'input:checked' ).val() === G.replaygainval );
				} );
			}
		}
		, cancel  : function() {
			$( '#replaygain' ).prop( 'checked', G.replaygain );
		}
		, ok      : function() {
			replaygainval = $( 'input[name=inforadio]:checked' ).val();
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
		  icon      : 'mpd'
		, title     : 'Custom Audio Buffer'
		, message   : '<code>audio_buffer_size</code> (default: 4096)'
		, textlabel : 'Size <gr>(kB)</gr>'
		, textvalue : G.bufferval || 4096
		, preshow       : function() {
			// verify changes
			if ( G.buffer ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox' ).keyup( function() {
					$( '#infoOk' ).toggleClass( 'disabled', +$( this ).val() === G.bufferval );
				} );
			}
		}
		, cancel    : function() {
			$( '#buffer' ).prop( 'checked', G.buffer );
		}
		, ok        : function() {
			var bufferval = $( '#infoTextBox' ).val().replace( /\D/g, '' );
			bash( [ 'bufferset', bufferval ] );
			notify( 'Custom Audio Buffer', G.buffer ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#setting-bufferoutput' ).click( function() {
	info( {
		  icon      : 'mpd'
		, title     : 'Custom Output Buffer'
		, message   : '<code>max_output_buffer_size</code> (default: 8192)'
		, textlabel : 'Size <gr>(kB)</gr>'
		, textvalue : G.bufferoutputval || 8192
		, preshow       : function() {
			// verify changes
			if ( G.bufferoutput ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox' ).keyup( function() {
					$( '#infoOk' ).toggleClass( 'disabled', +$( this ).val() === G.bufferoutputval );
				} );
			}
		}
		, cancel    : function() {
			$( '#bufferoutput' ).prop( 'checked', G.bufferoutput );
		}
		, ok        : function() {
			var bufferoutputval = $( '#infoTextBox' ).val().replace( /\D/g, '' );
			bash( [ 'bufferoutputset', bufferoutputval ] );
			notify( 'Custom Output Buffer', G.bufferoutput ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var soxrinfo = heredoc( function() { /*
	<div id="infoText" class="infocontent">
		<div class="infotextlabel">
			<a class="infolabel">Precision <gr>(bit)</gr></a>
			<a class="infolabel">Phase Response</a>
			<a class="infolabel">Passband End <gr>(%)</gr></a>
			<a class="infolabel">Stopband Begin <gr>(%)</gr></a>
			<a class="infolabel">Attenuation <gr>(dB)</gr></a>
		</div>
		<div class="infotextbox">
			<select class="infohtml" id="infoSelectBox">
				<option value="16">16</option>
				<option value="20">20</option>
				<option value="24">24</option>
				<option value="28">28</option>
				<option value="32">32</option>
			</select>
			<input type="text" class="infoinput input" id="infoTextBox1">
			<input type="text" class="infoinput input" id="infoTextBox2">
			<input type="text" class="infoinput input" id="infoTextBox3">
			<input type="text" class="infoinput input" id="infoTextBox4">
		</div>
		<div id="infotextsuffix">
			<gr>&nbsp;</gr>
			<gr>0-100</gr>
			<gr>0-100</gr>
			<gr>100-150<px30/></gr>
			<gr>0-30</gr>
		</div>
		<div id="extra">
			<div class="infotextlabel">
				<a class="infolabel"><px50/> Extra Settings</a>
			</div>
			<div class="infotextbox">
				<select class="infohtml" id="infoSelectBox1">
					<option value="0">0 - Rolloff - Small</option>
					<option value="1">1 - Rolloff - Medium</option>
					<option value="2">2 - Rolloff - None</option>
					<option value="8">8 - High precision</option>
					<option value="16">16 - Double precision</option>
					<option value="32">32 - Variable rate</option>
				</select>
			</div>
		</div>
	</div>
*/ } );
$( '#setting-soxr' ).click( function() {
	var defaultval = [ 20, 50, 91.3, 100, 0, 0, ];
	info( {
		  icon          : 'mpd'
		, title         : 'SoXR Custom Settings'
		, content       : soxrinfo
		, nofocus       : 1
		, preshow       : function() {
			var val = G.soxrval ? G.soxrval.split( ' ' ) : defaultval;
			$( '#infoSelectBox option[value='+ val[ 0 ] +']' ).prop( 'selected', 1 );
			$( '#infoSelectBox1 option[value='+ val[ 5 ] +']' ).prop( 'selected', 1 );
			for ( i = 1; i < 5; i++ ) {
				$( '#infoTextBox'+ i ).val( val[ i ] );
			}
			setTimeout( function() {
				$( '#extra .selectric, #extra .selectric-wrapper' ).css( 'width', '185px' );
				$( '#extra .selectric-items' ).css( 'min-width', '185px' );
			}, 30 );
			// // verify changes + values
			if ( G.soxr ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoSelectBox, #infoSelectBox1' ).change( function() {
					var soxrval = $( '#infoSelectBox' ).val();
					for ( i = 1; i < 5; i++ ) soxrval += ' '+ $( '#infoTextBox'+ i ).val();
					soxrval += ' '+ $( '#infoSelectBox1' ).val();
					$( '#infoOk' ).toggleClass( 'disabled', soxrval === G.soxrval );
				} );
				$( '.infoinput' ).keyup( function() {
					var soxrval = $( '#infoSelectBox' ).val();
					for ( i = 1; i < 5; i++ ) soxrval += ' '+ $( '#infoTextBox'+ i ).val();
					soxrval += ' '+ $( '#infoSelectBox1' ).val();
					var v = soxrval.split( ' ' );
					var errors = false;
					if (   ( v[ 1 ] < 0 || v[ 1 ] > 100 )
						|| ( v[ 2 ] < 0 || v[ 2 ] > 100 )
						|| ( v[ 3 ] < 100 || v[ 3 ] > 150 )
						|| ( v[ 4 ] < 0 || v[ 4 ] > 30 )
					) errors = true;
					$( '#infoOk' ).toggleClass( 'disabled', soxrval === G.soxrval || errors );
				} );
			} else { // verify values
				$( '.infoinput' ).keyup( function() {
					var soxrval = 0;
					for ( i = 1; i < 5; i++ ) soxrval += ' '+ $( '#infoTextBox'+ i ).val();
					var v = soxrval.split( ' ' );
					var errors = false;
					if (   ( v[ 1 ] < 0 || v[ 1 ] > 100 )
						|| ( v[ 2 ] < 0 || v[ 2 ] > 100 )
						|| ( v[ 3 ] < 100 || v[ 3 ] > 150 )
						|| ( v[ 4 ] < 0 || v[ 4 ] > 30 )
					) errors = true;
					$( '#infoOk' ).toggleClass( 'disabled', errors );
				} );
			}
		}
		, boxwidth      : 70
		, buttonlabel   : '<i class="fa fa-undo"></i>Default'
		, buttoncolor   : orange
		, button        : function() {
			for ( i = 1; i < 5; i++ ) {
				$( '#infoTextBox'+ i ).val( defaultval[ i ] );
			}
		}
		, buttonnoreset : 1
		, buttonwidth   : 1
		, cancel        : function() {
			$( '#soxr' ).prop( 'checked', G.soxr );
		}
		, ok            : function() {
			var soxrval = $( '#infoSelectBox' ).val();
			for ( i = 1; i < 5; i++ ) soxrval += ' '+ $( '#infoTextBox'+ i ).val();
			soxrval += ' '+ $( '#infoSelectBox1' ).val();
			bash( [ 'soxrset', soxrval ] );
			notify( 'SoXR Custom Settings', G.soxr ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
var custominfo = heredoc( function() { /*
	<p class="infomessage msg">
			<code>/etc/mpd.conf</code>
		<br>...
		<br>user<px style="width: 153px"></px>"mpd"
	</p>
	<div class="infotextbox">
		<textarea class="infoinput" id="global" spellcheck="false"></textarea>
	</div>
	<p class="infomessage msg">
			...
		<br>
		<br>audio_output {
		<br><px30/>...
		<br><px30/>mixer_device<px style="width: 24px"></px>"hw:N"
	</p>
	<div class="infotextbox">
		<textarea class="infoinput" id="output" spellcheck="false"></textarea>
	</div>
	<p class="infomessage msg">
		}
	</p>
*/ } );
$( '#setting-custom' ).click( function() {
	var valglobal, valoutput;
	var aplayname = device.aplayname;
	info( {
		  icon     : 'mpd'
		, title    : "User's Custom Settings"
		, content  : custominfo
		, msgalign : 'left'
		, boxwidth : 'max'
		, preshow  : function() {
			bash( [ 'customgetglobal' ], function( data ) { // get directly to keep white spaces
				valglobal = data || '';
				bash( [ 'customgetoutput', aplayname ], function( data ) {
					valoutput = data || '';
					$( '#global' ).val( valglobal );
					$( '#output' ).val( valoutput );
				} );
			} );
			$( '.msg' ).css( {
				  width          : '100%'
				, margin         : 0
				, 'text-align'   : 'left'
				, 'padding-left' : '35px'
			} );
			$( '.msg, #global, #output' ).css( 'font-family', 'Inconsolata' );
			$( '#output' ).css( 'padding-left', '39px' )
			// // verify changes
			if ( G.custom ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#global, #output' ).keyup( function() {
					var changed = $( '#global' ).val() !== valglobal || $( '#output' ).val() !== valoutput;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, cancel   : function() {
			$( '#custom' ).prop( 'checked', G.custom );
		}
		, ok       : function() {
			var customglobal = lines2line( $( '#global' ).val() );
			var customoutput = lines2line( $( '#output' ).val() );
			bash( [ 'customset', customglobal, customoutput, aplayname ] );
			notify( "User's Custom Settings", G.custom ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
