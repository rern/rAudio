$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var gpiosvg = $( '#gpiosvg' ).html().replace( 'width="380px', 'width="330px' );;
var pin2gpio = {
	   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
	, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
}
$( '.enable' ).click( function() {
	var idname = {
		  bluetooth    : 'Bluetooth'
		, lcd          : 'TFT LCD'
		, lcdchar      : 'Character LCD'
		, mpdoled      : 'Spectrum OLED'
		, powerbutton  : 'Power Button'
		, soundprofile : 'Kernel Sound Profile'
		, vuled        : 'VU LED'
		, wlan         : 'Wi-Fi'
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
		  onboardaudio : 'On-board Audio'
		, relays       : 'GPIO Relay'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, id );
	bash( [ id, checked, checked, ( id !== 'relays' ? idname[ id ] : '' ) ] );
} );
$( '.img' ).click( function() {
	var name = $( this ).data( 'name' );
	var txtlcdchar = `\
<p><code>GND:(any black pin)</code>
<wh>I²C:</wh> <code>VCC:1</code> <code>SDA:3</code> <code>SCL:5</code> <code>5V:4</code>
<wh>GPIO:</wh> <code>VCC:4</code> <code>RS:15</code> <code>RW:18</code> <code>E:16</code> <code>D4-7:21-24</code></p>`;
	var txtmpdoled = `\
<p><code>GND:(any black pin)</code> <code>VCC:1</code>
<wh>I²C:</wh> <code>SCL:5</code> <code>SDA:3</code>
<wh>SPI:</wh> <code>CLK:23</code> <code>MOS:19</code> <code>RES:22</code> <code>DC:18</code> <code>CS:24</code></p>`;
	var title = {
		  i2cbackpack : [ 'Character LCD', '', 'lcdchar' ]
		, lcdchar     : [ 'Character LCD', txtlcdchar ]
		, relays      : [ 'Relays Module' ]
		, lcd         : [ 'TFT 3.5" LCD' ]
		, mpdoled     : [ 'Spectrum OLED', txtmpdoled ]
		, powerbutton : [ 'Power Button',  '', 'power', '300px', 'svg' ]
		, vuled       : [ 'VU LED',        '', 'led', '300px', 'svg' ]
	}
	var d = title[ name ];
	info( {
		  icon        : d[ 2 ] || name
		, title       : d[ 0 ]
		, message     : '<img src="/assets/img/'+ name +'.'+ Math.ceil( Date.now() / 1000 ) +'.'+ (d[ 4 ] || 'jpg' )
						+'" style="height: '+ ( d[ 3 ] || '100%' ) +'; margin-bottom: 0;">'
		, footer      : d[ 1 ] ? '<br>'+ gpiosvg + d[ 1 ] : ''
		, footeralign : 'left'
		, beforeshow  : function() {
			$( '.'+ name +'-no' ).addClass( 'hide' );
		}
		, okno        : 1
	} );
} );
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
	if ( $this.hasClass( 'blink' ) ) {
		clearInterval( intervalcputime );
		bannerHide();
		$this.removeClass( 'blink' );
	} else {
		$this.addClass( 'blink' );
		intervalcputime = setInterval( function() {
			bash( '/srv/http/bash/system-data.sh status', function( status ) {
				$.each( status, function( key, val ) {
					G[ key ] = val;
				} );
				renderStatus();
			}, 'json' );
		}, 10000 );
	}
} );
$( '#status' ).on( 'click', '.undervoltage', function() {
	if ( $( '#codeundervoltage' ).is( ':empty' ) ) {
		bash( 'journalctl -b | grep "Under-voltage detected"', function( log ) {
			$( '#codeundervoltage' )
				.html( "# journalctl -b | grep 'Under-voltage detected'\n\n"+ log )
				.removeClass( 'hide' );
		} );
	} else {
		$( '#codeundervoltage' ).toggleClass( 'hide' );
	}
} );
$( '#addnas' ).click( function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function() {
	var $this = $( this );
	var mountpoint = $this.find( '.mountpoint' ).text();
	if ( mountpoint === '/' ) return
	
	if ( mountpoint.slice( 9, 12 ) === 'NAS' ) {
		var icon = 'networks';
		var title = 'Network Mount';
	} else {
		var icon = 'usbdrive';
		var title = 'Local Mount';
	}
	var source = $this.find( '.source' ).text();
	if ( !$this.data( 'unmounted' ) ) {
		info( {
			  icon    : icon
			, title   : title
			, message : '<wh>'+ mountpoint +'</wh>'
			, oklabel : 'Unmount'
			, okcolor : orange
			, ok      : function() {
				notify( title, 'Unmount ...', icon )
				bash( [ 'unmount', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	} else { // remove / remount
		info( {
			  icon        : icon
			, title       : title
			, message     : '<wh>'+ mountpoint +'</wh>'
			, buttonlabel : 'Remove'
			, buttoncolor : red
			, button      : function() {
				notify( title, 'Remove ...', icon );
				bash( [ 'remove', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
			, oklabel     : 'Remount'
			, ok          : function() {
				notify( title, 'Remount ...', icon );
				bash( [ 'remount', mountpoint, source ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	}
} );
$( '#setting-bluetooth' ).click( function() {
	info( {
		  icon         : 'bluetooth'
		, title        : 'Bluetooth'
		, checkbox     : [ 'Discoverable <gr>by senders</gr>', 'Sampling 16bit 44.1kHz <gr>to receivers</gr>' ]
		, values       : G.bluetoothconf
		, checkchanged : ( G.bluetooth ? 1 : 0 )
		, cancel       : function() {
			$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		}
		, ok           : function() {
			notify( 'Bluetooth', G.bluetooth ? 'Change ...' : 'Enable ...', 'bluetooth' );
			bash( [ 'bluetoothset', ...infoVal() ] );
		}
	} );
} );
$( '#setting-wlan' ).click( function() {
	bash( 'cat /srv/http/settings/regdomcodes.json', function( list ) {
		var options = '';
		$.each( list, function( k, v ) {
			options += '<option value="'+ k +'">'+ v +'</option>';
		} );
		var infowifi = `\
<table>
<tr><td style="padding-right: 5px; text-align: right;">Country</td><td><select>${ options }</select></td></tr>
<tr><td></td><td><label><input type="checkbox"></label>Auto start Access Point</td></tr>
</table>`;
		info( {
			  icon         : 'wifi'
			, title        : 'Wi-Fi'
			, content      : infowifi
			, boxwidth     : 250
			, values       : G.wlanconf
			, checkchanged : ( G.wlan ? 1 : 0 )
			, cancel       : function() {
				$( '#wlan' ).prop( 'checked', G.wlan );
			}
			, ok           : function() {
				notify( 'Wi-Fi', G.wlan ? 'Change ...' : 'Enable ...', 'wifi' );
				bash( [ 'wlanset', ...infoVal() ] );
			}
		} );
	}, 'json' );
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
		notify( 'Audio I&#178;S', 'Enable ...', 'volume' );
	} else {
		aplayname = 'onboard';
		output = '';
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
		notify( 'I&#178;S Module', 'Disable ...', 'volume' );
	}
	bash( [ 'i2smodule', aplayname, output ] );
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
var infolcdchar = `\
<table>
<tr id="cols"><td width="135">Size</td>
	<td width="80"><label><input type="radio" name="cols" value="20">20x4</label></td>
	<td width="80"><label><input type="radio" name="cols" value="16">16x2</label></td>
</tr>
<tr><td>Char<wide>acter</wide> Map</td>
	<td><label><input type="radio" name="charmap" value="A00">A00</label></td>
	<td><label><input type="radio" name="charmap" value="A02">A02</label></td>
</tr>
<tr><td>Interface</td>
	<td><label><input type="radio" name="inf" value="i2c">I&#178;C</label></td>
	<td><label><input type="radio" name="inf" value="gpio">GPIO</label></td>
</tr>
<tr id="i2caddress" class="i2c">ADDR</tr>
<tr class="i2c"><td>I&#178;C Chip</td>
	<td colspan="2">
	<select id="i2cchip">
		<option value="PCF8574">PCF8574</option>
		<option value="MCP23008">MCP23008</option>
		<option value="MCP23017">MCP23017</option>
	</select>
	</td>
</tr>
</table>
<table class="gpio">
<tr><td class="gpiosvg" colspan="8" style="padding-top: 10px;"></td></tr>
<tr><td>RS</td><td>PINS</td><td>RW</td><td>PINS</td><td>E</td><td>PINS</td><td></td><td></td></tr>
<tr><td>D4</td><td>PINS</td><td>D5</td><td>PINS</td><td>D6</td><td>PINS</td><td>D7</td><td>PINS</td></tr>
</table>
<table>
<tr><td width="80"></td><td><label><input id="backlight" type="checkbox">Sleep <gr>(60s)</gr></label></td></tr>
</table>`;
$( '#setting-lcdchar' ).click( function() {
	// cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight
	var i2c = G.lcdcharconf[ 2 ] === 'i2c';
	var radioaddr = '<td>Address</td>';
	G.lcdcharaddr.split( ' ' ).forEach( function( el ) {
		radioaddr += '<td><label><input type="radio" name="address" value="'+ el +'">'+ el +'</label></td>';
	} );
	var optpins = '<select>';
	$.each( pin2gpio, function( k, v ) {
		optpins += '<option value='+ k +'>'+ k +'</option>';
	} );
	optpins += '</select>';
	infolcdchar = infolcdchar
					.replace( 'ADDR', radioaddr )
					.replace( /PINS/g, optpins );
	info( {
		  icon          : 'lcdchar'
		, title         : 'Character LCD'
		, content       : infolcdchar
		, values        : G.lcdcharconf
		, checkchanged  : ( G.lcdchar ? 1 : 0 )
		, beforeshow    : function() {
			$( '#infoContent .gpio td:even' ).css( 'width', '60px' );
			$( '#infoContent .gpio td:odd' ).css( {
				  width           : '25px'
				, 'padding-right' : '1px'
				, 'text-align'    : 'right'
			} );
			$( '.gpio, .gpio .selectric-wrapper' ).css( 'font-family', 'Inconsolata' );
			$( '#infoContent .gpiosvg' )
				.css( 'text-align', 'right' )
				.html( gpiosvg );
			$( '.gpiosvg .power' ).remove();
			$( '.i2c' ).toggleClass( 'hide', !i2c );
			$( '.gpio' ).toggleClass( 'hide', i2c );
			$( '#infoContent input[name=inf]' ).change( function() {
				i2c = $( '#infoContent input[name=inf]:checked' ).val() === 'i2c';
				$( '.i2c' ).toggleClass( 'hide', !i2c );
				$( '.gpio' ).toggleClass( 'hide', i2c );
			} );
		}
		, cancel        : function() {
			$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		}
		, buttonlabel   : [ '<i class="fa fa-plus-r"></i>Logo', '<i class="fa fa-screenoff"></i>Sleep' ]
		, buttoncolor   : [ '', orange ]
		, button        : !G.lcdchar ? '' : [ 
			  function() { bash( '/srv/http/bash/lcdchar.py' ) }
			, function() { bash( '/srv/http/bash/lcdchar.py off' ) }
		]
		, buttonnoreset : 1
		, ok            : function() {
			bash( [ 'lcdcharset', ...infoVal() ] );
			notify( 'Character LCD', G.lcdchar ? 'Change ...' : 'Enabled ...', 'lcdchar' );
		}
	} );
} );
$( '#setting-powerbutton' ).click( function() {
	var offpin = '';
	var ledpin = '';
	var respin = '';
	$.each( pin2gpio, function( k, v ) {
		offpin += '<option value='+ k +'>'+ k +'</option>';
		if ( k != 5 ) {
			ledpin += '<option value='+ k +'>'+ k +'</option>';
			respin += '<option value='+ v +'>'+ k +'</option>';
		}
	} );
	var infopowerbutton = `\
<table>
<tr><td width="70">On</td>
	<td><input type="text" disabled></td>
</tr>
<tr><td>Off</td>
	<td><select >${ offpin }</select></td>
</tr>
<tr><td>LED</td>
	<td><select >${ ledpin }</select></td>
</tr>
<tr class="reserved hide"><td>Reserved</td>
	<td><select >${ respin }</select></td>
</tr>
</table>`;
	info( {
		  icon         : 'power'
		, title        : 'Power Button'
		, content      : gpiosvg + infopowerbutton
		, boxwidth     : 60
		, values       : [ 5, ...G.powerbuttonconf ]
		, checkchanged : ( G.powerbutton ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent .reserved' ).toggleClass( 'hide', G.powerbuttonconf[ 0 ] == 5 );
			$( '#infoContent select:eq( 0 )' ).change( function() {
				$( '#infoContent .reserved' ).toggleClass( 'hide', $( this ).val() == 5 );
			} );
		}
		, cancel       : function() {
			$( '#powerbutton' ).prop( 'checked', G.powerbutton );
		}
		, ok           : function() {
			bash( [ 'powerbuttonset', ...infoVal().slice( 1 ) ] );
			notify( 'Power Button', G.powerbutton ? 'Change ...' : 'Enable ...', 'power' );
		}
	} );
} );
$( '#setting-relays' ).click( function() {
	location.href = 'settings.php?p=relays';
} );
$( '#setting-mpdoled' ).click( function() {
	info( {
		  icon         : 'mpdoled'
		, title        : 'Spectrum OLED'
		, selectlabel  : 'Type'
		, select        : {
			  'Adafruit SPI'      : 1
			, 'Adafruit I&#178;C' : 3
			, 'Seeed I&#178;C'    : 4
			, 'SH1106 I&#178;C'   : 6
			, 'SH1106 SPI'        : 7
		}
		, values       : G.mpdoledconf
		, checkchanged : ( G.mpdoled ? 1 : 0 )
		, boxwidth     : 140
		, buttonlabel   : '<i class="fa fa-plus-r"></i>Logo'
		, button        : !G.mpdoled ? '' : function() {
			bash( '/srv/http/bash/cmd.sh mpdoledlogo' );
		}
		, ok           : function() {
			notify( 'Spectrum OLED', G.mpdoled ? 'Change ...' : 'Enable ...', 'mpdoled' );
			bash( [ 'mpdoledset', infoVal() ] );
		}
	} );
} );
$( '#setting-lcd' ).click( function() {
	info( {
		  icon         : 'lcd'
		, title        : 'TFT 3.5" LCD'
		, selectlabel  : 'Type'
		, select       : {
			  'Generic'               : 'tft35a'
			, 'Waveshare (A)'         : 'waveshare35a'
			, 'Waveshare (B)'         : 'waveshare35b'
			, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
			, 'Waveshare (C)'         : 'waveshare35c'
		}
		, values       : G.lcdmodel
		, checkchanged : ( G.lcd ? 1 : 0 )
		, boxwidth     : 190
		, buttonlabel  : ( !G.lcd ? '' : 'Calibrate' )
		, button       : ( !G.lcd ? '' : function() {
			info( {
				  icon    : 'lcd'
				, title   : 'TFT LCD'
				, message : 'Calibrate touchscreen?'
							+'<br>(Get stylus ready.)'
				, ok      : function() {
					notify( 'Calibrate Touchscreen', 'Start ...', 'lcd' );
					bash( [ 'lcdcalibrate' ] );
				}
			} );
		} )
		, cancel    : function() {
			$( '#lcd' ).prop( 'checked', G.lcd );
		}
		, ok           : function() {
			notify( 'TFT 3.5" LCD', G.lcd ? 'Change ...' : 'Enable ...', 'lcd' );
			bash( [ 'lcdset', infoVal() ] );
		}
	} );
} );
$( '#setting-vuled' ).click( function() {
	var opt = '';
	$.each( pin2gpio, function( k, v ) {
		opt += '<option value="'+ v +'">'+ k +'</option>';
	} );
	var htmlpins = '';
	for ( i = 1; i < 8; i++ ) {
		htmlpins += '<tr><td>'+ i +'/7</td><td><select>'+ opt +'</select></td></tr>';
	}
	info( {
		  icon         : 'led'
		, title        : 'VU LED'
		, message      : gpiosvg
		, select       : htmlpins
		, values       : G.vuledconf
		, boxwidth     : 60
		, beforeshow   : function() {
			$( '#infoOk' ).toggleClass( 'disabled', G.vuled );
			$( '#infoContent select' ).on( 'change', function() {
				var v = infoVal();
				var changed = G.vuled && v.join( ' ' ) === G.vuledconf.join( ' ' );
				var duplicate = new Set( v ).size !== v.length;
				$( '#infoOk' ).toggleClass( 'disabled', changed || duplicate );
				if ( duplicate ) banner( 'VU LED', 'Duplicate pins', 'led' );
			} );
		}
		, cancel        : function() {
			$( '#vuled' ).prop( 'checked', G.vuled );
		}
		, ok           : function() {
			notify( 'VU LED', 'Change ...', 'led' );
			bash( [ 'vuledset', ...infoVal() ] );
		}
	} );
} );
$( '#ledcalc' ).click( function() {
	info( {
		  icon       : 'led'
		, title      : 'LED Resister Calculator'
		, textlabel  : [ 'GPIO <gr>(V)</gr>', 'Current <gr>(mA)</gr>', 'LED forward voltage <gr>(V)</gr>', 'Resister <gr>(&#8486;)</gr>' ]
		, values     : [ 3.3, 5 ]
		, boxwidth   : 70
		, beforeshow : function() {
			$( '#infoContent input' ).prop( 'disabled', 1 );
			$( '#infoContent input:eq( 2 )' )
				.prop( 'disabled', 0 )
				.keyup( function() {
					var fv = $( this ).val();
					if ( fv > 3.3 ) {
						var ohm = '( > 3.3V)';
					} else {
						var ohm = fv ? Math.round( ( 3.3 - fv ) / 0.005 ) : '';
					}
					$( '#infoContent input:eq( 3 )' ).val( ohm );
				} );
		}
		, okno       : 1
	} );
} );
$( '#hostname' ).on( 'mousedown touchdown', function() {
	info( {
		  icon         : 'plus-r'
		, title        : 'Player Name'
		, textlabel    : 'Name'
		, values       : G.hostname
		, checkblank   : 1
		, checkchanged : 1
		, beforeshow   : function() {
			$( '#infoContent input' ).keyup( function() {
				$( this ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
			} );
		}
		, ok           : function() {
			notify( 'Name', 'Change ...', 'plus-r' );
			bash( [ 'hostname', infoVal() ] );
		}
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'Timezone', 'Change ...', 'globe' );
	bash( [ 'timezone', $( this ).val() ] );
} );
$( '#setting-timezone' ).click( function() {
	info( {
		  icon         : 'globe'
		, title        : 'Network Time Protocol'
		, textlabel    : 'NTP server'
		, values       : G.ntp
		, checkchanged : 1
		, checkblank   : 1
		, ok           : function() {
			notify( 'NTP server', 'Change ...', 'globe' );
			bash( [ 'ntp', infoVal() ] );
		}
	} );
} );
$( '#setting-soundprofile' ).click( function() {
	var textlabel = [
		  'sched_latency_ns'
		, 'vm.swappiness'
		, 'eth0 mtu'
		, 'eth0 txqueuelen'
	];
	var radio = {
		  Default   : '18000000 60 1500 1000'
		, RuneAudio : '1500000 0 1500 1000'
		, ACX       : '850000 0 1500 4000'
		, Orion     : '500000 20 1000 4000'
		, OrionV2   : '120000 0 1000 4000'
		, OrionV3   : '1500000 0 1000 4000'
		, OrionV4   : '145655 60 1000 4000'
		, Um3ggh1U  : '500000 0 1500 1000'
		, Custom    : '0'
	}
	var soundprofileconf = G.soundprofileconf.join( ' ' );
	var radioval = Object.values( radio );
	var rchecked = radioval.indexOf( soundprofileconf ) !== -1 ? soundprofileconf : '0';
	G.soundprofileconf.push( rchecked );
	info( {
		  icon         : 'sliders'
		, title        : 'Kernel Sound Profile'
		, textlabel    : textlabel
		, boxwidth     : 110
		, radio        : radio
		, radiocolumn  : 1
		, values       : G.soundprofileconf
		, checkchanged : 1
		, checkblank   : 1
		, beforeshow   : function() {
			for ( i = 4; i < 9; i++ ) $( '#infoContent tr:eq( '+ i +') td:first-child' ).remove();
			var values, val;
			var $text = $( '#infoContent input:text' );
			var $radio = $( '#infoContent input:radio' );
			$radio.last().prop( 'disabled', true );
			$text.keyup( function() {
				values = infoVal().slice( 0, -1 ).join( ' ' );
				if ( radioval.indexOf( values ) === -1 ) values = 0;
				$radio.val( [ values ] );
			} );
			var iL = textlabel.length;
			$radio.change( function() {
				val = $( this ).val().split( ' ' );
				for ( i = 0; i < iL; i++ ) $text.eq( i ).val( val[ i ] );
			} );
		}
		, cancel       : function() {
			$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		}
		, ok           : function() {
			bash( [ 'soundprofileset', ...infoVal() ] );
			notify( 'Kernel Sound Profile', G.soundprofile ? 'Change ...' : 'Enable ...', 'volume' );
		}
	} );
} );
$( '#backup' ).click( function() {
	var backuptitle = 'Backup Settings';
	var icon = 'sd';
	notify( backuptitle, 'Process ...', 'sd blink' );
	bash( [ 'databackup' ], function( data ) {
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
	$( '#backup' ).prop( 'checked', 0 );
} );
$( '#restore' ).click( function() {
	var icon = 'restore';
	var title = 'Restore Settings';
	info( {
		  icon        : icon
		, title       : title
		, message     : 'Restore from:'
		, radio       : {
			  'Backup file <code>*.gz</code>' : 'restore'
			, 'Reset to default'              : 'reset'
		}
		, values      : 'restore'
		, fileoklabel : '<i class="fa fa-restore"></i>Restore'
		, filetype    : '.gz'
		, beforeshow  : function() {
			$( '#infoContent input' ).click( function() {
				if ( infoVal() !== 'restore' ) {
					$( '#infoFilename' ).addClass( 'hide' );
					$( '#infoFileBox' ).val( '' );
					$( '#infoFileLabel' ).addClass( 'hide infobtn-primary' );
					$( '#infoOk' )
						.html( '<i class="fa fa-reset"></i>Reset' )
						.css( 'background-color', orange )
						.removeClass( 'hide' );
				} else {
					$( '#infoOk' )
						.html( '<i class="fa fa-restore"></i>Restore' )
						.css( 'background-color', '' )
						.addClass( 'hide' );
					$( '#infoFileLabel' ).removeClass( 'hide' );
				}
			} );
		}
		, ok          : function() {
			notify( 'Restore Settings', 'Restore ...', 'sd' );
			if ( infoVal() === 'reset' ) {
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
								, title   : title
								, message : 'File upload failed.'
							} );
							bannerHide();
							loaderHide();
						}
					}
				} );
			}
			setTimeout( loader, 0 );
		}
	} );
	$( '#restore' ).prop( 'checked', 0 );
} );
$( '.listtitle' ).click( function() {
	var $this = $( this );
	var $chevron = $this.find( 'i' );
	var $list = $this.next();
	if ( $list.hasClass( 'hide' ) ) {
		$chevron
			.removeClass( 'fa-chevron-down' )
			.addClass( 'fa-chevron-up' );
		if ( $list.html() ) {
			$list.removeClass( 'hide' );
		} else {
			bash( 'pacman -Qq', function( list ) {
				var list = list.split( '\n' );
				pkghtml = '';
				list.forEach( function( pkg ) {
					pkghtml += '<bl>'+ pkg +'</bl><br>';
				} );
				$list
					.html( pkghtml.slice( 0, -4 ) )
					.removeClass( 'hide' );
			} );
		}
	} else {
		$chevron
			.removeClass( 'fa-chevron-up' )
			.addClass( 'fa-chevron-down' );
		$list.addClass( 'hide' );
	}
} );
$( '.list' ).on( 'click', 'bl', function() {
	if ( localhost ) return
	
	var pkg = $( this ).text();
	if ( [ 'alsaequal', 'audio_spectrum_oled', 'bluez-alsa', 'cava', 'hfsprogs', 'matchbox-window-manager'
			, 'mpdscribble', 'nginx-mainline-pushstream', 'snapcast', 'upmpdcli' ].indexOf( pkg ) !== -1 ) {
		if ( pkg === 'bluez-alsa' ) pkg = pkg.replace( 'bluez-alsa', 'bluez-alsa-git' );
		window.open( 'https://aur.archlinux.org/packages/'+ pkg );
	} else {
		window.open( 'https://archlinuxarm.org/packages/aarch64/'+ pkg );
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

var htmlmount = `\
<table id="tblinfomount">
<tr><td>Type</td>
	<td><label><input type="radio" name="inforadio" value="cifs" checked>CIFS</label>&emsp;
	<label><input type="radio" name="inforadio" value="nfs">NFS</label></td>
</tr>
<tr><td>Name</td>
	<td><input type="text"></td>
</tr>
<tr><td>IP</td>
	<td><input type="text"></td>
</tr>
<tr id="sharename"><td>Share name</td>
	<td><input type="text"></td>
</tr>
<tr class="guest"><td>User</td>
	<td><input type="text"></td>
</tr>
<tr class="guest"><td>Password</td>
	<td><input type="password" checked>&ensp;<i class="fa fa-eye fa-lg"></i></td>
</tr>
<tr><td>Options</td>
	<td><input type="text"></td>
</tr>
<tr><td></td>
	<td><label><input type="checkbox" checked>Update Library on mount</label></td>
</tr>
</table>`;
function infoMount( values ) {
	info( {
		  icon       : 'networks'
		, title      : 'Add Network Storage'
		, content    : htmlmount
		, values     : values
		, beforeshow : function() {
			$( '#infoContent td:eq( 0 )' ).css( 'width', '90px' );
			$( '#infoContent td:eq( 1 )' ).css( 'width', '267px' );
			var $sharelabel = $( '#sharename td:eq( 0 )' );
			var $share = $( '#sharename input' );
			var $guest = $( '.guest' );
			$( '#infoContent input:radio' ).change( function() {
				if ( $( this ).val() === 'nfs' ) {
					$sharelabel.text( 'Share path' );
					$guest.addClass( 'hide' );
					$share.val( '/'+ $share.val() );
				} else {
					$sharelabel.text( 'Share name' );
					$guest.removeClass( 'hide' );
					$share.val( $share.val().replace( /\//g, '' ) );
				}
			} );
		}
		, ok         : function() {
			// [ protocol, mountpoint, ip, directory, user, password, options, update ]
			bash( [ 'mount', ...infoVal() ], function( error ) {
				if ( error != 0 ) {
					info( {
						  icon    : 'networks'
						, title   : 'Mount Share'
						, message : error
						, ok      : function() {
							infoMount( values );
						}
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
			notify( 'Network Mount', 'Mount ...', 'networks' );
		}
	} );
}
function renderPage( list ) {
	if ( typeof list === 'string' ) { // on load, try catching any errors
		var list2G = list2JSON( list );
		if ( !list2G ) return
	} else {
		G = list;
	}
	var cpu = G.soccpu +' <gr>@</gr> ';
	cpu += G.socspeed < 1000 ? G.socspeed +'MHz' : G.socspeed / 1000 +'GHz';
	$( '#systemvalue' ).html(
		  'rAudio '+ G.version +' <gr>&bull; '+ G.versionui +'</gr>'
		+'<br>'+ G.kernel
		+'<br>'+ G.rpimodel.replace( /(Rev.*)$/, '<wide>$1</wide>' )
		+'<br>'+ G.soc + ' <gr>&bull;</gr> '+ G.socram
		+'<br>'+ cpu
	);
	renderStatus();
	$( '#throttled' ).toggleClass( 'hide', $( '#status .fa-warning' ).length === 0 );
	var html = '';
	$.each( G.list, function( i, val ) {
		if ( val.mounted ) {
			var dataunmounted = '';
			var dot = '<grn>&ensp;&bull;&ensp;</grn>';
		} else {
			var dataunmounted = ' data-unmounted="1"';
			var dot = '<red>&ensp;&bull;&ensp;</red>';
		}
		html += '<li '+ dataunmounted;
		html += '><i class="fa fa-'+ val.icon +'"></i><wh class="mountpoint">'+ val.mountpoint +'</wh>'+ dot
		html += '<gr class="source">'+ val.source +'</gr>';
		html +=  val.size ? '&ensp;'+ val.size +'</li>' : '</li>';
	} );
	$( '#list' ).html( html );
	if ( G.bluetooth ) {
		$( '#bluetooth' ).prop( 'checked', true );
		$( '#setting-bluetooth' ).toggleClass( 'hide', false );
		$( '#bt' )
			.removeAttr( 'class' )
			.addClass( 'col-l double status' )
			.html( '<a>Bluetooth<br><gr>bluetoothctl<i class="fa fa-status"></i></gr></a><i class="fa fa-bluetooth"></i>' );
	} else {
		$( '#bluetooth' ).prop( 'checked', false );
		$( '#setting-bluetooth' ).toggleClass( 'hide', true );
		$( '#bt' )
			.removeAttr( 'class' )
			.addClass( 'col-l single' )
			.html( 'Bluetooth<i class="fa fa-bluetooth"></i>' );
	}
	$( '#wlan' ).prop( 'checked', G.wlan );
	if ( G.wlan ) {
		$( '#wlan' ).prop( 'checked', true );
		$( '#setting-wlan' ).toggleClass( 'hide', false );
		$( '#wl' )
			.removeAttr( 'class' )
			.addClass( 'col-l double status' )
			.html( '<a>Wi-Fi<br><gr>iw<i class="fa fa-status"></i></gr></a><i class="fa fa-wifi"></i>' );
	} else {
		$( '#wlan' ).prop( 'checked', false );
		$( '#setting-wlan' ).toggleClass( 'hide', true );
		$( '#wl' )
			.removeAttr( 'class' )
			.addClass( 'col-l single' )
			.html( 'Wi-Fi<i class="fa fa-wifi"></i>' );
	}
	disableSwitch( '#wlan', G.hostapd || G.wlanconnected );
	$( '#i2smodule' ).val( 'none' );
	$( '#i2smodule option' ).filter( function() {
		var $this = $( this );
		return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
	} ).prop( 'selected', true );
	G.i2senabled = $( '#i2smodule' ).val() !== 'none';
	$( '#divi2smodulesw' ).toggleClass( 'hide', G.i2senabled );
	$( '#divi2smodule' ).toggleClass( 'hide', !G.i2senabled );
	$( '#lcdchar' ).prop( 'checked', G.lcdchar );
	$( '#setting-lcdchar' ).toggleClass( 'hide', !G.lcdchar );
	$( '#lcd' ).prop( 'checked', G.lcd );
	$( '#setting-lcd' ).toggleClass( 'hide', !G.lcd );
	$( '#powerbutton' ).prop( 'checked', G.powerbutton );
	$( '#setting-powerbutton' ).toggleClass( 'hide', !G.powerbutton );
	$( '#relays' ).prop( 'checked', G.relays );
	$( '#setting-relays' ).toggleClass( 'hide', !G.relays );
	$( '#mpdoled' ).prop( 'checked', G.mpdoled );
	$( '#setting-mpdoled' ).toggleClass( 'hide', !G.mpdoled );
	$( '#onboardaudio' ).prop( 'checked', G.onboardaudio );
	if ( G.soundprofileconf ) {
		$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		$( '#setting-soundprofile' ).toggleClass( 'hide', !G.soundprofile );
	} else {
		$( '#divsoundprofile' ).addClass( 'hide' );
	}
	$( '#vuled' ).prop( 'checked', G.vuled );
	$( '#setting-vuled' ).toggleClass( 'hide', !G.vuled );
	$( '#hostname' ).val( G.hostname );
	$( '#timezone' ).val( G.timezone );
	selectricRender();
	[ 'bluetoothctl', 'configtxt', 'iw', 'journalctl', 'powerbutton', 'rfkill', 'soundprofile' ].forEach( function( id ) {
		codeToggle( id, 'status' );
	} );
	resetLocal();
	showContent();
}
function renderStatus() {
	var status = G.cpuload.replace( / /g, ' <gr>&bull;</gr> ' );
	if ( G.cputemp ) {
		status += + G.cputemp < 80 ? '<br>'+ G.cputemp +' °C' : '<br><red><i class="fa fa-warning blink red"></i>&ensp;'+ G.cputemp +' °C</red>';
	} else {
		$( '#cputemp' ).hide();
	}
	status += '<br>'+ G.time.replace( ' ', ' <gr>&bull;</gr> ' ) +'<wide>&emsp;'+ G.timezone.replace( '/', ' · ' ) +'</wide>'
			+'<br>'+ G.uptime +'<wide>&emsp;<gr>since '+ G.uptimesince.replace( ' ', ' &bull; ' ) +'</gr></wide>'
			+'<br>'+ ( G.startup ? G.startup.replace( /\(/g, '<gr>' ).replace( /\)/g, '</gr>' ) : 'Booting ...' );
	if ( G.throttled !== '0x0' ) { // https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md
		status += '<br><span class="undervoltage"><i class="fa fa-warning';
		var bits = parseInt( G.throttled ).toString( 2 ); // 20 bits: 19..0 ( hex > decimal > binary )
		if ( bits.slice( -1 ) == 1 ) {                    // bit# 0  - undervoltage now
			status += ' blink red"></i>&ensp;<red>Voltage under 4.7V</red> - currently detected.';
		} else if ( bits.slice( -19, 1 ) == 1 ) {         // bit# 19 - undervoltage occured
			status += '"></i>&ensp;Voltage under 4.7V - occurred.';
		}
		status += '&emsp;<i class="fa fa-status gr"></i></span></span>';
	}
	$( '#status' ).html( status );
}
