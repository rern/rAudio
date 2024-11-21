/*
Naming must be the same for:
	system - NAME.service
	js     - id = icon = NAME, #setting-NAME
	bash   - cmd=NAME, save to NAME.conf
*/
S              = {} // status
SW             = {} // switch
V              = {}

function bannerReset() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( I.timeoutbanner );
	I.timeoutbanner = setTimeout( bannerHide, delay );
}
function contextMenu() {
	$( '#menu' )
		.removeClass( 'hide' )
		.css( 'top', $( '.container' ).scrollTop() + V.li.offset().top + 8 );
	elementScroll( $( '#menu' ) );
}
function currentStatus( id, arg ) {
	var $el = $( '#code'+ id );
	if ( $el.hasClass( 'hide' ) ) var timeoutGet = setTimeout( () => notify( page, 'Status', 'Get data ...' ), 2000 );
	bash( 'data-status.sh '+ id + ( arg ? ' '+ arg : '' ), status => {
		clearTimeout( timeoutGet );
		$el
			.html( status )
			.data( 'status', id )
			.data( 'arg', arg || '' )
			.removeClass( 'hide' );
		if ( id === 'mpdconf' ) {
			setTimeout( () => $( '#codempdconf' ).scrollTop( $( '#codempdconf' ).height() ), 100 );
		} else if ( [ 'albumignore', 'mpdignore' ].includes( id ) ) {
			$( '.container' ).scrollTop( $( '#code'+ id ).offset().top - 90 );
		}
		bannerReset();
	} );
}
function elementScroll( $el ) {
	var menuH   = $el.height();
	var targetB = $el.offset().top + menuH;
	var wH      = window.innerHeight;
	if ( targetB > wH - 40 + $( window ).scrollTop() ) $( '.container' ).animate( { scrollTop: targetB - wH + 42 } );
}
function infoSetting( id, callback ) {
	var filesh = 'settings/data-config.sh '+ id;
	if ( V.debug ) console.log( filesh );
	$.post(
		  'cmd.php'
		, { cmd: 'bash', filesh: filesh }
		, callback || config[ id ]
		, 'json'
	);
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
		bash( 'data-service.sh '+ pkg, status => {
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
function notify( icon, title, message, delay ) {
	if ( typeof message === 'boolean' ) var message = message ? 'Enable ...' : 'Disable ...';
	banner( icon +' blink', title, message, delay || -1 );
}
function notifyCommon( message ) {
	if ( typeof message === 'boolean' ) {
		message = message ? 'Enable ...' : 'Disable ...';
	} else if ( ! message ) {
		message = ! ( SW.id in S ) || S[ SW.id ] ? 'Change ...' : 'Enable ...';
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
	
	bash( page +'-data.sh', data => {
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
	SWreset();
}
function switchSet() {
	if ( page === 'camilla' && V.tab !== 'devices' ) return
	
	$( '.switch' ).each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
	$( '.setting' ).each( ( i, el ) => {
		var id = el.id.slice( 8 ); // setting-id > id
		$( el ).toggleClass( 'hide', ! S[ id ] || ! ( id in config ) )
	} );
	$( 'pre.status:not( .hide )' ).each( ( i, el ) => currentStatus( $( el ).data( 'status' ), $( el ).data( 'arg' ) ) );
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
		case 'relays':    psRelays( data );    break;
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
			render.bluetooth();
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
		render.bluetooth();
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
		S.liststorage = data.list;
		renderStorage();
		if ( ! $( '#data' ).hasClass( 'hide' ) ) $( '#data' ).html( highlightJSON( S ) )
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
			, ok      : () => bash( [ 'power.sh', 'reboot' ] )
		} );
		return
	}
	
	$.each( data, ( k, v ) => { S[ k ] = v } );
	render.wlan();
}
//---------------------------------------------------------------------------------------
document.title = page === 'camilla' ? 'Camilla DSP' : capitalize( page );
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
} );
$( '#button-data' ).on( 'click', function() {
	switchSet();
	renderPage();
	$( '#button-data, #data' ).addClass( 'hide' );
} );
$( '.container' ).on( 'click', '.status .headtitle, .col-l.status', function() {
	var $this = $( this );
	var id    = $this.data( 'status' );
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
		$( '.helpblock' ).removeClass( 'hide' );
	}
} );
$( '#close' ).on( 'click', function() {
	bash( 'data-config.sh reboot', list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		var message = '<wh>Reboot required for:</wh>';
		list.split( '/' ).forEach( id => {
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
	}, 'text' );
} );
$( '.help' ).on( 'click', function() {
	var $this  = $( this );
	$this.toggleClass( 'bl' );
	var $helpblock = $this.parent().prop( 'id' ) ? $this.parent().next() : $this.parents( '.section' ).find( '.helpblock' );
	$helpblock.toggleClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', $( '.help' ).hasClass( 'bl' ) );
} );
$( '#bar-bottom div' ).on( 'click', function() {
	loader();
	location.href = 'settings.php?p='+ this.id;
} );
if ( $( '#menu' ).length ) {
	$( 'body' ).on( 'click', function( e ) {
		$( '#menu' ).addClass( 'hide' );
		$( 'li' ).removeClass( 'active' );
		if ( ! $( e.target ).is( 'pre.status' ) ) $( '.entries' ).siblings( 'pre' ).last().addClass( 'hide' );
	} );
}
$( '.switch, .setting, .col-r input' ).on( 'click', function() {
	if ( V.local ) return
	
	local();
	var id   = this.id.replace( 'setting-', '' );
	var icon = id;
	if ( page === 'player' ) {
		icon = 'mpd';
	} else if ( page === 'camilla' ) {
		icon = V.tab || 'camilladsp';
	}
	SW = {
		  id    : id
		, icon  : icon
		, title : $( '#div'+ id +' .col-l .label' ).text()
	}
} );
$( '.switch' ).on( 'click', function() {
	var id = SW.id;
	var $this   = $( this );
	var checked = $this.prop( 'checked' );
	if ( $this.hasClass( 'disabled' ) ) {
		$this.prop( 'checked', ! checked );
		info( {
			  ...SW
			, message : $this.prev().html()
		} );
	} else if ( checked ) {
		$( '#setting-'+ id ).trigger( 'click' );
	} else {
		if ( page === 'camilla' ) {
			DEV[ id ] = null;
			setting.save( SW.title, 'Disable ...' );
			$( '#setting-'+ id ).addClass( 'hide' );
		} else if ( '_disable' in config && id in config._disable ) {
			config._disable[ id ]();
		} else {
			notifyCommon( 'Disable ...' );
			bash( [ id, 'OFF' ] );
		}
	}
} );
$( '.setting' ).on( 'click', function() {
	var id = SW.id;
	if ( id in config ) {
		var set_id = config[ id ];
		if ( set_id.toString()[ 0 ] === '(' ) { // no data to get
			set_id();
		} else {
			infoSetting( id );
		}
	} else {
		S[ id ] = true;
		notifyCommon( S[ id ] );
		bash( [ id ], error => {
			if ( error ) {
				S[ id ] = false;
				$( '#setting-'+ id ).addClass( 'hide' );
				bannerHide();
				info( {
					  ...SW
					, message : error
				} );
			}
		}, 'text' );
	}
} );
