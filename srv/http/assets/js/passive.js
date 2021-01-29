function onVisibilityChange( callback ) {
    var visible = 1;
    function focused() {
        if ( !visible ) callback( visible = 1 );
    }
    function unfocused() {
        if ( visible ) callback( visible = 0 );
    }
    document.addEventListener( 'visibilitychange', function() {
		document.hidden ? unfocused() : focused();
	} );
    window.onpageshow = window.onfocus = focused;
    window.onpagehide = window.onblur = unfocused;
};
onVisibilityChange( function( visible ) {
	if ( visible ) {
		pushstream.connect();
	} else {
		clearIntervalAll();
		pushstream.disconnect();
	}
} );
window.addEventListener( 'orientationchange', function() {
	if ( G.playback ) $( '#page-playback' ).addClass( 'hide' );
	setTimeout( function() {
		if ( G.playback ) {
			setTimeout( scrollLongText, 300 );
			$( '#page-playback' ).removeClass( 'hide' );
			if ( G.status.state === 'play' ) {
				bash( "mpc | awk '/^.playing/ {print $3}' | cut -d/ -f1", function( HMS ) {
					if ( HMS ) {
						G.status.elapsed = HMS2Second( HMS );
						displayPlayback();
						renderPlayback();
						setButtonControl()
					}
				} );
			} else {
				displayPlayback();
				renderPlayback();
				setButtonControl()
			}
		} else if ( G.library ) {
			if ( G.librarylist || G.savedlist ) {
				if ( $( '.licover' ).length ) {
					$( '#lib-list p' ).css( 'min-height', ( G.bars ? 40 : 0 ) +'px' );
					$( '.liinfo' ).css( 'width', ( window.innerWidth - $( '.licoverimg img' ).width() - 50 ) +'px' );
				} else {
					$( '#lib-list p' ).css( 'min-height', window.innerHeight - ( G.bars ? 130 : 90 ) +'px' );
				}
			}
		} else {
			if ( G.playlist && !G.savedlist && !G.savedplaylist ) {
				getTitleWidth();
				setTitleWidth();
				setPlaylistScroll()
				$( '#pl-list p' ).css( 'min-height', window.innerHeight - ( G.bars ? 277 : 237 ) +'px' );
			}
		}
	}, 100 );
} );

var pushstream = new PushStream( {
	  modes                                 : 'websocket'
	, timeout                               : 5000
	, reconnectOnChannelUnavailableInterval : 5000
} );
var streams = [ 'airplay', 'bookmark', 'coverart', 'display', 'relays', 'mpdplayer', 'mpdupdate',
	'notify', 'option', 'order', 'playlist', 'reload', 'snapcast', 'spotify', 'volume', 'webradio' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {
		getPlaybackStatus();
		if ( $( '#infoIcon' ).hasClass( 'fa-relays' ) ) $( '#infoX' ).click();
		setTimeout( function() {
			if ( G.status.relayson ) bash( [ 'relayscountdown' ] );
		}, 1000 );
	} else if ( status === 0 ) { // disconnect
		bannerHide();
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch( channel ) {
		case 'airplay':    psAirplay( data );    break;
		case 'bookmark':   psBookmark( data );   break;
		case 'coverart':   psCoverart( data );   break;
		case 'display':    psDisplay( data );    break;
		case 'relays':     psRelays( data );       break;
		case 'mpdplayer':  psMpdPlayer( data );  break;
		case 'mpdupdate' : psMpdUpdate( data );  break;
		case 'notify':     psNotify( data );     break;
		case 'option':     psOption( data );     break;
		case 'order':      psOrder( data );      break;
		case 'playlist':   psPlaylist( data );   break;
		case 'reload':     psReload( data );     break;
		case 'restore':    psRestore( data );    break;
		case 'snapcast':   psSnapcast( data );   break;
		case 'spotify':    psSpotify( data );    break;
		case 'volume':     psVolume( data );     break;
		case 'webradio':   psWebradio( data );   break;
	}
}
function psAirplay( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	if ( !$( '#tab-playback' ).hasClass( 'fa-airplay' ) ) displayBottom();
	renderPlayback();
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		bash( [ 'pushstatus', 'lcdchar' ] );
	}, 2000 );
}
function psBookmark( data ) {
	if ( G.bookmarkedit ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( 'html' in data ) {
			$( '#lib-mode-list' ).append( data.html );
		} else {
			var $bookmark = $( '.lib-mode' ).filter( function() {
				return $( this ).find( '.lipath' ) === data.path;
			} );
			if ( data.type === 'delete' ) {
				$bookmark.remove();
			} else {
				$bookmark.find( '.bklabel' ).text( data.name );
			}
		}
		if ( 'order' in data ) G.display.order = data.order;
	}, G.debouncems );
}
function psCoverart( data ) {
	clearTimeout( G.timeoutCover );
	var src = data.url;
	var url = decodeURIComponent( data.url );
	var path = url.substr( 0, url.lastIndexOf( '/' ) );
	switch( data.type ) {
		case 'coverart':
			G.status.coverart = src;
			if ( G.playback ) {
				$( '#vu' ).addClass( 'hide' );
				$( '#coverart' )
					.attr( 'src', src )
					.removeClass( 'hide' );
			}
			break;
		case 'bookmarks':
			var $li = $( '.bookmark' ).filter( function() {
				return $( this ).find( '.lipath' ).text() === path;
			} );
			if ( $li.length ) $li.attr( 'src', src );
			break;
		case 'webradio':
			G.status.coverartradio = src;
			if ( G.mode === 'webradio' ) {
				var srcnoext = src.slice( 0, -15 );
				var srcthumb = srcnoext +'-thumb'+ src.slice( -15 );
				var $el = webradioIcon( srcnoext );
				$el.replaceWith( '<img class="lazy iconthumb lib-icon loaded" data-target="#menu-webradio" data-ll-status="loaded" src="'+ srcthumb +'">' );
			}
			if ( G.playback ) {
				$( '#vu' ).addClass( 'hide' );
				$( '#coverart' )
					.attr( 'src', src )
					.css( 'opacity', '' )
					.removeClass( 'hide' );
			} else if ( G.playlist ) {
				$( '#tab-playlist' ).click();
			}
			break;
		case 'webradioreset':
			G.status.coverartradio = '';
			if ( G.mode === 'webradio' ) {
				var $el = webradioIcon( src );
				$el.replaceWith( '<i class="fa fa-webradio lib-icon" data-target="#menu-webradio"></i>' );
			}
			if ( G.playback ) {
				$( '.edit' ).remove();
				$( '#coverart' ).addClass( 'hide' );
				$( '#vu' ).removeClass( 'hide' );
				G.status.state === 'stop'|| !G.status.coverart ? vuStop() : vu();
			} else if ( G.playlist ) {
				$( '#tab-playlist' ).click();
			}
			break;
	}
	bannerHide();
}
function psDisplay( data ) {
	if ( G.local ) return
	
	if ( 'updateaddons' in data ) {
		G.status.updateaddons = data.updateaddons ? true : false;
		setButtonUpdateAddons();
		return
	}
	
	var hidecover = G.display.hidecover;
	$.each( data, function( key, val ) {
		G.display[ key ] = val;
	} );
	if ( G.playback ) {
		setButtonControl();
		displayPlayback();
		renderPlayback();
	} else if ( G.library ) {
		if ( !G.librarylist ) {
			renderLibrary();
		} else if ( $( '.licover' ).length ) {
			if ( hidecover && !G.display.hidecover ) {
				var query = G.query[ G.query.length - 1 ];
				list( query, function( data ) {
					data.path = query.path;
					data.modetitle = query.modetitle;
					renderLibraryList( data );
				}, 'json' );
			} else {
				setTrackCoverart();
			}
		} else if ( $( '#lib-list .coverart' ).length && G.albumbyartist !== G.display.albumbyartist ) {
			G.query = [];
			$( '#mode-album' ).click();
		}
	}
	displayBars();
}
function psMpdPlayer( data ) {
	var playlistlength = G.status.playlistlength;
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	if ( !$( '#tab-playback' ).hasClass( 'fa-'+ G.status.player ) ) displayBottom();
	setButtonControl();
	if ( G.playlist ) {
		setPlaylistScroll();
	} else if ( G.playback ) {
		displayPlayback();
		renderPlayback();
		if ( !$( '#vu' ).hasClass( 'hide' ) ) G.status.state === 'play' ? vu() : vuStop();
	}
	setTimeout( bannerHide, 3000 );
}
function psMpdUpdate( data ) {
	var $elupdate = $( '#tab-library, #button-library, #i-update, #ti-update' );
	$( '#i-update, #ti-update' ).addClass( 'hide' );
	if ( typeof data === 'number' ) {
		G.status.updating_db = true;
		if ( G.localhost ) return
		
		if ( G.bars ) {
			if ( !G.localhost ) $( '#tab-library, #button-library' ).addClass( 'blink' );
		} else {
			if ( !G.localhost ) $( '#button-library' ).addClass( 'blink' );
			$( '#'+ ( G.display.time ? 'ti' : 'i' ) +'-update' ).removeClass( 'hide' );
		}
	} else {
		G.status.updating_db = false;
		$( '#lib-mode-list' ).data( 'count', data.title )
		$( '#li-count' ).remove();
		$( '#lib-breadcrumbs' ).append( '<span id="li-count">'+ data.song.toLocaleString() +' <i class="fa fa-music gr"></i></span>' );
		delete data.title;
		G.status.counts = data;
		$.each( data, function( key, val ) {
			$( '#mode-'+ key ).find( 'grl' ).text( val ? val.toLocaleString() : '' );
		} );
		if ( G.library ) {
			if ( G.mode === 'webradio' ) {
				data.webradio ? $( '#mode-webradio' ).click() : $( '#button-library' ).click();
			} else {
				$( '.lib-icon.blink' ).removeClass( 'blink' );
				var query = G.query[ G.query.length - 1 ];
				if ( query ) {
					list( query, function( data ) {
						data.path = query.path;
						data.modetitle = query.modetitle;
						renderLibraryList( data );
					}, 'json' );
				}
			}
		} else if ( G.playlist && !G.savedlist ) {
			$( '#tab-playlist' ).click();
		}
		setTimeout( function() {
			$( '#tab-library, #button-library, #i-update, #ti-update' )
				.removeClass( 'fa-file-wave' )
				.addClass( 'fa-library' );
			$( '#tab-library, #button-library, .lib-icon.blink' ).removeClass( 'blink' );
			banner( 'Library Update', 'Done', 'library' );
		}, 2000 );
	}
}
function psNotify( data ) {
	banner( data.title, data.text, data.icon, data.delay );
	if ( data.icon === 'file-wave' ) {
		$( '#tab-library, #button-library, #i-update, #ti-update' )
			.removeClass( 'fa-library' )
			.addClass( 'fa-file-wave' );
	}
	if ( data.title === 'Power' ) {
		if ( data.text === 'Off ...' ) $( '#loader' ).addClass( 'splash' );
		loader();
	} else if ( data.title === 'AirPlay' && data.text === 'Stop ...' ) {
		loader( 'show' );
	}
}
function psOption( data ) {
	if ( G.local ) return
	
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
	if ( data == -1 ) {
		renderPlaylist( -1 );
	} else if ( 'html' in data ) {
		if ( !G.plremove ) renderPlaylist( data );
	} else if ( data.playlist === 'save' ) {
		if ( G.savedlist ) $( '#button-pl-open' ).click();
	} else {
		var name = $( '#pl-path .lipath' ).text();
		if ( G.savedplaylist && data.playlist === name ) renderSavedPlaylist( name );
	}
}
function psRelays( response ) { // on receive broadcast
	var stopwatch = '<img src="/assets/img/stopwatch.'+ hash +'.svg">';
	clearInterval( G.intRelaysTimer );
	if ( 'on' in response ) {
		$( '#device'+ response.on ).removeClass( 'gr' );
	} else if ( 'off' in response ) {
		$( '#device'+ response.off ).addClass( 'gr' );
	} else if ( 'done' in response ) {
		G.status.relayson = response.done;
		setButtonOptions();
		$( '#infoX' ).click();
	}
	if ( !( 'state' in response ) ) return
		
	var state = response.state;
	G.status.relayson = state;
	if ( state === 'RESET' ) {
		$( '#infoX' ).click();
	} else if ( state === 'IDLE' ) {
//		if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
		
		var delay = response.delay;
		info( {
			  icon        : 'relays'
			, title       : 'GPIO Relays Countdown'
			, message     : stopwatch
			, footer      : '<white>'+ delay +'</white>'
			, buttonwidth : 1
			, buttonlabel : '<i class="fa fa-relays"></i>Off'
			, buttoncolor : red
			, button      : function() {
				bash( '/srv/http/bash/relays.py false' );
			}
			, oklabel     : '<i class="fa fa-refresh"></i>Reset'
			, ok          : function() {
				bash( [ 'relaystimerreset' ] );
			}
		} );
		delay--
		G.intRelaysTimer = setInterval( function() {
			if ( delay ) {
				$( '#infoFooter white' ).text( delay-- );
			} else {
				G.status.relayson = false;
				clearInterval( G.intRelaysTimer );
				$( '#relays' ).removeClass( 'on' );
				$( '#i-relays, #ti-relays' ).addClass( 'hide' );
			}
		}, 1000 );
	} else {
		var devices = '';
		$.each( response.order, function( i, val ) {
			if ( i === 0 ) {
				var color = state ? '' : 'class="gr"';
			} else {
				var color = state ? 'class="gr"' : '';
				devices += '<br>';
			}
			devices += '<a id="device'+ ( i + 1 ) +'" '+ color +'>'+ val +'</a>';
		} );
		if ( $( '#infoOverlay' ).hasClass( 'hide' ) ) {
			info( {
				  icon     : 'relays'
				, title    : 'GPIO Relays '+ ( state ? 'ON' : 'OFF' )
				, message  : stopwatch
				, footer   : devices
				, nobutton : 1
			} );
		} else {
			$( '#infoTitle' ).text( 'GPIO Relays '+ ( state ? 'ON' : 'OFF' ) );
			$( '.infobtn' ).addClass( 'hide' );
			$( '#infoFooter white' ).html( devices );
		}
	}
}
function psReload( data ) {
	location.href = '/';
}
function psRestore( data ) {
	if ( data.restore === 'done' ) {
		banner( 'Restore Settings', 'Done', 'sd' );
		setTimeout( function() {
			location.href = '/';
		}, 2000 );
	} else {
		loader( 'show' );
		banner( 'Restore Settings', 'Restart '+ data.restore +' ...', 'sd blink', -1 );
	}
}
function psSnapcast( data ) {
	if ( data !== -1 ) {
		var cmd = '/srv/http/bash/snapcast.sh ';
		cmd += 'add' in data ? ' add '+ data.add : ' remove '+ data.remove;
		bash( cmd );
	} else {
		bash( 'systemctl stop snapclient && systemctl start mpd', function() {
			getPlaybackStatus();
		} );
	}
}
function psSpotify( data ) {
	if ( G.status.player !== 'spotify' ) {
		G.status.player = 'spotify';
		displayBottom();
	}
	if ( !G.playback ) return
	
	if ( 'pause' in data ) {
		G.status.state = 'pause'
		G.status.elapsed = data.pause;
	} else {
		$.each( data, function( key, value ) {
			G.status[ key ] = value;
		} );
	}
	if ( !$( '#tab-playback' ).hasClass( 'fa-spotify' ) ) displayBottom();
	renderPlayback();
	setButtonControl();
	bash( [ 'pushstatus', 'lcdchar' ] );
}
function psVolume( data ) {
	if ( G.local ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var type = data.type;
		var val = data.val;
		var mute = type === 'mute';
		if ( mute ) {
			G.status.volume = 0;
			G.status.volumemute = val;
		} else {
			G.status.volume = val;
			G.status.volumemute = 0;
		}
		if ( $( '#volume-knob' ).is( ':visible' ) ) {
			$volumeRS.setValue( G.status.volume );
			mute ? volColorMute( val ) : volColorUnmute();
			$volumehandle.rsRotate( - $volumeRS._handle1.angle );
		} else {
			if ( $( '#infoRange .value' ).text() ) {
				$( '#infoRange .value' ).text( G.status.volume );
				$( '#infoRange input' ).val( G.status.volume );
			} else {
				$( '#volume-text' ).html( G.status.volumemute === 0 ? G.status.volume : '<i class="fa fa-mute"></i>' );
				$( '#volume-bar' ).animate( { width: G.status.volume +'%' }, 600 );
			}
		}
	}, G.debouncems );
}
function psWebradio( data ) {
	$( '#mode-webradio grl' ).text( data )
	if ( G.librarylist ) $( '#mode-webradio grl' ).click();
}
function webradioIcon( srcnoext ) {
	var radiourl = decodeURIComponent( srcnoext )
					.split( '/' ).pop()
					.replace( /\|/g, '/' );
	return $( '#lib-list li' ).filter( function() {
		return $( this ).find( '.lipath' ).text() === radiourl;
	} ).find( '.lib-icon' );
}

