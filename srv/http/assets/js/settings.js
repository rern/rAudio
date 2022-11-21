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
var dirbash    = '/srv/http/bash/settings/';
var playersh   = dirbash +'player.sh ';
var networkssh = dirbash +'networks.sh ';
var systemsh   = dirbash +'system.sh ';
var cmd        = {
	  albumignore  : playersh   +'albumignore'
	, asound       : playersh   +'devices'
	, avahi        : networkssh +'avahi'
	, bluetooth    : playersh   +'bluetoothinfo'
	, btcontroller : networkssh +'btcontroller'
	, iw           : networkssh +'iwlist'
	, journalctl   : systemsh   +'journalctl'
	, lan          : networkssh +'ifconfigeth'
	, mount        : systemsh   +'storage'
	, mpdignore    : playersh   +'mpdignorelist'
	, nonutf8      : playersh   +'nonutf8'
	, rfkill       : systemsh   +'rfkilllist'
	, shareddata   : systemsh   +'shareddataname'
	, soundprofile : systemsh   +'soundprofileget'
	, system       : systemsh   +'systemconfig'
	, timedatectl  : systemsh   +'timedate'
	, wlan         : networkssh +'ifconfigwlan'
}
var services   = [ 'camilladsp',    'rtsp-simple-server', 'hostapd',    'localbrowser', 'mpd',      'nfs-server'
				 , 'shairport-sync', 'smb',               'snapclient', 'spotifyd',     'upmpdcli' ];

function bannerReset() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( G.timeoutbanner );
	G.timeoutbanner = setTimeout( bannerHide, delay );
}
function cancelSwitch( id ) {
	$( '#'+ id ).prop( 'checked', G[ id ] );
}
function copy2clipboard( txt ) { // for non https which cannot use clipboard API
	$( 'body' ).append( '<textarea id="error">'+ txt +'</textarea>' );
	$( '#error' ).focus().select();
	document.execCommand( 'copy' );
	$( '#error' ).remove();
}
function currentStatus( id, refresh ) {
	var $el = $( '#code'+ id );
	if ( ! refresh && ! $el.hasClass( 'hide' ) ) {
		$el.addClass( 'hide' );
		return
	}
		
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
function highlightJSON( json ) {
	var json = Object.keys( json )
					.sort()
					.reduce( ( r, k ) => ( r[ k ] = json[ k ], r ), {} ); // https://stackoverflow.com/a/29622653
	json = JSON.stringify( json, null, '\t' );
	return json.replace( /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|[{}\[\]]/g, function( match ) {
		if ( /^"/.test( match ) ) {              // string
			if ( /:$/.test( match ) ) { // key
				return match
			} else {                    // value
				return '<yl>'+ match +'</yl>'
			}
		} else if ( /true/.test( match ) ) {     // true
			return '<grn>'+ match +'</grn>'
		} else if ( /false/.test( match ) ) {    // false
			return '<red>'+ match +'</red>'
		} else if ( /[0-9]/.test( match ) ) {    // number
			return '<ora>'+ match +'</ora>'
		} else if ( /[{}\[\]]/.test( match ) ) { // braces
			return '<pur>'+ match +'</pur>'
		}
	} ); // source: https://stackoverflow.com/a/7220510
}
function list2JSON( list ) {
	try {
		G = JSON.parse( list );
	} catch( e ) {
		if ( list.trim() === 'mpdnotrunning' ) {
			bash( [ 'pkgstatus', 'mpd' ], status => {
				var error =  iconwarning +'MPD is not running '
							+'<a class="infobtn infobtn-primary restart">Start</a>'
							+'<hr>'
							+ status;
				listError( error );
				$( '#data' ).on( 'click', '.restart', function() {
					bash( '/srv/http/bash/settings/player-conf.sh', refreshData );
					notify( 'mpd', 'MPD', 'Start ...' );
				} );
			} );
		} else {
			var msg   = e.message.split( ' ' );
			var pos   = msg.pop();
			var error =  iconwarning +'<red>Errors:</red> '+ msg.join( ' ' ) +' <red>'+ pos +'</red> '
						+'<a class="infobtn infobtn-primary copy">Copy</a>'
						+'<hr>'
						+ list.slice( 0, pos ) +'<red>&#9646;</red>'+ list.slice( pos );
			listError( error );
			$( '#data' ).on( 'click', '.copy', function() {
				copy2clipboard( 'Errors: '+ msg.join( ' ' ) +' '+ pos +'\n'+ list );
				banner( 'warning', 'Errors', 'Data copied to clipboard.' );
			} );
		}
		return false
	}
	// no errors
	if ( $( '#data .fa-warning' ).length ) $( '#data' ).empty().addClass( 'hide' );
	return true
}
function listError( error ) {
	$( '.container' ).addClass( 'hide' );
	$( '#data' )
		.html( error )
		.removeClass( 'hide' );
	loaderHide();
}
function notify( icon, title, message, delay ) {
	if ( typeof message === 'boolean' || typeof message === 'number' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( icon +' blink', title, message, delay || -1 );
}
function refreshData() {
	if ( page === 'addons' || page === 'guide' || ! I.infohide ) return
	
	bash( dirbash + page +'-data.sh', list => {
		if ( typeof list === 'string' ) { // on load, try catching any errors
			var list2G = list2JSON( list );
		} else {
			G = list;
		}
		if ( ! list2G ) return
		
		if ( $( '#data' ).hasClass( 'hide' ) )  {
			setSwitch();
			renderPage();
		} else {
			$( '#data' ).html( highlightJSON( G ) )
		}
	} );
}
function setSwitch() {
	if ( page !== 'networks' && page !== 'relays' ) {
		$( '.switch' ).each( ( i, el ) => $( el ).prop( 'checked', G[ el.id ] ) );
		$( '.setting' ).each( ( i, el ) => {
			var $this = $( el );
			if ( $this.prev().is( 'select' ) ) return // not switch
			
			var sw = el.id.replace( 'setting-', '' );
			$this.toggleClass( 'hide', ! G[ sw ] );
		} );
	}
}
function showContent() {
	G.ready ? delete G.ready : bannerReset();
	if ( $( 'select' ).length ) selectricRender();
	if ( page !== 'networks' ) {
		$( 'pre.status' ).each( ( i, el ) => {
			if ( ! $( el ).hasClass( 'hide' ) ) currentStatus( el.id.replace( 'code', '' ), 'refresh' );
		} );
	}
	$( '.head, .container, #bar-bottom' ).removeClass( 'hide' );
	loaderHide();
}
// pushstreamChannel() in common.js
pushstreamChannel( [ 'bluetooth', 'notify', 'player', 'refresh', 'reload', 'volume', 'volumebt', 'wlan' ] );
function pushstreamDisconnect() {
	if ( page === 'networks' ) {
		if ( ! $( '#divbluetooth' ).hasClass( 'hide' ) || ! $( '#divwifi' ).hasClass( 'hide' ) ) {
			bash( 'killall -q networks-scan.sh &> /dev/null' );
			clearTimeout( G.timeoutScan );
			$( '#scanning-bt, #scanning-wifi' ).removeClass( 'blink' );
			$( '.back' ).click();
		}
	} else if ( page === 'system' ) {
		if ( $( '#refresh' ).hasClass( 'blink' ) ) {
			clearInterval( G.intCputime );
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
		case 'volumebt':  psVolumeBt( data );  break;
		case 'wlan':      psWlan( data );      break;
	}
}
function psBluetooth( data ) {
	if ( ! data ) {
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
	var icon     = data.icon;
	var title    = data.title;
	var message  = data.message;
	var delay    = data.delay;
	G.bannerhold = data.hold || 0;
	banner( icon, title, message, delay );
	if ( title === 'Power' || title === 'rAudio' ) pushstreamPower( message );
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
		$.each( data, ( k, v ) => { G[ k ] = v } ); // need braces
		page === 'networks' ? $( '.back' ).click() : setSwitch();
		renderPage();
	}
}
function psReload( data ) {
	if ( localhost ) location.reload();
}
function psVolume( data ) {
	if ( ! $( '#infoRange .value' ).text() ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( () => {
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
	if ( ! $( '#infoRange .value' ).text() ) return
	
	$( '#infoRange .value' ).text( data.val );
	$( '#infoRange input' ).val( data.val );
	$( '.infofooter' ).text( data.db +' dB' );
	$( '#infoButtons' ).toggleClass( 'hide', data.db === '0.00' );
}
function psWlan( data ) {
	if ( data && 'reboot' in data ) {
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
			, oklabel : '<i class="fa fa-reboot"></i>Reboot'
			, okcolor : orange
			, ok      : () => bash( [ 'reboot' ] )
		} );
		return
	}
	
	G.listwl = data;
	renderWlan();
}
//---------------------------------------------------------------------------------------
var debounce;
var dirsystem    = '/srv/http/data/system';
var intervalcputime;
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
var $focus;
var selectchange = 0;

document.title   = page;

if ( localhost ) {
	$( 'a' ).removeAttr( 'href' );
} else {
	$( 'a[href]' ).attr( 'target', '_blank' );
}

$( document ).keyup( function( e ) {
	if ( ! I.infohide ) return
	
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
	if ( ! $this.hasClass( 'single' ) ) currentStatus( $this.data( 'status' ) );
} );
$( '.close' ).click( function() {
	if ( page !== 'system' ) {
		location.href = '/';
		retuirn
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
			, cancel  : () => {
				bash( 'rm -f /srv/http/data/shm/reboot /srv/http/data/tmp/backup.*' );
				location.href = '/';
			}
			, okcolor : orange
			, oklabel : '<i class="fa fa-reboot"></i>Reboot'
			, ok      : () => bash( [ 'cmd', 'power', 'reboot' ], nfs => infoPowerNfs( nfs, 'reboot' ) )
		} );
	} );
} );
$( '.page-icon' ).click( function() {
	if ( $.isEmptyObject( G ) ) return
	
	$( '#data' )
		.html( highlightJSON( G ) )
		.removeClass( 'hide' );
	$( '.head, .container, #bar-bottom' ).addClass( 'hide' );
} );
$( '#button-data' ).click( function() {
	$( '#data' ).addClass( 'hide' );
	setSwitch();
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
$( '.switch:not( .custom )' ).click( function() {
	var id      = this.id;
	var $this   = $( this );
	var checked = $this.prop( 'checked' );
	var label   = $this.data( 'label' );
	var icon    = $this.data( 'icon' );
	if ( $this.hasClass( 'disabled' ) ) {
		$this.prop( 'checked', ! checked );
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
			notify( icon, label, 'Disable ...' );
			bash( [ id, false ] );
		}
	} else {
		notify( icon, label, checked );
		bash( [ id, checked ], error => {
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
