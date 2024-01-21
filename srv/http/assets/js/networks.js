var default_v = {
	  dhcp   : { ESSID: '', KEY: '',                           SECURITY: false, HIDDEN: false }
	, static : { ESSID: '', KEY: '', ADDRESS: '', GATEWAY: '', SECURITY: false, HIDDEN: false }
}

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
	bash( [ 'scankill' ] );
} );
$( '.back' ).on( 'click', function() {
	$( '#help, #divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '.btscan' ).on( 'click', function() {
	$( '#help, #divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
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
			, ok      : () => connectWiFi( { ESSID: ssid, KEY: infoVal(), SECURITY: security } )
		} );
	} else {
		connectWiFi( { ESSID: ssid } );
	}
} );
$( '.wladd' ).on( 'click', function() {
	infoWiFi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.accesspoint ) {
		infoAccesspoint();
	} else {
		$( '#help, #divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
		$( '#divwifi' ).removeClass( 'hide' );
		scanWlan();
	}
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	V.li = $( this );
	if ( V.li.hasClass( 'bt' ) && ! $('#codebluetoothlist' ).hasClass( 'hide' ) ) {
		$('#codebluetoothlist' ).addClass( 'hide' );
		return
	}
	
	if ( V.li.hasClass( 'accesspoint' ) ) return
	
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
		$( '#menu .disconnect' ).toggleClass( 'hide', ! connected );
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
$( '.connect' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Connect' );
		return
	}
	
	if ( S.accesspoint ) {
		infoAccesspoint();
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	notify( 'wifi', ssid, 'Connect ...' );
	bash( [ 'profileconnect', ssid, 'CMD SSID' ] );
} );
$( '.disconnect' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Disconnect' );
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	var icon = 'wifi';
	if ( S.ipeth ) {
		notify( icon, ssid, 'Disconnect ...' );
		bash( [ 'disconnect' ] )
	} else {
		info( {
			  icon    : icon
			, title   : ssid
			, message : ( S.listeth ? '' : iconwarning +'No network connections after this.<br>' ) +'Disconnect?'
			, okcolor : orange
			, ok      : () => {
				notify( icon, ssid, 'Disconnect ...' );
				bash( [ 'disconnect' ] )
			}
		} );
	}
} );
$( '.edit' ).on( 'click', function() {
	V.listid === 'listwl' ? infoWiFiGet() : infoLan();
} );
$( '.forget' ).on( 'click', function() {
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Remove' );
		return
	}
	
	var ssid = V.li.data( 'ssid' );
	var icon = 'wifi';
	info( {
		  icon    : icon
		, title   : ssid
		, message : S.ipeth || S.ipwl ? '' : iconwarning +'Current Web interface will be dropped.'
		, oklabel : ico( 'remove' ) +'Forget'
		, okcolor : red
		, ok      : () => {
			notify( icon, ssid, 'Forget ...' );
			bash( [ 'profileremove', ssid, 'CMD SSID', ] );
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
	clearTimeout( V.timeoutscan );
	if ( 'ADDRESS' in data ) { // static
		S.listeth ? notify( icon, title, 'Change ...' ) : reconnect( icon, data.ADDRESS, 5 );
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
					, ok      : infoWiFiGet
				} );
			}
		}
	} );
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
	var title  = 'Edit LAN Connection';
	var static = S.listeth.static;
	info( {
		  icon         : icon
		, title        : title
		, list         : [
			  [ 'IP',      'text' ]
			, [ 'Gateway', 'text' ]
		]
		, focus        : 0
		, values       : { IP: S.ipeth, GATEWAY: S.listeth.gateway }
		, checkchanged : true
		, checkblank   : true
		, checkip      : [ 0, 1 ]
		, buttonlabel  : static ? ico( 'undo' ) +'DHCP' : ''
		, button       : static ? () => {
			bash( [ 'lanedit' ] );
			reconnect( icon, S.hostname +'.local', 10 );
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
			reconnect( icon, ip, 3 );
		}
	} );
}
function infoWiFi( v ) {
	if ( v ) {
		var values = {};
		Object.keys( default_v.dhcp ).forEach( k => values[ k ] = v[ k ] );
	} else {
		var values = default_v.dhcp;
	}
	info( {
		  icon         : 'wifi'
		, title        : v ? 'Saved Connection' : 'Add Connection'
		, tablabel     : [ 'DHCP', 'Static IP' ]
		, tab          : [ '', () => infoWiFiTab( infoVal() ) ]
		, boxwidth     : 180
		, list         : [
			  [ 'SSID',        'text' ]
			, [ 'Password',    'password' ]
			, [ 'WEP',         'checkbox' ]
			, [ 'Hidden SSID', 'checkbox' ]
		]
		, values       : values
		, checkblank   : [ 0 ]
		, checkchanged : ! V.wifistatic
		, ok           : () => connectWiFi( infoVal() )
	} );
}
function infoWiFiGet() {
	bash( [ 'profileget', V.li.data( 'ssid' ), 'CMD SSID' ], v => {
		V.wifistatic = v.IP === 'static'
		v.SECURITY = v.SECURITY === 'wep';
		v.HIDDEN   = 'HIDDEN' in v;
		[ 'INTERFACE', 'CONNECTION', 'IP' ].forEach( k => delete v[ k ] );
		V.wifistatic ? infoWiFiStatic( v ) : infoWiFi( v );
	}, 'json' );
}
function infoWiFiStatic( v ) {
	if ( v ) {
		var values = {};
		Object.keys( default_v.static ).forEach( k => values[ k ] = v[ k ] );
	} else {
		var values = default_v.static;
	}
	values.ADDRESS = S.ipwl || S.ipsub;
	values.GATEWAY = S.gateway || S.ipsub;
	info( {
		  icon          : 'wifi'
		, title         : values ? 'Edit Saved Connection' : 'New Wi-Fi Connection'
		, tablabel      : [ 'DHCP', 'Static IP' ]
		, tab           : [ () => infoWiFiTab( infoVal() ), '' ]
		, boxwidth      : 180
		, list          : [
			  [ 'SSID',        'text' ]
			, [ 'Password',    'password' ]
			, [ 'IP',          'text' ]
			, [ 'Gateway',     'text' ]
			, [ 'WEP',         'checkbox' ]
			, [ 'Hidden SSID', 'checkbox' ]
		]
		, values        : values
		, checkblank    : [ 0 ]
		, checkchanged  : V.wifistatic
		, checkip       : [ 2, 3 ]
		, ok            : () => connectWiFi( infoVal() )
	} );
}
function infoWiFiTab( values ) {
	var target = 'ADDRESS' in values ? 'dhcp' : 'static';
	var keys   = Object.keys( default_v[ target ] );
	var v      = {}
	keys.forEach( k => v[ k ] = values[ k ] );
	target === 'dhcp' ? infoWiFi( v ) : infoWiFiStatic( v );
}
function psOnClose() {
	if ( $( '#divbluetooth' ).hasClass( 'hide' ) && $( '#divwifi' ).hasClass( 'hide' ) ) return
	
	bash( [ 'scankill' ] );
	clearTimeout( V.timeoutscan );
	$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	$( '.back' ).trigger( 'click' );
}
function reconnect( icon, ip, delay ) {
	loader();
	notify( icon, 'IP Address', 'Change to '+ ip +' in <a>'+ delay +'</a>s ...' );
	var i      = delay;
	V.interval = setInterval( () => {
		i--
		i > 0 ? $( '#bannerMessage a' ).text( i ) : clearInterval( V.interval );
	}, 1000 );
	V.timeout  = setTimeout( () => {
		location.href = 'http://'+ ip +'/settings.php?p=networks';
	}, delay * 1000 );
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
	$( '.wladd' ).toggleClass( 'hide', S.accesspoint !== false );
	if ( ! S.activeeth ) {
		$( '#divlan' ).addClass( 'hide' );
	} else {
		var htmlwl = '';
		if ( S.listeth ) htmlwl = '<li data-ip="'+ S.ipeth +'">'+ ico( 'lan' ) +'<grn>•</grn>&ensp;'+ S.ipeth
								 +'<gr>&ensp;&raquo;&ensp;'+ S.listeth.gateway +'</gr></li>';
		$( '#listlan' ).html( htmlwl );
		$( '.lanadd' ).toggleClass( 'hide', S.listeth !== false );
		$( '#divlan' ).removeClass( 'hide' );
	}
	$( '#divap' ).toggleClass( 'hide', ! S.accesspoint );
	renderQR();
	showContent();
}
function renderQR() {
	var ip = S.ipeth || S.ipwl || S.accesspoint.ip;
	if ( ! ip ) {
		$( '#divwebui' ).addClass( 'hide' );
		return
	}
	
	if ( S.accesspoint ) {
		var html = S.hostname
				  +'<br>'+ S.accesspoint.passphrase
				  +'<br>'+ qrCode( S.accesspoint.qr )
		$( '#qrap' ).html( html );
	}
	if ( ip ) {
		var http = '<gr>http://</gr>';
		var html   = http + ip
				  +'<br>'+ http + S.hostname +'.local'
				  +'<br>'+ qrCode( http + ip )
		$( '#qrurl' ).html( html );
	}
	$( '#divwebui' ).removeClass( 'hide' );
}
function renderWlan() {
	if ( ! $( '#divwifi' ).hasClass( 'hide' ) ) $( '#divwifi .back' ).trigger( 'click' );
	var htmlwl = '';
	if ( S.accesspoint ) {
		htmlwl += '<li class="wl accesspoint">'+ ico( 'accesspoint' ) +'<grn>•</grn>&ensp;'
				 +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.accesspoint.ip +'</li>';
	}
	if ( S.listwl ) {
		S.listwl.forEach( list => {
			if ( list.ip ) {
				var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
				htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'" data-gateway="'+ list.gateway +'">'
						 + ico( 'wifi'+ signal ) +'<grn>•</grn>&ensp;'+ list.ssid 
						 +'<gr>&ensp;•&ensp;</gr>'+ list.ip +'<gr>&ensp;&raquo;&ensp;'+ list.gateway +'</gr></li>';
			} else {
				htmlwl     += '<li class="wl notconnected" data-ssid="'+ list.ssid +'">'+ ico( 'wifi' ) +'<gr>•&ensp;</gr>'+ list.ssid +'</li>';
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
