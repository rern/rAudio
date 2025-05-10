// keyboard controls
var KEY_ARROW = {
	  ArrowLeft  : 'previous'
	, ArrowRight : 'next'
	, ArrowUp    : 'volup'
	, ArrowDown  : 'voldn'
}
var KEY_MEDIA = {
	  MediaNextTrack     : 'next'
	, MediaPause         : 'pause'
	, MediaPlay          : 'play'
	, MediaPlayPause     : 'toggle'
	, MediaPreviousTrack : 'previous'
	, MediaStop          : 'stop'
	, MediaTrackPrevious : 'previous'
	, MediaTrackNext     : 'next'
}
if ( V.localhost ) {
	KEY_MEDIA.AudioVolumeDown = 'voldn';
	KEY_MEDIA.AudioVolumeMute = 'volmute';
	KEY_MEDIA.AudioVolumeUp   = 'volup';
}

function menuLibraryPlaylist( $tabs, click ) {
	V.liplmenu = false;
	if ( click ) $( document.activeElement ).trigger( 'click' );
	$tabs
		.removeClass( 'focus' )
		.trigger( 'blur' );
	COMMON.loaderHide();
	$( '#bar-top, #bar-bottom' ).css( 'z-index', '' );
}

$( document ).on( 'keydown', function( e ) { // keyup cannot e.preventDefault()
	if ( V.local || I.active || V.color ) return
	
	var key      = e.key;
	var $search  = $( '.search:not( .hide )' );
	if ( $search.length ) {
		if ( key === 'Escape' ) {
			$search.find( '.searchclose' ).trigger( 'click' );
		} else if ( key === 'Enter' ) {
			$search.siblings( '.i-search' ).trigger( 'click' );
		}
		return
	}
	
	var $bio_lyrics = $( '#bio:not( .hide ), #lyrics:not( .hide )' );
	if ( $bio_lyrics.length ) {
		if ( key === 'Escape' || ( key === 'x' && e.ctrlKey ) ) $bio_lyrics.find( '.i-close' ).trigger( 'click' );
		return
	}
	
	var arrow    = key in KEY_ARROW;
	var media    = key in KEY_MEDIA;
	var menu     = $( '.menu:not( .hide )' ).length ;
	var liplmenu = ! $( '#loader' ).hasClass( 'hide' );
	if ( [ 'Alt', 'Backspace', 'Tab' ].includes( key ) || arrow || media ) e.preventDefault();
	if ( liplmenu ) {
		var $tabs = V.library ? $( '#page-library .content-top > i:not( .hide, .page-icon )' ) : $( '#pl-manage i' );
		switch ( key ) {
			case 'ArrowLeft':
			case 'ArrowRight':
				COMMON.focusNext( $tabs, 'focus', key );
				return
			case 'Alt':
			case 'Escape':
				menuLibraryPlaylist( $tabs );
				return
			case ' ':
			case 'Enter':
				e.preventDefault();
				menuLibraryPlaylist( $tabs, 'click' );
				return
			default:
				return
		}
	}
// media key ----------------------------------------------------------
	if ( ! menu && ( media || key === ' ' ) ) {
		e.preventDefault();
		var cmd = key === ' ' ? 'toggle' : KEY_MEDIA[ key ];
		if ( cmd === 'toggle' ) cmd = S.state === 'play' ? ( S.webradio ? 'stop' : 'pause' ) : 'play';
		$( '#'+ cmd ).trigger( 'click' );
		return
	}
	
	switch ( key ) {
		case 'Alt':
			if ( V.playback ) {
				$( '#button-settings' ).trigger( 'click' );
				return
			}
			
			var $tabs = V.library ? $( '#page-library .content-top > i:not( .hide, .page-icon )' ) : $( '#pl-manage i' );
			COMMON.loader( 'fader' );
			$( '.content-top i' ).removeAttr( 'tabindex' );
			$tabs.prop( 'tabindex', 0 );
			COMMON.focusNext( $tabs, 'focus', key );
			$( '#bar-top, #bar-bottom' ).css( 'z-index', 19 );
			return
// settings -----------------------------------------------------------
		case 'Escape':
			if ( $( '.menu:not(.hide)' ).length ) {
				$( '.menu' ).addClass( 'hide' );
				if ( V.color ) $( '#colorcancel' ).trigger( 'click' );
			} else {
				$( '#button-settings' ).trigger( 'click' );
			}
			return
		case 'F1':
			e.preventDefault();
			$( '#guide' ).trigger( 'click' );
			return
		case 'Tab':
			if ( liplmenu ) return
			
			COMMON.focusNext( $( '#bar-bottom i' ), 'active', e.shiftKey ? 'ArrowLeft' : 'ArrowRight' );
			return
	}
	
// context menu -------------------------------------------------------
	if ( menu ) {
		var $menu = $( '.menu:not( .hide )' );
		if ( arrow ) {
			COMMON.focusNext( $menu.find( 'a:not( .hide ), .submenu:not( .hide )' ), 'active', key )
		} else if ( [ ' ', 'Enter' ].includes( key ) ) {
			$menu.find( '.active' ).trigger( 'click' );
		}
		return
	}
// common key -------------------------------------------------------
	if ( ( key >= 'a' && key <= 'z' ) || key === '#' ) {
		var $page = $( '.page:not( .hide )' );
		if ( ! $page.find( '.index:not( .hide )' ).length ) return
		
		$page.find( '.indexed:contains('+ key.toUpperCase() +')' ).eq( 0 ).trigger( 'click' );
		$( '#lib-list, #pl-savedlist' ).find( '.active' ).removeClass( 'active' );
		return
	}
	
	if ( key === 'Backspace' ) {
		if ( V.playback || $search.length ) return
		
		$( '#button-'+ ( V.library ? 'lib' : 'pl' ) +'-back:not( .hide )' ).trigger( 'click' );
		return
	}
// arrow key -------------------------------------------------------
	if ( V.playback ) {
		if ( arrow ) {
			$( '#'+ KEY_ARROW[ key ] ).trigger( 'click' );
			return
		}
	} else if ( V.library ) {
		if ( ! $( '#lib-search' ).hasClass( 'hide' ) ) return
		
		// home /////////////////////////////////////////
		if ( ! $( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			if ( arrow ) {
				COMMON.focusNext( $( '.mode:not( .hide ):not( .nodata )' ), 'updn', key );
			} else if ( key === 'Enter' ) {
				$( '.mode.updn' ).trigger( 'click' );
			}
			return
		}
		
		if ( V.albumlist && ! V.librarytrack ) { // album
			if ( arrow ) {
				COMMON.focusNext( $( '#lib-list .coverart' ), 'active', key )
			} else if ( key === 'Enter' ) {
				var $active = $( '#lib-list .coverart.active' );
				V.iactive   = $active.index();
				$active.trigger( 'click' );
			}
			return
		}
		
		switch ( key ) {
			case 'ArrowRight': // show context menu
				$( '#lib-list li.active .li-icon' ).trigger( 'click' );
				return
			// list ///////////////////////////////////////
			case 'ArrowUp':
			case 'ArrowDown':
				COMMON.focusNext( $( '#lib-list li' ), 'active', key );
				return;
			case 'Enter':
				var $liactive = $( '#lib-list li.active' );
				if ( $( '.licover' ).length || $( '#lib-list li.mode-webradio' ).length ) {
					if ( $( '.menu:not(.hide)' ).length ) { // context menu
						var menu = $liactive.find( '.li-icon' ).data( 'menu' );
						$( '#menu-'+ menu ).find( 'a' ).eq( 1 ).trigger( 'click' );
					}
				} else {
					$liactive.trigger( 'click' );
				}
				return
		}
		MENU.hide();
	} else if ( V.playlist ) {
		if ( V.playlisthome ) {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					COMMON.focusNext( $( '#pl-list li' ), 'updn', key );
					return
				case 'ArrowRight':
					$( '#pl-list li.updn' ).length ? $( '#pl-list li.updn .li-icon' ).trigger( 'click' ) : $( '#pl-list li.active .li-icon' ).trigger( 'click' );
					return
				case 'Enter':
					$( '#pl-list li.updn' ).trigger( 'click' );
					return
				case 'Delete':
					$( '#button-pl-clear' ).trigger( 'click' );
					return
			}
		} else {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					COMMON.focusNext( $( '#pl-savedlist li' ), 'active', key );
					return
				case 'ArrowRight':
					$( '#pl-savedlist li.active .li-icon' ).trigger( 'click' );
					return
				case 'Enter':
					$( '#pl-savedlist li.active' ).trigger( 'click' );
					return
				case 'ArrowLeft':
					if ( ! $( '.contextmenu:not( .hide )' ).length ) $( '#button-pl-back' ).trigger( 'click' );
					return
			}
		}
	}
} );
