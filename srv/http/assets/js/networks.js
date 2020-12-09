$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function btRender( data ) {
	var html = '';
	data.forEach( function( list ) {
		html += '<li data-mac="'+ list.mac +'" data-connected="'+ list.connected +'"><i class="fa fa-bluetooth"></i>'
				+ ( list.connected ? '<grn>&bull;&ensp;</grn>' : '' )
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
function connect( data ) { // [ ssid, dhcp, wpa, password, hidden, ip, gw ]
	clearTimeout( intervalscan );
	var ssid = data [ 0 ];
	var ip = data[ 5 ];
	if ( ip ) {
		$( '#loader' ).removeClass( 'hide' );
		location.href = 'http://'+ ip +'/settings.php?p=network';
		var text = ip.slice( -5 ) === 'local' ? 'Change URL to ' : 'Change IP to ';
		notify( ssid, text + ip, 'wifi' );
	} else {
		notify( ssid, 'Connect ...', 'wifi' );
	}
	bash( [ 'connect', G.wlcurrent ].concat( data ), function( std ) {
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
				$( '#infoTextBox, #infoTextBox1' ).keyup( function() {
					var changed = $( '#infoTextBox' ).val() !== data.ip || $( '#infoTextBox1' ).val() !== data.gateway;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, buttonlabel  : '<i class="fa fa-undo"></i>DHCP'
		, buttonwidth  : 1
		, button       : function() {
			notify( 'LAN IP Address', 'Change URL to '+ G.hostname +'.local ...', 'lan' );
			$( '#loader' ).removeClass( 'hide' );
			location.href = 'http://'+ G.hostname +'.local/settings.php?p=network';
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
	var data0 = data;
	var icon = ssid ? 'edit-circle' : 'wifi';
	var title = ssid ? 'Wi-Fi IP' : 'Add Wi-Fi';
	info( {
		  icon          : icon
		, title         : title
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, checkbox      : { 'Static IP': 1, 'Hidden SSID': 1, 'WEP': 1 }
		, passwordlabel : 'Password'
		, preshow       : function() {
			if ( !ssid ) {
				$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).hide();
			} else {
				if ( data ) {
					editWiFiSet( ssid, data );
				} else {
					bash( [ 'statuswifi', ssid ], function( data ) {
						data.Address = 'Address' in data ? data.Address.replace( '/24', '' ) : '';
						editWiFiSet( ssid, data );
					}, 'json' );
				}
			}
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoTextBox1, #infoTextBox2' ).keyup( function() {
				var changed = $( '#infoTextBox1' ).val() !== data.Address || $( '#infoTextBox2' ).val() !== data.Gateway;
				$( '#infoOk' ).toggleClass( 'disabled', !changed );
			} );
		}
		, ok            : function() {
			var ssid = ssid || $( '#infoTextBox' ).val();
			var password = $( '#infoPasswordBox' ).val();
			var ip = $( '#infoTextBox1' ).val();
			var gw = $( '#infoTextBox2' ).val();
			var dhcp = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' ) ? 'static' : 'dhcp';
			var hidden = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' ) ? 'hidden' : '';
			var security = $( '#infoCheckBox input:eq( 2 )' ).prop( 'checked' ) ? 'wep' : 'wpa';
			// [ wlan, ssid, dhcp, wpa, password, hidden, ip, gw ]
			var data = [ ssid, dhcp ];
			if ( password ) {
				data.push( security, password, hidden );
			} else {
				data.push( '', '', hidden );
			}
			if ( dhcp === 'dhcp' ) {
				connect( data );
			} else {
				data.push( ip, gw );
				if ( ip === data0.Address ) {
					connect( data );
				} else {
					bash( [ 'ipused', ip ], function( used ) {
						if ( used == 1 ) {
							info( {
								  icon    : 'wifi'
								, title   : 'Duplicate IP'
								, message : 'IP <wh>'+ ip +'</wh> already in use.'
								, ok      : function() {
									editWiFi( ssid, data0 );
								}
							} );
						} else {
							connect( data );
						}
					} );
				}
			}
		}
	} );
	$( '#infoCheckBox' ).on( 'click', 'input:eq( 0 )', function() {
		$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).toggle( $( this ).prop( 'checked' ) );
	} );
}
function editWiFiSet( ssid, data ) {
	$( '#infoMessage' ).html(
		 '<i class="fa fa-wifi"></i>&ensp;<wh>'+ ssid +'</wh>'
		+'<br>Current: <wh>'+ ( data.dhcp === 'dhcp' ? 'DHCP' : 'Static IP' ) +'</wh><br>&nbsp;'
	).css( 'text-align', 'center' );
	$( '#infoTextBox1' ).val( data.Address );
	$( '#infoTextBox2' ).val( data.Gateway );
	$( '#infoPasswordBox' ).val( data.Key );
	$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', 1 );
	$( '#infoCheckBox input:eq( 2 )' ).prop( 'checked', data.Security === 'wep' );
	$( '#infoTextBox' ).val( ssid );
	$( '#infotextlabel a:eq( 0 ), #infoTextBox, #infotextlabel a:eq( 3 ), #infoPasswordBox, #infotextbox .eye, #infoCheckBox' ).hide();
	if ( data.Address ) {
		$( '#infoFooter' ).hide();
	} else {
		$( '#infoFooter' ).html( '<br>*Connect to get DHCP IPs' );
	}
	if ( data.dhcp === 'static' ) {
		$( '#infoOk' ).before( '<a id="infoButton" class="infobtn extrabtn infobtn-default"><i class="fa fa-undo"></i>DHCP</a>' );
		$( '#infoButton' ).click( function() {
			$( '#infoX' ).click();
			$( '#loader' ).removeClass( 'hide' );
			notify( ssid, 'DHCP ...', 'wifi' );
			location.href = 'http://'+ G.hostname +'.local/settings.php?p=network';
			bash( [ 'editwifidhcp', ssid ] );
		} );
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
	var wpa = $this.data( 'wpa' ) || 'wep';
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
			, '<i class="fa fa-edit-circle"></i> IP'
		]
		, buttoncolor : [
			  '#bb2828'
			, ''
		]
		, button      : [
			  function() {
				clearTimeout( intervalscan );
				notify( ssid, 'Forget ...', 'wifi' );
				bash( [ 'disconnect', G.wlcurrent, ssid ] );
			}
			, function() {
				if ( ip ) {
					var data = {
						  Address  : ip
						, Gateway  : gw
						, Security : wpa
						, Key      : password
						, dhcp     : dhcp
					}
					editWiFi( ssid, data );
				} else {
					editWiFi( ssid, 0 );
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
				connect( [ ssid ] );
			}
		}
	} );
}
function nicsStatus() {
	bash( '/srv/http/bash/networks-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		var extra = G.pop();
		if ( extra.hostapd ) {
			G.hostapd = extra.hostapd;
			$( '#ssid' ).text( G.hostapd.ssid );
			$( '#passphrase' ).text( G.hostapd.passphrase )
			$( '#ipwebuiap' ).text( G.hostapd.hostapdip );
		}
		G.reboot = extra.reboot ? extra.reboot.split( '\n' ) : [];
		if ( 'bluetooth' in extra ) G.bluetooth = extra.bluetooth;
		G.hostname = extra.hostname;
		var html = '';
		var htmllan = '';
		var htmlwl = '';
		var htmlbt = '';
		$.each( G, function( i, val ) {
			html = '<li class="'+ val.interface +'"';
			html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
			html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
			html += ' data-dhcp="'+ val.dhcp +'"';
			if ( 'ssid' in val ) html += ' data-ssid="'+ val.ssid +'"';
			html += '><i class="fa fa-';
			html += val.interface === 'eth0' ? 'lan"></i>' : 'wifi"></i>';
			if ( val.interface === 'eth0' ) {
				if ( !val.ip ) return
				
				htmllan = html;
				htmllan += val.ip ? '<grn>&bull;</grn>&ensp;'+ val.ip : '';
				htmllan += val.gateway ? '<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;</gr>' : '';
				htmllan += '</li>';
			} else if ( val.interface.slice( 0, 4 ) === 'wlan' ) {
				if ( !val.ip && !G.hostapd.hostapdip ) return
				
				G.wlcurrent = val.interface;
				htmlwl = html;
				if ( G.hostapd.ssid ) {
					htmlwl += '<grn>&bull;</grn>&ensp;<gr>RPi access point&ensp;&laquo;&ensp;</gr>'+ G.hostapd.hostapdip
				} else {
					G.wlconnected = val.interface;
					htmlwl += '<grn>&bull;</grn>&ensp;'+ val.ip +'<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;&bull;&ensp;</gr>'+ val.ssid;
				}
				htmlwl += '</li>';
			}
		} );
		if ( !G.wlcurrent ) G.wlcurrent = 'wlan0';
		if ( G.bluetooth ) {
			G.bluetooth.forEach( function( list ) {
				htmlbt += '<li class="bt" data-name="'+ list.name +'" data-connected="'+ list.connected +'" data-mac="'+ list.mac +'"><i class="fa fa-bluetooth"></i>';
				htmlbt += ( list.connected ? '<grn>&bull;</grn>&ensp;' : '<gr>&bull;</gr>&ensp;' ) + list.name +'</li>';
			} );
			$( '#ifconfig' ).next().find( 'code' ).text( 'ifconfig; bluetoothctl show' );
		}
		$( '#listlan' ).html( htmllan );
		$( '#listwl' ).html( htmlwl );
		$( '#listbt' ).html( htmlbt );
		$( '#lanadd' ).toggleClass( 'hide', htmllan !== '' );
		$( '#headlan' ).toggleClass( 'noline', htmllan !== '' );
		$( '#headwl' ).toggleClass( 'noline', htmlwl !== '' );
		$( '#headbt' ).toggleClass( 'noline', htmlbt !== '' );
		if ( $( '#divinterface' ).hasClass( 'hide' ) ) return
		
		renderQR();
		bannerHide();
		codeToggle( 'netctl', 'status' );
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
		if ( ip && gateway ) {
			$( '#ipwebui' ).text( ip );
			$( '#qrwebui' ).html( qr( 'http://'+ ip ) );
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
//				html += '<i class="fa fa-wifi-'+ ( val.dbm > good ? 3 : ( val.dbm < fair ? 1 : 2 ) ) +'"></i>';
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
$( '#lanadd' ).click( function() {
	editLAN( { dhcp: '', ip: '', gateway: '' } );
} );
$( '#listlan' ).on( 'click', 'li', function() {
	var $this = $( this );
	if ( !$this.find( 'grn' ).length ) return
	
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
	if ( !profile ) {
		if ( encrypt ) {
			info( {
				  icon          : 'wifi'
				, title         : ssid
				, passwordlabel : 'Password'
				, oklabel       : 'Connect'
				, ok            : function() {
					connect( [ ssid, 'dhcp', wpa, $( '#infoPasswordBox' ).val() ] );
				}
			} );
		} else {
			connect( [ ssid, 'dhcp' ] );
		}
	} else {
		infoConnect( $this );
	}
} );
$( '#listbt' ).on( 'click', 'li', function() {
	var $this = $( this );
	var name = $this.data( 'name' );
	var connected = $this.data( 'connected' );
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
$( '#listbtscan' ).on( 'click', 'li', function( e ) {
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
$( '#setting-accesspoint' ).click( function() {
	location.href = 'settings.php?p=features&set=setting-hostapd';
} );

} );
