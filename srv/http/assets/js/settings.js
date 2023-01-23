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

S              = {} // status
SW             = {} // switch
V              = {} // var global

var dirbash    = '/srv/http/bash/settings/';
var playersh   = dirbash +'player.sh ';
var networkssh = dirbash +'networks.sh ';
var systemsh   = dirbash +'system.sh ';
var cmd        = {
	  albumignore  : playersh   +'albumignore'
	, asound       : playersh   +'devices'
	, avahi        : networkssh +'avahi'
	, bluetooth    : networkssh +'bluetooth'
	, journalctl   : systemsh   +'journalctl'
	, lan          : networkssh +'ifconfigeth'
	, mount        : systemsh   +'storage'
	, mpdignore    : playersh   +'mpdignorelist'
	, nonutf8      : playersh   +'nonutf8'
	, rfkill       : systemsh   +'rfkilllist'
	, shareddata   : systemsh   +'shareddataname'
	, soundprofile : systemsh   +'soundprofileget'
	, system       : systemsh   +'systemconfig'
	, timezone     : systemsh   +'timedate'
	, wlan         : networkssh +'iwlist'
	, ifconfigwlan : networkssh +'ifconfigwlan'
}
var services   = [ 'camilladsp',     'dabradio', 'hostapd',    'localbrowser', 'mpd',     'nfsserver'
				 , 'shairport-sync', 'smb',      'snapclient', 'spotifyd',     'upmpdcli' ];

function bannerReset() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( I.timeoutbanner );
	I.timeoutbanner = setTimeout( bannerHide, delay );
}
function currentStatus( id ) {
	var $el = $( '#code'+ id );
	if ( $el.hasClass( 'hide' ) ) {
		var timeoutGet = setTimeout( () => notify( page, 'Get Data', id ), 1000 );
	}
	var command = services.includes( id ) ? [ 'pkgstatus', id ] : cmd[ id ]+' 2> /dev/null';
	bash( command, status => {
		clearTimeout( timeoutGet );
		$el.html( status ).promise().done( () => {
			$el.removeClass( 'hide' );
			if ( id === 'mpdconf' ) {
				setTimeout( () => $( '#codempdconf' ).scrollTop( $( '#codempdconf' ).height() ), 100 );
			}
			if ( id === 'albumignore' || id === 'mpdignore' ) $( 'html, body' ).scrollTop( $( '#code'+ id ).offset().top - 90 );
		} );
		bannerReset();
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
	if ( list.trim() === 'mpdnotrunning' ) {
		bash( [ 'pkgstatus', 'mpd' ], status => {
			var error =  iconwarning +'MPD is not running '
						+'<a class="infobtn infobtn-primary restart">'+ ico( 'refresh' ) +'Start</a>'
						+'<hr>'
						+ status;
			$( '#data' )
				.html( error )
				.removeClass( 'hide' )
				.on( 'click', '.restart', function() {
					bash( '/srv/http/bash/settings/player-conf.sh', refreshData );
					notify( 'mpd', 'MPD', 'Start ...' );
				} );
		loaderHide();
		} );
		return
	}
	
	try {
		S = JSON.parse( list );
	} catch( e ) {
		errorDisplay( e.message, list );
		return false
	}
	return true
}
function notify( icon, title, message, delay ) {
	if ( typeof message === 'boolean' || typeof message === 'number' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( icon +' blink', title, message, delay || -1 );
}
function refreshData() {
	if ( page === 'addons' || page === 'guide' || ! I.hidden ) return
	
	bash( dirbash + page +'-data.sh', list => {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
		} else {
			S = list;
		}
		if ( ! list2G ) return
		
		if ( $( '#data' ).hasClass( 'hide' ) || $( '#data .infobtn' ).length ) {
			$( '#data' ).empty();
			$( '#button-data, #data' ).addClass( 'hide' );
			switchSet();
			renderPage();
		} else {
			$( '#data' ).html( highlightJSON( S ) )
			$( '#button-data, #data' ).removeClass( 'hide' );
		}
	} );
}
function showContent() {
	V.ready ? delete V.ready : bannerReset();
	var $select = $( '.container select' );
	if ( $select.length ) selectSet( $select );
	$( '.container' ).removeClass( 'hide' );
	loaderHide();
}
function switchCancel() {
	delete I.active;
	$( '#'+ SW.id ).prop( 'checked', S[ SW.id ] );
}
function switchDisable() {
	S[ SW.id ] = false;
	$( '#setting-'+ SW.id ).addClass( 'hide' );
}
function switchEnable() {
	var val = infoVal();
	var cmd = typeof val === 'object' ? [ SW.id, true, ...val ] : [ SW.id, true, val ];
	bash( cmd );
	notify( SW.icon, SW.title, S[ SW.id ] ? 'Change ...' : 'Enable ...' );
	S[ SW.id ] = true;
}
function switchSet() {
	if ( page === 'networks' || page === 'relays' ) return
	
	$( '.switch' ).each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
	$( '.setting' ).each( ( i, el ) => {
		var $this = $( el );
		if ( $this.prev().is( 'select' ) ) return // not switch
		
		var sw = el.id.replace( 'setting-', '' );
		$this.toggleClass( 'hide', ! S[ sw ] );
	} );
	$( 'pre.status' ).each( ( i, el ) => { // refresh code block
		if ( ! $( el ).hasClass( 'hide' ) ) currentStatus( el.id.slice( 4 ) ); // codeid > id
	} );
}

// pushstreamChannel() in common.js
pushstreamChannel( [ 'bluetooth', 'notify', 'player', 'refresh', 'reload', 'volume', 'volumebt', 'wlan' ] );
function pushstreamDisconnect() {
	if ( page === 'networks' ) {
		if ( ! $( '#divbluetooth' ).hasClass( 'hide' ) || ! $( '#divwifi' ).hasClass( 'hide' ) ) {
			bash( 'killall -q networks-scan.sh &> /dev/null' );
			clearTimeout( V.timeoutscan );
			$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
			$( '.back' ).click();
		}
	} else if ( page === 'system' ) {
		if ( $( '#refresh' ).hasClass( 'blink' ) ) {
			clearInterval( V.intStatus );
			$( '#refresh' ).removeClass( 'blink' );
		}
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch ( channel ) {
		case 'bluetooth': psBluetooth( data ); break;
		case 'notify':    psNotify( data );    break;
		case 'player':    psPlayer( data );    break;
		case 'refresh':   psRefresh( data );   break;
		case 'reload':    psReload();          break;
		case 'volume':    psVolume( data );    break;
		case 'wlan':      psWlan( data );      break;
	}
}
function psBluetooth( data ) {
	if ( ! data ) {
		if ( page === 'networks' ) {
			S.listbt = data;
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
		S.listbt = data;
		renderBluetooth();
	}
}
function psNotify( data ) {
	var icon     = data.icon;
	var title    = data.title;
	var message  = data.message;
	var delay    = data.delay;
	banner( icon, title, message, delay );
	if ( title === 'Power' ) pushstreamPower( message );
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
	if ( data.page !== page ) return
	
	$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
	page === 'networks' ? $( '.back' ).click() : switchSet();
	renderPage();
}
function psReload( data ) {
	if ( localhost ) location.reload();
}
function psVolume( data ) {
	if ( ! $( '#infoRange .value' ).text() ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		var val = data.type !== 'mute' ? data.val : 0;
		$( '#infoRange .value' ).text( val );
		$( '#infoRange input' ).val( val );
		$( '.infofooter' ).text( data.db +' dB' );
		$( '#infoOk' ).toggleClass( 'hide', data.db === '0.00' );
	}, 300 );
}
function psWlan( data ) {
	if ( data && 'reboot' in data ) {
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
			, oklabel : ico( 'reboot' ) +'Reboot'
			, okcolor : orange
			, ok      : () => bash( [ 'reboot' ] )
		} );
		return
	}
	
	S.listwl = data;
	renderWlan();
}
//---------------------------------------------------------------------------------------
var dirsystem    = '/srv/http/data/system';
var localhost    = [ 'localhost', '127.0.0.1' ].includes( location.hostname );
var orange       = '#de810e';
var page         = location.href.replace( /.*p=/, '' ).split( '&' )[ 0 ];
var red          = '#bb2828';
var timer;
var pagenext     = {
	  features : [ 'system', 'player' ]
	, player   : [ 'features', 'networks' ]
	, networks : [ 'player', 'system' ]
	, system   : [ 'networks', 'features' ]
}

document.title = page;

localhost ? $( 'a' ).removeAttr( 'href' ) : $( 'a[href]' ).attr( 'target', '_blank' );

$( document ).keyup( function( e ) {
	if ( ! I.hidden ) return
	
	var $focus;
	var key = e.key;
	switch ( key ) {
		case 'Tab':
			$( '#bar-bottom div' ).removeClass( 'bgr' );
			$( '.switchlabel, .setting' ).removeClass( 'focus' );
			setTimeout( () => {
				$focus = $( 'input:checkbox:focus' );
				if ( $focus.length ) {
					$focus.next().addClass( 'focus' );
				}
			}, 0 );
			break;
		case 'Escape':
			$focus = $( '.switchlabel.focus' );
			setTimeout( () => { if ( $focus.length ) $focus.prev().focus() }, 300 );
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
			var id       = $current[ 0 ].id;
			var $next    = key === 'ArrowLeft' ? $( '#'+ pagenext[ id ][ 0 ] ) : $( '#'+ pagenext[ id ][ 1 ] );
			$( '#bar-bottom div' ).removeClass( 'bgr' );
			if ( ! $next.hasClass( 'active' ) ) $next.addClass( 'bgr' );
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
	if ( ! $this.hasClass( 'single' ) ) {
		var id    = $this.data( 'status' );
		var $code = $( '#code'+ id );
		$code.hasClass( 'hide' ) ? currentStatus( id ) : $code.addClass( 'hide' );
	}
} );
$( '.close' ).click( function() {
	if ( page !== 'system' ) {
		location.href = '/'; 
		return
	}
	
	bash( [ 'rebootlist' ], list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		info( {
			  icon    : page
			, title   : 'System Setting'
			, message : 'Reboot required for:<br><br>'
						+'<pre><wh>'+ list +'</wh></pre>'
			, cancel  : () => location.href = '/'
			, okcolor : orange
			, oklabel : ico( 'reboot' ) +'Reboot'
			, ok      : () => bash( [ 'cmd', 'power', 'reboot' ], nfs => infoPowerNfs( nfs, 'reboot' ) )
		} );
	} );
} );
$( '.page-icon' ).click( function() {
	if ( $.isEmptyObject( S ) ) return
	
	$( '#data' ).html( highlightJSON( S ) )
	$( '.container' ).addClass( 'hide' );
	$( '#button-data, #data' ).removeClass( 'hide' );
	$( 'html, body' ).scrollTop( 0 );
} );
$( '#button-data' ).click( function() {
	$( '#button-data, #data' ).addClass( 'hide' );
	switchSet();
	renderPage();
} ).on( 'mousedown touchdown', function() {
	timer = setTimeout( () => location.reload(), 1000 );
} ).on( 'mouseup mouseleave touchup touchleave', function() {
	clearTimeout( timer );
} );
$( '.helphead' ).click( function() {
	var $this = $( this );
	if ( page === 'addons' ) {
		var hidden = $( '.revisiontext' ).hasClass( 'hide' );
		$this.toggleClass( 'bl', hidden );
		$( '.revisiontext' ).toggleClass( 'hide', ! hidden );
		return
	}
	
	var eltop = $( 'heading' ).filter( ( i, el ) => el.getBoundingClientRect().top > 0 )[ 0 ]; // return 1st element
	if ( eltop ) var offset0 = eltop.getBoundingClientRect().top;
	if ( window.innerHeight > 570 ) {
		var visible = $this.hasClass( 'bl' );
		$this.toggleClass( 'bl', ! visible );
		$( '.section' ).each( ( i, el ) => {
			var $this = $( el );
			if ( $this.hasClass( 'hide' ) ) return
			
			$this.find( '.helpblock' ).toggleClass( 'hide', visible );
		} )
		
	} else {
		var visible = $( '#bar-bottom' ).css( 'display' ) !== 'none';
		$( '#bar-bottom' ).css( 'display', visible ? '' : 'block' );
	}
	if ( eltop ) $( 'html, body' ).scrollTop( eltop.offsetTop - offset0 );
	$( '.sub' ).next().toggleClass( 'hide', visible );
} );
$( '.help' ).click( function() {
	$( this ).parents( '.section' ).find( '.helpblock' ).toggleClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', $( '.helpblock:not( .hide ), .help-sub:not( .hide )' ).length > 0 );
} );

$( '.setting, .switch' ).click( function() {
	if ( V.local ) return
	
	local();
	SW.id    = this.id.replace( 'setting-', '' );
	SW.icon = page !== 'player' ? SW.id : $( this ).closest( '#divoptions' ).length ? 'mpd' : 'volume';
	SW.title = $( this ).parent().prev().find( 'span' ).text();
} );
$( '.switch' ).click( function() {
	var $this   = $( this );
	if ( $this.hasClass( 'custom' ) || $this.hasClass( 'nobanner' ) ) return
	
	var checked = $this.prop( 'checked' );
	if ( $this.hasClass( 'disabled' ) ) {
		$this.prop( 'checked', ! checked );
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : $this.prev().html()
		} );
		return
	}
	
	if ( $this.hasClass( 'common' ) ) {
		if ( checked ) {
			$( '#setting-'+ SW.id ).click();
		} else {
			notify( SW.icon, SW.title, 'Disable ...' );
			bash( [ SW.id, false ] );
			switchDisable();
		}
	} else {
		notify( SW.icon, SW.title, checked );
		bash( [ SW.id, checked ], error => {
			if ( error ) {
				switchDisable();
				bannerHide();
				info( error );
			}
		}, 'json' );
	}
} );
$( '#bar-bottom div' ).click( function() {
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
