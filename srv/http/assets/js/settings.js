function bash( command, callback, json ) {
	if ( typeof command === 'string' ) {
		var args = { cmd: 'bash', bash : command }
	} else {
		if ( command[ 0 ] === 'cmd' ) {
			var filesh = 'cmd';
			command.shift();
		} else {
			var filesh = page;
		}
		var args = { cmd: 'sh', sh: [ filesh +'.sh' ].concat( command ) }
	}
	$.post( 
		  'cmd.php'
		, args
		, callback || null
		, json || null
	);
}
var dirbash = '/srv/http/bash/';
var playersh = dirbash +'player.sh ';
var networkssh = dirbash +'networks.sh ';
var systemsh = dirbash +'system.sh ';
var cmd = {
	  albumignore  : [ 'cat /srv/http/data/mpd/albumignore' ]
	, asound       : [ playersh +'devices', -1 ]
	, avahi        : [ networkssh +'avahi', -1 ]
	, bluetooth    : [ 'bluetoothctl info' ]
	, bluetoothctl : [ 'systemctl -q is-active bluetooth && bluetoothctl show', 'bluetoothctl show' ]
	, configtxt    : [ systemsh +'configtxtget', -1 ]
	, iw           : [ 'iw reg get; iw list' ]
	, journalctl   : [ systemsh +'journalctlget', 'journalctl -b' ]
	, lan          : [ "ifconfig eth0 | grep -v 'RX\\|TX' | grep .", 'ifconfig eth0' ]
	, mount        : [ systemsh +'fstabget', -1 ]
	, mpdconf      : [ 'cat /etc/mpd.conf' ]
	, mpdignore    : [ playersh +'mpdignorelist', 'find /mnt/MPD -name .mpdignore' ]
	, rfkill       : [ 'rfkill' ]
	, soundprofile : [ systemsh +'soundprofileget', -1 ]
	, timesyncd    : [ 'systemctl status systemd-timesyncd' ]
	, wlan         : [ networkssh +'ifconfigget', -1 ]
}
var services = [ 'hostapd', 'localbrowser', 'mpd', 'mpdscribble', 'shairport-sync', 'smb', 'snapserver', 'spotifyd', 'upmpdcli' ];

function status( id, refresh ) {
	var $el = $( '#code'+ id );
	if ( !refresh && !$el.hasClass( 'hide' ) ) {
		$el.addClass( 'hide' );
		return
	}
		
	var i = services.indexOf( id );
	if ( i !== -1 ) {
		var pkg = {
			  localbrowser : G.browser
			, smb          : 'samba'
			, snapserver   : 'snapcast'
		}
		var pkgname = Object.keys( pkg ).indexOf( id ) == -1 ? id : pkg[ id ];
		if ( id === 'mpdscribble' ) id+= '@mpd';
		var command = [ 'cmd', 'statuspkg', pkgname, id ];
		var cmdtxt = '<bl># pacman -Q '+ pkgname +'; systemctl status '+ id +'</bl><br><br>';
		var systemctl = 1;
	} else {
		var command = cmd[ id ][ 0 ] +' 2> /dev/null';
		var cmdtxt = cmd[ id ][ 1 ] !== -1 ? '<bll># '+ ( cmd[ id ][ 1 ] || cmd[ id ][ 0 ] ) +'</bll><br><br>' : '';
		var systemctl = 0;
	}
	if ( $el.hasClass( 'hide' ) ) {
		var timeoutGet = setTimeout( function() {
			notify( 'Get Data', id, page );
		}, 1000 );
	}
	bash( command, function( status ) {
		clearTimeout( timeoutGet );
		var status = status
						.replace( /(active \(running\))/, '<grn>$1</grn>' )
						.replace( /(inactive \(dead\))/, '<red>$1</red>' )
		if ( systemctl ) status = status
							.replace( /(.*)\n/, '<grn>$1</grn>\n' )
							.replace( /(failed)/, '<red>$1</red>' );
		$el.html( cmdtxt + status ).promise().done( function() {
			$el.removeClass( 'hide' );
			if ( id === 'mpdconf' ) {
				setTimeout( function() {
					$( '#codempdconf' ).scrollTop( $( '#codempdconf' ).height() );
				}, 100 );
			}
			if ( id === 'albumignore' || id === 'mpdignore' ) $( 'html, body' ).scrollTop( $( '#code'+ id ).offset().top - 90 );
		} );
		resetLocal();
	} );
}
function disableSwitch( id, truefalse ) {
	$( id )
		.prop( 'disabled', truefalse )
		.next().toggleClass( 'disabled', truefalse );
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
	return true
}
function loader() {
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	$( '#loader' ).addClass( 'hide' );
}
function notify( title, message, icon, delay ) {
	if ( typeof message === 'boolean' || typeof message === 'number' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( title, message, icon +' blink', delay || -1 );
}
function refreshData() {
	if ( page === 'networks' ) {
		if ( !$( '#divwifi' ).hasClass( 'hide' ) ) {
			wlanStatus();
		} else if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) {
			btScan();
		} else {
			bash( dirbash +'networks-data.sh', function( list ) {
				renderPage( list );
			} );
		}
		resetLocal();
	} else {
		bash( dirbash + page +'-data.sh', function( list ) {
			renderPage( list );
		} );
	}
}
function resetLocal() {
	if ( $( '#bannerTitle' ).text() === 'USB Drive' ) return
	
	$( '#bannerIcon i' ).removeClass( 'blink' );
	setTimeout( bannerHide, 1000 );
}
function showContent() {
	resetLocal();
	if ( $( 'select' ).length ) selectricRender();
	$( 'pre.status' ).each( function( el ) {
		if ( !$( this ).hasClass( 'hide' ) ) status( this.id.replace( 'code', '' ), 'refresh' );
	} );
	if ( $( '#data' ).hasClass( 'hide' ) ) { // page data
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
		$( '#scanning-bt, #scanning-wifi' ).addClass( 'blink' );
	}
}
disconnect = () => {
	if ( active ) {
		active = 0;
		hiddenSet();
	}
}
hiddenSet = () => {
	if ( page === 'networks' ) {
		clearTimeout( G.timeoutScan );
		$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
	} else if ( page === 'system' ) {
		clearInterval( G.intCputime );
		$( '#refresh' ).removeClass( 'blink' );
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
var streams = [ 'bluetooth', 'notify', 'refresh', 'reload', 'volume', 'volumebt', 'wifi' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {
		bannerHide();
		if ( !$.isEmptyObject( G ) ) refreshData();
	} else if ( status === 0 ) { // disconnected
		hiddenSet();
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch( channel ) {
		case 'bluetooth': psBluetooth( data ); break;
		case 'notify':    psNotify( data );    break;
		case 'refresh':   psRefresh( data );   break;
		case 'reload':    psReload();          break;
		case 'volume':    psVolume( data );    break;
		case 'volumebt':  psVolumeBt( data );  break;
		case 'wifi':      psWifi( data );      break;
	}
}
function psBluetooth( data ) {
	if ( page === 'networks' ) {
		G.listbt = data;
		renderBluetooth();
	}
}
function psNotify( data ) {
	banner( data.title, data.text, data.icon, data.delay );
	if ( 'power' in data ) {
		if ( data.power === 'off' ) {
			$( '#loader' ).addClass( 'splash' );
			setTimeout( bannerHide, 10000 );
		}
		loader();
	}
}
function psRefresh( data ) {
	if ( data.page === page ) renderPage( data );
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
function psVolumeBt( data ) {
	if ( !$( '#infoRange .value' ).text() ) return
	
	$( '#infoRange .value' ).text( data.val );
	$( '#infoRange input' ).val( data.val );
	$( '.infofooter' ).text( data.db +' dB' );
	$( '#infoButtons' ).toggleClass( 'hide', data.db === '0.00' );
}
function psWifi( data ) {
	info( {
		  icon    : 'wifi'
		, title   : 'Wi-Fi'
		, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
		, oklabel : '<i class="fa fa-reboot"></i>Reboot'
		, okcolor : orange
		, ok      : function() {
			bash( [ 'reboot' ] );
		}
	} );
}
//---------------------------------------------------------------------------------------
G = {}
var debounce;
var dirsystem = '/srv/http/data/system';
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
var selectchange = 0;

document.title = page;

refreshData();

if ( localhost ) $( 'a' ).removeAttr( 'href' );

$( document ).keyup( function( e ) {
	if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
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
$( '#close' ).click( function() {
	if ( page === 'networks' ) {
		clearTimeout( intervalscan );
		bash( 'killall networks-scanbt.sh networks-scanwlan.sh &> /dev/null' );
	}
	bash( [ 'cmd', 'rebootlist' ], function( list ) {
		if ( !list ) {
			location.href = '/';
		} else {
			var list = list.replace( /\^/s, '\n' );
			info( {
				  icon    : page
				, title   : 'System Setting'
				, message : `\
Reboot required for:
<wh>${ list }</wh>`
				, cancel  : function() {
					bash( 'rm -f /srv/http/data/shm/reboot /srv/http/data/tmp/backup.*' );
					location.href = '/';
				}
				, okcolor : orange
				, oklabel : '<i class="fa fa-reboot"></i>Reboot'
				, ok      : function() {
					bash( [ 'cmd', 'power', 'reboot' ] );
				}
			} );
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
		var visible = $( '.help-block:not( .hide )' ).length > 0;
		$( this ).toggleClass( 'bl', !visible );
		$( '.section' ).each( function() {
			if ( $( this ).hasClass( 'hide' ) ) return
			
			$( this ).find( '.help-block' ).toggleClass( 'hide', visible );
		} )
		
	} else {
		var visible = $( '#bar-bottom' ).css( 'display' ) !== 'none';
		$( '#bar-bottom' ).css( 'display', visible ? '' : 'block' );
	}
	if ( eltop ) $( 'html, body' ).scrollTop( eltop.offsetTop - offset0 );
} );
$( '.help' ).click( function() {
	$( this ).parents( '.section' ).find( '.help-block' ).toggleClass( 'hide' );
	$( '#help' ).toggleClass( 'bl', $( '.help-block:not( .hide )' ).length !== 0 );
} );
$( '.container' ).on( 'click', '.status', function( e ) {
	if ( !$( e.target ).is( 'i' ) ) status( $( this ).data( 'status' ) );
} );
$( '.switch' ).click( function() {
	var id = this.id;
	if ( id === 'backup' || id === 'restore' ) return
	
	var $this = $( this );
	if ( $this.hasClass( 'disabled' ) ) {
		$this.prop( 'checked', !checked );
		return
	}
	
	var label = $this.data( 'label' );
	var icon = $this.data( 'icon' );
	var checked = $this.prop( 'checked' );
	if ( $this.hasClass( 'common' ) ) {
		if ( checked ) {
			$( '#setting-'+ id ).click();
		} else {
			notify( label, 'Disable ...', icon );
			bash( [ id +'disable' ] );
		}
	} else {
		notify( label, checked, icon );
		bash( [ this.id, checked ] );
	}
} );
$( '#bar-bottom div' ).click( function() {
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
