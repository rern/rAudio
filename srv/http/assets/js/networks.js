W.wlan     = data => {
	if ( data && 'reboot' in data ) {
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
			, oklabel : ico( 'reboot' ) +'Reboot'
			, okcolor : orange
			, ok      : () => bash( [ 'power.sh', 'reboot' ] )
		} );
		return
	}
	
	$.each( data, ( k, v ) => { S[ k ] = v } );
	renderWlan();
}

function bluetoothCommand( action ) {
	var icon  = V.li.find( 'i' ).hasClass( 'i-btsender' ) ? 'btsender' : 'bluetooth';
	notify( icon, V.li.data( 'name' ), capitalize( action ) +' ...', -1 );
	bash( [ 'settings/networks-bluetooth.sh', 'cmd', action, V.li.data( 'mac' ), 'CMD ACTION MAC' ] );
}
function changeIp( result, icon, title, val, callback ) {
	var ip = val.ADDRESS;
	if ( result == -1 ) {
		clearTimeout( V.timeoutchangeip );
		bannerHide();
		info( {
			  icon    : icon
			, title   : title
			, message : 'IP <c>'+ ip +'</c> already in use.'
			, ok      : () => callback( val )
		} );
	}
}
function changeIpConnect( ip ) {
	try {
		location.href = 'http://'+ ip +'/settings.php?p=networks';
	} catch( error ) {
		setTimeout( () => changeIpConnect( ip ), 1000 );
	}
}
function changeIpSwitch( ip ) {
	if ( V.li.data( 'ip' ) !== location.hostname || S.hostname === location.hostname ) return
	
	var delay = 3000;
	if ( ! ip ) {
		ip    = S.hostname;
		delay = 10000;
	}
	notify( 'networks', 'Connection', 'Reconnect @ '+ ip +' ...' );
	V.timeoutchangeip = setTimeout( () => changeIpConnect( ip ), delay );
}
function connectWiFi( val ) {
	var keys   = Object.keys( val );
	var values = Object.values( val );
	V.li.find( 'i' ).addClass( 'blink' );
	notify( I.icon, val.ESSID, V.edit ? 'Change ...' : 'Connect ...' );
	bash( [ 'connect', ...values, 'CMD '+ keys.join( ' ' ) ], result => {
		changeIp( result, I.icon, I.title, val, settingWifi );
	} );
}
function onPageInactive() {
	if ( $( '#divbluetooth' ).hasClass( 'hide' ) && $( '#divwifi' ).hasClass( 'hide' ) ) return
	
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
function renderBluetooth() {
	if ( ! $( '#divbluetooth' ).hasClass( 'hide' ) ) $( '#divbluetooth .back' ).trigger( 'click' );
	if ( S.listbt ) {
		var htmlbt  = '';
		S.listbt.forEach( list => {
			var dot = list.connected ? '<grn>•</grn>&ensp;' : '';
			htmlbt += '<li class="bt" data-mac="'+ list.mac +'" data-name="'+ list.name +'">'
					 + ico( list.type === 'Source' ? 'btsender' : 'bluetooth' ) + dot + list.name +'</li>';
		} );
		$( '#listbt' ).html( htmlbt );
	} else {
		$( '#listbt' ).empty();
	}
	$( '#divbt' ).removeClass( 'hide' );
}
function renderPage() {
	if ( ! S.devicebt ) {
		$( '#divbt' ).addClass( 'hide' );
	} else {
		renderBluetooth();
	}
	if ( ! S.devicewl ) {
		$( '#divwl' ).addClass( 'hide' );
	} else {
		renderWlan();
		$( '.wladd' ).toggleClass( 'hide', S.ap );
	}
	if ( ! S.deviceeth ) {
		$( '#divlan' ).addClass( 'hide' );
	} else {
		var htmllan = '';
		var ipeth   = S.listeth.ADDRESS;
		if ( S.listeth ) htmllan = '<li data-ip="'+ ipeth +'">'+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ ipeth
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
function renderWlan() {
	if ( ! $( '#divwifi' ).hasClass( 'hide' ) ) $( '#divwifi .back' ).trigger( 'click' );
	var htmlwl = '';
	if ( S.ap ) {
		htmlwl += '<li class="wl ap">'+ ico( 'ap' ) +'<grn>•</grn>&ensp;'
				 +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.apconf.ip +'</li>';
	}
	if ( S.listwl ) {
		S.listwl.forEach( list => {
			if ( list.ip ) {
				htmlwl += '<li class="wl current" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'">'+ ico( list.icon ) +'<a>'+ list.ssid 
						 +'</a>&ensp;<gr>•</gr>&ensp;'+ list.ip +'&ensp;<gr>&raquo;&ensp;'+ list.gateway +'</gr></li>';
			} else {
				htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'">'+ ico( 'wifi' ) + list.ssid +'</li>';
			}
		} );
	}
	$( '#listwl' ).html( htmlwl );
	$( '#divwl' ).removeClass( 'hide' );
	bannerHide();
}
function scanBluetooth() {
	bash( 'networks-scan.sh', data => {
		var htmlbt      = '';
		if ( data ) {
			S.listbtscan = data;
			var cls, icon;
			data.forEach( list => {
				icon   = ico( 'bluetooth' );
				cls    = 'btscan';
				if ( list.current ) {
					icon += '<grn>•</grn> ';
					cls  += ' current';
				} else if ( list.paired ) {
					icon += '<gr>•</gr> ';
				}
				htmlbt += '<li class="'+ cls +'" data-mac="'+ list.mac +'" data-name="'+ list.name +'">'+ icon +'<wh>'+ list.name +'</wh></li>'
			} );
		} else {
			htmlbt       = '<li><gr>(no Bluetooth devices found)</gr></li>';
		}
		$( '#listbtscan' ).html( htmlbt );
		V.timeoutscan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( 'networks-scan.sh wlan', data => {
		var htmlwl    = '';
		if ( data ) {
			var scan     = data.scan;
			scan.sort( ( a, b ) => b.signal - a.signal );
			S.listwlscan = scan;
			var cls, icon, signal;
			scan.forEach( list => {
				ssid   = list.ssid;
				signal = list.signal;
				nwifi  = signal > -60 ? '' : ( signal < -67 ? 1 : 2 );
				cls    = '';
				if ( ssid === data.current ) {
					cls = ' current';
				} else if ( data.profiles && data.profiles.includes( ssid ) ) {
					cls = ' profile';
				}
				if ( signal && signal < -67 ) ssid = '<gr>'+ ssid +'</gr>';
				htmlwl += '<li class="wlscan'+ cls +'" data-ssid="'+ ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'">'
						+ ico( 'wifi'+ nwifi ) +'<a>'+ ssid +'</a>';
				if ( list.encrypt === 'on') htmlwl += ' '+ ico( 'lock' );
				if ( signal != 0 ) htmlwl += '<gr>'+ signal +' dBm</gr>';
				htmlwl += '</li>';
			} );
		} else {
			htmlwl       = '<li><gr>(no access points found)</gr></li>';
		}
		$( '#listwlscan' ).html( htmlwl );
		V.timeoutscan = setTimeout( scanWlan, 12000 );
	}, 'json' );
}
function settingLan( values ) {
	if ( values ) {
		var dhcp = values.DHCP;
	} else {
		values   = S.listeth;
		var dhcp = values.DHCP
		delete values.DHCP;
	}
	var icon  = 'lan';
	var title = 'LAN Connection';
	info( {
		  icon         : icon
		, title        : title
		, list         : [
			  [ 'IP',      'text' ]
			, [ 'Gateway', 'text' ]
		]
		, footer       : S.ip ===  location.hostname ? warningIp( 'This is' ) : ''
		, values       : values
		, focus        : 0
		, checkchanged : true
		, checkip      : [ 0, 1 ]
		, beforeshow   : () => $( '.extrabtn' ).toggleClass( 'disabled', dhcp )
		, buttonlabel  : 'DHCP'
		, button       : () => {
			V.li.find( 'i' ).addClass( 'blink' );
			notify( icon, title, 'Change ...' );
			bash( [ 'lanedit' ] );
			changeIpSwitch();
		}
		, ok           : () => {
			var val  = infoVal();
			V.li.find( 'i' ).addClass( 'blink' );
			notify( icon, title, 'Change ...' );
			bash( [ 'lanedit', ...Object.values( val ), 'CMD '+ Object.keys( val ).join( ' ' ) ], result => {
				changeIp( result, icon, title, val, settingLan );
			} );
			changeIpSwitch( val.ADDRESS );
		}
	} );
}
function settingWifi( values ) {
	if ( ! values ) values = { ESSID: '', KEY: '', SECURITY: false, HIDDEN: false }
	var dhcp = ! ( 'ADDRESS' in values );
	var list = [
		  [ 'SSID',         'text' ]
		, [ 'Password',     'password' ]
		, [ 'IP',           'text' ]     // static - ADDRESS
		, [ 'Gateway',      'text' ]     // static - GATEWAY
		, [ 'WEP Protocol', 'checkbox' ]
		, [ 'Hidden SSID',  'checkbox' ]
	];
	var json = {
		  icon     : 'wifi'
		, title    : 'Wi-Fi Connection'
		, tablabel : [ 'DHCP', 'Static IP' ]
	}
	if ( dhcp ) {
		json.tab = [ '', () => {
			var v     = infoVal();
			var keys  = Object.keys( v );
			keys.splice( 2, 0, 'ADDRESS', 'GATEWAY' ); // insert in order
			v.ADDRESS = ipSub( S.ip );
			v.GATEWAY = S.gateway;
			var val   = {};
			keys.forEach( k => val[ k ] = v[ k ] );
			settingWifi( val );
		} ];
		list.splice( 2, 2 );
	} else {
		json.tab = [ () => {
			V.edit  = false;
			var val = infoVal();
			delete val.ADDRESS;
			delete val.GATEWAY;
			settingWifi( val );
		}, '' ]
		json.checkip = [ 2, 3 ];
	}
	if ( V.edit ) {
		if ( ! dhcp ) json.focus = 2
		json.footer = warningIp( 'This is' );
		json.checkchanged = true;
	} else {
		json.focus = 0
		json.checkchanged = false;
	}
	info( {
			...json
		, boxwidth     : 180
		, list         : list
		, values       : values
		, checkblank   : [ 0 ]
		, checklength  : { 1: [ 8, 'min' ] }
		, ok           : () => {
			var val = infoVal();
			connectWiFi( val );
			changeIpSwitch( val.ADDRESS );
		}
	} );
}
function warningAp() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : '<a class="helpmenu label">Access Point<i class="i-ap"></i></a> is currently active.'
	} );
}
function warningIp( action ) {
	if ( V.li && V.li.data( 'ip' ) === location.hostname ) return iconwarning +'<wh>'+ action +' current connection</wh>'
}
function wifiDisconnect() {
	var ssid = V.li.data( 'ssid' );
	notify( 'wifi', ssid, 'Disconnect ...' );
	bash( [ 'disconnect', ssid, 'CMD SSID' ] );
	V.li.find( 'i' ).addClass( 'blink' );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.close, .back' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
} );
$( '.back' ).on( 'click', function() {
	$( '.helphead, #divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '.btscan' ).on( 'click', function() {
	$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	scanBluetooth();
} );
$( '#listbtscan' ).on( 'click', 'li:not( .current )', function() {
	clearTimeout( V.timeoutscan );
	loader();
	V.li = $( this );
	bluetoothCommand( 'pair' );
} );
$( '.wladd' ).on( 'click', function() {
	delete V.edit;
	settingWifi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.ap && ! S.apstartup ) {
		warningAp();
	} else {
		$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
		$( '#divwifi' ).removeClass( 'hide' );
		scanWlan();
	}
} );
$( '#listwlscan' ).on( 'click', 'li:not( .current )', function() {
	var $this    = $( this );
	var ssid     = $this.data( 'ssid' );
	var security = $this.data( 'wpa' ) === 'wep';
	var encrypt  = $this.data( 'encrypt' ) === 'on';
	if ( $this.hasClass( 'profile' ) ) {
		notify( 'wifi', ssid, 'Connect ...' );
		bash( [ 'profileconnect', ssid, 'CMD ESSID' ] );
		return
	}
	
	info( {
		  icon    : 'wifi'
		, title   : ssid
		, message : encrypt ? false : 'Insecure access point'
		, list    : encrypt ? [ 'Password', 'password' ] : false
		, oklabel : 'Connect'
		, ok      : () => {
			clearTimeout( V.timeoutscan );
			loader();
			if ( encrypt ) {
				var val = { IP: 'dhcp', ESSID: ssid, KEY: infoVal(), SECURITY: security }
			} else {
				var val = { ESSID: ssid }
			}
			connectWiFi( val );
		}
	} );
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	V.li = $( this );
	if ( ! contextMenuToggle() ) return
	
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
		var current = V.li.hasClass( 'current' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', current );
		$( '#menu .disconnect' ).toggleClass( 'hide', ! current );
		$( '#menu' ).find( '.info, .rename' ).addClass( 'hide' );
	}
	contextMenu();
} );
$( '.lanadd' ).on( 'click', function() {
	delete V.li;
	settingLan();
} );
$( '#menu a' ).on( 'click', function() {
	var cmd = $( this ).data( 'cmd' );
	switch ( cmd ) {
		case 'connect':
			if ( V.listid === 'listbt' ) {
				bluetoothCommand( 'connect' );
				return
			}
			
			if ( S.ap ) {
				warningAp();
				return
			}
			
			var ssid = V.li.data( 'ssid' );
			notify( 'wifi', ssid, 'Connect ...' );
			bash( [ 'profileconnect', ssid, 'CMD ESSID' ] );
			V.li.find( 'i' ).addClass( 'blink' );
			break
		case 'disconnect':
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
				, footer     : warningIp( 'Disconnect' )
				, okcolor    : orange
				, ok         : wifiDisconnect
			} );
			break
		case 'edit':
			if ( V.listid === 'listwl' ) {
				V.edit = true;
				infoSetting( 'wlanprofile "'+ V.li.data( 'ssid' ) +'"', values => settingWifi( values ) );
			} else {
				settingLan();
			}
			break
		case 'forget':
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
				, footer     : warningIp( 'Forget' )
				, oklabel    : ico( 'remove' ) +'Forget'
				, okcolor    : red
				, ok         : () => {
					notify( icon, ssid, 'Forget ...' );
					bash( [ 'profileforget', ssid, 'CMD SSID' ] );
					V.li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
		case 'info':
			currentStatus( 'btinfo', V.li.data( 'mac' ) );
			break
		case 'rename':
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
					V.li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
	}
} );

} );
