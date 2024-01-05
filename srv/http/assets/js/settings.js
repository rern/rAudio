/*
Naming must be the same for:
	system - NAME.service
	js     - id = icon = NAME, #setting-NAME
	bash   - cmd=NAME, save to NAME.conf
*/

S              = {} // status
SW             = {} // switch
V              = {} // var global

function bannerReset() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( I.timeoutbanner );
	I.timeoutbanner = setTimeout( bannerHide, delay );
}
function currentStatus( id ) {
	var $el = $( '#code'+ id );
	if ( $el.hasClass( 'hide' ) ) var timeoutGet = setTimeout( () => notify( page, 'Status', 'Get data ...' ), 2000 );
	var services   = [ 'bluealsa',  'bluez',          'camilladsp', 'dabradio',   'hostapd',    'localbrowser', 'mpd'
					 , 'nfsserver', 'shairport-sync', 'smb',        'snapclient', 'snapserver', 'spotifyd',     'upmpdcli' ];
	var command = services.includes( id ) ? [ 'settings/pkgstatus.sh', id ] : [ 'status'+ id ];
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
function infoDisabled( $this ) {
	$this.prop( 'checked', ! $this.prop( 'checked' ) );
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : $this.prev().html()
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
function json2array( keys, json ) {
	if ( ! json ) return false
	
	var values = [];
	keys.forEach( k => values.push( json[ k ] ) );
	return values
}
function list2JSON( list ) {
	if ( list.trim() === 'notrunning' ) {
		var pkg = page === 'player' ? 'mpd' : 'camilladsp';
		bash( [ 'settings/pkgstatus.sh', pkg ], status => {
			var error =  iconwarning +'<c>'+ pkg +'</c> is not running '
						+'<a class="infobtn infobtn-primary restart">'+ ico( 'refresh' ) +'Start</a>'
						+'<hr>'
						+ status;
			$( '#data' )
				.html( error )
				.removeClass( 'hide' )
				.on( 'click', '.restart', function() {
					var cmdsh = page === 'player' ? [ 'settings/player-conf.sh' ] : [ 'settings/camilla.sh', 'restart' ];
					bash( cmdsh, refreshData );
					notify( pkg, pkg, 'Start ...' );
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
function contextMenu() {
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', V.li.offset().top + 48 );
	elementScroll( $( '#menu' ) );
}
function elementScroll( $el ) {
	var menuH = $el.height();
	var targetB = $el.offset().top + menuH;
	var wH      = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
}
function notify( icon, title, message, delay ) {
	if ( typeof message === 'boolean' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( icon +' blink', title, message, delay || -1 );
}
function notifyCommon( message ) {
	if ( ! message ) {
		message = S[ SW.id ] ? 'Change ...' : 'Enable ...';
	} else if ( typeof message === 'boolean' ) {
		message = message ? 'Enable ...' : 'Disable ...';
	}
	banner( SW.icon +' blink', SW.title, message, -1 );
}
function playbackButton() {
	if ( S.pllength ) {
		var btn = S.state === 'play' ? 'pause' : 'play';
	} else {
		var btn = 'play disabled';
	}
	$( '.playback' ).prop( 'class', 'playback i-'+ btn );
}
function refreshData() {
	if ( page === 'guide' || ( I.active && ! I.rangelabel ) ) return
	
	bash( [ 'settings/'+ page +'-data.sh' ], data => {
		if ( ! list2JSON( data ) ) return // on load, try catching any errors
		
		if ( $( '#data' ).hasClass( 'hide' ) || $( '#data .infobtn' ).length ) {
			$( '#data' ).empty();
			$( '#button-data, #data' ).addClass( 'hide' );
			switchSet();
			renderPage();
		} else {
			page === 'camilla' ? renderPage() : $( '#data' ).html( highlightJSON( S ) );
			$( '#button-data, #data' ).removeClass( 'hide' );
		}
	} );
}
function showContent() {
	V.ready ? delete V.ready : bannerReset();
	if ( $( 'select' ).length ) selectSet( $( 'select' ) );
	$( '.container' ).removeClass( 'hide' );
	loaderHide();
}
function switchCancel() {
	$( '#'+ SW.id ).prop( 'checked', S[ SW.id ] );
	SWreset();
	bannerHide();
}
function switchEnable() {
	var infoval = infoVal();
	var keys  = Object.keys( infoval );
	var values  = Object.values( infoval );
	var CMD_CFG = I.fileconf ? 'CFG ' : 'CMD ';
	notifyCommon();
	bash( [ SW.id, ...values, CMD_CFG + keys.join( ' ' ) ] );
	S[ SW.id ] = true;
	SWreset();
}
function switchIdIconTitle( id ) {
	id       = id.replace( 'setting-', '' );
	SW.id    = id;
	SW.title = $( '#div'+ id +' .label' ).text();
	if ( page === 'player' ) {
		SW.icon  =  $( '#divoptions #'+ id ).length ? 'mpd' : 'volume';
	} else {
		SW.icon  = id === 'localbrowser' ? 'firefox' : id;
	}
}
function switchSet() {
	if ( page === 'networks' ) return
	
	$( '.switch' ).each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
	$( '.setting' ).each( ( i, el ) => {
		var $this = $( el );
		if ( ! $this.prev().find( '.switchlabel' ).length ) return // not switch
		
		var sw = el.id.replace( 'setting-', '' );
		$this.toggleClass( 'hide', ! S[ sw ] );
	} );
	$( 'pre.status' ).each( ( i, el ) => { // refresh code block
		if ( ! $( el ).hasClass( 'hide' ) ) currentStatus( el.id.replace( /^code/, '' ) ); // codeid > id
	} );
}
function SWreset() {
	[ 'id', 'icon', 'title' ].forEach( k => delete SW[ k ] );
}

function psOnMessage( message ) {
	var json    = JSON.parse( message.data );
	var channel = json.channel;
	var data    = json.data;
	switch ( channel ) {
		case 'bluetooth': psBluetooth( data ); break;
		case 'camilla':   psCamilla( data );   break;
		case 'mpdplayer':
		case 'mpdradio':  psMpdPlayer( data ); break;
		case 'notify':    psNotify( data );    break; // in common.js
		case 'player':    psPlayer( data );    break;
		case 'power':     psPower( data );     break;
		case 'refresh':   psRefresh( data );   break;
		case 'reload':    psReload( data );    break;
		case 'storage':   psStorage( data );   break;
		case 'volume':    psVolume( data );    break;
		case 'wlan':      psWlan( data );      break;
	}
}
function psBluetooth( data ) { // from networks-data,sh
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
	bannerHide();
}
function psCamilla( data ) {
	S.range = data;
	$( '#volume' ).prop( { min: S.range.VOLUMEMIN, max: S.range.VOLUMEMAX } )
	$( '.tab input[type=range]' ).prop( { min: S.range.GAINMIN, max: S.range.GAINMAX } );
}
function psMpdPlayer( data ) {
	if ( ! [ 'camilla', 'player' ].includes( page ) ) return
	
	[ 'player', 'state' ].forEach( k => S[ k ] = data[ k ] );
	playbackButton();
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
	
	if ( V.local && page === 'camilla' ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		page === 'networks' ? $( '.back' ).trigger( 'click' ) : switchSet();
		renderPage();
	}, 300 );
}
function psReload( data ) {
	if ( localhost ) location.reload();
}
function psStorage( data ) {
	if ( page === 'system' ) {
		S.list = data.list;
		renderStorage();
	}
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
	
	$.each( data, ( k, v ) => { S[ k ] = v } );
	renderWlan();
}
//---------------------------------------------------------------------------------------
var dirsystem  = '/srv/http/data/system';
var page       = location.href.replace( /.*p=/, '' ).split( '&' )[ 0 ];
var pagenext   = {
	  features : [ 'system', 'player' ]
	, player   : [ 'features', 'networks' ]
	, networks : [ 'player', 'system' ]
	, system   : [ 'networks', 'features' ]
}

$( '#'+ page ).addClass( 'active' );

document.title = page === 'camilla' ? 'Camilla DSP' : page[ 0 ].toUpperCase() + page.slice( 1 );

localhost ? $( 'a' ).removeAttr( 'href' ) : $( 'a[href]' ).attr( 'target', '_blank' );

$( document ).on( 'keyup', function( e ) {
	if ( I.active || page === 'camilla' ) return
	
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
				$( '#bar-bottom .bgr' ).trigger( 'click' );
			} else {
				$focus = $( '.setting.focus' );
				if ( $focus.length ) $focus.trigger( 'click' );
			}
			break;
	}
} );
$( '.page-icon' ).on( 'click', function() {
	if ( $.isEmptyObject( S ) ) return
	
	$( '#data' ).html( highlightJSON( S ) )
	$( '.container' ).addClass( 'hide' );
	$( '#button-data, #data' ).removeClass( 'hide' );
	$( 'html, body' ).scrollTop( 0 );
} );
$( '#button-data' ).on( 'click', function() {
	switchSet();
	renderPage();
	$( '#button-data, #data' ).addClass( 'hide' );
} );
$( '.container' ).on( 'click', '.status .headtitle, .col-l.status', function() {
	var $this = $( this );
	var id    = $this.hasClass( 'col-l' ) ? $this.data( 'status' ) : $this.parent().data( 'status' );
	var $code = $( '#code'+ id );
	$code.hasClass( 'hide' ) ? currentStatus( id ) : $code.addClass( 'hide' );
} );
$( '.playback' ).on( 'click', function() { // for player and camilla
	S.state = S.state === 'play' ? 'pause' : 'play';
	if ( page === 'camilla' && S.state === 'pause' ) render.vuClear();
	playbackButton();
	bash( [ 'cmd.sh', 'mpcplayback' ] );
} );
$( '.helphead' ).on( 'click', function() {
	var $this  = $( this );
	var active = $this.hasClass( 'bl' );
	$this.toggleClass( 'bl' );
	if ( active ) {
		$( '.help' ).removeClass( 'bl' );
		$( '.helpblock' ).addClass( 'hide' );
	} else {
		$( '.help' ).addClass( 'bl' );
		$( '.helpblock' ).removeClass( 'hide' );
	}
} );
$( '.close' ).on( 'click', function() {
	location.href = '/';
} );
$( '.help' ).on( 'click', function() {
	var $this  = $( this );
	$this.toggleClass( 'bl' );
	$this.parents( '.section' ).find( '.helpblock' ).toggleClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', $( '.help' ).hasClass( 'bl' ) );
} );
$( '.setting, .switch' ).on( 'click', function() {
	if ( V.local ) return
	
	local();
	switchIdIconTitle( this.id );
} );
$( '.switch' ).on( 'click', function() {
	if ( V.press ) return
	
	var $this   = $( this );
	if ( $this.hasClass( 'disabled' ) ) {
		infoDisabled( $this );
		return
	}
	
	if ( $this.is( '.custom, .none' ) ) return
	
	var checked = $this.prop( 'checked' );
	if ( ! checked ) {
		$( '#setting-'+ SW.id ).addClass( 'hide' );
		notifyCommon( 'Disable ...' );
		bash( [ SW.id, 'OFF' ] );
		S[ SW.id ] = false;
		return
	}
	
	if ( $this.hasClass( 'common' ) ) {
		$( '#setting-'+ SW.id ).trigger( 'click' );
	} else {
		S[ SW.id ]  = true;
		notifyCommon( checked );
		bash( [ SW.id ], error => {
			if ( error ) {
				S[ SW.id ] = false;
				$( '#setting-'+ SW.id ).addClass( 'hide' );
				bannerHide();
				info( {
					  icon    : SW.icon
					, title   : SW.title
					, message : error
				} );
			}
		}, 'json' );
	}
} );
$( '#bar-bottom div' ).on( 'click', function() {
	if ( page === 'camilla' ) return
	
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
