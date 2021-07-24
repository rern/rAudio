// keyboard controls
$( document ).keydown( function( e ) { // no for 'keyup' 
	if ( G.local || !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
	var key = e.key;
	if ( key === 'Home' ) {
		if ( G.library ) {
			$( '#library' ).click();
		} else if ( G.playlist ) {
			$( '#playlist' ).click();
		}
		return
	}
	
	if ( key === 'Backspace' && !$( 'input:focus, textarea:focus' ).length ) {
		if ( G.library ) {
			$( '#button-lib-back' ).click();
		} else if ( G.playlist ) {
			$( '#button-pl-back' ).click();
		}
		return
	}
	
	if ( key === '#' || key >= 'a' && key <= 'z' ) { // index bar
		key = key.toUpperCase();
		if ( G.library && !$( '#lib-list .index' ).hasClass( 'hide' ) ) {
			$( '#lib-index' ).find( 'wh:contains('+ key +')' ).click();
			if ( G.albumlist ) {
				$( '#lib-list .coverart.active' ).removeClass( 'active' );
				if ( key !== '#' ) {
					$( '#lib-list .coverart[data-index='+ key +']:eq( 0 )' ).addClass( 'active' );
				} else {
					$( '#lib-list .coverart:eq( 0 )' ).addClass( 'active' );
				}
			} else {
				$( '#lib-list li.active' ).removeClass( 'active' );
				if ( key !== '#' ) {
					$( '#lib-list li[data-index='+ key +']:eq( 0 )' ).addClass( 'active' );
				} else {
					$( '#lib-list li:eq( 0 )' ).addClass( 'active' );
				}
			}
		} else if ( G.playlist && !$( '#pl-list .index' ).hasClass( 'hide' ) ) {
			$( '#pl-savedlist li.active' ).removeClass( 'active' );
			if ( key !== '#' ) {
				$( '#pl-savedlist li[data-index='+ key +']:eq( 0 )' ).addClass( 'active' );
			} else {
				$( '#pl-savedlist li:eq( 0 )' ).addClass( 'active' );
			}
		}
		return
	}
	
	if ( key === 'Enter' ) {
		if ( !$( '#settings' ).hasClass( 'hide' ) ) {
			var $menu = $( '#settings' ).find( 'a.active' );
			if ( !$menu.length ) $menu = $( '#settings' ).find( '.submenu.active' );
			var href = $menu.prop( 'href' );
			href ? location.href = href : $menu.click();
			return
		}
	}
	
	if ( !$( '#colorpicker' ).hasClass( 'hide' ) ) return

	if ( key === 'Escape' ) {
		if ( $( '.menu:not(.hide)' ).length ) {
			$( '.menu' ).addClass( 'hide' );
			if ( 'colorpicker' in G ) $( '#colorcancel' ).click();
		} else {
			$( '#button-settings' ).click();
		}
		return
	}
		
	var keyevent = {
		  AudioVolumeDown    : 'voldn'
		, AudioVolumeMute    : 'volmute'
		, AudioVolumeUp      : 'volup'
		, MediaNextTrack     : 'next'
		, MediaPause         : 'pause'
		, MediaPlay          : 'play'
		, MediaPreviousTrack : 'previous'
		, MediaStop          : 'stop'
		, MediaTrackPrevious : 'previous'
		, MediaTrackNext     : 'next'
	}
	if ( ( key === ' ' && e.target.localName !== 'input' ) || key === 'MediaPlayPause' ) {
		var btn = G.status.state === 'play' ? ( G.status.webradio ? 'stop' : 'pause' ) : 'play';
		$( '#'+ btn ).click();
		e.preventDefault();
		return
		
	} else if ( key === 'Tab' ) {
		e.preventDefault();
		if ( G.library ) {
			$( '#playback' ).click();
		} else if ( G.playback ) {
			$( '#playlist' ).click();
		} else {
			$( '#library' ).click();
		}
		return
		
	} else {
		$( '#'+ keyevent[ key ] ).click();
		if ( key.slice( 5 ) === 'Media' ) return
		
	}
	// context menu
	var $contextmenu = $( '.contextmenu:not( .hide )' );
	if ( !$contextmenu.length ) $contextmenu = $( '#settings:not( .hide )' );
	if ( $contextmenu.length ) {
		if ( G.library ) {
			var $liactive = $( '#lib-list li.active' );
		} else if ( G.playlist ) {
			if ( !G.savedlist ) {
				var $liactive = $( '#pl-list li.updn' );
				if ( !$liactive.length ) $liactive = $( '#pl-list li.active' );
			} else {
				var $liactive = $( '#pl-savedlist li.active' );
			}
		}
		var $menuactive = $contextmenu.find( 'a.active' );
		var $menufirst = $contextmenu.find( 'a:not( .hide ):eq( 0 )' );
		var $menulast = $contextmenu.find( 'a:not( .hide )' ).last();
		if ( key === 'ArrowLeft' ) {
			if ( $( '.submenu.active' ).length ) {
				$( '.submenu.active' )
					.removeClass( 'active' )
					.prev().addClass( 'active' );
			} else {
				$( '.menu' ).addClass( 'hide' )
				$menuactive.removeClass( 'active' );
				$( '.submenu' ).removeClass( 'active' );
				if ( G.playlist ) $( '#pl-list li' ).removeClass( 'lifocus' );
			}
		} else if ( key === 'ArrowRight' ) {
			var $next = $menuactive.next();
			if ( $next.hasClass( 'submenu' ) ) {
				$menuactive.removeClass( 'active' );
				$next.addClass( 'active' );
			}
		} else if ( key === 'ArrowUp' || key === 'ArrowDown' ) {
			e.preventDefault();
			if ( $( '.submenu.active' ).length ) {
				$menuactive = $( '.submenu.active' );
				if ( key === 'ArrowDown' ) {
					$next = $menuactive.nextAll( 'a:not( .hide ):eq( 0 )' );
					if ( !$next.length ) $next = $menuactive.prevAll( 'a:not( .hide )' ).last();
				} else {
					$next = $menuactive.prevAll( 'a:not( .hide ):eq( 1 )' );
					if ( !$next.length ) $next = $menuactive.nextAll( 'a:not( .hide )' ).last();
				}
				$next.addClass( 'active' );
				$menuactive.removeClass( 'active' );
				return
			}
			
			if ( !$menuactive.length ) {
				$menufirst.addClass( 'active' );
			} else {
				$menuactive.removeClass( 'active' );
				$( '.submenu' ).removeClass( 'active' );
				if ( key === 'ArrowDown' ) {
					if ( $menuactive.is( $menulast ) ) {
						$menufirst.addClass( 'active' );
					} else {
						$menuactive.nextAll( 'a:not( .hide ):eq( 0 )' ).addClass( 'active' );
					}
				} else {
					if ( $menuactive.is( $menufirst ) ) {
						$menulast.addClass( 'active' );
					} else {
						$menuactive.prevAll( 'a:not( .hide ):eq( 0 )' ).addClass( 'active' );
					}
				}
			}
		} else if ( key === 'Enter' ) { // context menu
			if ( $( '.menu:not(.hide)' ).length ) $contextmenu.find( '.active' ).click();
		}
		return
	}
	
	if ( G.playback ) {
		if ( key === 'ArrowLeft' ) {
			$( '#previous' ).click();
		} else if ( key === 'ArrowRight' ) {
			$( '#next' ).click();
		} else if ( key === 'ArrowUp' ) {
			$( '#volup' ).click();
		} else if ( key === 'ArrowDown' ) {
			$( '#voldn' ).click();
		}
	} else if ( G.library ) {
		if ( !$( '#lib-search' ).hasClass( 'hide' ) ) return
		
		// home /////////////////////////////////////////
		if ( !$( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			var $blupdn = $( '.lib-mode.updn' );
			if ( !$blupdn.length ) {
				$( '.lib-mode:not( .hide ):eq( 0 )' ).addClass( 'updn' );
				return
			}
			
			if ( key === 'ArrowLeft' ) {
				var $div = $( '.lib-mode.updn' ).prevAll( ':not( .hide ):eq( 0 )' );
				$( '.lib-mode' ).removeClass( 'updn' );
				if ( !$div.length ) $div = $( '.lib-mode:not( .hide )' ).last();
				$div.addClass( 'updn' );
			} else if ( key === 'ArrowRight' ) {
				var $div = $( '.lib-mode.updn' ).nextAll( ':not( .hide ):eq( 0 )' );
				$( '.lib-mode' ).removeClass( 'updn' );
				if ( !$div.length ) $div = $( '.lib-mode:not( .hide ):eq( 0 )' );
				$div.addClass( 'updn' );
			} else if ( key === 'Enter' ) {
				$( '.lib-mode.updn .mode' )
					.trigger( 'click' )
					.trigger( 'tap' );
			}
			return
		}
		
		if ( G.albumlist ) { // album
			if ( !$( '#lib-list .coverart.active' ).length ) {
				$( '#lib-list .coverart:eq( 0 )' ).addClass( 'active' );
				return
			}
			
			var $active = $( '#lib-list .coverart.active' );
			var arrowL = key === 'ArrowLeft';
			var arrowR = key === 'ArrowRight';
			if ( arrowL || arrowR ) {
				if ( arrowL && $active.index() === 0 ) return
				if ( arrowR && $active.index() === $( '#lib-list .coverart' ).length + 1 ) return
				
				var $next = arrowR ? $active.next() : $active.prev();
				$active.removeClass( 'active' );
				$next.addClass( 'active' );
				var rect = $next[ 0 ].getBoundingClientRect();
				var wH = $( window ).height();
				var eH = $next.height();
				var top = $next.offset().top;
				if ( rect.bottom > 0 && rect.bottom < ( wH - eH ) ) {
					var scroll = top - ( G.bars ? 80 : 40 );
				} else if ( rect.top > 0 && rect.top < ( wH - eH ) ) {
					var scroll = top - eH;
				}
				$( 'html, body' ).scrollTop( scroll );
			} else if ( key === 'ArrowUp' ) {
				$( '#button-lib-back' ).click();
			} else if ( key === 'Enter' ) {
				G.iactive = $( '#lib-list .coverart.active' ).index();
				$active.trigger( 'tap' );
			}
			return
		}
		
		if ( key === 'ArrowLeft' ) { // back button
			$( '#button-lib-back' ).click();
			return
		} else if ( key === 'ArrowRight' ) { // show context menu
			$( '#lib-list li.active .lib-icon' ).trigger( 'tap' );
			return
		}
		
		// list ///////////////////////////////////////
		if ( key === 'ArrowUp' || key === 'ArrowDown' ) {
			e.preventDefault();
			scrollUpDown( $( '#lib-list' ), key );
		} else if ( key === 'Enter' ) {
			var $liactive = $( '#lib-list li.active' );
			if ( $( '.licover' ).length || $( '#lib-list li.mode-webradio' ).length ) {
				if ( $( '.menu:not(.hide)' ).length ) { // context menu
					var menu = $liactive.find( '.lib-icon' ).data( 'target' );
					$( menu ).find( 'a:eq( 1 )' ).click();
				}
			} else {
				$liactive.trigger( 'tap' );
			}
		}
		$( '.contextmenu' ).addClass( 'hide' );
	} else if ( G.playlist ) {
		if ( G.savedplaylist || G.savedlist ) {
			if ( key === 'ArrowUp' || key === 'ArrowDown' ) {
				scrollUpDown( $( '#pl-savedlist' ), key );
			} else if ( key === 'ArrowRight' ) {
				$( '#pl-savedlist li.active .pl-icon' ).click();
			} else if ( key === 'Enter' ) {
				$( '#pl-savedlist li.active' ).click();
			} else if ( key === 'ArrowLeft' ) {
				if ( !$( '.contextmenu:not( .hide )' ).length ) $( '#button-pl-back' ).click();
			}
		} else {
			if ( key === 'ArrowUp' || key === 'ArrowDown' ) {
				var $liactive = $( '#pl-list li.updn' );
				if ( !$liactive.length ) $( '#pl-list li.active' ).addClass( 'updn' );
				scrollUpDown( $( '#pl-list' ), key );
			} else if ( key === 'ArrowRight' ) {
				$( '#pl-list li.updn' ).length ? $( '#pl-list li.updn .pl-icon' ).click() : $( '#pl-list li.active .pl-icon' ).click();
			} else if ( key === 'Enter' ) {
				$( '#pl-list li.updn' ).click();
			} else if ( key === 'Delete' ) {
				$( '#button-pl-clear' ).click();
			}
		}
	}
} );
function scrollUpDown( $list, key ) {
	if ( $( '.contextmenu' ).not( '.hide' ).length ) return
	
	var $li = $list.find( 'li' );
	var $liactive = $list.find( 'li.active' );
	if ( !$liactive.length ) {
		$li.first().addClass( 'active' );
		setTimeout( function() {
			$( 'html, body' ).scrollTop( 0 );
		}, 300 );
		return
	}
	
	var classactive = 'active';
	if ( $list.prop( 'id' ) === 'pl-list' ) {
		$liactive = $list.find( 'li.updn' );
		classactive = 'updn';
	}
	var $linext = key === 'ArrowUp' ? $liactive.prev( 'li' ) : $liactive.next( 'li' );
	$liactive.removeClass( classactive );
	if ( !$linext.length ) {
		if ( key === 'ArrowUp' ) {
			$linext = $li.last();
			$( 'html, body' ).scrollTop( $linext.offset().top );
		} else {
			$linext = $li.first();
			$( 'html, body' ).scrollTop( 0 );
		}
		$linext.addClass( classactive );
		return
	}
	
	$linext.addClass( classactive );
	var litop = $linext[ 0 ].getBoundingClientRect().top;
	var libottom = $linext[ 0 ].getBoundingClientRect().bottom;
	var wH = window.innerHeight;
	var liH = $( '.licover' ).length ? 230 : 0;
	if ( key === 'ArrowUp' ) {
		if ( libottom > wH - 40 || litop < 80 + liH ) $( 'html, body' ).scrollTop( $linext.offset().top - wH + 89 );
	} else {
		if ( libottom > wH - 40 ) $( 'html, body' ).scrollTop( $linext.offset().top - 80 - liH );
	}
}