function bash( command, callback, json ) {
	if ( typeof command === 'string' ) {
		var args = { cmd: 'bash', bash : command }
	} else {
		var filesh = command[ 0 ] !== 'statuspkg' ? page : 'cmd';
		var args = { cmd: 'sh', sh: [ filesh +'.sh' ].concat( command ) }
	}
	$.post( 
		  'cmd.php'
		, args
		, callback || null
		, json || null
	);
}
var cmd = {
	  avahi        : [ '/srv/http/bash/networks.sh avahi', "avahi-browse -arp | cut -d';' -f7,8" ]
	, asound       : [ '/srv/http/bash/player.sh devices', -1 ]
	, bluetooth    : [ 'bluetoothctl info' ]
	, bluetoothctl : [ 'systemctl -q is-active bluetooth && bluetoothctl show', 'bluetoothctl show' ]
	, configtxt    : [ 'cat /boot/config.txt' ]
	, iw           : [ 'iw reg get; iw list' ]
	, journalctl   : [ '/srv/http/bash/system.sh getjournalctl', 'journalctl -b' ]
	, lan          : [ "ifconfig eth0 | grep -v 'RX\\|TX' | grep .", 'ifconfig eth0' ]
	, mount        : [ 'cat /etc/fstab; echo -e "\n# mount | grep ^/dev\n"; mount | grep ^/dev | sort', 'cat /etc/fstab' ]
	, mpdconf      : [ 'cat /etc/mpd.conf' ]
	, powerbutton  : [ 'systemctl status powerbutton' ]
	, rfkill       : [ 'rfkill' ]
	, soundprofile : [ '/srv/http/bash/system.sh soundprofileget', "sysctl kernel.sched_latency_ns<br># sysctl vm.swappiness<br># ifconfig eth0 | grep 'mtu\\|txq'" ]
	, wlan         : [ "{ ifconfig wlan0 | grep -v 'RX\\|TX'; iwconfig wlan0 | grep .; }", 'ifconfig wlan0<br># iwconfig wlan0' ]
}
var services = [ 'hostapd', 'localbrowser', 'mpd', 'mpdscribble', 'shairport-sync', 'smb', 'snapserver', 'spotifyd', 'upmpdcli' ];
var pkg = {
	  localbrowser    : 'chromium'
	, smb             : 'samba'
	, snapserver      : 'snapcast'
}

function codeToggle( id, target ) {
	id === 'localbrowser' ? resetLocal( 7000 ) : resetLocal();
	if ( $( target ).hasClass( 'help' )
		|| [ 'btscan', 'mpdrestart', 'refresh', 'wladd', 'wlscan' ].indexOf( target.id ) !== -1 ) return
	
	var $el = $( '#code'+ id );
	if ( target === 'status' && $el.hasClass( 'hide' ) ) return
	
	if ( target === 'status' || $el.hasClass( 'hide' ) ) {
		var i = services.indexOf( id );
		if ( i !== -1 ) {
			var pkgname = Object.keys( pkg ).indexOf( id ) == -1 ? id : pkg[ id ];
			if ( id === 'mpdscribble' ) id+= '@mpd';
			var command = [ 'statuspkg', pkgname, id ];
			var cmdtxt = '# pacman -Q '+ pkgname +'; systemctl status '+ id +'<br><br>';
			var systemctl = 1;
		} else {
			var command = cmd[ id ][ 0 ] +' 2> /dev/null';
			var cmdtxt = cmd[ id ][ 1 ] !== -1 ? '# '+ ( cmd[ id ][ 1 ] || cmd[ id ][ 0 ] ) +'<br><br>' : '';
			var systemctl = 0;
		}
		if ( id === 'bluetoothctl' && G.reboot.toString().indexOf( 'Bluetooth' ) !== -1 ) {
			$el
				.html( '(Enable: reboot required.)' )
				.removeClass( 'hide' );
			return
		}
		
		var delay = target === 'status' ? 1000 : 0;
		setTimeout( function() {
			bash( command, function( status ) {
				var status = status
								.replace( /(active \(running\))/, '<grn>$1</grn>' )
								.replace( /(inactive \(dead\))/, '<red>$1</red>' )
				if ( systemctl ) status = status
									.replace( /(.*)\n/, '<grn>$1</grn>\n' )
									.replace( /(failed)/, '<red>$1</red>' );
				$el
					.html( cmdtxt + status )
					.removeClass( 'hide' );
				if ( id === 'mpdconf' ) {
					setTimeout( function() {
						$( '#codempdconf' ).scrollTop( $( '#codempdconf' ).height() );
					}, 100 );
				}
			} );
		}, delay );
	} else {
		$el.addClass( 'hide' );
	}
}
function disableSwitch( id, truefalse ) {
	$( id )
		.prop( 'disabled', truefalse )
		.next().toggleClass( 'disabled', truefalse );
}
function escapeUsrPwd( usrpwd ) {
	return usrpwd.replace( /(["&()\\])/g, '\$1' )
}
function list2JSON( list ) {
	try {
		G = JSON.parse( list );
	} catch( e ) {
		var msg = e.message.split( ' ' );
		var pos = msg.pop();
		var errors = '<red>Errors:</red> '+ msg.join( ' ' ) +' <red>'+ pos +'</red>'
					+'<hr>'
					+ list.slice( 0, pos ) +'<red>&#9646;</red>'+ list.slice( pos );
		$( '#data' ).html( errors ).removeClass( 'hide' );
		return false
	}
	$( '#button-data' ).removeAttr( 'class' );
	$( '#data' ).empty().addClass( 'hide' );
	if ( G.page === 'system' ) G.reboot = G.reboot ? G.reboot.split( '\n' ) : [];
	return true
}
function loader() {
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	$( '#loader' ).addClass( 'hide' );
}
function notify( title, message, icon ) {
	if ( typeof message === 'boolean' || typeof message === 'number' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( title, message, icon +' blink', -1 );
}
function refreshData() {
	if ( page === 'networks' ) {
		if ( !$( '#divwifi' ).hasClass( 'hide' ) ) {
			wlanStatus();
		} else if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) {
			btScan();
		} else {
			bash( '/srv/http/bash/networks-data.sh', function( list ) {
				renderPage( list );
			} );
		}
		resetLocal();
	} else {
		bash( '/srv/http/bash/'+ page +'-data.sh', function( list ) {
			renderPage( list );
		} );
	}
}
function resetLocal( ms ) {
	if ( $( '#bannerTitle' ).text() === 'USB Drive' ) return
	
	setTimeout( function() {
		$( '#bannerIcon i' ).removeClass( 'blink' );
		$( '#bannerMessage' ).text( 'Done' );
	}, ms ? ms - 2000 : 0 );
	setTimeout( bannerHide, ms || 2000 );
}
function showContent() {
	if ( $( '#data' ).hasClass( 'hide' ) ) {
		setTimeout( function() {
			loaderHide();
			$( '.head, .container' ).removeClass( 'hide' );
		}, 300 );
	} else {
		$( '#data' ).html( JSON.stringify( G, null, 2 ) );
	}
}
// active / inactive window /////////
var active = 1;
connect = () => {
	if ( !active ) {
		active = 1;
		pushstream.connect();
	}
}
disconnect = () => {
	if ( active && !G.selectchange ) {
		active = 0;
		pushstream.disconnect();
	}
}
document.addEventListener( 'visibilitychange', () => document.hidden ? disconnect() : connect() ); // invisible
window.onpagehide = window.onblur = disconnect; // invisible + visible but not active
window.onpageshow = window.onfocus = connect;
////////////////////////////////////
var pushstream = new PushStream( {
	  modes                                 : 'websocket'
	, timeout                               : 5000
	, reconnectOnChannelUnavailableInterval : 5000
} );
var streams = [ 'notify', 'refresh', 'reload', 'volume', 'wifi' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {
		bannerHide();
		if ( !$.isEmptyObject( G ) ) refreshData();
	} else if ( status === 0 ) { // disconnected
		if ( page === 'networks' ) {
			clearInterval( intervalscan );
		} else if ( page === 'system' ) {
			clearInterval( intervalcputime );
			$( '#refresh' ).removeClass( 'blink' );
		}
		if ( 'poweroff' in G ) setTimeout( bannerHide, 8000 );
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch( channel ) {
		case 'notify':  psNotify( data );  break;
		case 'refresh': psRefresh( data ); break;
		case 'reload':  psReload();        break;
		case 'volume':  psVolume( data );  break;
		case 'wifi':    psWifi( data );    break;
	}
}
function psNotify( data ) {
	banner( data.title, data.text, data.icon, data.delay );
	if ( 'power' in data ) {
		if ( data.power === 'off' ) {
			G.poweroff = 1;
			$( '#loader' ).addClass( 'splash' );
		}
		loader();
	}
}
function psRefresh( data ) {
	if ( data.page === page ) {
		renderPage( data );
	} else if ( data.page === 'all' ) {
		refreshData();
	}
}
function psReload() {
	if ( localhost ) location.reload();
}
function psVolume( data ) {
	if ( G.local || !$( '#infoRange .value' ).text() ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var val = data.type !== 'mute' ? data.val : 0;
		$( '#infoRange .value' ).text( val );
		$( '#infoRange input' ).val( val );
		$( '.infofooter' ).text( data.db +' dB' );
		$( '#infoContent' ).removeClass( 'hide' );
		$( '.warning, #infoButtons a:eq( 0 )' ).addClass( 'hide' );              // ok
		$( '#infoButtons a:eq( 1 )' ).toggleClass( 'hide', data.db === '0.00' ); // 0dB
	}, 300 );
}
function psWifi( data ) {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
		, oklabel : '<i class="fa fa-reboot"></i>Reboot'
		, okcolor : orange
		, ok      : function() {
			bash( '/srv/http/bash/cmd.sh power' );
		}
	} );
}
//---------------------------------------------------------------------------------------
var hash = Math.ceil( Date.now() / 1000 );
G = {}
var debounce;
var dirsystem = '/srv/http/data/system';
var filereboot = '/srv/http/data/shm/reboot';
var intervalcputime;
var intervalscan;
var local = 0;
var localhost = [ 'localhost', '127.0.0.1' ].indexOf( location.hostname ) !== -1;
var orange = '#de810e';
var page = location.href.replace( /.*p=/, '' ).split( '&' )[ 0 ];
var red = '#bb2828';
var timer;
var pagenext = {
	  features : [ 'system', 'player' ]
	, player   : [ 'features', 'networks' ]
	, networks : [ 'player', 'system' ]
	, system   : [ 'networks', 'features' ]
}
var $focus;

document.title = page;

refreshData();

if ( localhost ) $( 'a' ).removeAttr( 'href' );
$( document ).keyup( function( e ) {
	if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
	if ( e.keyCode === 88 ) { // ctrl + x
		$( '#close' ).click();
		return
	}
	
	var key = e.key;
	if ( key === 'Tab'  ) {
		$( '#bar-bottom div' ).removeClass( 'bgr' );
		$( '.switchlabel, .setting' ).removeClass( 'focus' );
		setTimeout( function() {
			$focus = $( 'input:checkbox:focus' );
			if ( $focus.length ) {
				$focus.next().addClass( 'focus' );
			}
		}, 0 );
	} else if ( key === 'Escape' ) {
		$focus = $( '.switchlabel.focus' );
		setTimeout( function() {
			if ( $focus.length ) $focus.prev().focus();
		}, 300 );
		if ( $( '.setting.focus' ).length ) {
			$( '.setting' ).removeClass( 'focus' );
			return
		}
		
		if ( $focus.length && $focus.prev().prop( 'checked' ) && $focus.next().hasClass( 'setting' ) ) {
			$( '.switchlabel.focus' ).next().addClass( 'focus' );
		}
	} else if ( key === 'ArrowLeft' || key === 'ArrowRight' ) {
		var $current = $( '#bar-bottom .bgr' ).length ? $( '#bar-bottom .bgr' ) : $( '#bar-bottom .active' );
		var id = $current[ 0 ].id;
		var $next = key === 'ArrowLeft' ? $( '#'+ pagenext[ id ][ 0 ] ) : $( '#'+ pagenext[ id ][ 1 ] );
		$( '#bar-bottom div' ).removeClass( 'bgr' );
		if ( !$next.hasClass( 'active' ) ) $next.addClass( 'bgr' );
	} else if ( key === 'Enter' ) {
		if ( $( '#bar-bottom .bgr' ).length ) {
			$( '#bar-bottom .bgr' ).click();
		} else {
			$focus = $( '.setting.focus' );
			if ( $focus.length ) $focus.click();
		}
	}
} );
$( '#'+ page ).addClass( 'active' );
$( '#close' ).click( function() {
	if ( page === 'networks' && $( '#listinterfaces li' ).hasClass( 'bt' ) ) {
		bash( 'bluetoothctl scan off' );
	}
	bash( 'cat '+ filereboot +' | sort -u', function( lines ) {
		G.reboot = lines;
		if ( G.reboot.length ) {
			info( {
				  icon    : page
				, title   : 'System Setting'
				, message : 'Reboot required for:'
						   +'<br><w>'+ G.reboot.replace( /\n/g, '<br>' ) +'</w>'
				, cancel  : function() {
					G.reboot = [];
					bash( 'rm -f '+ filereboot );
				}
				, ok      : function() {
					bash( '/srv/http/bash/cmd.sh power' );
				}
			} );
		} else {
			bash( 'rm -f /srv/http/data/tmp/backup.*' );
			location.href = '/';
		}
	} );
} );
$( '#button-data' ).click( function() {
	if ( !G ) return
	
	if( $( '#data' ).hasClass( 'hide' ) ) {
		$( '.container' ).addClass( 'hide' );
		$( '#data' )
			.html( JSON.stringify( G, null, 2 ) )
			.removeClass( 'hide' );
		$( '#button-data' ).addClass( 'fa fa-times' );
	} else {
		$( '.container' ).removeClass( 'hide' );
		$( '#data' ).addClass( 'hide' );
		$( '#button-data' ).removeClass( 'fa fa-times' );
	}
} ).on( 'mousedown touchdown', function() {
	timer = setTimeout( function() {
		location.reload();
	}, 1000 );
} ).on( 'mouseup mouseleave touchup touchleave', function() {
	clearTimeout( timer );
} );
$( '#help' ).click( function() {
	var eltop = $( 'heading' ).filter( function() {
		return this.getBoundingClientRect().top > 0
	} )[ 0 ]; // return 1st element
	if ( eltop ) var offset0 = eltop.getBoundingClientRect().top;
	if ( window.innerHeight > 570 ) {
		var visible = $( '.help-block:not(.hide)' ).length > 0;
		$( this ).toggleClass( 'bl', !visible );
		$( '.help-block' ).toggleClass( 'hide', visible );
	} else {
		var visible = $( '#bar-bottom' ).css( 'display' ) !== 'none';
		$( '#bar-bottom' ).css( 'display', visible ? '' : 'block' );
	}
	if ( eltop ) $( window ).scrollTop( eltop.offsetTop - offset0 );
} );
$( '.help' ).click( function() {
	$( this ).parent().parent().find( '.help-block' ).toggleClass( 'hide' );
	$( '#help' ).toggleClass( 'blue', $( '.help-block:not(.hide)' ).length !== 0 );
} );
$( 'body' ).on( 'click', '.status', function( e ) {
	if ( $( e.target ).hasClass( 'help' ) || $( e.target ).hasClass( 'fa-plus-circle' ) ) return
	
	codeToggle( $( this ).data( 'status' ), e.target );
} );
$( '#bar-bottom div' ).click( function() {
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
$( '.container select' ).change( function() { // fix: 'disconnect'
	G.selectchange = 1;
	setTimeout( function() {
		G.selectchange = 0;
	}, 2000 );
} );