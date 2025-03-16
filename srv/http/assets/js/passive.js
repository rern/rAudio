W = {
	  ...W // from common.js
	, airplay   : data => {
		statusUpdate( data );
		if ( V.playback ) renderPlayback();
	}
	, bookmark  : () => {
		V.libraryhtml = '';
		refreshData();
	}
	, coverart  : data => {
		clearTimeout( V.timeoutCover );
		bannerHide();
		$( '#liimg' ).css( 'opacity', '' );
		if ( 'bookmark' in data ) {
			if ( V.library && V.libraryhome ) {
				V.libraryhtml = '';
				libraryHome();
			}
			return
		}
		
		if ( data.radio ) {
			S.stationcover = data.url
			if ( V.mode === 'webradio' ) {
				var url = data.url.slice( 0, -4 ) +'-thumb.jpg';
				$( '#lib-list img' ).each( ( i, el ) => {
					var $img = $( el );
					var src  = $img.attr( 'src' ).slice( 0, -13 );
					if ( src === url ) {
						$img.attr( 'src', src + versionHash() );
						return false
					}
				} );
			}
		} else {
			S.coverart = data.url;
		}
		if ( data.radioalbum ) { // online coverarts come with album name
			S.Album = data.radioalbum;
			setInfo();
		}
		var $coverart =  V.playback ? $( '#coverart' ) : $( '#liimg' );
		$coverart.attr( 'src', $coverart.attr( 'src' ) + 0 );
		if ( V.playback || ( V.library && V.libraryhome ) ) return
			
		var $img = V.library ? $( '#lib-list img' ) : $( '#pl-list img' );
		var $el;
		$img.each( ( i, el ) => {
			$el = $( el );
			$el.attr( 'src', $el.attr( 'src' ) + 0 );
		} );
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
				} else if ( [ 'album', 'latest' ].includes( V.mode ) ) {
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
		if ( 'counts' in data ) {
			$.each( data.counts, ( k, v ) => {
				C[ k ] = v;
				$( '.mode.'+ k ).toggleClass( 'nodata', ! v || v === 0 );
				if ( V.mode === k ) $( '#library' ).trigger( 'click' );
				$( '#update, #button-lib-update' ).toggleClass( 'disabled', ! C.nas && ! C.sd && ! C.usb );
			} );
			return
		}
		
		if ( 'type' in data ) {
			if ( data.type === 'mpd' ) S.updating_db = true;
		} else if ( 'stop' in data ) {
			S.updating_db = false;
		} else if ( 'done' in data ) {
			S.updating_db = false;
			V.libraryhtml = V.librarylisthtml = V.playlisthtml = '';
			banner( 'refresh-library', 'Library Update', 'Done' );
			if ( data.done === 'tageditor' ) {
				var query = V.query[ V.query.length - 1 ];
				list( query, function( html ) {
					var data = {
						  html      : html
						, modetitle : query.path
						, path      : query.path
					}
					renderLibraryList( data );
				} );
			} else {
				$.each( data.done, ( k, v ) => { C[ k ] = v } );
				renderLibraryCounts();
			}
			$( '#lib-list li' ).removeClass( 'nodata' );
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
		
		O = data;
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
			playbackStatusGet();
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
				var path = $( '.lib-path' ).text();
				if ( path ) {
					list( { library: "radio", string: path, gmode: "webradio" }, html => {
						renderLibraryList(  {
							  html      : html
							, icon      : V.mode
							, modetitle : path
							, path      : path
						} );
					} );
				} else {
					$( '.mode.'+ V.mode ).trigger( 'click' );
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
				renderLibraryPadding( [ 'album', 'latest' ].includes( V.mode ) ? $( '.coverart' ).eq( 0 ).height() : false );
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
		if ( I.active ) infoWidth();
	}, 0 );
} );

function onPageInactive() {
	if ( D.progress || V.off ) return
	
	intervalClear();
	guideHide();
}
