$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function dataBackup( netctl ) {
	var backuptitle = 'Backup Settings';
	var icon = 'sd';
	notify( backuptitle, 'Process ...', 'sd blink' );
	bash( [ 'databackup', netctl ], function( data ) {
		if ( data == 1 ) {
			notify( backuptitle, 'Download ...', icon );
			fetch( '/data/tmp/backup.gz' )
				.then( response => response.blob() )
				.then( blob => {
					var url = window.URL.createObjectURL( blob );
					var a = document.createElement( 'a' );
					a.style.display = 'none';
					a.href = url;
					a.download = 'backup.gz';
					document.body.appendChild( a );
					a.click();
					setTimeout( () => {
						a.remove();
						window.URL.revokeObjectURL( url );
						bannerHide();
					}, 1000 );
				} ).catch( () => {
					info( {
						  icon    : icon
						, title   : backuptitle
						, message : '<wh>Warning!</wh><br>File download failed.'
					} );
					bannerHide();
				} );
		} else {
			info( {
				  icon    : icon
				, title   : backuptitle
				, message : 'Backup failed.'
			} );
			bannerHide();
		}
	} );
}
function rebootText( enable, device ) {
	var exist = 0;
	if ( G.reboot.length ) {
		exist = G.reboot.some( function( line ) {
			return line.indexOf( device ) !== -1
		} );
	}
	if ( !exist ) G.reboot.push( ( enable ? 'Enable' : 'Disable' ) +' '+ device );
}
function renderStatus() {
	var status = G.cpuload.replace( / /g, ' <gr>&bull;</gr> ' )
		+'<br>'+ ( G.cputemp < 80 ? G.cputemp +' °C' : '<red><i class="fa fa-warning blink red"></i>&ensp;'+ G.cputemp +' °C</red>' )
		+'<br>'+ G.time.replace( ' ', ' <gr>&bull;</gr> ' ) +'&emsp;<grw>'+ G.timezone.replace( '/', ' · ' ) +'</grw>'
		+'<br>'+ G.uptime +'<span class="wide">&emsp;<gr>since '+ G.uptimesince.replace( ' ', ' &bull; ' ) +'</gr></span>'
		+'<br>'+ ( G.startup ? G.startup.replace( /\(/g, '<gr>' ).replace( /\)/g, '</gr>' ) : 'Booting ...' );
	if ( G.throttled ) { // https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md
		var bits = parseInt( G.throttled ).toString( 2 ); // 20 bits: 19..0 ( hex > decimal > binary )
		if ( bits.slice( -1 ) == 1 ) {                    // bit# 0  - undervoltage now
			status += '<br><i class="fa fa-warning blink red"></i>&ensp;Voltage under 4.7V - currently detected.'
		} else if ( bits.slice( -19, 1 ) == 1 ) {         // bit# 19 - undervoltage occured
			status += '<br><i class="fa fa-warning"></i>&ensp;Voltage under 4.7V - occurred.';
		}
	}
	return status
}

refreshData = function() {
	bash( '/srv/http/bash/system-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		var cpu = G.rpi01 ? '' : '4 ';
		cpu += G.soccpu +' <gr>@</gr> ';
		cpu += G.socspeed < 1000 ? G.socspeed +'MHz' : G.socspeed / 1000 +'GHz';
		$( '#systemvalue' ).html(
			  'rAudio '+ G.version +' <gr>&bull; '+ G.versionui +'</gr>'
			+'<br>'+ G.kernel
			+'<br>'+ G.rpimodel.replace( /(Rev.*)$/, '<gr>$1</gr>' )
			+'<br>'+ G.soc + ' <gr>&bull;</gr> '+ G.socram
			+'<br>'+ cpu
		);
		$( '#status' ).html( renderStatus );
		$( '#throttled' ).toggleClass( 'hide', $( '#status .fa-warning' ).length === 0 );
		$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		$( '#setting-bluetooth' ).toggleClass( 'hide', !G.bluetooth );
		$( '#wlan' ).prop( 'checked', G.wlan )
		$( '#i2smodule' ).val( 'none' );
		$( '#i2smodule option' ).filter( function() {
			var $this = $( this );
			return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
		} ).prop( 'selected', true );
		$( '#i2smodule' ).selectric( 'refresh' );
		var i2senabled = $( '#i2smodule' ).val() === 'none' ? false : true;
		$( '#divi2smodulesw' ).toggleClass( 'hide', i2senabled );
		$( '#divi2smodule' ).toggleClass( 'hide', !i2senabled );
		$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		$( '#setting-lcdchar' ).toggleClass( 'hide', !G.lcdchar );
		$( '#lcd' ).prop( 'checked', G.lcd );
		$( '#setting-lcd' ).toggleClass( 'hide', !G.lcd );
		$( '#powerbutton' ).prop( 'checked', G.powerbutton );
		$( '#setting-powerbutton' ).toggleClass( 'hide', !G.powerbutton );
		var powerbuttonconf = G.powerbuttonconf.split( ' ' );
		$( '#helpswpin' ).text( powerbuttonconf[ 0 ] );
		$( '#helpledpin' ).text( powerbuttonconf[ 1 ] );
		$( '#relays' ).prop( 'checked', G.relays );
		$( '#setting-relays' ).toggleClass( 'hide', !G.relays );
		$( '#onboardaudio' ).prop( 'checked', G.onboardaudio );
		$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		$( '#setting-soundprofile' ).toggleClass( 'hide', !G.soundprofile );
		$( '#hostname' ).val( G.hostname );
		$( '#timezone' )
			.val( G.timezone )
			.selectric( 'refresh' );
		[ 'bluetoothctl', 'configtxt', 'iw', 'journalctl', 'powerbutton', 'rfkill', 'soundprofile' ].forEach( function( id ) {
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
		  bluetooth    : 'On-board Bluetooth'
		, lcdchar      : 'Character LCD'
		, powerbutton  : 'Power Button'
		, soundprofile : 'Kernel Sound Profile'
	}
	var id = this.id;
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-'+ id ).click();
	} else {
		bash( [ id +'disable' ] );
		notify( idname[ id ], 'Disable ...', id );
	}
} );
$( '.enablenoset' ).click( function() {
	var idname = {
		  lcd          : 'TFT LCD'
		, onboardaudio : 'On-board Audio'
		, relays       : 'GPIO Relay'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, id );
	if ( id !== 'relays' ) rebootText( checked, idname[ id ] );
	bash( [ id, checked, G.reboot.join( '\n' ) ] );
} );

$( '#timezone, #i2smodule' ).selectric( { maxHeight: 400 } );
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard

$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'settings.php?p='+ $( this ).data( 'setting' );
} );
$( 'body' ).on( 'click touchstart', function( e ) {
	if ( !$( e.target ).closest( '.i2s' ).length && $( '#i2smodule option:selected' ).val() === 'none' ) {
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
	}
} );
$( '#refresh' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var $this = $( this );
	var active = $this.hasClass( 'blink' );
	$this.toggleClass( 'blink', !active );
	if ( active ) {
		clearInterval( intervalcputime );
		bannerHide();
	} else {
		intervalcputime = setInterval( function() {
			bash( '/srv/http/bash/system-data.sh status', function( status ) {
				$.each( status, function( key, val ) {
					G[ key ] = val;
				} );
				$( '#status' ).html( renderStatus );
			}, 'json' );
		}, 10000 );
		banner( 'System Status', 'Refresh every 10 seconds.<br>Click again to stop.', 'sliders', 10000 );
	}
} );
$( '#setting-bluetooth' ).click( function() {
	var btdiscoverable, btformat;
	info( {
		  icon     : 'bluetooth'
		, title    : 'Bluetooth'
		, checkbox : { 'Discoverable <gr>by senders</gr>': 1, 'Sampling 16bit 44.1kHz <gr>to receivers</gr>': 2 }
		, checked  : [ !G.bluetooth || G.btdiscoverable ? 0 : 2, G.btformat ? 1 : 2 ]
		, preshow  : function() {
			if ( G.bluetooth ) {
				$( '#infoOk' ).addClass( 'disabled' )
				$( '#infoCheckBox' ).change( function() {
					btdiscoverable = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' );
					btformat = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
					var changed = btdiscoverable !== G.btdiscoverable || btformat !== G.btformat;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, cancel  : function() {
			$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		}
		, ok       : function() {
			if ( !G.bluetooth ) {
				btdiscoverable = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' );
				btformat = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
			}
			notify( 'Bluetooth', ( G.bluetooth ? 'Change ...' : !G.bluetooth ), 'bluetooth' );
			bash( [ 'bluetoothset', btdiscoverable, btformat ] );
		}
	} );
} );
$( '#wlan' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( !$( '#system .fa-wifi' ).length && !G.hostapd ) {
		notify( 'Wi-Fi', checked, 'wifi' );
		bash( [ 'wlan', checked ] );
	} else {
		var message = !G.hostapd
						? 'This will disconnect Wi-Fi from router.'
						: 'This will disable <wh>Access Point</wh>.';
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : message
						+'<br>Continue?'
			, cancel  : function() {
				$( '#wlan' ).prop( 'checked', 1 );
			}
			, ok      : function() {
				notify( 'Wi-Fi', false, 'wifi' );
				bash( [ 'wlan', false ] );
			}
		} );
	}
} );
$( '#i2smodulesw' ).click( function() {
	// delay to show switch sliding
	setTimeout( function() {
		$( '#i2smodulesw' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' )
			.removeClass( 'hide' )
			.find( '.selectric' ).click();
	}, 200 );
} );
$( '#i2smodule' ).change( function() {
	var aplayname = $( this ).val();
	var output = $( this ).find( ':selected' ).text();
	if ( aplayname !== 'none' ) {
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' ).removeClass( 'hide' );
		rebootText( 1, 'Audio I&#178;S Module' );
		notify( 'Audio I&#178;S', 'Enable ...', 'volume' );
	} else {
		aplayname = 'onboard';
		output = '';
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
		rebootText( 0, 'Audio I&#178;S Module' );
		notify( 'I&#178;S Module', 'Disable ...', 'volume' );
	}
	bash( [ 'i2smodule', aplayname, output, G.reboot.join( '\n' ) ] );
} );
$( '#gpioimgtxt' ).click( function() {
	if ( $( '#gpiopin' ).is( ':hidden' ) && $( '#gpiopin1' ).is( ':hidden' ) ) {
		$( '#gpiopin' ).slideToggle();
		$( '#fliptxt, #close-img' ).toggle();
		$( this ).find( 'i' ).toggleClass( 'fa-chevron-down fa-chevron-up' )
	} else {
		$( '#gpiopin, #gpiopin1' ).css( 'display', 'none' );
		$( '#fliptxt' ).hide();
		$( this ).find( 'i' )
			.removeAttr( 'class' )
			.addClass( 'fa fa-chevron-down' );
	}
} );
$( '#gpiopin, #gpiopin1' ).click( function() {
	$( '#gpiopin, #gpiopin1' ).toggle();
} );
var infolcdchar = heredoc( function() { /*
	<div class="infotextlabel">
		<a class="infolabel">Size</a>
		<a class="infolabel">&emsp;Character Map</a>
		<a class="infolabel">Interface</a>
		<div class="i2c">
			<a class="infolabel">Address</a>
			<a class="infolabel">I&#178;C Chip</a>
		</div>
		<div class="gpio">
			<a class="infolabel">pin_rs</a>
			<a class="infolabel">pin_rw</a>
			<a class="infolabel">pin_e</a>
			<a class="infolabel">pins_data</a>
		</div>
	</div>
	<div class="infotextbox lcdradio">
		<div id="cols" class="infocontent infohtml lcd">
			<label><input type="radio" name="size" value="16"> 16x2</label>
			<label><input type="radio" name="size" value="20"> 20x4</label>
			<label><input type="radio" name="size" value="40"> 40x4</label>
		</div>
		<div id="charmap" class="infocontent infohtml lcd">
			<label><input type="radio" name="charmap" value="A00"> A00</label>
			<label><input type="radio" name="charmap" value="A02"> A02</label>
		</div>
		<div id="inf" class="infocontent infohtml lcd">
			<label><input type="radio" name="interface" value="i2c"> I&#178;C</label>
			<label><input type="radio" name="interface" value="gpio"> GPIO</label>
		</div>
		<div class="i2c">
			<div id="address" class="infocontent infohtml lcd">
			</div>
			<select id="chip" class="infocontent infohtml">
				<option value="PCF8574"> PCF8574</option>
				<option value="MCP23008"> MCP23008</option>
				<option value="MCP23017"> MCP23017</option>
			</select>
		</div>
		<div class="gpio">
			<input type="text" id="pin_rs" class="infoinput infocontent infohtml">
			<input type="text" id="pin_rw" class="infoinput infocontent infohtml">
			<input type="text" id="pin_e" class="infoinput infocontent infohtml">
			<input type="text" id="pins_data" class="infoinput infocontent infohtml">
		</div>
		<label><input id="backlightoff" type="checkbox"> Backlight off <gr>(stop 1 m.)</gr></label>
	</div>
*/ } );
$( '#setting-lcdchar' ).click( function() {
	var lcdcharconf;
	info( {
		  icon          : 'lcdchar'
		, title         : 'Character LCD'
		, content       : infolcdchar
		, boxwidth      : 180
		, nofocus       : 1
		, preshow       : function() {
			var val;
			function optHtml() {
				var lcdcharaddr = G.lcdcharaddr || '27 3F';
				var addr = lcdcharaddr.split( ' ' );
				var opt = '';
				addr.forEach( function( el ) {
					opt += '<label><input type="radio" name="address" value="0x'+ el +'"> 0x'+ el +'</label>';
				} );
				$( '#address' ).html( opt );
			}
			function setValues( inf, val ) {
				if ( !val ) val = inf === 'i2c' ? '20 A00 0x27 PCF8574' : '20 A00 15 18 16 21,22,23,24';
				var v = val.split( ' ' );
				if ( v.length < 6 ) { // i2c
					var cols = v[ 0 ];
					var charmap = v[ 1 ];
					var i2caddress = v[ 2 ];
					var i2cchip = v[ 3 ];
					var backlightoff = v[ 4 ] === 'True';
					optHtml();
					$( '#inf input' ).val( [ 'i2c' ] );
					$( '#address input' ).val( [ i2caddress ] );
					$( '#chip input' ).val( [ i2cchip ] );
					$( '.i2c' ).removeClass( 'hide' );
					$( '.gpio' ).addClass( 'hide' );
				} else {
					var cols = v[ 0 ];
					var charmap = v[ 1 ];
					var pin_rs = v[ 2 ];
					var pin_rw = v[ 3 ];
					var pin_e = v[ 4 ];
					var pins_data = v[ 5 ];
					var backlightoff = v[ 6 ] === 'True';
					$( '#inf input' ).val( [ 'gpio' ] );
					$( '#pin_rs' ).val( pin_rs );
					$( '#pin_rw' ).val( pin_rw );
					$( '#pin_e' ).val( pin_e );
					$( '#pins_data' ).val( pins_data );
					$( '.i2c' ).addClass( 'hide' );
					$( '.gpio' ).removeClass( 'hide' );
				}
				$( '#cols input' ).val( [ cols ] );
				$( '#charmap input' ).val( [ charmap ] );
				$( '#backlightoff' ).prop( 'checked', backlightoff );
				$( '.lcdradio' ).width( 230 );
				$( '.lcd label' ).width( 75 );
			}
			var inf = !G.lcdcharconf ? 'i2c' : ( G.lcdcharconf.split( ' ' ).length < 6 ? 'i2c' : 'gpio' );
			if ( inf === 'i2c' ) optHtml();
			setValues( inf, G.lcdcharconf );
			$( '#inf' ).change( function() {
				var i = $( '#inf input:checked' ).val();
				$( '.i2c' ).toggleClass( 'hide', i === 'gpio' );
				$( '.gpio' ).toggleClass( 'hide', i === 'i2c' );
				var val = i === inf ? G.lcdcharconf : '';
				setValues( i, val );
			} );
			// verify changes
			if ( G.lcdchar ) $( '#infoOk' ).addClass( 'disabled' );
			$( '#cols, #inf, #charmap, #address, #chip, #backlightoff' ).change( function() {
				lcdcharconf = $( '#cols input:checked' ).val();
				lcdcharconf += ' '+ $( '#charmap input:checked' ).val();
				if ( $( '#inf input:checked' ).val() === 'i2c' ) {
					lcdcharconf += ' '+ $( '#address input:checked' ).val();
					lcdcharconf += ' '+ $( '#chip option:selected' ).val();
				}
				lcdcharconf += $( '#backlightoff' ).prop( 'checked' ) ? ' True' : '';
				if ( G.lcdchar ) $( '#infoOk' ).toggleClass( 'disabled', lcdcharconf === G.lcdcharconf );
			} );
			$( '.gpio input' ).keyup( function() {
				var i = $( this ).index();
				var $this = $( this );
				var val = $this.val();
				if ( i < 3 ) {
					$this.val( val.replace( /[^0-9]/, '' ) );
					var count = true
				} else {
					$this.val( val.replace( /[^0-9,]/, '' ) );
					var count = val.split( ',' ).length === 4;
				}
				lcdcharconf = $( '#cols input:checked' ).val();
				lcdcharconf += ' '+ $( '#charmap input:checked' ).val();
				for ( i = 0; i < 4; i++ ) lcdcharconf += ' '+ $( '.gpio input' ).eq( i ).val();
				if ( G.lcdchar ) $( '#infoOk' ).toggleClass( 'disabled', !val || lcdcharconf === G.lcdcharconf || !count );
			} );
		}
		, buttonwidth   : 1
		, cancel        : function() {
			$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		}
		, buttonlabel   : [ '<i class="fa fa-plus-r"></i>Logo', '<i class="fa fa-power"></i>Off' ]
		, buttoncolor   : [ '#448822', red ]
		, button        : !G.lcdchar ? '' : [ 
			  function() { bash( '/srv/http/bash/lcdchar.py' ) }
			, function() { bash( '/srv/http/bash/lcdchar.py off' ) }
		]
		, buttonnoreset : 1
		, ok            : function() {
			if ( $( '#inf input:checked' ).val() === 'i2c' ) {
				if ( !lcdcharconf ) lcdcharconf = '20 A00 0x27 PCF8574';
				rebootText( 1, 'Character LCD' );
				bash( [ 'lcdcharset', lcdcharconf, G.reboot.join( '\n' ) ] );
			} else {
				if ( !lcdcharconf ) lcdcharconf = '20 A00 15 18 16 21,22,23,24';
				bash( [ 'lcdchargpioset', lcdcharconf ] );
			}
			notify( 'Character LCD', G.lcdchar ? 'Change ...' : 'Enabled ...', 'lcdchar' );
		}
	} );
} );
$( '#setting-powerbutton' ).click( function() {
	var pins = [ 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 32, 33, 35, 36, 37, 38, 40 ];
	if ( G.relayspins ) {
		pins = pins.filter( function( i ) {
			return G.relayspins.indexOf( i ) === -1;
		} );
	}
	var optionpin = '';
	pins.forEach( function( p ) { 
		optionpin += '<option value='+ p +'>'+ p +'</option>';
	} );
var infopowerbutton = heredoc( function() { /*
	GPIO pins <gr>(J8 numbering)</gr>:<br>
	<div class="infotextlabel">
		<a class="infolabel">On <gr>(fixed)</gr></a>
		<a class="infolabel">Off</a>
		<a class="infolabel">LED</a>
	</div>
	<div class="infotextbox lcdradio">
		<select id="onpin" disabled><option value="5">5</option></select>
		<select id="swpin"></select>
		<select id="ledpin"></select>
	</div>
*/ } );
	info( {
		  icon     : 'power'
		, title    : 'Power Button'
		, content  : infopowerbutton
		, boxwidth : 80
		, preshow  : function() {
			var val = G.powerbuttonconf.split( ' ' );
			var swpin = val[ 0 ];
			var ledpin = val[ 1 ];
			$( '#swpin, #ledpin' ).html( optionpin );
			$( '#swpin' ).val( swpin );
			$( '#ledpin' ).val( ledpin );
			// verify changes
			if ( G.powerbutton ) $( '#infoOk' ).addClass( 'disabled' );
			$( '#swpin, #ledpin' ).change( function() {
				var swset = $( '#swpin' ).val();
				var ledset = $( '#ledpin' ).val();
				$( '#infoOk' ).toggleClass( 'disabled', ( swset === swpin && ledset === ledpin ) || swset === ledset );
			} );
		}
		, cancel        : function() {
			$( '#powerbutton' ).prop( 'checked', G.powerbutton );
		}
		, ok       : function() {
			notify( 'Power Button', 'Change ...', 'power' );
			bash( [ 'powerbuttonset', $( '#swpin' ).val(), $( '#ledpin' ).val() ] );
		}
	} );
} );
$( '#setting-relays' ).click( function() {
	location.href = '/settings/relays.php';
} );
$( '#setting-lcd' ).click( function() {
	info( {
		  icon    : 'lcd'
		, title   : 'TFT LCD'
		, message : 'Calibrate touchscreen?'
						+'<br>(Get stylus ready.)'
		, oklabel : 'Start'
		, ok      : function() {
			notify( 'Calibrate Touchscreen', 'Start ...', 'lcd' );
			bash( [ 'lcdcalibrate' ] );
		}
	} );
} );
$( '#hostname' ).on( 'mousedown touchdown', function() {
	info( {
		  icon      : 'plus-r'
		, title     : 'Player Name'
		, textlabel : 'Name'
		, textvalue : G.hostname
		, preshow   : function() {
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoTextBox' ).keyup( function() {
				$( '#infoTextBox' ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
				$( '#infoOk' ).toggleClass( 'disabled', $( '#infoTextBox' ).val() === G.hostname );
			} );
		}
		, ok        : function() {
			notify( 'Name', 'Change ...', 'plus-r' );
			bash( [ 'hostname', $( '#infoTextBox' ).val() ] );
		}
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'Timezone', 'Change ...', 'globe' );
	bash( [ 'timezone', $( this ).val() ] );
} );
$( '#setting-regional' ).click( function() {
	info( {
		  icon      : 'globe'
		, title     : 'Regional Settings'
		, textlabel : [ 'NTP server', 'Regulatory domain' ]
		, textvalue : [ G.ntp, G.regdom || '00' ]
		, boxwidth  : 200
		, footer    : '<px70/><px60/>00 - common for all regions'
		, preshow   : function() {
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoTextBox, #infoTextBox1' ).keyup( function() {
				var changed = $( '#infoTextBox' ).val() !== G.ntp || $( '#infoTextBox1' ).val() !== G.regdom;
				$( '#infoOk' ).toggleClass( 'disabled', !changed );
			} );
		}
		, ok        : function() {
			var ntp = $( '#infoTextBox' ).val();
			var regdom = $( '#infoTextBox1' ).val();
			G.ntp = ntp;
			G.regdom = regdom;
			notify( 'Regional Settings', 'Change ...', 'globe' );
			bash( [ 'regional', ntp, regdom ] );
		}
	} );
} );
$( '#setting-soundprofile' ).click( function() {
	var textlabel = [
		  'kernel.sched_latency_ns <gr>(ns)</gr>'
		, 'vm.swappiness'
		, 'eth0 mtu <gr>(byte)</gr>'
		, 'eth0 txqueuelen'
	];
	var textvalue = G.soundprofileval.split( ' ' );
	if ( G.rpi01 ) {
		var lat = [ 1500000, 850000, 500000, 120000, 500000, 145655, 6000000, 1500000 ];
	} else {
		var lat = [ 4500000, 3500075, 1000000, 2000000, 3700000, 145655, 6000000, 1500000 ];
	}
	if ( textvalue.length > 2 ) {
		var defaultval = '18000000 60 1500 1000';
		var radio = {
			  _Default  : defaultval
			, RuneAudio : lat[ 0 ] +' 0 1500 1000'
			, _ACX      : lat[ 1 ] +' 0 1500 4000'
			, Orion     : lat[ 2 ] +' 20 1000 4000'
			, _OrionV2  : lat[ 3 ] +' 0 1000 4000'
			, OrionV3   : lat[ 4 ] +' 0 1000 4000'
			, _OrionV4  : lat[ 5 ] +' 60 1000 4000'
			, Um3ggh1U  : lat[ 6 ] +' 0 1500 1000'
		}
		var radioval = Object.values( radio );
		radio._Custom   = radioval.indexOf( G.soundprofileval ) === -1 ? G.soundprofileval : 0;
	} else {
		textlabel = textlabel.slice( 0, 2 );
		var defaultval = '18000000 60';
		var radio = {
			  _Default  : defaultval
			, RuneAudio : lat[ 0 ] +' 0'
			, _ACX      : lat[ 1 ] +' 0'
			, Orion     : lat[ 2 ] +' 20'
			, _OrionV2  : lat[ 3 ] +' 0 '
			, OrionV3   : lat[ 4 ] +' 0'
			, _OrionV4  : lat[ 5 ] +' 60'
			, Um3ggh1U  : lat[ 6 ] +' 0'
		}
		var radioval = Object.values( radio );
		radio._Custom   = radioval.indexOf( G.soundprofileval ) === -1 ? G.soundprofileval : 0;
	}
	var iL = textlabel.length;
	info( {
		  icon      : 'sliders'
		, title     : 'Kernel Sound Profile'
		, textlabel : textlabel
		, textvalue : textvalue
		, boxwidth  : 110
		, radio     : radio
		, checked   : G.soundprofileval
		, preshow   : function() {
			$( '#infoRadio input' ).last().prop( 'disabled', radio._Custom === 0 );
			// verify changes + interactive values
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoRadio' ).change( function() {
				var soundprofileval = $( '#infoRadio input:checked' ).val();
				var val = soundprofileval.split( ' ' );
				for ( i = 0; i < iL; i++ ) $( '.infoinput' ).eq( i ).val( val[ i ] );
				$( '#infoOk' ).toggleClass( 'disabled', soundprofileval === G.soundprofileval );
				
			} );
			$( '.infoinput' ).keyup( function() {
				var soundprofileval = $( '#infoTextBox' ).val();
				for ( i = 1; i < iL; i++ ) soundprofileval += ' '+ $( '#infoTextBox'+ i ).val();
				$( '#infoRadio input' ).val( [ textvalue.indexOf( soundprofileval ) !== -1 ? soundprofileval : G.soundprofileval ] );
				$( '#infoOk' ).toggleClass( 'disabled', soundprofileval === G.soundprofileval );
				$( '#infoRadio input' ).last().prop( 'checked', radioval.indexOf( soundprofileval ) === -1 );
			} );
		}
		, cancel    : function() {
			$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		}
		, ok        : function() {
			var soundprofileval = $( '#infoTextBox' ).val();
			for ( i = 1; i < iL; i++ ) soundprofileval += ' '+ $( '#infoTextBox'+ i ).val();
			var custom = radioval.indexOf( soundprofileval ) !== -1 ? false : true;
			bash( [ 'soundprofileset', soundprofileval ] );
			var action = !G.soundprofile ? 'Enabled ...' : ( soundprofileval !== defaultval ? 'Change ...' : 'Default ...' );
			notify( 'Kernel Sound Profile', action, 'volume' );
		}
	} );
} );
$( '#backup' ).click( function() {
	bash( 'ls -p /etc/netctl | grep -v /', function( data ) {
		if ( !data ) {
			dataBackup();
		} else {
			var netctl = data.slice( 0, -1 ).split( '\n' );
			var radio = { 'None': '' }
			netctl.forEach( function( el ) {
				radio[ el ] = el;
			} );
			info( {
				  icon    : 'sd'
				, title   : 'Backup Settings'
				, message : 'Select Wi-Fi connection to backup:'
				, radio   : radio 
				, oklabel : 'Backup'
				, ok      : function() {
					dataBackup( $( '#infoRadio input:checked' ).val() )
				}
			} );
		}
	} );
	$( '#backup' ).prop( 'checked', 0 );
} );
$( '#restore' ).click( function() {
	var icon = 'sd-restore';
	info( {
		  icon        : icon
		, title       : 'Restore Settings'
		, message     : 'Restore from:'
		, radio       : {
			  'Backup file <code>*.gz</code>' : 'restore'
			, 'Reset to default'              : 'reset'
		}
		, checked     : 'restore'
		, fileoklabel : 'Restore'
		, filetype    : '.gz'
		, filefilter  : 1
		, preshow     : function() {
			$( '#infoRadio input' ).click( function() {
				if ( $( '#infoRadio input:checked' ).val() !== 'restore' ) {
					$( '#infoFilename' ).empty()
					$( '#infoFileBox' ).val( '' );
					$( '#infoFileLabel' ).addClass( 'hide infobtn-primary' );
					$( '#infoOk' ).removeClass( 'hide' );
				} else {
					$( '#infoOk' ).addClass( 'hide' );
					$( '#infoFileLabel' ).removeClass( 'hide' );
				}
			} );
		}
		, ok          : function() {
			notify( 'Restore Settings', 'Restore ...', 'sd' );
			var checked = $( '#infoRadio input:checked' ).val();
			if ( checked === 'reset' ) {
				bash( '/srv/http/bash/datareset.sh', bannerHide );
			} else {
				var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
				var formData = new FormData();
				formData.append( 'cmd', 'datarestore' );
				formData.append( 'file', file );
				$.ajax( {
					  url         : 'cmd.php'
					, type        : 'POST'
					, data        : formData
					, processData : false  // no - process the data
					, contentType : false  // no - contentType
					, success     : function( data ) {
						if ( data == -1 ) {
							info( {
								  icon    : icon
								, title   : 'Restore Settings'
								, message : 'File upload failed.'
							} );
							bannerHide();
							loader( 'hide' );
						}
					}
				} );
			}
			setTimeout( loader, 0 );
		}
	} );
	$( '#restore' ).prop( 'checked', 0 );
} );
$( '#pkg' ).click( function() {
	if ( $( '#pkglist' ).hasClass( 'hide' ) ) {
		$( '#pkg i' )
			.removeClass( 'fa-chevron-down' )
			.addClass( 'fa-chevron-up' );
		if ( $( '#pkglist' ).html() ) {
			$( '#pkglist' ).removeClass( 'hide' );
		} else {
			bash( 'pacman -Qq', function( list ) {
				var list = list.split( '\n' );
				pkghtml = '';
				list.forEach( function( pkg ) {
					pkghtml += '<br><bl>'+ pkg +'</bl>';
				} );
				$( '#pkglist' )
					.html( pkghtml )
					.removeClass( 'hide' );
			} );
		}
	} else {
		$( '#pkg i' )
			.removeClass( 'fa-chevron-up' )
			.addClass( 'fa-chevron-down' );
		$( '#pkglist' ).addClass( 'hide' );
	}
} );
var custompkg = [ 'bluez-alsa-git', 'hfsprogs', 'matchbox-window-manager', 'mpdscribble', 'snapcast', 'upmpdcli' ];
$( '#pkglist' ).on( 'click', 'bl', function() {
	loader();
	var pkg = $( this ).text()
				.replace( 'bluez-alsa', 'bluez-alsa-git' )
				.replace( '-pushstream', '' );
	bash( [ 'packagehref', pkg ], function( href ) {
		loader( 'hide' );
		window.open( href );
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
