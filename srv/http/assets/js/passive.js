W = {
	  ...W // from common.js
	, airplay   : data => {
		statusUpdate( data );
		if ( V.playback ) renderPlayback();
	}
	, bookmark  : () => {
		V.html.library = '';
		if ( V.library && V.libraryhome ) libraryHome();
	}
	, cover     : data => {
		if ( V.playback ) $( '#coverart' ).attr( 'src', data.cover + versionHash() );
	}
	, coverart  : data => {
		bannerHide();
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
					var path0 = dirName( S.file );            // dir/file.ext  > dir
					var path1 = dirName( cover );             // dir/cover.ext > dir
				}
				data.current = path0 === path1;
			}
			if ( data.current ) $( '#coverart' ).attr( 'src', coverart + versionHash() );
		} else {
			refreshAll();
		}
	}
	, display   : data => {
		if ( 'submenu' in data ) {
			D[ data.submenu ] = data.value;
			displaySubMenu();
			return
		}
		
		if ( 'updateaddons' in data ) {
			S.updateaddons = data.updateaddons ? true : false;
			setButtonUpdateAddons();
			return
		}
		
		var albumlistchanged = D.albumbyartist !== data.albumbyartist || D.albumyear !== data.albumyear;
		$.each( data, ( k, v ) => { D[ k ] = v } ); // need braces
		V.coverdefault = ! D.covervu && ! D.vumeter ? V.coverart : V.covervu;
		if ( ! D.covervu && ! D.vumeter ) {
			$( '#vu' ).remove();
		} else if ( ! $( '#vu' ).length ) {
			$.get( '/assets/img/vu.svg', data => $( '#coverart' ).after( '<div id="vu">'+ data +'</div>' ), 'text' );
		}
		displayBars();
		$( '.content-top .i-back' ).toggleClass( 'left', D.backonleft );
		if ( V.playback ) {
			displayPlayback();
			renderPlayback();
		} else if ( V.library ) {
			if ( V.libraryhome ) {
				renderLibrary();
			} else {
				if ( V.librarytrack ) {
					setTrackCoverart();
					renderLibraryPadding();
				} else if ( modeAlbum() ) {
					if ( albumlistchanged ) $( '.mode.'+ V.mode ).trigger( 'click' );
				}
			}
		} else {
			setProgressElapsed();
		}
	}
	, mpdplayer : data => {
		if ( 'off' in V || 'reboot' in V ) return
		
		clearTimeout( V.debounce );
		V.debounce = setTimeout( () => {
			if ( ! data.control && data.volume == -1 ) { // fix - upmpdcli missing values on stop/pause
				delete data.control;
				delete data.volume;
			}
			statusUpdate( data );
			if ( V.playback ) {
				renderPlaybackAll();
			} else if ( V.library ) {
				refreshData();
			} else {
				setPlaylistScroll();
			}
			setTimeout( bannerHide, 3000 );
		}, 300 );
	}
	, mpdradio  : data => {
		statusUpdate( data );
		setInfo();
		setCoverart();
		if ( D.radioelapsed ) {
			$( '#progress' ).html( ico( 'play' ) +'<span></span>' );
			setProgressElapsed();
		} else {
			setProgress( 0 );
			setBlinkDot();
		}
		if ( V.playlist ) setPlaylistRadioInfo();
	}	
	, mpdupdate : data => {
		S.updating_db = typeof data === 'boolean';
		if ( ! S.updating_db ) {
			if ( 'done' in data ) {
				banner( 'refresh-library', 'Library Update', 'Done' );
				delete data.done;
			}
			$.each( data, ( k, v ) => { C[ k ] = v } );
			V.html = {}
			V.playback ? refreshData() : refreshAll();
		}
		setButtonUpdating();
	}
	, option    : data => {
		if ( V.local ) return
		
		if ( 'addons' in data ) {
			setButtonUpdateAddons();
			return
		}
		
		var option = Object.keys( data )[ 0 ];
		S[ option ] = Object.values( data )[ 0 ];
		setButtonOptions();
	}
	, order     : data => {
		if ( V.local ) return
		
		O.order = data;
		orderLibrary();
	}
	, playlist  : data => {
		if ( V.local || V.sortable || $( '.pl-remove' ).length ) return
		
		if ( 'blink' in data ) {
			playlistBlink();
			return
		}
		
		playlistBlink( 'off' );
		var playlisthome = V.playlist && V.playlisthome;
		if ( 'blank' in data ) {
			if ( V.playback ) {
				setPlaybackBlank();
			} else if ( playlisthome ) {
				renderPlaylist();
			}
			bannerHide();
		} else {
			if ( playlisthome ) renderPlaylist( data );
			refreshData();
		}
	}
	, playlists : data => {
		savedPlaylistAddClear();
		if ( V.playlistlist && data == -1 ) {
			$( '#playlist' ).trigger( 'click' );
			return
		}
		
		var count   = data.count;
		C.playlists = count;
		if ( V.playlistlist ) {
			renderSavedPl( data );
		} else if ( V.playlisttrack ) {
			if ( 'delete' in data && $( '#pl-title .lipath' ).text() === data.delete ) $( '#playlist' ).trigger( 'click' );
		}
		$( '#button-pl-playlists' ).toggleClass( 'disabled', count === 0 );
		$( '.mode.playlists gr' ).text( count ? count.toLocaleString() : '' );
	}
	, radiolist : data => {
		if ( 'count' in data ) {
			var count      = data.count;
			C[ data.type ] = count;
			$( '.mode.'+ data.type +' gr' ).text( count ? count.toLocaleString() : '' );
		}
		if ( V.library ) {
			if ( V.librarylist && V.mode === data.type ) {
				if ( V.query.length === 1 ) {
					$( '.mode.'+ V.mode ).trigger( 'click' );
				} else {
					var query = V.query.slice( -1 )[ 0 ];
					list( query, html => {
						var data = {
							  html      : html
							, modetitle : query.modetitle
							, path      : query.path
						}
						renderLibraryList( data );
					} );
				}
			}
		} else if ( V.playlist ) {
			if ( V.playlistlist ) {
				$( '#button-pl-playlists' ).trigger( 'click' );
			} else if ( V.playlisttrack ) {
				renderSavedPlTrack( $( '#pl-title .lipath' ).text() );
			} else {
				playlistGet();
			}
		}
	}
	, volume    : data => {
		if ( V.local ) {
			V.local = false;
			return
		}
		
		if ( 'volumenone' in data ) {
			D.volumenone = data.volumenone;
			$volume.toggleClass( 'hide', ! D.volume || D.volumenone );
			return
		}
		if ( [ 'mute', 'unmute' ].includes( data.type ) ) {
			V.local = false; // allow beforeValueChange()
			V.volumediff = Math.abs( S.volume - S.volumemute );
		} else {
			V.volumediff = Math.abs( S.volume - data.val );
		}
		if ( data.type === 'mute' ) {
			S.volume = 0;
			S.volumemute = data.val;
		} else {
			S.volume = data.val;
			S.volumemute = 0;
		}
		setVolume();
		V.volumecurrent = S.volume;
	}
	, vumeter   : data => {
		$( '#vuneedle' ).css( 'transform', 'rotate( '+ data.val +'deg )' ); // 0-100 : 0-42 degree
	}
}

function statusUpdate( data ) {
	$.each( data, ( k, v ) => { S[ k ] = v } ); // need braces
	if ( ! $( '#playback' ).hasClass( 'i-'+ S.player ) ) displayBottom();
	displayBars();
}
function webradioIcon( srcnoext ) {
	var radiourl = decodeURIComponent( srcnoext )
					.split( '/' ).pop()
					.replace( /\|/g, '/' );
	return $( '#lib-list li' ).filter( ( i, el ) => {
		return $( el ).find( '.lipath' ).text() === radiourl;
	} ).find( '.li-icon' );
}
// page resize -----------------------------------------------------------------
window.addEventListener( 'resize', () => { // resize / rotate
	var wW = window.innerWidth;
	if ( V.wW === wW ) return // wH changes with address bar toggle on scroll up-down
	
	V.wH = window.innerHeight;
	V.wW = wW;
	setTimeout( () => {
		var barvisible = $bartop.is( ':visible' );
		if ( V.playback ) {
			displayPlayback();
			setTimeout( renderPlayback, 50 );
			setInfoScroll();
			if ( $( '#bioimg' ).length ) bioTitleSet();
		} else if ( V.library ) {
			if ( V.librarylist ) {
				if ( V.librarytrack ) $( '.liinfo' ).css( 'width', ( wW - $( '.licoverimg img' ).width() - 50 ) );
				renderLibraryPadding( modeAlbum() ? $( '.coverart' ).eq( 0 ).height() : false );
			}
		} else {
			renderPlaylistPadding();
			if ( V.playlisthome ) {
				setTimeout( () => {
					setPlaylistInfoWidth();
					setPlaylistScroll();
				}, 600 );
			}
		}
		displayBars();
		if ( I.active ) infoWidth( 'resize' );
	}, 0 );
} );

function onPageInactive() {
	if ( D.progress || V.off ) return
	
	intervalClear();
	guideHide();
}
