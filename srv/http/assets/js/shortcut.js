// keyboard controls
var keyarrow = {
	  ArrowLeft  : 'previous'
	, ArrowRight : 'next'
	, ArrowUp    : 'volup'
	, ArrowDown  : 'voldn'
}
var keymedia = {
	  MediaNextTrack     : 'next'
	, MediaPause         : 'pause'
	, MediaPlay          : 'play'
	, MediaPlayPause     : 'toggle'
	, MediaPreviousTrack : 'previous'
	, MediaStop          : 'stop'
	, MediaTrackPrevious : 'previous'
	, MediaTrackNext     : 'next'
	, ' '                : 'toggle'
}
if ( localhost ) {
	keymedia.AudioVolumeDown = 'voldn';
	keymedia.AudioVolumeMute = 'volmute';
	keymedia.AudioVolumeUp   = 'volup';
}

$( document ).on( 'keydown', function( e ) { // keyup cannot e.preventDefault()
	if ( V.local || I.active || V.colorpicker ) return
	
	var key   = e.key;
	var arrow = key in keyarrow;
	var media = key in keymedia;
	if ( [ 'Alt', 'Backspace', 'Enter', 'Escape', 'Tab', '#', 'a', 'z' ].includes( key ) || arrow || media ) e.preventDefault();
	switch ( key ) {
		case 'Tab':
			focusNext( $( '#bar-bottom i' ), 'active', e.shiftKey ? 'ArrowLeft' : 'ArrowRight' );
			return
// settings -----------------------------------------------------------
		case 'Alt':
		case 'Escape':
			if ( $( '.menu:not(.hide)' ).length ) {
				$( '.menu' ).addClass( 'hide' );
				if ( V.colorpicker ) $( '#colorcancel' ).trigger( 'click' );
			} else {
				$( '#button-settings' ).trigger( 'click' );
			}
			return
	}
// context menu -------------------------------------------------------
	var $contextmenu = $( '.menu:not( .hide )' );
	if ( $contextmenu.length ) {
		if ( arrow ) {
			focusNext( $contextmenu.find( 'a:not( .hide ), .submenu:not( .hide )' ), 'active', key )
		} else if ( [ ' ', 'Enter' ].includes( key ) ) {
			$contextmenu.find( '.active' ).trigger( 'click' );
		}
		return
	}
// media key ----------------------------------------------------------
	if ( media ) {
		var cmd = keymedia[ key ];
		if ( cmd === 'toggle' ) cmd = S.state === 'play' ? ( S.webradio ? 'stop' : 'pause' ) : 'play';
		$( '#'+ cmd ).trigger( 'click' );
		return
	}
// common key -------------------------------------------------------
	switch ( key ) {
		case 'Backspace':
			if ( V.library ) {
				$( '#button-lib-back' ).trigger( 'click' );
			} else if ( V.playlist ) {
				$( '#button-pl-back' ).trigger( 'click' );
			}
			return
		case '#': // index bar
		case 'a':
		case 'z':
			key = key.toUpperCase();
			if ( V.library && ! $( '#lib-list .index' ).hasClass( 'hide' ) ) {
				$( '#lib-index' ).find( 'wh:contains('+ key +')' ).trigger( 'click' );
				if ( V.albumlist ) {
					$( '#lib-list .coverart.active' ).removeClass( 'active' );
					if ( key !== '#' ) {
						$( '#lib-list .coverart[data-index='+ key +']' ).eq( 0 ).addClass( 'active' );
					} else {
						$( '#lib-list .coverart' ).eq( 0 ).addClass( 'active' );
					}
				} else {
					$( '#lib-list li.active' ).removeClass( 'active' );
					if ( key !== '#' ) {
						$( '#lib-list li[data-index='+ key +']' ).eq( 0 ).addClass( 'active' );
					} else {
						$( '#lib-list li' ).eq( 0 ).addClass( 'active' );
					}
				}
			} else if ( V.playlist && ! $( '#pl-list .index' ).hasClass( 'hide' ) ) {
				$( '#pl-savedlist li.active' ).removeClass( 'active' );
				if ( key !== '#' ) {
					$( '#pl-savedlist li[data-index='+ key +']' ).eq( 0 ).addClass( 'active' );
				} else {
					$( '#pl-savedlist li' ).eq( 0 ).addClass( 'active' );
				}
			}
			return
	}
// arrow key -------------------------------------------------------
	if ( V.playback ) {
		if ( arrow ) {
			$( '#'+ keyarrow[ key ] ).trigger( 'click' );
			return
		}
	} else if ( V.library ) {
		if ( ! $( '#lib-search' ).hasClass( 'hide' ) ) return
		
		// home /////////////////////////////////////////
		if ( ! $( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			if ( arrow ) {
				focusNext( $( '.lib-mode:not( .hide ):not( .nodata )' ), 'updn', key );
			} else if ( key === 'Enter' ) {
				$( '.lib-mode.updn' ).trigger( 'click' );
			}
			return
		}
		
		if ( V.albumlist && ! V.librarytrack ) { // album
			if ( arrow ) {
				focusNext( $( '#lib-list .coverart' ), 'active', key )
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
				focusNext( $( '#lib-list li' ), 'active', key );
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
		menuHide();
	} else if ( V.playlist ) {
		if ( V.savedpltrack || V.savedpl ) {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					focusNext( $( '#pl-savedlist li' ), 'active', key );
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
		} else {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					focusNext( $( '#pl-list li' ), 'updn', key );
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
		}
	}
} );
