/*
Naming must be the same for:
	system - NAME.service
	js     - id = icon = NAME, #setting-NAME
	bash   - cmd=NAME, save to NAME.conf
*/
W.refresh = data => { // except camilla
	if ( data.page !== page ) return
	
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		switchSet();
		renderPage();
	}, 300 );
}
if ( $( 'heading .playback' ).length ) { // for player and camilla
	W = {
		  ...W // from common.js
		, mpdplayer : data => headIcon( data )
		, mpdradio  : data => headIcon( data )
	}
	function headIcon( data ) {
		if ( data ) {
			if ( ( ! data.player || ! data.state ) || ( data.player === S.player && data.state === S.state ) ) return
			
			S.player = data.player;
			S.state  = data.state;
		}
		$( '.playback' )
			.prop( 'class', 'playback i-'+ ( S.state === 'play' ? 'pause' : 'play' ) )
			.toggleClass( 'disabled', page === 'player' && S.player !== 'mpd' );
		$( 'heading .player' ).prop( 'class', 'player i-'+ S.player );
	}
	$( '.playback' ).on( 'click', function() {
		S.state = S.state === 'play' ? 'pause' : 'play'
		headIcon();
		if ( page === 'camilla' && S.state === 'pause' ) render.statusStop();
		bash( [ 'cmd.sh', S.player === 'mpd' ? 'mpcplayback' : 'playerstop' ] );
	} );
}

function bannerReset() {
	var delay = $( '#bannerIcon i' ).hasClass( 'blink' ) ? 1000 : 3000;
	$( '#bannerIcon i' ).removeClass( 'blink' );
	clearTimeout( I.timeoutbanner );
	I.timeoutbanner = setTimeout( bannerHide, delay );
}
function contextMenu() {
	var $menu   = $( '#menu' );
	$menu
		.removeClass( 'hide' )
		.css( 'top', $( '.container' ).scrollTop() + V.li.offset().top + 9 );
	scrollUpToView( $menu );
}
function contextMenuToggle() {
	var $menu = $( '#menu' );
	if ( ! $menu.hasClass( 'hide' ) && V.li.hasClass( 'active' ) ) {
		$menu.addClass( 'hide' );
		return false
	}
	
	return true
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
			.removeClass( 'hide' ).promise().done( () => {
				if ( page === 'player' ) util.statusScroll( id );
			} );
		bannerReset();
	} );
}
function entriesInfo( id, arg ) {
	var $code = $( '#code'+ id );
	var index = V.li.data( 'index' );
	var pre   = '<pre id="code'+ id +'" class="status li" data-liindex="'+ index +'"></pre>';
	if ( ! $code.length ) {
		V.li.after( pre );
		currentStatus( id, arg );
	} else {
		var liindex = $code.data( 'liindex' );
		$code.remove();
		if ( liindex === index ) return
		
		V.li.after( pre );
		currentStatus( id, arg );
	}
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
			dataErrorSet( iconwarning +'<c>'+ pkg +'</c> is not running'
						+'&emsp;<a class="infobtn infobtn-primary restart">'+ ico( 'refresh' ) +'Start</a>'
						+'<hr>'
						+ status );
			loaderHide();
		} );
		return
	}
	
	try {
		if ( $.isEmptyObject( S ) ) {
			S = JSON.parse( list );
		} else {
			list = JSON.parse( list );
			$.each( list, ( k, v ) => { S[ k ] = v } );
		}
	} catch( e ) {
		dataError( e.message, list );
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
function refreshData() {
	if ( page === 'guide' || ( I.active && ! I.rangelabel ) ) return
	
	if ( page === 'features' && ! /features$/.test( window.location.href ) ) { // authorization: spotify / scrobble
		util.redirect();
		return
	}
	
	bash( page +'-data.sh', data => {
		// on load, try catching any errors
		if ( list2JSON( data ) ) {
			switchSet();
			renderPage();
			if ( $( '#data .infobtn' ).length ) {
				$( '#data' ).remove();
			} else if ( $( '#data' ).length ) {
				$( '#data' ).html( highlightJSON( S ) );
			}
		}
	} );
}
function showContent() {
	if ( $( 'select' ).length ) selectSet( $( 'select' ) );
	$( 'heading:not( .hide ) i, .switchlabel, .setting, input:text, .entries:not( .hide ) li:not( .lihead )' ).prop( 'tabindex', 0 );
	$( '.head, .container, #bar-bottom' ).removeClass( 'hide' );
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
	var keys    = Object.keys( infoval );
	var values  = Object.values( infoval );
	var CMD_CFG = I.fileconf ? 'CFG ' : 'CMD ';
	notifyCommon();
	bash( [ SW.id, ...values, CMD_CFG + keys.join( ' ' ) ] );
	delete SW;
}
function switchSet() {
	$( 'pre.status:not( .hide )' ).each( ( i, el ) => currentStatus( $( el ).data( 'status' ), $( el ).data( 'arg' ) ) );
	bannerHide();
	if ( page === 'networks' ) {
		if ( $( '#divinterface' ).hasClass( 'hide' ) ) $( '.back' ).trigger( 'click' );
		return
	}
	
	var $switch = $( '.switch' );
	$switch.removeClass( 'disabled' );
	$switch.each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
	$( '.setting' ).each( ( i, el ) => {
		var $this = $( el );
		var id    = el.id.slice( 8 ); // setting-id > id
		id in config ? $this.toggleClass( 'hide', S[ id ] === false ) : $this.remove();
	} );
}
//---------------------------------------------------------------------------------------
document.title = page === 'camilla' ? 'CamillaDSP' : capitalize( page );
localhost ? $( 'a' ).removeAttr( 'href' ) : $( 'a[href]' ).attr( 'target', '_blank' );
$( '#'+ page ).addClass( 'active' );

$( document ).on( 'keydown', function( e ) {
	if ( I.active ) return
	
	var camilla = page === 'camilla';
	var menu    = $( '.menu' ).length && ! $( '.menu' ).hasClass( 'hide' );
	var tabs    = ! $( '#loader' ).hasClass( 'hide' );
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
			loaderHide();
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
			} else if ( $( '#data' ).length ) {
				$( '#data' ).remove();
			} else if ( $( '#bar-bottom div:focus' ).length ) {
				loaderHide();
				$( '#bar-bottom div' ).removeAttr( 'tabindex' );
				$( '.focus' ).trigger( 'focus' );
			} else {
				loader( 'fader' );
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
			
			$( '#data' ).length ? $( '#data' ).remove() : $( '#close' ).trigger( 'click' );
			break
		case 'MediaPause':
		case 'MediaPlay':
		case 'MediaPlayPause':
			if ( [ 'camilla', 'player' ].includes( page ) ) $( '.playback' ).trigger( 'click' );
			break
	}
} );
if ( $( '#menu' ).length ) {
	$( 'body' ).on( 'click', function( e ) {
		if ( I.active ) return
		
		$( '#menu' ).addClass( 'hide' );
		$( 'li' ).removeClass( 'active' );
		if ( $( e.target ).is( '.menu a' ) || $( e.target ).is( 'pre' ) ) return
		
		$( '.status.li' ).remove();
	} );
}
$( '.container' ).on( 'click', '.status .headtitle, .col-l.status', function() {
	var $this = $( this );
	var id    = $this.data( 'status' );
	var $code = $( '#code'+ id );
	$code.hasClass( 'hide' ) ? currentStatus( id ) : $code.addClass( 'hide' );
	$this.toggleClass( 'active' );
} );
$( '.page-icon' ).on( 'click', function() {
	$( '#debug' ).trigger( 'click' );
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
