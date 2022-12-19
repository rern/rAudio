$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

L = {}

$( 'body' ).click( function() {
	$( '#menu' ).addClass( 'hide' );
	$( '#codebluetooth' )
		.addClass( 'hide' )
		.data( 'mac', '' )
		.empty();
	$( 'li' ).removeClass( 'active' );
} );
$( '.back' ).click( function() {
	clearTimeout( V.timeoutscan );
	$( '#help, #divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '.btscan' ).click( function() {
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
	var name = $( this ).data( 'name' );
	var mac  = $( this ).data( 'mac' );
	notify( 'bluetooth', name, 'Pair ...' );
	bluetoothCommand( 'pair', mac );
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var ssid     = $( this ).data( 'ssid' );
	var security = $( this ).data( 'wpa' ) ? 'wpa' : 'wep';
	var encrypt  = $( this ).data( 'encrypt' );
	var data     = {
		  ESSID : ssid
		, IP    : 'dhcp'
		, add   : true
	}
	if ( encrypt === 'on' ) {
		info( {
			  icon          : 'wifi'
			, title         : ssid
			, passwordlabel : 'Password'
			, focus         : 0
			, oklabel       : 'Connect'
			, ok            : () => {
				data.Security = security;
				data.Key      = infoVal();
				connectWiFi( data );
			}
		} );
	} else {
		connectWiFi( data );
	}
} );
$( '.wladd' ).click( function() {
	S.hostapd ? infoAccesspoint() : infoWiFi();
} );
$( '.wlscan' ).click( function() {
	if ( S.hostapd ) {
		infoAccesspoint();
	} else {
		$( '#help, #divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
		$( '#divwifi' ).removeClass( 'hide' );
		scanWlan();
	}
} );
$( '.lanadd' ).click( function() {
	info( {
		  icon          : 'lan'
		, title         : 'New LAN Connection'
		, textlabel     : [ 'IP', 'Gateway' ]
		, focus         : 0
		, ok           : () => editLANSet( infoVal() )
	} );
} );
$( '.entries:not( .scan )' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	L.li = $( this );
	if ( L.li.hasClass( 'accesspoint' ) ) return
	
	L.id       = L.li.parent().prop( 'id' );
	if ( ! $( '#menu' ).hasClass( 'hide' ) ) {
		$( '#menu' ).addClass( 'hide' );
		if ( L.li.hasClass( 'active' ) ) return
	}
	
	$( 'li' ).removeClass( 'active' );
	L.li.addClass( 'active' );
	if ( L.id === 'listbt' ) {
		var connected = L.li.find( 'grn' ).length === 1;
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu' ).find( '.forget, .info' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', connected );
		$( '#menu .disconnect' ).toggleClass( 'hide', ! connected );
		$( '#menu .info' ).toggleClass( 'hide', L.li.data( 'mac' ) === $( '#codebluetooth' ).data( 'mac' ) );
	} else if ( L.id === 'listlan' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .edit' ).removeClass( 'hide' );
	} else {
		var notconnected = L.li.hasClass( 'notconnected' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', ! notconnected );
		$( '#menu .disconnect' ).toggleClass( 'hide', notconnected );
		$( '#menu .info' ).addClass( 'hide' );
	}
	var menuH = $( '#menu' ).height();
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', L.li.position().top + 48 );
	var targetB = $( '#menu' ).offset().top + menuH;
	var wH      = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '.connect' ).click( function() {
	clearTimeout( V.timeoutscan );
	if ( L.id === 'listbt' ) {
		var icon = L.li.find( 'i' ).hasClass( 'fa-btsender' ) ? 'btsender' : 'bluetooth';
		notify( icon, L.li.data( 'name' ), 'Connect ...' );
		bluetoothCommand( 'connect', L.li.data( 'mac' ) );
		return
	}
	
	if ( S.hostapd ) {
		infoAccesspoint();
		return
	}
	
	var ssid = L.li.data( 'ssid' );
	notify( 'wifi', ssid, 'Connect ...' );
	bash( [ 'profileconnect', ssid ] );
} );
$( '.disconnect' ).click( function() {
	if ( L.id === 'listbt' ) {
		var icon = L.li.find( 'i' ).hasClass( 'fa-btsender' ) ? 'btsender' : 'bluetooth';
		notify( icon, L.li.data( 'name' ), 'Disconnect ...' );
		bluetoothCommand( 'disconnect', L.li.data( 'mac' ) );
		return
	}
	
	var ssid = L.li.data( 'ssid' );
	var icon = 'wifi';
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
} );
$( '.edit' ).click( function() {
	L.id === 'listwl' ? editWiFi() : editLAN();
} );
$( '.forget' ).click( function() {
	if ( L.id === 'listbt' ) {
		var name = L.li.data( 'name' );
		var icon = L.li.find( 'i' ).hasClass( 'fa-btsender' ) ? 'btsender' : 'bluetooth';
		info( {
			  icon    : icon
			, title   : name
			, message : S.listeth ? '' : iconwarning +'No network connections after this.'
			, oklabel : '<i class="fa fa-minus-circle"></i>Forget'
			, okcolor : red
			, ok      : () => {
				notify( icon, name, 'Forget ...' );
				bluetoothCommand( 'remove', L.li.data( 'mac' ) );
			}
		} );
		return
	}
	
	var ssid = L.li.data( 'ssid' );
	var icon = 'wifi';
	info( {
		  icon    : icon
		, title   : ssid
		, message : S.ipeth || S.ipwl ? '' : iconwarning +'Current Web interface will be dropped.'
		, oklabel : '<i class="fa fa-minus-circle"></i>Forget'
		, okcolor : red
		, ok      : () => {
			notify( icon, ssid, 'Forget ...' );
			bash( [ 'profileremove', ssid ] );
		}
	} );
} );
$( '.info' ).click( function() {
	bluetoothInfo( L.li.data( 'mac' ) );
} );
$( '.hostapdset' ).click( function() {
	var icon  = 'accesspoint';
	var title = 'Access Point';
	info( {
		  icon         : icon
		, title        : title
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : S.hostapd.conf
		, checkchanged : S.hostapd
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, ok           : () => {
			var values  = infoVal();
			var ip      = values[ 0 ];
			var pwd     = values[ 1 ];
			var ips     = ip.split( '.' );
			var ip3     = ips.pop();
			var ip012   = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			bash( [ 'hostapd', true, iprange, ip, pwd ] );
			notify( icon, title, S.hostapd ? 'Change ...' : 'Enable ...' );
		}
	} );
} );

} );

function bluetoothCommand( cmd, mac ) {
	bash( '/srv/http/bash/bluetoothcommand.sh '+ cmd +' '+ mac );
}
function bluetoothInfo( mac ) {
	bash( [ 'bluetoothinfo', mac ], data => {
		if ( ! data ) {
			$( '#codebluetooth' )
				.empty()
				.addClass( 'hide' );
		} else {
			$( '#codebluetooth' )
				.html( data )
				.data( 'mac', mac )
				.removeClass( 'hide' );
		}
	} );
}
function connectWiFi( data ) { // { add:..., gw:..., hidden:..., ip:..., password:..., ssid:..., wpa:... }
	clearTimeout( V.timeoutscan );
	var ssid = data.ESSID;
	var icon = 'wifi';
	if ( 'Address' in data ) {
		var ip = data.Address;
		if ( $( '#listlan li' ).length ) {
			notify( icon, ssid, 'Change ...' );
		} else {
			loader();
			location.href = 'http://'+ ip +'/settings.php?p=networks';
			notify( icon, ssid, 'Change URL to '+ ip );
		}
	} else {
		notify( icon, ssid, S.connectedwl ? 'Change ...' : 'Connect ...' );
	}
	bash( [ 'connect', JSON.stringify( data ) ], connected => {
		if ( connected == -1 ) {
			S.wlconnected =  '';
			info( {
				  icon      : icon
				, title     : 'Wi-Fi'
				, message   : 'Connect to <wh>'+ ssid +'</wh> failed.'
			} );
		}
	} );
}
function editLAN() {
	var static = S.listeth.static;
	var ip     = S.ipeth;
	var gw     = S.listeth.gateway;
	var icon   = 'lan';
	var title  = 'Edit LAN Connection';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : ! static ? [ '<gr>DHCP</gr> IP', 'Gateway' ] : [ '<gr>Static</gr> IP' ]
		, focus        : 0
		, values       : [ ip, gw ]
		, checkchanged : 1
		, checkblank   : 1
		, beforeshow   : () => {
			if ( ! static ) {
				$( '#infoContent input' ).eq( 0 ).on( 'keyup paste cut', function() {
					$( '#infoContent gr' ).text( $( this ).val() === ip ? 'DHCP' : 'Static' );
				} );
			}
		}
		, buttonlabel  : ! static ? '' : '<i class="fa fa-undo"></i>DHCP'
		, button       : ! static ? '' : () => {
			notify( icon, title, 'Change URL to '+ S.hostname +'.local ...' );
			loader();
			location.href = 'http://'+ S.hostname +'.local/settings.php?p=networks';
			bash( [ 'editlan' ] );
		}
		, ok           : () => editLANSet( infoVal() )
	} );
}
function editLANSet( values ) {
	var ip      = values[ 0 ];
	var gateway = values[ 1 ];
	notify( 'lan', 'IP Address', 'Set ...' );
	bash( [ 'editlan', ip, gateway ], avail => {
		if ( avail == -1 ) {
			info( {
				  icon    : 'lan'
				, title   : 'Duplicate IP'
				, message : 'IP <wh>'+ ip +'</wh> already in use.'
				, ok      : editLAN
			} );
		} else {
			location.href = 'http://'+ ip +'/settings.php?p=networks';
		}
		bannerHide();
	} );
}
function editWiFi() {
	bash( [ 'profileget', L.li.data( 'ssid' ) ], values => infoWiFi( values ), 'json' );
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Access Point is currently active.'
	} );
}
function infoWiFi( values ) {
	if ( values ) {
		var add = false;
	} else {
		var add = true;
		values  = [ '', '', '', '', false, false, false ];
	}
	info( {
		  icon          : 'wifi'
		, title         : add ? 'New Wi-Fi Connection' : 'Edit Saved Connection'
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, focus         : 0
		, boxwidth      : 180
		, checkbox      : [ 'Static IP', 'Hidden SSID', 'WEP' ]
		, passwordlabel : 'Password'
		, values        : values
		, checkchanged  : ! add
		, checkblank    : ! add
		, beforeshow    : () => {
			var $static = $( '#infoContent' ).find( 'tr:eq( 1 ), tr:eq( 2 )' );
			$static.toggleClass( 'hide', ! values[ 4 ] );
			$( '#infoContent input:checkbox' ).eq( 0 ).change( function() {
				$static.toggleClass( 'hide', ! $( this ).prop( 'checked' ) );
			} );
		}
		, ok            : () => {
			var k    = [ 'ESSID', 'Address', 'Gateway', 'Key', 'IP', 'Hidden', 'Security' ];
			var v    = infoVal();
			var data = { add: add }
			$.each( v, ( i, v ) => {
				if ( i === 4 ) {
					v = v ? 'static' : 'dhcp';
				} else if ( i === 6 ) {
					v = v ? 'wep' : 'wpa';
				}
				data[ k[ i ] ] = v;
			} );
			if ( data.IP === 'dhcp' ) {
				connectWiFi( data );
			} else {
				bash( 'ping -c 1 -w 1 '+ data.Address +' &> /dev/null && echo -1', avail => {
					if ( avail == -1 ) {
						info( {
							  icon    : 'wifi'
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ data.Address +'</wh> already in use.'
							, ok      : editWiFi
						} );
					} else {
						connectWiFi( data );
					}
				} );
			}
		}
	} );
}
function qr( msg ) {
	return new QRCode( {
		  msg : msg
		, dim : 130
		, pad : 0
	} );
}
function renderBluetooth() {
	if ( ! $( '#divbluetooth' ).hasClass( 'hide' ) ) $( '#divbluetooth .back' ).click();
	if ( S.listbt ) {
		var htmlbt  = '';
		S.listbt.forEach( list => {
			var dot = list.connected ? '<grn>•</grn>' : '<gr>•</gr>';
			htmlbt += '<li class="bt" data-mac="'+ list.mac +'" data-name="'+ list.name +'">'
					 +'<i class="fa fa-'+ ( list.type === 'Source' ? 'btsender' : 'bluetooth' ) +'"></i>'+ dot +'&ensp;'+ list.name +'</li>';
		} );
		$( '#listbt' ).html( htmlbt );
	} else {
		$( '#listbt' ).empty();
	}
	if ( ! $( '#codebluetooth' ).hasClass( 'hide' ) ) {
		var mac = $( '#codebluetooth' ).data( 'mac' );
		bluetoothInfo( mac );
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
	if ( ! S.activeeth ) {
		$( '#divlan' ).addClass( 'hide' );
	} else {
		var htmlwl = '';
		if ( S.listeth ) htmlwl = '<li data-ip="'+ S.ipeth +'"><i class="fa fa-lan"></i><grn>•</grn>&ensp;'+ S.ipeth
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
	if ( ! $( '#divwifi' ).hasClass( 'hide' ) ) $( '#divwifi .back' ).click();
	var htmlwl = '';
	if ( S.listwl ) {
		S.listwl.forEach( list => {
			if ( list.ip ) {
				if ( ! S.hostapd ) {
					var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
					htmlwl += '<li class="wl" data-ssid="'+ list.ssid +'" data-ip="'+ list.ip +'" data-gateway="'+ list.gateway +'">'
							 +'<i class="fa fa-wifi'+ signal +'"></i><grn>•</grn>&ensp;'+ list.ssid 
							 +'<gr>&ensp;•&ensp;</gr>'+ list.ip +'<gr>&ensp;&raquo;&ensp;'+ list.gateway +'</gr></li>';
				} else {
					htmlwl += '<li class="wl accesspoint"><i class="fa fa-accesspoint"></i><grn>•</grn>&ensp;'
							 +'<gr>Access point&ensp;&laquo;&ensp;</gr>'+ S.hostapd.hostapdip +'</li>';
				}
			} else {
				htmlwl     += '<li class="wl notconnected" data-ssid="'+ list.ssid +'"><i class="fa fa-wifi"></i><gr>•&ensp;</gr>'+ list.ssid +'</li>';
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
	bash( dirbash +'networks-scan.sh', data => {
		if ( data ) {
			S.listbtscan = data;
			var htmlbt   = '';
			data.forEach( list => htmlbt  += '<li class="btscan" data-mac="'+ list.mac +'" data-name="'+ list.name +'"><i class="fa fa-bluetooth"></i><wh>'+ list.name +'</wh></li>' );
			$( '#listbtscan' ).html( htmlbt );
		}
		V.timeoutscan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( dirbash +'networks-scan.sh wlan', data => {
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
				htmlwl += '<li class="wlscan" data-ssid="'+ list.ssid +'" data-encrypt="'+ list.encrypt +'" data-wpa="'+ list.wpa +'"><i class="fa fa-wifi'+ signal +'"></i>';
				htmlwl += dbm && dbm < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' <i class="fa fa-lock"></i>';
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
