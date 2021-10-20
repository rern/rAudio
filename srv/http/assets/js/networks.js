$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var accesspoint = $( '#accesspoint' ).length;
$( '.back' ).click( function() {
	clearTimeout( G.timeoutScan );
	$( '#divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '#btscan' ).click( function() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	scanBluetooth();
} );
$( '#listbtscan' ).on( 'click', 'li', function() {
	var list = G.listbtscan[ $( this ).index() ];
	if ( !list.connected ) {
		notify( 'Bluetooth', 'Pair ...', 'bluetooth' );
		bash( [ 'btpair', list.mac ], function( data ) {
			bannerHide();
			if ( data != -1 ) {
				$( '.back' ).click();
			} else {
				info( {
					  icon      : 'bluetooth'
					, title     : 'Bluetooth'
					, message   : 'Pair <wh>'+ list.name +'</wh> failed'
				} );
			}
		} );
	}
} );
$( '#wladd' ).click( function() {
	'ssid' in G ? infoAccesspoint() : editWiFiInfo();
} );
$( '#wlscan' ).click( function() {
	'ssid' in G ? infoAccesspoint() : wlanStatus();
} );
$( '#lanadd' ).click( function() {
	info( {
		  icon          : 'lan'
		, title         : 'New LAN Connection'
		, textlabel     : [ 'IP', 'Gateway' ]
		, ok           : function() {
			editLANSet( infoVal() );
		}
	} );
} );
$( '#listbt, #listlan, #listwl' ).on( 'click', 'li', function() {
	G.li = $( this );
	G.list = G.li.parent().prop( 'id' );
	var active = $( this ).hasClass( 'active' );
	$( 'li' ).removeClass( 'active' );
	G.li.addClass( 'active' );
	var $menu = $( '#menu' );
	if ( !$menu.hasClass( 'hide' ) ) {
		$menu.addClass( 'hide' );
		if ( active ) return
	}
	
	if ( G.list === 'listbt' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .disconnect' ).toggleClass( 'hide', !G.li.data( 'connected' ) );
		$( '#menu .forget' ).removeClass( 'hide' );
	} else if ( G.list === 'listlan' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .edit' ).removeClass( 'hide' );
	} else {
		var notconnected = G.li.hasClass( 'notconnected' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', !notconnected );
		$( '#menu .disconnect' ).toggleClass( 'hide', notconnected );
	}
	var menuH = $menu.height();
	$menu
		.removeClass( 'hide' )
		.css( 'top', G.li.position().top + 48 );
	var targetB = $menu.offset().top + menuH;
	var wH = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( 'body' ).click( function( e ) {
	if ( !$( e.target ).parents( '#listbt, #listlan, #listwl' ).length ) {
		$( '#menu' ).addClass( 'hide' );
		$( 'li' ).removeClass( 'active' );
	}
} );
$( '.connect' ).click( function() {
	clearTimeout( G.timeoutScan );
	var name = G.li.data( 'ssid' );
	notify( name, 'Connect ...', 'wifi' );
	bash( [ 'profileconnect', name ] )
} );
$( '.disconnect' ).click( function() {
	if ( G.list === 'listbt' ) {
		var list = G.listbt[ G.li.index() ]
		var name = list.name;
		var icon = 'bluetooth';
	} else {
		var name = G.li.data( 'ssid' );
		var icon = 'wifi';
	}
	info( {
		  icon    : icon
		, title   : name
		, message : 'Disconnect?'
		, oklabel : '<i class="fa fa-times"></i>OK'
		, okcolor : orange
		, ok      : function() {
			clearTimeout( G.timeoutScan );
			notify( name, 'Disconnect ...', icon );
			bash( [ icon === 'wifi' ? 'disconnect' : 'btdisconnect' ] )
		}
	} );
} );
$( '.edit' ).click( function() {
	G.list === 'listwl' ? editWiFi() : editLAN();
} );
$( '.forget' ).click( function() {
	var connectedlan = '';
	if ( G.list === 'listbt' ) {
		var list = G.listbt[ G.li.index() ]
		var name = list.name;
		var mac = list.mac;
		var icon = 'bluetooth';
	} else {
		var name = G.li.data( 'ssid' );
		var icon = 'wifi';
		if ( !$( '#listlan li' ).data( 'ip' ) ) connectedlan = '<i class="fa fa-warning red"></i> Network connection will be lost.<br>';
	}
	info( {
		  icon    : icon
		, title   : name
		, message : connectedlan + 'Forget?'
		, oklabel : '<i class="fa fa-minus-circle"></i>OK'
		, okcolor : red
		, ok      : function() {
			clearTimeout( G.timeoutScan );
			notify( name, 'Forget ...', icon );
			icon === 'wifi' ? bash( [ 'profileremove', name ] ) : bash( "/srv/http/bash/networks.sh btremove$'\n'"+ mac );
		}
	} );
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var list = G.listwlscan[ $( this ).index() ];
	var ssid = list.ssid;
	var wpa = list.wpa || 'wep';
	var data = {
		  ESSID     : ssid
		, IP        : 'dhcp'
	}
	if ( !list.profile ) {
		if ( list.encrypt ) {
			info( {
				  icon          : 'wifi'
				, title         : ssid
				, passwordlabel : 'Password'
				, oklabel       : 'Connect'
				, ok            : function() {
					data.Security = wpa;
					data.Key      = infoVal();
					connectWiFi( data );
				}
			} );
		} else {
			connectWiFi( data );
		}
	} else {
		var ip = list.ip;
		info( {
			  icon    : 'wifi'
			, title   : ssid
			, message : ip ? 'Disconnect?' : 'Connect?'
			, oklabel : ip ? '<i class="fa fa-times"></i>OK' : '<i class="fa fa-check"></i>OK'
			, okcolor : ip ? orange : ''
			, ok      : function() {
				clearTimeout( G.timeoutScan );
				notify( ssid, ip ? 'Disconnect ...' : 'Connect ...', 'wifi' );
				if ( ip ) {
					bash( [ 'disconnect' ] );
				} else {
					bash( [ 'profileconnect', ssid ] );
				}
			}
		} );
	}
} );
$( '#setting-accesspoint' ).click( function() {
	info( {
		  icon         : 'accesspoint'
		, title        : 'Access Point'
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : G.hostapd.conf
		, checkchanged : ( G.hostapd ? 1 : 0 )
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, ok           : function() {
			var values = infoVal();
			var ip = values[ 0 ];
			var pwd = values[ 1 ];
			var ips = ip.split( '.' );
			var ip3 = ips.pop();
			var ip012 = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			bash( [ 'hostapdset', iprange, ip, pwd ] );
			notify( 'RPi Access Point', G.hostapd ? 'Change ...' : 'Enable ...', 'wifi' );
		}
	} );
} );

} );

function connectWiFi( data ) { // { ssid:..., wpa:..., password:..., hidden:..., ip:..., gw:... }
	clearTimeout( G.timeoutScan );
	var ssid = data.ESSID;
	var ip = data.Address;
	if ( ip ) {
		if ( $( '#listlan li' ).length ) {
			notify( ssid, 'Change ...', 'wifi' );
		} else {
			loader();
			location.href = 'http://'+ ip +'/settings.php?p=networks';
			notify( ssid, 'Change URL to '+ ip, 'wifi' );
		}
	} else {
		notify( ssid, $( '#listwl li' ).length ? 'Change ...' : 'Connect ...', 'wifi' );
	}
	bash( [ 'connect', JSON.stringify( data ) ], function( std ) {
		if ( std == -1 ) {
			G.wlconnected =  '';
			info( {
				  icon      : 'wifi'
				, title     : 'Wi-Fi'
				, message   : 'Connect to <wh>'+ ssid +'</wh> failed.'
			} );
		} else {
			$( '.back' ).click();
		}
	} );
}
function editLAN() {
	var static = G.listeth.static;
	var ip = G.listeth.ip;
	var gw = G.listeth.gateway;
	info( {
		  icon         : 'lan'
		, title        : 'Edit LAN Connection'
		, textlabel    : [ ( static ? '<gr>Static</gr> IP' : '<gr>DHCP</gr> IP' ), 'Gateway' ]
		, values       : [ ip, gw ]
		, checkchanged : 1
		, checkblank   : 1
		, beforeshow   : function() {
			if ( !static ) {
				$( '#infoContent input:eq( 0 )' ).on( 'keyup paste cut', function() {
					$( '#infoContent gr' ).text( $( this ).val() === ip ? 'DHCP' : 'Static' );
				} );
			}
		}
		, buttonlabel  : ( static ? '<i class="fa fa-undo"></i>DHCP' : '' )
		, button       : ( static ? function() {
			notify( 'LAN IP Address', 'Change URL to '+ G.hostname +'.local ...', 'lan' );
			loader();
			location.href = 'http://'+ G.hostname +'.local/settings.php?p=networks';
			bash( [ 'editlan' ] );
		} : '' )
		, ok           : function() {
			editLANSet( infoVal() );
		}
	} );
}
function editLANSet( values ) {
	var ip = values[ 0 ];
	var gateway = values[ 1 ];
	notify( 'IP Address', 'Set ...', 'lan' );
	bash( [ 'editlan', ip, gateway ], function( used ) {
		if ( used == -1 ) {
			info( {
				  icon    : 'lan'
				, title   : 'Duplicate IP'
				, message : 'IP <wh>'+ ip +'</wh> already in use.'
				, ok      : function() {
					editLAN();
				}
			} );
		} else {
			location.href = 'http://'+ ip +'/settings.php?p=networks';
		}
		bannerHide();
	} );
}
function editWiFi() {
	var list = G.listwl[ G.li.index() ];
	bash( [ 'profileget', list.ssid ], function( data ) {
		var values = [ list.ssid, list.ip, list.gateway, ...data ];
		editWiFiInfo( values );
	}, 'json' );
}
function editWiFiInfo( values ) {
	if ( values ) {
		var add = false;
	} else {
		var add = true;
		values = [ '', '', '', '', false, false, false ];
	}
	info( {
		  icon          : 'wifi'
		, title         : add ? 'New Wi-Fi Connection' : 'Edit Saved Connection'
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, boxwidth      : 180
		, checkbox      : [ 'Static IP', 'Hidden SSID', 'WEP' ]
		, passwordlabel : 'Password'
		, values        : values
		, checkchanged  : add ? 0 : 1
		, checkblank    : add ? 0 : 1
		, beforeshow    : function() {
			var $static = $( '#infoContent' ).find( 'tr:eq( 1 ), tr:eq( 2 )' );
			$static.toggleClass( 'hide', !values[ 4 ] );
			$( '#infoContent input:checkbox:eq( 0 )' ).change( function() {
				$static.toggleClass( 'hide', !$( this ).prop( 'checked' ) );
			} );
		}
		, ok            : function() {
			var k =[ 'ESSID', 'Address', 'Gateway', 'Key', 'IP', 'Hidden', 'Security' ];
			var v = infoVal();
			var data = {}
			$.each( v, function( i, v ) {
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
				bash( 'ping -c 1 -w 1 '+ data.Address +' &> /dev/null && echo -1', function( std ) {
					if ( std == -1 ) {
						info( {
							  icon    : 'wifi'
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ data.Address +'</wh> already in use.'
							, ok      : function() {
								editWiFi();
							}
						} );
					} else {
						connectWiFi( data );
					}
				} );
			}
		}
	} );
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Access Point must be disabled.'
	} );
}
function renderBluetooth() {
	G.btconnected = false;
	var htmlbt = '';
	if ( G.listbt ) {
		G.listbt.forEach( function( list ) {
			if ( list.connected ) G.btconnected = true;
			htmlbt += '<li class="bt" data-name="'+ list.name +'"><i class="fa fa-bluetooth"></i>';
			htmlbt += list.connected ? '<grn>•</grn>&ensp;' : '<gr>•</gr>&ensp;'
			htmlbt += list.name +'</li>';
		} );
	}
	$( '#listbt' ).html( htmlbt );
}
function renderPage( list ) {
	if ( typeof list === 'string' ) { // on load, try catching any errors
		var list2G = list2JSON( list );
		if ( !list2G ) return
	} else {
		G = list;
	}
	if ( G.activebt ) {
		renderBluetooth();
		$( '#divbt' ).removeClass( 'hide' );
	} else {
		$( '#divbt' ).addClass( 'hide' );
	}
	if ( G.activewlan ) {
		var htmlwl = '';
		if ( G.listwl ) {
			G.listwl.forEach( function( list ) {
				if ( list.dbm ) {
					var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
					var datassid = !G.hostapd ? 'data-ssid="'+ list.ssid +'"' : '';
					htmlwl += '<li class="wl" '+ datassid +'><i class="fa fa-wifi'+ signal +'"></i><grn>•</grn>&ensp;';
					if ( !G.hostapd ) {
						htmlwl += list.ssid +'<gr>&ensp;•&ensp;</gr>'+ list.ip +'<gr>&ensp;&raquo;&ensp;'+ list.gateway +'</gr></li>';
					} else {
						htmlwl += '<gr>Access point&ensp;&laquo;&ensp;</gr>'+ G.hostapd.hostapdip +'</li>';
					}
				} else {
					htmlwl += '<li class="wl notconnected" data-ssid="'+ list.ssid +'"><i class="fa fa-wifi"></i><gr>•&ensp;</gr>'+ list.ssid +'</li>';
				}
			} );
		}
		$( '#listwl' ).html( htmlwl );
		$( '#divwl' ).removeClass( 'hide' );
	} else {
		$( '#divwl' ).addClass( 'hide' );
	}
	if ( G.activeeth ) {
		var htmlwl = G.listeth ? '<li data-ip="'+ G.listeth.ip +'"><i class="fa fa-lan"></i><grn>•</grn>&ensp;'+ G.listeth.ip +'</li>' : '';
		$( '#listlan' ).html( htmlwl );
		$( '#lanadd' ).toggleClass( 'hide', G.listeth !== false );
		$( '#divlan' ).removeClass( 'hide' );
	} else {
		$( '#divlan' ).addClass( 'hide' );
	}
	$( '#divaccesspoint' ).toggleClass( 'hide', !G.hostapd );
	renderQR();
	showContent();
}
function qr( msg ) {
	return new QRCode( {
		  msg : msg
		, dim : 130
		, pad : 0
	} );
}
function renderQR() {
	var ip = G.listeth ? G.listeth.ip : G.listwl.ip;
	if ( !ip ) return
	
	if ( ip && ip !== G.hostapd.ip ) {
		$( '#qrwebui' ).html( qr( 'http://'+ ip ) );
		if( G.hostname ) ip += '<br><gr>http://</gr>'+ G.hostname +'.local';
		$( '#ipwebui' ).html( ip );
		$( '#divwebui' ).removeClass( 'hide' );
	} else {
		$( '#divwebui' ).addClass( 'hide' );
	}
	if ( G.hostapd ) {
		$( '#ipwebuiap' ).html( 'Web User Interface<br>http://<wh>'+ G.hostapd.ip +'</wh>' );
		$( '#ssid' ).text( G.hostapd.ssid );
		$( '#passphrase' ).text( G.hostapd.passphrase )
		$( '#qraccesspoint' ).html( qr( 'WIFI:S:'+ G.hostapd.ssid +';T:WPA;P:'+ G.hostapd.passphrase +';' ) );
		$( '#qrwebuiap' ).html( qr( 'http://'+ G.hostapd.ip ) );
		$( '#boxqr' ).removeClass( 'hide' );
	} else {
		$( '#ipwebuiap, #ssid, #passphrase, #qraccesspoint, #qrwebuiap' ).empty();
		$( '#boxqr' ).addClass( 'hide' );
	}
}
function scanBluetooth() {
	bash( '/srv/http/bash/networks-scanbt.sh', function( data ) {
		if ( data ) {
			G.listbtscan = data;
			var htmlbt = '';
			data.forEach( function( list ) {
				htmlbt += '<li class="btscan"><i class="fa fa-bluetooth"></i>';
				if ( list.connected ) htmlbt += '<grn>•&ensp;</grn>';
				htmlbt += '<a class="liname wh">'+ list.name +'</a>';
				if ( list.paired && !list.connected ) htmlbt += '&ensp;<i class="fa fa-save-circle wh"></i>';
				htmlbt += '</li>';
			} );
			$( '#listbtscan' ).html( htmlbt );
		}
		G.timeoutScan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( '/srv/http/bash/networks-scanwlan.sh', function( data ) {
		if ( data ) {
			G.listwlscan = data;
			var htmlwl = '';
			G.listwlscan.forEach( function( list ) {
				var signal = list.dbm > -60 ? '' : ( list.dbm < -67 ? 1 : 2 );
				htmlwl += '<li class="wlscan"><i class="fa fa-wifi'+ signal +'"></i>';
				if ( list.connected ) htmlwl += '<grn>•</grn>&ensp;';
				htmlwl += list.dbm < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' <i class="fa fa-lock"></i>';
				htmlwl += '<gr>'+ list.dbm +' dBm</gr>';
				if ( list.profile && !list.connected ) htmlwl += '&ensp;<i class="fa fa-save-circle wh"></i>';
				htmlwl += '</li>';
			} );
		} else {
			var htmlwl = '<li><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwlscan' ).html( htmlwl );
		G.timeoutScan = setTimeout( scanWlan, 12000 );
	}, 'json' );
}
function wlanStatus() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divwifi' ).removeClass( 'hide' );
	scanWlan();
}
