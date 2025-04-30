function accesspoint2ssid( ssid, val ) {
	var changeip = S.ap && S.apconf.ip === location.hostname;
	INFO( {
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
	NOTIFY( icon, $li.data( 'name' ), COMMON.capitalize( action ) +' ...', -1 );
	BASH( [ 'settings/networks-bluetooth.sh', 'cmd', action, $li.data( 'id' ), 'CMD ACTION MAC' ] );
}
function changeIp( result, icon, title, val, callback ) {
	var ip = val.ADDRESS;
	if ( result == -1 ) {
		clearTimeout( V.timeoutchangeip );
		BANNER_HIDE();
		INFO( {
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
	NOTIFY( V.wlan ? 'wlan' : 'lan', 'Reconnect', 'rAudio @ http://'+ ip +' ...' );
	V.timeoutchangeip = setTimeout( () => changeIpConnect( ip ), delay );
}
function changeSsid( ssid ) {
	NOTIFY( 'wifi', ssid, 'Connect ...' );
	BASH( [ 'profileconnect', ssid, 'CMD ESSID' ] );
	$( 'li.active i' ).addClass( 'blink' );
}
function connectWiFi( val ) {
	var keys      = Object.keys( val );
	var values    = Object.values( val );
	$( 'li.active i' ).addClass( 'blink' );
	NOTIFY( I.icon, val.ESSID, V.edit ? 'Change ...' : 'Connect ...' );
	BASH( [ 'connect', ...values, 'CMD '+ keys.join( ' ' ) ], result => {
		changeIp( result, I.icon, I.title, val, SETTING.wifi );
	} );
}
function onPageInactive() {
	if ( $( '#divscanbluetooth' ).hasClass( 'hide' ) && $( '#divscanwlan' ).hasClass( 'hide' ) ) return
	
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
var RENDER = {
	  bluetooth : () => {
		if ( LIST.equal( 'bluetooth' ) ) return
		
		var html  = '';
		if ( S.list.bluetooth ) {
			S.list.bluetooth.forEach( list => {
				html   += '<li class="bt" data-id="'+ list.mac +'" data-name="'+ list.name +'">'
						+ ICON( list.type === 'Source' ? 'btsender' : 'bluetooth' ) + ( list.connected ? +'<grn>•</grn>&ensp;' : '' ) + list.name +'</li>';
			} );
		}
		LIST.render( 'bluetooth', html );
		$( '#divbluetooth' ).removeClass( 'hide' );
	}
	, lan       : () => {
		var html = '';
		if ( S.list.lan ) {
			var ipeth = S.list.lan.ADDRESS;
			html      =  '<li data-ip="'+ ipeth +'">'
						+ ICON( 'lan' ) +'<grn>•</grn>&ensp;'+ ipeth +'&ensp;<gr>&raquo;&ensp;'+ S.list.lan.GATEWAY +'</gr></li>';
		}
		$( '#lan' ).html( html );
		$( '#divlan' ).removeClass( 'hide' );
	}
	, wlan      : () => {
		if ( LIST.equal( 'wlan' ) ) return
		
		var html = '';
		if ( S.ap ) {
			html +=  '<li class="wl ap" data-id="ap">'
					+ ICON( 'ap' ) +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.apconf.ip +'</li>';
		}
		if ( S.list.wlan ) {
			S.list.wlan.forEach( ( list, i ) => {
				if ( S.ap ) i++;
				var ssid  = list.ssid;
				html += '<li class="wl" data-id="'+ ssid +'"';
				if ( list.ip ) {
					html +=  ' data-ip="'+ list.ip +'">'
							+ ICON( list.icon ) +'<a>'+ ssid 
							+'</a>&ensp;<grn>•</grn>&ensp;'+ list.ip +'&ensp;<gr>&raquo;&ensp;'+ list.gateway +'</gr></li>';
				} else {
					html +=  '>'
							+ ICON( 'wifi' ) + ssid +'</li>';
				}
			} );
		}
		LIST.render( 'wlan', html );
		$( '#divwlan' ).removeClass( 'hide' );
		BANNER_HIDE();
	}
}
function renderPage() {
	[ 'bluetooth', 'wlan', 'lan' ].forEach( k => {
		S.device[ k ] ? RENDER[ k ]() : $( '#div'+ k ).addClass( 'hide' );
	} );
	$( '#divap' ).toggleClass( 'hide', ! S.ap );
	if ( ! S.ip ) {
		$( '#divwebui' ).addClass( 'hide' );
		return
	}
	
	if ( S.ap ) {
		var html = S.apconf.ssid
				  +'<br>'+ S.apconf.passphrase
				  +'<br>'+ COMMON.qrCode( S.apconf.qr )
		$( '#qrap' ).html( html );
	}
	var html = '<gr>http://</gr>'+ S.ip
			 + ( S.hostname ? '<br><gr>http://'+ S.hostname +'</gr>' : '' )
			 +'<br>'+ COMMON.qrCode( 'http://'+ S.ip )
	$( '#qrurl' ).html( html );
	$( '#divwebui' ).removeClass( 'hide' );
	CONTENT();
}
var SCAN = {
	  bluetooth : () => {
		BASH( 'networks-scan.sh', data => {
			var htmlbt      = '';
			if ( data ) {
				var cls, icon;
				data.forEach( list => {
					icon   = ICON( 'bluetooth' );
					cls    = 'btscan';
					if ( list.current ) {
						icon += '<grn>•</grn>';
						cls  += ' current';
					} else if ( list.paired ) {
						icon += '<gr>•</gr>';
					}
					htmlbt += '<li class="'+ cls +'" data-id="'+ list.mac +'" data-name="'+ list.name +'">'
							+ icon +'&ensp;<wh>'+ list.name +'</wh></li>';
				} );
			} else {
				htmlbt       = '<li><gr>(no Bluetooth devices found)</gr></li>';
			}
			$( '#scanbluetooth' ).html( htmlbt );
			V.timeoutscan = setTimeout( SCAN.bluetooth, 12000 );
		}, 'json' );
	}
	, wlan      : () => {
		BASH( 'networks-scan.sh wlan', data => {
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
							+ ICON( 'wifi'+ nwifi ) +'<a>'+ ssid +'</a>';
					htmlwl += list.encrypt === 'on' ? ICON( 'lock' ) : '&ensp;';
					htmlwl += signal != 0 ? '<gr>'+ signal +' dBm</gr>' : '';
					htmlwl += '</li>';
				} );
			} else {
				htmlwl       = '<li><gr>(no access points found)</gr></li>';
			}
			$( '#scanwlan' ).html( htmlwl );
			V.timeoutscan = setTimeout( SCAN.wlan, 12000 );
		}, 'json' );
	}
}
var SETTING = {
	  lan  : values => {
		if ( values ) {
			var dhcp = values.DHCP;
		} else {
			values   = COMMON.json.clone( S.list.lan );
			var dhcp = values.DHCP
			delete values.DHCP;
		}
		var $li   = $( 'li.active' );
		var icon  = 'lan';
		var title = 'LAN Connection';
		INFO( {
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
				NOTIFY( icon, title, 'Change ...' );
				BASH( [ 'lanedit' ] );
				changeIpSwitch();
			}
			, oklabel      : dhcp ? 'Static' : ''
			, ok           : () => {
				var val  = _INFO.val();
				$li.find( 'i' ).addClass( 'blink' );
				NOTIFY( icon, title, 'Change ...' );
				BASH( [ 'lanedit', ...Object.values( val ), 'CMD '+ Object.keys( val ).join( ' ' ) ], result => {
					changeIp( result, icon, title, val, SETTING.lan );
				} );
				changeIpSwitch( val.ADDRESS );
			}
		} );
	}
	, wifi : values => {
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
				var v     = _INFO.val();
				var keys  = Object.keys( v );
				keys.splice( 2, 0, 'ADDRESS', 'GATEWAY' ); // insert in order
				v.ADDRESS = COMMON.ipSub( S.ip );
				v.GATEWAY = S.gateway;
				var val   = {};
				keys.forEach( k => val[ k ] = v[ k ] );
				SETTING.wifi( val );
			} ];
			list.splice( 2, 2 );
		} else {
			json.tab = [ () => {
				V.edit  = false;
				var val = _INFO.val();
				delete val.ADDRESS;
				delete val.GATEWAY;
				SETTING.wifi( val );
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
		INFO( {
				...json
			, boxwidth     : 180
			, list         : list
			, values       : values
			, checkblank   : [ 0 ]
			, checklength  : { 1: [ 8, 'min' ] }
			, ok           : () => {
				var val = _INFO.val();
				connectWiFi( val );
				changeIpSwitch( val.ADDRESS );
			}
		} );
	}
}
function warningIp( action ) {
	var $li = $( 'li.active' );
	if ( $li.data( 'ip' ) === location.hostname ) return V.i_warning +'<wh>'+ action +' current connection</wh>'
}
function wifiDisconnect() {
	var ssid = $( 'li.active' ).data( 'id' );
	NOTIFY( 'wifi', ssid, 'Disconnect ...' );
	BASH( [ 'disconnect', ssid, 'CMD SSID' ] );
	$( 'li.active i' ).addClass( 'blink' );
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.back' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	$( '#divscanbluetooth, #divscanwlan' ).addClass( 'hide' );
	$( '#scanwlan, #scanbluetooth' ).empty();
	$( '.helphead, #divinterface, #divwebui' ).removeClass( 'hide' );
	REFRESHDATA();
} );
$( '.btscan' ).on( 'click', function() {
	$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divscanbluetooth' ).removeClass( 'hide' );
	SCAN.bluetooth();
} );
$( '.wladd' ).on( 'click', function() {
	delete V.edit;
	SETTING.wifi();
} );
$( '.wlscan' ).on( 'click', function() {
	$( '.helphead, #divinterface, #divwebui' ).addClass( 'hide' );
	$( '#divscanwlan' ).removeClass( 'hide' );
	SCAN.wlan();
} );
$( '#scanbluetooth' ).on( 'click', 'li:not( .current )', function() {
	clearTimeout( V.timeoutscan );
	COMMON.loader();
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
	
	INFO( {
		  icon    : 'wifi'
		, title   : ssid
		, message : encrypt ? false : V.i_warning +'Unsecured access point'
		, list    : encrypt ? [ 'Password', 'password' ] : false
		, oklabel : 'Connect'
		, ok      : () => {
			clearTimeout( V.timeoutscan );
			var val = { ESSID: ssid }
			if ( encrypt ) val = { ...val, IP: 'dhcp', KEY: _INFO.val(), SECURITY: security }
			S.ap ? accesspoint2ssid( ssid, val ) : connectWiFi( val );
		}
	} );
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	var $li = $( this );
	if ( MENU.isActive( $li, e ) ) return
	
	V.bluetooth = V.lan = V.wlan = false;
	V[ $li.parent().prop( 'id' ) ] = true;
	$( '#menu a' ).addClass( 'hide' );
	if ( V.bluetooth ) {
		var connected = $li.find( 'grn' ).length === 1;
		$( '#menu .connect' ).toggleClass( 'hide', connected );
		$MENU.find( '.forget, .info' ).removeClass( 'hide' );
		$MENU.find( '.disconnect, .rename' ).toggleClass( 'hide', ! connected );
	} else if ( V.lan ) {
		$( '#menu .edit' ).removeClass( 'hide' );
	} else if ( $li.hasClass( 'ap' ) ) {
		$( '#menu .info' ).removeClass( 'hide' );
	} else {
		var connected = $li.data( 'ip' ) !== undefined;
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', connected );
		$( '#menu .disconnect' ).toggleClass( 'hide', ! connected );
		$( '#menu .rename' ).addClass( 'hide' );
	}
	MENU.show( $li );
} );
$( '.lanadd' ).on( 'click', function() {
	SETTING.lan();
} );
$( '#menu a' ).on( 'click', function( e ) {
	var cmd = MENU.command( $( this ), e );
	if ( ! cmd ) return

	var $li = $( 'li.active' );
	switch ( cmd ) {
		case 'connect':
			if ( V.bluetooth ) {
				bluetoothCommand( 'connect', $li );
				return
			}
			
			var ssid = $li.data( 'id' );
			if ( ! S.ap || V.localhost ) {
				changeSsid( ssid );
				return
			}
			
			if ( S.ap ) {
				if ( V.localhost ) {
					INFO( {
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
			
			INFO( {
				  icon       : 'wifi'
				, title      : 'Wi-Fi'
				, message    : 'SSID: <wh>'+ ssid +'</wh>'
				, footer     : warningIp( 'Disconnect' )
				, okcolor    : V.orange
				, ok         : wifiDisconnect
			} );
			break
		case 'edit':
			if ( V.wlan ) {
				V.edit = true;
				SETTING( 'wlanprofile "'+ $li.data( 'id' ) +'"', values => SETTING.wifi( values ) );
			} else {
				SETTING.lan();
			}
			break
		case 'forget':
			if ( V.bluetooth ) {
				bluetoothCommand( 'remove', $li );
				return
			}
			
			var ssid = $li.data( 'id' );
			var icon = 'wifi';
			INFO( {
				  icon       : icon
				, title      : 'Wi-Fi'
				, message    : 'SSID: <wh>'+ ssid +'</wh>'
				, footer     : warningIp( 'Forget' )
				, oklabel    : ICON( 'remove' ) +'Forget'
				, okcolor    : V.red
				, ok         : () => {
					NOTIFY( icon, ssid, 'Forget ...' );
					BASH( [ 'profileforget', ssid, 'CMD SSID' ] );
					$li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
		case 'info':
			STATUS( $li.parent()[ 0 ].id, $li.data( 'id' ), 'info' );
			break
		case 'rename':
			var icon = 'bluetooth';
			var name = $li.data( 'name' );
			INFO( {
				  icon         : icon
				, title        : 'Rename'
				, message      : '<wh>'+ name +'</wh>'
				, list         : [ 'As', 'text' ]
				, checkchanged : true
				, checkblank   : true
				, values       : name
				, ok           : () => {
					NOTIFY( icon, name, 'Change ...' );
					BASH( [ 'btrename', name, _INFO.val(), 'CMD NAME NEWNAME' ] );
					$li.find( 'i' ).addClass( 'blink' );
				}
			} );
			break
	}
} );

} );
