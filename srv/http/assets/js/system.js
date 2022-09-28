$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( 'body' ).click( function( e ) {
	$( '#menu' ).addClass( 'hide' );
	if ( e.target.id !== 'codehddinfo' ) $( '#codehddinfo' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
	if ( !$( e.target ).parents( '#divi2smodule' ).length && $( '#i2smodule' ).val() === 'none' ) {
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
	}
} );
$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'settings.php?p='+ $( this ).data( 'setting' );
} );
var gpiosvg = $( '#gpiosvg' ).html().replace( 'width="380px', 'width="330px' );
var pin2gpio = {
	   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
	, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
}
$( '.img' ).click( function() {
	var name = $( this ).data( 'name' );
	var txtlcdchar = `\
${ gpiosvg }<code>GND:(any black pin)</code>
<wh>I²C:</wh> <code>VCC:1</code> <code>SDA:3</code> <code>SCL:5</code> <code>5V:4</code>
<wh>GPIO:</wh> <code>VCC:4</code> <code>RS:15</code> <code>RW:18</code> <code>E:16</code> <code>D4-7:21-24</code>`;
	var txtmpdoled = `\
${ gpiosvg }<code>GND:(any black pin)</code> <code>VCC:1</code>
<wh>I²C:</wh> <code>SCL:5</code> <code>SDA:3</code>
<wh>SPI:</wh> <code>CLK:23</code> <code>MOS:19</code> <code>RES:22</code> <code>DC:18</code> <code>CS:24</code>`;
	var txtrotaryencoder = `${ gpiosvg }<code>GND: (any black pin)</code> &emsp; <code>+: not use</code>`
	var title = {
		  i2cbackpack   : [ 'Character LCD', '', 'lcdchar' ]
		, lcdchar       : [ 'Character LCD', txtlcdchar ]
		, relays        : [ 'Relays Module' ]
		, rotaryencoder : [ 'Rorary Encoder', txtrotaryencoder, 'volume' ]
		, lcd           : [ 'TFT 3.5" LCD' ]
		, mpdoled       : [ 'Spectrum OLED', txtmpdoled ]
		, powerbutton   : [ 'Power Button',  '', 'power', '300px', 'svg' ]
		, vuled         : [ 'VU LED',        '', 'led',   '300px', 'svg' ]
	}
	var d = title[ name ];
	info( {
		  icon        : d[ 2 ] || name
		, title       : d[ 0 ]
		, message     : '<img src="/assets/img/'+ name +'.'+ Math.ceil( Date.now() / 1000 ) +'.'+ (d[ 4 ] || 'jpg' )
						+'" style="height: '+ ( d[ 3 ] || '100%' ) +'; margin-bottom: 0;">'
		, footer      : d[ 1 ]
		, footeralign : 'left'
		, beforeshow  : function() {
			$( '.'+ name +'-no' ).addClass( 'hide' );
		}
		, okno        : 1
	} );
} );
$( '#power' ).click( function() {
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, buttonlabel : '<i class="fa fa-reboot"></i>Reboot'
		, buttoncolor : orange
		, button      : function() {
			bash( [ 'cmd', 'power', 'reboot' ] );
		}
		, oklabel     : '<i class="fa fa-power"></i>Off'
		, okcolor     : red
		, ok          : function() {
			bash( [ 'cmd', 'power', 'off' ] );
		}
	} );
} );
$( '#refresh' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var $this = $( this );
	if ( $this.hasClass( 'blink' ) ) {
		clearInterval( G.intCputime );
		bannerHide();
		$this.removeClass( 'blink' );
	} else {
		$this.addClass( 'blink' );
		G.intCputime = setInterval( getStatus, 10000 );
	}
} );
$( '#addnas' ).click( function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	G.li = $this;
	var active = $this.hasClass( 'active' );
	$( '#codehddinfo' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
	if ( !$( '#menu' ).hasClass( 'hide' ) ) {
		$( '#menu, #codehddinfo' ).addClass( 'hide' );
		if ( active ) return
	}
	
	var i = $this.index()
	var list = G.list[ i ];
	$this.addClass( 'active' );
	$( '#menu a' ).addClass( 'hide' );
	var write = list.perm.slice( -2, -1 ) === 'w';
	$( '#menu .read' ).toggleClass( 'hide', !write );
	$( '#menu .write' ).toggleClass( 'hide', write );
	if ( list.icon === 'networks' ) {
		$( '#menu .share' ).addClass( 'hide' );
	} else {
		var shared = list.nfs || list.smb;
		$( '#menu .share' ).toggleClass( 'hide', shared );
		$( '#menu .unshare' ).toggleClass( 'hide', !shared );
	}
	if ( list.icon !== 'microsd' ) {
		var mounted = list.mounted;
		$( '#menu .remount' ).toggleClass( 'hide', mounted );
		$( '#menu .unmount' ).toggleClass( 'hide', !mounted );
		$( '#menu .info' ).toggleClass( 'hide', list.icon === 'usbdrive' );
	}
	var menuH = $( '#menu' ).height();
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', $this.position().top + 48 );
	var targetB = $( '#menu' ).offset().top + menuH;
	var wH = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '#menu a' ).click( function() {
	var $this = $( this );
	var cmd = $this.prop( 'class' );
	var source = G.li.find( '.source' ).text();
	var mountpoint = G.li.find( '.mountpoint' ).text();
	if ( mountpoint.slice( 9, 12 ) === 'NAS' ) {
		var icon = 'networks';
		var title = 'Network Mount';
	} else {
		var icon = 'usbdrive';
		var title = 'Local Mount';
	}
	switch ( cmd ) {
		case 'forget':
			notify( title, 'Forget ...', icon );
			bash( [ 'remove', mountpoint ] );
			break;
		case 'info':
			var $code = $( '#codehddinfo' );
			if ( $code.hasClass( 'hide' ) ) {
				bash( [ 'hddinfo', source ], function( data ) {
					$code
						.html( data )
						.removeClass( 'hide' );
				} );
			} else {
				$code.addClass( 'hide' );
			}
			break;
		case 'read':
		case 'write':
			bash( [ 'permission', cmd === 'read' ? 755 : 777, mountpoint ] );
			notify( 'Permission', 'Change ...', 'edit-circle' )
			break;
		case 'remount':
			notify( title, 'Remount ...', icon );
			bash( [ 'remount', mountpoint, source ] );
			break;
		case 'share':
		case 'unshare':
			bash( [ 'nfsset', cmd, mountpoint ], function( connected ) {
				if ( cmd === 'unshare' && connected ) {
					bannerHide();
					info( {
						  icon    : 'networks'
						, title   : 'NFS Share'
						, message : '<wh>NFS Server is currently connected by:</wh><br>'
									+ connected
					} );
				}
			} );
			notify( 'NFS Share', 'Unshare ...', 'networks' );
			break;
		case 'unmount':
			notify( title, 'Unmount ...', icon )
			bash( [ 'unmount', mountpoint ] );
			break;
	}
} );
$( '#setting-hddsleep' ).click( function() {
	info( {
		  icon         : 'usbdrive'
		, title        : 'HDD Sleep'
		, message      : 'Timer:'
		, radio        : { Disable: 128, '2 minutes': 24, '5 minutes': 60, '10 minutes': 120 }
		, values       : G.hddsleep || 128
		, checkchanged : 1
		, cancel        : function() {
			$( '#hddsleep' ).prop( 'checked', G.hddsleep );
		}
		, ok           : function() {
			var val = infoVal()
			notify( 'HDD Sleep', ( val === 128 ? 'Disable ...' : 'Timer: '+ ( val * 5 / 60 ) +'minutes ...' ), 'usbdrive' )
			bash( [ 'hddsleep', val ], function( devices ) {
				if ( devices ) {
					info( {
						  icon         : 'usbdrive'
						, title        : 'HDD Sleep'
						, message      : '<wh>Devices not support sleep:</wh><br>'
										+ devices
					} );
					bannerHide();
				}
			} );
		}
	} );
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
<tr><td></td><td><label><input type="checkbox">Auto start Access Point</label></td></tr>
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
		notify( 'Audio I&#178;S', 'Enable ...', 'volume' );
	} else {
		aplayname = 'onboard';
		output = '';
		notify( 'I&#178;S Module', 'Disable ...', 'volume' );
	}
	bash( [ 'i2smodule', aplayname, output ] );
} ).on( 'selectric-close', function() { // fix: toggle switch / select on 'Disable'
	setTimeout( function() {
		if ( $( '#i2smodule' ).val() !== 'none' ) {
			$( '#divi2smodulesw' ).addClass( 'hide' );
			$( '#divi2smodule' ).removeClass( 'hide' );
		} else {
			$( '#divi2smodulesw' ).removeClass( 'hide' );
			$( '#divi2smodule' ).addClass( 'hide' );
		}
	}, 300 );
} );
$( '#setting-i2smodule' ).click( function() {
	info( {
		  icon         : 'i2saudio'
		, title        : 'Audio - I²S'
		, checkbox     : [ 'Disable I²S HAT EEPROM read' ]
		, values       : G.i2seeprom
		, checkchanged : 1
		, ok           : function() {
			bash( [ 'i2seeprom', infoVal() ] );
		}
	} );
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
$( '#setting-lcdchar' ).click( function() {
	var radioaddr = '<td>Address</td>';
	G.lcdcharaddr.forEach( function( el ) {
		radioaddr += '<td><label><input type="radio" name="address" value="'+ el +'">0x'+ el.toString( 16 ) +'</label></td>';
	} );
	var optpins = '<select>';
	$.each( pin2gpio, function( k, v ) {
		optpins += '<option value='+ k +'>'+ k +'</option>';
	} );
	optpins += '</select>';
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
<tr id="i2caddress" class="i2c">${ radioaddr }</tr>
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
<tr><td class="gpiosvg" colspan="8" style="padding-top: 10px;">${ gpiosvg }</td></tr>
<tr><td>RS</td><td>${ optpins }</td><td>RW</td><td>${ optpins }</td><td>E</td><td>${ optpins }</td><td></td><td></td></tr>
<tr><td>D4</td><td>${ optpins }</td><td>D5</td><td>${ optpins }</td><td>D6</td><td>${ optpins }</td><td>D7</td><td>${ optpins }</td></tr>
</table>
<table>
<tr><td width="63"></td><td><label><input id="backlight" type="checkbox">Sleep <gr>(60s)</gr></label></td></tr>
</table>`;
	// cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight
	var i2c = G.lcdcharconf[ 2 ] === 'i2c';
	info( {
		  icon         : 'lcdchar'
		, title        : 'Character LCD'
		, content      : infolcdchar
		, boxwidth     : 180
		, values       : G.lcdcharconf
		, checkchanged : ( G.lcdchar ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent .gpio td:even' )
				.css( 'width', 60 )
				.find( '.selectric-wrapper, .selectric' )
				.css( 'width', 60 );
			$( '#infoContent .gpio td:odd' ).css( {
				  width           : 25
				, 'padding-right' : 1
				, 'text-align'    : 'right'
			} );
			$( '.gpio, .gpio .selectric-wrapper' ).css( 'font-family', 'Inconsolata' );
			$( '#infoContent svg .power' ).remove();
			$( '.i2c' ).toggleClass( 'hide', !i2c );
			$( '.gpio' ).toggleClass( 'hide', i2c );
			$( '#infoContent input[name=inf]' ).change( function() {
				i2c = $( '#infoContent input[name=inf]:checked' ).val() === 'i2c';
				$( '.i2c' ).toggleClass( 'hide', !i2c );
				$( '.gpio' ).toggleClass( 'hide', i2c );
			} );
			if ( G.lcdchar ) {
				$( '#infoOk' )
					.before( '<gr id="lcdlogo"><i class="fa fa-plus-r wh" style="font-size: 20px"></i>&ensp;Logo</gr>&ensp;' )
					.after( '&emsp;<gr id="lcdsleep"><i class="fa fa-screenoff wh" style="font-size: 20px"></i>&ensp;Sleep</gr>' );
				$( '#infoButtons gr' ).click( function() {
					var action = this.id === 'lcdlogo' ? 'logo' : 'off';
					bash( "/srv/http/bash/settings/system.sh lcdchar$'\n'"+ action )
				} );
			}
		}
		, cancel       : function() {
			$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		}
		, ok           : function() {
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
</table>
<br>
<label><input id="audiophonics" type="checkbox"> Audiophonics</label>
`;
	info( {
		  icon         : 'power'
		, title        : 'Power Button'
		, content      : gpiosvg + infopowerbutton
		, boxwidth     : 80
		, values       : [ 5, ...G.powerbuttonconf ]
		, checkchanged : ( G.powerbutton ? 1 : 0 )
		, beforeshow   : function() {
			if ( !G.powerbuttonconf[ 3 ] ) {
				$( '#infoContent .reserved' ).toggleClass( 'hide', G.powerbuttonconf[ 0 ] == 5 );
				$( '#infoContent select' ).eq( 0 ).change( function() {
					$( '#infoContent .reserved' ).toggleClass( 'hide', $( this ).val() == 5 );
				} );
			} else {
				$( '#infoContent table' ).addClass( 'hide' );
			}
			$( '#audiophonics' ).change( function() {
				$( '#infoContent table' ).toggleClass( 'hide', $( this ).prop( 'checked' ) );
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
$( '#setting-rotaryencoder' ).click( function() {
	var pin = '<td colspan="3"><select >';
	$.each( pin2gpio, function( k, v ) {
		pin += '<option value='+ v +'>'+ k +'</option>';
	} );
	pin += '</select></td>';
	var inforotaryencoder = `\
<table>
<tr><td>CLK</td>${ pin }</tr>
<tr><td>DT</td>${ pin }</tr>
<tr><td>SW</td>${ pin }</tr>
<tr><td>Each step <gr>(%)</gr></td>
	<td style="width: 55px"><label><input type="radio" name="step" value="1">1</label></td>
	<td style="width: 55px"><label><input type="radio" name="step" value="2">2</label></td>
</tr>
</table>`;
	info( {
		  icon         : 'volume'
		, title        : 'Rotary Encoder'
		, content      : gpiosvg + inforotaryencoder
		, boxwidth     : 90
		, values       : G.rotaryencoderconf
		, checkchanged : ( G.rotaryencoder ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent svg .power' ).remove();
		}
		, cancel       : function() {
			$( '#rotaryencoder' ).prop( 'checked', G.rotaryencoder );
		}
		, ok           : function() {
			bash( [ 'rotaryencoderset', ...infoVal() ] );
			notify( 'Rotary Encoder', G.rotaryencoder ? 'Change ...' : 'Enable ...', 'volume' );
		}
	} );
} );
$( '#setting-mpdoled' ).click( function() {
	info( {
		  icon         : 'mpdoled'
		, title        : 'Spectrum OLED'
		, selectlabel  : 'Type'
		, content      : `\
<table>
<tr><td>Controller</td>
<td><select class="oledchip">
	<option value="1">SSD130x SPI</option>
	<option value="3">SSD130x I²C</option>
	<option value="4">Seeed I²C</option>
	<option value="6">SH1106 I²C</option>
	<option value="7">SH1106 SPI</option>
</select></td></tr>
<tr class="baud"><td>Refresh <gr>(baud)</gr></td>
<td><select>
	<option value="800000">800000</option>
	<option value="1000000">1000000</option>
	<option value="1200000">1200000</option>
</select></td></tr>
</table>`
		, values       : G.mpdoledconf
		, checkchanged : ( G.mpdoled ? 1 : 0 )
		, boxwidth     : 140
		, beforeshow   : function() {
			var i2c = !G.mpdoled || ( G.mpdoled && G.mpdoledconf[ 1 ] );
			$( '.baud' ).toggleClass( 'hide', !i2c );
			$( '.oledchip' ).change( function() {
				var val = $( this ).val();
				$( '.baud' ).toggleClass( 'hide', val < 3 || val > 6 );
			} );
		}
		, cancel       : function() {
			$( '#mpdoled' ).prop( 'checked', G.mpdoled );
		}
		, buttonlabel  : '<i class="fa fa-plus-r"></i>Logo'
		, button       : !G.mpdoled ? '' : function() {
			bash( '/srv/http/bash/cmd.sh mpdoledlogo' );
		}
		, ok           : function() {
			notify( 'Spectrum OLED', G.mpdoled ? 'Change ...' : 'Enable ...', 'mpdoled' );
			bash( [ 'mpdoledset', ...infoVal() ] );
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
		, checkchanged : 1
		, boxwidth     : 80
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
		, focus      : 0
		, values     : [ 3.3, 5 ]
		, boxwidth   : 70
		, beforeshow : function() {
			$( '#infoContent input' ).prop( 'disabled', 1 );
			$( '#infoContent input' ).eq( 2 )
				.prop( 'disabled', 0 )
				.keyup( function() {
					var fv = $( this ).val();
					if ( fv > 3.3 ) {
						var ohm = '( > 3.3V)';
					} else {
						var ohm = fv ? Math.round( ( 3.3 - fv ) / 0.005 ) : '';
					}
					$( '#infoContent input' ).eq( 3 ).val( ohm );
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
		, focus        : 0
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
	if ( G.soc === 'BCM2835' || G.soc === 'BCM2836' ) { // rpi 0, 1
		info( {
			  icon         : 'globe'
			, title        : 'Servers'
			, textlabel    : 'NTP'
			, boxwidth     : 240
			, values       : G.ntp
			, checkchanged : 1
			, checkblank   : 1
			, ok           : function() {
				notify( 'NTP', 'Sync ...', 'globe' );
				bash( [ 'servers', infoVal() ], bannerHide );
			}
		} );
		return
	}
	
	bash( [ 'mirrorlist' ], function( list ) {
		var lL = list.code.length;
		var selecthtml = '<select>';
		for ( i = 0; i < lL; i++ ) selecthtml += '<option value="'+ list.code[ i ] +'">'+ list.country[ i ] +'</option>';
		selecthtml += '</select>';
		var content = `
<table>
<tr><td>NTP</td><td><input type="text"></td></tr>
<tr><td>Package</td><td>${ selecthtml }</td></tr>
</table>`
		info( {
			  icon         : 'globe'
			, title        : 'Servers'
			, content      : content
			, boxwidth     : 240
			, values       : [ G.ntp, list.current ]
			, checkchanged : 1
			, checkblank   : [ 0 ]
			, ok           : function() {
				var values = infoVal();
				if ( values[ 0 ] !== G.ntp ) notify( 'NTP', 'Sync ...', 'globe' );
				bash( [ 'servers', ...values ], bannerHide );
			}
		} );
		bannerHide();
	}, 'json' );
} );
$( '#setting-soundprofile' ).click( function() {
	info( {
		  icon         : 'sliders'
		, title        : 'Kernel Sound Profile'
		, textlabel    : [ 'vm.swappiness', 'eth0 mtu', 'eth0 txqueuelen' ]
		, boxwidth     : 110
		, values       : G.soundprofileconf
		, checkchanged : 1
		, checkblank   : 1
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
				bash( '/srv/http/bash/settings/system-datareset.sh', bannerHide );
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
$( '#shareddata' ).click( function() {
	if ( G.shareddataserver ) {
		info( {
			  icon    : 'networks'
			, title   : 'Shared Data'
			, message : '<wh><i class="fa fa-warning"></i> All clients will be disconnected.</wh>'
						+'<br>Continue?'
			, cancel  : function() {
				$( '#shareddata' ).prop( 'checked', true );
			}
			, okcolor : orange
			, oklabel : 'Disable'
			, ok      : function() {
				bash( [ 'shareddatadisable' ] );
				notify( 'Shared Data', 'Disable ...', 'networks' );
			}
		} );
	} else if ( G.shareddata ) {
		info( {
			  icon    : 'networks'
			, title   : 'Shared Data'
			, radio   : { 'Copy shared data to local': true, 'Rebuild entire database': false }
			, values  : [ true ]
			, cancel  : function() {
				$( '#shareddata' ).prop( 'checked', true );
			}
			, okcolor : orange
			, oklabel : 'Disable'
			, ok      : function() {
				bash( [ 'shareddatadisable', infoVal() ] );
				notify( 'Shared Data', 'Disable ...', 'networks' );
			}
		} );
	} else {
		info( {
			  icon       : 'networks'
			, title      : 'Shared Data'
			, radio      : { 'Share music and data from this rAudio': 0, 'Add shares from other server': 1 }
			, okno       : 1
			, beforeshow : function() {
				$( '#infoContent input' ).change( function() {
					setTimeout( function() {
						if ( $( '#infoContent input:checked' ).val() == 1 ) {
							if ( !$( '#list .fa-networks' ).length ) {
								info( {
									  icon    : 'networks'
									, title   : 'Shared Data'
									, message : 'Connect <wh>music share</wh> before enable Shared Data.'
								} );
								$( '#shareddata' ).prop( 'checked', false );
								return
							}
							
							infoMount( 'shareddata' );
						} else {
							info( {
								  icon       : 'networks'
								, title      : 'Shared Data - NFS Server'
								, message    : '<wh>Share path</wh>&ensp;• <wh>Name</wh>'
								, textlabel  : [
									  '<code>/mnt/MPD/SD</code>'
									, '<code>/mnt/MPD/USB</code>'
									, '<code>/srv/http/shareddata</code>'
								]
								, checkbox    : [ 'Update Library database' ]
								, values      : [ '', 'Music', 'SharedData', true ]
								, footer      : '<br> • Setting values for clients on <wh>Storage <i class="fa fa-plus-circle"></i></wh>'
												+'<br> • Blank = Disable'
								, footeralign : 'left'
								, beforeshow  : function() {
									$( '.infomessage' ).eq( 0 ).css( 'margin-left', '-40px' );
									$( '#infoContent input' ).eq( 2 )
										.prop( 'disabled', 1 )
										.css( 'color', 'var( --cg60 )' );
									$( '#infoContent input' ).on( 'keyup paste', function() {
										var $this = $( this );
										setTimeout( function() {
											$this.val( $this.val().replace( /\//g, '' ) );
										}, 0 );
									} );
								}
								, cancel     : function() {
									$( '#shareddata' ).prop( 'checked', false );
								}
								, ok         : function() {
									bash( [ 'shareddataserver', ...infoVal() ] );
								}
							} );
						}
					}, 0 );
				} );
			}
		} );
	}
} );
$( '.listtitle' ).click( function( e ) {
	var $this = $( this );
	var $chevron = $this.find( 'i' );
	var $list = $this.next();
	var $target = $( e.target );
	if ( !$this.hasClass( 'backend' ) ) { // js
		$list.toggleClass( 'hide' )
		var updn = $chevron.hasClass( 'fa-chevron-up' ) ? 'down' : 'up';
		$chevron
			.removeClass( 'fa-chevron-up fa-chevron-down' )
			.addClass( 'fa-chevron-'+ updn );
		if ( localhost ) $( '.list a' ).remove();
	} else if ( $target.is( 'a' ) ) { // package
		var active = $target.hasClass( 'wh' );
		$( '.listtitle a' ).removeAttr( 'class' );
		if ( active ) {
			$list.empty();
			return
		}
		
		bash( [ 'packagelist', $target.text() ], function( list ) {
			$list.html( list );
			$target.addClass( 'wh' );
			if ( localhost ) $( '.list a' ).removeAttr( 'href' );
		} );
	} else {
		$list.add( $chevron ).addClass( 'hide' );
		$( '.listtitle a' ).removeAttr( 'class' );
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function infoMount( values ) {
	var ip = $( '#list' ).data( 'ip' );
	var ipsub = ip.substring( 0, ip.lastIndexOf( '.') + 1 );
	if ( values === 'shareddata' ) {
		var shareddata = true;
		values = [ 'cifs', ipsub, '', '', '', '', false ];
		var htmlname = '';
		var chktext = 'Use data from this rAudio'
	} else {
		var shareddata = false;
		var htmlname = `\
<tr><td>Name</td>
<td><input id="mountpoint" type="text"></td>
</tr>`;
		var chktext = 'Update Library on mount'
	}
	var htmlmount = `\
<table id="tblinfomount">
<tr><td>Type</td>
	<td><label><input type="radio" name="inforadio" value="cifs" checked>CIFS</label>&emsp;
	<label><input type="radio" name="inforadio" value="nfs">NFS</label></td>
</tr>
${ htmlname }
<tr><td>Server IP</td>
	<td><input type="text"></td>
</tr>
<tr><td id="sharelabel">Share name</td>
	<td><input id="share" type="text"></td>
</tr>
<tr class="guest"><td>User</td>
	<td><input type="text"></td>
</tr>
<tr class="guest"><td>Password</td>
	<td><input type="password" checked></td><td><i class="fa fa-eye fa-lg"></i></td>
</tr>
<tr><td>Options</td>
	<td><input type="text"></td>
</tr>
<tr><td></td>
	<td><label><input type="checkbox" checked>${ chktext }</label></td>
</tr>`;
	htmlmount += '</table>';
	info( {
		  icon       : 'networks'
		, title      : shareddata ? 'Shared Data' : 'Add Network Storage'
		, content    : htmlmount
		, values     : values || [ 'cifs', '', ipsub, '', '', '', '', true ]
		, beforeshow : function() {
			$( '#infoContent td' ).eq( 0 ).css( 'width', 90 );
			$( '#infoContent td' ).eq( 1 ).css( 'width', 230 );
			var $share = $( '#share' );
			function hideOptions( type ) {
				if ( type === 'nfs' ) {
					$( '#sharelabel' ).text( 'Share path' );
					$( '.guest' ).addClass( 'hide' );
					var placeholder = '/path/to/share on server';
				} else {
					$( '#sharelabel' ).text( 'Share name' );
					$( '.guest' ).removeClass( 'hide' );
					var placeholder = 'sharename on server';
				}
				if ( !values ) {
					$( '#mountpoint' ).attr( 'placeholder', 'for Library > NAS > "Name" ' );
					$share.attr( 'placeholder', placeholder );
				}
			}
			hideOptions( values ? values[ 0 ] : 'cifs' );
			$( '#infoContent input:radio' ).change( function() {
				hideOptions( $( this ).val() );
			} );
			var $mountpoint = $( '#mountpoint' );
			$mountpoint.on( 'keyup paste', function() {
				setTimeout( function() {
					$mountpoint.val( $mountpoint.val().replace( /\//g, '' ) );
				}, 0 );
			} );
			$share.on( 'keyup paste', function() {
				setTimeout( function() {
					var slash = $( '#infoContent input[type=radio]:checked' ).val() === 'cifs' ? /[\/\\]/g : /\\//g;
					$share.val( $share.val().replace( slash, '' ) );
				}, 0 );
			} );
		}
		, cancel     : function() {
			if ( shareddata ) $( '#shareddata' ).prop( 'checked', false );
		}
		, ok         : function() {
			var values = infoVal();
			bash( [ shareddata ? 'shareddata' : 'mount', ...values ], function( error ) {
				if ( error ) {
					info( {
						  icon    : 'networks'
						, title   : shareddata ? 'Shared Data' : 'Mount Share'
						, message : error
						, ok      : function() {
							setTimeout( function() {
								infoMount( values );
							}, 0 );
						}
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
			if ( shareddata ) {
				notify( 'Shared Data', 'Enable ...', 'networks' );
			} else {
				notify( 'Network Mount', 'Mount ...', 'networks' );
			}
		}
	} );
}
function renderPage() {
	$( '#codehddinfo' )
		.empty()
		.addClass( 'hide' );
	$( '#systemvalue' ).html( G.system );
	$( '#status' ).html( G.status );
	if ( !G.startup ) setTimeout( getStatus, 10000 );
	var html = '';
	$.each( G.list, function( i, val ) {
		if ( val.mounted ) {
			var dataunmounted = '';
			var dot = '<grn>&ensp;•&ensp;</grn>';
		} else {
			var dataunmounted = ' data-unmounted="1"';
			var dot = '<red>&ensp;•&ensp;</red>';
		}
		html += '<li '+ dataunmounted;
		html += '><i class="fa fa-'+ val.icon +'"></i><wh class="mountpoint">'+ val.mountpoint +'</wh>'+ dot
		html += '<gr class="source hide">'+ val.source +'</gr>';
		html +=  val.size ? val.size : '';
		html += val.icon !== 'networks' ? ' <gr>• '+ val.perm +'</gr>' : '';
		html += val.nfs ? ' <gr>• NFS</gr>' : '';
		html += val.smb ? ' <gr>• SMB</gr>' : '';
		html += '</li>';
	} );
	$( '#list' ).html( html );
	$( '#divhddsleep' ).toggleClass( 'hide', $( '#list .fa-usbdrive' ).length === 0 );
	$( '#hddsleep' ).toggleClass( 'disabled', !G.hddapm );
	if ( 'bluetooth' in G || 'wlan' in G ) {
		if ( 'bluetooth' in G ) {
			$( '#bluetooth' ).parent().prev().toggleClass( 'single', !G.bluetoothactive );
		} else {
			$( '#divbluetooth' ).addClass( 'hide' );
		}
		if ( 'wlan' in G ) {
			$( '#wlan' )
				.toggleClass( 'disabled', G.hostapd || G.wlanconnected )
				.parent().prev().toggleClass( 'single', !G.wlan );
		} else {
			$( '#divwlan' ).addClass( 'hide' );
		}
	} else {
		$( '#divbluetooth' ).parent().addClass( 'hide' );
	}
	$( '#i2smodule' ).val( 'none' );
	$( '#i2smodule option' ).filter( function() {
		var $this = $( this );
		return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
	} ).prop( 'selected', true );
	G.i2senabled = $( '#i2smodule' ).val() !== 'none';
	$( '#divi2smodulesw' ).toggleClass( 'hide', G.i2senabled );
	$( '#divi2smodule, #setting-i2smodule' ).toggleClass( 'hide', !G.i2senabled );
	$( '#bluetooth' ).toggleClass( 'disabled', G.btconnected );
	$( '#divsoundprofile' ).toggleClass( 'hide', !G.soundprofileconf );
	$( '#hostname' ).val( G.hostname );
	$( '#avahiurl' ).text( G.hostname +'.local' );
	$( '#timezone' ).val( G.timezone );
	$( '#shareddata' ).prop( 'checked', G.shareddata );
	$( '#divshareddata .col-l' )
		.toggleClass( 'status', G.shareddataserver )
		.toggleClass( 'single', !G.shareddataserver )
		.find( 'gr' ).toggleClass( 'hide', !G.shareddataserver );
	showContent();
}
function getStatus() {
	bash( '/srv/http/bash/settings/system-data.sh status', function( status ) {
		$( '#status' ).html( status );
	} );
}
