var default_v      = {
	  bluetooth     : {
		  DISCOVERABLE : true
		, FORMAT       : false 
	}
	, hddsleep      : {
		APM : 60
	}
	, lcdchar_gpio  : {
		  INF       :'gpio'
		, COLS      : 20
		, CHARMAP   : 'A00'
		, PIN_RS    : 15
		, PIN_RW    : 18
		, PIN_E     : 16
		, P0        : 21
		, P1        : 22
		, P2        : 23
		, P3        : 24
		, BACKLIGHT : false
	}
	, lcdchar_i2c   : {
		  INF       :'i2c'
		, COLS      : 20
		, CHARMAP   : 'A00'
		, ADDRESS   : '0x27'
		, CHIP      : 'PCF8574'
		, BACKLIGHT : false
	}
	, mountcifs     : {
		  PROTOCOL : 'cifs'
		, NAME     : ''
		, IP       : ''
		, SHARE    : ''
		, USER     : ''
		, PASSWORD : ''
		, OPTIONS  : '' 
	}
	, mountnfs      : {
		  PROTOCOL : 'nfs'
		, NAME     : ''
		, IP       : ''
		, SHARE    : ''
		, OPTIONS  : ''
	}
	, powerbutton   : {
		  ON       : 5
		, SW       : 5
		, LED      : 40
		, RESERVED : 5
	}
	, relays       : {
		  ON0   : 11
		, OFF0  : 16
		, OND0  : 2
		, OFFD0 : 2
		, ON1   : 13
		, OFF1  : 15
		, OND1  : 2
		, OFFD1 : 2
		, ON2   : 15
		, OFF2  : 13
		, OND2  : 2
		, OFFD2 : 2
		, ON3   : 16
		, OFF3  : 11
		, TIMER : 5
	}
	, relaysname    : {
		  "11" : "DAC"
		, "13" : "PreAmp"
		, "15" : "Amp"
		, "16" : "Subwoofer"
	}
	, rotaryencoder : {
		  PINA : 27
		, PINB : 22
		, PINS : 23
		, STRP : 1
	}
	, softlimit     : {
		SOFTLIMIT : 60
	}
	, vuled         : {
		  P0 : 14
		, P1 : 15
		, P2 : 18
		, P3 : 23
		, P4 : 24
		, P5 : 25
		, P6 : 8
	}
	, wlan          : {
		  REGDOM : '00'
		, APAUTO : true
	}
}
var gpiosvg        = $( '#gpiosvg' ).html().replace( 'width="380px', 'width="330px' );
var board2bcm      = {
	   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
	, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
}
var html_optionpin = htmlOption( board2bcm );
var html_boardpin  = htmlOption( Object.keys( board2bcm ) );

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
$( '.close' ).off( 'click' ).click( function() { // off close in settings.js
	bash( [ 'rebootlist' ], list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		info( {
			  icon    : page
			, title   : 'System Setting'
			, message : 'Reboot required for:<br><br>'
						+'<pre><wh>'+ list +'</wh></pre>'
			, cancel  : () => location.href = '/'
			, okcolor : orange
			, oklabel : ico( 'reboot' ) +'Reboot'
			, ok      : () => infoPowerCommand( 'reboot' )
		} );
	} );
} );
$( '.power' ).click( infoPower );
$( '.img' ).click( function() {
	var name             = $( this ).data( 'name' );
	var txtlcdchar       = `\
<code>GND:(any black pin)</code>
<wh>I²C:</wh> <code>VCC:1</code> <code>SDA:3</code> <code>SCL:5</code> <code>5V:4</code>
<wh>GPIO:</wh> <code>VCC:4</code> <code>RS:15</code> <code>RW:18</code> <code>E:16</code> <code>D4-7:21-24</code>`;
	var txtmpdoled       = `\
<code>GND:(any black pin)</code> <code>VCC:1</code>
<wh>I²C:</wh> <code>SCL:5</code> <code>SDA:3</code>
<wh>SPI:</wh> <code>CLK:23</code> <code>MOS:19</code> <code>RES:22</code> <code>DC:18</code> <code>CS:24</code>`;
	var txtrotaryencoder = `
<code>GND: (any black pin)</code> &emsp; <code>+: not use</code>`
	var title = {
		  i2cbackpack   : [ 'Character LCD',  '',               'lcdchar' ]
		, lcdchar       : [ 'Character LCD',  txtlcdchar ]
		, relays        : [ 'Relays Module' ]
		, rotaryencoder : [ 'Rorary Encoder', txtrotaryencoder, 'volume' ]
		, lcd           : [ 'TFT 3.5" LCD' ]
		, mpdoled       : [ 'Spectrum OLED',  txtmpdoled ]
		, powerbutton   : [ 'Power Button',   '',               'power', '300px', 'svg' ]
		, vuled         : [ 'VU LED',         '',               'led',   '300px', 'svg' ]
	}
	var d                = title[ name ];
	info( {
		  icon        : d[ 2 ] || name
		, title       : d[ 0 ]
		, message     : '<img src="/assets/img/'+ name +'.'+ ( d[ 4 ] || 'jpg' )
						+'" style="height: '+ ( d[ 3 ] || '100%' ) +'; margin-bottom: 0;">'
		, footer      : [ 'lcdchar', 'rotaryencoder', 'mpdoled' ].includes( name ) ? gpiosvg + d[ 1 ] : ''
		, footeralign : 'left'
		, beforeshow  : () => $( '.'+ name +'-no' ).addClass( 'hide' )
		, okno        : true
	} );
} );
$( '.refresh' ).click( function() {
	var $this = $( this );
	if ( $this.hasClass( 'blink' ) ) {
		clearInterval( V.intstatus );
		$this.removeClass( 'blink wh' )
		return
	}
	
	$this.addClass( 'blink wh' )
	V.intstatus = setInterval( () => bash( [ 'settings/system-data.sh', 'status' ] ), 10000 );
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
			bash( [ 'mountforget', mountpoint, 'CMD MOUNTPOINT' ] );
			break;
		case 'info':
			var $code = $( '#codehddinfo' );
			if ( $code.hasClass( 'hide' ) ) {
				bash( [ 'hddinfo', source, 'CMD DEV' ], data => {
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
			bash( [ 'mountremount', mountpoint, source, 'CMD MOUNTPOINT SOURCE' ] );
			break;
		case 'unmount':
			notify( icon, title, 'Unmount ...' )
			bash( [ 'mountunmount', mountpoint, 'CMD MOUNTPOINT' ] );
			break;
	}
} );
$( '#setting-softlimit' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, radio        : { '65°C': 65, '70°C': 70, '75°C': 75 }
		, values       : S.softlimitconf || default_v.softlimit
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
		, values       : { APM: S.hddsleep } || default_v.hddsleep
		, checkchanged : S.hddsleep
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-bluetooth' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Discoverable <gr>by senders</gr>', 'Sampling 16bit 44.1kHz <gr>to receivers</gr>' ]
		, values       : S.bluetoothconf || default_v.bluetooth
		, checkchanged : S.bluetooth
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-wlan' ).click( function() {
	bash( [ 'regdomlist' ], list => {
		var options  = htmlOption( list );
		var infowifi = `\
<table>
<tr><td>Country</td><td><select>${ options }</select></td></tr>
<tr><td></td><td><label><input type="checkbox">Auto start Access Point</label></td></tr>
</table>`;
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, content      : infowifi
			, boxwidth     : 250
			, values       : S.wlanconf || default_v.wlan
			, checkchanged : S.wlan
			, beforeshow   : () => selectText2Html( { '00': '00 <gr>(allowed worldwide)</gr>' } )
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#i2smodulesw' ).click( function() {
	setTimeout( i2sOptionSet, 0 );
} );
$( '#i2smodule' ).change( function() {
	var aplayname = $( this ).val();
	var output    = $( this ).find( ':selected' ).text();
	var icon      = 'volume';
	var title     = 'Audio I&#178;S';
	if ( aplayname !== 'none' ) {
		notify( icon, title, 'Enable ...' );
	} else {
		notify( icon, title, 'Disable ...' );
		S.i2smodulesw = false;
		aplayname = 'onboard';
		output = '';
		i2sSelectHide();
	}
	bash( [ 'i2smodule', aplayname, output, 'CMD APLAYNAME OUTPUT' ] );
} );
$( '#divi2s .col-r' ).click( function( e ) {
	if ( $( e.target ).parents( '.select2' ).length ) i2sOptionSet();
} );
$( '#setting-i2smodule' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Disable I²S HAT EEPROM read' ]
		, values       : S.i2seeprom
		, checkchanged : S.i2seeprom
		, ok           : () => bash( infoVal() ? [ 'i2seeprom' ] : [ 'i2seeprom', 'OFF' ] )
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
	if ( S.lcdcharconf ) {
		S.lcdcharconf.INF === 'i2c' ? infoLcdChar() : infoLcdCharGpio();
	} else {
		infoLcdChar();
	}
} );
$( '#setting-powerbutton' ).click( function() {
	S.poweraudiophonics ? infoPowerbuttonAudiophonics() : infoPowerbutton();
} );
$( '#setting-relays' ).click( function() {
	S.relays ? infoRelays() : infoRelaysName();
} );
$( '#setting-rotaryencoder' ).click( function() {
	var pin  = '<td><select >'+ html_optionpin +'</select></td>';
	var inforotaryencoder = `\
<table>
<tr><td width="60">CLK</td>${ pin }</tr>
<tr><td>DT</td>${ pin }</tr>
<tr><td>SW</td>${ pin }</tr>
<tr><td>Step</td>
	<td><label><input type="radio" name="step" value="1">1%</label></td>
	<td><label><input type="radio" name="step" value="2">2%</label></td>
</tr>
</table>`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : gpiosvg + inforotaryencoder
		, boxwidth     : 70
		, values       : S.rotaryencoderconf || default_v.rotaryencoder
		, checkchanged : S.rotaryencoder
		, beforeshow   : () => $( '#infoContent svg .power' ).remove()
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-mpdoled' ).click( function() {
	var buttonlogo = S.mpdoled && ! S.mpdoledreboot;
	var chip       = {
		  'SSD130x SP'  : 1
		, 'SSD130x I²C' : 3
		, 'Seeed I²C'   : 4
		, 'SH1106 I²C'  : 6
		, 'SH1106 SPI'  : 7
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, selectlabel  : [ 'Controller', 'Refresh <gr>(baud)</gr>' ]
		, select       : [ chip, [ 800000, 1000000, 1200000 ] ]
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
$( '#setting-tft' ).click( function() {
	var buttoncalibrate = S.tft && ! S.tftreboot;
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
		, values       : S.tftconf || 'tft35a'
		, checkchanged : S.tft
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
					bash( [ 'tftcalibrate' ] );
				}
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-vuled' ).click( function() {
	var htmlpins = '';
	for ( i = 1; i < 8; i++ ) {
		htmlpins += '<tr><td>'+ i +'<gr>/7</gr></td><td><select>'+ html_optionpin +'</select></td></tr>';
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : gpiosvg +'<table>'+ htmlpins +'</table>'
		, values       : S.vuledconf || default_v.vuled
		, checkchanged : S.vuled
		, boxwidth     : 70
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
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
				.on( 'keyup paste cut', function() {
					var fv = $( this ).val();
					if ( fv > 3.3 ) {
						var ohm = '( > 3.3V)';
					} else {
						var ohm = fv ? Math.round( ( 3.3 - fv ) / 0.005 ) : '';
					}
					$( '#infoContent input' ).eq( 3 ).val( ohm );
				} );
		}
		, okno       : true
	} );
} );
$( '#hostname' ).on( 'mousedown touchdown', function() {
	SW.id     = 'hostname';
	SW.icon  = 'system';
	SW.title = 'Player Name';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'Name'
		, focus        : 0
		, values       : { HOSTNAME: S.hostname }
		, checkblank   : true
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoContent input' ).on( 'keyup paste', function() {
				$( this ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
			} );
		}
		, ok           : switchEnable
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'globe', 'Timezone', 'Change ...' );
	bash( [ 'timezone', $( this ).val(), 'CMD TIMEZONE' ] );
} );
$( '#divtimezone .col-r' ).click( function( e ) {
	if ( ! $( e.target ).parents( '.select2' ).length || $( '#timezone option' ).length > 2 ) return
	
	$( '#timezone' ).select2( 'close' )
	$.post( 'cmd.php', { cmd: 'selecttimezone' }, function( data ) {
		$( '#timezone' )
			.html( data )
			.val( S.timezone )
			.select2( 'open' );
	} );
} );
$( '#setting-timezone' ).click( function() {
	if ( 'htmlmirror' in V || S.rpi01 ) {
		infoNtpMirror();
	} else {
		notifyCommon( 'Get mirror server list ...' );
		bash( [ 'mirrorlist' ], list => {
			V.htmlmirror = htmlOption( list );
			infoNtpMirror();
			bannerHide();
		}, 'json' );
	}
} );
$( '#setting-soundprofile' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : [ 'Swappiness', 'Maximum Transmission Unit <gr>(B)</gr>', 'Transmit Queue Length' ]
		, boxwidth     : 80
		, values       : S.soundprofileconf
		, checkchanged : true
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#backup' ).click( function() {
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : 'Save all data and settings to file?'
		, ok      : () => {
			notifyCommon( 'Process ...' );
			bash( [ 'settings/system-databackup.sh' ], data => {
				if ( data == 1 ) {
					notifyCommon( 'Download ...' );
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
							infoWarning( SW.icon, SW.title, 'File download failed.' )
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
				notifyCommon( 'Reset to default ...' );
				bash( [ 'settings/system-datareset.sh' ] );
			} else {
				notifyCommon( 'Restore ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'datarestore' );
				formdata.append( 'file', I.infofile );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( result => { // -1 / -2 = errors
						infoWarning(  SW.icon,  SW.title, result == -1 ? 'Upload failed.' : 'Restore failed.' )
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
		infoDisabled( $this );
	} else if ( S.shareddata ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : 'Disable and restore local data?'
			, cancel  : () => $this.prop( 'checked', true )
			, okcolor : orange
			, ok      : () => {
				notifyCommon( 'Disable ...' );
				bash( [ 'shareddatadisconnect', 'OFF' ] );
			}
		} );
	} else {
		V.shareddata = true;
		infoMount();
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
		
		bash( [ 'packagelist', $target.text().toLowerCase(), 'CMD PKG' ], list => {
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

function i2sOptionSet() {
	if ( $( '#i2smodule option' ).length > 2 ) {
		if ( $( '#divi2smodule' ).hasClass( 'hide' ) ) {
			i2sSelectShow();
			$( '#i2smodule' ).select2( 'open' );
		}
	} else {
		$( '#i2smodule' ).select2( 'close' );
		$.post( 'cmd.php', { cmd: 'selecti2s' }, function( data ) {
			$( '#i2smodule' ).html( data );
			$( '#i2smodule option' ).filter( ( i, el ) => { // for 1 value : multiple names
				var $this = $( el );
				return $this.text() === S.audiooutput && $this.val() === S.audioaplayname;
			} ).prop( 'selected', true );
			i2sSelectShow();
			$( '#i2smodule' ).select2( 'open' );
		} );
	}
}
function i2sSelectHide() {
	$( '#i2smodulesw' ).prop( 'checked', S.i2smodulesw );
	$( '#divi2smodulesw' ).removeClass( 'hide' );
	$( '#divi2smodule' ).addClass( 'hide' );
}
function i2sSelectShow() {
	$( '#divi2smodulesw' ).addClass( 'hide' );
	$( '#divi2smodule, #setting-i2smodule' ).removeClass( 'hide' );
}
var htmllcdchar = {
	  common : `
<input type="hidden" value="">
<table>
<tr id="cols"><td width="115">Size</td>
	<td width="90"><label><input type="radio" name="cols" value="20">20x4</label></td>
	<td width="90"><label><input type="radio" name="cols" value="16">16x2</label></td>
</tr>
<tr><td>Char<wide>acter</wide> Map</td>
	<td><label><input type="radio" name="charmap" value="A00">A00</label></td>
	<td><label><input type="radio" name="charmap" value="A02">A02</label></td>
</tr>`
	, sleep  : `\
</table>
<label style="margin-left: 40px"><input id="backlight" type="checkbox">Sleep <gr>(60s)</gr></label>`
}
function htmlOption( values ) {
	var options = '';
	if ( Array.isArray( values ) ) {
		values.forEach( v => options += '<option value="'+ v +'">'+ v +'</option>' );
	} else {
		$.each( values, ( k, v ) => options += '<option value="'+ v +'">'+ k +'</option>' );
	}
	return options
}
function infoLcdChar() {
	var lcdcharaddr = S.lcdcharaddr || [ 39, 63 ];
	var i2caddress  = '';
	lcdcharaddr.forEach( el => {
		i2caddress += '<td><label><input type="radio" name="address" value="'+ el +'">0x'+ el.toString( 16 ) +'</label></td>';
	} );
	var options = htmlOption( [ 'PCF8574', 'MCP23008', 'MCP23017' ] );
	var content = `
${ htmllcdchar.common }
<tr id="i2caddress" class="i2c"><td>Address</td>${ i2caddress }</tr>
<tr class="i2c"><td>I&#178;C Chip</td>
	<td colspan="2"><select id="i2cchip">${ options }</select></td>
</tr>
${ htmllcdchar.sleep }
`;
	var inf_i2c = S.lcdcharconf.INF === 'i2c';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'I&#178;C', 'GPIO' ]
		, tab          : [ '', infoLcdCharGpio ]
		, content      : content
		, boxwidth     : 180
		, values       : inf_i2c ? S.lcdcharconf : default_v.lcdchar_i2c
		, checkchanged : S.lcdchar && inf_i2c
		, beforeshow   : infoLcdcharButton
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
}
function infoLcdCharGpio() {
	var optpins = '<select>'+ html_optionpin +'</select>';
	var content = `
${ gpiosvg }
${ htmllcdchar.common }
</table>
<table class="gpio">
<tr><td>RS</td><td>${ optpins }</td><td>RW</td><td>${ optpins }</td><td>E</td><td>${ optpins }</td><td></td><td></td></tr>
<tr><td>D4</td><td>${ optpins }</td><td>D5</td><td>${ optpins }</td><td>D6</td><td>${ optpins }</td><td>D7</td><td>${ optpins }</td></tr>
${ htmllcdchar.sleep }
`;
	var inf_gpio = S.lcdcharconf.INF === 'gpio';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'I&#178;C', 'GPIO' ]
		, tab          : [ infoLcdChar, '' ]
		, content      : content
		, boxwidth     : 180
		, values       : inf_gpio ? S.lcdcharconf : default_v.lcdchar_gpio
		, checkchanged : S.lcdchar && inf_gpio
		, beforeshow   : infoLcdcharButton
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
}
function infoLcdcharButton() {
	$( '#infoContent svg .power' ).remove();
	if ( ! S.lcdchar || S.lcdcharreboot ) return
	
	$( '#infoOk' )
		.before( '<gr id="lcdlogo">'+ ico( 'raudio i-lg wh' ) +'&ensp;Logo</gr>&ensp;' )
		.after( '&emsp;<gr id="lcdoff">'+ ico( 'screenoff i-lg wh' ) +'&ensp;Sleep</gr>' );
	$( '#lcdlogo, #lcdoff' ).click( function() {
		bash( [ 'lcdchar.py', this.id.slice( 3 ) ] )
	} );
}
var contentmount = {
	  common     : `\
<input type="hidden">
<table>
<tr><td style="width: 90px">Name</td>
<td><input id="mountpoint" type="text" placeholder="for&ensp;&#xF506;&ensp;·&ensp;&#xF551;&ensp;NAS / Name /" style="font-family: rern, Lato;"></td>
</tr>
<tr><td>Server IP</td>
	<td><input type="text"></td>
</tr>
<tr><td id="sharelabel">Share</td>
	<td><input id="share" type="text" placeholder="Share name/path on server"></td>
</tr>`
	, cifs       : `\
<tr><td>User</td>
	<td><input type="text" placeholder="if required by server"></td>
</tr>
<tr><td>Password</td>
	<td><input type="password" placeholder="if required by server"></td>
</tr>`
	, option     : `\
<tr><td>Options</td>
	<td><input type="text" placeholder="if required by server"></td>
</tr>
</table>`
	, shareddata : '<input type="hidden">'
}
function infoMount( values ) {
	if ( ! values ) {
		var nfs    = false;
		var values = default_v.mountcifs;
		values.IP  = S.ipsub;
	} else {
		var nfs    = values.PROTOCOL === 'nfs';
	}
	var icon       = 'networks';
	var tablabel   = [ 'CIFS', 'NFS' ];
	var tab        = nfs ? [ () => infoMountTab( 'nfs' ), '' ] : [ '', () => infoMountTab( 'cifs' ) ];
	var content    = contentmount.common + ( nfs ? '' : contentmount.cifs ) + contentmount.option;
	var shareddata = SW.id === 'shareddata';
	if ( shareddata ) {
		var title         = 'Shared Data Server';
		tablabel.push( 'rAudio' );
		tab.push( inforServer );
		content          += contentmount.shareddata
		values.SHAREDDATA = true;
	} else {
		var title = 'Add Network Storage';
	}
	info( {
		  icon       : icon
		, title      : title
		, tablabel   : tablabel
		, tab        : tab
		, content    : content
		, values     : values
		, checkblank : [ 0, 2 ]
		, checkip    : [ 1 ]
		, beforeshow : () => {
			var $mountpoint = $( '#mountpoint' );
			var $share = $( '#share' );
			if ( shareddata ) $mountpoint.val( 'data' ).prop( 'disabled', true );
			$mountpoint.on( 'keyup paste', function() {
				setTimeout( () => $mountpoint.val( $mountpoint.val().replace( /\//g, '' ) ), 0 );
			} );
			$share.on( 'keyup paste', function() {
				setTimeout( () => {
					var slash = $( '#infoContent input:radio:checked' ).val() === 'cifs' ? /^[\/\\]/ : /\\/g;
					$share.val( $share.val().replace( slash, '' ) );
				}, 0 );
			} );
		}
		, cancel     : switchCancel
		, ok         : () => {
			var infoval = infoVal();
			var keys = Object.keys( infoval );
			var vals = Object.values( infoval );
			notify( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
			bash( [ 'mount', ...vals, 'CMD '+ keys.join( ' ' ) ], error => {
				if ( error ) {
					info( {
						  icon    : icon
						, title   : title
						, message : error
						, ok      : () => infoMount( infoval )
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
		}
	} );
}
function infoMountTab( protocol ) {
	var v       = infoVal();
	if ( typeof v === 'string' ) v = default_v[ 'mount'+ protocol ]; // from rServer
	var nfs     = ! ( 'user' in v );
	var options = v.options;
	[ 'user', 'password', 'options', 'shareddata' ].forEach( k => delete v[ k ] );
	if ( nfs ) { // nfs to cifs
		v.protocol = 'cifs';
		v.user     = '';
		v.password = '';
	} else {
		v.protocol = 'nfs';
	}
	v.options   = options;
	infoMount( v );
}
function infoNtpMirror() {
	SW.id     = 'ntpmirror';
	SW.title = 'Servers';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'NTP'
		, selectlabel  : S.rpi01 ? '' : 'Mirror'
		, select       : S.rpi01 ? '' : V.htmlmirror
		, boxwidth     : 240
		, values       : S.rpi01 ? { NTP: S.ntp } : { NTP: S.ntp, MIRROR: S.mirror }
		, checkchanged : true
		, checkblank   : [ 0 ]
		, beforeshow   : () => {
			selectText2Html( { Auto: 'Auto <gr>(by Geo-IP)</gr>' } );
		}
		, ok           : switchEnable
	} );
}
function infoPowerbutton() {
	var optionpin = htmlOption( Object.keys( board2bcm ) );
	var infopowerbutton = `\
<table>
<tr><td width="40">On</td><td><input type="text" disabled></td></tr>
<tr><td>Off</td><td><select >${ optionpin }</select></td></tr>
<tr><td>LED</td><td><select >${ optionpin }</select></td></tr>
<tr class="reserved hide"><td>Reserved</td><td><select >${ optionpin }</select></td></tr>
</table>
`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Generic', 'Audiophonic' ]
		, tab          : [ '', infoPowerbuttonAudiophonics ]
		, content      : gpiosvg + infopowerbutton
		, boxwidth     : 70
		, values       : S.powerbuttonconf || default_v.powerbutton
		, checkchanged : S.powerbutton
		, beforeshow   : () => {
			$( '#infoContent .reserved' ).toggleClass( 'hide', S.powerbuttonconf.ON == 5 );
			$( '#infoContent select' ).eq( 0 ).change( function() {
				$( '#infoContent .reserved' ).toggleClass( 'hide', $( this ).val() == 5 );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
}
function infoPowerbuttonAudiophonics() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Generic', 'Audiophonic' ]
		, tab          : [ infoPowerbutton, '' ]
		, checkbox     : 'Power management module'
		, checkchanged : S.powerbutton
		, values       : S.poweraudiophonics
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function infoRelays() {
	var values       = S.relaysconf || jsonClone( default_v.relays );
	var name         = S.relaysnameconf || jsonClone( default_v.relaysname );
	var pL           = 0;
	var option_name  = '';
	$.each( name, ( k, v ) => {
		if ( v ) {
			option_name += '<option value="'+ k +'">'+ v +'</option>';
			pL++;
		}
	} );
	var option_delay = htmlOption( [ ...Array(10).keys() ] );
	var td_name      = '<td colspan="2"><select>'+ option_name +'</select></td>';
	var tr_name      = '<tr>'+ td_name + td_name +'</tr>';
	var td_delay     = '<td><select>'+ option_delay +'</select></td><td>sec.</td>';
	var tr_delay     = '<tr>'+ td_delay + td_delay +'</tr>';
	var content      = '<tr><td colspan="2">'+ ico( 'power grn' ) +' On</td><td colspan="2">'+ ico( 'power red' ) +' Off</td></tr>';
	for ( i = 0; i < pL; i++ ) {
		content += tr_name;
		if ( i < ( pL -1 ) ) content += tr_delay;
	}
	content += '<tr><td style="text-align: right">'+ ico( 'stoptimer yl' ) +' Idle</td><td><select>'+ option_delay +'</select></td>'
			  +'<td colspan="2">min. to '+ ico( 'power red' ) +' Off</td></tr>';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Sequence', 'Name' ]
		, tab          : [ '', infoRelaysName ]
		, content      : '<table>'+ content +'</table>'
		, contentcssno : true
		, values       : values
		, checkchanged : S.relays
		, beforeshow   : () => {
			$( '#infoContent td' ).css( { width: '90px', padding: '0 0 0 5px' } );
			$( 'tr:even .select2-selection__rendered' ).css( 'background', 'var( --cgd )' );
		}
		, cancel       : switchCancel
		, ok           : infoRelaysCmd
	} );
}
function infoRelaysCmd() {
	var keys    = [ 'ON', 'OFF', 'OND', 'OFFD' ];
	var infoval = infoVal();
	if ( 'ON0' in infoval ) {
		var pin  = infoval;
		var name = S.relaysnameconf || jsonClone( default_v.relaysname );
	} else {
		var pin  = S.relaysconf || jsonClone( default_v.relays );
		var name = {};
		infoval.forEach( ( el, i ) => i % 2 ? name[ p ] = el : p = el );
	}
	var v       = {};
	keys.forEach( k => v[ k ] = [] );
	var pL      = Object.values( name ).filter( Boolean ).length;
	for ( i = 0; i < pL; i++ ) {
		var pon    = pin[ 'ON'+ i ];
		var poff   = pin[ 'OFF'+ i ];
		var pdelay = i < pL -1;
		if ( name[ pon ] ) {
			v.ON.push( pon );
			if ( pdelay ) v.OND.push( pin[ 'OND'+ i ] );
		}
		if ( name[ poff ] ) {
			v.OFF.push( poff );
			if ( pdelay ) v.OFFD.push( pin[ 'OFFD'+ i ] );
		}
	}
	var values  = [];
	keys.forEach( k => values.push( v[ k ].join( ' ' ) ) );
	keys.push( 'TIMER' );
	values.push( pin.TIMER );
	notifyCommon();
	bash( { cmd: [ 'relays', ...values, 'CFG '+ keys.join( ' ' ) ], json: name } );
}
function infoRelaysName() {
	var name     = S.relaysnameconf || jsonClone( default_v.relaysname );
	var values   = [];
	$.each( name, ( k, v ) => values.push( k, v ) );
	var pin_name = '<tr><td><select>'+ html_boardpin +'</select></td><td><input type="text"></td></tr>';
	var content  = '<tr><td>'+ ico( 'gpiopins bl' ) +' Pin</td><td>'+ ico( 'tag bl' ) +' Name</td></tr>';
	for( i = 0; i < 4; i++ ) content += pin_name;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Sequence', 'Name' ]
		, tab          : [ infoRelays, '' ]
		, content      : gpiosvg + '<br>&nbsp;<table>'+ content +'</table><br>'
		, values       : values
		, checkchanged : S.relays
		, beforeshow   : () => {
			$( '#infoContent tr td:first-child' ).css( { 'text-align': 'left', width: '70px' } );
			$( '#infoContent tr td:last-child' ).css( 'width', '160px' );
		}
		, cancel       : switchCancel
		, ok           : infoRelaysCmd
	} );
}
function inforServer() {
	info( {
		  icon       : SW.icon
		, title      : SW.title
		, tablabel   : [ 'CIFS', 'NFS', 'rServer' ]
		, tab        : [ () => infoMountTab( 'nfs' ), () => infoMountTab( 'cifs' ), '' ]
		, textlabel  : 'Server IP'
		, values     : S.ipsub
		, checkip    : [ 1 ]
		, cancel     : switchCancel
		, ok         : () => {
			var ip = infoVal();
			notify( SW.icon, SW.title, 'Connect rAudio Sever ...' );
			bash( [ 'sharelist', ip, 'CMD IP' ], list => {
				var json = {
					  icon    : Sw.icon
					, title   : Sw.title
					, message : list
					, cancel  : switchCancel
					, ok      : inforServer
				}
				if ( list.slice( 0, 6 ) === 'Server' ) {
					json.message = list +'<br>Connect?'
					json.ok      = () => {
						notify( SW.icon, SW.title, 'Connect Server rAudio ...' );
						bash( [ 'shareddataconnect', ip, 'CMD IP' ] );
					}
				}
				info( json );
				bannerHide();
			} );
		}
	} );
}
function renderPage() {
	$( '#statustext' ).html( S.status + S.warning );
	$( '#warning' ).toggleClass( 'hide', S.warning === '' );
	$( '#codehddinfo' )
		.empty()
		.addClass( 'hide' );
	$( '#systemvalue' ).html( S.system );
	$( 'softlimit' in S ? '.softlimitno' : '#divsoftlimit, .softlimit' ).remove();
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
	if ( S.i2smodulesw ) {
		$( '#i2smodule' ).html( `
<option></option>
<option value="${ S.audioaplayname }" selected>${ S.audiooutput }</option>
` );
		i2sSelectShow();
	} else {
		i2sSelectHide();
	}
	$( '#divsoundprofile' ).toggleClass( 'hide', ! S.soundprofileconf );
	$( '#hostname' ).val( S.hostname );
	$( '#avahiurl' ).text( S.hostname +'.local' );
	if ( $( '#timezone option' ).length > 2 ) {
		$( '#timezone' ).val( S.timezone );
	} else {
		$( '#timezone' ).html( `
<option></option>
<option value="${ S.timezone }" selected>${ S.timezone.replace( /\//, ' &middot; ' ) +'&ensp;'+ S.timezoneoffset }</option>
` );
	}
	$( '#shareddata' ).toggleClass( 'disabled', S.nfsserver );
	$( '#setting-shareddata' ).remove();
	showContent();
}
