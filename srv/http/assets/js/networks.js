$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function btRender( data ) {
	var dot;
	var html = '';
	data.forEach( function( list ) {
		html += '<li data-mac="'+ list.mac +'" data-connected="'+ list.connected +'"><i class="fa fa-bluetooth"></i>'
				+ ( list.connected  ? '<grn>&bull;&ensp;</grn>' : ( list.paired ? '<gr>&bull;&ensp;</gr>' : '' ) )
				+'<a class="liname wh">'+ list.name +'</a>';
				+'</li>';
	} );
	$( '#listbtscan' ).html( html );
}
function btScan() {
	bash( '/srv/http/bash/networks-scanbt.sh', function( data ) {
		if ( data.length ) btRender( data );
		intervalscan = setTimeout( btScan, 12000 );
	}, 'json' );
}
function connect( data ) { // [ ssid, wpa, password, hidden, ip, gw ]
	clearTimeout( intervalscan );
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
		}
	} );
}
function editLAN( data ) {
	var data0 = data;
	var message = data.ip ? 'Current: <wh>'+ ( data.dhcp === 'dhcp' ? 'DHCP' : 'Static IP' ) +'</wh><br>&nbsp;' : '';
	info( {
		  icon         : 'lan'
		, title        : ( data.ip ? 'LAN' : 'Add LAN' )
		, message      : message
		, textlabel    : [ 'IP', 'Gateway' ]
		, textvalue    : [ data.ip, data.gateway ]
		, textrequired : [ 0 ]
		, preshow      : function() {
			if ( data.dhcp === 'dhcp' || !data.ip ) $( '#infoButton' ).addClass( 'hide' );
			if ( data.ip ) {
				$( '#infoOk' ).addClass( 'disabled' );
				// verify
				$( '#infoTextBox, #infoTextBox1' ).keyup( function() {
					var ip = $( '#infoTextBox' ).val();
					var changed = ip !== data.ip || $( '#infoTextBox1' ).val() !== data.gateway;
					$( '#infoOk' ).toggleClass( 'disabled', !changed || !validateIP( ip ) );
				} );
			}
		}
		, buttonlabel  : '<i class="fa fa-undo"></i>DHCP'
		, buttonwidth  : 1
		, button       : function() {
			notify( 'LAN IP Address', 'Change URL to '+ G.hostname +'.local ...', 'lan' );
			loader();
			location.href = 'http://'+ G.hostname +'.local/settings.php?p=networks';
			bash( [ 'editlan' ] );
		}
		, ok           : function() {
			var data1 = {}
			data1.ip = $( '#infoTextBox' ).val();
			data1.gateway = $( '#infoTextBox1' ).val();
			if ( data1.ip === data.ip && data1.gateway === data.gateway ) return
			
			notify( 'LAN IP Address', 'Change ip to '+ data1.ip, 'lan' );
			bash( [ 'editlan', data1.ip, data1.gateway ], function( used ) {
				if ( used == -1 ) {
					info( {
						  icon    : 'lan'
						, title   : 'Duplicate IP'
						, message : 'IP <wh>'+ data1.ip +'</wh> already in use.'
						, ok      : function() {
							editLAN( data0 );
						}
					} );
				}
				bannerHide();
			} );
			
		}
	} );
}
function editWiFi( ssid, data ) {
	if ( data ) data.Hidden = 'Hidden' in data ? true : false;
	var existing = data;
	var newval;
	info( {
		  icon          : ssid ? 'edit-circle' : 'wifi'
		, title         : ssid ? 'Edit Saved Connection' : 'New Wi-Fi Connection'
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, checkbox      : { 'Static IP': 1, 'Hidden SSID': 1, 'WEP': 1 }
		, passwordlabel : 'Password'
		, preshow       : function() {
			function verify() {
				var Key = $( '#infoPasswordBox' ).val();
				var Address = $( '#infoTextBox1' ).val();
				var Gateway = $( '#infoTextBox2' ).val();
				if ( Key.length < 8 || !validateIP( Address ) || !validateIP( Gateway ) ) {
					$( '#infoOk' ).toggleClass( 'disabled', true );
					return
				}
				
				newval = {
					  Interface : G.wlcurrent
					, ESSID     : $( '#infoTextBox' ).val()
					, Key       : Key
					, IP        : ( $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' ) ? 'static' : 'dhcp' )
					, Hidden    : $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' )
					, Security  : ( $( '#infoCheckBox input:eq( 2 )' ).prop( 'checked' ) ? 'wep' : 'wpa' )
				}
				if ( newval.IP === 'static' ) {
					newval.Address = $( '#infoTextBox1' ).val();
					newval.Gateway = $( '#infoTextBox2' ).val();
				}
				var changed = false;
				if ( !ssid || newval.length !== existing.length ) {
					changed = true;
				} else {
					for ( key in newval ) {
						if ( newval[ key ] !== existing[ key ] ) {
							changed = true;
							break;
						}
					}
				}
				$( '#infoOk' ).toggleClass( 'disabled', !changed );
			}
			
			if ( !ssid ) {
				$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).hide();
			} else {
				if ( existing ) {
					editWiFiSet( ssid, existing );
				} else {
					bash( [ 'profileget', ssid ], function( data ) {
						data.Address = 'Address' in data ? data.Address.replace( '/24', '' ) : '';
						data.Hidden = 'Hidden' in data ? true : false;
						existing = data;
						editWiFiSet( ssid, existing );
					}, 'json' );
				}
			}
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoCheckBox' ).on( 'click', 'input:eq( 0 )', function() {
				$( '.infolabel:eq( 1 ), .infolabel:eq( 2 ), #infoTextBox1, #infoTextBox2' ).toggle( $( this ).prop( 'checked' ) );
			} );
			// verify
			$( '.infoinput' ).keyup( verify );
			$( '#infoCheckBox' ).click( verify );
		}
		, ok            : function() {
			if ( newval.IP === 'dhcp' ) {
				connect( newval );
			} else {
				bash( 'ping -c 1 -w 1 '+ newval.Address +' &> /dev/null && echo -1', function( std ) {
					if ( std == -1 ) {
						info( {
							  icon    : 'wifi'
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ newval.Address +'</wh> already in use.'
							, ok      : function() {
								editWiFi( ssid, newval );
							}
						} );
					} else {
						connect( newval );
					}
				} );
			}
		}
	} );
}
function editWiFiSet( ssid, data ) {
	var static = data.IP === 'static';
	$( '#infoMessage' ).html(
		 '<i class="fa fa-wifi"></i>&ensp;<wh>'+ ssid +'</wh>'
		+'<br>Current: <wh>'+ ( static ? 'Static IP' : 'DHCP' ) +'</wh><br>&nbsp;'
	).css( 'text-align', 'center' );
	$( '#infoPasswordBox' ).val( data.Key );
	$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', static );
	$( '#infoCheckBox input:eq( 2 )' ).prop( 'checked', data.Security === 'wep' );
	$( '#infoTextBox' )
		.val( ssid )
		.prop( 'disabled', 1 );
	if ( data.Address ) {
		$( '#infoFooter' ).hide();
	} else {
		$( '#infoFooter' ).html( '<br>*Connect to get DHCP IPs' );
	}
	if ( static ) {
		$( '#infoTextBox1' ).val( data.Address );
		$( '#infoTextBox2' ).val( data.Gateway );
	} else {
		$( '.infolabel:eq( 1 ), .infolabel:eq( 2 ), #infoTextBox1, #infoTextBox2' ).hide();
	}
}
function infoAccesspoint() {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'RPi Access Point must be disabled.'
	} );
}
function infoConnect( $this ) {
	var connected = $this.data( 'ip' );
	var ssid = $this.data( 'ssid' );
	var ip = $this.data( 'ip' );
	var gw = $this.data( 'gateway' );
	var wpa = $this.data( 'wpa' );
	var dhcp = $this.data( 'dhcp' );
	var encrypt = $this.data( 'encrypt' ) === 'on';
	var password = $this.data( 'password' );
	var profile = $this.data( 'profile' );
	info( {
		  icon        : 'wifi'
		, title       : ssid
		, message     : !ip ? 'Saved connection' : '<div class="colL">'
				+ ( dhcp === 'dhcp' ? 'DHCP IP' : 'Static IP' ) +'<br>'
				+'Gateway'
			+'</div>'
			+'<div class="colR wh" style="text-align: left;">'
				+ ip +'<br>'
				+ gw
			+'</div>'
		, preshow     : function() {
			if ( profile ) $( '#infoButton1' ).hide();
		}
		, buttonwidth : 1
		, buttonlabel : [
			  '<i class="fa fa-minus-circle"></i> Forget'
			, '<i class="fa fa-edit-circle"></i> Edit'
		]
		, buttoncolor : [
			  '#bb2828'
			, ''
		]
		, button      : [
			  function() {
				clearTimeout( intervalscan );
				notify( ssid, 'Forget ...', 'wifi' );
				bash( [ 'profileremove', G.wlcurrent, ssid ] );
			}
			, function() {
				if ( ip ) {
					bash( [ 'profileget', ssid ], function( data ) {
						if ( 'Address' in data ) data.Address = data.Address.slice( 0, -3 );
						data.Hidden = 'Hidden' in data ? true : false;
						editWiFi( ssid, data );
					}, 'json' );
				} else {
					editWiFi( ssid );
				}
			}
		]
		, oklabel : connected ? 'Disconnect' : 'Connect'
		, okcolor : connected ? '#de810e' : ''
		, ok      : function() {
			clearTimeout( intervalscan );
			notify( ssid, connected ? 'Disconnect ...' : 'Connect ...', 'wifi blink' );
			if ( connected ) {
				bash( [ 'disconnect', G.wlcurrent ] );
			} else {
				bash( [ 'profileconnect', G.wlcurrent, ssid ] );
			}
		}
	} );
}
function nicsStatus() {
	bash( '/srv/http/bash/networks-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		if ( G.hostapd ) {
			$( '#ssid' ).text( G.hostapd.ssid );
			$( '#passphrase' ).text( G.hostapd.passphrase )
			$( '#ipwebuiap' ).text( G.hostapd.hostapdip );
		}
		var htmlbt = '';
		var htmllan = '';
		var htmlwl = '';
		var html = '';
		if ( G.bluetooth ) {
			G.bluetooth.forEach( function( list ) {
				htmlbt += '<li class="bt" data-name="'+ list.name +'" data-connected="'+ list.connected +'" data-mac="'+ list.mac +'"><i class="fa fa-bluetooth"></i>';
				htmlbt += ( list.connected ? '<grn>&bull;</grn>&ensp;' : '<gr>&bull;</gr>&ensp;' ) + list.name +'</li>';
			} );
			$( '#ifconfig' ).next().find( 'code' ).text( 'ifconfig; bluetoothctl show' );
		}
		$.each( G.list, function( i, val ) {
			html = '<li class="'+ val.interface +'"';
			html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
			html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
			html += val.hostname ? ' data-hostname="'+ val.hostname +'"' : '';
			html += ' data-dhcp="'+ val.dhcp +'"';
			html += 'ssid' in val ? ' data-ssid="'+ val.ssid +'"' : '';
			if ( val.interface === 'eth0' ) {
				if ( !val.ip ) return
				
				htmllan = html +'><i class="fa fa-networks"></i>';
				htmllan += val.ip ? '<grn>&bull;</grn>&ensp;'+ val.ip : '';
				htmllan += val.gateway ? '<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;</gr>' : '';
				htmllan += '</li>';
			} else if ( val.interface.slice( 0, 4 ) === 'wlan' ) {
				if ( !val.ip && !G.hostapd.hostapdip ) return
				
				G.wlcurrent = val.interface;
				htmlwl = html +'><i class="fa fa-wifi"></i>';
				if ( G.hostapd.ssid ) {
					htmlwl += '<grn>&bull;</grn>&ensp;<gr>rAudio access point&ensp;&laquo;&ensp;</gr>'+ G.hostapd.hostapdip
				} else {
					G.wlconnected = val.interface;
					htmlwl += '<grn>&bull;</grn>&ensp;'+ val.ssid +'<gr>&ensp;&bull;&ensp;</gr>'+ val.ip +'<gr>&ensp;&raquo;&ensp;'+ val.gateway +'</gr>';
				}
				htmlwl += '</li>';
			}
		} );
		if ( G.profiles ) {
			var htmlprofile = '';
			G.profiles.forEach( function( val ) {
				if ( val[ 0 ] === '*' ) {
					var connected = '&ensp;<grn>&bull;</grn>';
					var ssid = val.slice( 1 );
				} else {
					var connected = '';
					var ssid = val;
				}
				htmlwl += '<li data-ssid="'+ ssid +'"><i class="fa fa-wifi"></i><gr>&bull;&ensp;</gr>'+ ssid +'</li>';
			} );
		}
		if ( !G.wlcurrent ) G.wlcurrent = 'wlan0';
		$( '#listbt' ).html( htmlbt );
		$( '#listlan' ).html( htmllan );
		$( '#listwl' ).html( htmlwl );
		var active = $( '#listbt grn' ).length > 0;
		$( '#headbt' )
			.toggleClass( 'noline', htmlbt !== '' )
			.toggleClass( 'status', active );
		$( '#headbt .fa-code' ).toggleClass( 'hide', !active );
		$( '#headlan' ).toggleClass( 'noline', htmllan !== '' );
		$( '#lanadd' ).toggleClass( 'hide', htmllan !== '' );
		$( '#headwl' ).toggleClass( 'noline', htmlwl !== '' );
		if ( $( '#divinterface' ).hasClass( 'hide' ) ) return
		
		renderQR();
		bannerHide();
		[ 'bt', 'lan', 'wlan' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		showContent();
	} );
}
function qr( msg ) {
	return new QRCode( {
		  msg : msg
		, dim : 130
		, pad : 0
	} );
}
function renderQR() {
	$( 'li' ).each( function() {
		var ip = $( this ).data( 'ip' );
		var gateway = $( this ).data( 'gateway' );
		var hostname = $( this ).data( 'hostname' );
		if ( ip && gateway ) {
			$( '#qrwebui' ).html( qr( 'http://'+ ip ) );
			if( hostname ) ip += '<br><gr>http://</gr>'+ hostname;
			$( '#ipwebui' ).html( ip );
			$( '#divwebui' ).removeClass( 'hide' );
			return false
		}
	} );
	$( '#qraccesspoint' ).html( qr( 'WIFI:S:'+ G.ssid +';T:WPA;P:'+ G.passphrase +';' ) );
	$( '#qrwebuiap' ).html( qr( 'http://'+ G.hostapdip ) );
	$( '#boxqr' ).removeClass( 'hide' );
}
function wlanScan() {
	bash( '/srv/http/bash/networks-scanwlan.sh '+ G.wlcurrent, function( list ) {
		var good = -60;
		var fair = -67;
		var html = '';
		if ( list.length ) {
			$.each( list, function( i, val ) {
				var profile = val.profile;
				html += '<li data-db="'+ val.dbm +'" data-ssid="'+ val.ssid +'" data-encrypt="'+ val.encrypt +'" data-wpa="'+ val.wpa +'"';
				html += val.connected  ? ' data-connected="1"' : '';
				html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
				html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
				html += ' data-dhcp="'+ val.dhcp +'"';
				html += val.password ? ' data-password="'+ val.password +'"' : '';
				html += profile ? ' data-profile="'+ profile +'">' : '>';
				var signal = val.dbm > good ? 3 : ( val.dbm < fair ? 1 : 2 );
				html += '<span class="wf'+ signal +'"><i class="fa fa-wifi1"></i><i class="fa fa-wifi2"></i><i class="fa fa-wifi3"></i></span>'
				html += val.connected ? '<grn>&bull;</grn>&ensp;' : '';
				html += val.dbm < fair ? '<gr>'+ val.ssid +'</gr>' : val.ssid;
				html += val.encrypt === 'on' ? ' <i class="fa fa-lock"></i>' : '';
				html += '<gr>'+ val.dbm +' dBm</gr>';
				html += profile && !val.connected ? '&ensp;<i class="fa fa-save-circle wh"></i>' : '';
			} );
		} else {
			html += '<li><i class="fa fa-lock"></i><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwlscan' ).html( html +'</li>' );
		intervalscan = setTimeout( wlanScan, 12000 );
	}, 'json' );
}
function wlanStatus() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divwifi' ).removeClass( 'hide' );
	wlanScan();
}

refreshData = function() {
	if ( !$( '#divwifi' ).hasClass( 'hide' ) ) {
		wlanStatus();
	} else if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) {
		btScan();
	} else {
		nicsStatus();
	}
	resetLocal();
}
refreshData();
//---------------------------------------------------------------------------------------
var accesspoint = $( '#accesspoint' ).length;
$( '.back' ).click( function() {
	G.wlcurrent = '';
	clearTimeout( intervalscan );
	$( '#divinterface, #divwebui, #divaccesspoint' ).removeClass( 'hide' );
	$( '#divwifi, #divbluetooth' ).addClass( 'hide' );
	$( '#listwlscan, #listbtscan' ).empty();
	nicsStatus();
} );
$( '#listbt' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	var connected = $this.data( 'connected' );
	if ( $( e.target ).is( 'i' ) && connected ) {
		status( 'bt', 'bluetoothctl info' );
		return
	}
	
	var name = $this.data( 'name' );
	var mac = $this.data( 'mac' );
	info( {
		  icon    : 'bluetooth'
		, title   : 'Bluetooth'
		, message : name
		, preshow : function() {
			if ( !connected ) $( '#infoOk' ).addClass( 'hide' );
		}
		, buttonwidth : 1
		, buttonlabel : '<i class="fa fa-minus-circle"></i>Forget'
		, buttoncolor : '#bb2828'
		, button      : function() {
			notify( name, 'Forget ... ', 'bluetooth' );
			bash( "/srv/http/bash/networks.sh btremove$'\n'"+ mac );
		}
		, oklabel : 'Disconnect'
		, okcolor : '#de810e'
		, ok      : function() {
			notify( name, 'Disconnect ... ', 'bluetooth' );
			bash( '/srv/http/bash/networks.sh btdisconnect' );
		}
	} );
} );
$( '#btscan' ).click( function() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	btScan();
} );
$( '#listbtscan' ).on( 'click', 'li', function() {
	$this = $( this );
	var mac = $this.data( 'mac' );
	var name = '<wh>'+ $this.find( '.liname' ).text() +'</wh>';
	if ( !$this.data( 'connected' ) ) {
		notify( 'Bluetooth', 'Pair ...', 'bluetooth' );
		bash( [ 'btpair', mac ], function( data ) {
			bannerHide();
			if ( data != -1 ) {
				$( '.back' ).click();
			} else {
				info( {
					  icon      : 'bluetooth'
					, title     : 'Bluetooth'
					, message   : 'Pair '+ name +' failed'
				} );
			}
		} );
	}
} );
$( '#lanadd' ).click( function() {
	editLAN( { dhcp: '', ip: '', gateway: '' } );
} );
$( '#listlan' ).on( 'click', 'li', function() {
	var $this = $( this );
	if ( !$this.data( 'ip' ) ) return
	
	editLAN( {
		  ip      : $this.data( 'ip' ) || ''
		, gateway : $this.data( 'gateway' ) || ''
		, dhcp    : $this.data( 'dhcp' )
	} );
	$( '#infoCheckBox' ).on( 'click', 'input', function() {
		$( '#infoText' ).toggle( $( this ).prop( 'checked' ) );
	} );
} );
$( '#wladd' ).click( function() {
	'ssid' in G ? infoAccesspoint() : editWiFi();
} );
$( '#wlscan' ).click( function() {
	'ssid' in G ? infoAccesspoint() : wlanStatus();
} );
$( '#listwl' ).on( 'click', 'li', function() {
	if ( !( 'ssid' in G ) ) infoConnect( $( this ) );
} );
$( '#listwlscan' ).on( 'click', 'li', function() {
	var $this = $( this );
	var connected = $this.data( 'connected' );
	var profile = $this.data( 'profile' ) || connected;
	var ssid = $this.data( 'ssid' );
	var wpa = $this.data( 'wpa' ) || 'wep';
	var encrypt = $this.data( 'encrypt' ) === 'on';
	var vals = {
		  Interface : G.wlcurrent
		, ESSID     : ssid
		, IP        : 'dhcp'
	}
	if ( !profile ) {
		if ( encrypt ) {
			info( {
				  icon          : 'wifi'
				, title         : ssid
				, passwordlabel : 'Password'
				, oklabel       : 'Connect'
				, ok            : function() {
					vals.Security = wpa;
					vals.Key      = $( '#infoPasswordBox' ).val();
					connect( vals );
				}
			} );
		} else {
			connect( vals );
		}
	} else {
		infoConnect( $this );
	}
} );
$( '#setting-accesspoint' ).click( function() {
	location.href = 'settings.php?p=features&set=setting-hostapd';
} );

} );
