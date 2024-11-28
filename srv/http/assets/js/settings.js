/*
Naming must be the same for:
	system - NAME.service
	js     - id = icon = NAME, #setting-NAME
	bash   - cmd=NAME, save to NAME.conf
*/
S              = {} // status
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
	
	if ( page === 'features' && ! /features$/.test( window.location.href ) ) { // authorization: spotify / scrobble
		util.redirect();
		return
	}
	
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
	$( '#'+ SW.id )
		.prop( 'checked', S[ SW.id ] )
		.toggleClass( 'disabled', SW.disabled );
	delete SW;
	bannerHide();
}
function switchEnable() {
	var infoval = infoVal();
	var keys  = Object.keys( infoval );
	var values  = Object.values( infoval );
	var CMD_CFG = I.fileconf ? 'CFG ' : 'CMD ';
	notifyCommon();
	bash( [ SW.id, ...values, CMD_CFG + keys.join( ' ' ) ] );
	delete SW;
}
function switchSet() {
	var $switch = $( '.switch' );
	$switch.removeClass( 'disabled' );
	$switch.each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
	$( '.setting' ).each( ( i, el ) => {
		var $this = $( el );
		var id    = el.id.slice( 8 ); // setting-id > id
		id in config ? $this.toggleClass( 'hide', S[ id ] === false ) : $this.remove();
	} );
	$( 'pre.status:not( .hide )' ).each( ( i, el ) => currentStatus( $( el ).data( 'status' ), $( el ).data( 'arg' ) ) );
}

function psOnMessage( channel, data ) {
	switch ( channel ) {
		case 'bluetooth': ps.bluetooth( data ); break;
		case 'camilla':   ps.camilla( data );   break;
		case 'mpdplayer':
		case 'mpdradio':  ps.mpdPlayer( data ); break;
		case 'mpdupdate': ps.mpdUpdate( data ); break; // in player.js
		case 'notify':    ps.notify( data );    break; // in common.js
		case 'player':    ps.player( data );    break;
		case 'power':     ps.power( data );     break; // in common.js
		case 'reboot':    ps.reboot( data );    break;
		case 'refresh':   ps.refresh( data );   break;
		case 'relays':    ps.relays( data );    break; // in common.js
		case 'reload':    ps.reload( data );    break;
		case 'storage':   ps.storage( data );   break; // in system.js
		case 'volume':    ps.volume( data );    break; // in player.js
		case 'wlan':      ps.wlan( data );      break;
	}
}
ps = {
	  ...ps // from settings.js
	, bluetooth : data => { // from networks-data,sh
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
	, camilla   : data => {
		S.range = data;
		$( '#volume' ).prop( { min: S.range.VOLUMEMIN, max: S.range.VOLUMEMAX } )
		$( '.tab input[type=range]' ).prop( { min: S.range.GAINMIN, max: S.range.GAINMAX } );
	}
	, mpdPlayer : data => {
		if ( ! [ 'camilla', 'player' ].includes( page ) ) return
		
		[ 'player', 'state' ].forEach( k => S[ k ] = data[ k ] );
		playbackButton();
	}
	, mpdUpdate : () => {
		return
	}
	, player    : data => {
		var player_id = {
			  airplay   : 'shairport-sync'
			, bluetooth : 'bluetooth'
			, snapcast  : 'snapserver'
			, spotify   : 'spotifyd'
			, upnp      : 'upmpdcli'
		}
		$( '#'+ player_id[ data.player ] ).toggleClass( 'disabled', data.active );
	}
	, reboot    : data => {
		var msg = '';
		data.id.forEach( id => msg += '<div> • '+ $( '#div'+ id +' .label' ).text() +'</div>' );
		banner( 'reboot', 'Reboot required', msg, 5000 );
	}
	, refresh   : data => {
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
	, reload    : data => {
		if ( localhost ) location.reload();
	}
	, storage   : data => { // system.js
		return
	}
	, volume    : () => { // camilla.js, player.js, system.js
		return
	}
	, wlan      : data => {
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
}
//---------------------------------------------------------------------------------------
document.title = page === 'camilla' ? 'CamillaDSP' : capitalize( page );
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
	if ( page === 'camilla' && S.state === 'pause' ) render.statusStop();
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
		list.split( '\n' ).forEach( id => {
			message += '<br>'+ ico( id ) +' '+ $( '#div'+ id +' .label' ).eq( 0 ).text();
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
$( '.switch, .setting' ).on( 'click', function() {
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
		  id       : id
		, icon     : icon
		, title    : $( '#div'+ id +' .col-l .label' ).text()
		, disabled : $( this ).hasClass( 'disabled' )
	}
} );
$( '.switch' ).on( 'click', function() {
	var id = SW.id;
	var $this   = $( this );
	var checked = $this.prop( 'checked' );
	if ( $this.hasClass( 'disabled' ) ) {     // disabled
		$this.prop( 'checked', ! checked );
		info( {
			  ...SW
			, message : $this.prev().html()
		} );
		return
	}
	
	$this.addClass( 'disabled' );
	var $setting = $( '#setting-'+ id ); 
	if ( checked ) {                  // enable
		if ( id in config ) {                //    config
			$setting.trigger( 'click' );
		} else if ( id in config._prompt ) { //    prompt
			$this.prop( 'checked', false );
			config._prompt[ id ]();
		} else {                             //    no config
			S[ id ] = true;
			notifyCommon( true );
			bash( [ id ], error => {
				if ( error ) {
					S[ id ] = false;
					switchSet();
					bannerHide();
					info( {
						  ...SW
						, message : error
					} );
				}
			}, 'text' );
		}
	} else {                                 // disable
		$( '#setting-'+ id ).addClass( 'hide' );
		if ( page === 'camilla' ) {
			DEV[ id ] = null;
			setting.save( SW.title, 'Disable ...' );
			$setting.addClass( 'hide' );
		} else if ( id in config._disable ) {
			config._disable[ id ]();
		} else {
			notifyCommon( 'Disable ...' );
			bash( [ id, 'OFF' ] );
		}
	}
} );
$( '.setting' ).on( 'click', function() {
	var id = SW.id;
	if ( config[ id ].toString()[ 1 ] === ')' ) { // no data to get
		config[ id ]();
	} else {
		infoSetting( id );
	}
} );
