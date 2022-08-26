$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var accesspoint = $( '#accesspoint' ).length;
$( '.container' ).click( function( e ) {
	if ( $( e.target ).parents( '#listbt, #listlan, #listwl' ).length ) return
	
	$( '#menu' ).addClass( 'hide' );
	$( 'li' ).removeClass( 'active' );
} );
$( '.back' ).click( function() {
	clearTimeout( G.timeoutScan );
	$( '#divinterface' ).removeClass( 'hide' );
	$( '#divbluetooth, #divwifi, #divwebui' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	refreshData();
} );
$( '#btscan' ).click( function() {
	if ( $( this ).hasClass( 'disabled' ) ) {
		info( {
			  icon    : 'bluetooth'
			, title   : 'Bluetooth'
			, message : '<wh>DSP</wh> is currently enabled.'
		} );
		return
	}
	
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	scanBluetooth();
} );
$( '#listbtscan' ).on( 'click', 'li', function() {
	var list = G.listbtscan[ $( this ).index() ];
	if ( list.connected ) return
	
	notify( 'Bluetooth', 'Pair ...', 'bluetooth' );
	bluetoothcommand( 'pair', list );
} );
$( '#wladd' ).click( function() {
	G.hostapd ? infoAccesspoint() : infoWiFi();
} );
$( '#wlscan' ).click( function() {
	G.hostapd ? infoAccesspoint() : wlanStatus();
} );
$( '#lanadd' ).click( function() {
	info( {
		  icon          : 'lan'
		, title         : 'New LAN Connection'
		, textlabel     : [ 'IP', 'Gateway' ]
		, focus         : 0
		, ok           : function() {
			editLANSet( infoVal() );
		}
	} );
} );
$( '#listbt, #listlan, #listwl' ).on( 'click', 'li', function() {
	G.li = $( this );
	G.liindex = G.li.index();
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
		$( '#menu' ).find( '.forget, .info' ).removeClass( 'hide' );
		var list = G.listbt[ G.liindex ];
		$( '#menu .connect' ).toggleClass( 'hide', list.connected );
		$( '#menu .disconnect' ).toggleClass( 'hide', !list.connected );
	} else if ( G.list === 'listlan' ) {
		$( '#menu a' ).addClass( 'hide' );
		$( '#menu .edit' ).removeClass( 'hide' );
	} else {
		var notconnected = G.li.hasClass( 'notconnected' );
		$( '#menu a' ).removeClass( 'hide' );
		$( '#menu .connect' ).toggleClass( 'hide', !notconnected );
		$( '#menu .disconnect' ).toggleClass( 'hide', notconnected );
		$( '#menu .info' ).addClass( 'hide' );
	}
	var menuH = $menu.height();
	$menu
		.removeClass( 'hide' )
		.css( 'top', G.li.position().top + 48 );
	var targetB = $menu.offset().top + menuH;
	var wH = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '.connect' ).click( function() {
	clearTimeout( G.timeoutScan );
	if ( G.list === 'listbt' ) {
		var list = G.listbt[ G.liindex ];
		notify( list.name, 'Connect ...', list.type === 'Source' ? 'btsender' : 'bluetooth', -1 );
		bluetoothcommand( 'connect', list );
		return
	}
	
	if ( G.hostapd ) {
		infoAccesspoint();
		return
	}
	
	var name = G.li.data( 'ssid' );
	notify( name, 'Connect ...', 'wifi blink' );
	bash( [ 'profileconnect', name ] );
} );
$( '.disconnect' ).click( function() {
	if ( G.list === 'listbt' ) {
		var list = G.listbt[ G.liindex ];
		bluetoothcommand( 'disconnect', list );
		return
	}
	
	var list = G.listwl[ G.liindex ];
	var name = list.ssid;
	var icon = 'wifi';
	info( {
		  icon    : icon
		, title   : name
		, message : G.listeth ? '' : '<i class="fa fa-warning"></i> No network connections after this.'
		, oklabel : '<i class="fa fa-times"></i>Disconnect'
		, okcolor : orange
		, ok      : function() {
			notify( name, 'Disconnect ...', icon );
			bash( [ 'disconnect' ] )
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
		info( {
			  icon    : list.type === 'Source' ? 'btsender' : 'bluetooth'
			, title   : list.name
			, message : G.listeth ? '' : '<i class="fa fa-warning"></i> No network connections after this.'
			, oklabel : '<i class="fa fa-minus-circle"></i>Forget'
			, okcolor : red
			, ok      : function() {
				notify( list.name, 'Forget ...', 'bluetooth' );
				bluetoothcommand( 'remove', list );
			}
		} );
		return
	}
	
	var ssid = G.li.data( 'ssid' );
	var connected = G.listwl[ G.li.index() ].ip ? true : false;
	info( {
		  icon    : 'wifi'
		, title   : ssid
		, message : G.ipeth || G.ipwlan ? '' : '<i class="fa fa-warning wh"></i> Current Web interface will be dropped.'
		, oklabel : '<i class="fa fa-minus-circle"></i>Forget'
		, okcolor : red
		, ok      : function() {
			notify( ssid, 'Forget ...', 'wifi' );
			bash( [ 'profileremove', ssid, connected ] );
		}
	} );
} );
$( '.info' ).click( function() {
	if ( !$( '#codebluetooth' ).hasClass( 'hide' ) ) {
		$( '#codebluetooth' ).addClass( 'hide' );
	} else {
		var list = G.listbt[ G.li.index() ]
		infoBluetooth( list.mac );
	}
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var list = G.listwlscan[ $( this ).index() ];
	var ssid = list.ssid;
	var data = {
		  ESSID     : ssid
		, IP        : 'dhcp'
	}
	if ( list.profile ) {
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
	} else {
		if ( list.encrypt ) {
			info( {
				  icon          : 'wifi'
				, title         : ssid
				, passwordlabel : 'Password'
				, focus         : 0
				, oklabel       : 'Connect'
				, ok            : function() {
					data.Security = 'wpa' in list ? 'wpa' : 'wep';
					data.Key      = infoVal();
					connectWiFi( data );
				}
			} );
		} else {
			connectWiFi( data );
		}
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

function bluetoothcommand( cmd, list ) {
	bash( '/srv/http/bash/bluetoothcommand.sh '+ cmd +' '+ list.mac +' '+ list.type +' "'+ list.name +'"' );
}
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
	var ip = G.ipeth;
	var gw = G.listeth.gateway;
	info( {
		  icon         : 'lan'
		, title        : 'Edit LAN Connection'
		, textlabel    : [ ( static ? '<gr>Static</gr> IP' : '<gr>DHCP</gr> IP' ), 'Gateway' ]
		, focus        : 0
		, values       : [ ip, gw ]
		, checkchanged : 1
		, checkblank   : 1
		, beforeshow   : function() {
			if ( !static ) {
				$( '#infoContent input' ).eq( 0 ).on( 'keyup paste cut', function() {
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
		infoWiFi( values );
	}, 'json' );
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Access Point is currently active.'
	} );
}
function infoBluetooth( mac ) {
	bash( [ 'bluetoothinfo', mac ], function( data ) {
		if ( !data ) {
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
function infoWiFi( values ) {
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
		, focus         : 0
		, boxwidth      : 180
		, checkbox      : [ 'Static IP', 'Hidden SSID', 'WEP' ]
		, passwordlabel : 'Password'
		, values        : values
		, checkchanged  : add ? 0 : 1
		, checkblank    : add ? 0 : 1
		, beforeshow    : function() {
			var $static = $( '#infoContent' ).find( 'tr:eq( 1 ), tr:eq( 2 )' );
			$static.toggleClass( 'hide', !values[ 4 ] );
			$( '#infoContent input:checkbox' ).eq( 0 ).change( function() {
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
function renderBluetooth() {
	if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) $( '#divbluetooth .back' ).click();
	if ( G.listbt ) {
		var htmlbt = '';
		G.listbt.forEach( function( list ) {
			var dot = list.connected ? '<grn>•</grn>' : '<gr>•</gr>';
			htmlbt += '<li class="bt"><i class="fa fa-'+ ( list.type === 'Source' ? 'btsender' : 'bluetooth' ) +'"></i>'+ dot +'&ensp;'+ list.name +'</li>';
		} );
		$( '#listbt' ).html( htmlbt );
	} else {
		$( '#listbt' ).empty();
	}
	if ( !$( '#codebluetooth' ).hasClass( 'hide' ) ) {
		var mac = $( '#codebluetooth' ).data( 'mac' );
		infoBluetooth( mac );
	}
}
function renderPage() {
	$( '#btscan' ).toggleClass( 'disabled', G.camilladsp );
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
				if ( list.ip ) {
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
			$( '#listwl' ).html( htmlwl );
		} else {
			$( '#listwl' ).empty();
		}
		$( '#divwl' ).removeClass( 'hide' );
	} else {
		$( '#divwl' ).addClass( 'hide' );
	}
	if ( G.activeeth ) {
		var htmlwl = G.listeth ? '<li data-ip="'+ G.ipeth +'"><i class="fa fa-lan"></i><grn>•</grn>&ensp;'+ G.ipeth +'</li>' : '';
		$( '#listlan' ).html( htmlwl );
		$( '#lanadd' ).toggleClass( 'hide', G.listeth !== false );
		$( '#divlan' ).removeClass( 'hide' );
	} else {
		$( '#divlan' ).addClass( 'hide' );
	}
	$( '#divaccesspoint' ).toggleClass( 'hide', !G.hostapd );
	if ( !$( '#divinterface' ).hasClass( 'hide' ) ) renderQR();
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
	var ip = G.ipeth || G.ipwlan;
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
	bash( '/srv/http/bash/settings/networks-scan.sh', function( data ) {
		if ( data ) {
			G.listbtscan = data;
			var htmlbt = '';
			data.forEach( function( list ) {
				htmlbt += '<li class="btscan"><i class="fa fa-bluetooth"></i><a class="liname wh">'+ list.name +'</a></li>';
			} );
			$( '#listbtscan' ).html( htmlbt );
		}
		G.timeoutScan = setTimeout( scanBluetooth, 12000 );
	}, 'json' );
}
function scanWlan() {
	bash( '/srv/http/bash/settings/networks-scan.sh wlan', function( data ) {
		if ( data ) {
			var signals = '';
			data.forEach( function( list, i, obj ) {
				if ( !list.ssid ) { // remove blank ssid
					obj.splice( i, 1 );
					return
				}
				
				if ( list.signal != 0 ) signals += list.signal;
			} );
			data.sort( function( a, b ) {
				if ( signals ) {
					var ab = signals.includes( 'dBm' ) ? [ a.signal, b.signal ] : [ b.signal, a.signal ];
				} else {
					var ab = [ a.ssid, b.ssid ];
				}
				return  ab[ 0 ].localeCompare( ab[ 1 ] )
			} );
			G.listwlscan = data;
			var htmlwl = '';
			data.forEach( function( list, i ) {
				if ( 'profile' in list ) return
				
				if ( list.signal.slice( -3 ) === 'dBm' ) {
					var dbm = parseInt( list.signal.slice( 0, -4 ) );
					var signal = dbm > -60 ? '' : ( dbm < -67 ? 1 : 2 );
				} else {
					var dbm = '';
					var signal = '';
				}
				htmlwl += '<li class="wlscan"><i class="fa fa-wifi'+ signal +'"></i>';
				if ( list.connected ) htmlwl += '<grn>•</grn>&ensp;';
				htmlwl += dbm && dbm < -67 ? '<gr>'+ list.ssid +'</gr>' : list.ssid;
				if ( list.encrypt === 'on') htmlwl += ' <i class="fa fa-lock"></i>';
				if ( list.signal != 0 ) htmlwl += '<gr>'+ list.signal +'</gr>';
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
