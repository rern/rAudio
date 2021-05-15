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
	'notify', 'option', 'order', 'playlist', 'reload', 'spotify', 'volume', 'webradio' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {        // connected
		getPlaybackStatus();
	} else if ( status === 0 ) { // disconnected
		bannerHide();
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch( channel ) {
		case 'airplay':    psAirplay( data );    break;
		case 'bookmark':   psBookmark( data );   break;
		case 'coverart':   psCoverart( data );   break;
		case 'display':    psDisplay( data );    break;
		case 'relays':     psRelays( data );     break;
		case 'mpdplayer':  psMpdPlayer( data );  break;
		case 'mpdupdate' : psMpdUpdate( data );  break;
		case 'notify':     psNotify( data );     break;
		case 'option':     psOption( data );     break;
		case 'order':      psOrder( data );      break;
		case 'playlist':   psPlaylist( data );   break;
		case 'reload':     psReload( data );     break;
		case 'restore':    psRestore( data );    break;
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
		case 'bookmark':
			var $this = $( '.bookmark' ).filter( function() {
				return $( this ).find( '.lipath' ).text() === path;
			} );
			var $img = $this.find( 'img' );
			var src = '/mnt/MPD/'+ src;
			if ( $img.length ) {
				$img.attr( 'src', src  );
			} else {
				$this.find( '.fa-bookmark' ).remove();
				$this.find( '.divbklabel' ).remove();
				$this.find( '.lipath' ).after( '<img class="bkcoverart" src="'+ src +'">' );
				$( '.mode-bookmark img' ).css( 'opacity', '' );
			}
			break;
		case 'coverart': // change coverart
			var urlhead = url.slice( 0, 9 );
			var coverpath, covername, currentpath, currentname, cd, name;
			if ( urlhead === '/mnt/MPD/' ) { // /mnt/MPD/path/cover.jpg > path
				coverpath = url.substr( 0, url.lastIndexOf( '/' ) ).slice( 9 );
			} else if ( urlhead === '/data/shm' ) { // /data/shm/online-ArtistNameTitleName.1234567890.png > ArtistNameTitleName
				covername = url.split( '-' ).pop().split( '.' ).shift();
			} else { // /data/audiocd/DISCID.jpg > DISCID
				covername = url.split( '/' ).pop().split( '.' ).shift();
				cd = 1;
			}
			if ( G.playback ) {
				// path/filename.ext > path
				if ( 'file' in G.status ) currentpath = G.status.file.substr( 0, G.status.file.lastIndexOf( '/' ) );
				name = G.status.Artist
				name += G.status.webradio ? G.status.Title.replace( / \(.*$/, '' ) : G.status.Album;
				currentname = name.replace( /[ "`?/#&'"']/g, '' );
				if ( coverpath === currentpath || covername === currentname || cd ) {
					G.status.coverart = url;
					$( '#vu' ).addClass( 'hide' );
					$( '#coverart' )
						.attr( 'src', url )
						.removeClass( 'hide' );
					$( '#divcover .covedit' ).remove();
					$( '#coverart' ).css( 'opacity', '' );
				}
			} else if ( G.library ) {
				if ( $( '.licover' ).length ) {
					currentpath = $( '.licover .lipath' ).text();
					name = $( '.licover .liartist' ).text() + $( '.licover .lialbum' ).text();
					currentname = name.replace( /[ "`?/#&'"']/g, '' );
					if ( coverpath === currentpath || covername === currentname ) {
						$( '#liimg' ).attr( 'src', url );
						$( '.licover .covedit' ).remove();
						$( '.licoverimg ' ).css( 'opacity', '' );
					}
				} else {
					$( '#lib-list li' ).filter( function() {
						return $( this ).find( '.lipath' ).text() === coverpath
					} ).find( '.lib-icon' ).replaceWith( '<img class="iconthumb lib-icon" src="'+ url +'" data-target="#menu-folder">' );
				}
			} else {
				if ( !$( '#pl-index' ).hasClass( 'hide' ) ) return
				
				if ( !cd ) {
					var $li = G.savedplaylist ? $( '#pl-savedlist li' ) : $( '#pl-list li' );
					var lipath;
					var $litarget = $li.filter( function() {
						lipath = $( this ).find( '.lipath' ).text()
						return lipath.substr( 0, lipath.lastIndexOf( '/' ) ) === coverpath;
					} );
				} else {
					var $litarget = $( '#pl-list li' ).filter( function() {
						return $( this ).find( '.lipath' ).text().slice( 0, 4 ) === 'cdda';
					} );
				}
				$litarget.each( function() {
					$( this ).find( '.pl-icon' ).replaceWith( '<img class="iconthumb pl-icon" src="'+ url +'">' );
				} );
			}
			break;
		case 'webradio':
			G.status.coverartradio = src;
			if ( G.playback ) {
				$( '#vu' ).addClass( 'hide' );
				$( '#coverart' )
					.attr( 'src', src )
					.css( 'opacity', '' )
					.removeClass( 'hide' );
			} else if ( G.library ) {
				if ( G.mode === 'webradio' ) {
					var srcnoext = src.slice( 0, -15 );
					var srcthumb = srcnoext +'-thumb'+ src.slice( -15 );
					var $el = webradioIcon( srcnoext );
					$el.replaceWith( '<img class="lazy iconthumb lib-icon loaded" data-target="#menu-webradio" data-ll-status="loaded" src="'+ srcthumb +'">' );
				}
			} else {
				$( '#tab-playlist' ).click();
			}
			break;
		case 'webradioreset':
			G.status.coverartradio = '';
			if ( G.playback ) {
				coverartDefault();
			} else if ( G.library ) {
				if ( G.mode === 'webradio' ) {
					var $el = webradioIcon( src );
					$el.replaceWith( '<i class="fa fa-webradio lib-icon" data-target="#menu-webradio"></i>' );
				}
			} else {
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
		if ( 'radio' in data ) {
			$( '#artist' ).html( G.status.Artist );
			$( '#song' ).html( G.status.Title || blinkdot );
			$( '#album' ).html( G.status.Album );
			$( '#sampling' ).html( G.status.sampling +' &bull; '+ G.status.station || 'Radio' );
			setRadioAlbum();
			scrollLongText();
			renderPlaybackCoverart( G.status.coverart || G.status.coverartradio );
		} else {
			renderPlayback();
		}
		if ( !$( '#vu' ).hasClass( 'hide' ) ) G.status.state === 'play' ? vu() : vuStop();
	}
	bannerHide();
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
		$( '#li-count' ).html( data.song.toLocaleString() );
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
			$( '#tab-library, #button-library, .lib-icon.blink' ).removeClass( 'blink' );
			banner( 'Library Update', 'Done', 'library' );
		}, 2000 );
	}
}
function psNotify( data ) {
	banner( data.title, data.text, data.icon, data.delay );
	if ( data.title === 'Power' ) {
		if ( data.text === 'Off ...' ) $( '#loader' ).addClass( 'splash' );
		loader();
	} else if ( data.title === 'AirPlay' && data.text === 'Stop ...' ) {
		loader();
	} else if ( data.text === 'Change track ...' ) {
		clearIntervalAll();
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
	if ( 'autoplaycd' in data ) {
		G.autoplaycd = 1;
		setTimeout( function() { delete G.autoplaycd }, 5000 );
	}
	if ( G.local ) return
	
	if ( data == -1 ) {
		if ( G.playback ) {
			getPlaybackStatus();
		} else if ( G.playlist ) {
			renderPlaylist( -1 );
		}
	} else if ( 'html' in data ) {
		if ( G.playback ) {
			getPlaybackStatus();
		} else if ( G.playlist ) {
			if ( !G.plremove ) renderPlaylist( data );
		}
	} else if ( data.playlist === 'save' ) {
		if ( G.savedlist ) $( '#button-pl-open' ).click();
	} else {
		var name = $( '#pl-path .lipath' ).text();
		if ( G.savedplaylist && data.playlist === name ) renderSavedPlaylist( name );
	}
}
function psRelays( response ) { // on receive broadcast
	var stopwatch = '<img class="stopwatch" src="/assets/img/stopwatch.'+ hash +'.svg">';
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
				bash( '/srv/http/bash/relays.sh false' );
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
}
function psVolume( data ) {
	if ( data.type === 'enable' ) {
		$( '#volume-knob, #vol-group i' ).toggleClass( 'disable', data.val );
		return
	}
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var vol = data.val;
		var mute = data.type === 'mute';
		if ( mute ) {
			G.status.volumemute = vol;
			vol = 0;
		} else {
			G.status.volumemute = 0;
		}
		if ( $( '#volume-knob' ).is( ':visible' ) ) {
			$volumeRS.setValue( vol );
			mute ? volColorMute() : volColorUnmute();
		} else {
			G.status.volume = vol;
			if ( $( '#infoRange .value' ).text() ) { // mpd setting
				$( '#infoRange .value' ).text( vol );
				$( '#infoRange input' ).val( vol );
			} else {
				$( '#volume-bar' ).css( 'width', vol +'%' );
				$( '#volume-text' ).html( mute ? '<i class="fa fa-mute"></i>' : vol );
			}
		}
	}, G.debouncems );
}
function psWebradio( data ) {
	$( '#mode-webradio grl' ).text( data )
	if ( G.librarylist ) $( '#mode-webradio grl' ).click();
	if ( G.playlist && !G.local ) getPlaylist();
}
function webradioIcon( srcnoext ) {
	var radiourl = decodeURIComponent( srcnoext )
					.split( '/' ).pop()
					.replace( /\|/g, '/' );
	return $( '#lib-list li' ).filter( function() {
		return $( this ).find( '.lipath' ).text() === radiourl;
	} ).find( '.lib-icon' );
}

