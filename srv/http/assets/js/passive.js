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

// push status
function psOnMessage( channel, data ) {
	switch ( channel ) {
		case 'airplay':       psAirplay( data );        break;
		case 'bookmark':      psBookmark( data );       break;
		case 'coverart':      psCoverart( data );       break;
		case 'display':       psDisplay( data );        break;
		case 'equalizer':     psEqualizer( data );      break;
		case 'mpdplayer':     psMpdPlayer( data );      break;
		case 'mpdradio':      psMpdRadio( data );       break;
		case 'mpdupdate':     psMpdUpdate( data );      break;
		case 'notify':        psNotify( data );         break; // in common.js
		case 'option':        psOption( data );         break;
		case 'order':         psOrder( data );          break;
		case 'playlist':      psPlaylist( data );       break;
		case 'power':         psPower( data );          break;
		case 'savedplaylist': psSavedPlaylists( data ); break;
		case 'radiolist':     psRadioList( data );      break;
		case 'relays':        psRelays( data );         break;
		case 'reload':        location.reload();        break;
		case 'restore':       psRestore( data );        break;
		case 'volume':        psVolume( data );         break;
		case 'vumeter':       psVUmeter( data );        break;
	}
}
function psAirplay( data ) {
	statusUpdate( data );
	if ( V.playback ) renderPlayback();
}
function psBookmark() {
	V.libraryhtml = '';
	refreshData();
}
function psCoverart( data ) {
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
function psDisplay( data ) {
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
function psEqualizer( data ) {
	if ( V.local || ! ( 'active' in E ) ) return
	
	E        = data;
	eqOptionPreset();
}
function psMpdPlayer( data ) {
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
function psMpdRadio( data ) {
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
function psMpdUpdate( data ) {
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
		data.type === 'mpd' ? S.updating_db = true : S.updatingdab = true;
	} else if ( 'stop' in data ) {
		S.updating_db = false;
	} else if ( 'done' in data ) {
		S.updating_db = false;
		S.updatingdab = false;
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
			$.each( data.done, ( k, v ) => C[ k ] = v );
			renderLibraryCounts();
		}
		$( '#lib-list li' ).removeClass( 'nodata' );
	}
	setButtonUpdating();
}
function onPageInactive() {
	if ( D.progress || V.off ) return
	
	intervalClear();
	guideHide();
}
function psOption( data ) {
	if ( V.local ) return
	
	if ( 'addons' in data ) {
		setButtonUpdateAddons();
		return
	}
	
	var option = Object.keys( data )[ 0 ];
	S[ option ] = Object.values( data )[ 0 ];
	setButtonOptions();
}
function psOrder( data ) {
	if ( V.local ) return
	
	O = data;
	orderLibrary();
}
function psPlaylist( data ) {
	if ( V.local || V.sortable || $( '.pl-remove' ).length ) return
	
	if ( 'blink' in data ) {
		playlistBlink();
		return
	}
	
	playlistBlink( 'off' );
	if ( 'blank' in data ) {
		setPlaybackBlank();
		renderPlaylist();
		bannerHide();
	} else {
		if ( V.playlist && V.playlisthome ) renderPlaylist( data );
		playbackStatusGet();
	}
}
function psRadioList( data ) {
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
	S.updatingdab = false;
	$( '#mi-dabupdate' ).addClass( 'hide' );
}
function psRestore( data ) {
	if ( data.restore === 'done' ) {
		banner( 'restore', 'Restore Settings', 'Done' );
		setTimeout( () => location.href = '/', 2000 );
	} else {
		loader();
		banner( 'restore blink', 'Restore Settings', 'Restart '+ data.restore +' ...', -1 );
	}
}
function psSavedPlaylists( data ) {
	var count   = data.count;
	C.playlists = count;
	if ( V.playlistlist ) {
		count ? renderSavedPl( data ) : $( '#playlist' ).trigger( 'click' );
	} else if ( V.playlisttrack ) {
		if ( 'delete' in data && $( '#savedpl-path .lipath' ).text() === data.delete ) $( '#playlist' ).trigger( 'click' );
	}
	$( '#button-pl-playlists' ).toggleClass( 'disabled', count === 0 );
	$( '.mode.playlists gr' ).text( count || '' );
}
function psVolume( data ) {
	if ( V.local ) {
		V.local = false;
		return
	}
	
	if ( 'volumenone' in data ) {
		D.volumenone = data.volumenone;
		$volume.toggleClass( 'hide', ! D.volume || D.volumenone );
		return
	}
	
	if ( [ 'mute', 'unmute' ].includes( data.type ) ) V.local = false; // allow beforeValueChange()
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
function psVUmeter( data ) {
	$( '#vuneedle' ).css( 'transform', 'rotate( '+ data.val +'deg )' ); // 0-100 : 0-42 degree
}

