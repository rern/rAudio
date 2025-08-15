W = {
	  ...W // from common.js
	, airplay   : data => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		if ( V.playback ) PLAYBACK.main();
	}
	, bookmark  : data => {
		if ( ! V.library || ! V.libraryhome ) return
		
		O.order        = data.order;
		V.html.library = data.html;
		LIBRARY.home( data.html );
		DISPLAY.library();
	}
	, cover     : data => { // online - 1st download, subsequence > mpdplayer
		S.coverart = data.cover;
		if ( V.library ) return
		
		var src    = data.cover + UTIL.versionHash();
		$COVERART.attr( 'src', src );
		PLAYLIST.coverart( src );
	}
	, coverart  : data => { // change
		BANNER_HIDE();
		V.html = {}
		if ( V.playback ) {
			if ( S.webradio && S.state === 'play' ) return
			
			var encoded  = data.coverart[ 0 ] === '%';
			var regex    = encoded ? /^...srv...http/ : /^.srv.http/;
			var coverart = data.coverart.replace( regex, '' );
			if ( ! data.current ) {
				var cover   = encoded ? decodeURIComponent( coverart ) : coverart;
				cover       = cover.replace( /^.mnt.MPD./, '' );
				if ( S.webradio ) {
					var path0 = S.file.replace( /\//g, '|' ); // http://url                        > http:||url
					var path1 = cover.slice( 19, -4 );        // /data/webradio/img/http:||url.ext > http:||url
				} else {
					var path0 = UTIL.dirName( S.file );       // dir/file.ext  > dir
					var path1 = UTIL.dirName( cover );        // dir/cover.ext > dir
				}
				data.current = path0 === path1;
			}
			if ( data.current ) $COVERART.attr( 'src', coverart + UTIL.versionHash() );
		} else {
			UTIL.refresh();
		}
	}
	, display   : data => {
		if ( 'submenu' in data ) {
			D[ data.submenu ] = data.value;
			DISPLAY.subMenu();
			return
		}
		
		if ( 'updateaddons' in data ) {
			S.updateaddons = data.updateaddons ? true : false;
			PLAYBACK.button.update();
			return
		}
		
		var albumlistchanged = D.albumbyartist !== data.albumbyartist || D.albumyear !== data.albumyear;
		$.each( data, ( k, v ) => { D[ k ] = v } ); // need braces
		V.coverdefault = ! D.covervu && ! D.vumeter ? V.coverart : V.covervu;
		if ( ! D.covervu && ! D.vumeter ) {
			$( '#vu' ).remove();
		} else if ( ! $( '#vu' ).length ) {
			$.get( '/assets/img/vu.svg', data => $COVERART.after( '<div id="vu">'+ data +'</div>' ), 'text' );
		}
		DISPLAY.bars();
		$( '.content-top .i-back' ).toggleClass( 'left', D.backonleft );
		if ( V.playback ) {
			DISPLAY.playback();
			PLAYBACK.main();
		} else if ( V.library ) {
			if ( V.libraryhome ) {
				DISPLAY.library();
			} else {
				if ( V.librarytrack ) {
					LIBRARY.coverart();
					LIBRARY.padding();
				} else if ( MODE.album() ) {
					if ( albumlistchanged ) $( '.mode.'+ V.mode ).trigger( 'click' );
				}
			}
		} else {
			PLAYBACK.elapsed();
		}
	}
	, mpdplayer : data => { // play/stop
		if ( 'off' in V || 'reboot' in V ) return
		
		clearTimeout( V.debounce );
		V.debounce = setTimeout( () => {
			if ( ! data.control && data.volume == -1 ) { // fix - upmpdcli missing values on stop/pause
				delete data.control;
				delete data.volume;
			}
			UTIL.statusUpdate( data );
			if ( V.playback ) {
				UTIL.refreshPlayback();
			} else if ( V.library ) {
				REFRESHDATA();
			} else {
				PLAYLIST.coverart( S.coverart + UTIL.versionHash() );
				PLAYLIST.render.scroll();
			}
			setTimeout( BANNER_HIDE, 3000 );
		}, 300 );
	}
	, mpdradio  : data => {
		$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
		PLAYBACK.info.set();
		PLAYBACK.coverart();
		if ( D.radioelapsed ) {
			$( '#progress' ).html( ICON( 'play' ) +'<span></span>' );
			PLAYBACK.elapsed();
		} else {
			PROGRESS.set( 0 );
		}
		if ( V.playlist ) PLAYLIST.render.widthRadio();
	}	
	, mpdupdate : data => {
		S.updating_db = typeof data === 'boolean';
		if ( ! S.updating_db ) {
			if ( 'done' in data ) {
				BANNER( 'refresh-library', 'Library Update', 'Done' );
				delete data.done;
			}
			$.each( data, ( k, v ) => { C[ k ] = v } );
			V.html = {}
			V.playback ? REFRESHDATA() : UTIL.refresh();
		}
		PLAYBACK.button.updating();
	}
	, option    : data => {
		if ( V.local ) return
		
		if ( 'addons' in data ) {
			PLAYBACK.button.update();
			return
		}
		
		var option = Object.keys( data )[ 0 ];
		S[ option ] = Object.values( data )[ 0 ];
		PLAYBACK.button.options();
	}
	, order     : data => {
		if ( V.local ) return
		
		O.order = data;
		LIBRARY.order();
	}
	, playlist  : data => {
		if ( V.local || V.sort || $( '.pl-remove' ).length ) return
		
		if ( 'blink' in data ) {
			PLAYLIST.blink();
			return
		}
		
		PLAYLIST.blink( 'off' );
		var playlisthome = V.playlist && V.playlisthome;
		if ( 'blank' in data ) {
			if ( V.playback ) {
				PLAYBACK.blank();
			} else if ( playlisthome ) {
				PLAYLIST.render.home();
			}
			BANNER_HIDE();
		} else {
			if ( playlisthome ) PLAYLIST.render.home( data );
			REFRESHDATA();
		}
	}
	, playlists : data => {
		if ( V.sort ) return
		
		PLAYLIST.playlists.addClear();
		if ( V.playlistlist && data == -1 ) {
			$( '#playlist' ).trigger( 'click' );
			return
		}
		
		var count   = data.count;
		C.playlists = count;
		if ( V.playlistlist ) {
			PLAYLIST.playlists.home( data );
		} else if ( V.playlisttrack ) {
			if ( 'delete' in data && $( '#pl-title .lipath' ).text() === data.delete ) $( '#playlist' ).trigger( 'click' );
		}
		$( '#button-pl-playlists' ).toggleClass( 'disabled', count === 0 );
		$( '.mode.playlists gr' ).text( count ? count.toLocaleString() : '' );
	}
	, radiolist : data => {
		if ( 'dirdelete' in data ) {
			var path = $( '#lib-path' ).text();
			if ( path === data.dirdelete +'/'+ data.name ) {
				$( '#button-lib-back' ).trigger( 'click' );
			} else if ( path === data.dirdelete ) {
				$( '#lib-list li' ).each( ( i, el ) => {
					var $el = $( el );
					if ( $el.find( '.lipath' ).text() === data.name ) $el.remove();
				} );
			}
			return
		}
		
		if ( 'count' in data ) {
			var count      = data.count;
			C[ data.type ] = count;
			$( '.mode.'+ data.type +' gr' ).text( count ? count.toLocaleString() : '' );
		}
		if ( V.library ) {
			if ( ! V.query ) return // dirdelete - back 1 level
			
			if ( V.librarylist && V.mode === data.type ) {
				if ( V.query.length === 1 ) {
					$( '.mode.'+ V.mode ).trigger( 'click' );
				} else {
					var query = V.query.slice( -1 )[ 0 ];
					LIST( query, html => {
						var data = {
							  html      : html
							, modetitle : query.modetitle
							, path      : query.path
						}
						LIBRARY.list( data );
					} );
				}
			}
		} else if ( V.playlist ) {
			if ( V.playlistlist ) {
				$( '#button-pl-playlists' ).trigger( 'click' );
			} else if ( V.playlisttrack ) {
				PLAYLIST.playlists.list( $( '#pl-title .lipath' ).text() );
			} else {
				PLAYLIST.get();
			}
		}
	}
	, vumeter   : data => $( '#vuneedle' ).css( 'transform', 'rotate( '+ data.val +'deg )' ) // 0-100 : 0-42 degree
}

// page resize -----------------------------------------------------------------
window.addEventListener( 'resize', () => { // resize / rotate
	var wW = window.innerWidth;
	if ( V.wW === wW ) return // wH changes with address bar toggle on scroll up-down
	
	V.wH = window.innerHeight;
	V.wW = wW;
	setTimeout( () => {
		if ( V.playback ) {
			DISPLAY.playback();
			setTimeout( PLAYBACK.main, 50 );
			PLAYBACK.info.scroll();
			if ( $( '#bioimg' ).length ) bioTitleSet();
		} else if ( V.library ) {
			if ( V.librarylist ) {
				if ( V.librarytrack ) $( '.liinfo' ).css( 'width', ( wW - $( '.licoverimg img' ).width() - 50 ) );
				LIBRARY.padding();
			}
		} else {
			PLAYLIST.render.padding();
			if ( V.playlisthome ) {
				setTimeout( () => {
					PLAYLIST.render.width();
					PLAYLIST.render.scroll();
				}, 600 );
			}
		}
		DISPLAY.bars();
		if ( I.active ) _INFO.width( 'resize' );
	}, 0 );
} );

function onPageInactive() {
	if ( D.progress || V.off ) return
	
	UTIL.intervalClear();
	if ( S.elapsed && S.state === 'play' ) PROGRESS.set( S.elapsed );
}
