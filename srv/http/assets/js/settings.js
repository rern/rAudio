/*
Naming must be the same for:
	system - NAME.service
	js     - id = icon = NAME, #setting-NAME
	bash   - cmd=NAME, save to NAME.conf
*/
$MENU      = $( '#menu' );
function CONTENT() {
	if ( $( 'select' ).length ) COMMON.select.set( $( 'select' ) );
	$( 'heading:not( .hide ) i, .switchlabel, .setting, input:text, .entries:not( .hide ) li:not( .lihead )' ).prop( 'tabindex', 0 );
	$( '.head, .container, #bar-bottom' ).removeClass( 'hide' );
	COMMON.loaderHide();
}
function LABEL_ICON( label, icon ) {
	return '<a class="helpmenu label">'+ label + ( icon ? '<i class="i-'+ icon +'"></i>' : '&emsp;' ) +'</a>'
}
function NOTIFY_COMMON( message ) {
	if ( typeof message === 'boolean' ) {
		message = message ? 'Enable ...' : 'Disable ...';
	} else if ( ! message ) {
		message = ! ( SW.id in S ) || S[ SW.id ] ? 'Change ...' : 'Enable ...';
	}
	BANNER( SW.icon +' blink', SW.title, message, -1 );
}
function REFRESHDATA() {
	if ( PAGE === 'guide' || ( I.active && ! I.rangelabel ) ) return
	
	if ( PAGE === 'features' && ! /features$/.test( window.location.href ) ) { // authorization: spotify / scrobble
		UTIL.redirect();
		return
	}
	
	BASH( PAGE +'-data.sh', list => {
		// on load, try catching any errors
		if ( list.trim() === 'notrunning' ) {
			var pkg = PAGE === 'player' ? 'mpd' : 'camilladsp';
			BASH( 'data-service.sh '+ pkg, status => {
				COMMON.dataErrorSet( V.i_warning +'<c>'+ pkg +'</c> is not running'
							+'&emsp;<a class="infobtn infobtn-primary restart">'+ ICON( 'refresh' ) +'Start</a>'
							+'<hr>'
							+ status );
				COMMON.loaderHide();
			} );
			return
		}
		
		try {
			if ( $.isEmptyObject( S ) ) {
				S = JSON.parse( list );
			} else {
				if ( $MENU.length ) V.list = COMMON.json.clone( S.list );
				list = JSON.parse( list );
				$.each( list, ( k, v ) => { S[ k ] = v } );
			}
		} catch( e ) {
			COMMON.dataError( e.message, list );
			return false
		}
		
		SWITCH.set();
		renderPage();
		if ( $( '#data .infobtn' ).length ) {
			$( '#data' ).remove();
		} else if ( $( '#data' ).length ) {
			$( '#data' ).html( COMMON.json.highlight( S ) );
		}
	} );
}
function SETTING( id, callback ) {
	var filesh = 'settings/data-config.sh '+ id;
	if ( V.debug ) console.log( filesh );
	$.post(
		  'cmd.php'
		, { cmd: 'bash', filesh: filesh }
		, callback || CONFIG[ id ]
		, 'json'
	);
}
function STATUS( id, arg, info ) {
	if ( info ) { // context menu
		var $li   = $( 'li[ data-id="'+ arg +'" ]' );
		if ( ! $li.find( 'pre' ).length ) {
			$li.append( '<pre class="status li hide" data-arg="'+ arg +'"></pre>'+ ICON( 'close infoclose' ) );
		}
		var $code = $li.find( 'pre' );
		var cmd   = info + id;
		var $icon = $li.find( 'i' ).eq( 0 );
		$icon.addClass( 'blink' );
	} else {
		var $code = $( '#code'+ id );
		var cmd   = id;
	}
	BASH( 'data-status.sh '+ cmd + ( arg ? ' '+ arg : '' ), status => {
		if ( info ) $icon.removeClass( 'blink' );
		$code
			.html( status )
			.data( 'status', id )
			.data( 'arg', arg || '' )
			.removeClass( 'hide' ).promise().done( () => {
				if ( PAGE === 'player' ) UTIL.statusScroll( id );
			} );
		BANNER_HIDE();
	} );
}
var SWITCH = {
	  cancel : () => {
		$( '#'+ SW.id )
			.prop( 'checked', S[ SW.id ] )
			.toggleClass( 'disabled', SW.disabled );
		delete SW;
		BANNER_HIDE();
	}
	, enable : () => {
		var infoval = _INFO.val();
		var keys    = Object.keys( infoval );
		var values  = Object.values( infoval );
		var CMD_CFG = I.fileconf ? 'CFG ' : 'CMD ';
		NOTIFY_COMMON();
		BASH( [ SW.id, ...values, CMD_CFG + keys.join( ' ' ) ] );
		delete SW;
	}
	, set    : () => {
		$( 'pre.status:not( .hide, .li )' ).each( ( i, el ) => STATUS( $( el ).data( 'status' ), $( el ).data( 'arg' ) ) );
		BANNER_HIDE();
		var $switch = $( '.switch' );
		if ( ! $switch.length ) return
		
		$switch.removeClass( 'disabled' );
		$switch.each( ( i, el ) => $( el ).prop( 'checked', S[ el.id ] ) );
		$( '.setting' ).each( ( i, el ) => {
			var $this = $( el );
			var id    = el.id.slice( 8 ); // setting-id > id
			id in CONFIG ? $this.toggleClass( 'hide', S[ id ] === false ) : $this.remove();
		} );
	}
}
W.refresh  = data => { // except camilla
	if ( data.page !== PAGE ) return
	
	if ( 'nosound' in data && ! ( 'ap' in data ) && S.nosound === data.nosound ) return // features
		
	clearTimeout( V.debounce );
	V.debounce = setTimeout( () => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		SWITCH.set();
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
			.toggleClass( 'disabled', S.pllength === 0 || S.player !== 'mpd' );
		$( 'heading .player' ).prop( 'class', 'player i-'+ S.player );
	}
	$( '.playback' ).on( 'click', function() {
		S.state = S.state === 'play' ? 'pause' : 'play'
		headIcon();
		if ( PAGE === 'camilla' && S.state === 'pause' ) render.statusStop();
		BASH( [ 'cmd.sh', S.player === 'mpd' ? 'mpcplayback' : 'playerstop' ] );
	} );
}

//---------------------------------------------------------------------------------------
document.title = PAGE === 'camilla' ? 'CamillaDSP' : COMMON.capitalize( PAGE );
V.localhost ? $( 'a' ).removeAttr( 'href' ) : $( 'a[href]' ).attr( 'target', '_blank' );
$( '#'+ PAGE ).addClass( 'active' );

$( '.container' ).on( 'click', '.status .headtitle, .col-l.status', function() {
	var $this = $( this );
	var id    = $this.data( 'status' );
	var $code = $( '#code'+ id );
	$code.hasClass( 'hide' ) ? STATUS( id ) : $code.addClass( 'hide' );
	$this.toggleClass( 'active' );
	$MENU.addClass( 'hide' );
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
	BASH( 'data-config.sh reboot', list => {
		if ( ! list ) {
			location.href = '/';
			return
		}
		
		var message = '';
		$.each( list, ( k, v ) => message += ICON( k ) +' '+ v +'<br>' );
		INFO( {
			  icon         : 'system'
			, title        : 'System Setting'
			, header       : '<wh>Reboot required for:</wh>'
			, message      : '<p>'+ message +'</p>'
			, cancel       : () => location.href = '/'
			, okcolor      : V.orange
			, oklabel      : ICON( 'reboot' ) +'Reboot'
			, ok           : () => COMMON.powerAction( 'reboot' )
		} );
	}, 'json' );
} );
$( '.help' ).on( 'click', function() {
	var $this  = $( this );
	$this.toggleClass( 'bl' );
	var $helpblock = $this.parent().prop( 'id' ) ? $this.parent().next() : $this.parents( '.section' ).find( '.helpblock' );
	$helpblock.toggleClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', $( '.help' ).hasClass( 'bl' ) );
} );
$( '#bar-bottom div' ).on( 'click', function() {
	COMMON.loader();
	location.href = 'settings.php?p='+ this.id;
} );
$( '.switch, .setting' ).on( 'click', function() {
	if ( V.local ) return
	
	LOCAL();
	var id   = this.id.replace( 'setting-', '' );
	var icon = id;
	if ( PAGE === 'player' ) {
		icon = 'mpd';
	} else if ( PAGE === 'camilla' ) {
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
		INFO( {
			  ...SW
			, message : $this.prev().html()
		} );
		return
	}
	
	$this.addClass( 'disabled' );
	var $setting = $( '#setting-'+ id ); 
	if ( checked ) {                  // enable
		if ( id in CONFIG ) {                //    config
			$setting.trigger( 'click' );
		} else if ( id in CONFIG._prompt ) { //    prompt
			$this.prop( 'checked', false );
			CONFIG._prompt[ id ]();
		} else {                             //    no config
			S[ id ] = true;
			NOTIFY_COMMON( true );
			BASH( [ id ], error => {
				if ( error ) {
					S[ id ] = false;
					SWITCH.set();
					BANNER_HIDE();
					INFO( {
						  ...SW
						, message : error
					} );
				}
			}, 'text' );
		}
	} else {                                 // disable
		$( '#setting-'+ id ).addClass( 'hide' );
		if ( PAGE === 'camilla' ) {
			DEV[ id ] = null;
			setting.save( SW.title, 'Disable ...' );
			$setting.addClass( 'hide' );
		} else if ( id in CONFIG._disable ) {
			CONFIG._disable[ id ]();
		} else {
			NOTIFY_COMMON( 'Disable ...' );
			BASH( [ id, 'OFF' ] );
		}
	}
} );
$( '.setting' ).on( 'click', function() {
	var id = SW.id;
	if ( CONFIG[ id ].toString()[ 1 ] === ')' ) { // no data to get
		CONFIG[ id ]();
	} else {
		SETTING( id );
	}
} );
// kb shortcut
$( document ).on( 'keydown', function( e ) {
	if ( I.active ) return
	
	var camilla = PAGE === 'camilla';
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
				COMMON.focusNext( $( '.menu a:not( .hide )' ), 'active', key );
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
			COMMON.focusNext( $tabs, 'focus', key );
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
				COMMON.focusNext( $( '#bar-bottom div' ), 'focus', key );
			}
			break
		case ' ':
		case 'Enter':
			var $focus = $( document.activeElement );
			if ( ! $focus.length ) return
			
			e.preventDefault();
			if ( menu ) {
				$focus.trigger( 'click' );
				return
			}
			
			if ( $focus.hasClass( 'switchlabel' ) ) $focus = $focus.prev();
			$focus.trigger( 'click' );
			COMMON.loaderHide();
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
				COMMON.loaderHide();
				$( '#bar-bottom div' ).removeAttr( 'tabindex' );
				$( '.focus' ).trigger( 'focus' );
			} else {
				COMMON.loader( 'fader' );
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
			if ( [ 'camilla', 'player' ].includes( PAGE ) ) $( '.playback' ).trigger( 'click' );
			break
	}
} );
// context menu
if ( $MENU.length ) {
	var LIST = {
		  equal  : list => {
			if ( ! V.list ) return false
			
			return JSON.stringify( S.list[ list ] ) === JSON.stringify( V.list[ list ] )
		}
		, render : ( id, html ) => {
			var $list = id === 'camilla' ? $( '#config .entries.main' ) : $( '#'+ id );
			$list.html( html );
			$list.find( 'pre.li' ).each( ( i, el ) => STATUS( id, $( el ).data( 'arg' ), 'info' ) );
		}
	}
	var MENU = {
		  command  : ( $this, e ) => {
			if ( $this.hasClass( 'gr' ) ) {
				e.stopPropagation();
				return false
			}
			
			return $this.data( 'cmd' )
		}
		, isActive : ( $li, e ) => {
			if ( $( e.target ).is( 'pre' ) ) {
				e.stopPropagation();
				$MENU.addClass( 'hide' );
				return true
			}
			
			var active = ! $MENU.hasClass( 'hide' ) && $li.hasClass( 'active' );
			$MENU.addClass( 'hide' );
			$( '.entries li' ).removeClass( 'active' );
			return active
		}
		, show     : $li => {
			$li.addClass( 'active' );
			$( '#menu .info' ).toggleClass( 'gr', $li.find( 'pre' ).length > 0 );
			$MENU
				.removeClass( 'hide' )
				.css( 'top', $( '.container' ).scrollTop() + $li.offset().top + 8 );
			COMMON.scrollToView( $MENU );
		}
	}
	$( '.container' ).on( 'click', function( e ) {
		if ( $( e.target ).parents( '.entries' ).length ) return
		
		$MENU.addClass( 'hide' );
		$( 'li' ).removeClass( 'active' );
	} );
	$( '.entries' ).on( 'click', '.infoclose', function() {
		var $this = $( this );
		$this.prev().remove();
		$this.remove();
	} );
}
