W.reboot          = data => {
	BANNER( data.id, $( '#div'+ data.id +' .col-l .label' ).text(), 'Reboot required', 5000 );
}
W.storage         = data => {
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		S.list.storage = data.list;
		UTIL.renderStorage();
		if ( $( '#data' ).length ) $( '#data' ).html( COMMON.json.highlight( S ) );
	}, 1000 );
}

var CONFIG        = {
	  _disable      : {
		  shareddata : () => {
			INFO( {
				  ...SW
				, message : 'Disable and restore local data?'
				, cancel  : SWITCH.cancel
				, okcolor : V.orange
				, ok      : () => {
					NOTIFY_COMMON( 'Disable ...' );
					BASH( [ 'shareddatadisable', 'OFF' ] );
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
			INFO( {
				  ...SW
				, message : 'Save all data and settings'
				, list    : [ 'Filename', 'text', { suffix: '.gz' } ]
				, values  : 'rAudio_backup-'+ ymd
				, cancel  : SWITCH.cancel
				, ok      : () => {
					NOTIFY_COMMON( 'Process ...' );
					BASH( 'system-databackup.sh', data => {
						if ( data == 1 ) {
							NOTIFY_COMMON( 'Download ...' );
							fetch( '/data/shm/backup.gz' )
								.then( response => response.blob() )
								.then( blob => {
									var url = window.URL.createObjectURL( blob );
									var a = document.createElement( 'a' );
									a.style.display = 'none';
									a.href = url;
									a.download = _INFO.val() +'.gz';
									document.body.appendChild( a );
									a.click();
									setTimeout( () => {
										a.remove();
										window.URL.revokeObjectURL( url );
										BANNER_HIDE();
									}, 1000 );
								} ).catch( () => {
									_INFO.warning( SW.icon, SW.title, 'File download failed.' )
									BANNER_HIDE();
								} );
						} else {
							INFO( {
								  ...SW
								, message : 'Backup failed.'
							} );
							BANNER_HIDE();
						}
					} );
				}
			} );
		}
		, i2s     : () => UTIL.i2sSelect.option()
		, restore : () => {
			INFO( {
				  ...SW
				, tablabel : [ 'From Backup', 'Reset To Default' ]
				, tab      : [ '', UTIL.restoreReset ]
				, list     : [ 'Library database only', 'checkbox' ]
				, file     : { oklabel: ICON( 'restore' ) +'Restore', type : '.gz' }
				, cancel   : SWITCH.cancel
				, oklabel  : ICON( 'restore' ) +'Restore'
				, okcolor  : V.orange
				, ok       : () => {
					NOTIFY_COMMON( 'Restore ...' );
					var formdata = new FormData();
					formdata.append( 'cmd', 'datarestore' );
					formdata.append( 'file', I.infofile );
					formdata.append( 'libraryonly', _INFO.val() );
					fetch( 'cmd.php', { method: 'POST', body: formdata } )
						.then( response => response.text() )
						.then( message => {
							COMMON.loaderHide();
							if ( message ) {
								BANNER_HIDE();
								_INFO.warning(  SW.icon,  SW.title, message );
							}
						} );
					COMMON.loader();
				}
			} );
		}
		, shareddata    : () => UTIL.mount.mount()
	}
	, bluetooth     : values => {
		INFO( {
			  ...SW
			, list         : [
				  [ 'Discoverable <gr>by senders</gr>',             'checkbox' ]
				, [ 'Sampling 16bit 44.1kHz <gr>to receivers</gr>', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.bluetooth
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, i2smodule     : () => {
		if ( S.audioaplayname === 'cirrus-wm5102' ) {
			UTIL.wm5102();
		} else {
			SETTING( 'i2smodule', values => {
				INFO( {
					  ...SW
					, list         : [ 'Disable I²S HAT EEPROM read', 'checkbox' ]
					, values       : values
					, checkchanged : true
					, ok           : () => BASH( [ 'i2seeprom', _INFO.val() ] )
				} );
			} );
		}
	}
	, lcdchar       : data => {
		UTIL.lcdchar[ data.values.INF ]( data );
	}
	, mpdoled       : values => {
		var chip       = {
			  'SSD130x SP'  : 1
			, 'SSD130x I²C' : 3
			, 'Seeed I²C'   : 4
			, 'SH1106 I²C'  : 6
			, 'SH1106 SPI'  : 7
		}
		INFO( {
			  ...SW
			, list         : [
				  [ 'Controller',              'select', chip ]
				, [ 'Refresh <gr>(baud)</gr>', 'select', { kv: { '800,000': 800000, '1,000,000': 1000000, '1,200,000': 1200000 } } ]
				, [ 'Spectrum only',        'checkbox' ]
			]
			, values       : values
			, checkchanged : S.mpdoled
			, boxwidth     : 140
			, beforeshow   : () => {
				var $tr   = $( '#infoList tr' );
				var $baud = $tr.eq( 1 )
				$baud.toggleClass( 'hide', S.mpdoled && ( values.CHIP < 3 || values.CHIP > 6 ) );
				$tr.eq( 0 ).on( 'input', function() {
					var val = this.value;
					$baud.toggleClass( 'hide', val < 3 || val > 6 );
				} );
			}
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, powerbutton   : values => {
		values === true ? UTIL.powerbutton.ap() : UTIL.powerbutton.sw( values );
	}
	, relays        : data => {
		S.relays ? UTIL.relays.order( data ) : UTIL.relays.name( data );
	}
	, rotaryencoder : values => {
		INFO( {
			  ...SW
			, message      : UTIL.gpiosvg
			, list         : [
				  [ 'CLK',  'select', UTIL.board2bcm ]
				, [ 'DT',   'select', UTIL.board2bcm ]
				, [ 'SW',   'select', UTIL.board2bcm ]
				, [ 'Step', 'radio',  { '1%': 1, '2%': 2 } ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.rotaryencoder
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
			, fileconf     : true
		} );
	}
	, soundprofile  : values => {
		INFO( {
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
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
			, fileconf     : true
		} );
	}
	, templimit     : values => {
		INFO( {
			  ...SW
			, list         : [ 'Throttle at <gr>(°C)</gr>', 'number', { updn: { step: 1, min: 60, max: 70 } } ]
			, footer       : '(default: 60)'
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.templimit || ! S.templimit && values.DEGREE === 60
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, timezone      : () => UTIL.server.ntp()
	, tft           : values => {
		var type = {
			  'Generic'               : 'tft35a'
			, 'Waveshare (A)'         : 'waveshare35a'
			, 'Waveshare (B)'         : 'waveshare35b'
			, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
			, 'Waveshare (C)'         : 'waveshare35c'
		}
		INFO( {
			  ...SW
			, list         : [ 'Type', 'select', type ]
			, footer       : '<span>'+ ICON( 'cursor' ) +'Calibrate</span>'
			, values       : values
			, checkchanged : S.tft
			, boxwidth     : 190
			, beforeshow   : () => {
				$( '.infofooter span' )
					.toggleClass( 'disabled', ! S.tft )
					.on( 'click', function() {
						NOTIFY( SW.icon, 'Calibrate Touchscreen', 'Start ...' );
						BASH( [ 'tftcalibrate' ] );
				} );
			}
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, vuled         : data => {
		var list   = [ [ ICON( 'vuled gr' ) +' LED', ICON( 'gpiopins gr' ) +'Pin', '' ] ];
		var prefix = '<gr>#</gr> ';
		data.values.forEach( ( p, i ) => list.push(  [ prefix + ( i + 1 ), 'select', UTIL.board2bcm ] ) );
		INFO( {
			  ...SW
			, message      : UTIL.gpiosvg
			, list         : list
			, footer       : ICON( 'power' ) +'On/Off'
			, values       : data.values
			, checkchanged : S.vuled
			, checkunique  : true
			, boxwidth     : 70
			, beforeshow   : () => {
				$( '#infoList .infofooter' ).on( 'click', function() {
					var pins = _INFO.val();
					var on   = ! pins.some( p => data.state[ p ] );
					var pin  = '';
					pins.forEach( p => {
						data.state[ p ] = on;
						pin += p +'='+ on +' ';
						$( '#infoList circle[ data-bcm="'+ p +'" ]' ).toggleClass( 'on', on );
					} );
					BASH( [ 'gpiotoggle', pin, 'CMD PIN' ] );
				} );
				_INFO.addRemove( () => {
					var infoval = _INFO.val( 'array' );
					$( '#infoList tr' ).each( ( i, el ) => {
						if ( i ) $( el ).find( 'td' ).eq( 0 ).html( prefix + i );
						$( '#infoList .i-remove' ).toggleClass( 'disabled', $( '#infoList select' ).length < 2 );
					} );
				} );
				UTIL.gpioState( data.state );
			}
			, cancel       : SWITCH.cancel
			, ok           : () => {
				NOTIFY_COMMON();
				BASH( [ 'vuled', _INFO.val().join( ' ' ), 'CMD PINS' ] );
			}
		} );
	}
	, wlan          : data => {
		var accesspoint = 'Auto start Access Point<br>'+ COMMON.sp( 30 ) +'<gr>(if not connected)</gr>';
		INFO( {
			  ...SW
			, list         : [
				  [ 'Country',   'select', data.list ]
				, [ accesspoint, 'checkbox' ]
			]
			, boxwidth     : 250
			, values       : data.values
			, checkchanged : S.wlan
			, beforeshow   : () => COMMON.select.text2Html( { '00': '00 <gr>(allowed worldwide)</gr>' } )
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
}
var UTIL          = {
	  board2bcm     : {
		   3:2,   5:3,   7:4,   8:14, 10:15, 11:17, 12:18, 13:27, 15:22, 16:23, 18:24, 19:10, 21:9
		, 22:25, 23:11, 24:8,  26:7,  29:5,  31:6,  32:12, 33:13, 35:19, 36:16, 37:26, 38:20, 40:21
	}
	, gpioState     : state => {
		if ( ! state ) return // relays / vuled active
		
		$( '#infoList circle[ data-bcm ]' ).each( ( i, el ) => {
			var $el = $( el );
			$el.toggleClass( 'on', state[ $el.data( 'bcm' ) ] );
		} );
		$( '#infoOverlay' ).on( 'click', 'circle', function( e ) {
			var p = $( this ).data( 'bcm' );
			var on  = ! state[ p ];
			state[ p ] = on;
			$( '#infoList circle[ data-bcm="'+ p +'" ]' ).toggleClass( 'on', on );
			BASH( [ 'gpiotoggle', p +'='+ on, 'CMD PIN' ] );
		} );
	}
	, gpiosvg       : $( '#gpiosvg' ).html()
	, hostname      : () => {
		SW = {
			  id    : 'hostname'
			, icon  : 'hostname'
			, title : 'Player Name'
		}
		INFO( {
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
				SWITCH.enable();
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
					UTIL.i2sSelect.show();
					$( '#i2smodule' ).select2( 'open' );
				}
			} else {
				$( '#i2smodule' ).select2( 'close' );
				SETTING( 'i2slist', list => {
					list[ '(None / Auto detect)' ] = '';
					$( '#i2smodule' ).html( COMMON.htmlOption( list ) );
					UTIL.i2sSelect.select();
					UTIL.i2sSelect.show();
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
		  gpio : data => {
			var list0 = COMMON.json.clone( UTIL.lcdchar.list );
			var list  = list0.slice( 0, 3 );
			[ 'Pins: &emsp; D4', 'RS', 'D5', 'RW', 'D6', 'E', 'D7' ].forEach( ( k, i ) => {
				list.push( [ k, 'select', { kv: UTIL.board2bcm, sameline: i % 2 === 0 } ] );
			} );
			list.push( [ '', '' ], list0.slice( -1 )[ 0 ] );
			INFO( {
				  ...UTIL.lcdchar.json
				, tab          : [ () => SETTING( 'lcdchar i2c', CONFIG.lcdchar ), '' ]
				, message      : UTIL.gpiosvg
				, list         : list
				, boxwidth     : 70
				, values       : data.values
				, checkchanged : S.lcdchar && data.current === 'gpio'
			} );
		}
		, i2c  : data => {
			var list          = COMMON.json.clone( UTIL.lcdchar.list );
			list[ 3 ][ 2 ].kv = data.address;
			INFO( {
				  ...UTIL.lcdchar.json
				, tab          : [ '', () => SETTING( 'lcdchar gpio', CONFIG.lcdchar ) ]
				, list         : list
				, boxwidth     : 180
				, values       : data.values
				, checkchanged : S.lcdchar && data.current === 'i2c'
			} );
		}
		, json : {
			  icon       : 'lcdchar'
			, title      : 'Character LCD'
			, tablabel   : [ 'I&#178;C', 'GPIO' ]
			, beforeshow : () => {
				if ( I.values[ 0 ] === 'gpio' ) $( '#infoList label' ).parents( 'td' ).prop( 'colspan', 3 );
				$( '#infoList label' ).css( 'width', '70px' );
			}
			, cancel   : SWITCH.cancel
			, ok       : () => {
				
				COMMON.json.save( 'lcdchar', _INFO.val() );
				SWITCH.enable();
			}
		}
		, list : [
			  [ 'Type',                 'hidden'  ]
			, [ 'Size',                 'radio',    { kv: { '20x4': 20, '16x2': 16 } } ]
			, [ 'Character Map',        'radio',    { kv: [ 'A00', 'A02' ] } ]
			, [ 'Address',              'radio',    [ '' ] ] // set by SETTING
			, [ 'Chip',                 'select',   [ 'PCF8574', 'MCP23008', 'MCP23017' ] ]
			, [ 'Idle sleep <gr>(60s)', 'checkbox' ]
		]
	}
	, ledcalc       : () => {
		INFO( {
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
		  mount   : values => {
			if ( ! values || values === 'nfs' ) {
				if ( values ) {
					values = {
						  PROTOCOL : 'nfs'
						, NAME     : ''
						, IP       : COMMON.ipSub( S.ip )
						, SHARE    : ''
						, OPTIONS  : ''
					}
				} else {
					values = {
						  PROTOCOL : 'cifs'
						, NAME     : ''
						, IP       : COMMON.ipSub( S.ip )
						, SHARE    : ''
						, USR      : ''
						, PASSWORD : ''
						, OPTIONS  : '' 
					}
				}
			}
			var nfs        = values.PROTOCOL === 'nfs';
			var tab        = nfs ? [ UTIL.mount.mount, '' ] : [ '', () => UTIL.mount.mount( 'nfs' ) ];
			var shareddata = SW.id === 'shareddata';
			if ( shareddata ) tab.push( UTIL.mount.rServer );
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
			INFO( {
				  icon       : icon
				, title      : title
				, tablabel   : shareddata ? UTIL.mount.tab : [ 'CIFS', 'NFS' ]
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
				, cancel     : SWITCH.cancel
				, oknoreset  : true
				, ok         : () => {
					var infoval = _INFO.val();
					if ( ! shareddata && infoval.NAME === 'data' ) infoval.NAME += '1'; // reserve 'data' for shared data
					infoval.SHAREDDATA = shareddata;
					var keys = Object.keys( infoval );
					var vals = Object.values( infoval );
					NOTIFY( icon, title, shareddata ? 'Enable ...' : 'Add ...' );
					UTIL.mount.set( [ ...vals, 'CMD '+ keys.join( ' ' ) ], infoval );
				}
			} );
		}
		, rServer : values => {
			INFO( {
				  ...SW
				, tablabel  : UTIL.mount.tab
				, tab       : [ UTIL.mount.mount, () => UTIL.mount.mount( 'nfs' ), '' ]
				, list      : [ 'Server IP', 'text' ]
				, values    : values || { IP: I.active && I.values ? _INFO.val().IP : COMMON.ipSub( S.ip ) }
				, checkip   : [ 0 ]
				, cancel    : SWITCH.cancel
				, oknoreset : true
				, ok        : () => {
					var infoval = _INFO.val();
					NOTIFY( SW.icon, SW.title, 'Connect Server rAudio ...' );
					UTIL.mount.set( [ infoval.IP, true, 'CMD IP SHAREDDATA' ], infoval );
				}
			} );
		}
		, set     : ( args, values ) => {
			BASH( [ 'settings/system-mount.sh', 'cmd', ...args ], error => {
				if ( error ) {
					_INFO.warning( SW.icon, SW.title, '<wh>Mount failed:</wh><br><br>'+ error, () => {
						'PROTOCOL' in values ? UTIL.mount.mount( values ) : UTIL.mount.rServer( values );
					} )
				} else {
					$( '#infoX' ).trigger( 'click' );
				}
			} );
		}
		, tab     : [ 'CIFS', 'NFS', ICON( 'rserver' ) +' rAudio' ]
	}
	, powerbutton   : {
		  sw : values => {
			INFO( {
				  ...SW
				, tablabel     : [ 'Generic', 'Audiophonic' ]
				, tab          : [ '', UTIL.powerbutton.ap ]
				, message      : UTIL.gpiosvg
				, list         : [ 
					  [ 'On',       'select', { 5: 3 } ]
					, [ 'Off',      'select', UTIL.board2bcm ]
					, [ 'LED',      'select', UTIL.board2bcm ]
				]
				, boxwidth     : 70
				, values       : values
				, checkchanged : S.powerbutton
				, beforeshow   : () => $( '.pwr' ).removeClass( 'hide' )
				, cancel       : SWITCH.cancel
				, ok           : SWITCH.enable
				, fileconf     : true
			} );
		}
		, ap : () => {
			INFO( {
				  ...SW
				, tablabel     : [ 'Generic', 'Audiophonic' ]
				, tab          : [ () => SETTING( 'powerbutton', UTIL.powerbutton.sw ), '' ]
				, list         : [ 'Power management module', 'checkbox' ]
				, checkchanged : S.powerbutton
				, values       : { ON: true }
				, cancel       : SWITCH.cancel
				, ok           : SWITCH.enable
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
			BASH( 'system-data.sh status', data => {
				$( '#divstatus .value' ).html( data );
				$this.toggleClass( 'i-refresh blink i-flash' );
				setTimeout( () => $this.toggleClass( 'i-refresh blink i-flash' ), 300 );
			} );
		}, 10000 );
		}
	, relays        : {
		  name   : data => {
			var name   = data.names;
			var keys   = Object.keys( name );
			var values = [];
			keys.forEach( p => values.push( p, name[ p ] ) );
			var list   = [
				  [ '', ICON( 'gpiopins gr' ) +'Pin', { sameline: true } ]
				, [ '', ICON( 'tag gr' ) +' Name' ]
			];
			var kL     = keys.length;
			for ( var i = 0; i < kL; i++ ) {
				list.push( [ '', 'select', { kv: UTIL.board2bcm, sameline: true } ], [ '', 'text' ] );
			}
			INFO( {
				  ...SW
				, tablabel     : UTIL.relays.tab
				, tab          : [ () => UTIL.relays.order( data ), '' ]
				, message      : UTIL.gpiosvg
				, list         : list
				, boxwidth     : 80
				, propmt       : true
				, checkblank   : true
				, checkchanged : S.relays
				, checkunique  : true
				, values       : values
				, beforeshow   : () => {
					$( '#infoList td' ).css( { 'padding-right': 0, 'text-align': 'left' } );
					$( '#infoList td:first-child' ).remove();
					$( '#infoList input' ).parent().addBack().css( 'width', '160px' );
					$( '#infoList' ).on( 'click', '.i-power', function() {
						BASH( [ 'relays.sh', $this.hasClass( 'grn' ) ? '' : 'off' ] );
					} );
					_INFO.addRemove();
					UTIL.gpioState( data.state );
				}
				, cancel       : SWITCH.cancel
				, ok           : () => UTIL.relays.set( data )
			} );
		}
		, order  : data => {
			var pin    = data.relays;
			var name   = data.names;
			var names  = {}
			$.each( name, ( k, v ) => { names[ v ] = k } );
			var step   = { step: 1, min: 0, max: 10 }
			var list   = [
				  [ '', ICON( 'power grn' ) +' On <gr>(s)</gr>',  { sameline: true, colspan: 2 } ]
				, [ '', ICON( 'power red' ) +' Off <gr>(s)</gr>', { colspan: 2 } ]
			];
			var values = [];
			var pL     = pin.ON.length;
			for ( var i = 0; i < pL; i++ ) {
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
					var idle = ICON( 'stoptimer yl' ) +' Idle to Off <gr>(m)</gr>';
					list.push(
						  [ idle, 'checkbox', { sameline: true, colspan: 2 } ]
						, [ '',   'number',   { updn: { step: 1, min: 2, max: 30 } } ]
					);
					values.push( pin.TIMERON );
					values.push( pin.TIMER );
				}
			}
			INFO( {
				  ...SW
				, tablabel     : UTIL.relays.tab
				, tab          : [ '', () => UTIL.relays.name( data ) ]
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
					$( '#infoList' ).on( 'input', 'select', function() {
						var $select = $( '#infoList select' );
						var von   = [];
						var voff  = [];
						$select.each( ( i, el ) => {
							var ar = i % 2 ? von : voff;
							ar.push( $( el ).val() );
						} );
						if ( von.length !== new Set( von ).size || voff.length !== new Set( voff ).size ) BANNER( SW.icon, SW.title, 'Duplicate devices', 6000 )
					} );
					$( '#infoList input:checkbox' ).on( 'input', function() {
						$timer.toggleClass( 'hide', ! $( this ).prop( 'checked' ) );
					} );
					UTIL.gpioState( data.state );
				}
				, cancel       : SWITCH.cancel
				, ok           : () => UTIL.relays.set( data )
			} );
		}
		, set    : data => {
			var order   = data.relays;
			var name    = data.names;
			var v       = _INFO.val();
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
				for ( var i = 0; i < pL; i++ ) {
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
			if ( S.relays || ! tabname ) {
				NOTIFY_COMMON();
				BASH( [ 'relays', ...pins, 'CFG '+ keys.join( ' ' ) ] );
				COMMON.json.save( 'relays', name );
			} else {
				UTIL.relays.order( data );
			}
		}
		, tab    : [ ICON( 'power' ) +' Sequence', ICON( 'tag' ) +' Pin - Name' ]
	}
	, renderStorage : () => {
		if ( LIST.equal( 'storage' ) ) return
		
		var html = '';
		S.list.storage.forEach( list => {
			var mountpoint = list.mountpoint;
			var source     = list.source;
			html		  += '<li data-id="'+ source +'" data-mountpoint="'+ mountpoint +'">'
							+ ICON( list.icon ) + mountpoint.slice( 9 ) +'&ensp;'
							+ ( list.size ? '<grn>•</grn>' : '<red>•</red>' ) +'&ensp;'+ list.size +' <c>'+ source +'</c></li>';
		} );
		LIST.render( 'storage', html );
	}
	, restoreReset  : () => {
		INFO( {
			  ...SW
			, tablabel : [ 'From Backup', 'Reset To Default' ]
			, tab      : [ () => $( '#restore' ).triger( 'click' ), '' ]
			, list     : [
				  [ 'Keep Library data',     'checkbox' ]
				, [ 'Keep Network settings', 'checkbox' ]
			]
			, oklabel  : ICON( 'set0' ) +'Reset'
			, okcolor  : V.orange
			, ok       : () => {
				NOTIFY_COMMON( 'Reset to default ...' );
				BASH( [ 'settings/system-datareset.sh', 'cmd', ..._INFO.val(), 'CMD KEEPLIBRARY KEEPNETWORK' ] );
				COMMON.loader();
			}
		} );
		$( '#restore' ).prop( 'checked', 0 );
	}
	, server        : {
		  mirror : () => {
			NOTIFY_COMMON( 'Get mirror server list ...' );
			SETTING( 'servermirror', data => {
				BANNER_HIDE();
				SW.id = 'mirror';
				INFO( {
					  ...SW
					, tablabel     : [ 'Time', 'Package Mirror' ]
					, tab          : [ () => SETTING( 'serverntp', UTIL.server.ntp ), '' ]
					, list         : [ 'Mirror', 'select', data.list ]
					, boxwidth     : 240
					, values       : data.values
					, checkchanged : true
					, beforeshow   : () => COMMON.select.text2Html( { Auto: 'Auto <gr>(by Geo-IP)</gr>' } )
					, ok           : SWITCH.enable
				} );
			} );
		}
		, ntp    : () => {
			SETTING( 'serverntp', data => {
				SW.id    = 'ntp';
				SW.title = 'Servers';
				if ( ! data.rpi01 ) {
					SW.tablabel = [ 'Time', 'Package Mirror' ];
					SW.tab      = [ '', UTIL.server.mirror ];
				}
				INFO( {
					  ...SW
					, list         : [ 'NTP', 'text' ]
					, boxwidth     : 240
					, values       : data.values
					, checkchanged : true
					, checkblank   : [ 0 ]
					, ok           : SWITCH.enable
				} );
			} );
		}
	}
	, wm5102        : () => {
		SETTING( 'audio-wm5102', data => {
			var icon   = 'i2s';
			var output = $( '#i2smodule' ).find( ':selected' ).text();
			INFO( {
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
					NOTIFY( icon, output, 'Change ...' );
					BASH( [ 'i2smodule', 'cirrus-wm5102', output, _INFO.val(), 'CMD APLAYNAME OUTPUT OUTPUTTYPE' ] );
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
	UTIL.renderStorage();
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
				.prev().html( S.ap ? LABEL_ICON( 'Access Point', 'ap' ) +' is currently enabled.' : LABEL_ICON( 'Wi-Fi', 'wifi' ) +' is currently connected.' );
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
			UTIL.i2sSelect.select();
		} else {
			$( '#i2smodule' ).html( '<option></option><option selected>'+ S.audiooutput +'</option>' );
		}
		UTIL.i2sSelect.show();
	} else {
		UTIL.i2sSelect.hide();
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
	$( '#divtemplimit' ).toggleClass( 'hide', ! S.rpi3plus );
	$( '#shareddata' ).toggleClass( 'disabled', S.nfsserver );
	$( 'a[ href ]' ).prop( 'tabindex', -1 );
	CONTENT();
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.power' ).on( 'click', COMMON.power );
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
						+'</p><br>'+ ICON( 'warning yl' ) +' <wh>I²C VCC</wh> - 5V to 3.3V modification'
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
	if ( ! [ 'lcd', 'powerbutton', 'relays', 'vuled' ].includes( name ) ) list += UTIL.gpiosvg;
	if ( name in txt ) list += '<br>'+ txt[ name ];
	var pinhide = {
		  lcdchar : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26,     19,         13, 12, 11, 10, 8, 7 ]
		, mpdoled : [ 40, 38, 37, 36, 35, 33, 32, 31, 29, 26, 21,     16, 15, 13, 12, 11, 10, 8, 7 ]
	}
	INFO( {
		  icon       : title[ name ][ 1 ] || name
		, title      : title[ name ][ 0 ]
		, list       : list
		, beforeshow : () => {
			if ( name in pinhide ) {
				pinhide[ name ].forEach( n => {
					$( '.board .p'+ n ).addClass( 'hide' );
					$( '.bcm .p'+ UTIL.board2bcm[ n ] ).addClass( 'hide' );
				} );
			}
			$( '#infoList svg .power' ).toggleClass( 'hide', [ 'mpdoled', 'rotaryencoder' ].includes( name ) );
			$( '#infoList svg .mpdoled' ).toggleClass( 'hide', name !== 'mpdoled' );
		}
		, okno       : true
	} );
} );
$( '.refresh' ).on( 'click', UTIL.refresh );
$( '.addnas' ).on( 'click', function() {
	SW = { icon: 'networks' }
	UTIL.mount.mount();
} );
$( '#storage' ).on( 'click', 'li', function( e ) {
	var $li        = $( this );
	if ( MENU.isActive( $li, e ) ) return
	
	var mountpoint = $li.data( 'mountpoint' );
	var shareddata = [ '/mnt/MPD/NAS', '/mnt/MPD/NAS/data' ].includes( mountpoint );
	if ( shareddata ) {
		INFO( {
			  icon    : 'networks'
			, title   : 'Network Storage'
			, message : 'Used by <wh>Shared Data '+ ICON( 'networks' ) +'</wh>'
		} );
		return
	}
	
	if ( mountpoint === '/mnt/MPD/SD' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .info' ).removeClass( 'hide' );
	} else {
		var mounted = $li.find( 'grn' ).length === 1;
		var usb     = mountpoint.substr( 9, 3 ) === 'USB';
		$MENU.find( '.info, .sleep' ).toggleClass( 'hide', ! usb );
		$( '#menu .forget' ).toggleClass( 'hide', shareddata || usb );
		$( '#menu .mount' ).toggleClass( 'hide', mounted );
		$( '#menu .unmount' ).toggleClass( 'hide', ! mounted );
	}
	MENU.show( $li );
} );
$( '#i2smodule' ).on( 'input', function() {
	var aplayname = this.value;
	var icon      = 'i2smodule';
	var title     = 'Audio - I²S';
	if ( aplayname === 'cirrus-wm5102' ) {
		UTIL.wm5102();
	} else {
		BASH( [ 'i2smodule', aplayname, $( this ).find( ':selected' ).text(), 'CMD APLAYNAME OUTPUT' ] );
		if ( ! aplayname ) {
			UTIL.i2sSelect.hide();
			var msg = 'Disable ...';
		} else {
			var msg = S.i2smodule ? 'Change ...' : 'Enable ...';
		}
		NOTIFY( icon, title, msg );
	}
} ).on( 'select2:open', function( e ) {
	if ( $( '#i2smodule option' ).length > 2 ) return
	
	$( '#i2smodule' ).select2( 'close' );
	UTIL.i2sSelect.option();
} ).on( 'select2:close', function () {
	if ( ! this.value ) UTIL.i2sSelect.hide();
} );
$( '#ledcalc' ).on( 'click', UTIL.ledcalc );
$( '#hostname' ).on( 'click', UTIL.hostname );
$( '#timezone' ).on( 'input', function( e ) {
	NOTIFY( 'timezone', 'Timezone', 'Change ...' );
	BASH( [ 'timezone', this.value, 'CMD TIMEZONE' ] );
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
		if ( V.localhost ) $( '.list a' ).remove();
	} else if ( $target.is( 'a' ) ) {      // package
		var active = $target.hasClass( 'wh' );
		$( '.listtitle a' ).removeAttr( 'class' );
		if ( active ) {
			$list.empty();
			return
		}
		
		var timeout = setTimeout( () => BANNER( 'system blink', 'Backend', 'List ...', -1 ), 1000 );
		BASH( 'data-config.sh packagelist '+ $target.text(), data => {
			clearTimeout( timeout );
			$list.html( data );
			$target.addClass( 'wh' );
			if ( V.localhost ) $( '.list a' ).removeAttr( 'href' );
			BANNER_HIDE();
		} );
	} else {
		$list.addClass( 'hide' );
		$( '.listtitle a' ).removeAttr( 'class' );
	}
} );
$( '#menu a' ).on( 'click', function( e ) {
	var cmd = MENU.command( $( this ), e );
	if ( ! cmd ) return
	
	var $li        = $( 'li.active' );
	var mountpoint = $li.data( 'mountpoint' );
	var source     = $li.data( 'id' );
	if ( mountpoint.slice( 9, 12 ) === 'NAS' ) {
		var icon  = 'networks';
		var title = 'Network Mount';
	} else {
		var icon  = 'usbdrive';
		var title = 'Local Mount';
	}
	switch ( cmd ) {
		case 'forget':
			NOTIFY( icon, title, 'Forget ...' );
			BASH( [ 'forget', mountpoint, 'CMD MOUNTPOINT' ] );
			break
		case 'info':
			STATUS( 'storage', source, 'info' );
			break
		case 'mount':
			NOTIFY( icon, title, 'Mount ...' );
			BASH( [ 'mount', mountpoint, source, 'CMD MOUNTPOINT SOURCE' ] );
			break;
		case 'sleep':
			var dev = list.source;
			title   = 'HDD Sleep';
			SETTING( 'hddapm '+ dev, values => {
				if ( ! values ) {
					INFO( {
						  icon    : icon
						, title   : title
						, message : '<c>'+ dev +'</c> not support'
					} );
					return
				}
				
				INFO( {
					  icon         : icon
					, title        : title
					, list         : [ 'Timeout <gr>(min)</gr>', 'number', { updn: { step: 1, min: 1, max: 20 } } ]
					, boxwidth     : 90
					, values       : Math.round( values * 5 / 60 )
					, checkchanged : true
					, ok           : () => {
						NOTIFY( icon, title, 'Change ...' );
						BASH( [ 'hddapm', dev, _INFO.val() * 60 / 5, 'CMD DEV LEVEL' ] );
					}
				} );
			} );
			break
		case 'unmount':
			NOTIFY( icon, title, 'Unmount ...' )
			BASH( [ 'unmount', mountpoint, 'CMD MOUNTPOINT' ] );
			break
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
