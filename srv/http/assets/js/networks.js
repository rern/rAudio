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
	var $this = $( this );
	var name  = $this.data( 'name' );
	var mac   = $this.data( 'mac' );
	notify( 'bluetooth', name, 'Pair ...' );
	bash( [ 'bluetoothcommand.sh', 'pair', mac ] );
} );
$( '.wladd' ).on( 'click', function() {
	delete V.profileget;
	infoWiFi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.ap ) {
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
		$( '#menu .info' ).addClass( 'hide' );
	}
	contextMenu();
} );
$( '.lanadd' ).on( 'click', function() {
	infoLan();
} );
$( '.connect' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Connect' );
		return
	}
	
	if ( S.ap ) {
		infoAccesspoint();
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	if ( location.hostname === V.li.data( 'ip' ) ) {
		reconnect( ssid, S.hostname );
	} else {
		notify( 'wifi', ssid, 'Connect ...' );
	}
	bash( [ 'profileconnect', ssid, 'CMD SSID' ] );
} );
$( '.disconnect' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Disconnect' );
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	var icon = 'wifi';
	info( {
		  icon       : icon
		, title      : 'Wi-Fi'
		, message    : 'SSID: <wh>'+ ssid +'</wh>'
		, footer     : footer( 'Disconnect' )
		, okcolor    : orange
		, ok         : () => {
			notify( icon, ssid, 'Disconnect ...' );
			bash( [ 'disconnect', ssid, 'CMD SSID' ] )
		}
	} );
} );
$( '.edit' ).on( 'click', function() {
	if ( V.listid === 'listwl' ) {
		bash( [ 'profileget', V.li.data( 'ssid' ), 'CMD SSID' ], v => {
			V.profileget = v;
			infoWiFi( v );
		}, 'json' );
	} else {
		infoLan();
	}
} );
$( '.forget' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Remove' );
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	var icon = 'wifi';
	info( {
		  icon       : icon
		, title      : 'Wi-Fi'
		, message    : 'SSID: <wh>'+ ssid +'</wh>'
		, footer     : footer( 'Forget' )
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
			bash( [ 'btalias', infoVal(), 'CMD ALIAS' ] );
		}
	} );
} );
$( '.info' ).on( 'click', function() {
	bluetoothInfo( V.li.data( 'mac' ) );
} );

} );

function bluetoothCommand( action ) {
	var icon = V.li.find( 'i' ).hasClass( 'i-btsender' ) ? 'btsender' : 'bluetooth';
	notify( icon, V.li.data( 'name' ), action +' ...', -1 );
	bash( [ 'bluetoothcommand.sh', action.toLowerCase(), V.li.data( 'mac' ) ] );
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
	var title = 'Connect Wi-Fi'
	if ( 'profileget' in V ) {
		var values = jsonClone( data );
		delete values.DISABLE;
		delete V.profileget.DISABLE;
		if ( Object.values( V.profileget ).join( '' ) === Object.values( values ).join( '' ) ) {
			notify( icon, title, data.DISABLE ? 'Disable ...' : 'Enable ...' );
			bash( [ 'profiledisable', data.SSID, data.DISABLE, 'CMD SSID DISABLE' ] );
			return
		}
	}
	
	clearTimeout( V.timeoutscan );
	if ( 'ADDRESS' in data ) { // static
		S.listeth ? notify( icon, title, 'Change ...' ) : reconnect( data.SSID, data.ADDRESS );
	} else {
		notify( icon, title, S.connectedwl ? 'Change ...' : 'Connect ...' );
	}
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
}
function footer( action ) {
	return 'li' in V && V.li.data( 'ip' ) === location.hostname ? iconwarning +'<wh>'+ action +' current connection</wh>' : ''
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Access Point is currently active.'
	} );
}
function infoLan() {
	var icon   = 'lan';
	var title  = ( S.listeth ? 'Edit' : 'Add' ) +' LAN Connection';
	var static = S.listeth.static;
	info( {
		  icon         : icon
		, title        : title
		, list         : [
			  [ 'IP',      'text' ]
			, [ 'Gateway', 'text' ]
		]
		, footer       : footer( 'This is' )
		, focus        : 0
		, values       : S.listeth ? { IP: S.listeth.ip, GATEWAY: S.listeth.gateway } : { IP: S.ipsub, GATEWAY: S.gateway }
		, checkchanged : true
		, checkblank   : true
		, checkip      : [ 0, 1 ]
		, buttonlabel  : static ? ico( 'undo' ) +'DHCP' : ''
		, button       : static ? () => {
			bash( [ 'lanedit' ] );
			reconnect( 'Wired LAN', S.hostname );
		} : ''
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
				, ok      : infoLan
			} );
		} else {
			reconnect( 'Wired LAN', ip );
		}
	} );
}
function infoWiFi( v ) {
	var list = [
		  [ '',             'hidden' ]
		, [ 'SSID',         'text' ]
		, [ 'Password',     'password' ]
		, [ 'IP',           'text' ]
		, [ 'Gateway',      'text' ]
		, [ 'WEP Protocol', 'checkbox' ]
		, [ 'Hidden SSID',  'checkbox' ]
		, [ 'Disable',      'checkbox' ]
	];
	var default_v = {
		  dhcp   : { IP: 'dhcp',   ESSID: '', KEY: '',                           SECURITY: false, HIDDEN: false }
		, static : { IP: 'static', ESSID: '', KEY: '', ADDRESS: '', GATEWAY: '', SECURITY: false, HIDDEN: false }
	}
	if ( v ) {
		var dhcp   = v.IP === 'dhcp';
		v.SECURITY = v.SECURITY === 'wep';
		v.HIDDEN   = V.HIDDEN === 'yes';
		var values = {};
		Object.keys( default_v[ v.IP ] ).forEach( k => values[ k ] = v[ k ] );
	} else {
		var values = default_v[ 'dhcp' ];
		var dhcp   = true;
	}
	if ( dhcp ) {
		var tabfn = () => {
			var val = infoVal();
			val.IP  = 'static';
			infoWiFi( val );
		}
		list.splice( 3, 2 );
	} else {
		var tabfn = () => {
			var val = infoVal();
			val.IP  = 'dhcp';
			infoWiFi( val );
		}
		values.ADDRESS = S.ipwl || S.ipsub;
		values.GATEWAY = S.gateway || S.ipsub;
	}
	var checkchanged = 'profileget' in V && Object.values( V.profileget ).join( '' ) === Object.values( values ).join( '' );
	info( {
		  icon         : 'wifi'
		, title        : v ? 'Saved Connection' : 'Add Connection'
		, tablabel     : [ 'DHCP', 'Static IP' ]
		, tab          : dhcp ? [ '', tabfn ] : [ tabfn, '' ]
		, boxwidth     : 180
		, list         : list
		, footer       : footer( 'This is' )
		, values       : values
		, checkchanged : checkchanged
		, checkblank   : [ 0 ]
		, checkip      : dhcp ? '' : [ 2, 3 ]
		, ok           : () => connectWiFi( infoVal() )
	} );
}
function psOnClose() {
	if ( $( '#divbluetooth' ).hasClass( 'hide' ) && $( '#divwifi' ).hasClass( 'hide' ) ) return
	
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
function reconnect( ssid, ip ) {
	loader();
	notify( 'wifi', ssid, 'Connect ...' );
	websocketReconnect( ip );
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
	if ( ! S.activebt ) {
		$( '#divbt' ).addClass( 'hide' );
	} else {
		renderBluetooth();
	}
	if ( ! S.activewl ) {
		$( '#divwl' ).addClass( 'hide' );
	} else {
		renderWlan();
	}
	$( '.wladd' ).toggleClass( 'hide', S.ap );
	if ( ! S.activeeth ) {
		$( '#divlan' ).addClass( 'hide' );
	} else {
		var htmlwl = '';
		if ( S.listeth ) htmlwl = '<li data-ip="'+ S.ipeth +'">'+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ S.listeth.ip
								 +'&ensp;<gr>&raquo;&ensp;'+ S.listeth.gateway +'</gr></li>';
		$( '#listlan' ).html( htmlwl );
		$( '#divlan' ).removeClass( 'hide' );
	}
	$( '#divap' ).toggleClass( 'hide', ! S.ap );
	renderQR();
	showContent();
}
function renderQR() {
	var ip = S.ipeth || S.ipwl || S.apconf.ip;
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
			S.listwlscan = data;
			var htmlwl   = '';
			data.forEach( list => {
				if ( list.signal.slice( -3 ) === 'dBm' ) {
					var dbm    = parseInt( list.signal.slice( 0, -4 ) );
					var signal = dbm > -60 ? '' : ( dbm < -67 ? 1 : 2 );
				} else {
					var dbm    = '';
					var signal = '';
				}
				htmlwl += '<li class="wlscan" data-ssid="'+ list.ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'">'+ ico( 'wifi'+ signal );
				htmlwl += dbm && dbm < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' '+ ico( 'lock' );
				if ( list.signal != 0 ) htmlwl += '<gr>'+ list.signal +'</gr>';
				htmlwl += '</li>';
			} );
		} else {
			var htmlwl = '<li><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwlscan' ).html( htmlwl );
		V.timeoutscan = setTimeout( scanWlan, 12000 );
	}, 'json' );
}
