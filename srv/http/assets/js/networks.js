function accesspoint2ssid( ssid, val ) {
	var changeip = S.ap && S.apconf.ip === location.hostname;
	info( {
		  icon    : 'ap'
		, title   : 'Access Point'
		, message : '<p>· Disable and connect <wh>'+ ssid +'</wh>'
				   +'<br>· Connected clients will be dropped.'
				   + ( changeip ? '<br>· New rAudio URL: <c>http://'+ S.hostname +'</c>' : '' ) +'</p>'
		, ok      : () => {
			typeof val === 'object' ? connectWiFi( val ) : changeSsid( ssid );
		}
	} );
}
function bluetoothCommand( action, $li ) {
	var icon  = $li.find( 'i' ).hasClass( 'i-btsender' ) ? 'btsender' : 'bluetooth';
	notify( icon, $li.data( 'name' ), capitalize( action ) +' ...', -1 );
	bash( [ 'settings/networks-bluetooth.sh', 'cmd', action, $li.data( 'id' ), 'CMD ACTION MAC' ] );
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
	var href = 'http://IP/settings.php?p=networks';
	try {
		location.href = href.replace( 'IP', ip );
	} catch( error ) {
		setTimeout( () => changeIpConnect( ip ), 1000 );
	}
}
function changeIpSwitch( ip ) {
	if ( ! $( 'li.active' ).hasClass( 'current' ) ) return
	
	var delay = 3000;
	if ( ! ip ) {
		ip    = S.hostname;
		delay = 10000;
	}
	notify( V.wlan ? 'wlan' : 'lan', 'Reconnect', 'rAudio @ http://'+ ip +' ...' );
	V.timeoutchangeip = setTimeout( () => changeIpConnect( ip ), delay );
}
function changeSsid( ssid ) {
	notify( 'wifi', ssid, 'Connect ...' );
	bash( [ 'profileconnect', ssid, 'CMD ESSID' ] );
	$( 'li.active i' ).addClass( 'blink' );
}
function connectWiFi( val ) {
	var keys      = Object.keys( val );
	var values    = Object.values( val );
	$( 'li.active i' ).addClass( 'blink' );
	notify( I.icon, val.ESSID, V.edit ? 'Change ...' : 'Connect ...' );
	bash( [ 'connect', ...values, 'CMD '+ keys.join( ' ' ) ], result => {
		changeIp( result, I.icon, I.title, val, settingWifi );
	} );
}
function onPageInactive() {
	if ( $( '#divscanbluetooth' ).hasClass( 'hide' ) && $( '#divscanwlan' ).hasClass( 'hide' ) ) return
	
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
var render = {
	  bluetooth : () => {
		if ( listEqual( 'bluetooth' ) ) return
		
		var html  = '';
		if ( S.list.bluetooth ) {
			S.list.bluetooth.forEach( list => {
				html   += '<li class="bt" data-id="'+ list.mac +'" data-name="'+ list.name +'">'
						+ ico( list.type === 'Source' ? 'btsender' : 'bluetooth' ) + ( list.connected ? dot : '' ) + list.name +'</li>';
			} );
		}
		renderList( 'bluetooth', html );
		$( '#divbluetooth' ).removeClass( 'hide' );
	}
	, lan       : () => {
		var html = '';
		if ( S.list.lan ) {
			var ipeth = S.list.lan.ADDRESS;
			html      =  '<li data-ip="'+ ipeth +'">'
						+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ ipeth +'&ensp;<gr>&raquo;&ensp;'+ S.list.lan.GATEWAY +'</gr></li>';
		}
		$( '#lan' ).html( html );
		$( '#divlan' ).removeClass( 'hide' );
	}
	, wlan      : () => {
		if ( listEqual( 'wlan' ) ) return
		
		var html = '';
		if ( S.ap ) {
			html +=  '<li class="wl ap" data-id="ap">'
					+ ico( 'ap' ) +'<gr>Access point'+ dot +'&ensp;&laquo;&ensp;</gr>'+ S.apconf.ip +'</li>';
		}
		if ( S.list.wlan ) {
			S.list.wlan.forEach( ( list, i ) => {
				if ( S.ap ) i++;
				var ssid  = list.ssid;
				html += '<li class="wl" data-id="'+ ssid +'"';
				if ( list.ip ) {
					html +=  ' data-ip="'+ list.ip +'">'
							+ ico( list.icon ) +'<a>'+ ssid 
							+'</a>'+ dot + list.ip +'&ensp;<gr>&raquo;&ensp;'+ list.gateway +'</gr></li>';
				} else {
					html +=  '>'
							+ ico( 'wifi' ) + ssid +'</li>';
				}
			} );
		}
		renderList( 'wlan', html );
		$( '#divwlan' ).removeClass( 'hide' );
		bannerHide();
	}
}
function renderPage() {
	[ 'bluetooth', 'wlan', 'lan' ].forEach( k => {
		S.device[ k ] ? render[ k ]() : $( '#div'+ k ).addClass( 'hide' );
	} );
	$( '#divap' ).toggleClass( 'hide', ! S.ap );
	if ( ! S.ip ) {
		$( '#divwebui' ).addClass( 'hide' );
		return
	}
	
	if ( S.ap ) {
		var html = S.apconf.ssid
				  +'<br>'+ S.apconf.passphrase
				  +'<br>'+ qrCode( S.apconf.qr )
		$( '#qrap' ).html( html );
	}
	var html = '<gr>http://</gr>'+ S.ip
			 + ( S.hostname ? '<br><gr>http://'+ S.hostname +'</gr>' : '' )
			 +'<br>'+ qrCode( 'http://'+ S.ip )
	$( '#qrurl' ).html( html );
	$( '#divwebui' ).removeClass( 'hide' );
	showContent();
}
function scanBluetooth() {
	bash( 'networks-scan.sh', data => {
		var htmlbt      = '';
		if ( data ) {
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
				htmlbt += '<li class="'+ cls +'" data-id="'+ list.mac +'" data-name="'+ list.name +'">'
						+ icon +'<wh>'+ list.name +'</wh></li>';
			} );
		} else {
			htmlbt       = '<li><gr>(no Bluetooth devices found)</gr></li>';
		}
		$( '#scanbluetooth' ).html( htmlbt );
		V.timeoutscan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( 'networks-scan.sh wlan', data => {
		var htmlwl    = '';
		if ( data ) {
			var scan   = data.scan;
			scan.sort( ( a, b ) => b.signal - a.signal );
			var cls, icon, signal;
			scan.forEach( list => {
				ssid    = list.ssid;
				signal  = list.signal;
				nwifi   = signal > -60 ? '' : ( signal < -67 ? 1 : 2 );
				cls     = '';
				if ( ssid === data.current ) {
					cls = ' current';
				} else if ( data.profiles && data.profiles.includes( ssid ) ) {
					cls = ' profile';
				}
				if ( signal && signal < -67 ) ssid = '<gr>'+ ssid +'</gr>';
				htmlwl += '<li class="wlscan'+ cls +'" data-id="'+ ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'">'
						+ ico( 'wifi'+ nwifi ) +'<a>'+ ssid +'</a>';
				htmlwl += list.encrypt === 'on' ? ico( 'lock' ) : '&ensp;';
				htmlwl += signal != 0 ? '<gr>'+ signal +' dBm</gr>' : '';
				htmlwl += '</li>';
			} );
		} else {
			htmlwl       = '<li><gr>(no access points found)</gr></li>';
		}
		$( '#scanwlan' ).html( htmlwl );
		V.timeoutscan = setTimeout( scanWlan, 12000 );
	}, 'json' );
}
function settingLan( values ) {
	if ( values ) {
		var dhcp = values.DHCP;
	} else {
		values   = jsonClone( S.list.lan );
		var dhcp = values.DHCP
		delete values.DHCP;
	}
	var $li   = $( 'li.active' );
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
			$li.find( 'i' ).addClass( 'blink' );
			notify( icon, title, 'Change ...' );
			bash( [ 'lanedit' ] );
			changeIpSwitch();
		}
		, oklabel      : dhcp ? 'Static' : ''
		, ok           : () => {
			var val  = infoVal();
			$li.find( 'i' ).addClass( 'blink' );
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
function warningIp( action, $li ) {
	var $li = $( 'li.active' );
	if ( $li.data( 'ip' ) === location.hostname ) return iconwarning +'<wh>'+ action +' current connection</wh>'
}
function wifiDisconnect() {
	var ssid = $( 'li.active' ).data( 'id' );
	notify( 'wifi', ssid, 'Disconnect ...' );
	bash( [ 'disconnect', ssid, 'CMD SSID' ] );
	$( 'li.active i' ).addClass( 'blink' );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.back' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	$( '#divscanbluetooth, #divscanwlan' ).addClass( 'hide' );
	$( '#scanwlan, #scanbluetooth' ).empty();
	$( '.helphead, #divinterface, #divwebui' ).removeClass( 'hide' );
	refreshData();
} );
$( '.btscan' ).on( 'click', function() {
	$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divscanbluetooth' ).removeClass( 'hide' );
	scanBluetooth();
} );
$( '.wladd' ).on( 'click', function() {
	delete V.edit;
	settingWifi();
} );
$( '.wlscan' ).on( 'click', function() {
	$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divscanwlan' ).removeClass( 'hide' );
	scanWlan();
} );
$( '#scanbluetooth' ).on( 'click', 'li:not( .current )', function() {
	clearTimeout( V.timeoutscan );
	loader();
	bluetoothCommand( 'pair', $( this ) );
} );
$( '#scanwlan' ).on( 'click', 'li:not( .current )', function() {
	var $this    = $( this );
	var ssid     = $this.data( 'id' );
	var security = $this.data( 'wpa' ) === 'wep';
	var encrypt  = $this.data( 'encrypt' ) === 'on';
	if ( $this.hasClass( 'profile' ) ) {
		S.ap ? accesspoint2ssid( ssid ) : changeSsid( ssid );
		return
	}
	
	info( {
		  icon    : 'wifi'
		, title   : ssid
		, message : encrypt ? false : iconwarning +'Unsecured access point'
		, list    : encrypt ? [ 'Password', 'password' ] : false
		, oklabel : 'Connect'
		, ok      : () => {
			clearTimeout( V.timeoutscan );
			var val = { ESSID: ssid }
			if ( encrypt ) val = { ...val, IP: 'dhcp', KEY: infoVal(), SECURITY: security }
			S.ap ? accesspoint2ssid( ssid, val ) : connectWiFi( val );
		}
	} );
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function() {
	var $li = $( this );
	if ( contextMenuActive( $li ) ) return
	
	V.bluetooth = V.lan = V.wlan = false;
	V[ $li.parent().prop( 'id' ) ] = true;
	$( '#menu a' ).addClass( 'hide' );
	if ( V.bluetooth ) {
		var connected = $li.find( 'grn' ).length === 1;
		$( '#menu .connect' ).toggleClass( 'hide', connected );
		$menu.find( '.forget, .info' ).removeClass( 'hide' );
		$menu.find( '.disconnect, .rename' ).toggleClass( 'hide', ! connected );
	} else if ( V.lan ) {
		$( '#menu .edit' ).removeClass( 'hide' );
	} else if ( $li.hasClass( 'ap' ) ) {
		$( '#menu .info' ).removeClass( 'hide' );
	} else {
		var current = $li.hasClass( 'current' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', current );
		$( '#menu .disconnect' ).toggleClass( 'hide', ! current );
		$( '#menu .rename' ).addClass( 'hide' );
	}
	contextMenu( $li );
} );
$( '.lanadd' ).on( 'click', function() {
	settingLan();
} );
$( '#menu a' ).on( 'click', function() {
	$menu.addClass( 'hide' );
	var $li = $( 'li.active' );
	var cmd = $( this ).data( 'cmd' );
	switch ( cmd ) {
		case 'connect':
			if ( V.bluetooth ) {
				bluetoothCommand( 'connect', $li );
				return
			}
			
			var ssid = $li.data( 'id' );
			if ( ! S.ap || localhost ) {
				changeSsid( ssid );
				return
			}
			
			if ( S.ap ) {
				if ( localhost ) {
					info( {
						  icon    : 'ap'
						, title   : 'Access Point'
						, message : 'Disconnect all clients?'
						, ok      : () => changeSsid( ssid )
					} );
				} else {
					accesspoint2ssid( ssid );
				}
			} else {
				changeSsid( ssid );
			}
			break
		case 'disconnect':
			if ( V.bluetooth ) {
				bluetoothCommand( 'disconnect', $li );
				return
			}
			
			if ( $li.data( 'ip' ) !== location.hostname ) {
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
			if ( V.wlan ) {
				V.edit = true;
				infoSetting( 'wlanprofile "'+ $li.data( 'id' ) +'"', values => settingWifi( values ) );
			} else {
				settingLan();
			}
			break
		case 'forget':
			if ( V.bluetooth ) {
				bluetoothCommand( 'remove', $li );
				return
			}
			
			var ssid = $li.data( 'id' );
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
					$li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
		case 'info':
			currentStatus( $li.parent()[ 0 ].id, $li.data( 'id' ), 'id' );
			break
		case 'rename':
			var icon = 'bluetooth';
			var name = $li.data( 'name' );
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
					$li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
	}
} );

} );
