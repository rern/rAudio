var render  = {
	  bluetooth : () => {
		if ( ! $( '#divbluetooth' ).hasClass( 'hide' ) ) $( '#divbluetooth .back' ).trigger( 'click' );
		if ( S.listbt ) {
			var htmlbt  = '';
			S.listbt.forEach( list => {
				var dot = list.connected ? '<grn>•</grn>' : '<gr>•</gr>';
				htmlbt += '<li class="bt" data-mac="'+ list.mac +'" data-name="'+ list.name +'">'
						 + ico( list.type === 'Source' ? 'btsender' : 'bluetooth' ) + dot +'&ensp;'+ list.name +'</li>';
			} );
			$( '#listbt' ).html( htmlbt );
		} else {
			$( '#listbt' ).empty();
		}
		$( '#divbt' ).removeClass( 'hide' );
	}
	, wlan      : () => {
		if ( ! $( '#divwifi' ).hasClass( 'hide' ) ) $( '#divwifi .back' ).trigger( 'click' );
		var htmlwl = '';
		if ( S.ap ) {
			htmlwl += '<li class="wl ap">'+ ico( 'ap' ) +'<grn>•</grn>&ensp;'
					 +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.apconf.ip +'</li>';
		}
		if ( S.listwl ) {
			S.listwl.forEach( list => {
				if ( list.ip ) {
					var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
					htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'">'+ ico( 'wifi'+ signal ) +'<grn>•</grn>&ensp;'+ list.ssid 
							 +'&ensp;<gr>•</gr>&ensp;'+ list.ip +'&ensp;<gr>&raquo;&ensp;'+ list.gateway +'</gr></li>';
				} else {
					htmlwl += '<li class="wl notconnected" data-ssid="'+ list.ssid +'">'+ ico( 'wifi' ) +'<gr>•</gr>&ensp;'+ list.ssid +'</li>';
				}
			} );
		}
		$( '#listwl' ).html( htmlwl );
		$( '#divwl' ).removeClass( 'hide' );
		bannerHide();
	}
}
var setting = {
	  accessPoint : () => {
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : 'Access Point is currently active.'
		} );
	}
	, lan         : v => {
		var icon   = 'lan';
		var title  = ( v ? 'Edit' : 'Add' ) +' LAN Connection';
		var values = v || { ADDRESS: ipSub( S.ip ), GATEWAY: S.gateway }
		var button = ! v ? '' : {
			  buttonlabel : ico( 'undo' ) +'DHCP'
			, button      : values.DHCP ? '' : () => {
				bash( [ 'lanedit' ] );
				notify( icon, title, 'Reconnect ...' );
			}
		}
		info( {
			  icon         : icon
			, title        : title
			, list         : [
				  [ 'IP',      'text' ]
				, [ 'Gateway', 'text' ]
			]
			, footer       : v ? warning( 'This is' ) : ''
			, values       : values
			, focus        : 0
			, checkchanged : true
			, checkblank   : true
			, checkip      : [ 0, 1 ]
			, ...button
			, ok           : () => {
				var v = infoVal();
				var ip   = v.ADDRESS;
				bash( [ 'lanedit', ...Object.values( v ), 'CMD '+ Object.keys( v ).join( ' ' ) ], avail => {
					if ( avail == -1 ) {
						clearInterval( V.interval );
						clearTimeout( V.timeout );
						bannerHide();
						info( {
							  icon    : icon
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ v.ADDRESS +'</wh> already in use.'
							, ok      : () => setting.lan( v )
						} );
					} else {
						notify( icon, title, v ? 'Reconnect ...' : 'Connect ...' );
					}
				} );
			}
		} );
	}
	, wifi        : v => {
		var list = [
			  [ 'SSID',         'text' ]
			, [ 'Password',     'password' ]
			, [ 'IP',           'text' ]
			, [ 'Gateway',      'text' ]
			, [ 'WEP Protocol', 'checkbox' ]
			, [ 'Hidden SSID',  'checkbox' ]
		];
		var default_v = {
			  dhcp   : { ESSID: '', KEY: '',                           SECURITY: false, HIDDEN: false }
			, static : { ESSID: '', KEY: '', ADDRESS: '', GATEWAY: '', SECURITY: false, HIDDEN: false }
		}
		if ( v ) {
			var dhcp   = ! ( 'ADDRESS' in v );
			var values = v;
		} else {
			var dhcp   = true;
			var values = default_v[ 'dhcp' ];
		}
		if ( dhcp ) {
			var tabfn = () => {
				if ( V.profilestatic ) {
					setting.wifi( V.profile );
				} else {
					var val = infoVal();
					val.ADDRESS = ipSub( S.ip );
					val.GATEWAY = S.gateway;
					var v       = {}
					Object.keys( default_v.static ).forEach( k => v[ k ] = val[ k ] );
					setting.wifi( v );
				}
			}
			list.splice( 2, 2 );
		} else {
			var tabfn = () => {
				if ( ! V.profilestatic ) {
					setting.wifi( V.profile );
				} else {
					var val = infoVal();
					[ 'ADDRESS', 'GATEWAY' ].forEach( k => delete val[ k ] );
					setting.wifi( val );
				}
			}
		}
		if ( V.profile ) {
			var checkchanged = ( values.ADDRESS && V.profilestatic ) || ( ! values.ADDRESS && ! V.profilestatic );
		} else {
			var checkchanged = false;
		}
		info( {
			  icon         : 'wifi'
			, title        : V.profile ? 'Edit Connection' : 'Add Connection'
			, tablabel     : [ 'DHCP', 'Static IP' ]
			, tab          : dhcp ? [ '', tabfn ] : [ tabfn, '' ]
			, boxwidth     : 180
			, list         : list
			, footer       : V.profile ? warning( 'This is' ) : ''
			, values       : values
			, focus        : V.profile ? ( dhcp ? 0 : 2 ) : 0
			, checkchanged : checkchanged
			, checkblank   : [ 0 ]
			, checklength  : { 1: [ 8, 'min' ] }
			, checkip      : dhcp ? '' : [ 2, 3 ]
			, ok           : () => {
				var val = infoVal();
				connectWiFi( val );
				notify( 'wifi', val.ESSID, v ? 'Change ...' : 'Connect ...' );
			}
		} );
	}
}
function bluetoothCommand( action ) {
	var icon  = V.li.find( 'i' ).hasClass( 'i-btsender' ) ? 'btsender' : 'bluetooth';
	notify( icon, V.li.data( 'name' ), capitalize( action ) +' ...', -1 );
	bash( [ 'settings/networks-bluetooth.sh', 'cmd', action, V.li.data( 'mac' ), 'CMD ACTION MAC' ] );
}
function connectWiFi( data ) {
	clearTimeout( V.timeoutscan );
	var keys   = Object.keys( data );
	var values = Object.values( data );
	bash( [ 'connect', ...values, 'CMD '+ keys.join( ' ' ) ], error => {
		if ( error == -1 ) {
			clearInterval( V.interval );
			clearTimeout( V.timeout );
			bannerHide();
			if ( error ) {
				info( {
					  icon    : 'wifi'
					, title   : data.ESSID
					, message : error
				} );
			}
		}
	} );
}
function onPageInactive() {
	if ( $( '#divbluetooth' ).hasClass( 'hide' ) && $( '#divwifi' ).hasClass( 'hide' ) ) return
	
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
function renderPage() {
	if ( ! S.devicebt ) {
		$( '#divbt' ).addClass( 'hide' );
	} else {
		render.bluetooth();
	}
	if ( ! S.devicewl ) {
		$( '#divwl' ).addClass( 'hide' );
	} else {
		render.wlan();
		$( '.wladd' ).toggleClass( 'hide', S.ap );
	}
	if ( ! S.deviceeth ) {
		$( '#divlan' ).addClass( 'hide' );
	} else {
		var htmllan = '';
		if ( S.listeth ) htmllan = '<li>'+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ S.listeth.ADDRESS
								 +'&ensp;<gr>&raquo;&ensp;'+ S.listeth.GATEWAY +'</gr></li>';
		$( '#listlan' ).html( htmllan );
		$( '#divlan' ).removeClass( 'hide' );
	}
	$( '#divap' ).toggleClass( 'hide', ! S.ap );
	var ip = S.ip || S.apconf.ip;
	if ( ! ip ) {
		$( '#divwebui' ).addClass( 'hide' );
		return
	}
	
	if ( S.ap ) {
		var html = S.apconf.ssid
				  +'<br>'+ S.apconf.passphrase
				  +'<br>'+ qrCode( S.apconf.qr )
		$( '#qrap' ).html( html );
	}
	if ( ip ) {
		var html = '<gr>http://</gr>'+ ip
				 + ( S.hostname ? '<br><gr>http://'+ S.hostname +'</gr>' : '' )
				 +'<br>'+ qrCode( 'http://'+ ip )
		$( '#qrurl' ).html( html );
	}
	$( '#divwebui' ).removeClass( 'hide' );
	showContent();
}
function scanBluetooth() {
	bash( 'networks-scan.sh', data => {
		if ( data ) {
			S.listbtscan = data;
			var htmlbt   = '';
			data.forEach( list => htmlbt  += '<li class="btscan" data-mac="'+ list.mac +'" data-name="'+ list.name +'">'+ ico( 'bluetooth' ) +'<wh>'+ list.name +'</wh></li>' );
			$( '#listbtscan' ).html( htmlbt );
		}
		V.timeoutscan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( 'networks-scan.sh wlan', data => {
		if ( data ) {
			data.sort( ( a, b ) => b.signal - a.signal );
			S.listwlscan = data;
			var cls = 'wlscan';
			var icon, signal;
			var htmlwl   = '';
			data.forEach( list => {
				signal  = list.signal;
				icon    = 'wifi';
				icon   += signal > -60 ? '' : ( signal < -67 ? 1 : 2 );
				icon    = ico( icon );
				if ( list.current ) {
					cls  += ' current';
					icon += '<grn>•</grn> ';
				} else if ( list.profile ) {
					icon += '<gr>•</gr> ';
				}
				htmlwl += '<li class="'+ cls +'" data-ssid="'+ list.ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'">'+ icon;
				htmlwl += signal && signal < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' '+ ico( 'lock' );
				if ( signal != 0 ) htmlwl += '<gr>'+ signal +' dBm</gr>';
				htmlwl += '</li>';
			} );
		} else {
			var htmlwl = '<li><gr>(no access points found)</gr></li>';
		}
		$( '#listwlscan' ).html( htmlwl );
		V.timeoutscan = setTimeout( scanWlan, 12000 );
	}, 'json' );
}
function warning( action ) {
	if ( V.li && V.li.data( 'ip' ) === location.hostname ) return iconwarning +'<wh>'+ action +' current connection</wh>'
}
function wifiDisconnect() {
	var ssid = V.li.data( 'ssid' );
	notify( 'wifi', ssid, 'Disconnect ...' );
	bash( [ 'disconnect', ssid, 'CMD SSID' ] );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.close, .back' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
} );
$( '.back' ).on( 'click', function() {
	$( '#help, #divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '.btscan' ).on( 'click', function() {
	$( '#help, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	scanBluetooth();
} );
$( '#listbtscan' ).on( 'click', 'li', function() {
	V.li = $( this );
	bluetoothCommand( 'pair' );
} );
$( '.wladd' ).on( 'click', function() {
	delete V.li;
	delete V.profile;
	delete V.profilestatic;
	setting.wifi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.ap && ! S.apstartup ) {
		setting.accessPoint();
	} else {
		$( '#help, #divinterface, #divwebui' ).addClass( 'hide' );
		$( '#divwifi' ).removeClass( 'hide' );
		scanWlan();
	}
} );
$( '#listwlscan' ).on( 'click', 'li:not( .current )', function() {
	var $this    = $( this );
	var ssid     = $this.data( 'ssid' );
	var security = $this.data( 'wpa' ) === 'wep';
	var encrypt  = $this.data( 'encrypt' );
	if ( encrypt === 'on' ) {
		info( {
			  icon    : 'wifi'
			, title   : ssid
			, list    : [ 'Password', 'password' ]
			, oklabel : 'Connect'
			, ok      : () => connectWiFi( { IP: 'dhcp', ESSID: ssid, KEY: infoVal(), SECURITY: security } )
		} );
	} else {
		connectWiFi( { ESSID: ssid } );
	}
	notify( 'wifi', ssid, 'Connect ...' );
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	V.li = $( this );
	if ( V.li.hasClass( 'bt' ) && ! $('#codebtinfo' ).hasClass( 'hide' ) ) {
		$('#codebtinfo' ).addClass( 'hide' );
		return
	}
	
	if ( V.li.hasClass( 'ap' ) ) return
	
	V.listid  = V.li.parent().prop( 'id' );
	if ( ! $( '#menu' ).hasClass( 'hide' ) ) {
		$( '#menu' ).addClass( 'hide' );
		if ( V.li.hasClass( 'active' ) ) return
	}
	
	$( 'li' ).removeClass( 'active' );
	V.li.addClass( 'active' );
	if ( V.listid === 'listbt' ) {
		var connected = V.li.find( 'grn' ).length === 1;
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu' ).find( '.forget, .info' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', connected );
		$( '#menu' ).find( '.disconnect, .rename' ).toggleClass( 'hide', ! connected );
	} else if ( V.listid === 'listlan' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .edit' ).removeClass( 'hide' );
	} else {
		var notconnected = V.li.hasClass( 'notconnected' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', ! notconnected );
		$( '#menu .disconnect' ).toggleClass( 'hide', notconnected );
		$( '#menu' ).find( '.info, .rename' ).addClass( 'hide' );
	}
	contextMenu();
} );
$( '.lanadd' ).on( 'click', function() {
	delete V.li;
	setting.lan();
} );
$( '.connect' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'connect' );
		return
	}
	
	if ( S.ap ) {
		setting.accessPoint();
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	notify( 'wifi', ssid, 'Connect ...' );
	bash( [ 'profileconnect', ssid, 'CMD ESSID' ] );
} );
$( '.disconnect' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'disconnect' );
		return
	}
	
	if ( V.li.data( 'ip' ) !== location.hostname ) {
		wifiDisconnect();
		return
	}
	
	info( {
		  icon       : 'wifi'
		, title      : 'Wi-Fi'
		, message    : 'SSID: <wh>'+ ssid +'</wh>'
		, footer     : warning( 'Disconnect' )
		, okcolor    : orange
		, ok         : wifiDisconnect
	} );
} );
$( '.edit' ).on( 'click', function() {
	if ( V.listid === 'listwl' ) {
		bash( [ 'profileget', V.li.data( 'ssid' ), 'CMD SSID' ], v => {
			V.profile       = v;
			V.profilestatic = 'ADDRESS' in v;
			setting.wifi( v );
		}, 'json' );
	} else {
		setting.lan( S.listeth );
	}
} );
$( '.forget' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'remove' );
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	var icon = 'wifi';
	info( {
		  icon       : icon
		, title      : 'Wi-Fi'
		, message    : 'SSID: <wh>'+ ssid +'</wh>'
		, footer     : warning( 'Forget' )
		, oklabel    : ico( 'remove' ) +'Forget'
		, okcolor    : red
		, ok         : () => {
			notify( icon, ssid, 'Forget ...' );
			bash( [ 'profileforget', ssid, 'CMD SSID' ] );
		}
	} );
} );
$( '.rename' ).on( 'click', function() {
	var icon  = 'bluetooth';
	var name = V.li.data( 'name' );
	info( {
		  icon         : icon
		, title        : 'Rename'
		, message      : '<wh>'+ name +'</wh>'
		, list         : [ 'As', 'text' ]
		, checkchanged : true
		, checkblank   : true
		, values       : name
		, ok           : () => {
			notify( icon, name, 'Change ...' );
			bash( [ 'btrename', name, infoVal(), 'CMD NAME NEWNAME' ] );
		}
	} );
} );
$( '.info' ).on( 'click', function() {
	currentStatus( 'btinfo', V.li.data( 'mac' ) );
} );

} );
