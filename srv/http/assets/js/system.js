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
		, ADDRESS   : 39
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
		, RESERVED : 29
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
		, STEP : 1
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
var tabshareddata = [ 'CIFS', 'NFS', ico( 'rserver' ) +' rAudio' ];

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( 'body' ).on( 'click', function( e ) {
	$( '#menu' ).addClass( 'hide' );
	if ( e.target.id !== 'codehddinfo' ) $( '#codehddinfo' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
	if ( ! $( e.target ).hasClass( 'select2-search__field' ) 
		&& ! $( e.target ).parents( '#divi2smodule' ).length 
		&& $( '#i2smodule' ).val() === 'none'
	) {
		i2sSelectHide();
	}
} ).on( 'keyup', function( e ) {
	if ( e.key === 'Escape' ) {
		$( 'select' ).select2( 'close' );
		i2sSelectHide();
	}
} );
$( '.close' ).off( 'click' ).on( 'click', function() { // off close in settings.js
	bash( [ 'rebootlist' ], list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		var line = '<wh>Reboot required for:</wh><p>';
		list.split( '\n' ).forEach( id => line += ico( id ) + $( '#div'+ id +' .name' ).text() +'\n' );
		info( {
			  icon    : page
			, title   : 'System Setting'
			, message : line +'</p>'
			, cancel  : () => location.href = '/'
			, okcolor : orange
			, oklabel : ico( 'reboot' ) +'Reboot'
			, ok      : () => infoPowerCommand( 'reboot' )
		} );
	} );
} );
$( '.power' ).on( 'click', infoPower );
$( '.img' ).on( 'click', function() {
	var name             = $( this ).data( 'name' );
	var txtlcdchar       = `\
<c>GND:(any black pin)</c>
<wh>I²C:</wh> <c>VCC:1</c> <c>SDA:3</c> <c>SCL:5</c> <c>5V:4</c>
<wh>GPIO:</wh> <c>VCC:4</c> <c>RS:15</c> <c>RW:18</c> <c>E:16</c> <c>D4-7:21-24</c>`;
	var txtmpdoled       = `\
<c>GND:(any black pin)</c> <c>VCC:1</c>
<wh>I²C:</wh> <c>SCL:5</c> <c>SDA:3</c>
<wh>SPI:</wh> <c>CLK:23</c> <c>MOS:19</c> <c>RES:22</c> <c>DC:18</c> <c>CS:24</c>`;
	var txtrotaryencoder = `
<c>GND: (any black pin)</c> &emsp; <c>+: not use</c>`
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
$( '.refresh' ).on( 'click', function() {
	var $this = $( this );
	if ( $this.hasClass( 'blink' ) ) {
		clearInterval( V.intstatus );
		$this.removeClass( 'blink wh' )
		return
	}
	
	$this.addClass( 'blink wh' )
	V.intstatus = setInterval( () => bash( [ 'settings/system-data.sh', 'status' ] ), 10000 );
} );
$( '.addnas' ).on( 'click', function() {
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
	$( '#menu .forget' ).toggleClass( 'hide', list.mountpoint.slice( 0, 13 ) !== '/mnt/MPD/NAS/' );
	$( '#menu .remount' ).toggleClass( 'hide', list.mounted );
	$( '#menu .unmount' ).toggleClass( 'hide', ! list.mounted );
	contextMenu();
} );
$( '#menu a' ).on( 'click', function() {
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
$( '#setting-softlimit' ).on( 'click', function() {
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
$( '#setting-hddsleep' ).on( 'click', function() {
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
$( '#setting-bluetooth' ).on( 'click', function() {
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
$( '#setting-wlan' ).on( 'click', function() {
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
$( '#divi2smodulesw' ).on( 'click', function() {
	setTimeout( i2sOptionSet, 0 );
} );
$( '#divi2s .col-r' ).on( 'click', function( e ) {
	if ( $( e.target ).parents( '.select2' ).length ) i2sOptionSet();
} );
$( '#i2smodule' ).on( 'change', function() {
	var aplayname = $( this ).val();
	var output    = $( this ).find( ':selected' ).text();
	var icon      = 'i2smodule';
	var title     = 'Audio - I²S';
	if ( aplayname !== 'none' ) {
		notify( icon, title, 'Enable ...' );
	} else {
		setTimeout( () => { notify( icon, title, 'Disable ...' ) }, 300 ); // fix - hide banner too soon
		S.i2smodulesw = false;
		aplayname = 'onboard';
		output = '';
		i2sSelectHide();
	}
	bash( [ 'i2smodule', aplayname, output, 'CMD APLAYNAME OUTPUT' ] );
} );
$( '#setting-i2smodule' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Disable I²S HAT EEPROM read' ]
		, values       : S.i2seeprom
		, checkchanged : S.i2seeprom
		, ok           : () => bash( infoVal() ? [ 'i2seeprom' ] : [ 'i2seeprom', 'OFF' ] )
	} );
} );
$( '#gpioimgtxt' ).on( 'click', function() {
	if ( $( '#gpiopin' ).is( ':hidden' ) && $( '#gpiopin1' ).is( ':hidden' ) ) {
		$( '#gpiopin' ).slideToggle();
		$( '#fliptxt, #close-img' ).toggle();
	} else {
		$( '#gpiopin, #gpiopin1' ).css( 'display', 'none' );
		$( '#fliptxt' ).hide();
	}
	$( this ).find( 'i' ).toggleClass( 'i-chevron-down i-chevron-up' );
} );
$( '#gpiopin, #gpiopin1' ).on( 'click', function() {
	$( '#gpiopin, #gpiopin1' ).toggle();
} );
$( '#setting-lcdchar' ).on( 'click', function() {
	if ( S.lcdcharconf ) {
		S.lcdcharconf.INF === 'i2c' ? infoLcdChar() : infoLcdCharGpio();
	} else {
		infoLcdChar();
	}
} );
$( '#setting-powerbutton' ).on( 'click', function() {
	S.poweraudiophonics ? infoPowerbuttonAudiophonics() : infoPowerbutton();
} );
$( '#setting-relays' ).on( 'click', function() {
	S.relays ? infoRelays() : infoRelaysName();
} );
$( '#setting-rotaryencoder' ).on( 'click', function() {
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
$( '#setting-mpdoled' ).on( 'click', function() {
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
			$( '.oledchip' ).on( 'change', function() {
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
$( '#setting-tft' ).on( 'click', function() {
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
		, values       : { MODEL: S.tftconf || 'tft35a' }
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
$( '#setting-vuled' ).on( 'click', function() {
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
$( '#ledcalc' ).on( 'click', function() {
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
		, values       : { NAME: S.hostname }
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
$( '#timezone' ).on( 'change', function( e ) {
	notify( 'globe', 'Timezone', 'Change ...' );
	bash( [ 'timezone', $( this ).val(), 'CMD TIMEZONE' ] );
} );
$( '#divtimezone .col-r' ).on( 'click', function( e ) {
	if ( ! $( e.target ).parents( '.select2' ).length || $( '#timezone option' ).length > 2 ) return
	
	$( '#timezone' ).select2( 'close' )
	$.post( 'cmd.php', { cmd: 'timezonelist' }, function( data ) {
		$( '#timezone' )
			.html( data )
			.val( S.timezone )
			.select2( 'open' );
	} );
} );
$( '#setting-timezone' ).on( 'click', function() {
	infoNtp();
} );
$( '#setting-soundprofile' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, numberlabel  : [ 'Swappiness', 'Maximum Transmission Unit <gr>(B)</gr>', 'Transmit Queue Length' ]
		, boxwidth     : 80
		, values       : S.soundprofileconf
		, checkchanged : true
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#backup' ).on( 'click', function() {
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
$( '#restore' ).on( 'click', function() {
	infoRestore();
} );
$( '#shareddata' ).on( 'click', function() {
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
				bash( [ 'shareddatadisable', 'OFF' ] );
			}
		} );
	} else {
		V.shareddata = true;
		infoMount();
	}
} );
$( '.listtitle' ).on( 'click', function( e ) {
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
		bash( [ 'i2slist' ], list => {
			$( '#i2smodule' ).html( htmlOption( list ) );
			i2sOptionSetSelect();
			i2sSelectShow();
			$( '#i2smodule' ).select2( 'open' );
		}, 'json' );
	}
}
function i2sOptionSetSelect() {
	$( '#i2smodule option' ).filter( ( i, el ) => { // for 1 value : multiple names
		var $this = $( el );
		return $this.text() === S.audiooutput && $this.val() === S.audioaplayname;
	} ).prop( 'selected', true );
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
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'I&#178;C', 'GPIO' ]
		, tab          : [ '', infoLcdCharGpio ]
		, content      : content
		, boxwidth     : 180
		, values       : values2info(
			  Object.keys( default_v.lcdchar_i2c )
			, S.lcdcharconf || default_v.lcdchar_i2c
		)
		, checkchanged : S.lcdchar && S.lcdcharconf.INF === 'i2c'
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
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'I&#178;C', 'GPIO' ]
		, tab          : [ infoLcdChar, '' ]
		, content      : content
		, boxwidth     : 180
		, values       : values2info(
			  Object.keys( default_v.lcdchar_gpio )
			, S.lcdcharconf || default_v.lcdchar_gpio
		)
		, checkchanged : S.lcdchar && S.lcdcharconf.INF === 'gpio'
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
	$( '#lcdlogo, #lcdoff' ).on( 'click', function() {
		bash( [ 'lcdcharset', this.id.slice( 3 ), 'CMD ACTION' ] )
	} );
}
var contentmount = {
	  common     : `\
<input type="hidden">
<table>
<tr><td style="width: 90px">Name</td>
<td><input id="mountpoint" type="text"
		placeholder="for&ensp;&#xF506;&ensp;·&ensp;&#xF551;&ensp;NAS / Name /"
		style="font-family: rern, Lato;"><a>&ensp;*</a></td>
</tr>
<tr><td>Server IP</td>
	<td><input type="text">&ensp;*</td>
</tr>
<tr><td id="sharelabel">Share</td>
	<td><input id="share" type="text">&ensp;*</td>
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
}
function infoMirror() {
	SW.id    = 'mirror';
	SW.title = 'Servers';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Time', 'Package Mirror' ]
		, tab          : [ infoNtp, '' ]
		, selectlabel  : 'Mirror'
		, select       : V.htmlmirror
		, boxwidth     : 240
		, values       : { MIRROR: S.mirror }
		, checkchanged : true
		, beforeshow   : () => selectText2Html( { Auto: 'Auto <gr>(by Geo-IP)</gr>' } )
		, ok           : switchEnable
	} );
}
function infoMirrorList() {
	if ( 'htmlmirror' in V ) {
		infoMirror();
	} else {
		notifyCommon( 'Get mirror server list ...' );
		bash( [ 'mirrorlist' ], list => {
			V.htmlmirror = htmlOption( list );
			infoMirror();
			bannerHide();
		}, 'json' );
	}
}
function infoMount( nfs ) {
	var nfs        = nfs || false;
	var shareddata = SW.id === 'shareddata';
	if ( I.active && $input.length ) {
		var v = infoVal();
		if ( 'USER' in v || nfs ) var nfs = true;
		v.PROTOCOL = nfs ? 'nfs' : 'cifs';
		var values = values2info( Object.keys( default_v[ nfs ? 'mountnfs' : 'mountcifs' ] ), v );
	} else {
		var values = default_v.mountcifs;
		values.IP  = S.ipsub;
	}
	var tab = nfs ? [ infoMount, '' ] : [ '', infoMount ];
	if ( shareddata ) tab.push( infoMountRserver );
	var icon       = 'networks';
	var title      = shareddata ? 'Shared Data Server' : 'Add Network Storage';
	info( {
		  icon       : icon
		, title      : title
		, tablabel   : shareddata ? tabshareddata : [ 'CIFS', 'NFS' ]
		, tab        : tab
		, content    : contentmount.common + ( nfs ? '' : contentmount.cifs ) + contentmount.option
		, values     : values
		, checkblank : [ 0, 2 ]
		, checkip    : [ 1 ]
		, beforeshow : () => {
			var $mountpoint = $( '#mountpoint' );
			var $share      = $( '#share' );
			$share.prop( 'placeholder', nfs ? 'Share path on server' : 'Share name on server' );
			if ( shareddata ) {
				$mountpoint.val( 'data' ).prop( 'disabled', true );
				$mountpoint.next().remove();
			} else {
				$mountpoint.on( 'keyup paste', function() {
					setTimeout( () => $mountpoint.val( $mountpoint.val().replace( /\//g, '' ) ), 0 );
				} );
			}
		}
		, cancel     : switchCancel
		, ok         : () => {
			var infoval = infoVal();
			infoval.SHAREDDATA = shareddata;
			var keys = Object.keys( infoval );
			var vals = Object.values( infoval );
			notify( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
			bash( [ 'mount', ...vals, 'CMD '+ keys.join( ' ' ) ], error => {
				if ( error ) {
					info( {
						  icon    : icon
						, title   : title
						, message : error
						, ok      : () => setTimeout( infoMount, 0 )
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
		}
	} );
}
function infoMountRserver() {
	info( {
		  icon       : SW.icon
		, title      : SW.title
		, tablabel   : tabshareddata
		, tab        : [ infoMount, () => infoMount( 'nfs' ), '' ]
		, textlabel  : 'Server IP'
		, values     : { IP: I.active && I.values ? infoVal().IP : S.ipsub }
		, checkip    : [ 0 ]
		, cancel     : switchCancel
		, ok         : () => {
			notify( SW.icon, SW.title, 'Connect Server rAudio ...' );
			bash( [ 'mount', infoVal().IP, 'CMD IP' ], error => {
				bannerHide();
				if ( error ) {
					info( {
						  icon    : SW.icon
						, title   : SW.title
						, message : error
						, cancel  : switchCancel
						, ok      : () => setTimeout( infoMountRserver, 0 )
					} );
					return
				}
			} );
		}
	} );
}
function infoNtp() {
	SW.id    = 'ntp';
	SW.title = 'Servers';
	var json = {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'NTP'
		, boxwidth     : 240
		, values       : { NTP: S.ntp }
		, checkchanged : true
		, checkblank   : [ 0 ]
		, ok           : switchEnable
	}
	if ( ! S.rpi01 ) {
		json.tablabel = [ 'Time', 'Package Mirror' ];
		json.tab      = [ '', infoMirrorList ];
	}
	info( json );
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
			var $sw       = $( '#infoContent select' ).eq( 0 );
			var $reserved = $( '#infoContent .reserved' );
			$reserved.toggleClass( 'hide', $sw.val() == 5 );
			$sw.on( 'change', function() {
				$reserved.toggleClass( 'hide', $( this ).val() == 5 );
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
		, values       : { ON: S.poweraudiophonics }
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function infoRelays() {
	var values       = S.relaysconf || default_v.relays;
	var name         = S.relaysnameconf || default_v.relaysname;
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
		var name = S.relaysnameconf || default_v.relaysname;
	} else {
		var pin  = S.relaysconf || default_v.relays;
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
	var name     = S.relaysnameconf || default_v.relaysname;
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
function infoRestore( reset ) {
	info( {
		  icon        : SW.icon
		, title       : SW.title
		, tablabel    : [ 'From Backup', 'Reset To Default' ]
		, tab         : reset ? [ infoRestore, '' ] : [ '', () => infoRestore( 'reset' ) ]
		, checkbox    : reset ? [ 'Keep Library data', 'Keep Network settings' ] : [ 'Library data only' ]
		, fileoklabel : reset ? '' : ico( 'restore' ) +'Restore'
		, filetype    : '.gz'
		, okcolor     : orange
		, ok          : reset ? () => {
				notifyCommon( 'Reset to default ...' );
				bash( [ 'settings/system-datareset.sh '+ infoVal().join( ' ' ) ] );
				loader();
			} : () => {
				notifyCommon( 'Restore ...' );
				var formdata = new FormData();
				formdata.append( 'cmd', 'datarestore' );
				formdata.append( 'file', I.infofile );
				formdata.append( 'dataonly', infoVal() );
				fetch( 'cmd.php', { method: 'POST', body: formdata } )
					.then( response => response.text() )
					.then( message => {
						if ( message ) {
							bannerHide();
							infoWarning(  SW.icon,  SW.title, message );
						}
					} );
				loader();
			}
	} );
	$( '#restore' ).prop( 'checked', 0 );
}
function renderPage() {
	$( '#divsystem .value' ).html( S.system );
	$( '#divstatus .value' ).html( S.status + S.warning );
	$( '#warning' ).toggleClass( 'hide', S.warning === '' );
	$( 'softlimit' in S ? '.softlimitno' : '#divsoftlimit, .softlimit' ).remove();
	renderStorage();
	if ( 'bluetooth' in S || 'wlan' in S ) {
		if ( 'bluetooth' in S ) {
			$( '#divbluetooth .col-l.status' ).toggleClass( 'single', ! S.bluetoothactive );
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
		if ( $( '#i2smodule option' ).length ) {
			i2sOptionSetSelect();
		} else {
			$( '#i2smodule' ).html( `
<option></option>
<option value="${ S.audioaplayname }" selected>${ S.audiooutput }</option>
` );
		}
		i2sSelectShow();
	} else {
		i2sSelectHide();
	}
	$( '#divsoundprofile' ).toggleClass( 'hide', ! S.soundprofileconf );
	$( '#hostname' ).val( S.hostname );
	$( '#avahiurl' ).text( S.hostname +'.local' );
	if ( $( '#timezone option' ).length ) {
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
function renderStorage() {
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
		html += '</li>';
	} );
	$( '#list' ).html( html );
	if ( $( '#list .i-usbdrive' ).length ) {
		$( '#divhddsleep' ).removeClass( 'hide' );
		$( '#hddsleep' ).toggleClass( 'disabled', ! S.hddapm );
	} else {
		$( '#divhddsleep' ).addClass( 'hide' );
	}
	$( '#divusbautoupdate' ).toggleClass( 'hide', S.shareddata || S.nfsserver );
	$( '#codehddinfo' )
		.empty()
		.addClass( 'hide' );
}
function values2info( keys, v ) {
	var values = {}
	keys.forEach( k => values[ k ] = v[ k ] || '' );
	return values
}
