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
	if ( $( this ).hasClass( 'disabled' ) ) {
		info( {
			  icon    : 'bluetooth'
			, title   : 'Bluetooth'
			, message : '<wh>DSP</wh> is currently enabled.'
		} );
		return
	}
	
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
			  icon          : 'wifi'
			, title         : ssid
			, passwordlabel : 'Password'
			, focus         : 0
			, oklabel       : 'Connect'
			, ok            : () => connectWiFi( { ESSID: ssid, KEY: infoVal(), SECURITY: security } )
		} );
	} else {
		connectWiFi( { ESSID: ssid } );
	}
} );
$( '.wladd' ).on( 'click', function() {
	infoWiFi();
} );
$( '.wlscan' ).on( 'click', function() {
	if ( S.hostapd ) {
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
	var menuH = $( '#menu' ).height();
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', V.li.position().top + 48 );
	var targetB = $( '#menu' ).offset().top + menuH;
	var wH      = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '.connect' ).on( 'click', function() {
	clearTimeout( V.timeoutscan );
	if ( V.listid === 'listbt' ) {
		bluetoothCommand( 'Connect' );
		return
	}
	
	if ( S.hostapd ) {
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
		, textlabel    : [ 'IP', 'Gateway' ]
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
		  icon          : 'wifi'
		, title         : v ? 'Saved Connection' : 'Add Connection'
		, tablabel      : [ 'DHCP', 'Static IP' ]
		, tab           : [ '', () => infoWiFiTab( infoVal() ) ]
		, boxwidth      : 180
		, textlabel     : [ 'SSID' ]
		, passwordlabel : 'Password'
		, checkbox      : [ 'WEP', 'Hidden SSID' ]
		, values        : values
		, checkblank    : [ 0 ]
		, checkchanged  : true
		, ok            : () => connectWiFi( infoVal() )
	} );
}
function infoWiFiGet() {
	bash( [ 'profileget', V.li.data( 'ssid' ), 'CMD SSID' ], v => {
		var static = v.IP === 'static'
		v.SECURITY = v.SECURITY === 'wep';
		v.HIDDEN   = 'HIDDEN' in v;
		[ 'INTERFACE', 'CONNECTION', 'IP' ].forEach( k => delete v[ k ] );
		static ? infoWiFiStatic( v ) : infoWiFi( v );
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
		, textlabel     : [ 'SSID', 'Password', 'IP', 'Gateway' ]
		, checkbox      : [ 'WEP', 'Hidden SSID' ]
		, values        : values
		, checkblank    : [ 0 ]
		, checkchanged  : true
		, checkip       : [ 2, 3 ]
		, beforeshow    : () => $('#infoContent input' ).eq( 1 ).attr( 'type', 'password' )
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
function qr( msg ) {
	return new QRCode( {
		  msg : msg
		, dim : 130
		, pad : 0
	} );
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
	$( '.btscan' ).toggleClass( 'disabled', S.camilladsp );
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
	$( '.wladd' ).toggleClass( 'hide', S.hostapd !== false );
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
	$( '#divaccesspoint' ).toggleClass( 'hide', ! S.hostapd );
	if ( ! $( '#divinterface' ).hasClass( 'hide' ) ) renderQR();
	showContent();
}
function renderQR() {
	var ip = S.ipeth || S.ipwl;
	if ( ! ip ) return
	
	if ( ip && ip !== S.hostapd.ip ) {
		$( '#qrwebui' ).html( qr( 'http://'+ ip ) );
		if( S.hostname ) ip += '<br><gr>http://</gr>'+ S.hostname +'.local';
		$( '#ipwebui' ).html( ip );
		$( '#divwebui' ).removeClass( 'hide' );
	} else {
		$( '#divwebui' ).addClass( 'hide' );
	}
	if ( S.hostapd ) {
		$( '#ipwebuiap' ).html( 'Web User Interface<br>http://<wh>'+ S.hostapd.ip +'</wh>' );
		$( '#ssid' ).text( S.hostapd.ssid );
		$( '#passphrase' ).text( S.hostapd.passphrase )
		$( '#qraccesspoint' ).html( qr( 'WIFI:S:'+ S.hostapd.ssid +';T:WPA;P:'+ S.hostapd.passphrase +';' ) );
		$( '#qrwebuiap' ).html( qr( 'http://'+ S.hostapd.ip ) );
		$( '#boxqr' ).removeClass( 'hide' );
	} else {
		$( '#ipwebuiap, #ssid, #passphrase, #qraccesspoint, #qrwebuiap' ).empty();
		$( '#boxqr' ).addClass( 'hide' );
	}
}
function renderWlan() {
	if ( ! $( '#divwifi' ).hasClass( 'hide' ) ) $( '#divwifi .back' ).trigger( 'click' );
	var htmlwl = '';
	if ( S.listwl ) {
		S.listwl.forEach( list => {
			if ( list.ip ) {
				if ( ! S.hostapd ) {
					var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
					htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'" data-gateway="'+ list.gateway +'">'
							 + ico( 'wifi'+ signal ) +'<grn>•</grn>&ensp;'+ list.ssid 
							 +'<gr>&ensp;•&ensp;</gr>'+ list.ip +'<gr>&ensp;&raquo;&ensp;'+ list.gateway +'</gr></li>';
				} else {
					htmlwl += '<li class="wl accesspoint">'+ ico( 'accesspoint' ) +'<grn>•</grn>&ensp;'
							 +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.hostapd.ip +'</li>';
				}
			} else {
				htmlwl     += '<li class="wl notconnected" data-ssid="'+ list.ssid +'">'+ ico( 'wifi' ) +'<gr>•&ensp;</gr>'+ list.ssid +'</li>';
			}
		} );
		$( '#listwl' ).html( htmlwl );
	} else {
		$( '#listwl' ).empty();
	}
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
