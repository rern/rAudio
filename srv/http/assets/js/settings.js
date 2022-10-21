function bash( command, callback, json ) {
	if ( typeof command === 'string' ) {
		var args = { cmd: 'bash', bash : command }
	} else {
		var cmd0 = command[ 0 ];
		if ( cmd0 === 'cmd' ) {
			var filesh = 'cmd';
			command.shift();
		} else if ( cmd0 === 'pkgstatus' || cmd0 === 'rebootlist' ) {
			var filesh = 'settings/system';
		} else {
			var filesh = 'settings/'+ page;
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
var dirbash = '/srv/http/bash/settings/';
var playersh = dirbash +'player.sh ';
var networkssh = dirbash +'networks.sh ';
var systemsh = dirbash +'system.sh ';
var cmd = {
	  albumignore  : playersh +'albumignore'
	, asound       : playersh +'devices'
	, avahi        : networkssh +'avahi'
	, bluetooth    : systemsh +'bluetoothstatus'
	, btcontroller : networkssh +'btcontroller'
	, iw           : networkssh +'iwlist'
	, journalctl   : systemsh +'journalctl'
	, lan          : networkssh +'ifconfigeth'
	, mount        : systemsh +'storage'
	, mpdignore    : playersh +'mpdignorelist'
	, nonutf8      : playersh +'nonutf8'
	, rfkill       : systemsh +'rfkilllist'
	, shareddata   : systemsh +'shareddataname'
	, soundprofile : systemsh +'soundprofileget'
	, system       : systemsh +'systemconfig'
	, timedatectl  : systemsh +'timedate'
	, wlan         : networkssh +'ifconfigwlan'
}
var services = [
	  'camilladsp'
	, 'rtsp-simple-server'
	, 'hostapd'
	, 'localbrowser'
	, 'mpd'
	, 'nfs-server'
	, 'shairport-sync'
	, 'smb'
	, 'snapclient'
	, 'snapserver'
	, 'spotifyd'
	, 'upmpdcli'
];

function currentStatus( id, refresh ) {
	var $el = $( '#code'+ id );
	if ( !refresh && !$el.hasClass( 'hide' ) ) {
		$el.addClass( 'hide' );
		return
	}
		
	if ( $el.hasClass( 'hide' ) ) {
		var timeoutGet = setTimeout( function() {
			notify( 'Get Data', id, page );
		}, 1000 );
	}
	var command = services.includes( id ) ? [ 'pkgstatus', id ] : cmd[ id ]+' 2> /dev/null';
	bash( command, function( status ) {
		clearTimeout( timeoutGet );
		$el.html( status ).promise().done( function() {
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
function infoPlayerActive( $this ) {
	var $switch = $this.prev().prev();
	if ( $switch.hasClass( 'disabled' ) ) {
		info( {
			  icon    : $switch.data( 'icon' )
			, title   : $switch.data( 'label' )
			, message : $switch.data( 'disabled' )
		} );
		return true
	}
}
function list2JSON( list ) {
	try {
		G = JSON.parse( list );
	} catch( e ) {
		if ( list.trim() !== 'mpddead' ) {
			var msg = e.message.split( ' ' );
			var pos = msg.pop();
			var error = '<red>Errors:</red> '+ msg.join( ' ' ) +' <red>'+ pos +'</red>'
						+'<hr>'
						+ list.slice( 0, pos ) +'<red>&#9646;</red>'+ list.slice( pos );
			listError( error );
		} else {
			bash( 'systemctl status mpd', function(status) {
				var error = '<i class="fa fa-warning red"></i> MPD not running '
							+'<a class="infobtn infobtn-primary restart"><i class="fa fa-refresh"></i>Start</a>'
							+'<hr>'
							+ status.replace( /(Active: )(.*)/, '$1<red>$2</red>' );
				listError( error );
				$( '#data' ).on( 'click', '.restart', function() {
					bash( 'systemctl start mpd', function() {
						location.reload();
					} );
				} );
			} );
		}
		return false
	}
	$( '#data' ).empty().addClass( 'hide' );
	return true
}
function listError( error ) {
	$( '#data' )
		.html( error )
		.removeClass( 'hide' );
	loaderHide();
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
	if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
	bash( dirbash + page +'-data.sh', function( list ) {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
		} else {
			G = list;
		}
		setSwitch();
		if ( list2G ) renderPage();
	} );
}
function resetLocal() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( G.timeoutbanner );
	G.timeoutbanner = setTimeout( bannerHide, delay );
}
function setSwitch() {
	if ( page !== 'networks' && page !== 'relays' ) {
		$( '.switch' ).each( function() {
			$( this ).prop( 'checked', G[ this.id ] );
		} );
		$( '.setting' ).each( function() {
			if ( $( this ).prev().is( 'select' ) ) return // not switch
			
			var sw = this.id.replace( 'setting-', '' );
			$( this ).toggleClass( 'hide', !G[ sw ] );
		} );
	}
}
function showContent() {
	resetLocal();
	if ( $( 'select' ).length ) selectricRender();
	if ( page !== 'networks' ) {
		$( 'pre.status' ).each( function( el ) {
			if ( !$( this ).hasClass( 'hide' ) ) currentStatus( this.id.replace( 'code', '' ), 'refresh' );
		} );
	}
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
	if ( !active && !G.poweroff ) {
		active = 1;
		pushstream.connect();
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
		if ( !$( '#divbluetooth' ).hasClass( 'hide' ) || !$( '#divwifi' ).hasClass( 'hide' ) ) {
			bash( 'killall -q networks-scan.sh &> /dev/null' );
			clearTimeout( G.timeoutScan );
			$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
			$( '.back' ).click();
		}
	} else if ( page === 'system' ) {
		if ( $( '#refresh' ).hasClass( 'blink' ) ) {
			bash( 'killall -q system-data.sh' );
			clearInterval( G.intCputime );
			$( '#refresh' ).removeClass( 'blink' );
		}
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
var streams = [ 'bluetooth', 'notify', 'player', 'refresh', 'reload', 'state', 'volume', 'volumebt', 'wifi' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {
		bannerHide();
		refreshData();
	} else if ( status === 0 ) { // disconnected
		hiddenSet();
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch ( channel ) {
		case 'bluetooth': psBluetooth( data ); break;
		case 'notify':    psNotify( data );    break;
		case 'player':    psPlayer( data );    break;
		case 'refresh':   psRefresh( data );   break;
		case 'reload':    psReload();          break;
		case 'state':     psState( data );     break;
		case 'volume':    psVolume( data );    break;
		case 'volumebt':  psVolumeBt( data );  break;
		case 'wifi':      psWifi( data );      break;
	}
}
function psBluetooth( data ) {
	if ( !data ) {
		if ( page === 'networks' ) {
			G.listbt = data;
			renderBluetooth();
		} else if ( page === 'system' ) {
			$( '#bluetooth' ).removeClass( 'disabled' );
		}
	} else if ( 'connected' in data ) {
		if ( page === 'features' ) {
			$( '#camilladsp' ).toggleClass( 'disabled', data.btreceiver );
		} else if ( page === 'system' ) {
			$( '#bluetooth' ).toggleClass( 'disabled', data.connected );
		}
	} else if ( page === 'networks' ) {
		G.listbt = data;
		renderBluetooth();
	}
}
function psNotify( data ) {
	if ( $( '#bannerMessage' ).text().includes( 'Reconnect again' ) && data.text !== 'Connect ...' ) return
	
	G.bannerhold = data.hold || 0;
	banner( data.title, data.text, data.icon, data.delay );
	if ( data.title === 'Power' ) {
		if ( data.text === 'Off ...' ) {
			$( '#loader' ).css( 'background', '#000000' );
			setTimeout( function() {
				$( '#loader .logo' ).css( 'animation', 'none' );
			}, 10000 );
			pushstream.disconnect();
			G.poweroff = 1;
		}
		loader();
	}
}
function psPlayer( data ) {
	var player_id = {
		  airplay   : 'shairport-sync'
		, bluetooth : 'bluetooth'
		, snapcast  : 'snapserver'
		, spotify   : 'spotifyd'
		, upnp      : 'upmpdcli'
	}
	$( '#'+ player_id[ data.player ] ).toggleClass( 'disabled', data.active );
}
function psRefresh( data ) {
	if ( data.page === page ) {
		$.each( data, function( k, v ) {
			G[ k ] = v;
		} );
		setSwitch();
		renderPage();
	}
}
function psReload() {
	if ( localhost ) location.reload();
}
function psState( data ) {
	if ( page === 'player' ) {
		G.state = data.state;
		playbackIcon();
	}
}
function psVolume( data ) {
	if ( !$( '#infoRange .value' ).text() ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var val = data.type !== 'mute' ? data.val : 0;
		$( '#infoRange .value' ).text( val );
		$( '#infoRange input' ).val( val );
		$( '.infofooter' ).text( data.db +' dB' );
		$( '#infoContent' ).removeClass( 'hide' );
		$( '.warning, .extrabtn:eq( 0 ), #infoOk' ).addClass( 'hide' );     // ok
		$( '.extrabtn' ).eq( 1 ).toggleClass( 'hide', data.db === '0.00' ); // 0dB
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
var localhost = [ 'localhost', '127.0.0.1' ].includes( location.hostname );
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

if ( localhost ) {
	$( 'a' ).removeAttr( 'href' );
} else {
	$( 'a[href]' ).attr( 'target', '_blank' );
}

$( document ).keyup( function( e ) {
	if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
	var key = e.key;
	switch ( key ) {
		case 'Tab':
			$( '#bar-bottom div' ).removeClass( 'bgr' );
			$( '.switchlabel, .setting' ).removeClass( 'focus' );
			setTimeout( function() {
				$focus = $( 'input:checkbox:focus' );
				if ( $focus.length ) {
					$focus.next().addClass( 'focus' );
				}
			}, 0 );
			break;
		case 'Escape':
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
			break;
		case 'ArrowLeft':
		case 'ArrowRight':
			var $current = $( '#bar-bottom .bgr' ).length ? $( '#bar-bottom .bgr' ) : $( '#bar-bottom .active' );
			var id = $current[ 0 ].id;
			var $next = key === 'ArrowLeft' ? $( '#'+ pagenext[ id ][ 0 ] ) : $( '#'+ pagenext[ id ][ 1 ] );
			$( '#bar-bottom div' ).removeClass( 'bgr' );
			if ( !$next.hasClass( 'active' ) ) $next.addClass( 'bgr' );
			break;
		case 'Enter':
			if ( $( '#bar-bottom .bgr' ).length ) {
				$( '#bar-bottom .bgr' ).click();
			} else {
				$focus = $( '.setting.focus' );
				if ( $focus.length ) $focus.click();
			}
			break;
	}
} );
$( '.container' ).on( 'click', '.status', function( e ) {
	if ( $( e.target ).is( 'i' ) ) return
	
	var $this = $( this );
	if ( !$this.hasClass( 'single' ) ) currentStatus( $this.data( 'status' ) );
} );
$( '.close' ).click( function() {
	bash( [ 'rebootlist' ], function( list ) {
		if ( !list ) {
			location.href = '/';
			return
		}
		
		info( {
			  icon    : page
			, title   : 'System Setting'
			, message : 'Reboot required for:<br><br>'
						+'<pre><wh>'+ list +'</wh></pre>'
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
	} );
} );
$( '.page-icon' ).click( function() {
	if ( $.isEmptyObject( G ) ) return
	
	var html = JSON.stringify( G, null, '\t' )
//				.replace( /(".*"):/g, '<bll>$1</bll>:' )
				.replace( /: (true|false),/g, ': <grn>$1</grn>,' )
				.replace( /: ([0-9]+),/g, ': <red>$1</red>,' )
				.replace( /: (".*"),/g, ': <yl>$1</yl>,' )
	$( '#data' )
		.html( html )
		.removeClass( 'hide' );
	$( '.head, .container, #bar-bottom' ).addClass( 'hide' );
} );
$( '#button-data' ).click( function() {
	$( '.head, .container, #bar-bottom' ).removeClass( 'hide' );
	$( '#data' ).addClass( 'hide' );
} ).on( 'mousedown touchdown', function() {
	timer = setTimeout( function() {
		location.reload();
	}, 1000 );
} ).on( 'mouseup mouseleave touchup touchleave', function() {
	clearTimeout( timer );
} );
$( '.help-head' ).click( function() {
	var eltop = $( 'heading' ).filter( function() {
		return this.getBoundingClientRect().top > 0
	} )[ 0 ]; // return 1st element
	if ( eltop ) var offset0 = eltop.getBoundingClientRect().top;
	if ( window.innerHeight > 570 ) {
		var visible = $( this ).hasClass( 'bl' );
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
	$( '.sub' ).next().toggleClass( 'hide', visible );
} );
$( '.help' ).click( function() {
	$( this ).parents( '.section' ).find( '.help-block' ).toggleClass( 'hide' );
	$( '.help-head' ).toggleClass( 'bl', $( '.help-block:not( .hide ), .help-sub:not( .hide )' ).length > 0 );
} );
$( '.switch:not( .custom )' ).click( function() {
	var id = this.id;
	var $this = $( this );
	var checked = $this.prop( 'checked' );
	var label = $this.data( 'label' );
	var icon = $this.data( 'icon' );
	if ( $this.hasClass( 'disabled' ) ) {
		$this.prop( 'checked', !checked );
		info( {
			  icon    : icon
			, title   : label
			, message : $this.prev().html()
		} );
		return
	}
	
	if ( $this.hasClass( 'common' ) ) {
		if ( checked ) {
			$( '#setting-'+ id ).click();
		} else {
			notify( label, 'Disable ...', icon );
			bash( [ id, false ] );
		}
	} else {
		notify( label, checked, icon );
		bash( [ id, checked ], function( error ) {
			if ( error ) {
				bannerHide();
				$( '#'+ id ).prop( 'checked', false );
				info( error );
			}
		}, 'json' );
	}
} );
$( '#bar-bottom div' ).click( function() {
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
