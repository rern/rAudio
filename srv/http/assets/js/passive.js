$( window ).on( 'resize', () => { // portrait / landscape
	displayBars();
	if ( G.wH > G.wW === window.innerHeight > window.innerWidth ) return
	
	G.wH = window.innerHeight;
	G.wW = window.innerWidth;
	var barvisible = $bartop.is( ':visible' );
	if ( G.playback ) {
		if ( $( '#bio' ).hasClass( 'hide' ) ) {
			displayPlayback();
			setTimeout( renderPlayback, 50 );
			setButtonControl();
		} else {
			if ( window.innerWidth > 480 ) {
				$( '#biocontent .artist' ).insertAfter( '#bioimg' );
			} else {
				$( '#biocontent .artist' ).insertBefore( '#bioimg' );
			}
		}
	} else if ( G.library ) {
		if ( G.librarylist ) {
			setTimeout( () => {
				if ( $( '.licover' ).length ) {
					$( '#lib-list p' ).css( 'min-height', ( barvisible ? 40 : 0 ) );
					$( '.liinfo' ).css( 'width', ( document.body.clientWidth - $( '.licoverimg img' ).width() - 50 ) );
				} else {
					$( '#lib-list p' ).css( 'min-height', G.wH - ( barvisible ? 130 : 90 ));
				}
			}, 0 );
		}
	} else {
		if ( G.playlist && ! G.savedlist && ! G.savedplaylist ) {
			setTimeout( () => {
				setPlaylistInfoWidth();
				setPlaylistScroll()
				$( '#pl-list p' ).css( 'min-height', G.wH - ( barvisible ? 277 : 237 ) );
			}, 0 );
		}
	}
} );
function radioRefresh() {
	var query = G.query[ G.query.length - 1 ];
	if ( query.path ) {
		list( query, function( html ) {
			var data = {
				  html      : html
				, modetitle : query.modetitle
				, path      : query.path
			}
			renderLibraryList( data );
		} );
	} else {
		$( '#mode-'+ G.mode ).click();
	}
}
function statusUpdate( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	if ( ! $( '#playback' ).hasClass( 'fa-'+ G.status.player ) ) displayBottom();
	setButtonControl();
	setButtonOptions();
	if ( G.display.snapclient ) bash( [ 'lcdcharrefresh', JSON.stringify( G.status ) ] );
}
function webradioIcon( srcnoext ) {
	var radiourl = decodeURIComponent( srcnoext )
					.split( '/' ).pop()
					.replace( /\|/g, '/' );
	return $( '#lib-list li' ).filter( function() {
		return $( this ).find( '.lipath' ).text() === radiourl;
	} ).find( '.lib-icon' );
}
// pushstreamChannel() in common.js
var channels = [ 'airplay', 'bookmark', 'btreceiver', 'coverart', 'display', 'equalizer', 'mpdplayer', 'mpdradio', 'mpdupdate',
				'notify', 'option', 'order', 'playlist', 'radiolist', 'relays', 'reload', 'savedplaylist', 'volume', 'webradio' ];
if ( ! G.localhost ) channels.push( 'vumeter' );
pushstreamChannel( channels )
pushstream.onstatuschange = status => { // 0 - disconnected; 1 - reconnect; 2 - connected
	if ( status === 2 && G.disconnected ) { // connected - suppress on 1st load
		pushstream.timeout = 6000; // reset 16000 > 6000 from reboot
		getPlaybackStatus( 'withdisplay' );
	} else if ( status === 0 ) {            // disconnected
		G.disconnected = 1;
		clearIntervalAll();
		hideGuide();
		if ( $( '#infoIcon' ).hasClass( 'fa-relays' ) ) $( '#infoX' ).click();
	}
}
pushstream.onmessage = ( data, id, channel ) => {
	switch ( channel ) {
		case 'airplay':       psAirplay( data );        break;
		case 'bookmark':      psBookmark( data );       break;
		case 'btreceiver':    psBtReceiver( data );     break;
		case 'coverart':      psCoverart( data );       break;
		case 'display':       psDisplay( data );        break;
		case 'equalizer':     psEqualizer( data );      break;
		case 'mpdplayer':     psMpdPlayer( data );      break;
		case 'mpdradio':      psMpdRadio( data );       break;
		case 'mpdupdate':     psMpdUpdate( data );      break;
		case 'notify':        psNotify( data );         break;
		case 'option':        psOption( data );         break;
		case 'order':         psOrder( data );          break;
		case 'playlist':      psPlaylist( data );       break;
		case 'savedplaylist': psSavedPlaylists( data ); break;
		case 'radiolist':     psRadioList( data );      break;
		case 'relays':        psRelays( data );         break;
		case 'reload':        location.href = '/';      break;
		case 'restore':       psRestore( data );        break;
		case 'volume':        psVolume( data );         break;
		case 'vumeter':       psVUmeter( data );        break;
	}
}
function psAirplay( data ) {
	statusUpdate( data );
	if ( G.playback ) renderPlayback();
}
function psBtReceiver( connected ) {
	var prefix = $time.is( ':visible' ) ? 'ti' : 'i';
	$( '#'+ prefix +'-btsender' ).toggleClass( 'hide', ! connected );
}
function psBookmark( data ) {
	if ( data.type === 'add' ) {
		if ( data.src ) {
			var icon = '<img class="bkcoverart" src="'+ data.src +'">';
		} else {
			var icon = '<i class="fa fa-bookmark"></i><a class="label">'+ data.name +'</a>';
		}
		var html = `
<div class="lib-mode bookmark">
	<div class="mode mode-bookmark">
	<a class="lipath">${ data.path }</a>
	${ icon }
</div></div>
`;
		$( '#lib-mode-list' ).append( html );
	} else {
		$( '.lib-mode.bookmark' ).each( function() {
			var $this = $( this );
			if ( $this.find( '.lipath' ).text() === data.path ) {
				data.type === 'delete' ? $this.remove() : $this.find( '.label' ).text( data.name );
				return false
			}
		} );
	}
	if ( data.order ) {
		G.display.order = data.order;
		orderLibrary();
	}
}
function psCoverart( data ) {
	clearTimeout( G.timeoutCover );
	$( '#coverart, #liimg' ).css( 'opacity', '' );
	data.type === 'coverart' ? G.status.coverart = data.url : G.status.stationcover = data.url;
	setCoverart();
	if ( 'Album' in data ) { // online coverarts come with album name
		G.status.Album = data.Album;
		setInfo();
	}
	if ( G.library && data.url.slice( 0, 13 ) === '/data/audiocd' ) return
	
	G.libraryhtml      = '';
	G.librarylisthtml  = '';
	G.playlisthtml     = '';
	G.playlistlisthtml = '';
	refreshPage();
	bannerHide();
}
function psDisplay( data ) {
	if ( 'submenu' in data ) {
		G.display[ data.submenu ] = data.value;
		displaySubMenu();
		return
	}
	
	if ( 'updateaddons' in data ) {
		G.status.updateaddons = data.updateaddons ? true : false;
		setButtonUpdateAddons();
		return
	}
	
	$.each( data, function( key, val ) {
		G.display[ key ] = val;
	} );
	G.coverdefault = ! G.display.covervu && ! G.display.vumeter ? G.coverart : G.covervu;
	displayBars();
	if ( G.playback ) {
		setButtonControl();
		displayPlayback();
		renderPlayback();
	} else if ( G.library ) {
		if ( ! G.librarylist ) {
			renderLibrary();
		} else if ( $( '.lib-icon' ).eq( 0 ).hasClass( 'fa-music' ) ) {
			if ( G.display.hidecover ) {
				$( '.licover' ).remove();
			} else {
				var query = G.query[ G.query.length - 1 ];
				list( query, function( html ) {
					var data = {
						  html      : html
						, modetitle : query.modetitle
						, path      : query.path
					}
					renderLibraryList( data );
				} );
			}
		}
		$( '#button-lib-back' ).toggleClass( 'back-left', G.display.backonleft );
	}
}
function psEqualizer( data ) {
	if ( ! $( '#eqpreset' ).length ) return
	
	G.eq = data;
	infoEqualizer( 'update' );
}
function psMpdPlayer( data ) {
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( data.state === 'play' && ! data.Title && [ 'radiofrance', 'radioparadise' ].includes( data.icon ) ) {
			bash( [ 'radiorestart' ] ); // fix slow wi-fi - on station changed
		}
		if ( ! data.control && data.volume == -1 ) { // fix - upmpdcli missing values on stop/pause
			delete data.control;
			delete data.volume;
		}
		statusUpdate( data );
		if ( G.playback ) {
			displayPlayback();
			renderPlayback();
		} else if ( G.playlist ) {
			setPlaylistScroll();
		}
	}, G.debouncems );
}
function psMpdRadio( data ) {
	statusUpdate( data );
	setProgress( 0 );
	if ( G.playback ) {
		setInfo();
		setCoverart();
		if ( G.display.radioelapsed ) {
			$( '#progress' ).html( '<i class="fa fa-play"></i><span></span>' );
			setProgressElapsed();
		} else {
			setBlinkDot();
		}
	} else if ( G.playlist ) {
		setPlaylistScroll();
	}
}	
function psMpdUpdate( data ) {
	if ( 'type' in data ) {
		if ( data.type === 'mpd' ) {
			G.status.updating_db = true;
		} else {
			G.status.updatingdab = true;
		}
		setButtonUpdating();
		return
	}
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		G.status.counts      = data;
		G.status.updating_db = false;
		G.status.updatingdab = false;
		renderLibraryCounts();
		setButtonUpdating();
		refreshPage( 'resetdata' );
		banner( 'library', 'Library Update', 'Done' );
	}, 3000 );
}
function psNotify( data ) {
	var icon    = data.icon;
	var title   = data.title;
	var message = data.message;
	var delay   = data.delay;
	if ( message === 'Online ...' || message === 'Offline ...' ) { // server rAudio power on/off
		setTimeout( function() {
			location.href = '/';
		}, 3000 );
	}
	
	banner( icon, title, message, delay );
	if ( title === 'Power' ) {
		switchPage( 'playback' );
		loader();
		if ( message === 'Off ...' ) {
			$( '#loader' ).css( 'background', '#000000' );
			setTimeout( function() {
				$( '#loader .logo' ).css( 'animation', 'none' );
			}, 10000 );
			pushstream.disconnect();
			G.poweroff = 1;
		}
	} else if ( message === 'Change track ...' ) { // audiocd
		clearIntervalAll();
	} else if ( title === 'Latest' ) {
		G.status.counts.latest = 0;
		$( '#mode-latest gr' ).empty();
		if ( G.mode === 'latest' ) $( '#button-library' ).click();
	}
}
function psOption( data ) {
	if ( G.local ) return
	
	if ( 'addons' in data ) {
		setButtonUpdateAddons();
		return
	}
	
	var option = Object.keys( data )[ 0 ];
	G.status[ option ] = Object.values( data )[ 0 ];
	setButtonOptions();
}
function psOrder( data ) {
	if ( G.local ) return
	
	G.display.order = data;
	orderLibrary();
}
function psPlaylist( data ) {
	if ( ! data.add
		&& ( G.local || G.sortable || $( '.pl-remove' ).length )
	) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( data == -1 ) {
			setPlaybackBlank();
			renderPlaylist( -1 );
			bannerHide();
		} else if ( 'autoplaycd' in data ) {
			G.autoplaycd = 1;
			setTimeout( function() { delete G.autoplaycd }, 5000 );
		} else if ( 'html' in data ) {
			G.status.song = data.song;
			if ( G.playlist && ! G.savedlist && ! G.savedplaylist ) renderPlaylist( data );
		} else {
			var name = $( '#pl-path .lipath' ).text();
			if ( G.savedplaylist && data.playlist === name ) renderSavedPlaylist( name );
		}
		getPlaybackStatus();
	}, G.debouncems );
}
function psRadioList( data ) {
	if ( 'count' in data ) {
		G.status.counts[ data.type ] = data.count;
		$( '#mode-'+ data.type +' gr' ).text( data.count );
	}
	if ( G.librarylist && G.mode === data.type ) {
		radioRefresh();
	} else if ( G.playlist && ! G.local ) {
		getPlaylist();
	}
	G.status.updatingdab = false;
	$( '#i-dabupdate' ).addClass( 'hide' );
}
function psRelays( response ) {
	clearInterval( G.intRelaysTimer );
	if ( 'on' in response ) {
		$( '#device'+ response.on ).removeClass( 'gr' );
	} else if ( 'off' in response ) {
		$( '#device'+ response.off ).addClass( 'gr' );
	} else if ( 'done' in response ) {
		$( '#infoX' ).click();
	}
	if ( ! ( 'state' in response ) ) return
		
	var stopwatch = '<div class="msg-l"><object type="image/svg+xml" data="/assets/img/stopwatch.svg"></object></div>';
	var state     = response.state;
	if ( state === 'RESET' ) {
		$( '#infoX' ).click();
	} else if ( state === 'IDLE' ) {
		info( {
			  icon        : 'relays'
			, title       : 'Relays Countdown'
			, message     : stopwatch
						   +'<div class="msg-r wh">60</div>'
			, buttonlabel : '<i class="fa fa-relays"></i>Off'
			, buttoncolor : red
			, button      : function() {
				bash( '/srv/http/bash/settings/relays.sh' );
			}
			, oklabel     : '<i class="fa fa-set0"></i>Reset'
			, ok          : function() {
				bash( [ 'relaystimerreset' ] );
				banner( 'relays', 'GPIO Relays', 'Reset idle timer to '+ response.timer +'m' );
			}
		} );
		var delay = 59;
		G.intRelaysTimer = setInterval( function() {
			if ( delay ) {
				$( '.infomessage .wh' ).text( delay-- );
			} else {
				clearInterval( G.intRelaysTimer );
				$( '#relays' ).removeClass( 'on' );
				$( '#i-relays, #ti-relays' ).addClass( 'hide' );
			}
		}, 1000 );
	} else {
		if ( ! state ) $( '#infoX' ).click();
		var devices = '';
		$.each( response.order, function( i, val ) {
			if ( i === 0 ) {
				var color = state ? '' : 'class="gr"';
			} else {
				var color = state ? 'class="gr"' : '';
			}
			devices += '<a id="device'+ ( i + 1 ) +'" '+ color +'>'+ val +'</a><br>';
		} );
		if ( $( '#infoOverlay' ).hasClass( 'hide' ) ) {
			info( {
				  icon       : 'relays'
				, title      : 'Relays '+ ( state ? 'ON' : 'OFF' )
				, message    : stopwatch
							  +'<div class="msg-r">'+ devices +'</div>'
				, okno       : 1
				, beforeshow : function() {
					$( '#infoX' ).addClass( 'hide' );
				}
			} );
		} else {
			$( '#infoTitle' ).text( 'GPIO Relays '+ ( state ? 'ON' : 'OFF' ) );
			$( '.infobtn' ).addClass( 'hide' );
			$( '.infofooter wh' ).html( devices );
		}
	}
}
function psRestore( data ) {
	if ( data.restore === 'done' ) {
		banner( 'restore', 'Restore Settings', 'Done' );
		setTimeout( function() {
			location.href = '/';
		}, 2000 );
	} else {
		loader();
		banner( 'restore blink', 'Restore Settings', 'Restart '+ data.restore +' ...', -1 );
	}
}
function psSavedPlaylists( data ) {
	var count                 = data.count;
	G.status.counts.playlists = count;
	if ( G.savedlist ) {
		count ? renderPlaylistList( data ) : $( '#playlist' ).click();
	} else if ( G.savedplaylist ) {
		if ( 'delete' in data && $( '#pl-path .lipath' ).text() === data.delete ) $( '#playlist' ).click();
	}
	$( '#button-pl-playlists' ).toggleClass( 'disabled', count === 0 );
	$( '#mode-playlists gr' ).text( count || '' );
}
function psVolume( data ) {
	if ( data.type === 'disable' ) {
		$( '#volume-knob, #vol-group i' ).toggleClass( 'disabled', data.val );
		return
	} else if ( 'volumenone' in data ) {
		G.display.volumenone = data.volumenone;
		$( '#volume-knob' ).toggleClass( 'hide', data.volumenone )
		return
	}
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( data.type === 'mute' ) {
			G.status.volume     = 0;
			G.status.volumemute = data.val;
		} else {
			G.status.volume     = data.val;
			G.status.volumemute = 0;
		}
		setVolume();
	}, G.debouncems );
}
function psVUmeter( data ) {
	$( '#vuneedle' ).css( 'transform', 'rotate( '+ data.val +'deg )' ); // 0-100 : 0-42 degree
}

