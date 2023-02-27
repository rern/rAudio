$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( 'body' ).click( function( e ) {
	$( '#menu' ).addClass( 'hide' );
	if ( e.target.id !== 'codehddinfo' ) $( '#codehddinfo' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
	if ( ! $( e.target ).hasClass( 'select2-search__field' ) 
		&& ! $( e.target ).parents( '#divi2smodule' ).length 
		&& $( '#i2smodule' ).val() === 'none'
	) {
		i2sSelectHide();
	}
} ).keyup( function( e ) {
	if ( e.key === 'Escape' ) {
		$( 'select' ).select2( 'close' );
		i2sSelectHide();
	}
} );
$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'settings.php?p='+ $( this ).data( 'setting' );
} );
var gpiosvg  = $( '#gpiosvg' ).html().replace( 'width="380px', 'width="330px' );
var pin2gpio = {
	   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
	, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
}
$( '.power' ).click( infoPower );
$( '.img' ).click( function() {
	var name             = $( this ).data( 'name' );
	var txtlcdchar       = `\
${ gpiosvg }<code>GND:(any black pin)</code>
<wh>I²C:</wh> <code>VCC:1</code> <code>SDA:3</code> <code>SCL:5</code> <code>5V:4</code>
<wh>GPIO:</wh> <code>VCC:4</code> <code>RS:15</code> <code>RW:18</code> <code>E:16</code> <code>D4-7:21-24</code>`;
	var txtmpdoled       = `\
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
	var d                = title[ name ];
	info( {
		  icon        : d[ 2 ] || name
		, title       : d[ 0 ]
		, message     : '<img src="/assets/img/'+ name +'.'+ ( d[ 4 ] || 'jpg' ) +'?v='+ Math.ceil( Date.now() / 1000 )
						+'" style="height: '+ ( d[ 3 ] || '100%' ) +'; margin-bottom: 0;">'
		, footer      : d[ 1 ]
		, footeralign : 'left'
		, beforeshow  : () => $( '.'+ name +'-no' ).addClass( 'hide' )
		, okno        : 1
	} );
} );
$( '.refresh' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var $this = $( this );
	if ( $this.hasClass( 'blink' ) ) {
		clearInterval( V.intStatus );
		bannerHide();
		$this.removeClass( 'blink wh' );
	} else {
		$this.addClass( 'blink wh' );
		V.intStatus = setInterval( getStatus, 10000 );
	}
} );
$( '.addnas' ).click( function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	V.li      = $this;
	var active = $this.hasClass( 'active' );
	$( '#codehddinfo' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
	if ( ! $( '#menu' ).hasClass( 'hide' ) ) {
		$( '#menu, #codehddinfo' ).addClass( 'hide' );
		if ( active ) return
	}
	
	var i    = $this.index()
	var list = S.list[ i ];
	$( '#menu a' ).addClass( 'hide' );
	if ( list.icon === 'microsd' ) return
	
	if ( S.shareddata && list.mountpoint === '/mnt/MPD/NAS/data' ) {
		info( {
			  icon    : 'networks'
			, title   : 'Network Storage'
			, message : '<wh>Shared Data '+ ico( 'networks' ) +'</wh> is currently enabled.'
		} );
		return
	}
	
	$this.addClass( 'active' );
	$( '#menu .info' ).toggleClass( 'hide', list.icon !== 'usbdrive' );
	$( '#menu .forget' ).removeClass( 'hide', list.icon === 'usbdrive' );
	$( '#menu .remount' ).toggleClass( 'hide', list.mounted );
	$( '#menu .unmount' ).toggleClass( 'hide', ! list.mounted );
	var menuH = $( '#menu' ).height();
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', $this.position().top + 48 );
	var targetB = $( '#menu' ).offset().top + menuH;
	var wH      = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '#menu a' ).click( function() {
	var $this      = $( this );
	var cmd        = $this.prop( 'class' );
	var list       = S.list[ V.li.index() ];
	var mountpoint = list.mountpoint;
	var source     = list.source;
	if ( mountpoint.slice( 9, 12 ) === 'NAS' ) {
		var icon  = 'networks';
		var title = 'Network Mount';
	} else {
		var icon  = 'usbdrive';
		var title = 'Local Mount';
	}
	switch ( cmd ) {
		case 'forget':
			notify( icon, title, 'Forget ...' );
			bash( [ 'mountforget', mountpoint ] );
			break;
		case 'info':
			var $code = $( '#codehddinfo' );
			if ( $code.hasClass( 'hide' ) ) {
				bash( [ 'hddinfo', source ], data => {
					$code
						.html( data )
						.removeClass( 'hide' );
				} );
			} else {
				$code.addClass( 'hide' );
			}
			break;
		case 'remount':
			notify( icon, title, 'Remount ...' );
			bash( [ 'mountremount', mountpoint, source ] );
			break;
		case 'unmount':
			notify( icon, title, 'Unmount ...' )
			bash( [ 'mountunmount', mountpoint ] );
			break;
	}
} );
$( '#setting-softlimit' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, radio        : { '65°C': 65, '70°C': 70, '75°C': 75 }
		, values       : S.softlimitconf || 65
		, checkchanged : S.softlimit
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-hddsleep' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : 'Timer:'
		, radio        : { '2 minutes': 24, '5 minutes': 60, '10 minutes': 120 }
		, values       : S.hddsleep || 60
		, checkchanged : S.hddsleep
		, cancel       : switchCancel
		, ok           : () => {
			var val = infoVal()
			notify( SW.icon, SW.title, ( val === 128 ? 'Disable ...' : 'Timer: '+ ( val * 5 / 60 ) +'minutes ...' ) )
			bash( [ 'hddsleep', true, val ], devices => {
				if ( devices ) {
					info( {
						  icon    : SW.icon
						, title   : SW.title
						, message : '<wh>Devices not support sleep:</wh><br>'
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
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Discoverable <gr>by senders</gr>', 'Sampling 16bit 44.1kHz <gr>to receivers</gr>' ]
		, values       : S.bluetoothconf
		, checkchanged : S.bluetooth
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-wlan' ).click( function() {
	bash( 'cat /srv/http/assets/data/regdomcodes.json', list => {
		var options  = '';
		$.each( list, ( k, v ) => options += '<option value="'+ k +'">'+ v +'</option>' );
		var infowifi = `\
<table>
<tr><td style="padding-right: 5px; text-align: right;">Country</td><td><select>${ options }</select></td></tr>
<tr><td></td><td><label><input type="checkbox">Auto start Access Point</label></td></tr>
</table>`;
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, content      : infowifi
			, boxwidth     : 250
			, values       : S.wlanconf
			, checkchanged : S.wlan
			, beforeshow   : () => selectText2Html( { '00': '00 <gr>(allowed worldwide)</gr>' } )
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#i2smodulesw' ).click( function() {
	setTimeout( () => { // delay to show switch sliding
		$( '#i2smodulesw' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' ).removeClass( 'hide' );
		$( '#i2smodule' ).select2( 'open' );
	}, 200 );
} );
$( '#i2smodule' ).change( function() {
	var aplayname = $( this ).val();
	var output    = $( this ).find( ':selected' ).text();
	var icon      = 'volume';
	var title     = 'Audio I&#178;S';
	if ( aplayname !== 'none' ) {
		notify( icon, title, 'Enable ...' );
	} else {
		aplayname = 'onboard';
		output = '';
		notify( icon, title, 'Disable ...' );
		i2sSelectHide();
	}
	bash( [ 'i2smodule', aplayname, output ] );
} );
$( '#setting-i2smodule' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Disable I²S HAT EEPROM read' ]
		, values       : S.i2seeprom
		, checkchanged : S.i2seeprom
		, ok           : () => bash( [ 'i2seeprom', infoVal() ] )
	} );
} );
$( '#gpioimgtxt' ).click( function() {
	if ( $( '#gpiopin' ).is( ':hidden' ) && $( '#gpiopin1' ).is( ':hidden' ) ) {
		$( '#gpiopin' ).slideToggle();
		$( '#fliptxt, #close-img' ).toggle();
	} else {
		$( '#gpiopin, #gpiopin1' ).css( 'display', 'none' );
		$( '#fliptxt' ).hide();
	}
	$( this ).find( 'i' ).toggleClass( 'i-chevron-down i-chevron-up' );
} );
$( '#gpiopin, #gpiopin1' ).click( function() {
	$( '#gpiopin, #gpiopin1' ).toggle();
} );
$( '#setting-lcdchar' ).click( function() {
	var i2caddress  = '<td>Address</td>';
	if ( ! S.lcdcharaddr ) S.lcdcharaddr = [ 39, 63 ];
	S.lcdcharaddr.forEach( el => i2caddress += '<td><label><input type="radio" name="address" value="'+ el +'">0x'+ el.toString( 16 ) +'</label></td>' );
	var optpins  = '<select>';
	Object.keys( pin2gpio ).forEach( k => optpins += '<option value='+ k +'>'+ k +'</option>' ); // only lcdchar uses j8 pin number
	optpins     += '</select>';
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
<tr id="i2caddress" class="i2c">${ i2caddress }</tr>
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
<label style="margin-left: 60px"><input id="backlight" type="checkbox">Sleep <gr>(60s)</gr></label></td></tr>`;
	// cols charmap inf address chip pin_rs pin_rw pin_e pins_data backlight
	var i2c         = S.lcdcharconf[ 2 ] !== 'gpio';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : infolcdchar
		, boxwidth     : 180
		, values       : S.lcdcharconf || [ 20, 'A00', 'i2c', 39, 'PCF8574', 15, 18, 16, 21, 22, 23, 24, false ]
		, checkchanged : S.lcdchar
		, beforeshow   : () => {
			if ( ! S.lcdcharreboot ) {
				$( '#infoOk' )
					.before( '<gr id="lcdlogo">'+ ico( 'raudio i-lg wh' ) +'&ensp;Logo</gr>&ensp;' )
					.after( '&emsp;<gr id="lcdsleep">'+ ico( 'screenoff i-lg wh' ) +'&ensp;Sleep</gr>' );
				$( '#infoButtons gr' ).click( function() {
					var action = this.id === 'lcdlogo' ? 'logo' : 'off';
					bash( dirbash +"system.sh lcdcharset$'\n'"+ action );
				} );
			}
			$( '#infoContent .gpio td:even' ).css( 'width', 55 );
			$( '#infoContent .gpio td:odd' ).css( {
				  width           : 35
				, 'padding-right' : 2
				, 'text-align'    : 'right'
			} );
			$( '#infoContent svg .power' ).remove();
			$( '.i2c' ).toggleClass( 'hide', ! i2c );
			$( '.gpio' ).toggleClass( 'hide', i2c );
			$( '#infoContent input[name=inf]' ).change( function() {
				i2c = $( '#infoContent input[name=inf]:checked' ).val() === 'i2c';
				$( '.i2c' ).toggleClass( 'hide', ! i2c );
				$( '.gpio' ).toggleClass( 'hide', i2c );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-powerbutton' ).click( function() {
	var offpin  = '';
	var ledpin  = '';
	var respin  = '';
	$.each( pin2gpio, ( k, v ) => {
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
<label><input id="audiophonics" type="checkbox">Button by Audiophonics</label>
`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : gpiosvg + infopowerbutton
		, boxwidth     : 80
		, values       : S.powerbuttonconf || [ 5, 5, 40, 5, false ]
		, checkchanged : S.powerbutton
		, beforeshow   : () => {
			if ( ! S.powerbuttonconf[ 3 ] ) {
				$( '#infoContent .reserved' ).toggleClass( 'hide', S.powerbuttonconf[ 0 ] == 5 );
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
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-relays' ).click( function() {
	location.href = 'settings.php?p=relays';
} );
$( '#setting-rotaryencoder' ).click( function() {
	var pin  = '<td colspan="3"><select >';
	$.each( pin2gpio, ( k, v ) => pin += '<option value='+ v +'>'+ k +'</option>' );
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
		  icon         : SW.icon
		, title        : SW.title
		, content      : gpiosvg + inforotaryencoder
		, boxwidth     : 90
		, values       : S.rotaryencoderconf || [ 27, 22 ,23 ,1 ]
		, checkchanged : S.rotaryencoder
		, beforeshow   : () => $( '#infoContent svg .power' ).remove()
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-mpdoled' ).click( function() {
	var buttonlogo = S.mpdoled && ! S.mpdoledreboot;
	info( {
		  icon         : SW.icon
		, title        : SW.title
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
		, values       : S.mpdoledconf
		, checkchanged : S.mpdoled
		, boxwidth     : 140
		, beforeshow   : () => {
			var i2c = ! S.mpdoled || ( S.mpdoled && S.mpdoledconf[ 1 ] );
			$( '.baud' ).toggleClass( 'hide', ! i2c );
			$( '.oledchip' ).change( function() {
				var val = $( this ).val();
				$( '.baud' ).toggleClass( 'hide', val < 3 || val > 6 );
			} );
		}
		, cancel       : switchCancel
		, buttonlabel  : buttonlogo ? ico( 'raudio' ) +'Logo' : ''
		, button       : buttonlogo ? () => bash( [ 'mpdoledlogo' ] ) : ''
		, ok           : switchEnable
	} );
} );
$( '#setting-lcd' ).click( function() {
	var buttoncalibrate = S.lcd && ! S.lcdreboot;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, selectlabel  : 'Type'
		, select       : {
			  'Generic'               : 'tft35a'
			, 'Waveshare (A)'         : 'waveshare35a'
			, 'Waveshare (B)'         : 'waveshare35b'
			, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
			, 'Waveshare (C)'         : 'waveshare35c'
		}
		, values       : S.lcdmodel || 'tft35a'
		, checkchanged : S.lcd
		, boxwidth     : 190
		, buttonlabel  : ! buttoncalibrate ? '' : 'Calibrate'
		, button       : ! buttoncalibrate ? '' : () => {
			info( {
				  icon    : SW.icon
				, title   : SW.title
				, message : 'Calibrate touchscreen?'
							+'<br>(Get stylus ready.)'
				, ok      : () => {
					notify( SW.icon, 'Calibrate Touchscreen', 'Start ...' );
					bash( [ 'lcdcalibrate' ] );
				}
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-vuled' ).click( function() {
	var opt  = '';
	$.each( pin2gpio, ( k, v ) => opt += '<option value="'+ v +'">'+ k +'</option>' );
	var htmlpins = '';
	for ( i = 1; i < 8; i++ ) {
		htmlpins += '<tr><td>'+ i +'/7</td><td><select>'+ opt +'</select></td></tr>';
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : gpiosvg
		, select       : htmlpins
		, values       : S.vuledconf || [ 14, 15, 18, 23, 24, 25, 8 ]
		, checkchanged : S.vuled
		, boxwidth     : 80
		, cancel       : switchCancel
		, ok           : switchEnable
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
		, beforeshow : () => {
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
	var icon  = 'system';
	var title = 'Player Name';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : 'Name'
		, focus        : 0
		, values       : S.hostname
		, checkblank   : 1
		, checkchanged : 1
		, beforeshow   : () => {
			$( '#infoContent input' ).keyup( function() {
				$( this ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
			} );
		}
		, ok           : () => {
			notify( icon, title, 'Change ...' );
			bash( [ 'hostname', infoVal() ] );
		}
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'globe', 'Timezone', 'Change ...' );
	bash( [ 'timezone', $( this ).val() ] );
} );
$( '#setting-timezone' ).click( function() {
	if ( S.soc === 'BCM2835' || S.soc === 'BCM2836' ) { // rpi 0, 1
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, textlabel    : 'NTP'
			, boxwidth     : 300
			, values       : S.ntp
			, checkchanged : 1
			, checkblank   : 1
			, ok           : () => {
				notify( SW.icon, SW.title, 'Sync ...' );
				bash( [ 'servers', infoVal() ], bannerHide );
			}
		} );
		return
	}
	
	bash( [ 'mirrorlist' ], list => {
		var lL         = list.code.length;
		var selecthtml = '<select>';
		for ( i = 0; i < lL; i++ ) selecthtml += '<option value="'+ list.code[ i ] +'">'+ list.country[ i ] +'</option>';
		selecthtml    += '</select>';
		var content    = `
<table>
<tr><td>NTP</td><td><input type="text"></td></tr>
<tr><td>Package</td><td>${ selecthtml }</td></tr>
</table>`
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, content      : content
			, boxwidth     : 240
			, values       : [ S.ntp, list.mirror ]
			, checkchanged : 1
			, checkblank   : [ 0 ]
			, beforeshow   : () => selectText2Html( { Auto: 'Auto <gr>(by Geo-IP)</gr>' } )
			, ok           : () => {
				var values = infoVal();
				values[ 0 ] !== S.ntp ? notify( SW.icon, SW.title, 'Sync ...' ) : notify( SW.icon, 'Package Server', 'Change ...' );
				bash( [ 'servers', ...values ], bannerHide );
			}
		} );
		bannerHide();
	}, 'json' );
} );
$( '#setting-soundprofile' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : [ 'vm.swappiness', 'lan mtu', 'lan txqueuelen' ]
		, boxwidth     : 110
		, values       : S.soundprofileconf
		, checkchanged : S.soundprofile
		, checkblank   : 1
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#backup' ).click( function() {
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : 'Save all data and settings to file?'
		, ok      : () => {
			notify( SW.icon, SW.title, 'Process ...' );
			bash( '/srv/http/bash/settings/system-databackup.sh', data => {
				if ( data == 1 ) {
					notify( SW.icon, SW.title, 'Download ...' );
					fetch( '/data/shm/backup.gz' )
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
								  icon    : SW.icon
								, title   : SW.title
								, message : iconwarning +'File download failed.'
							} );
							bannerHide();
						} );
				} else {
					info( {
						  icon    : SW.icon
						, title   : SW.title
						, message : 'Backup failed.'
					} );
					bannerHide();
				}
			} );
		}
	} );
	$( '#backup' ).prop( 'checked', 0 );
} );
$( '#restore' ).click( function() {
	info( {
		  icon        : SW.icon
		, title       : SW.title
		, message     : 'Restore from:'
		, radio       : {
			  'Backup file <code>*.gz</code>' : 'restore'
			, 'Reset to default'              : 'reset'
		}
		, values      : 'restore'
		, fileoklabel : ico( 'restore' ) +'Restore'
		, filetype    : '.gz'
		, beforeshow  : () => {
			$( '#infoContent input' ).click( function() {
				if ( infoVal() === 'reset' ) {
					$( '#infoFilename' ).addClass( 'hide' );
					$( '#infoFileBox' ).val( '' );
					$( '#infoFileLabel' ).addClass( 'hide infobtn-primary' );
					$( '#infoOk' )
						.html( ico( 'reset' ) +'Reset' )
						.css( 'background-color', orange )
						.removeClass( 'hide' );
				} else {
					$( '#infoOk' )
						.html( ico( 'restore' ) +'Restore' )
						.css( 'background-color', '' )
						.addClass( 'hide' );
					$( '#infoFileLabel' ).removeClass( 'hide' );
				}
			} );
		}
		, ok          : () => {
			if ( infoVal() === 'reset' ) {
				bash( '/srv/http/bash/settings/system-datareset.sh' );
				notify( SW.icon, SW.title, 'Reset to default ...' );
			} else {
				notify( SW.icon, SW.title, 'Restore ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'datarestore' );
				formdata.append( 'file', I.infofile );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( result => { // -1 / -2 = errors
						if ( result == -1 ) {
							info( {
								  icon    : SW.icon
								, title   : SW.title
								, message : iconwarning +' Upload failed.'
							} );
						} else if ( result == -2 ) {
							info( {
								  icon    : SW.icon
								, title   : SW.title
								, message : iconwarning +' Restore failed.'
							} );
						}
						bannerHide();
					} );
			}
			setTimeout( loader, 0 );
		}
	} );
	$( '#restore' ).prop( 'checked', 0 );
} );
$( '#shareddata' ).click( function() {
	var $this = $( this );
	if ( $this.hasClass( 'disabled' ) ) {
		$( '#shareddata' ).prop( 'checked', false );
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : $this.prev().html()
		} );
		return
	}
	
	if ( S.shareddata ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : 'Disable and restore local data?'
			, cancel  : () => $this.prop( 'checked', true )
			, okcolor : orange
			, ok      : () => {
				bash( [ 'shareddatadisconnect', 'disable' ] );
				notify( SW.icon, SW.title, 'Disable ...' );
			}
		} );
	} else {
		infoMount( 'shareddata' );
	}
} );
$( '.listtitle' ).click( function( e ) {
	var $this    = $( this );
	var $chevron = $this.find( 'i' );
	var $list    = $this.next();
	var $target  = $( e.target );
	if ( ! $this.hasClass( 'backend' ) ) { // js
		$list.toggleClass( 'hide' )
		$chevron.toggleClass( 'i-chevron-down i-chevron-up' );
		if ( localhost ) $( '.list a' ).remove();
	} else if ( $target.is( 'a' ) ) { // package
		var active = $target.hasClass( 'wh' );
		$( '.listtitle a' ).removeAttr( 'class' );
		if ( active ) {
			$list.empty();
			return
		}
		
		bash( [ 'packagelist', $target.text() ], list => {
			$list.html( list );
			$target.addClass( 'wh' );
			if ( localhost ) $( '.list a' ).removeAttr( 'href' );
		} );
	} else {
		$list.add( $chevron ).addClass( 'hide' );
		$( '.listtitle a' ).removeAttr( 'class' );
	}
} );
$( '#i2smodule, #timezone' ).on( 'select2:opening', function () { // temp css for dropdown width
	$( 'head' ).append( `
<style class="tmp">
.select2-results { width: 330px }
.select2-dropdown {
	width: fit-content !important;
	min-width: 100%;
</style>
` );
} ).on( 'select2:close', function ( e ) {
	$( 'style.tmp' ).remove();
	if ( this.id === 'i2smodule' && this.value === 'none' ) i2sSelectHide();
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

function i2sSelectHide() {
	$( '#divi2smodulesw' ).removeClass( 'hide' );
	$( '#divi2smodule' ).addClass( 'hide' );
}
function infoMount( val ) {
	var ip     = $( '#list' ).data( 'ip' );
	var ipsub  = ip.substring( 0, ip.lastIndexOf( '.' ) + 1 );
	if ( val === 'raudio' ) {
		var shareddata = true;
		var values     = [ 'raudio', 'data', ipsub ];
	} else if ( val === 'shareddata' ) {
		var shareddata = true;
		var values     = [ 'cifs', 'data', ipsub ];
	} else {
		var shareddata = false;
		var values     = val || [ 'cifs', '', ipsub ];
	}
	var htmlmount      = `\
<table id="tblinfomount">
<tr class="common"><td style="width: 90px">Type</td>
	<td style="width: 230px">
		<label><input type="radio" name="inforadio" value="cifs" checked>CIFS</label>&ensp;
		<label><input type="radio" name="inforadio" value="nfs">NFS</label>&ensp;
		<label><input type="radio" name="inforadio" value="raudio">rAudio</label>
	</td>
	<td style="width: 20px"></td>
</tr>
<tr class="common"><td>Name</td>
<td><input id="mountpoint" type="text" placeholder="for Library · NAS · 'Name'"></td>
</tr>
<tr class="common"><td>Server IP</td>
	<td><input type="text"></td>
</tr>
<tr class="cifs nfs"><td id="sharelabel">Share name</td>
	<td><input id="share" type="text"></td>
</tr>
<tr class="cifs"><td>User</td>
	<td><input type="text" placeholder="if required by server"></td>
</tr>
<tr class="cifs"><td>Password</td>
	<td><input type="password" placeholder="if required by server"></td><td>${ ico( 'eye' ) }</td>
</tr>
<tr class="cifs nfs"><td>Options</td>
	<td><input type="text" placeholder="if required by server"></td>
</tr>`;
	htmlmount += '</table>';
	var icon   = 'networks';
	var title  = shareddata ? 'Shared Data Server' : 'Add Network Storage';
	info( {
		  icon       : icon
		, title      : title
		, content    : htmlmount
		, values     : values
		, checkblank : [ 2 ]
		, checkip    : [ 1 ]
		, beforeshow : () => {
			if ( ! shareddata ) {
				$( '#infoContent label' ).eq( 2 ).remove();
			} else {
				$( '#mountpoint' ).prop( 'disabled', 1 );
			}
			var $mountpoint = $( '#mountpoint' );
			var $share = $( '#share' );
			function hideOptions( type ) {
				if ( ! values[ 3 ] ) $share.val( '' );
				$( '#infoContent tr' ).not( '.common' ).addClass( 'hide' );
				if ( type === 'nfs' ) {
					$( '#sharelabel' ).text( 'Share path' );
					$( '#infoContent' ).find( '.common, .nfs' ).removeClass( 'hide' );
					var placeholder = '/path/to/share on server';
				} else if ( type === 'cifs' ) {
					$( '#sharelabel' ).text( 'Share name' );
					$( '#infoContent' ).find( '.common, .cifs' ).removeClass( 'hide' );
					var placeholder = 'sharename on server';
				} else {
					if ( ! $share.val() ) $share.val( 0 ); // temp for checkblank
				}
				if ( ! values[ 3 ] ) $share.attr( 'placeholder', placeholder );
			}
			hideOptions( values[ 0 ] );
			$( '#infoContent input:radio' ).change( function() {
				hideOptions( $( this ).val() );
			} );
			$mountpoint.on( 'keyup paste', function() {
				setTimeout( () => $mountpoint.val( $mountpoint.val().replace( /\//g, '' ) ), 0 );
			} );
			$share.on( 'keyup paste', function() {
				setTimeout( () => {
					var slash = $( '#infoContent input[type=radio]:checked' ).val() === 'cifs' ? /[\/\\]/g : /\\/g;
					$share.val( $share.val().replace( slash, '' ) );
				}, 0 );
			} );
		}
		, cancel     : () => {
			if ( shareddata ) $( '#shareddata' ).prop( 'checked', false );
		}
		, ok         : () => {
			var values = infoVal();
			if ( values[ 0 ] === 'raudio' ) {
				var ip = values[ 2 ];
				notify( icon, title, 'Connect rAudio Sever ...' );
				bash( [ 'sharelist', ip ], list => {
					bannerHide();
					if ( list.slice( 0, 6 ) === 'Server' ) {
						info( {
							  icon    : icon
							, title   : title
							, message : list
										+'<br>Connect?'
							, cancel  : () => $( '#shareddata' ).prop( 'checked', false )
							, ok      : () => {
								bash( [ 'shareddataconnect', ip ] );
								notify( icon, title, 'Connect Server rAudio ...' );
							} 
						} );
					} else {
						info( {
							  icon    : icon
							, title   : title
							, message : list
							, cancel  : () => $( '#shareddata' ).prop( 'checked', false )
							, ok      : () => infoMount( 'raudio' )
						} );
					}
				} );
				return
			}
			
			bash( [ 'mount', ...values, shareddata ], error => { // system-mount.sh
				if ( error ) {
					info( {
						  icon    : icon
						, title   : title
						, message : error
						, ok      : () => infoMount( values )
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
			notify( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
		}
	} );
}
function renderPage() {
	$( '#codehddinfo' )
		.empty()
		.addClass( 'hide' );
	$( '#systemvalue' ).html( S.system );
	$( '#status' ).html( S.status + S.warning );
	$( '#warning' ).toggleClass( 'hide', S.warning === '' );
	var html  = '';
	$.each( S.list, ( i, val ) => {
		if ( val.mounted ) {
			var dataunmounted = '';
			var dot = '<grn>&ensp;•&ensp;</grn>';
		} else {
			var dataunmounted = ' data-unmounted="1"';
			var dot = '<red>&ensp;•&ensp;</red>';
		}
		html += '<li '+ dataunmounted;
		html += '>'+ ico( val.icon ) +'<wh class="mountpoint">'+ val.mountpoint +'</wh>'+ dot
		html += '<gr class="source">'+ val.source +'</gr>&ensp;';
		html +=  val.size ? val.size : '';
		html += val.nfs ? ' <gr>• NFS</gr>' : '';
		html += val.smb ? ' <gr>• SMB</gr>' : '';
		html += '</li>';
	} );
	$( '#list' ).html( html );
	$( '#divhddsleep' ).toggleClass( 'hide', $( '#list .i-usbdrive' ).length === 0 );
	$( '#hddsleep' ).toggleClass( 'disabled', ! S.hddapm );
	$( '#usbautoupdate' )
		.toggleClass( 'disabled', S.shareddata || S.nfsserver )
		.prev().html( 'wh'+ ( S.shareddata ? 'Server rAudio '+ ico( 'rserver' ) : 'Shared Data '+ ico( 'networks' ) ) +'</wh> is currently enabled.' );
	if ( 'bluetooth' in S || 'wlan' in S ) {
		if ( 'bluetooth' in S ) {
			$( '#bluetooth' ).parent().prev().toggleClass( 'single', ! S.bluetoothactive );
		} else {
			$( '#divbluetooth' ).addClass( 'hide' );
		}
		if ( 'wlan' in S ) {
			$( '#wlan' )
				.toggleClass( 'disabled', S.hostapd || S.wlanconnected )
				.prev().html( S.hostapd ? '<wh>Access Point '+ ico( 'accesspoint' ) +'</wh> is currently enabled.' :'Wi-Fi is currently connected.' );
			$( '#divwlan .col-l.status' ).toggleClass( 'single', ! S.wlan );
		} else {
			$( '#divwlan' ).addClass( 'hide' );
		}
	} else {
		$( '#divbluetooth' ).parent().addClass( 'hide' );
	}
	if ( 'audio' in S ) {
		$( '#audio' ).toggleClass( 'disabled', S.audio && ! S.audiocards );
	} else {
		$( '#divaudio' ).addClass( 'hide' );
	}
	$( '#i2smodule' ).val( 'none' );
	$( '#i2smodule option' ).filter( ( i, el ) => {
		var $this = $( el );
		return $this.text() === S.audiooutput && $this.val() === S.audioaplayname;
	} ).prop( 'selected', true );
	S.i2senabled = $( '#i2smodule' ).val() !== 'none';
	$( '#divi2smodulesw' ).toggleClass( 'hide', S.i2senabled );
	$( '#divi2smodule, #setting-i2smodule' ).toggleClass( 'hide', ! S.i2senabled );
	$( '#divsoundprofile' ).toggleClass( 'hide', ! S.soundprofileconf );
	$( '#hostname' ).val( S.hostname );
	$( '#avahiurl' ).text( S.hostname +'.local' );
	$( '#timezone' ).val( S.timezone );
	$( '#shareddata' ).toggleClass( 'disabled', S.nfsserver );
	$( '#setting-shareddata' ).remove();
	showContent();
}
function getStatus() {
	bash( [ 'statuscurrent' ], data => {
		S.status  = data.status;
		S.warning = data.warning;
		$( '#status' ).html( S.status + S.warning );
		$( '#warning' ).toggleClass( 'hide', S.warning === '' );
	}, 'json' );
}
