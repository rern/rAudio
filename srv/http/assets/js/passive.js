function radioRefresh() {
	if ( V.query.length ) {
		var query = V.query.slice( -1 )[ 0 ];
		list( query, function( html ) {
			var data = {
				  html      : html
				, modetitle : query.modetitle
				, path      : query.path
			}
			renderLibraryList( data );
		} );
	} else {
		$( '.mode.'+ V.mode ).trigger( 'click' );
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
				renderLibraryPadding();
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
// push status
function psOnMessage( channel, data ) {
	if ( data.page ) return
	
	switch ( channel ) {
		case 'airplay':       ps.airplay( data );        break;
		case 'bookmark':      ps.bookmark( data );       break;
		case 'coverart':      ps.coverart( data );       break;
		case 'display':       ps.display( data );        break;
		case 'equalizer':     ps.equalizer( data );      break;
		case 'mpdplayer':     ps.mpdPlayer( data );      break;
		case 'mpdradio':      ps.mpdRadio( data );       break;
		case 'mpdupdate':     ps.mpdUpdate( data );      break;
		case 'notify':        ps.notify( data );         break; // in common.js
		case 'option':        ps.option( data );         break;
		case 'order':         ps.order( data );          break;
		case 'playlist':      ps.playlist( data );       break;
		case 'playlists':     ps.playlists( data );      break;
		case 'power':         ps.power( data );          break; // in common.js
		case 'radiolist':     ps.radioList( data );      break;
		case 'relays':        ps.relays( data );         break; // in common.js
		case 'reload':        location.reload();         break;
		case 'restore':       ps.restore( data );        break;
		case 'volume':        ps.volume( data );         break;
		case 'vumeter':       ps.vuMeter( data );        break;
	}
}
ps = {
	...ps
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
		'stationcover' in data ? S.stationcover = data.url : S.coverart = data.url;
		setCoverart();
		if ( data.radioalbum ) { // online coverarts come with album name
			S.Album = data.radioalbum;
			setInfo();
		}
		if ( V.library ) return
		
		V.libraryhtml = V.librarylisthtml = V.playlisthtml = '';
		if ( ! V.playback ) refreshData();
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
		if ( V.playback ) {
			displayPlayback();
			renderPlayback();
		} else if ( V.library ) {
			if ( V.libraryhome ) {
				renderLibrary();
			} else {
				$( '#button-lib-back' ).toggleClass( 'back-left', D.backonleft );
				if ( V.librarytrack ) {
					setTrackCoverart();
					renderLibraryPadding();
				} else if ( [ 'album', 'latest' ].includes( V.mode ) ) {
					if ( albumlistchanged ) $( '.mode.'+ V.mode ).trigger( 'click' );
				}
			}
		}
	}
	, equalizer : data => {
		if ( V.local || ! ( 'active' in E ) ) return
		
		E = data;
		eqOptionPreset();
	}
	, mpdPlayer : data => {
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
	, mpdRadio  : data => {
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
		if ( V.playlist ) setPlaylistScroll();
	}	
	, mpdUpdate : data => {
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
			if ( 'delete' in data && $( '#savedpl-path .lipath' ).text() === data.delete ) $( '#playlist' ).trigger( 'click' );
		}
		$( '#button-pl-playlists' ).toggleClass( 'disabled', count === 0 );
		$( '.mode.playlists gr' ).text( count || '' );
	}
	, radioList : data => {
		if ( 'count' in data ) {
			C[ data.type ] = data.count;
			$( '.mode.'+ data.type +' gr' ).text( data.count );
		}
		if ( V.library ) {
			if ( V.librarylist && V.mode === data.type ) radioRefresh();
		} else if ( V.playlist ) {
			if ( V.playlistlist ) {
				$( '#button-pl-playlists' ).trigger( 'click' );
			} else if ( V.playlisttrack ) {
				renderSavedPlTrack( $( '#savedpl-path .lipath' ).text() );
			} else {
				playlistGet();
			}
		}
	}
	, restore   : data => {
		if ( data.restore === 'done' ) {
			banner( 'restore', 'Restore Settings', 'Done' );
			setTimeout( () => location.href = '/', 2000 );
		} else {
			loader();
			banner( 'restore blink', 'Restore Settings', 'Restart '+ data.restore +' ...', -1 );
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
	, vuMeter   : data => {
		$( '#vuneedle' ).css( 'transform', 'rotate( '+ data.val +'deg )' ); // 0-100 : 0-42 degree
	}
}
