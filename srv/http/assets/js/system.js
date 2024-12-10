var config        = {
	  _disable      : {
		  shareddata : () => {
			info( {
				  ...SW
				, message : 'Disable and restore local data?'
				, cancel  : switchCancel
				, okcolor : orange
				, ok      : () => {
					notifyCommon( 'Disable ...' );
					bash( [ 'shareddatadisable', 'OFF' ] );
				}
			} );
		}
	}
	, _prompt       : {
		  backup  : () => {
			var d     = new Date();
			var month = '0'+ ( d.getMonth() + 1 );
			var date  = '0'+ d.getDate();
			var ymd   = d.getFullYear() + month.slice( -2 ) + date.slice( -2 );
			info( {
				  ...SW
				, message : 'Save all data and settings'
				, list    : [ 'Filename', 'text', { suffix: '.gz' } ]
				, values  : 'rAudio_backup-'+ ymd
				, ok      : () => {
					notifyCommon( 'Process ...' );
					bash( 'system-databackup.sh', data => {
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
								  ...SW
								, message : 'Backup failed.'
							} );
							bannerHide();
						}
					} );
				}
			} );
		}
		, i2s     : () => util.i2sSelect.option()
		, restore : () => {
			info( {
				  ...SW
				, tablabel : [ 'From Backup', 'Reset To Default' ]
				, tab      : [ '', util.restoreReset ]
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
		}
		, shareddata    : () => util.mount.mount()
	}
	, bluetooth     : values => {
		info( {
			  ...SW
			, list         : [
				  [ 'Discoverable <gr>by senders</gr>',             'checkbox' ]
				, [ 'Sampling 16bit 44.1kHz <gr>to receivers</gr>', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.bluetooth
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}
	, i2smodule     : () => {
		if ( S.audioaplayname === 'cirrus-wm5102' ) {
			util.wm5102();
		} else {
			infoSetting( 'i2smodule', values => {
				info( {
					  ...SW
					, list         : [ 'Disable I²S HAT EEPROM read', 'checkbox' ]
					, values       : values
					, checkchanged : true
					, ok           : () => bash( [ 'i2seeprom', infoVal() ] )
				} );
			} );
		}
	}
	, lcdchar       : data => {
		'address' in data ? util.lcdchar.i2s( data ) : util.lcdchar.gpio( data );
	}
	, mpdoled       : data => {
		var values     = data.values;
		var buttonlogo = S.mpdoled && ! data.reboot;
		var chip       = {
			  'SSD130x SP'  : 1
			, 'SSD130x I²C' : 3
			, 'Seeed I²C'   : 4
			, 'SH1106 I²C'  : 6
			, 'SH1106 SPI'  : 7
		}
		info( {
			  ...SW
			, list         : [
				  [ 'Controller',              'select', chip ]
				, [ 'Refresh <gr>(baud)</gr>', 'select', { kv: { '800,000': 800000, '1,000,000': 1000000, '1,200,000': 1200000 } } ]
			]
			, footer       : ico( 'raudio' ) +'Logo'
			, values       : values
			, checkchanged : S.mpdoled
			, boxwidth     : 140
			, beforeshow   : () => {
				var $tr   = $( '#infoList tr' );
				var $baud = $tr.eq( 1 )
				$baud.toggleClass( 'hide', S.mpdoled && ( values.CHIP < 3 || values.CHIP > 6 ) );
				$( '.infofooter i' ).toggleClass( 'disabled', ! S.mpdoled || data.reboot )
				$tr.eq( 0 ).on( 'input', function() {
					var val = this.value;
					$baud.toggleClass( 'hide', val < 3 || val > 6 );
				} );
			}
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}
	, powerbutton   : values => {
		values === true ? util.powerbutton.ap() : util.powerbutton.sw( values );
	}
	, relays        : data => {
		S.relays ? util.relays.order( data ) : util.relays.name( data );
	}
	, rotaryencoder : values => {
		info( {
			  ...SW
			, message      : util.gpiosvg
			, list         : [
				  [ 'CLK',  'select', util.board2bcm ]
				, [ 'DT',   'select', util.board2bcm ]
				, [ 'SW',   'select', util.board2bcm ]
				, [ 'Step', 'radio',  { '1%': 1, '2%': 2 } ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.rotaryencoder
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}
	, soundprofile  : values => {
		info( {
			  ...SW
			, list         : [ 
				  [ 'Swappiness',            'number' ]
				, [ 'Max Transmission Unit', 'number', { suffix: 'byte' } ]
				, [ 'Transmit Queue Length', 'number' ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : true
			, checkblank   : true
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}
	, timezone      : () => util.server.ntp()
	, tft           : data => {
		var type = {
			  'Generic'               : 'tft35a'
			, 'Waveshare (A)'         : 'waveshare35a'
			, 'Waveshare (B)'         : 'waveshare35b'
			, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
			, 'Waveshare (C)'         : 'waveshare35c'
		}
		var buttoncalibrate = S.tft && ! data.reboot;
		info( {
			  ...SW
			, list         : [ 'Type', 'select', type ]
			, values       : data.values
			, checkchanged : S.tft
			, boxwidth     : 190
			, buttonlabel  : ! buttoncalibrate ? '' : 'Calibrate'
			, button       : ! buttoncalibrate ? '' : () => {
				info( {
					  ...SW
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
	}
	, vuled         : values => {
		var list   = [ [ ico( 'vuled gr' ) +'LED', '', { suffix: ico( 'gpiopins gr' ) +'Pin' } ] ];
		var leds   = Object.keys( values ).length + 1;
		for ( i = 1; i < leds; i++ ) list.push(  [ ico( 'power' ) +'&emsp;'+ i, 'select', util.board2bcm ] );
		info( {
			  ...SW
			, message      : util.gpiosvg
			, list         : list
			, values       : values
			, checkchanged : S.vuled
			, boxwidth     : 70
			, beforeshow   : () => {
				infoListAddRemove( () => {
					$( '#infoList tr' ).slice( 1 ).each( ( i, el ) => {
						$( el ).find( 'td' ).eq( 0 ).html( ico( 'power' ) +'&emsp;'+ ( i + 1 ) );
						$( '#infoList .i-remove' ).toggleClass( 'disabled', $( '#infoList select' ).length < 2 );
					} );
				} );
				util.relays.toggle();
			}
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}
	, wlan          : data => {
		var accesspoint = 'Auto start Access Point<br>'+ sp( 30 ) +'<gr>(if not connected)</gr>';
		info( {
			  ...SW
			, list         : [
				  [ 'Country',   'select', data.list ]
				, [ accesspoint, 'checkbox' ]
			]
			, boxwidth     : 250
			, values       : data.values
			, checkchanged : S.wlan
			, beforeshow   : () => selectText2Html( { '00': '00 <gr>(allowed worldwide)</gr>' } )
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}
}
var util          = {
	  board2bcm     : {
		   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
		, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
	}
	, gpiosvg       : $( '#gpiosvg' ).html()
	, hostname      : () => {
		SW = {
			  id    : 'hostname'
			, icon  : 'hostname'
			, title : 'Player Name'
		}
		info( {
			  ...SW
			, list         : [ 'Name', 'text' ]
			, values       : { NAME: S.hostname }
			, checkblank   : true
			, checkchanged : true
			, beforeshow   : () => {
				$( '#infoList input' ).on( 'input', function() {
					$( this ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
				} );
			}
			, ok           : () => {
				switchEnable();
				$( '#hostname' ).addClass( 'disabled' );
			}
		} );
	}
	, i2sSelect     : {
		  hide   : () => {
			$( '#i2s' ).prop( 'checked', false );
			$( '#divi2s' ).removeClass( 'hide' );
			$( '#divi2smodule' ).addClass( 'hide' );
		  }
		, option : () => {
			if ( $( '#i2smodule option' ).length > 2 ) {
				if ( $( '#divi2smodule' ).hasClass( 'hide' ) ) {
					util.i2sSelect.show();
					$( '#i2smodule' ).select2( 'open' );
				}
			} else {
				$( '#i2smodule' ).select2( 'close' );
				infoSetting( 'i2slist', list => {
					list[ '(None / Auto detect)' ] = '';
					$( '#i2smodule' ).html( htmlOption( list ) );
					util.i2sSelect.select();
					util.i2sSelect.show();
					$( '#i2smodule' ).select2( 'open' );
				} );
			}
		}
		, select : () => {
			$( '#i2smodule option' ).filter( ( i, el ) => { // for 1 value : multiple names
				var $this = $( el );
				return $this.text() === S.audiooutput && $this.val() === S.audioaplayname;
			} ).prop( 'selected', true );
		}
		, show   : () => {
			$( '#divi2s' ).addClass( 'hide' );
			$( '#divi2smodule' ).removeClass( 'hide' );
			$( '#setting-i2smodule' ).toggleClass( 'hide', ! S.i2smodule );
		}
	}
	, lcdchar       : {
		  gpio : values => {
			var list0 = jsonClone( util.lcdchar.list );
			var list  = list0.slice( 0, 3 );
			[ 'Pins: &emsp; D4', 'RS', 'D5', 'RW', 'D6', 'E', 'D7' ].forEach( ( k, i ) => {
				list.push( [ k, 'select', { kv: util.board2bcm, sameline: i % 2 === 0 } ] );
			} );
			list.push( [ '', '' ], list0.slice( -1 )[ 0 ] );
			info( {
				  ...util.lcdchar.json
				, tab          : [ () => infoSetting( 'lcdchar', util.lcdchar.i2s ), '' ]
				, message      : util.gpiosvg
				, list         : list
				, boxwidth     : 70
				, values       : values
				, checkchanged : S.lcdchar
			} );
		}
		, i2s  : data => {
			var list          = jsonClone( util.lcdchar.list );
			list[ 3 ][ 2 ].kv = data.address;
			info( {
				  ...util.lcdchar.json
				, tab          : [ '', () => infoSetting( 'lcdchar gpio', util.lcdchar.gpio ) ]
				, list         : list
				, boxwidth     : 180
				, values       : data.values
				, checkchanged : S.lcdchar
			} );
		}
		, json : {
			  icon       : 'lcdchar'
			, title      : 'Character LCD'
			, tablabel   : [ 'I&#178;C', 'GPIO' ]
			, footer     : ico( 'raudio' ) +'Logo&emsp;'+ ico( 'screenoff' ) +'Sleep'
			, beforeshow : () => {
				$( '#infoList label' ).parents( 'td' ).prop( 'colspan', 3 );
				$( '.infofooter i' )
					.toggleClass( 'disabled', ! S.lcdchar || data.reboot )
					.on( 'click', function() {
						bash( [ 'lcdcharset', $( this ).index() ? 'off' : 'logo', 'CMD ACTION' ] );
				} );
			}
			, cancel     : switchCancel
			, ok         : switchEnable
			, fileconf   : true
		}
		, list : [
			  [ 'Type',                 'hidden'  ]
			, [ 'Size',                 'radio',    { kv: { '20 x 4': 20, '16 x 2': 16 } } ]
			, [ 'Character Map',        'radio',    { kv: [ 'A00', 'A02' ] } ]
			, [ 'Address',              'radio',    [ '' ] ] /*'by confget'*/
			, [ 'Chip',                 'select',   [ 'PCF8574', 'MCP23008', 'MCP23017' ] ]
			, [ 'Idle sleep <gr>(60s)', 'checkbox' ]
		]
	}
	, ledcalc       : () => {
		info( {
			  icon       : 'vuled'
			, title      : 'LED Resister Calculator'
			, list       : [
				  [ 'GPIO <gr>(V)</gr>',                'number' ]
				, [ 'Current <gr>(mA)</gr>',            'number' ]
				, [ 'LED forward voltage <gr>(V)</gr>', 'number' ]
				, [ 'Resister <gr>(&#8486;)</gr>',      'number' ]
			]
			, boxwidth   : 70
			, values     : [ 3.3, 5 ]
			, focus      : 2
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
	}
	, mount         : {
		  mount   : nfs => {
			var nfs        = nfs || false;
			var shareddata = SW.id === 'shareddata';
			var conf       = {
				  cifs : {
					  PROTOCOL : 'cifs'
					, NAME     : ''
					, IP       : ipSub( S.ip )
					, SHARE    : ''
					, USR      : ''
					, PASSWORD : ''
					, OPTIONS  : '' 
				}
				, nfs  : {
					  PROTOCOL : 'nfs'
					, NAME     : ''
					, IP       : ipSub( S.ip )
					, SHARE    : ''
					, OPTIONS  : ''
				}
			}
			var values     = nfs ? conf.nfs : conf.cifs;
			var tab = nfs ? [ util.mount.mount, '' ] : [ '', () => util.mount.mount( 'nfs' ) ];
			if ( shareddata ) tab.push( util.mount.rServer );
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
				, tablabel   : shareddata ? util.mount.tab : [ 'CIFS', 'NFS' ]
				, tab        : tab
				, list       : list
				, values     : values
				, focus      : shareddata ? 1 : 0
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
				, oknoreset  : true
				, ok         : () => {
					var infoval = infoVal();
					if ( ! shareddata && infoval.NAME === 'data' ) infoval.NAME += '1'; // reserve 'data' for shared data
					infoval.SHAREDDATA = shareddata;
					var keys = Object.keys( infoval );
					var vals = Object.values( infoval );
					notify( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
					util.mount.set( [ ...vals, 'CMD '+ keys.join( ' ' ) ] );
				}
			} );
		}
		, rServer : () => {
			info( {
				  ...SW
				, tablabel  : util.mount.tab
				, tab       : [ util.mount.mount, () => util.mount.mount( 'nfs' ), '' ]
				, list      : [ 'Server IP', 'text' ]
				, values    : { IP: I.active && I.values ? infoVal().IP : ipSub( S.ip ) }
				, checkip   : [ 0 ]
				, cancel    : switchCancel
				, oknoreset : true
				, ok        : () => {
					notify( SW.icon, SW.title, 'Connect Server rAudio ...' );
					util.mount.set( [ infoVal().IP, true, 'CMD IP SHAREDDATA' ] );
				}
			} );
		}
		, set     : args => {
			bash( [ 'settings/system-mount.sh', 'cmd', ...args ], error => {
				if ( error ) {
					infoPrompt( '<wh>Mount failed:</wh><br><br>'+ error );
				} else {
					$( '#infoX' ).trigger( 'click' );
				}
			} );
		}
		, tab     : [ 'CIFS', 'NFS', ico( 'rserver' ) +' rAudio' ]
	}
	, powerbutton   : {
		  sw : values => {
			info( {
				  ...SW
				, tablabel     : [ 'Generic', 'Audiophonic' ]
				, tab          : [ '', util.powerbutton.ap ]
				, message      : util.gpiosvg
				, list         : [ 
					  [ 'On',       'select', { 5: 3 } ]
					, [ 'Off',      'select', util.board2bcm ]
					, [ 'LED',      'select', util.board2bcm ]
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
		, ap : () => {
			info( {
				  ...SW
				, tablabel     : [ 'Generic', 'Audiophonic' ]
				, tab          : [ () => infoSetting( 'powerbutton', util.powerbutton.sw ), '' ]
				, list         : [ 'Power management module', 'checkbox' ]
				, checkchanged : S.powerbutton
				, values       : { ON: true }
				, cancel       : switchCancel
				, ok           : switchEnable
			} );
		}
	}
	, refresh       : () => {
		var $this = $( '.refresh' );
		if ( $this.hasClass( 'blink' ) ) {
			clearInterval( V.intstatus );
			$this
				.removeClass( 'i-refresh blink i-flash wh' )
				.addClass( 'i-refresh' );
			return
		}
		
		$this.addClass( 'blink wh' )
		V.intstatus = setInterval( () => {
			bash( 'system-data.sh status', data => {
				$( '#divstatus .value' ).html( data );
				$this.toggleClass( 'i-refresh blink i-flash' );
				setTimeout( () => $this.toggleClass( 'i-refresh blink i-flash' ), 300 );
			} );
		}, 10000 );
		}
	, relays        : {
		  name   : data => {
			var name   = data.relaysname;
			var keys   = Object.keys( name );
			var values = [];
			keys.forEach( p => values.push( p, name[ p ] ) );
			var list   = [
				  [ '', '', { suffix: ico( 'gpiopins gr' ) +'Pin', sameline: true } ]
				, [ '', '', { suffix: ico( 'tag gr' ) +' Name' } ]
			]
			var kL     = keys.length;
			for ( i = 0; i < kL; i++ ) {
				list.push( [ '', 'select', { kv: util.board2bcm, sameline: true } ], [ '', 'text' ] );
			}
			info( {
				  ...SW
				, tablabel     : util.relays.tab
				, tab          : [ () => util.relays.order( data ), '' ]
				, message      : util.gpiosvg
				, list         : list
				, boxwidth     : 70
				, propmt       : true
				, checkblank   : true
				, checkchanged : S.relays
				, checkunique  : true
				, values       : values
				, beforeshow   : () => {
					$( '#infoList td' ).css( { 'padding-right': 0, 'text-align': 'left' } );
					$( '#infoList td:first-child' ).remove();
					$( '#infoList input' ).parent().addBack().css( 'width', '160px' );
					infoListAddRemove( add => {
						if ( add ) $( '#infoList .i-power' ).last().removeClass( 'red' );
					} );
					$( '#infoList tr' ).prepend( '<td>'+ ico( 'power' ) +'</td>' );
					$( '#infoList td' ).eq( 0 ).empty();
					util.relays.toggle();
				}
				, cancel       : switchCancel
				, ok           : () => util.relays.set( data )
			} );
		}
		, order  : data => {
			var pin    = data.relays;
			var name   = data.relaysname;
			var names  = {}
			$.each( name, ( k, v ) => { names[ v ] = k } );
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
				  ...SW
				, tablabel     : util.relays.tab
				, tab          : [ '', () => util.relays.name( data ) ]
				, list         : list
				, boxwidth     : window.innerWidth > 410 ? 180 : window.innerWidth / 2 -20
				, lableno      : true
				, values       : values
				, checkchanged : S.relays
				, beforeshow   : () => {
					$( '#infoList td' ).css( { 'padding-right': 0, 'text-align': 'left' } );
					$( '#infoList td:first-child' ).remove();
					$( '#infoList input[type=number]' ).parent().addBack().css( 'width', '70px' );
					var $tdtimer = $( '#infoList tr:last td' );
					var $timer   = $tdtimer.slice( 1 )
					$tdtimer.eq( 0 ).css( { height: '40px','text-align': 'right' } );
					$timer.toggleClass( 'hide', ! pin.TIMERON );
					$( '#infoList' ).on( 'click', '.i-power', function() {
						if ( S.relayson ) {
							infoPrompt( util.relays.prompt );
						} else {
							bash( [ 'relays.sh', $( this ).hasClass( 'grn' ) ? '' : 'off' ] );
						}
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
					$( '#infoList input:checkbox' ).on( 'input', function() {
						$timer.toggleClass( 'hide', ! $( this ).prop( 'checked' ) );
					} );
				}
				, cancel       : switchCancel
				, ok           : () => util.relays.set( data )
			} );
		}
		, prompt : '<a class="helpmenu label">Relay Module<i class="i-relays"></i></a> is currently ON'
		, set    : data => {
			var order   = data.relays;
			var name    = data.relaysname;
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
			var keys    = Object.keys( data.relays );
			var pins    = [];
			keys.forEach( k => {
				var val =  order[ k ];
				if ( Array.isArray( val ) ) val = val.join( ' ' );
				pins.push( val );
			} );
			notifyCommon();
			bash( [ 'relays', ...pins, 'CFG '+ keys.join( ' ' ) ] );
			jsonSave( 'relays', name );
			if ( tabname ) util.relays.name( data );
		}
		, tab    : [ ico( 'power' ) +' Sequence', ico( 'tag' ) +' Pin - Name' ]
		, toggle : () => {
			$( '#infoList' ).on( 'click', '.i-power', function() {
				if ( S.relayson ) {
					infoPrompt( util.relays.prompt );
				} else {
					var $this = $( this );
					var pin   = +$this.parents( 'tr' ).find( 'select' ).val();
					bash( [ 'gpiopintoggle', pin, 'CMD PIN' ], onoff => $this.toggleClass( 'red', onoff == 1 ) );
				}
			} );
		}
	}
	, renderStorage : () => {
		var html  = '';
		$.each( S.liststorage, ( i, v ) => {
			var mountpoint = v.mountpoint === '/' ? 'SD' : v.mountpoint.replace( '/mnt/MPD/', '' );
			var dot = '<grn>&ensp;•&ensp;</grn>';
			if ( ! v.size ) dot = dot.replace( /grn/g, 'red' );
			html += '<li>'+ ico( v.icon ) + mountpoint + dot + v.size +' <c>'+ v.source +'</c></li>';
		} );
		$( '#list' ).html( html );
	}
	, restoreReset  : () => {
		info( {
			  ...SW
			, tablabel : [ 'From Backup', 'Reset To Default' ]
			, tab      : [ () => $( '#restore' ).triger( 'click' ), '' ]
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
	, server        : {
		  mirror : () => {
			notifyCommon( 'Get mirror server list ...' );
			infoSetting( 'servermirror', data => {
				bannerHide();
				SW.id = 'mirror';
				info( {
					  ...SW
					, tablabel     : [ 'Time', 'Package Mirror' ]
					, tab          : [ () => infoSetting( 'serverntp', util.server.ntp ), '' ]
					, list         : [ 'Mirror', 'select', data.list ]
					, boxwidth     : 240
					, values       : data.values
					, checkchanged : true
					, beforeshow   : () => selectText2Html( { Auto: 'Auto <gr>(by Geo-IP)</gr>' } )
					, ok           : switchEnable
				} );
			} );
		}
		, ntp    : () => {
			infoSetting( 'serverntp', data => {
				SW.id    = 'ntp';
				SW.title = 'Servers';
				if ( ! data.rpi01 ) {
					SW.tablabel = [ 'Time', 'Package Mirror' ];
					SW.tab      = [ '', util.server.mirror ];
				}
				info( {
					  ...SW
					, list         : [ 'NTP', 'text' ]
					, boxwidth     : 240
					, values       : data.values
					, checkchanged : true
					, checkblank   : [ 0 ]
					, ok           : switchEnable
				} );
			} );
		}
	}
	, wm5102        : () => {
		infoSetting( 'audio-wm5102', data => {
			var icon   = 'i2s';
			var output = $( '#i2smodule' ).find( ':selected' ).text();
			info( {
				  icon         : icon
				, title        : output
				, list         : [ 'Output', 'select', {
					  Headphones : 'HPOUT1 Digital'
					, 'Line out' : 'HPOUT2 Digital'
					, SPDIF      : 'SPDIF Out'
					, Speakers   : 'SPKOUT Digital'
				} ]
				, boxwidth     : 130
				, values       : data.outputtype
				, checkchanged : S.i2smodule
				, ok           : () => {
					notify( icon, output, 'Change ...' );
					bash( [ 'i2smodule', 'cirrus-wm5102', output, infoVal(), 'CMD APLAYNAME OUTPUT OUTPUTTYPE' ] );
				}
			} );
		} );
	}
}

function onPageInactive() {
	clearInterval( V.intstatus );
}
function renderPage() {
	$( '#divsystem .value' ).html( S.system );
	$( '#divstatus .value' ).html( S.status );
	util.renderStorage();
	if ( 'bluetooth' in S || 'wlan' in S ) {
		if ( 'bluetooth' in S ) {
			$( '#divbluetooth .col-l' )
				.toggleClass( 'single', ! S.bluetooth )
				.toggleClass( 'status', S.bluetooth );
			$( '#bluetooth' ).toggleClass( 'disabled', S.btconnected );
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
	if ( S.i2smodule ) {
		if ( $( '#i2smodule option' ).length ) {
			util.i2sSelect.select();
		} else {
			$( '#i2smodule' ).html( '<option></option><option selected>'+ S.audiooutput +'</option>' );
		}
		util.i2sSelect.show();
	} else {
		util.i2sSelect.hide();
	}
	$( '#divsoundprofile' ).toggleClass( 'hide', ! S.lan );
	$( '#hostname' )
		.val( S.hostname )
		.removeClass( 'disabled' );
	$( '#avahiurl' ).text( S.hostname +'.local' );
	if ( $( '#timezone option' ).length ) {
		$( '#timezone' ).val( S.timezone );
	} else {
		$( '#timezone' ).html( `
<option></option>
<option value="${ S.timezone }" selected>${ S.timezone.replace( /\//, ' · ' ) +'&ensp;'+ S.timezoneoffset }</option>
` );
	}
	$( '#shareddata' ).toggleClass( 'disabled', S.nfsserver );
	$( 'a[ href ]' ).prop( 'tabindex', -1 );
	showContent();
}
ps.storage = data => {
	S.liststorage = data.list;
	util.renderStorage();
	if ( $( '#data' ).length ) $( '#data' ).html( highlightJSON( S ) )
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.power' ).on( 'click', infoPower );
$( '.img' ).on( 'click', function() {
	function htmlLegend( data, key, val ) {
		if ( typeof data !== 'object' ) data = [ [ data, key, val ] ];
		var html = '';
		data.forEach( el => {
			html += '<c>'+ el[ 1 ] +':<a class="'+ el[ 0 ] +'">'+ el[ 2 ] +'</a></c> ';
		} );
		return html
	}
	var name    = $( this ).data( 'name' );
	var vcc1    = htmlLegend( 'ora', 'VCC', 1 );
	var i2c     = '<br><wh>I²C:</wh>';
	var scasdl  = htmlLegend( [ [ 'bll', 'SDA', 3 ], [ 'bll', 'SCL', 5 ] ] );
	var gnd     = '<p class="gpiopins"><c>GND:(any &cir; pin)</c> &emsp; ';
	var title   = {
		  lcd           : [ 'TFT 3.5" LCD' ]
		, lcdchar       : [ 'Character LCD' ]
		, mpdoled       : [ 'Spectrum OLED' ]
		, powerbutton   : [ 'Power Button',   'power' ]
		, relays        : [ 'Relays Module' ]
		, rotaryencoder : [ 'Rorary Encoder', 'volume' ]
		, vuled         : [ 'VU LED',         'vuled' ]
	}
	var txt     = {
		  lcdchar       : gnd +'<wh>GPIO:</wh> '+ htmlLegend( [ 
								  [ 'red', 'VCC',   4 ]
								, [ 'grn', 'RS',   15 ]
								, [ 'grn', 'RW',   18 ]
								, [ 'grn', 'E',    16 ]
								, [ 'grn', 'D4-7', '21-24' ]
							] )
						+ i2c + vcc1 + htmlLegend( 'red', '5V', 4 ) + scasdl
						+'</p><br>'+ ico( 'warning yl' ) +' <wh>I²C VCC</wh> - 5V to 3.3V modification'
						+'<br><img style="margin: 5px 0 0; width: 120px; height: auto;" src="/assets/img/i2cbackpack.jpg">'
		, mpdoled       : gnd + vcc1
						+ i2c + scasdl
						+ '<br><wh>SPI:</wh>'+ htmlLegend( [
								  [ 'grn', 'CLK', 23 ]
								, [ 'grn', 'MOS', 19 ]
								, [ 'grn', 'RES', 22 ]
								, [ 'grn', 'DC',  18 ]
								, [ 'grn', 'CS',  24 ]
							] ) +'</p>'
		, relays        : '<br>Jumper <c>High/Low Level Trigger</c>: <c>High</c>'
		, rotaryencoder : gnd +'<c>CLK, DT, SW: (any <grn>●</grn> pins)</c>'
						  +'<br><c>+: not use</c></p>'
	}
	var list    = '<img src="/assets/img/'+ name +'.jpg?v='+ Math.round( Date.now() / 1000 ) +'">';
	if ( ! [ 'lcd', 'powerbutton', 'relays', 'vuled' ].includes( name ) ) list += util.gpiosvg;
	if ( name in txt ) list += '<br>'+ txt[ name ];
	var pinhide = {
		  lcdchar : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26,     19,         13, 12, 11, 10, 8, 7 ]
		, mpdoled : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26, 21,     16, 15, 13, 12, 11, 10, 8, 7 ]
	}
	info( {
		  icon       : title[ name ][ 1 ] || name
		, title      : title[ name ][ 0 ]
		, list       : list
		, beforeshow : () => {
			if ( name in pinhide ) {
				pinhide[ name ].forEach( n => {
					$( '.board .p'+ n ).addClass( 'hide' );
					$( '.bcm .p'+ util.board2bcm[ n ] ).addClass( 'hide' );
				} );
			}
			$( '#infoList svg .power' ).toggleClass( 'hide', [ 'mpdoled', 'rotaryencoder' ].includes( name ) );
			$( '#infoList svg .mpdoled' ).toggleClass( 'hide', name !== 'mpdoled' );
		}
		, okno       : true
	} );
} );
$( '.refresh' ).on( 'click', util.refresh );
$( '.addnas' ).on( 'click', function() {
	SW = { icon: 'networks' }
	util.mount.mount();
} );
$( '#list' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	var $this = $( this );
	V.li      = $this;
	var i     = $this.index()
	var list  = S.liststorage[ i ];
	$( '#codestorageinfo' )
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
		$( '#menu .forget' ).toggleClass( 'hide', list.mountpoint.slice( 0, 12 ) !== '/mnt/MPD/NAS' );
		$( '#menu .remount' ).toggleClass( 'hide', mounted );
		$( '#menu .unmount' ).toggleClass( 'hide', ! mounted );
	}
	contextMenu();
} );
$( '#i2smodule' ).on( 'input', function() {
	var aplayname = this.value;
	var icon      = 'i2smodule';
	var title     = 'Audio - I²S';
	if ( aplayname === 'cirrus-wm5102' ) {
		util.wm5102();
	} else {
		bash( [ 'i2smodule', aplayname, $( this ).find( ':selected' ).text(), 'CMD APLAYNAME OUTPUT' ] );
		if ( ! aplayname ) {
			util.i2sSelect.hide();
			var msg = 'Disable ...';
		} else {
			var msg = S.i2smodule ? 'Change ...' : 'Enable ...';
		}
		notify( icon, title, msg );
	}
} ).on( 'select2:open', function( e ) {
	if ( $( '#i2smodule option' ).length > 2 ) return
	
	$( '#i2smodule' ).select2( 'close' );
	util.i2sSelect.option();
} ).on( 'select2:close', function () {
	if ( ! this.value ) util.i2sSelect.hide();
} );
$( '#ledcalc' ).on( 'click', util.ledcalc );
$( '#hostname' ).on( 'click', util.hostname );
$( '#timezone' ).on( 'input', function( e ) {
	notify( 'timezone', 'Timezone', 'Change ...' );
	bash( [ 'timezone', this.value, 'CMD TIMEZONE' ] );
} ).on( 'select2:open', function( e ) {
	if ( $( '#timezone option' ).length > 2 ) return
	
	$( '#timezone' ).select2( 'close' );
	$.post( 'cmd.php', { cmd: 'timezonelist' }, ( data ) => {
		$( '#timezone' )
			.html( data )
			.val( S.timezone )
			.select2( 'open' );
	} );
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
		bash( 'data-config.sh packagelist '+ $target.text(), data => {
			clearTimeout( timeout );
			$list.html( data );
			$target.addClass( 'wh' );
			if ( localhost ) $( '.list a' ).removeAttr( 'href' );
			bannerHide();
		} );
	} else {
		$list.addClass( 'hide' );
		$( '.listtitle a' ).removeAttr( 'class' );
	}
} );
$( '#menu a' ).on( 'click', function() {
	var cmd        = $( this ).data( 'cmd' );
	var list       = S.liststorage[ V.li.index() ];
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
			var $code = $( '#codestorageinfo' );
			if ( $code.hasClass( 'hide' ) ) {
				currentStatus( 'storageinfo', source );
			} else {
				$code.addClass( 'hide' );
			}
			break
		case 'remount':
			notify( icon, title, 'Remount ...' );
			bash( [ 'mountremount', mountpoint, source, 'CMD MOUNTPOINT SOURCE' ] );
			break;
		case 'sleep':
			var dev = list.source;
			title   = 'HDD Sleep';
			infoSetting( 'hddapm '+ dev, values => {
				if ( ! values ) {
					info( {
						  icon    : icon
						, title   : title
						, message : '<c>'+ dev +'</c> not support'
					} );
					return
				}
				
				info( {
					  icon         : icon
					, title        : title
					, list         : [ 'Timeout <gr>(min)</gr>', 'number', { updn: { step: 1, min: 1, max: 20 } } ]
					, boxwidth     : 90
					, values       : Math.round( values * 5 / 60 )
					, checkchanged : true
					, ok           : () => {
						notify( icon, title, 'Change ...' );
						bash( [ 'hddapm', dev, infoVal() * 60 / 5, 'CMD DEV LEVEL' ] );
					}
				} );
			} );
			break
		case 'unmount':
			notify( icon, title, 'Unmount ...' )
			bash( [ 'mountunmount', mountpoint, 'CMD MOUNTPOINT' ] );
			break
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
