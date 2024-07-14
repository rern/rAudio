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
	if ( id === 'bluetoothlist' ) return
	
	var $el      = $( '#code'+ id );
	if ( $el.hasClass( 'hide' ) ) var timeoutGet = setTimeout( () => notify( page, 'Status', 'Get data ...' ), 2000 );
	var services = [ 'ap',        'bluealsa',       'bluez', 'camilladsp', 'dabradio',   'localbrowser', 'mpd'
					 , 'nfsserver', 'shairport-sync', 'smb',   'snapclient', 'snapserver', 'spotifyd',     'upmpdcli' ];
	bash( services.includes( id ) ? [ 'servicestatus.sh', id ] : [ 'status'+ id ], status => {
		clearTimeout( timeoutGet );
		$el.html( status + '<br>&nbsp;' ).promise().done( () => {
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
function json2array( keys, json ) {
	if ( ! json ) return false
	
	var values = [];
	keys.forEach( k => values.push( json[ k ] ) );
	return values
}
function list2JSON( list ) {
	if ( list.trim() === 'notrunning' ) {
		var pkg = page === 'player' ? 'mpd' : 'camilladsp';
		bash( [ 'servicestatus.sh', pkg ], status => {
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
		.css( 'top', V.li.offset().top + 8 );
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
	if ( typeof message === 'boolean' ) {
		message = message ? 'Enable ...' : 'Disable ...';
	} else if ( ! message ) {
		message = S[ SW.id ] ? 'Change ...' : 'Enable ...';
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
	$( 'heading:not( .hide ) i, .switchlabel, .setting, input:text, .entries:not( .hide ) li:not( .lihead )' ).prop( 'tabindex', 0 );
	$( '.container' )
		.removeClass( 'hide' )
		.trigger( 'focus' );
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
	SW.title = $( '#div'+ id +' .col-l .label' ).text();
	if ( page === 'player' ) {
		SW.icon  =  $( '#divoptions #'+ id ).length ? 'mpd' : 'volume';
	} else {
		SW.icon  = id;
	}
}
function switchSet( ready ) {
	if ( page === 'camilla' && ! ready ) return // wait for GetConfigJson
	
	$( '.switch' ).each( ( i, el ) => {
		var $this = $( el );
		var id    = el.id
		$this.prop( 'checked', S[ id ] );
		$this.parent().next( '.setting' ).toggleClass( 'hide', ! S[ id ] );
	} );
	$( 'pre.status' ).each( ( i, el ) => { // refresh code block
		if ( el.id === 'codehddinfo' ) return
		
		if ( ! $( el ).hasClass( 'hide' ) ) currentStatus( el.id.replace( /^code/, '' ) ); // codeid > id
	} );
}
function SWreset() {
	[ 'id', 'icon', 'title' ].forEach( k => delete SW[ k ] );
}

function psOnMessage( channel, data ) {
	switch ( channel ) {
		case 'bluetooth': psBluetooth( data ); break;
		case 'camilla':   psCamilla( data );   break;
		case 'mpdplayer':
		case 'mpdradio':  psMpdPlayer( data ); break;
		case 'mpdupdate': psMpdUpdate( data ); break;
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
function psMpdUpdate( data ) {
	if ( page === 'player' && 'done' in data ) {
		S.counts     = data.done;
		S.updatetime = data.updatetime
		renderStatus();
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
	if ( data.page !== page ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		if ( page === 'networks' ) {
			if ( $( '#divinterface' ).hasClass( 'hide' ) ) $( '.back' ).trigger( 'click' );
		} else {
			switchSet();
		}
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
		$( '#codehddinfo' )
			.addClass( 'hide' )
			.empty();
	}
}
function psVolume() {
	return
}
function psWlan( data ) {
	if ( data && 'reboot' in data ) {
		info( {
			  icon    : 'wifi'
			, title   : 'Wi-Fi'
			, message : 'Reboot to connect <wh>'+ data.ssid +'</wh> ?'
			, oklabel : ico( 'reboot' ) +'Reboot'
			, okcolor : orange
			, ok      : () => bash( [ 'power.sh', 'reboot' ] )
		} );
		return
	}
	
	$.each( data, ( k, v ) => { S[ k ] = v } );
	renderWlan();
}
//---------------------------------------------------------------------------------------
document.title = page === 'camilla' ? 'Camilla DSP' : page[ 0 ].toUpperCase() + page.slice( 1 );
localhost ? $( 'a' ).removeAttr( 'href' ) : $( 'a[href]' ).attr( 'target', '_blank' );
$( '#'+ page ).addClass( 'active' );

$( document ).on( 'keydown', function( e ) {
	if ( I.active ) return
	
	var camilla = page === 'camilla';
	var menu    = $( '.menu' ).length && ! $( '.menu' ).hasClass( 'hide' );
	var tabs    = ! $( '#fader' ).hasClass( 'hide' );
	var key     = e.key;
	switch ( key ) {
		case 'ArrowDown':
		case 'ArrowUp':
			if ( V.select2 ) return
			
			e.preventDefault();
			if ( ! camilla && tabs ) return
			
			if ( menu ) {
				focusNext( $( '.menu a:not( .hide )' ), 'active', key );
				return
			}
			
			var index = 0;
			var $tabs = $( '[ tabindex=0 ]:not( .menu a )' ).filter( ( i, el ) => {
				if ( $( el ).parents( '.section' ).hasClass( 'hide' )
					|| $( el ).parents( '.row' ).hasClass( 'hide' )
					|| $( el ).is( '.setting.hide' )
				) return
					
				return $( el )
			} );
			focusNext( $tabs, 'focus', key );
			break
		case 'ArrowLeft':
		case 'ArrowRight':
			if ( menu ) {
				if ( key === 'ArrowLeft' ) $( '.menu' ).addClass( 'hide' );
			} else if ( $( 'pre.status:not( .hide )' ).length ) {
				$( 'pre.status' ).addClass( 'hide' );
			} else if ( $( '.entries li:focus' ).length ) {
				var $target = $( '.entries li:focus' );
				if ( camilla ) $target = $target.find( '.liicon' );
				$target.trigger( 'click' );
			} else if ( tabs ) {
				focusNext( $( '#bar-bottom div' ), 'focus', key );
			}
			break
		case ' ':
		case 'Enter':
			var $focus = $( document.activeElement );
			if ( ! $focus.length ) return
			
			e.preventDefault();
			if ( menu ) {
				V.li = $( '.entries li.active' );
				$focus.trigger( 'click' );
				return
			}
			
			if ( $focus.hasClass( 'switchlabel' ) ) $focus = $focus.prev();
			$focus.trigger( 'click' );
			$( '#fader' ).addClass( 'hide' );
			$( '#bar-bottom div' )
				.removeClass( 'focus' )
				.trigger( 'blur' );
			break
		case 'Alt':
		case 'Escape':
			e.preventDefault();
			if ( menu ) {
				$( '.menu' ).addClass( 'hide' );
			} else if ( V.select2 ) {
				$( '.select2-hidden-accessible' ).select2( 'close' );
			} else if ( ! $( '#data' ).hasClass( 'hide' ) ) {
				$( '#button-data' ).trigger( 'click' );
			} else if ( $( '#bar-bottom div:focus' ).length ) {
				$( '#fader' ).addClass( 'hide' );
				$( '#bar-bottom div' ).removeAttr( 'tabindex' );
				$( '.focus' ).trigger( 'focus' );
			} else {
				$( '#fader' ).removeClass( 'hide' );
				$( '#bar-bottom div' ).prop( 'tabindex', 0 );
				var $focus = $( '#bar-bottom div.active' );
				if ( ! $focus.length ) $focus =  $( '#bar-bottom div' ).eq( 0 );
				$focus.trigger( 'focus' );
			}
			break
		case 'Backspace':
			$( '.section:not( .hide ) .i-back' ).trigger( 'click' );
			break
		case 'F1':
			e.preventDefault();
			$( '.helphead' ).trigger( 'click' );
			break
		case 'Tab':
			document.activeElement.scrollIntoView( { block: 'center' } );
			break
		case 'x':
			if ( ! e.ctrlKey ) return
			
			var close = $( '#data' ).hasClass( 'hide' ) ? '#close' : '#button-data .i-close';
			$( close ).trigger( 'click' );
			break
		case 'MediaPause':
		case 'MediaPlay':
		case 'MediaPlayPause':
			if ( [ 'camilla', 'player' ].includes( page ) ) $( '.playback' ).trigger( 'click' );
			break
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
	$this.toggleClass( 'active' );
} );
$( '.playback' ).on( 'click', function() { // for player and camilla
	S.state = S.state === 'play' ? 'pause' : 'play';
	if ( page === 'camilla' && S.state === 'pause' ) render.vuClear();
	playbackButton();
	bash( [ 'cmd.sh', 'mpcplayback' ] );
} );
$( '.head .i-gear' ).on( 'click', function() {
	$( '#bar-bottom' ).toggle();
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
		$( '.helpblock' ).each( ( i, el ) => {
			var $this = $( el );
			if ( $this.prev().hasClass( 'status' ) ) {
				$this.toggleClass( 'hide', $this.prev().hasClass( 'hide' ) );
			} else {
				$this.removeClass( 'hide' );
			}
		} );
	}
} );
$( '#close' ).on( 'click', function() {
	bash( [ 'settings/system.sh', 'rebootlist' ], list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		var message = '<wh>Reboot required for:</wh>';
		list.split( '\n' ).forEach( id => {
			var label = id === 'localbrowser' ? 'Rotate Browser on RPi' : $( '#div'+ id +' .label' ).eq( 0 ).text();
			message += '<br>'+ ico( id ) +' '+ label;
		} );
		info( {
			  icon         : page
			, title        : 'System Setting'
			, message      : message
			, messagealign : 'left'
			, cancel       : () => location.href = '/'
			, okcolor      : orange
			, oklabel      : ico( 'reboot' ) +'Reboot'
			, ok           : () => infoPowerCommand( 'reboot' )
		} );
	} );
} );
$( '.help' ).on( 'click', function() {
	var $this  = $( this );
	$this.toggleClass( 'bl' );
	var $helpblock = $this.parent().prop( 'id' ) ? $this.parent().next() : $this.parents( '.section' ).find( '.helpblock' );
	$helpblock.toggleClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', $( '.help' ).hasClass( 'bl' ) );
} );
$( '.setting, .switch' ).on( 'click', function() {
	if ( V.local ) return
	
	local();
	switchIdIconTitle( this.id );
} );
$( '.switch' ).on( 'click', function() {
	var $this   = $( this );
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
	
	if ( $this.is( '.custom, .none' ) ) return
	
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
