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
	var $output = $( '#audiooutput option:selected' );
	var aplayname = $output.val();
	if ( mixertype === 'none' ) {
		var card = $output.data( 'card' );
		var hwmixer = $output.data( 'hwmixer' );
	} else {
		var card = '';
		var hwmixer = '';
	}
	notify( 'Mixer Control', 'Change ...', 'mpd' );
	bash( [ 'mixerset', mixertype, aplayname, card, hwmixer ] );
}
refreshData = function() {
	bash( '/srv/http/bash/mpd-data.sh', function( list ) {
		if ( list == -1 ) {
			info( {
				  icon    : 'mpd'
				, title   : 'MPD Settings'
				, message : '<i class="fa fa-warning"></i> No soundcards found.'
				, nox     : 1
				, ok      : function() {
					location.href = '/';
				}
			} );
			loader( 'hide' );
			return
		}
		
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		var htmldevices = '';
		$.each( G.devices, function() {
			htmldevices += '<option '
				+'value="'+ this.aplayname +'" '
				+'data-card="'+ this.card +'" '
				+'data-device="'+ this.device +'" '
				+'data-dop="'+ this.dop +'" '
				+'data-hw="'+ this.hw +'" '
				+'data-hwmixer="'+ this.hwmixer +'" '
				+'data-mixers="'+ this.mixers +'" '
				+'data-mixertype="'+ this.mixertype +'"'
				+'>'+ this.name +'</option>';
		} );
		$( '#audiooutput' )
			.html( htmldevices )
			.prop( 'disabled', G.devices.length === 1 );
		var $selected = $( '#audiooutput option' ).eq( G.asoundcard );
		$selected.prop( 'selected', 1 );
		var mixerhtml = '<option value="none">Disable</option>'
		if ( $selected.data( 'hwmixer' ) ) mixerhtml += '<option value="hardware">DAC hardware</option>'
		mixerhtml +='<option value="software">MPD software</option>';
		var mixertype = $selected.data( 'mixertype' );
		$( '#mixertype' )
			.html( mixerhtml )
			.val( mixertype );
		$( '#audiooutput, #mixertype' ).selectric( 'refresh' );
		$( '.hwmixer' ).toggleClass( 'hide', $selected.data( 'mixers' ) < 2 );
		$( '#divmixer' ).toggleClass( 'hide', $selected.data( 'hwmixer' ) === '' );
		$( '#novolume' ).prop( 'checked', mixertype === 'none' && !G.crossfade && !G.normalization && !G.replaygain );
		$( '#divdop' ).toggleClass( 'hide', $selected.val().slice( 0, 7 ) === 'bcm2835' );
		$( '#dop' ).prop( 'checked', $selected.data( 'dop' ) == 1 );
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
		[ 'aplay', 'amixer', 'crossfade', 'mpd', 'mpdconf' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		resetLocal();
		showContent();
	} );
}
refreshData();
//---------------------------------------------------------------------------------------
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

$( '#audiooutput, #mixertype' ).selectric();
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard
var setmpdconf = '/srv/http/bash/mpd-conf.sh';
var warning = '<wh><i class="fa fa-warning fa-lg"></i>&ensp;Lower amplifier volume.</wh>'
			 +'<br>(If current level in MPD is not 100%.)'
			 +'<br><br>Signal level will be set to full amplitude to 0dB'
			 +'<br>Too high volume can damage speakers and ears';
$( '#audiooutput' ).change( function() {
	var $selected = $( this ).find( ':selected' );
	var output = $selected.text();
	var aplayname = $selected.val();
	var card = $selected.data( 'card' );
	var hwmixer = $selected.data( 'hwmixer' );
	notify( 'Audio Output Device', 'Change ...', 'mpd' );
	aplayname = output !== G.usbdac ? aplayname : '';
	bash( [ 'audiooutput', aplayname, card, output, hwmixer ] );
} );
$( '#mixertype' ).change( function() {
	var mixertype = $( this ).val();
	if ( mixertype === 'none' ) {
		info( {
			  icon    : 'volume'
			, title   : 'Volume Level'
			, message : warning
			, cancel  : function() {
				$( '#mixertype' )
					.val( $( '#audiooutput option:selected' ).data( 'mixertype' ) )
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
$( '#setting-mixertype' ).click( function() { // hardware mixer
	var $selectedoutput = $( '#audiooutput option:selected' );
	var card = $selectedoutput.data( 'card' );
	var hwmixer = $selectedoutput.data( 'hwmixer' );
	var select = $selectedoutput.data( 'mixermanual' ) ? { 'Auto select': 'auto' } : {};
	bash( [ 'amixer', card ], function( data ) {
		var devices = data.split( '\n' );
		devices.forEach( function( val ) {
			select[ val ] = val;
		} );
		info( {
			  icon        : 'volume'
			, title       : 'Hardware Mixer'
			, message     : 'Manually select hardware mixer:'
			, selectlabel : 'Device'
			, select      : select
			, checked     : hwmixer
			, boxwidth    : 280
			, footer      : '<br>(Only if current one not working)'
			, preshow     : function() {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoSelectBox' ).change( function() {
					$( '#infoOk' ).toggleClass( 'disabled', $( this ).val() === hwmixer );
				} );
			}
			, ok          : function() {
				var aplayname = $( '#audiooutput option:selected' ).val();
				var output = $( '#audiooutput option:selected' ).text();
				var mixermanual = $( '#infoSelectBox' ).val();
				var mixerauto = mixermanual === 'auto';
				var mixer = mixerauto ? hwmixer : mixermanual;
				notify( 'Hardware Mixer', 'Change ...', 'mpd' );
				bash( [ 'mixerhw', aplayname, output, mixer, mixermanual ] );
			}
		} );
	} );
} );
$( '#novolume' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		var $output = $( '#audiooutput option:selected' );
		info( {
			  icon    : 'volume'
			, title   : 'No Volume'
			, message : warning
			, ok      : function() {
				notify( 'No Volume', 'Enable ...', 'mpd' );
				bash( [ 'novolume', $output.text(), $output.data( 'card' ), $output.data( 'hwmixer' ) ] );
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
	bash( [ 'dop', checked, $( '#audiooutput option:selected' ).text() ] );
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
		, buttoncolor   : '#de810e'
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
	var output = $( '#audiooutput option:selected' ).text();
	info( {
		  icon     : 'mpd'
		, title    : "User's Custom Settings"
		, content  : custominfo
		, msgalign : 'left'
		, boxwidth : 'max'
		, preshow  : function() {
			bash( [ 'customgetglobal' ], function( data ) { // get directly to keep white spaces
				valglobal = data || '';
				bash( [ 'customgetoutput', output ], function( data ) {
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
			bash( [ 'customset', customglobal, customoutput, output ] );
			notify( "User's Custom Settings", G.custom ? 'Change ...' : 'Enable ...', 'mpd' );
		}
	} );
} );
$( '#mpdrestart' ).click( function() {
	$this = $( this );
	info( {
		  icon    : 'mpd'
		, title   : 'MPD'
		, message : 'Restart MPD?'
		, ok      : function() {
			notify( 'MPD', 'Restart ...', 'mpd' );
			bash( [ 'restart' ] );
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
