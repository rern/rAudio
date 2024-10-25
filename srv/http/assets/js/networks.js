$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( 'body' ).on( 'click', function() {
	$( '#menu' ).addClass( 'hide' );
	$( '#codebluetooth' )
		.addClass( 'hide' )
		.data( 'mac', '' )
		.empty();
	$( 'li' ).removeClass( 'active' );
} );
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
	delete V.profileget;
	infoWiFi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.ap && ! S.apstartup ) {
		infoAccesspoint();
	} else {
		$( '#help, #divinterface, #divwebui' ).addClass( 'hide' );
		$( '#divwifi' ).removeClass( 'hide' );
		scanWlan();
	}
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var $this    = $( this );
	var ssid     = $this.data( 'ssid' );
	var security = $this.data( 'wpa' ) === 'wep';
	var encrypt  = $this.data( 'encrypt' );
	if ( encrypt === 'on' ) {
		info( {
			  icon    : 'wifi'
			, title   : ssid
			, list    : [ 'Password', 'password' ]
			, focus   : 0
			, oklabel : 'Connect'
			, ok      : () => connectWiFi( { IP: 'dhcp', ESSID: ssid, KEY: infoVal(), SECURITY: security } )
		} );
	} else {
		connectWiFi( { ESSID: ssid } );
	}
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	V.li = $( this );
	if ( V.li.hasClass( 'bt' ) && ! $('#codebluetoothlist' ).hasClass( 'hide' ) ) {
		$('#codebluetoothlist' ).addClass( 'hide' );
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
		$( '#menu .info' ).toggleClass( 'hide', V.li.data( 'mac' ) === $( '#codebluetooth' ).data( 'mac' ) );
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
	infoLan();
} );
$( '.connect' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'connect' );
		return
	}
	
	if ( S.ap ) {
		infoAccesspoint();
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
			V.profileget = v;
			infoWiFi( v );
		}, 'json' );
	} else {
		infoLan( S.listeth );
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
	bluetoothInfo( V.li.data( 'mac' ) );
} );

} );

function bluetoothCommand( action ) {
	var icon  = V.li.find( 'i' ).hasClass( 'i-btsender' ) ? 'btsender' : 'bluetooth';
	var title = action[ 0 ].toUpperCase() + action.slice( 1 );
	notify( icon, V.li.data( 'name' ), title +' ...', -1 );
	bash( [ 'settings/networks-bluetooth.sh', 'cmd', action, V.li.data( 'mac' ), 'CMD ACTION MAC' ] );
}
function bluetoothInfo( mac ) {
	bash( [ 'bluetoothinfo', mac, 'CMD MAC' ], data => {
		if ( ! data ) {
			$( '#codebluetoothlist' )
				.empty()
				.addClass( 'hide' );
		} else {
			$( '#codebluetoothlist' )
				.html( data )
				.data( 'mac', mac )
				.removeClass( 'hide' );
		}
	} );
}
function connectWiFi( data ) {
	var icon  = 'wifi';
	var title = 'Wi-Fi'
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
					  icon    : icon
					, title   : title
					, message : error
				} );
			}
		}
	} );
	notify( icon, title, S.listeth || S.connectedwl ? 'Change ...' : 'Connect ...' );
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Access Point is currently active.'
	} );
}
function infoLan( v ) {
	var icon   = 'lan';
	var title  = ( v ? 'Edit' : 'Add' ) +' LAN Connection';
	var values = v || { ADDRESS: S.ipsub, GATEWAY: S.gateway }
	info( {
		  icon         : icon
		, title        : title
		, list         : [
			  [ 'IP',      'text' ]
			, [ 'Gateway', 'text' ]
		]
		, footer       : V ? warning( 'This is' ) : ''
		, focus        : 0
		, values       : values
		, checkchanged : true
		, checkblank   : true
		, checkip      : [ 0, 1 ]
		, buttonlabel  : ico( 'undo' ) +'DHCP'
		, button       : ! values.STATIC ? '' : () => {
			bash( [ 'lanedit' ] );
			notify( 'lan', 'Wired LAN', 'Reconnect ...' );
		}
		, ok           : () => infoLanSet( infoVal() )
	} );
}
function infoLanSet( v ) {
	var icon = 'lan';
	var ip   = v.IP;
	bash( [ 'lanedit', ...Object.values( v ), 'CMD '+ Object.keys( v ).join( ' ' ) ], avail => {
		if ( avail == -1 ) {
			clearInterval( V.interval );
			clearTimeout( V.timeout );
			bannerHide();
			info( {
				  icon    : icon
				, title   : 'Duplicate IP'
				, message : 'IP <wh>'+ ip +'</wh> already in use.'
				, ok      : () => infoLan( v )
			} );
		} else {
			notify( 'lan', 'Wired LAN', 'Reconnect ...' );
		}
	} );
}
function infoWiFi( v ) {
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
	var profile       = 'profileget' in V;
	var profilestatic = profile && V.profileget.ADDRESS;
	if ( dhcp ) {
		var tabfn = () => {
			if ( profilestatic ) {
				infoWiFi( V.profileget );
			} else {
				var val = infoVal();
				val.ADDRESS = S.ipsub;
				val.GATEWAY = S.gateway;
				var v       = {}
				Object.keys( default_v.static ).forEach( k => v[ k ] = val[ k ] );
				infoWiFi( v );
			}
		}
		list.splice( 2, 2 );
	} else {
		var tabfn = () => {
			if ( ! profilestatic ) {
				infoWiFi( V.profileget );
			} else {
				var val = infoVal();
				[ 'ADDRESS', 'GATEWAY' ].forEach( k => delete val[ k ] );
				infoWiFi( val );
			}
		}
	}
	if ( profile ) {
		var checkchanged = ( values.ADDRESS && profilestatic ) || ( ! values.ADDRESS && ! profilestatic );
	} else {
		var checkchanged = false;
	}
	info( {
		  icon         : 'wifi'
		, title        : v ? 'Saved Connection' : 'Add Connection'
		, tablabel     : [ 'DHCP', 'Static IP' ]
		, tab          : dhcp ? [ '', tabfn ] : [ tabfn, '' ]
		, boxwidth     : 180
		, list         : list
		, footer       : v ? warning( 'This is' ) : ''
		, values       : values
		, checkchanged : checkchanged
		, checkblank   : [ 0 ]
		, checklength  : { 1: [ 8, 'min' ] }
		, checkip      : dhcp ? '' : [ 2, 3 ]
		, ok           : () => connectWiFi( infoVal() )
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
		if ( S.listeth ) htmllan = '<li>'+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ S.listeth.ADDRESS
								 +'&ensp;<gr>&raquo;&ensp;'+ S.listeth.GATEWAY +'</gr></li>';
		$( '#listlan' ).html( htmllan );
		$( '#divlan' ).removeClass( 'hide' );
	}
	$( '#divap' ).toggleClass( 'hide', ! S.ap );
	renderQR();
	showContent();
}
function renderQR() {
	var ip = S.listeth ? S.listeth.IP : S.ipwl || S.apconf.ip;
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
				var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
				htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'">'+ ico( 'wifi'+ signal ) +'<grn>•</grn>&ensp;'+ list.ssid 
						 +'&ensp;<gr>•</gr>&ensp;'+ list.ip +'&ensp;<gr>&raquo;&ensp;'+ list.gateway +'</gr></li>';
			} else {
				htmlwl     += '<li class="wl notconnected" data-ssid="'+ list.ssid +'">'+ ico( 'wifi' ) +'<gr>•</gr>&ensp;'+ list.ssid +'</li>';
			}
		} );
	}
	$( '#listwl' ).html( htmlwl );
	$( '#divwl' ).removeClass( 'hide' );
	bannerHide();
}
function scanBluetooth() {
	bash( [ 'settings/networks-scan.sh' ], data => {
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
	bash( [ 'settings/networks-scan.sh', 'wlan' ], data => {
		if ( data ) {
			data.sort( ( a, b ) => b.signal - a.signal );
			S.listwlscan = data;
			var icon, signal;
			var htmlwl   = '';
			data.forEach( list => {
				signal  = list.signal;
				icon    = 'wifi';
				icon   += signal > -60 ? '' : ( signal < -67 ? 1 : 2 );
				icon    = ico( icon );
				if ( list.current ) {
					icon += '<grn>•</grn> ';
				} else if ( list.profile ) {
					icon += '<gr>•</gr> ';
				}
				htmlwl += '<li class="wlscan" data-ssid="'+ list.ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'">'+ icon;
				htmlwl += signal && signal < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' '+ ico( 'lock' );
				if ( signal != 0 ) htmlwl += '<gr>'+ signal +' dBm</gr>';
				htmlwl += '</li>';
			} );
		} else {
			var htmlwl = '<li><gr>(no accesspoints found)</gr></li>';
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
