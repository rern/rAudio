// keyboard controls
var keyarrow = {
	  ArrowLeft  : 'previous'
	, ArrowRight : 'next'
	, ArrowUp    : 'volup'
	, ArrowDown  : 'voldn'
}
var keyevent = {
	  MediaNextTrack     : 'next'
	, MediaPause         : 'pause'
	, MediaPlay          : 'play'
	, MediaPreviousTrack : 'previous'
	, MediaStop          : 'stop'
	, MediaTrackPrevious : 'previous'
	, MediaTrackNext     : 'next'
}
if ( localhost ) {
	keyevent.AudioVolumeDown = 'voldn';
	keyevent.AudioVolumeMute = 'volmute';
	keyevent.AudioVolumeUp   = 'volup';
}

$( document ).on( 'keydown', function( e ) { // keyup cannot e.preventDefault() - Tab, page scroll
	if ( V.local || I.active || V.colorpicker ) return
	
	var key = e.key;
	switch ( key ) {
		case 'Backspace':
			if ( $( 'input:focus, textarea:focus' ).length ) return
			
			if ( V.library ) {
				$( '#button-lib-back' ).trigger( 'click' );
			} else if ( V.playlist ) {
				$( '#button-pl-back' ).trigger( 'click' );
			}
			return
		case 'Enter':
			if ( ! $( '#settings' ).hasClass( 'hide' ) ) {
				var $menu = $( '#settings' ).find( 'a.active' );
				if ( ! $menu.length ) $menu = $( '#settings' ).find( '.submenu.active' );
				var href = $menu.prop( 'href' );
				href ? location.href = href : $menu.trigger( 'click' );
			} else if ( ! V.librarylist ) {
				$( '.lib-mode.updn div' ).trigger( 'click' );
			} else if ( V.librarylist ) {
				$( '#lib-list li.active' ).trigger( 'click' );
			}
			return
		case 'Escape':
			if ( $( '.menu:not(.hide)' ).length ) {
				$( '.menu' ).addClass( 'hide' );
				if ( V.colorpicker ) $( '#colorcancel' ).trigger( 'click' );
			} else {
				$( '#button-settings' ).trigger( 'click' );
			}
			return
		case 'Home':
			if ( V.library ) {
				$( '#library' ).trigger( 'click' );
			} else if ( V.playlist ) {
				$( '#playlist' ).trigger( 'click' );
			}
			return
		case ' ':
		case 'MediaPlayPause':
			e.preventDefault();
			var btn = S.state === 'play' ? ( S.webradio ? 'stop' : 'pause' ) : 'play';
			$( '#'+ btn ).trigger( 'click' );
			return
		case 'Tab':
			e.preventDefault();
			if ( V.library ) {
				$( '#playback' ).trigger( 'click' );
			} else if ( V.playback ) {
				$( '#playlist' ).trigger( 'click' );
			} else {
				$( '#library' ).trigger( 'click' );
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
	
	if ( key in keyevent ) {
		$( '#'+ keyevent[ key ] ).trigger( 'click' );
		return
	}
	// context menu
	var $contextmenu = $( '.contextmenu:not( .hide )' );
	if ( ! $contextmenu.length ) $contextmenu = $( '#settings:not( .hide )' );
	if ( $contextmenu.length ) {
		if ( V.library ) {
			var $liactive = $( '#lib-list li.active' );
		} else if ( V.playlist ) {
			if ( ! V.savedpl ) {
				var $liactive = $( '#pl-list li.updn' );
				if ( ! $liactive.length ) $liactive = $( '#pl-list li.active' );
			} else {
				var $liactive = $( '#pl-savedlist li.active' );
			}
		}
		var $menuactive = $contextmenu.find( 'a.active' );
		var $menufirst  = $contextmenu.find( 'a:not( .hide )' ).eq( 0 );
		var $menulast   = $contextmenu.find( 'a:not( .hide )' ).last();
		switch ( key ) {
			case 'ArrowLeft':
				if ( $( '.submenu.active' ).length ) {
					$( '.submenu.active' )
						.removeClass( 'active' )
						.prev().addClass( 'active' );
				} else {
					$( '.menu' ).addClass( 'hide' )
					$menuactive.removeClass( 'active' );
					$( '.submenu' ).removeClass( 'active' );
					if ( V.playlist ) $( '#pl-list li' ).removeClass( 'lifocus' );
				}
				break;
			case 'ArrowRight':
				var $next = $menuactive.next();
				if ( $next.hasClass( 'submenu' ) ) {
					$menuactive.removeClass( 'active' );
					$next.addClass( 'active' );
				}
				break;
			case 'ArrowUp':
			case 'ArrowDown':
				e.preventDefault();
				if ( $( '.submenu.active' ).length ) {
					$menuactive = $( '.submenu.active' );
					if ( key === 'ArrowDown' ) {
						$next = $menuactive.nextAll( 'a:not( .hide )' ).eq( 0 );
						if ( ! $next.length ) $next = $menuactive.prevAll( 'a:not( .hide )' ).last();
					} else {
						$next = $menuactive.prevAll( 'a:not( .hide )' ).eq( 1 );
						if ( ! $next.length ) $next = $menuactive.nextAll( 'a:not( .hide )' ).last();
					}
					$next.addClass( 'active' );
					$menuactive.removeClass( 'active' );
					return
				}
				
				if ( ! $menuactive.length ) {
					$menufirst.addClass( 'active' );
				} else {
					$menuactive.removeClass( 'active' );
					$( '.submenu' ).removeClass( 'active' );
					if ( key === 'ArrowDown' ) {
						if ( $menuactive.is( $menulast ) ) {
							$menufirst.addClass( 'active' );
						} else {
							$menuactive.nextAll( 'a:not( .hide )' ).eq( 0 ).addClass( 'active' );
						}
					} else {
						if ( $menuactive.is( $menufirst ) ) {
							$menulast.addClass( 'active' );
						} else {
							$menuactive.prevAll( 'a:not( .hide )' ).eq( 0 ).addClass( 'active' );
						}
					}
				}
				break;
			case 'Enter':  // context menu
				if ( $( '.menu:not(.hide)' ).length ) $contextmenu.find( '.active' ).trigger( 'click' );
				break;
		}
		return
	}
	
	if ( V.playback ) {
		if ( key in keyarrow ) {
			$( '#'+ keyarrow[ key ] ).trigger( 'click' );
			return
		}
	} else if ( V.library ) {
		if ( ! $( '#lib-search' ).hasClass( 'hide' ) ) return
		
		// home /////////////////////////////////////////
		if ( ! $( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			var $libmode = $( '.lib-mode:not( .hide ):not( .nodata )' );
			var $updn    = $( '.lib-mode.updn' );
			if ( ! $updn.length ) {
				$libmode.eq( 0 ).addClass( 'updn' );
				return
			}
			
			if ( $libmode.length < 2 ) return
			
			var index = 0;
			$.each( $libmode, ( i, el ) => {
				if ( $( el ).hasClass( 'updn' ) ) {
					index = i;
					return false
				}
			} );
			switch ( key ) {
				case 'ArrowLeft':
				case 'ArrowRight':
					var iLast = $libmode.length - 1;
					if ( key === 'ArrowLeft' ) {
						var i = index > 0 ? index - 1 : iLast;
					} else {
						var i = index < iLast ? index + 1 : 0;
					}
					$updn.removeClass( 'updn' );
					$libmode.eq( i ).addClass( 'updn' );
					break;
				case 'Enter':
					$updn.trigger( 'click' );
					break;
			}
			return
		}
		
		if ( V.albumlist ) { // album
			if ( ! $( '#lib-list .coverart.active' ).length ) {
				$( '#lib-list .coverart' ).eq( 0 ).addClass( 'active' );
				return
			}
			
			var $active = $( '#lib-list .coverart.active' );
			switch ( key ) {
				case 'ArrowLeft':
				case 'ArrowRight':
					if ( arrowL && $active.index() === 0 ) return
					if ( arrowR && $active.index() === $( '#lib-list .coverart' ).length + 1 ) return
					
					var $next = arrowR ? $active.next() : $active.prev();
					$active.removeClass( 'active' );
					$next.addClass( 'active' );
					var rect  = $next[ 0 ].getBoundingClientRect();
					var wH    = $( window ).height();
					var eH    = $next.height();
					var top   = $next.offset().top;
					if ( rect.bottom > 0 && rect.bottom < ( wH - eH ) ) {
						var scroll = top - ( V.bars ? 80 : 40 );
					} else if ( rect.top > 0 && rect.top < ( wH - eH ) ) {
						var scroll = top - eH;
					}
					$( 'html, body' ).scrollTop( scroll );
					break;
				case 'ArrowUp':
					$( '#button-lib-back' ).trigger( 'click' );
					break;
				case 'Enter':
					V.iactive = $( '#lib-list .coverart.active' ).index();
					$active.trigger( 'click' );
					break;
			}
			return
		}
		
		switch ( key ) {
			case 'ArrowLeft': // back button
				$( '#button-lib-back' ).trigger( 'click' );
				return
			case 'ArrowRight': // show context menu
				$( '#lib-list li.active .li-icon' ).trigger( 'click' );
				return
			// list ///////////////////////////////////////
			case 'ArrowUp':
			case 'ArrowDown':
				scrollUpDown( e, $( '#lib-list' ), key );
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
				break;
		}
		menuHide();
	} else if ( V.playlist ) {
		if ( V.savedpltrack || V.savedpl ) {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					scrollUpDown( e, $( '#pl-savedlist' ), key );
					break;
				case 'ArrowRight':
					$( '#pl-savedlist li.active .li-icon' ).trigger( 'click' );
					break;
				case 'Enter':
					$( '#pl-savedlist li.active' ).trigger( 'click' );
					break;
				case 'ArrowLeft':
					if ( ! $( '.contextmenu:not( .hide )' ).length ) $( '#button-pl-back' ).trigger( 'click' );
					break;
			}
		} else {
			switch ( key ) {
				case 'ArrowUp':
				case 'ArrowDown':
					var $liactive = $( '#pl-list li.updn' );
					if ( ! $liactive.length ) $( '#pl-list li.active' ).addClass( 'updn' );
					scrollUpDown( e, $( '#pl-list' ), key );
					break;
				case 'ArrowRight':
					$( '#pl-list li.updn' ).length ? $( '#pl-list li.updn .li-icon' ).trigger( 'click' ) : $( '#pl-list li.active .li-icon' ).trigger( 'click' );
					break;
				case 'Enter':
					$( '#pl-list li.updn' ).trigger( 'click' );
					break;
				case 'Delete':
					$( '#button-pl-clear' ).trigger( 'click' );
					break;
			}
		}
	}
} );
function scrollUpDown( e, $list, key ) {
	e.preventDefault();
	var $li       = $list.find( 'li' );
	var $liactive = $list.find( 'li.active' );
	if ( ! $liactive.length ) {
		$li.eq( 0 ).addClass( 'active' );
		setTimeout( () => $( 'html, body' ).scrollTop( 0 ), 300 );
		return
	}
	
	var classactive = 'active';
	if ( $list.prop( 'id' ) === 'pl-list' ) {
		$liactive   = $list.find( 'li.updn' );
		classactive = 'updn';
	}
	var $linext     = key === 'ArrowUp' ? $liactive.prev( 'li' ) : $liactive.next( 'li' );
	var barH        = D.bars ? 0 : 40;
	if ( V.library && $( '.licover' ).length && ! D.hidecover && D.fixedcover ) barH += 230;
	if ( ! $linext.length ) $linext = key === 'ArrowUp' ? $li.last() : $li.first();
	$liactive.removeClass( classactive );
	$linext.addClass( classactive );
	var litop       = $linext[ 0 ].getBoundingClientRect().top;
	var libottom    = $linext[ 0 ].getBoundingClientRect().bottom;
	var licount     = Math.round( ( V.wH - 120 - ( barH * 2 ) ) / 49 );
	if ( $linext.is( ':first-child' ) ) {
		$( 'html, body' ).scrollTop( 0 );
	} else if ( $linext.is( ':last-of-type' ) && libottom > V.wH - 40 - barH ) {
		$( 'html, body' ).scrollTop( litop - 80 - barH - ( licount - 2 ) * 49 );
	} else if ( litop < 80 - barH ) {
		$( 'html, body' ).scrollTop( $( window ).scrollTop() - 120 - V.wH % 49 - barH - ( licount - 3 ) * 49 );
	} else if ( libottom > V.wH - 40 - barH ) {
		$( 'html, body' ).scrollTop( $linext.offset().top - 80 - barH );
	}
}
