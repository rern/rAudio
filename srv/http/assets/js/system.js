var default_v     = {
	  bluetooth     : {
		  DISCOVERABLE : true
		, FORMAT       : false 
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
		, USR      : ''
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
		  ON       : 3
		, SW       : 3
		, LED      : 21
	}
	, relays       : {
		  ON      : [ 17, 27, 22, 23 ]
		, OFF     : [ 23, 22, 27, 17 ]
		, OND     : [ 2, 2, 2 ]
		, OFFD    : [ 2, 2, 2 ]
		, TIMERON : true
		, TIMER   : 5
	}
	, relaysname    : {
		  17 : 'DAC'
		, 27 : 'PreAmp'
		, 22 : 'Amp'
		, 23 : 'Subwoofer'
	}
	, rotaryencoder : {
		  PINA : 27
		, PINB : 22
		, PINS : 23
		, STEP : 1
	}
	, softlimit     : {
		SOFTLIMIT : 65
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
var gpiosvg       = $( '#gpiosvg' ).html();
var board2bcm     = {
	   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
	, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
}
var lcdcharaddr   = S.lcdcharaddr || [ 39, 63 ];
var i2caddress    = {};
lcdcharaddr.forEach( el => i2caddress[ '0x'+ el.toString( 16 ) ] = el );
var lcdcharlist   = [
	  [ 'Type',            'hidden' ]
	, [ 'Size',            'radio', { '20x4': 20, '16x2': 16 } ]
	, [ 'Character Map',   'radio', [ 'A00', 'A02' ] ]
	, [ 'Address',         'radio', i2caddress ]
	, [ 'I&#178;C Chip',   'select', [ 'PCF8574', 'MCP23008', 'MCP23017' ] ]
	, [ 'Sleep <gr>(60s)', 'checkbox' ]
];
var lcdcharjson   = {
	  icon         : 'lcdchar'
	, title        : 'Character LCD'
	, tablabel     : [ 'I&#178;C', 'GPIO' ]
	, cancel       : switchCancel
	, ok           : switchEnable
	, fileconf     : true
}
var lcdcharfooter = ico( 'raudio', 'lcdlogo', 'tabindex' ) +'Logo&emsp;'+ ico( 'screenoff', 'lcdoff', 'tabindex' ) +'Sleep';
var relaystab     = [ ico( 'power' ) +' Sequence', ico( 'tag' ) +' Pin - Name' ];
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
} );
$( '.power' ).on( 'click', infoPower );
$( '.img' ).on( 'click', function() {
	var name             = $( this ).data( 'name' );
	var vcc1             = htmlC( 'ora', 'VCC', 1 );
	var i2c              = '<br><wh>I²C:</wh>';
	var scasdl           = htmlC( [ [ 'bll', 'SDA', 3 ], [ 'bll', 'SCL', 5 ] ] );
	var txtlcdchar       = '<br><wh>GPIO:</wh> '+ htmlC( [ 
								  [ 'red', 'VCC',   4 ]
								, [ 'grn', 'RS',   15 ]
								, [ 'grn', 'RW',   18 ]
								, [ 'grn', 'E',    16 ]
								, [ 'grn', 'D4-7', '21-24' ]
							] )
						  + i2c + vcc1 + htmlC( 'red', '5V', 4 ) + scasdl
						  +'</p><br>'+ ico( 'warning yl' ) +' <wh>I²C VCC</wh> - 5V to 3.3V modification'
						  +'<br><img style="margin: 5px 0 0; width: 120px; height: auto;" src="/assets/img/i2cbackpack.jpg">';
	var txtmpdoled       = '<br>'+ vcc1
						  + i2c + scasdl
						  + '<br><wh>SPI:</wh>'+ htmlC( [
								  [ 'grn', 'CLK', 23 ]
								, [ 'grn', 'MOS', 19 ]
								, [ 'grn', 'RES', 22 ]
								, [ 'grn', 'DC',  18 ]
								, [ 'grn', 'CS',  24 ]
							] ) +'</p>';
	var txtrotaryencoder = '<br><c>CLK, DT, SW: (any <grn>●</grn> pins)</c>'
						  +'<br><c>+: not use</c></p>';
	var title = {
		  lcd           : [ 'TFT 3.5" LCD' ]
		, lcdchar       : [ 'Character LCD',  txtlcdchar ]
		, mpdoled       : [ 'Spectrum OLED',  txtmpdoled ]
		, powerbutton   : [ 'Power Button',   '',               'power' ]
		, relays        : [ 'Relays Module' ]
		, rotaryencoder : [ 'Rorary Encoder', txtrotaryencoder, 'volume' ]
		, vuled         : [ 'VU LED',         '',               'led' ]
	}
	var d                = title[ name ];
	var list             = '<img src="/assets/img/'+ name +'.jpg?v='+ Math.round( Date.now() / 1000 ) +'">';
	if ( ! [ 'lcd', 'powerbutton', 'relays', 'vuled' ].includes( name ) ) list += gpiosvg;
	if ( d[ 1 ] ) list += '<p class="gpiopins"><c>GND:(any &cir; pin)</c> &emsp; '+ d[ 1 ];
	var pinhide = {
		  lcdchar : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26,     19,         13, 12, 11, 10, 8, 7 ]
		, mpdoled : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26, 21,     16, 15, 13, 12, 11, 10, 8, 7 ]
	}
	info( {
		  icon       : d[ 2 ] || name
		, title      : d[ 0 ]
		, list       : list
		, beforeshow : () => {
			if ( name in pinhide ) {
				pinhide[ name ].forEach( n => {
					$( '.board .p'+ n ).addClass( 'hide' );
					$( '.bcm .p'+ board2bcm[ n ] ).addClass( 'hide' );
				} );
			}
			$( '#infoList svg .power' ).toggleClass( 'hide', [ 'mpdoled', 'rotaryencoder' ].includes( name ) );
			$( '#infoList svg .mpdoled' ).toggleClass( 'hide', name !== 'mpdoled' );
		}
		, okno       : true
	} );
} );
$( '.refresh' ).on( 'click', function() {
	var $this = $( this );
	if ( $this.hasClass( 'blink' ) ) {
		intervalStatus( 'clear' );
		return
	}
	
	$this.addClass( 'blink wh' )
	V.intstatus = setInterval( () => {
		bash( [ 'settings/system-data.sh', 'status' ], data => {
			intervalStatus( 'icon' );
			$( '#divstatus .value' ).html( data.status + data.warning );
			$( '#warning' ).toggleClass( 'hide', data.warning === '' );
		}, 'json' );
	}, 10000 );
} );
$( '#setting-softlimit' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ '', 'radio', { '65°C': 65, '70°C': 70, '75°C': 75 } ]
		, values       : S.softlimitconf || default_v.softlimit
		, checkchanged : S.softlimit
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '.addnas' ).on( 'click', function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	V.li      = $this;
	var i     = $this.index()
	var list  = S.list[ i ];
	$( '#codehddinfo' )
		.addClass( 'hide' )
		.empty();
	if ( [ '/mnt/MPD/NAS', '/mnt/MPD/NAS/data' ].includes( list.mountpoint ) ) {
		info( {
			  icon    : 'networks'
			, title   : 'Network Storage'
			, message : 'Used by <wh>Shared Data '+ ico( 'networks' ) +'</wh>'
		} );
		return
	}
	
	$this.addClass( 'active' );
	if ( list.icon === 'microsd' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .info' ).removeClass( 'hide' );
	} else {
		var mounted = list.size !== '';
		$( '#menu .info' ).toggleClass( 'hide', ! list.info );
		$( '#menu .forget' ).toggleClass( 'hide', list.mountpoint.slice( 0, 12 ) !== '/mnt/MPD/NAS' );
		$( '#menu .remount' ).toggleClass( 'hide', mounted );
		$( '#menu .sleep' ).toggleClass( 'hide', ! list.apm );
		$( '#menu .unmount' ).toggleClass( 'hide', ! mounted );
	}
	contextMenu();
} );
$( '#menu a' ).on( 'click', function() {
	var $this      = $( this );
	var cmd        = $this.prop( 'class' ).replace( ' active', '' );
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
			break
		case 'info':
			var $code = $( '#codehddinfo' );
			if ( $code.hasClass( 'hide' ) ) {
				bash( [ 'storageinfo', source, 'CMD DEV' ], data => {
					$code
						.html( data )
						.removeClass( 'hide' );
				} );
			} else {
				$code.addClass( 'hide' );
			}
			break
		case 'remount':
			notify( icon, title, 'Remount ...' );
			bash( [ 'mountremount', mountpoint, source, 'CMD MOUNTPOINT SOURCE' ] );
			break;
		case 'sleep':
			title = 'HDD Sleep';
			info( {
				  icon         : icon
				, title        : title
				, list         : [ 'Timeout <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 20 } } ]
				, boxwidth     : 90
				, footer       : '&emsp; &emsp;(0 = disabled)'
				, values       : Math.round( list.apm * 5 / 60 )
				, checkchanged : true
				, ok           : () => {
					var val = infoVal();
					notify( icon, title, 'Change ...' );
					bash( [ 'hddsleep', list.source, val ? val * 60 / 5 : 255, 'CMD DEV LEVEL' ] );
				}
			} );
			break
		case 'unmount':
			notify( icon, title, 'Unmount ...' )
			bash( [ 'mountunmount', mountpoint, 'CMD MOUNTPOINT' ] );
			break
	}
} );
$( '#setting-bluetooth' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Discoverable <gr>by senders</gr>',             'checkbox' ]
			, [ 'Sampling 16bit 44.1kHz <gr>to receivers</gr>', 'checkbox' ]
		]
		, values       : S.bluetoothconf || default_v.bluetooth
		, checkchanged : S.bluetooth
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-wlan' ).on( 'click', function() {
	if ( V.regdomlist ) {
		infoWlan();
	} else {
		bash( [ 'regdomlist' ], list => {
			V.regdomlist = list;
			infoWlan();
		}, 'json' );
	}
} );
$( '#i2s' ).on( 'click', function() {
	setTimeout( i2sOptionSet, 0 );
} );
$( '#divi2smodule .col-r' ).on( 'click', function( e ) {
	if ( $( e.target ).parents( '.select2' ).length ) i2sOptionSet();
} );
$( '#i2smodule' ).on( 'input', function() {
	var aplayname = $( this ).val();
	var output    = $( this ).find( ':selected' ).text();
	var icon      = 'i2smodule';
	var title     = 'Audio - I²S';
	if ( aplayname === 'cirrus-wm5102' ) {
		infoCirrusWM5102( output );
		return
	}
	
	if ( aplayname !== 'none' ) {
		notify( icon, title, 'Enable ...' );
	} else {
		setTimeout( () => { notify( icon, title, 'Disable ...' ) }, 300 ); // fix - hide banner too soon
		S.i2saudio = false;
		i2sSelectHide();
	}
	bash( [ 'i2smodule', aplayname, output, 'CMD APLAYNAME OUTPUT' ] );
} );
$( '#setting-i2smodule' ).on( 'click', function() {
	if ( S.audioaplayname === 'cirrus-wm5102' ) {
		infoCirrusWM5102( $( '#i2smodule' ).find( ':selected' ).text() );
		return
	}
	
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Disable I²S HAT EEPROM read', 'checkbox' ]
		, values       : S.i2seeprom
		, checkchanged : S.i2seeprom
		, ok           : () => bash( infoVal() ? [ 'i2seeprom' ] : [ 'i2seeprom', 'OFF' ] )
	} );
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
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : gpiosvg
		, list         : [
			  [ 'CLK',  'select', board2bcm ]
			, [ 'DT',   'select', board2bcm ]
			, [ 'SW',   'select', board2bcm ]
			, [ 'Step', 'radio',  { '1%': 1, '2%': 2 } ]
		]
		, boxwidth     : 70
		, values       : S.rotaryencoderconf || default_v.rotaryencoder
		, checkchanged : S.rotaryencoder
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
		, list         : [
			  [ 'Controller', 'select', chip ]
			, [ 'Refresh',    'select', { kv: [ 800000, 1000000, 1200000 ], suffix: 'baud' } ]
		]
		, values       : S.mpdoledconf
		, checkchanged : S.mpdoled
		, boxwidth     : 140
		, beforeshow   : () => {
			var i2c = ! S.mpdoled || ( S.mpdoled && S.mpdoledconf[ 1 ] );
			$( '.baud' ).toggleClass( 'hide', ! i2c );
			$( '.oledchip' ).on( 'input', function() {
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
	var type = {
		  'Generic'               : 'tft35a'
		, 'Waveshare (A)'         : 'waveshare35a'
		, 'Waveshare (B)'         : 'waveshare35b'
		, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
		, 'Waveshare (C)'         : 'waveshare35c'
	}
	var buttoncalibrate = S.tft && ! S.tftreboot;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Type', 'select', type ]
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
	var values = S.vuledconf || default_v.vuled;
	var list   = [ [ ico( 'led gr' ) +'LED', '', { suffix: ico( 'gpiopins gr' ) +'Pin' } ] ];
	var leds   = Object.keys( values ).length + 1;
	for ( i = 1; i < leds; i++ ) list.push(  [ i, 'select', board2bcm ] );
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : gpiosvg
		, list         : list
		, values       : values
		, checkchanged : S.vuled
		, boxwidth     : 70
		, beforeshow   : () => infoListAddRemove( () => {
			$( '#infoList tr' ).slice( 1 ).each( ( i, el ) => {
				$( el ).find( 'td' ).eq( 0 ).text( i + 1 );
				$( '#infoList .i-remove' ).toggleClass( 'disabled', $( '#infoList select' ).length < 2 );
			} );
		} )
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#ledcalc' ).on( 'click', function() {
	info( {
		  icon       : 'led'
		, title      : 'LED Resister Calculator'
		, list       : [
			  [ 'GPIO <gr>(V)</gr>',                'number' ]
			, [ 'Current <gr>(mA)</gr>',            'number' ]
			, [ 'LED forward voltage <gr>(V)</gr>', 'number' ]
			, [ 'Resister <gr>(&#8486;)</gr>',      'number' ]
		]
		, focus      : 0
		, values     : [ 3.3, 5 ]
		, boxwidth   : 70
		, beforeshow : () => {
			$( '#infoList input' ).prop( 'disabled', 1 );
			$( '#infoList input' ).eq( 2 )
				.prop( 'disabled', 0 )
				.on( 'input', function() {
					var fv = $( this ).val();
					if ( fv > 3.3 ) {
						var ohm = '( > 3.3V)';
					} else {
						var ohm = fv ? Math.round( ( 3.3 - fv ) / 0.005 ) : '';
					}
					$( '#infoList input' ).eq( 3 ).val( ohm );
				} );
		}
		, okno       : true
	} );
} );
$( '#hostname' ).on( 'click', function( e ) {
	if ( e.hasOwnProperty( 'originalEvent' ) ) $( this ).trigger( 'blur' );;
	SW.icon  = 'system';
	SW.title = 'Player Name';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'Name', 'text' ]
		, focus        : 0
		, values       : S.hostname
		, checkblank   : true
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoList input' ).on( 'input', function() {
				$( this ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
			} );
		}
		, ok           : () => {
			var val = infoVal();
			$( '#hostname' ).val( val );
			banner( SW.icon +' blink', SW.title, 'Change ...', -1 );
			bash( [ 'hostname', val, 'CMD NAME' ] );
		}
	} );
} );
$( '#timezone' ).on( 'input', function( e ) {
	notify( 'globe', 'Timezone', 'Change ...' );
	bash( [ 'timezone', $( this ).val(), 'CMD TIMEZONE' ] );
} ).on( 'select2:open', function( e ) {
	if ( $( '#timezone option' ).length > 2 ) return
	
	$( '#timezone' ).select2( 'close' )
	$.post( 'cmd.php', { cmd: 'timezonelist' }, ( data ) => {
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
		, list         : [ 
			  [ 'Swappiness',            'number' ]
			, [ 'Max Transmission Unit', 'number', { suffix: 'byte' } ]
			, [ 'Transmit Queue Length', 'number' ]
		]
		, boxwidth     : 70
		, values       : S.soundprofileconf
		, checkchanged : true
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#backup' ).on( 'click', function() {
	var d     = new Date();
	var month = '0'+ ( d.getMonth() + 1 );
	var date  = '0'+ d.getDate();
	var ymd   = d.getFullYear() + month.slice( -2 ) + date.slice( -2 );
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : 'Save all data and settings'
		, list    : [ 'Filename', 'text', { suffix: '.gz' } ]
		, values  : 'rAudio_backup-'+ ymd
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
							a.download = infoVal() +'.gz';
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
	if ( $this.hasClass( 'disabled' ) ) return
	
	if ( S.shareddata ) {
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
	var $list    = $this.next();
	var $target  = $( e.target );
	if ( $target.hasClass( 'i-refresh' ) ) return
	
	if ( ! $this.hasClass( 'backend' ) ) { // js
		$this.toggleClass( 'active' );
		$list.toggleClass( 'hide' )
		if ( localhost ) $( '.list a' ).remove();
	} else if ( $target.is( 'a' ) ) {      // package
		var active = $target.hasClass( 'wh' );
		$( '.listtitle a' ).removeAttr( 'class' );
		if ( active ) {
			$list.empty();
			return
		}
		
		var timeout = setTimeout( () => banner( 'system blink', 'Backend', 'List ...', -1 ), 1000 );
		bash( [ 'packagelist', $target.text(), 'CMD INI' ], list => {
			clearTimeout( timeout );
			$list.html( list );
			$target.addClass( 'wh' );
			if ( localhost ) $( '.list a' ).removeAttr( 'href' );
			bannerHide();
		} );
	} else {
		$list.addClass( 'hide' );
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

function htmlC( data, key, val ) {
	if ( typeof data !== 'object' ) data = [ [ data, key, val ] ];
	var html = '';
	data.forEach( el => {
		html += '<c>'+ el[ 1 ] +':<a class="'+ el[ 0 ] +'">'+ el[ 2 ] +'</a></c> ';
	} );
	return html
}
function i2sOptionSet() {
	if ( $( '#i2smodule option' ).length > 2 ) {
		if ( $( '#divi2smodule' ).hasClass( 'hide' ) ) {
			i2sSelectShow();
			$( '#i2smodule' ).select2( 'open' );
		}
	} else {
		$( '#i2smodule' ).select2( 'close' );
		bash( [ 'i2slist' ], list => {
			list[ '(None / Auto detect)' ] = 'none';
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
	$( '#i2s' ).prop( 'checked', S.i2saudio );
	$( '#divi2s' ).removeClass( 'hide' );
	$( '#divi2smodule' ).addClass( 'hide' );
}
function i2sSelectShow() {
	$( '#divi2s' ).addClass( 'hide' );
	$( '#divi2smodule' ).removeClass( 'hide' );
	$( '#setting-i2smodule' ).toggleClass( 'hide', ! S.i2saudio );
}
function infoCirrusWM5102( output ) {
	info( {
		  icon     : 'i2s'
		, title    : output
		, list     : [ 'Output', 'select', {
			  Headphones : 'HPOUT1 Digital'
			, 'Line out' : 'HPOUT2 Digital'
			, SPDIF      : 'SPDIF Out'
			, Speakers   : 'SPKOUT Digital'
		} ]
		, boxwidth : 130
		, values   : S.audiowm5102 || 'HPOUT2 Digital'
		, ok       : () => bash( [ 'i2smodule', 'cirrus-wm5102', output, infoVal(), 'CMD APLAYNAME OUTPUT OUTPUTTYPE' ] )
	} );
}
function infoLcdChar() {
	var confi2c = S.lcdcharconf && S.lcdcharconf.INF === 'i2c';
	info( {
		  ...lcdcharjson
		, tab          : [ '', infoLcdCharGpio ]
		, list         : jsonClone( lcdcharlist )
		, footer       : lcdcharfooter
		, boxwidth     : 180
		, values       : confi2c ? S.lcdcharconf : default_v.lcdchar_i2c
		, checkchanged : S.lcdchar && confi2c
		, beforeshow   : infoLcdcharButton
	} );
}
function infoLcdCharGpio() {
	var confgpio = S.lcdcharconf && S.lcdcharconf.INF === 'gpio';
	var list0    = jsonClone( lcdcharlist );
	var list     = list0.slice( 0, 3 );
	[ 'RS', 'RW', 'E', 'D4', 'D5', 'D6', 'D7' ].forEach( k => list.push( [ k, 'select', board2bcm ] ) );
	list.push( list0.slice( -1 )[ 0 ] );
	info( {
		  ...lcdcharjson
		, tab          : [ infoLcdChar, '' ]
		, message      : gpiosvg
		, list         : list
		, footer       : lcdcharfooter
		, boxwidth     : 70
		, values       : confgpio ? S.lcdcharconf : default_v.lcdchar_gpio
		, checkchanged : S.lcdchar && confgpio
		, beforeshow   : () => { 
			infoLcdcharButton();
		}
	} );
}
function infoLcdcharButton() {
	if ( ! S.lcdchar || S.lcdcharreboot ) return
	
	$( '#lcdlogo, #lcdoff' ).on( 'click', function() {
		bash( [ 'lcdcharset', this.id.slice( 3 ), 'CMD ACTION' ] );
	} );
}
function infoMirror() {
	SW.id    = 'mirror';
	SW.title = 'Servers';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Time', 'Package Mirror' ]
		, tab          : [ infoNtp, '' ]
		, list         : [ 'Mirror', 'select', V.htmlmirror ]
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
			V.htmlmirror = list;
			infoMirror();
			bannerHide();
		}, 'json' );
	}
}
function infoMount( nfs ) {
	var nfs        = nfs || false;
	var shareddata = SW.id === 'shareddata';
	var values     = nfs ? default_v.mountnfs : default_v.mountcifs;
	values.IP      = S.ipsub;
	var tab = nfs ? [ infoMount, '' ] : [ '', () => infoMount( 'nfs' ) ];
	if ( shareddata ) tab.push( infoMountRserver );
	var icon       = 'networks';
	var title      = shareddata ? 'Shared Data Server' : 'Add Network Storage';
	var suffix     = { suffix: '<wh>*</wh>' }
	var list       = [
		  [ 'Type',      'hidden' ]
		, [ 'Name',      'text', shareddata ? '' : suffix ]
		, [ 'Server IP', 'text', suffix ]
		, [ 'Share',     'text', suffix ]
		, [ 'User',      'text']
		, [ 'Password',  'password' ]
		, [ 'Options',   'text' ]
	];
	if ( nfs ) list.splice( 4, 2 );
	info( {
		  icon       : icon
		, title      : title
		, tablabel   : shareddata ? tabshareddata : [ 'CIFS', 'NFS' ]
		, tab        : tab
		, list       : list
		, prompt     : true
		, values     : values
		, checkblank : [ 0, 2 ]
		, checkip    : [ 1 ]
		, beforeshow : () => {
			var $input = $( '#infoList input' );
			var $name  = $input.eq( 1 );
			$input.eq( 3 ).prop( 'placeholder', nfs ? 'Share path on server' : 'Share name on server' );
			$input.slice( 4 ).prop( 'placeholder', '(optional)' );
			if ( shareddata ) {
				$name
					.val( 'data' )
					.prop( 'disabled', true );
			} else {
				$name.prop( 'placeholder', 'Name to display in Library' );
				$name.on( 'input', function() {
					setTimeout( () => $name.val( $name.val().replace( /\//g, '' ) ), 0 );
				} );
			}
		}
		, cancel     : switchCancel
		, ok         : () => {
			var infoval = infoVal();
			if ( ! shareddata && infoval.NAME === 'data' ) infoval.NAME += '1'; // reserve 'data' for shared data
			infoval.SHAREDDATA = shareddata;
			var keys = Object.keys( infoval );
			var vals = Object.values( infoval );
			notify( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
			bash( [ 'settings/system-mount.sh', 'cmd', ...vals, 'CMD '+ keys.join( ' ' ) ], error => infoMountSet( error ) );
		}
	} );
}
function infoMountRserver() {
	info( {
		  icon     : SW.icon
		, title    : SW.title
		, tablabel : tabshareddata
		, tab      : [ infoMount, () => infoMount( 'nfs' ), '' ]
		, list     : [ 'Server IP', 'text' ]
		, prompt   : true
		, values   : { IP: I.active && I.values ? infoVal().IP : S.ipsub }
		, checkip  : [ 0 ]
		, cancel   : switchCancel
		, ok       : () => {
			notify( SW.icon, SW.title, 'Connect Server rAudio ...' );
			bash( [ 'settings/system-mount.sh', 'cmd', infoVal().IP, true, 'CMD IP SHAREDDATA' ], error => infoMountSet( error ) );
		}
	} );
}
function infoMountSet( error ) {
	if ( error ) {
		infoPrompt( '<wh>Mount failed:</wh><br><br>'+ error );
	} else {
		$( '#infoX' ).trigger( 'click' );
	}
	bannerHide();
}
function infoNtp() {
	SW.id    = 'ntp';
	SW.title = 'Servers';
	var json = {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [ 'NTP', 'text' ]
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
	var values = S.powerbuttonconf || default_v.powerbutton;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Generic', 'Audiophonic' ]
		, tab          : [ '', infoPowerbuttonAudiophonics ]
		, message      : gpiosvg
		, list         : [ 
			  [ 'On',       'select', { 5: 3 } ]
			, [ 'Off',      'select', board2bcm ]
			, [ 'LED',      'select', board2bcm ]
		]
		, boxwidth     : 70
		, values       : values
		, checkchanged : S.powerbutton
		, beforeshow   : () => $( '.pwr' ).removeClass( 'hide' )
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
		, list         : [ 'Power management module', 'checkbox' ]
		, checkchanged : S.powerbutton
		, values       : { ON: S.poweraudiophonics }
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function infoRelays() {
	var pin    = S.relaysconf     || default_v.relays;
	var name   = S.relaysnameconf || default_v.relaysname;
	var names  = {}
	$.each( name, ( k, v ) => names[ v ] = k );
	var step   = { step: 1, min: 0, max: 10 }
	var list   = [
		  [ '', '', { suffix: ico( 'power grn' ) +' On <gr>(s)</gr>', sameline: true, colspan: 2 } ]
		, [ '', '', { suffix: ico( 'power red' ) +' Off <gr>(s)</gr>', colspan: 2 } ]
	];
	var values = [];
	var pL     = pin.ON.length;
	for ( i = 0; i < pL; i++ ) {
		list.push(
			  [ '', 'select', { kv: names, sameline: true, colspan: 2 } ]
			, [ '', 'select', { kv: names, colspan: 2 } ]
		);
		values.push( pin.ON[ i ], pin.OFF[ i ] );
		if ( i < pL - 1 ) {
			list.push(
				  [ '', 'number', { updn: step, sameline: true } ]
				, [ '', 'number', { updn: step } ]
			);
			values.push( pin.OND[ i ], pin.OFFD[ i ] );
		} else {
			list.push(
				  [ ico( 'stoptimer yl' ) +' Idle to Off <gr>(m)</gr>', 'checkbox',       { sameline: true, colspan: 2 } ]
				, [ '', 'number', { updn: { step: 1, min: 2, max: 30 } } ]
			);
			values.push( pin.TIMERON );
			values.push( pin.TIMER );
		}
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : relaystab
		, tab          : [ '', infoRelaysName ]
		, list         : list
		, boxwidth     : window.innerWidth > 410 ? 180 : window.innerWidth / 2 -20
		, lableno      : true
		, values       : values
		, checkchanged : S.relays
		, beforeshow   : () => {
			$( '#infoList td' ).css( { 'padding-right': 0, 'text-align': 'left' } );
			$( '#infoList td:first-child' ).remove();
			$( '#infoList input[type=number]' ).parent().addBack().css( 'width', '70px' );
			var $trtimer = $( '#infoList tr:last' );
			$trtimer.find( 'td' ).eq( 0 ).css( { height: '40px','text-align': 'right' } );
			$( '#infoList' ).on( 'click', '.i-power', function() {
				var on = $( this ).hasClass( 'grn' );
				bash( [ 'relays.sh', on ? '' : 'off' ] );
			} );
			$( '#infoList' ).on( 'input', 'select', function() {
				var $select = $( '#infoList select' );
				var von   = [];
				var voff  = [];
				$select.each( ( i, el ) => {
					var ar = i % 2 ? von : voff;
					ar.push( $( el ).val() );
				} );
				I.notunique = von.length !== new Set( von ).size || voff.length !== new Set( voff ).size;
				if ( I.notunique ) banner( SW.icon, SW.title, 'Duplicate devices', 6000 )
			} );
			$trtimer.on( 'input', 'input:checkbox', function() {
				$trtimer.find( 'input[type=number], .updn' ).toggleClass( 'hide', ! $( this ).prop( 'checked' ) );
			} );
		}
		, cancel       : switchCancel
		, ok           : infoRelaysOk
	} );
}
function infoRelaysName() {
	var name   = S.relaysnameconf || default_v.relaysname;
	var keys   = Object.keys( name );
	var bcmpin = [ 2, 3, 4, 14, 15, 17, 18, 27, 22, 23, 24, 10, 9, 25, 11, 8, 7, 5, 6, 12, 13, 19, 16, 26, 20, 21 ];
	var pin    = [];
	bcmpin.forEach( p => { // fix - numeric keys unsort
		if ( keys.includes( ''+ p ) ) pin.push( p );
	} );
	var values = [];
	pin.forEach( p => values.push( p, name[ p ] ) );
	var list   = [
		  [ '', '', { suffix: ico( 'gpiopins gr' ) +'Pin', sameline: true } ]
		, [ '', '', { suffix: ico( 'tag gr' ) +' Name' } ]
	]
	var kL     = keys.length;
	for ( i = 0; i < kL; i++ ) {
		list.push( [ '', 'select', { kv: board2bcm, sameline: true } ], [ '', 'text' ] );
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : relaystab
		, tab          : [ infoRelays, '' ]
		, message      : gpiosvg
		, list         : list
		, boxwidth     : 70
		, checkblank   : true
		, checkchanged : S.relays
		, checkunique  : true
		, values       : values
		, beforeshow   : () => {
			$( '#infoList td' ).css( { 'padding-right': 0, 'text-align': 'left' } );
			$( '#infoList td:first-child' ).remove();
			$( '#infoList input' ).parent().addBack().css( 'width', '160px' );
			infoListAddRemove();
			$( '#infoList tr' ).prepend( '<td>'+ ico( 'power' ) +'</td>' );
			$( '#infoList td' ).eq( 0 ).empty();
			var pins = '';
			$( '#infoList select' ).each( ( i, el ) => pins += $( el ).val() +' ' );
			bash( [ 'relaysstatus', pins, 'CMD PINS' ], on => {
				$( '#infoList .i-power' ).each( ( i, el ) => $( el ).toggleClass( 'red', on[ i ] ) );
			}, 'json' );
			$( '#infoList' ).on( 'click', '.i-power', function() {
				var $this = $( this );
				var pin = $this.parents( 'tr' ).find( 'select' ).val();
				$this.toggleClass( 'red' );
				bash( [ 'relayspintoggle', pin, 'CMD PIN' ] );
			} );
		}
		, cancel       : switchCancel
		, ok           : infoRelaysOk
	} );
}
function infoRelaysOk() {
	if ( ! S.relaysconf ) { // force update values on ok
		S.relaysconf     = default_v.relays;
		S.relaysnameconf = default_v.relaysname;
	}
	var order   = S.relaysconf;
	var name    = S.relaysnameconf;
	var v       = infoVal();
	var tabname = I.tab[ 0 ];
	if ( tabname ) {
		v.forEach( ( el, i ) => i % 2 ? name[ p ] = el : p = el );
		var on = Object.keys( name );
		if ( on.sort().join() !== order.ON.slice().sort().join() ) {
			order.ON  = on;
			order.OFF = on.slice().reverse();
		}
	} else {
		var pL = order.ON.length;
		for ( i = 0; i < pL; i++ ) {
			var j          = i * 4;
			order.ON[ i ]  = v[ j ];
			order.OFF[ i ] = v[ j + 1 ];
			if ( i < pL - 1 ) {
				order.OND[ i ]  = v[ j + 2 ];
				order.OFFD[ i ] = v[ j + 3 ];
			} else {
				order.TIMER = v[ v.length - 1 ];
				order.TIMERON = v[ v.length - 2 ];
			}
		}
	}
	var keys    = Object.keys( S.relaysconf );
	var pins    = [];
	keys.forEach( k => {
		var val =  order[ k ];
		if ( Array.isArray( val ) ) val = val.join( ' ' );
		pins.push( val );
	} );
	notifyCommon();
	bash( [ 'relays', ...pins, 'CFG '+ keys.join( ' ' ) ] );
	jsonSave( 'relays', name );
	if ( tabname ) infoRelays();
}
function infoRestore() {
	info( {
		  icon     : SW.icon
		, title    : SW.title
		, tablabel : [ 'From Backup', 'Reset To Default' ]
		, tab      : [ '', infoRestoreReset ]
		, list     : [ 'Library database only', 'checkbox' ]
		, file     : { oklabel: ico( 'restore' ) +'Restore', type : '.gz' }
		, oklabel  : ico( 'restore' ) +'Restore'
		, okcolor  : orange
		, ok       : () => {
			notifyCommon( 'Restore ...' );
			var formdata = new FormData();
			formdata.append( 'cmd', 'datarestore' );
			formdata.append( 'file', I.infofile );
			formdata.append( 'libraryonly', infoVal() );
			fetch( 'cmd.php', { method: 'POST', body: formdata } )
				.then( response => response.text() )
				.then( message => {
					loaderHide();
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
function infoRestoreReset() {
	info( {
		  icon     : SW.icon
		, title    : SW.title
		, tablabel : [ 'From Backup', 'Reset To Default' ]
		, tab      : [ infoRestore, '' ]
		, list     : [
			  [ 'Keep Library data',     'checkbox' ]
			, [ 'Keep Network settings', 'checkbox' ]
		]
		, oklabel  : ico( 'set0' ) +'Reset'
		, okcolor  : orange
		, ok       : () => {
			notifyCommon( 'Reset to default ...' );
			bash( [ 'settings/system-datareset.sh', 'cmd', ...infoVal(), 'CMD KEEPLIBRARY KEEPNETWORK' ] );
			loader();
		}
	} );
	$( '#restore' ).prop( 'checked', 0 );
}
function infoWlan() {
	var autostart = 'Auto start Access Point<br> &emsp; &emsp; <gr>(if not connected)</gr>';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Country', 'select', V.regdomlist ]
			, [ autostart, 'checkbox' ]
		]
		, boxwidth     : 250
		, values       : S.wlanconf || default_v.wlan
		, checkchanged : S.wlan
		, beforeshow   : () => selectText2Html( { '00': '00 <gr>(allowed worldwide)</gr>' } )
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
}
function intervalStatus( type ) {
	var $icon = $( '#divstatus .refresh' );
	if ( type === 'icon' ) {
		$icon.toggleClass( 'i-refresh blink i-flash' );
		setTimeout( () => $icon.toggleClass( 'i-refresh blink i-flash' ), 900 );
	} else { // clear
		clearInterval( V.intstatus );
		$icon.removeClass( 'blink wh' );
	}
}
function renderPage() {
	$( '#divsystem .value' ).html( S.system );
	$( '#divstatus .value' ).html( S.status + S.warning );
	$( '#warning' ).toggleClass( 'hide', S.warning === '' );
	$( 'softlimit' in S ? '.softlimitno' : '#divsoftlimit, .softlimit' ).remove();
	renderStorage();
	if ( 'bluetooth' in S || 'wlan' in S ) {
		if ( 'bluetooth' in S ) {
			$( '#divbluetooth .col-l' )
				.toggleClass( 'single', ! S.bluetoothactive )
				.toggleClass( 'status', S.bluetoothactive );
		} else {
			$( '#divbluetooth' ).addClass( 'hide' );
		}
		if ( 'wlan' in S ) {
			$( '#wlan' )
				.toggleClass( 'disabled', S.ap || S.wlanconnected )
				.prev().html( S.ap ? icoLabel( 'Access Point', 'ap' ) +' is currently enabled.' : icoLabel( 'Wi-Fi', 'wifi' ) +' is currently connected.' );
			$( '#divwlan .col-l' )
				.toggleClass( 'single', ! S.wlan )
				.toggleClass( 'status', S.wlan );
		} else {
			$( '#divwlan' ).addClass( 'hide' );
		}
	} else {
		$( '#divbluetooth' ).parent().addClass( 'hide' );
	}
	$( '#audio' ).toggleClass( 'disabled', ! S.audiocards );
	if ( S.i2saudio ) {
		if ( $( '#i2smodule option' ).length ) {
			i2sOptionSetSelect();
		} else {
			$( '#i2smodule' ).html( '<option></option><option selected>'+ S.audiooutput +'</option>' );
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
	$( 'a[ href ]' ).prop( 'tabindex', -1 );
	showContent();
}
function renderStorage() {
	delete S.hddapm;
	var html  = '';
	$.each( S.list, ( i, v ) => {
		var mountpoint = v.mountpoint === '/' ? 'SD' : v.mountpoint.replace( '/mnt/MPD/', '' );
		var dot = '<grn>&ensp;•&ensp;</grn>';
		if ( ! v.size ) dot = dot.replace( /grn/g, 'red' );
		html += '<li>'+ ico( v.icon ) + mountpoint
				+ dot +'<gr class="source">'+ v.source +'</gr>&ensp;'+ v.size +'</li>';
	} );
	$( '#list' ).html( html );
}
