var G = {
	  addplay       : 0
	, apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : 'd666cd06ec4fcf84c3b86279831a1c8e'
	, sharedsecret  : '390372d3a1f60d4030e2a612260060e0'
	, bioartist     : []
	, bookmarkedit  : 0
	, coverart      : '/assets/img/coverart.svg'
	, coversave     : 0
	, covervu       : '/assets/img/vu.svg'
	, debounce      : ''
	, debouncems    : 300
	, guide         : 0
	, library       : 0
	, librarylist   : 0
	, list          : {}
	, local         : 0
	, localhost     : [ 'localhost', '127.0.0.1' ].includes( location.hostname )
	, lyrics        : ''
	, lyricsArtist  : ''
	, lyricsTitle   : ''
	, mode          : ''
	, modescrolltop : 0
	, page          : 'playback'
	, pladd         : {}
	, playback      : 1
	, playlist      : 0
	, query         : []
	, rotate        : 0
	, savedlist     : 0
	, savedplaylist : 0
	, scrollspeed   : 80 // pixel/s
	, scrolltop     : {}
	, similarpl     : -1
	, status        : {}
	, wH            : window.innerHeight
	, wW            : window.innerWidth
}
var cmdphp = 'cmd.php';
var data = {}
var picaOption = { // pica.js
	  unsharpAmount    : 100  // 0...500 Default = 0 (try 50-100)
	, unsharpThreshold : 5    // 0...100 Default = 0 (try 10)
	, unsharpRadius    : 0.6
//	, quality          : 3    // 0...3 Default = 3 (Lanczos win=3)
//	, alpha            : true // Default = false (black crop background)
};
var blinkdot = '<a class="dot dot1">·</a>&ensp;<a class="dot dot2">·</a>&ensp;<a class="dot dot3">·</a>';
var icoveredit = '<i class="coveredit cover iconcover"></i>';
var icoversave = '<i class="coveredit fa fa-save cover-save"></i>';
var orange = '#de810e';
var red = '#bb2828';
$( '.submenu.fa-color' ).html( '<canvas></canvas>' );
var canvas = $( '.submenu.fa-color canvas' )[ 0 ];
var ctx = canvas.getContext( '2d' );
var cw = canvas.width / 2;
var ch = canvas.height / 2;
for( i = 0; i < 360; i += 0.25 ) {
	var rad = i * Math.PI / 180;
	ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
	ctx.beginPath();
	ctx.moveTo( cw, ch );
	ctx.lineTo( cw + cw * Math.cos( rad ), ch + ch * Math.sin( rad ) );
	ctx.stroke();
}
var pagenext = {
	  playback : [ 'library',  'playlist' ]
	, playlist : [ 'playback', 'library' ]
	, library  : [ 'playlist', 'playback' ]
}
var icon_player = {
	  airplay    : 'AirPlay'
	, bluetooth  : 'Bluetooth'
	, snapcast   : 'Snapcast'
	, spotify    : 'Spotify'
	, upnp       : 'UPnP'
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

getPlaybackStatus( 'withdisplay' );

if ( navigator.maxTouchPoints ) { // swipeleft / right ////////////////////////////////
	var xstart;
	window.addEventListener( 'touchstart', function( e ) {
		var $target = $( e.target );
		if ( G.display.noswipe
			|| [ 'time-band', 'time-knob', 'volume-band', 'volume-knob' ].includes( e.target.id )
			|| $target.parents( '#time-knob' ).length
			|| $target.parents( '#volume-knob' ).length
			|| !$( '#bio' ).hasClass( 'hide' )
			|| !$( '#infoOverlay' ).hasClass( 'hide' )
		) return
		
		xstart = e.changedTouches[ 0 ].pageX;
	} );
	window.addEventListener( 'touchend', function( e ) {
		if ( !xstart ) return
		
		var diff = xstart - e.changedTouches[ 0 ].pageX;
		if ( Math.abs( diff ) > 100 ) $( '#'+ pagenext[ G.page ][ diff > 0 ? 1 : 0 ] ).click();
		xstart = 0;
	} );
} else {
	$( 'head' ).append( '<link rel="stylesheet" href="/assets/css/desktop.'+ ( Math.round( Date.now() / 1000 ) ) +'.css">' );
	$.getScript( 'assets/js/shortcut.js' );
}
	
$( '.page' ).click( function( e ) {
	if ( ![ 'coverTR', 'timeTR' ].includes( e.target.id ) ) $( '#settings' ).addClass( 'hide' );
} ).contextmenu( function( e ) { // touch device - on press - disable default context menu
	e.preventDefault();
	e.stopPropagation();
    e.stopImmediatePropagation();
	return false
} );
$( '#loader' ).click( function() {
	loaderHide();
} );
$( '#coverart' ).on( 'load', function() {
	if ( G.status.file
		&& G.status.coverart.slice( 10, 16 ) === 'online'
		&& [ 'NAS', 'SD/', 'USB' ].includes( G.status.file.slice( 0, 3 ) )
	) {
		$( '#divcover' ).append( icoversave );
	} else {
		$( '#divcover .coveredit' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
	}
	if ( ( G.wW - $( '#divcover' ).width() ) < 80 ) {
		$( '#volume-band-dn' ).css( 'left', 0 );
		$( '#volume-band-up' ).css( 'right', 0 );
	} else {
		$( '#volume-band-dn' ).css( 'left', '' );
		$( '#volume-band-up' ).css( 'right', '' );
	}
	loaderHide();
} ).on( 'error', coverartDefault );

// COMMON /////////////////////////////////////////////////////////////////////////////////////
$( '#logo, #button-library, #button-playlist' ).press( function() { // from info.js
	location.reload();
} );
$( '#logo' ).click( function() {
	if ( !G.localhost ) window.open( 'https://github.com/rern/rAudio-1/discussions' );
} );
$( '#button-settings' ).click( function() {
	if ( $( '#settings' ).hasClass( 'hide' ) ) {
		menuHide();
		$( '#settings' )
			.css( 'top', ( $( '#bar-top' ).is( ':visible' ) ? 40 : 0 ) )
			.css( 'pointer-events', 'none' ) // suppress coverTR tap on show
			.removeClass( 'hide' );
		setTimeout( function() {
			$( '#settings' ).css( 'pointer-events', '' );
		}, 300 );
	} else {
		$( '#settings' ).addClass( 'hide' );
	}
} );
$( '.settings' ).click( function() {
	location.href = 'settings.php?p='+ this.id;
} );
$( '#settings' ).on( 'click', '.submenu', function() {
	switch ( this.id ) {
		case 'dsp':
			if ( $( this ).hasClass( 'fa-camilladsp' ) ) {
				bash( [ 'camillagui' ], function() {
					urlReachable( 'http://'+ location.host +':5000' );
				} );
				loader();
			} else {
				equalizer();
			}
			break;
		case 'lock':
			$.post( cmdphp, { cmd: 'logout' }, function() {
				location.reload();
			} );
			break;
		case 'snapclient':
			var active = $( this ).hasClass( 'on' );
			if ( active ) {
				if ( G.display.snapclientactive ) {
					bash( '/srv/http/bash/snapcast.sh stop' );
				} else {
					$( '#stop' ).click();
				}
			} else {
				bash( '/srv/http/bash/snapcast.sh start', function( data ) {
					bannerHide();
					if ( data == -1 ) {
						info( {
							  icon    : 'snapcast'
							, title   : 'Snapcast'
							, message : 'Snapcast server not available'
						} );
					}
				} );
			}
			banner( 'Snapcast', ( active ? 'Disconnect ...' : 'Connect ...' ), 'snapcast blink', -1 );
			break;
		case 'relays':
			$( '#stop' ).click();
			bash( '/srv/http/bash/settings/relays.sh '+ !G.status.relayson );
			break;
		case 'guide':
			location.href = 'settings/guide.php';
			break;
		case 'screenoff':
			bash( [ 'screenoff', 'dpms force off' ] );
			G.screenoff = 1;
			break;
		case 'update':
			infoUpdate( '' );
			break;
		case 'displaycolor':
			G.color = 1;
			if ( !G.library ) $( '#library' ).click();
			if ( G.mode !== 'webradio' ) {
				$( '#mode-webradio' ).click();
			} else {
				colorSet();
			}
			break;
		case 'multiraudio':
			bash( 'cat /srv/http/data/system/multiraudio.conf', function( data ) {
				var data = data.trim().split( '\n' );
				var dataL = data.length;
				var radio = {}
				for ( i = 0; i < dataL; i++ ) {
					radio[ data[ i ] ] = data[ i + 1 ];
					i++
				}
				info( {
					  icon    : 'raudiobox'
					, title   : 'Switch rAudio'
					, radio   : radio
					, values  : location.host
					, okno    : 1
					, beforeshow : function() {
						$( '#infoContent input' ).change( function() {
							var ip = $( '#infoContent input:checked' ).val();
							if ( typeof Android === 'object' ) Android.changeIP( ip );
							loader();
							location.href = 'http://'+ ip;
						} );
					}
				} );
			} );
			break;
	}
} );
$( '#power' ).click( function() {
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, buttonlabel : '<i class="fa fa-reboot"></i>Reboot'
		, buttoncolor : orange
		, button      : function() {
			bash( [ 'power', 'reboot' ] );
		}
		, oklabel     : '<i class="fa fa-power"></i>Off'
		, okcolor     : red
		, ok          : function() {
			bash( [ 'power', 'off' ] );
		}
	} );
} );
$( '#displaylibrary' ).click( function() {
	infoLibrary();
} );
$( '#displayplayback' ).click( function() {
	var chkplayback = {
		  bars             : 'Top-Bottom bars'
			, barsalways   : 'Bars always on'
		, time             : 'Time'
			, radioelapsed : 'Web Radio time'
		, cover            : 'Cover art'
			, covervu      : '<img class="imgicon" src="/assets/img/vu.svg"> As default'
		, volume           : 'Volume'
			, vumeter      : 'VU meter'
		, buttons          : 'Buttons'
			, noswipe      : 'Disable swipe'
	}
	if ( 'coverTL' in G ) $( '#coverTL' ).click();
	var keys = Object.keys( chkplayback );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	info( {
		  icon         : 'playback'
		, title        : 'Playback'
		, message      : 'Show:<span style="margin-left: 117px">Options:</span>'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplayback )
		, checkcolumn  : 1
		, values       : values
		, checkchanged : 1
		, beforeshow   : function() {
			var $chk = $( '#infoContent input' );
			keys.forEach( function( k, i ) {
				window[ '$'+ k ] = $chk.eq( i );
				window[ k ] = i;
			} );
			function toggleBars( t, c ) {
				if ( !t && !c ) {
					displayCheckboxSet( bars, 0, 1 );
					displayCheckboxSet( barsalways, 0, 1 );
				} else {
					displayCheckboxSet( bars, 1 );
					displayCheckboxSet( barsalways, 1, 0 );
				}
			}
			if ( !G.display.bars ) displayCheckboxSet( barsalways );
			if ( !G.display.cover ) displayCheckboxSet( vumeter );
			if ( G.display.volumenone ) displayCheckboxSet( volume, 0, 0 );
			if ( !G.display.time && !G.display.volume ) {
				displayCheckboxSet( cover );
				displayCheckboxSet( buttons );
			}
			if ( !G.display.time && !G.display.cover ) displayCheckboxSet( bars, 0, 1 );
			$time.add( $volume ).change( function() {
				var t = $time.prop( 'checked' );
				var c = $cover.prop( 'checked' );
				var v = $volume.prop( 'checked' );
				if ( t || v ) {
					displayCheckboxSet( cover, 1 );
					displayCheckboxSet( buttons, 1 );
				} else {
					displayCheckboxSet( cover, 0, 1 );
					displayCheckboxSet( buttons, 0, 0 );
				}
				if ( !t && ( !v || G.display.volumenone ) ) displayCheckboxSet( cover, 1, 1 );
				toggleBars( t, c );
			} );
			$bars.change( function() {
				if ( $( this ).prop( 'checked' ) ) {
					displayCheckboxSet( barsalways, 1 );
				} else {
					displayCheckboxSet( barsalways, 0, 0 );
				}
			} );
			$cover.change( function() {
				var t = $time.prop( 'checked' );
				var c = $cover.prop( 'checked' );
				var v = $volume.prop( 'checked' );
				if ( c ) {
					displayCheckboxSet( vumeter, 1, 0 );
					$covervu.add( $vumeter ).prop( 'disabled', 0 );
				} else {
					displayCheckboxSet( vumeter, 0, 0 );
					if ( !t && ( !v || G.display.volumenone ) ) displayCheckboxSet( time, 1, 1 );
					displayCheckboxSet( covervu, 0, 0 );
					displayCheckboxSet( vumeter, 0, 0 );
					$covervu.add( $vumeter ).prop( 'disabled', 1 );
				}
				toggleBars( t, c );
			} );
			$covervu.change( function() {
				if ( $( this ).prop( 'checked' ) ) displayCheckboxSet( vumeter, 1, 0 );
			} );
			$vumeter.change( function() {
				if ( $( this ).prop( 'checked' ) ) displayCheckboxSet( covervu, 1, 0 );
			} );
		}
		, ok           : function () {
			displaySave( keys );
		}
	} );
} );
$( '#displayplaylist' ).click( function() {
	var chkplaylist = {
		  plclear        : 'Confirm on <i class="fa fa-replace"></i>Replace <gr>|</gr> <i class="fa fa-play-replace"></i>'
		, plsimilar      : 'Confirm on <i class="fa fa-lastfm"></i>Add similar'
		, audiocdplclear : 'Clear on <i class="fa fa-audiocd"></i>Audio CD load'
	}
	if ( 'coverTL' in G ) $( '#coverTL' ).click();
	var keys = Object.keys( chkplaylist );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	info( {
		  icon         : 'playlist'
		, title        : 'Playlist'
		, message      : 'Options:'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplaylist )
		, values       : values
		, checkchanged : 1
		, ok           : function () {
			displaySave( keys );
		}
	} );
} );
$( '#colorok' ).click( function() {
	var hsv = G.colorpicker.getCurColorHsv(); // hsv = { h: N, s: N, v: N } N = 0-1
	var s = hsv.s;
	var v = hsv.v;
	var L = ( 2 - s ) * v / 2;
	if ( L && L < 1 ) {
		S = L < 0.5 ? s * v / ( L * 2 ) : s * v / ( 2 - L * 2 );
		var h = Math.round( 360 * hsv.h );
		var s = Math.round( S * 100 );
		var l = Math.round( L * 100 );
	} else {
		var h = 0;
		var s = 0;
		var l = L * 100;
	}
	bash( [ 'color', h +' '+ s +' '+ l ] );
	loader();
} );
$( '#colorreset' ).click( function() {
	bash( [ 'color', 'reset' ] );
	loader();
} );
$( '#colorcancel' ).click( function() {
	$( '#colorpicker, .menu' ).addClass( 'hide' );
	$( '#bar-top, #playback-controls i, #lib-index, #lib-index a, #bar-bottom i \
	  , .content-top, #button-library, #mode-title, #button-lib-back \
	  , #lib-list li, #lib-list li.active, #lib-list i, #lib-list .li2 \
	  , .menu a, .submenu, #colorcancel, #colorok' ).removeAttr( 'style' );
	$( 'body' ).removeClass( 'disablescroll' );
	if ( G.status.player !== 'mpd' ) switchPage( 'playback' );
	G.colorpicker.destroy();
} );
$( '#colorpicker' ).click( function( e ) {
	if ( e.target.id === 'colorpicker' ) $( '#colorcancel' ).click();
} );
$( '#addons' ).click( function () {
	banner( 'Addons', 'Download database ...', 'jigsaw blink', -1 );
	bash( [ 'addonslist' ], function( std ) {
		addonsdl( std )
	} );
	loader();
} );
$( '#library, #button-library' ).click( function() {
	menuHide();
	$( '#lib-path span' ).removeClass( 'hide' );
	if ( !$( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
	if ( G.library ) {
		if ( G.librarylist ) {
			if ( G.librarylist ) G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
			G.mode = '';
			G.librarylist = 0;
			G.query = [];
		}
		renderLibrary();
	} else {
		switchPage( 'library' );
		if ( G.status.updating_db ) banner( 'Library Database', 'Update ...', 'refresh-library blink' );
	}
} );
$( '#playback' ).click( function() {
	if ( G.playback && ( G.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).click();
	} else {
		getPlaybackStatus();
		switchPage( 'playback' );
	}
} );
$( '#playlist' ).click( function() {
	if ( !G.local ) G.pladd = {}
	if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) getPlaylist();
		menuHide();
	} else {
		switchPage( 'playlist' );
		if ( !G.savedlist && !G.savedplaylist ) getPlaylist();
	}
} );
$( '#page-playback' ).click( function( e ) {
	if ( G.press
		|| [ 'coverT', 'timeT', 'volume-bar', 'volume-band', 'volume-band-dn', 'volume-band-up' ].includes( e.target.id ) ) return
	
	if ( G.guide ) hideGuide();
	if ( $( '#divcover .coveredit' ).length ) {
		if ( !$( e.target ).hasClass( 'coveredit' ) ) {
			$( '#divcover .coveredit.cover' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
	}
} );
$( '#bar-top, #bar-bottom, #page-library' ).click( function() {
	if ( G.guide ) hideGuide();
	if ( !$( '#colorpicker' ).hasClass( 'hide' ) ) $( '#colorcancel' ).click();
} );
$( '#bar-top' ).click( function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide' );
} );
$( '#settings' ).click( function() {
	$( this ).addClass( 'hide' );
} );
$( '#page-library, #page-playlist' ).on( 'click', 'p', function() {
	menuHide();
	if ( G.library ) {
		$( '.licover .coveredit.cover' ).remove();
		$( '.licover img' ).css( 'opacity', '' );
		$( '#lib-list li' ).removeClass( 'active' );
		if ( !$( '#lib-search-input' ).val() ) $( '#lib-search-close' ).click();
	} else if ( G.playlist && !G.savedlist && !G.savedplaylist ) {
		$( '#pl-savedlist li' ).removeClass( 'active' );
		$( '#pl-list li' ).removeClass( 'updn' );
		$( '#pl-list .name' ).css( 'max-width', '' );
		if ( !$( '#pl-search-input' ).val() ) $( '#pl-search-close' ).click();
	}
} );
// PLAYBACK /////////////////////////////////////////////////////////////////////////////////////
$( '#info' ).click( function() {
	if ( G.localhost ) setInfoScroll();
} );
$( '.emptyadd' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'fa-plus-circle' ) ) {
		$( '#library' ).click();
	} else if ( $( e.target ).hasClass( 'fa-gear' ) ) {
		$( '#button-settings' ).click();
	}
} );
$( '#artist, #guide-bio' ).click( function() {
	if ( $( '#bio legend' ).text() != G.status.Artist ) {
		getBio( $( '#artist' ).text() );
	} else {
		$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
		$( '#bio' ).removeClass( 'hide' );
	}
} );
$( '#title, #guide-lyrics' ).click( function() {
	var artist = $( '#artist' ).text();
	var title = $( '#title' ).text();
	var album = $( '#album' ).text();
	if ( album.includes( '://' ) ) album = '';
	if ( G.lyrics
		&& !G.status.webradio
		&& artist === $( '#lyricsartist' ).text()
		&& title === $( '#lyricstitle' ).text()
	) {
		lyricsShow( 'current' );
		return
	}
	
	artist = artist.replace( /(["`])/g, '\\$1' );
	title = title.replace( /(["`])/g, '\\$1' );
	file = G.status.player === 'mpd' ? '/mnt/MPD/'+ G.status.file : '';
	var src = $( '#coverart' ).attr( 'src' );
	G.lyricsCover = src.slice( 0, 7 ) === '/asses' ? '' : src;
	var noparen = title.slice( -1 ) !== ')';
	var titlenoparen = title.replace( / $|\(.*$/, '' );
	var paren = title.replace( /^.*\(/, '(' );
	var content = `\
<table>
<tr><td><i class="fa fa-artist wh"></i></td><td><input class="required" type="text"></td></tr>
<tr><td><i class="fa fa-music wh"></i></td><td><input class="required" type="text"></td></tr>
<tr class="album"><td><i class="fa fa-album wh"></i></td><td><input type="text"></td></tr>
<tr id="paren"><td></td><td><label><input type="checkbox"><gr>Title includes:</gr>&emsp;${ paren }</label></td></tr>
<tr style="height: 10px;"></tr>
<tr><td colspan="2" class="btnbottom">
	<span class="lyrics"><i class="fa fa-lyrics"></i> Lyrics</span>
	<span class="bio">&emsp;<i class="fa fa-bio"></i> Bio</span>
	<span class="pladd">&emsp;<i class="fa fa-file-playlist"></i> Add</span>
	<span class="scrobble">&emsp;<i class="fa fa-lastfm"></i> Scrobble</span>
	</td></tr>
</table>`;
	info( {
		  icon        : 'Music'
		, title       : 'Track'
		, content     : content
		, boxwidth    : 320
		, values      : noparen ? [ artist, title, album ] : [ artist, titlenoparen, album ]
		, beforeshow  : function() {
			if ( noparen ) {
				$( '#paren' ).addClass( 'hide' );
			} else {
				$( '#infoContent input' ).change( function() {
					$( '#infoContent input:text' ).eq( 1 ).val( $( this ).prop( 'checked' ) ? title : titlenoparen );
				} );
			}
			$( '#infoContent input.required' ).on( 'keyup paste cut', function() {
				var $this = $( this );
				$this.css( 'border-color', $this.val() ? '' : 'red' );
				$( '#infoContent .scrobble' ).toggleClass( 'disabled', $this.val() === '' );
			} );
			$( '#infoContent .album' ).toggleClass( 'hide', album === '' );
			$( '#infoContent .pladd' ).toggleClass( 'hide', G.status.player !== 'mpd' );
			$( '#infoContent .scrobble' ).toggleClass( 'hide', !G.status.scrobble || !G.status.webradio );
			$( '#infoContent' ).on( 'click', '.btnbottom span', function() {
				var values = infoVal();
				var artist = values[ 0 ]
				var title = values[ 1 ]
				var $this = $( this );
				if ( $this.hasClass( 'lyrics' ) ) {
					G.lyricsArtist = artist;
					G.lyricsTitle = title;
					bash( [ 'lyrics', artist, title, file ], function( data ) {
						lyricsShow( data );
					} );
					banner( 'Lyrics', 'Fetch ...', 'search blink', 20000 );
				} else if ( $this.hasClass( 'bio' ) ) {
					if ( $( '#bio legend' ).text() != G.status.Artist ) {
						getBio( artist );
					} else {
						$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
						$( '#bio' ).removeClass( 'hide' );
					}
				} else if ( $this.hasClass( 'pladd' ) ) {
					saveToPlaylist( G.status.Title, G.status.Album, G.status.file );
				} else if ( $this.hasClass( 'scrobble' ) ) {
					bash( [ 'scrobble', ...values ] );
					banner( 'Scrobble', 'Send ...', 'lastfm blink' );
				}
				$( '#infoX' ).click();
			} );
		}
		, okno        : 1
	} );
} );
$( '#album, #guide-album' ).click( function() {
	if ( !G.localhost ) window.open( 'https://www.last.fm/music/'+ $( '#artist' ).text() +'/'+ $( '#album' ).text(), '_blank' );
} );
$( '#infoicon' ).on( 'click', '.fa-audiocd', function() {
	info( {
		  icon    : 'audiocd'
		, title   : 'Audio CD'
		, oklabel : '<i class="fa fa-minus-circle"></i>Eject'
		, okcolor : red
		, ok      : function() {
			bash( '/srv/http/bash/audiocd.sh ejectwithicon' );
		}
	} );
} );
$( '#elapsed' ).click( function() {
	G.status.state === 'play' ? $( '#pause' ).click() : $( '#play' ).click();
} );
$( '#time' ).roundSlider( {
	  sliderType  : 'min-range'
	, svgMode     : true
	, borderWidth : 0
	, radius      : 115
	, width       : 22
	, startAngle  : 90
	, endAngle    : 450
	, showTooltip : false
	, animation   : false
	, create      : function ( e ) {
		$timeRS = this;
		$timeprogress = $( '#time .rs-transition, #time-bar' );
	}
	, start       : function () { // drag start
		G.drag = 1;
		clearIntervalAll();
		$( '.map' ).removeClass( 'mapshow' );
		if ( G.status.state !== 'play' ) $( '#title' ).addClass( 'gr' );
	}
	, drag        : function ( e ) { // drag with no transition by default
		$( '#elapsed' ).text( second2HMS( e.value ) );
	}
	, change      : function( e ) { // not fire on 'setValue'
		clearIntervalAll();
		mpcSeek( e.value );
	}
	, stop              : function() {
		G.drag = 0;
	}
} );
$( '#time-band' ).on( 'touchstart mousedown', function() {
	if ( G.status.player !== 'mpd' || G.status.stream ) return
	
	G.start = 1;
	hideGuide();
	clearIntervalAll();
	if ( G.status.state !== 'play' ) $( '#title' ).addClass( 'gr' );
} ).on( 'touchmove mousemove', function( e ) {
	if ( !G.start ) return
	
	G.drag = 1;
	mpcSeekBar( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( !G.start ) return
	
	G.start = G.drag = 0;
	mpcSeekBar( e.pageX || e.changedTouches[ 0 ].pageX );
} );
$( '#volume' ).roundSlider( {
	// init : valueChange > create > beforeValueChange > valueChange
	// tap  : beforeValueChange > change > valueChange
	// drag : start > [ beforeValueChange > drag > valueChange ] > change > stop
	// setValue : beforeValueChange > valueChange
	// angle : this._handle1.angle (instaed of inconsistent e.handle.angle/e.handles[ 0 ].angle)
	  svgMode           : true
	, borderWidth       : 0
	, radius            : 115
	, width             : 50
	, handleSize        : '-25'
	, startAngle        : -50
	, endAngle          : 230
	, editableTooltip   : false
	, animation         : false
	, create            : function () {
		G.create = 1;
		$volumeRS = this;
		$volumetooltip = $( '#volume .rs-tooltip' );
		$volumehandle = $( '#volume .rs-handle' );
		$volumehandlerotate = $( '#volume .rs-transition, #volume .rs-handle' );
	}
	, start             : function( e ) {
		G.drag = 1;
		if ( e.value === 0 ) volumeColorUnmute(); // restore handle color immediately on start drag
		$( '.map' ).removeClass( 'mapshow' );
	}
	, beforeValueChange : function( e ) {
		if ( G.local || G.drag ) return
		
		var diff = e.value - G.status.volume || G.status.volume - G.status.volumemute; // change || mute/unmute
		var speed = Math.round( Math.abs( diff ) / 5 * 0.2 * 10 ) / 10; // @5 0.2s > round 1 digit: * 10 / 10
		$volumehandlerotate.css( 'transition-duration', speed +'s' );
		setTimeout( function() {
			$volumehandlerotate.css( 'transition-duration','' );
		}, speed * 1000 + 500 );
	}
	, drag              : function( e ) {
		G.status.volume = e.value;
		$volumehandle.rsRotate( - this._handle1.angle );
		bash( [ 'volume', 'drag', e.value, G.status.card, G.status.control ] );
	}
	, change            : function( e ) {
		if ( G.drag ) return
		
		$( '#volume-knob, #vol-group i' ).addClass( 'disabled' );
		bash( [ 'volume', G.status.volume, e.value, G.status.card, G.status.control ] );
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, valueChange       : function( e ) {
		if ( G.drag || !G.create ) return // !G.create - suppress fire before 'create'
		
		G.status.volume = e.value;
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, stop              : function() {
		G.drag = 0;
		bash( [ 'volumepushstream' ] );
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	hideGuide();
	clearTimeout( G.volumebar );
	if ( G.status.volumenone || $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	G.start = 1;
} ).on( 'touchmove mousemove', function( e ) {
	if ( !G.start ) return
	
	G.drag = 1;
	volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) {
		volumeBarShow();
		return
	}
	
	if ( !G.start ) return
	
	G.start = G.drag = 0;
	volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
} );
$( '#volmute, #volM' ).click( function() {
	$( '#volume-knob, #vol-group i' ).addClass( 'disabled' );
	bash( [ 'volume', G.status.volume, 0, G.status.card, G.status.control ] );
} );
$( '#volup, #voldn, #volT, #volB, #volL, #volR' ).click( function( e ) {
	var voldn = [ 'voldn', 'volB', 'volL' ].includes( e.currentTarget.id );
	if ( ( G.status.volume === 0 && voldn ) || ( G.status.volume === 100 && !voldn ) ) return
	
	bash( [ 'volumeupdown', voldn ? '-' : '+', G.status.card, G.status.control ] );
} ).on( 'touchend mouseup mouseleave', function() {
	if ( G.volhold ) {
		G.volhold = 0;
		clearInterval( G.intVolume );
		bash( [ 'volumepushstream' ] );
	}
} ).press( function( e ) {
	G.volhold = 1;
	var voldn = e.currentTarget.id === 'voldn';
	var voldn = [ 'voldn', 'volB', 'volL' ].includes( e.currentTarget.id );
	var vol = G.status.volume;
	if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
	
	G.intVolume = setInterval( function() {
		if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
		
		voldn ? vol-- : vol++;
		$volumeRS.setValue( vol );
		bash( [ 'volume', 'drag', vol, G.status.card, G.status.control ] );
	}, 100 );
} );
$( '#volume-band-dn, #volume-band-up' ).click( function() {
	hideGuide();
	if ( G.status.volumenone ) return
	
	var updn = this.id.slice( -2 );
	var vol = G.status.volume;
	if ( updn === 'dn' ) {
		if ( vol > 0 ) vol--;
	} else {
		if ( vol < 100 ) vol++;
	}
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	$( '#vol'+ updn ).click();
	$( '#volume-text' ).text( vol );
	$( '#volume-bar' ).css( 'width', vol +'%' );
} ).on( 'touchend mouseup mouseleave', function() {
	bash( [ 'volumepushstream' ] );
	clearTimeout( G.intVolume );
	clearTimeout( G.volumebar );
	setTimeout( volumeBarHide, 3000 );
} ).press( function( e ) {
	if ( G.status.volumenone ) return
	
	clearTimeout( G.volumebar );
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	var voldn = e.currentTarget.id === 'volume-band-dn';
	var vol = G.status.volume;
	if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
	
	G.intVolume = setInterval( function() {
		if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
		
		voldn ? vol-- : vol++;
		G.status.volume = vol;
		$( '#volume-text' ).text( vol );
		$( '#volume-bar' ).css( 'width', vol +'%' );
		bash( [ 'volume', 'drag', vol, G.status.card, G.status.control ] );
	}, 100 );
} );
$( '#volume-text' ).click( function() { // mute /unmute
	clearTimeout( G.volumebar );
	if ( G.status.volumemute ) {
		var offL = $( '#volume-band' ).offset().left;
		var barW = G.status.volumemute ? $( '#volume-band' ).width() * G.status.volumemute / 100 : 0;
		var pageX = offL + barW;
	} else {
		var pageX = 0
		G.status.volumemute = G.status.volume;
	}
	volumeBarSet( pageX );
} );
$( '#divcover' ).press( function( e ) {
	if (
		( G.status.stream && G.status.state === 'play' )
		|| !G.status.pllength
		|| G.guide
		|| $( e.target ).hasClass( 'band' )
		|| e.target.id === 'coverT'
	) return
	
	$( '#coverart' )
		.css( 'opacity', 0.33 )
		.after( icoveredit );
} ).on( 'click', '.fa-save', function() {
	coverartSave();
} ).on( 'click', '.iconcover', function() {
	G.status.webradio ? webRadioCoverart () : coverartChange();
} );
$( '#coverT' ).press( function() {
	if ( typeof Android === 'object' ) {
		changeIP();
	} else {
		location.reload();
	}
} );
var btnctrl = {
	  timeTL  : 'cover'
	, timeT   : 'guide'
	, timeTR  : 'settings'
	, timeL   : 'previous'
	, timeM   : 'play'
	, timeR   : 'next'
	, timeBL  : 'random'
	, timeB   : 'stop'
	, timeBR  : 'repeat'
	, coverTL : 'cover'
	, coverT  : 'guide'
	, coverTR : 'settings'
	, coverL  : 'previous'
	, coverM  : 'play'
	, coverR  : 'next'
	, coverBL : 'random'
	, coverB  : 'stop'
	, coverBR : 'repeat'
}
$( '.map' ).click( function() {
	if ( G.press ) return
	
	if ( $( '#info' ).hasClass( 'hide' ) ) {
		$( '#info' ).removeClass( 'hide' );
		clearTimeout( G.volumebar );
		volumeBarHide();
		return
		
	} else if ( $( '.coveredit.cover' ).length ) {
		$( '#divcover .coveredit.cover' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
		return
		
	} else if ( 'screenoff' in G ) {
		delete G.screenoff;
		return
	}
	
	var cmd = btnctrl[ this.id ];
	if ( cmd === 'guide' ) {
		clearTimeout( G.volumebar );
		if ( G.guide ) {
			hideGuide();
			return
		}
		
		G.guide = 1;
		var time = $( '#time-knob' ).is( ':visible' );
		var volume = $( '#volume-knob' ).is( ':visible' );
		$( '#coverTR' ).removeClass( 'empty' );
		$( '.covermap, .guide' ).addClass( 'mapshow' );
		$( '.guide' ).toggleClass( 'hide', !G.status.pllength && G.status.player === 'mpd' );
		$( '#guide-bio, #guide-lyrics' ).toggleClass( 'hide', G.status.stream && G.status.state === 'stop' );
		$( '#guide-album' ).toggleClass( 'hide', $( '#album' ).hasClass( 'disabled' ) );
		$( '#guide-bio, #guide-lyrics, #guide-album' ).toggleClass( 'hide', !G.status.pllength );
		$( '#coverTL, #coverL, #coverM, #coverR, #coverB' ).toggleClass( 'disabled', !G.status.pllength );
		$( '.timemap' ).toggleClass( 'mapshow', !G.display.cover );
		$( '.volmap' ).toggleClass( 'mapshow', volume );
		$( '#bar-bottom' ).toggleClass( 'translucent', $( '#bar-top' ).is( ':hidden' ) );
		if ( time || volume ) {
			$( '#coverTL' )
				.removeClass( 'fa-scale-dn' )
				.addClass( 'fa-scale-up' );
		} else {
			$( '#coverTL' )
				.removeClass( 'fa-scale-up' )
				.addClass( 'fa-scale-dn' );
		}
		if ( G.status.player === 'mpd' ) {
			if ( !time && !G.status.stream ) {
				$( '#time-band' )
					.removeClass( 'transparent' )
					.text( G.status.Time ? second2HMS( G.status.Time ) : '' );
			}
			if ( !volume && !G.display.volumenone ) {
				$( '.volumeband' ).removeClass( 'transparent hide' );
				$( '#volume-bar' ).removeClass( 'hide' );
			}
		}
		$( '.coveredit' ).css( 'z-index', 15 );
		$( '#volume-text, #settings' ).addClass( 'hide' );
		return
	}
	
	hideGuide();
	switch ( cmd ) {
		case 'cover':
			$( '#bar-bottom' ).removeClass( 'translucent' );
			if ( G.status.player === 'mpd' && !G.status.pllength
				|| $( '#page-playback' ).css( 'transform' ) !== 'none'
			) return
			
			if ( !( 'coverTL' in G )
				&& ( G.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 40
				&& !G.display.volumenone
				&& !$( '#volume-knob' ).is( ':visible' )
			) {
				if ( $( '#info' ).hasClass( 'hide' ) ) {
					$( '#info' ).removeClass( 'hide' );
				} else {
					$( '#info' ).addClass( 'hide' );
					$( '#volume-band' ).click();
				}
				return
			}
			
			if ( G.wW < 545 && G.wW < G.wH ) return
			
			var list = [ 'bars', 'time', 'cover', 'volume', 'buttons' ];
			if ( 'coverTL' in G ) {
				list.forEach( function( el ) {
					G.display[ el ] = G.coverTL[ el ];
				} );
				delete G.coverTL;
			} else {
				G.coverTL = {};
				list.forEach( function( el ) {
					G.coverTL[ el ] = G.display[ el ];
				} );
				if ( this.id === 'coverTL' ) {
					if ( G.display.time || G.display.volume ) {
						G.display.bars = G.display.time = G.display.volume = G.display.buttons = false;
					} else {
						G.display.bars = G.display.time = G.display.volume = G.display.buttons = true;
					}
				} else {
					G.display.time = G.display.cover = G.display.volume = G.display.buttons = true;
				}
			}
			$( '.band' ).addClass( 'transparent' );
			$( '#volume-bar, #volume-text' ).addClass( 'hide' );
			$( '.volumeband' ).toggleClass( 'hide', G.display.volumenone );
			displayBars();
			setButtonControl();
			displayPlayback();
			if ( G.status.state === 'play' && !G.status.stream && !G.localhost ) {
				setProgress();
				setTimeout( setProgressAnimate, 0 );
			}
			if ( 'coverTL' in G && !G.display.cover ) $( '#timemap' ).removeClass( 'hide' );
			break;
		case 'settings':
			$( '#button-settings' ).click();
			break;
		case 'repeat':
			if ( G.status.repeat ) {
				if ( G.status.single ) {
					$( '#single' ).click();
					G.status.repeat = false;
					G.status.single = false;
					setButtonOptions();
					local( 600 );
					bash( [ 'mpcoption', 'repeat', false ] );
					bash( [ 'mpcoption', 'single', false ] );
				} else {
					$( '#single' ).click();
				}
			} else {
				$( '#repeat' ).click();
			}
			break
		default:
			if ( cmd === 'play' && G.status.state === 'play' ) cmd = !G.status.stream ? 'pause' : 'stop';
			$( '#'+ cmd ).click();
	}
} );
$( '.btn-cmd' ).click( function() {
	var $this = $( this );
	var cmd = this.id;
	if ( $this.hasClass( 'btn-toggle' ) ) {
		var onoff = !G.status[ cmd ];
		G.status[ cmd ] = onoff;
		bash( [ 'mpcoption', cmd, onoff ] );
		setButtonOptions();
		local( 600 );
	} else {
		if ( G.status.stream ) {
			$( '#divcover .coveredit.cover' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
		if ( cmd === 'play' ) {
			G.status.state = cmd;
			if ( !G.status.elapsed ) $( '#elapsed' ).empty(); // 0 or false
			if ( !G.status.stream && G.status.elapsed !== false ) setProgressAnimate();
			bash( [ 'mpcplayback', 'play' ] );
			$( '#title' ).removeClass( 'gr' );
			$( '#elapsed' ).removeClass( 'bl gr' );
			$( '#total' )
				.text( second2HMS( G.status.Time ) )
				.removeClass( 'wh' );
			$( '#progress i' ).removeAttr( 'class' ).addClass( 'fa fa-play' );
			if ( G.status.stream ) $( '#title, #elapsed' ).html( blinkdot );
			vu();
		} else if ( cmd === 'stop' ) {
			G.status.state = cmd;
			clearInterval( G.intElapsed );
			clearInterval( G.intElapsedPl );
			elapsedscrobble = G.status.webradio ? '' : G.status.elapsed;
			if ( G.status.player !== 'mpd' ) {
				bash( [ 'playerstop', elapsedscrobble ] );
				banner( icon_player[ G.status.player ], 'Stop ...', G.status.player );
				return
			}
			
			$( '#title' ).removeClass( 'gr' );
			if ( !G.status.pllength ) return
			
			bash( [ 'mpcplayback', 'stop', elapsedscrobble ] );
			$( '#pl-list .elapsed' ).empty();
			if ( G.playback ) {
				$( '#total' ).empty();
				if ( G.status.Time ) {
					var timehms = second2HMS( G.status.Time );
					setProgress( 0 );
					$( '#elapsed' )
						.text( timehms )
						.addClass( 'gr' );
					$( '#total, #progress' ).empty();
					$( '#progress' ).html( '<i class="fa fa-stop"></i><span></span>'+ timehms );
				} else {
					$( '#title' ).html( '·&ensp;·&ensp;·' );
					$( '#elapsed, #progress' ).empty();
					vu();
				}
			} else if ( G.playlist ) {
				$( '#pl-list .song' ).empty();
				$( '#pl-list .li1' ).find( '.name, .song' ).css( 'max-width', '' );
				$( '#pl-list .li2 .radioname' ).addClass( 'hide' );
				$( '#pl-list .li1 .radioname' ).removeClass( 'hide' );
			}
		} else if ( cmd === 'pause' ) {
			if ( G.status.state === 'stop' ) return
			
			G.status.state = cmd;
			bash( [ 'mpcplayback', 'pause' ] );
			$( '#title' ).addClass( 'gr' );
			$( '#elapsed' ).addClass( 'bl' );
			$( '#total' ).addClass( 'wh' );
			$( '#progress i' ).removeAttr( 'class' ).addClass( 'fa fa-pause' );
		} else if ( cmd === 'previous' || cmd === 'next' ) {
			var pllength = G.status.pllength;
			var song = G.status.song;
			if ( pllength < 2 ) return
			
			clearIntervalAll();
			$timeRS.setValue( 0 );
			$( '#elapsed, #total, #progress' ).empty();
			elapsedscrobble = G.status.webradio ? '' : G.status.elapsed || '';
			bash( [ 'mpcprevnext', cmd, song, pllength, G.status.state, elapsedscrobble ] );
			if ( G.playlist ) {
				$( '#pl-list li.active' )
					.removeClass( 'active' )
					.find( '.elapsed' ).empty();
				$( '#pl-list li' ).eq( cmd === 'next' ? song + 1 : song - 1  ).addClass( 'active' );
			}
		}
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ cmd ).addClass( 'active' );
	}
	if ( $( '#relays' ).hasClass( 'on' ) && cmd === 'play' ) bash( [ 'relaystimerreset' ] );
} );
$( '#biocontent' ).on( 'click', '.biosimilar', function() {
	getBio( $( this ).text() );
} );
$( '#biocontent' ).on( 'click', '.bioback', function() {
	G.bioartist.pop();
	getBio( G.bioartist.pop() );
} );
$( '#bio' ).on( 'click', '.closebio', function() {
	G.bioartist = [];
	$( '#bio' ).addClass( 'hide' );
	displayBars();
} );
// LIBRARY /////////////////////////////////////////////////////////////////////////////////////
$( '#lib-breadcrumbs' ).on( 'click', 'a', function() {
	G.query = [];
	delete G.gmode;
	if ( G.query.length > 1 ) G.scrolltop[ G.query[ G.query.length - 1 ].modetitle ] = $( window ).scrollTop();
	var path = $( this ).find( '.lidir' ).text();
	if ( G.mode.slice( -5 ) === 'radio' ) {
		var query = {
			  query  : 'radio'
			, string : path
		}
	} else {
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	}
	query.gmode = G.mode;
	list( query, function( html ) {
		if ( !path && G.mode.slice( -5 ) === 'radio' ) path = G.mode.toUpperCase();
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path = path;
	query.modetitle = path;
} );
$( '#lib-breadcrumbs' ).on( 'click', '.button-webradio-new', function() {
	webRadioNew();
} ).on( 'click', '.button-dab-refresh', function() {
	info( {
		  icon     : 'dabradio'
		, title    : 'DAB Radio'
		, message  : ( $( '#lib-list li' ).length ? 'Rescan' : 'Scan' ) +' digital radio stations?'
		, ok       : function() {
			bash( [ 'dabscan' ] );
		}
	} );
} ).on( 'click', '.button-latest-clear', function() {
	info( {
		  icon         : 'latest'
		, title        : 'Latest'
		, message      : 'Clear Latest albums list?'
		, ok           : function() {
			bash( [ 'latestclear' ] );
		}
	} );
} );
$( '#lib-breadcrumbs' ).on ( 'click', '#button-coverart', function() {
	if ( $( this ).find( 'img' ).length ) {
		var message = 'Update thumbnails and directory icons?'
	} else {
		var message = 'With existing album coverarts:'
					+'<br>  • Create thumbnails'
					+'<br>  • Create directory icons'
	}
	info( {
		  icon         : '<i class="iconcover"></i>'
		, title        : 'Album Thumbnails'
		, message      : message
		, messagealign : 'left'
		, ok           : function() {
			thumbUpdate();
		}
	} );
} );
$( '#button-lib-search' ).click( function() { // icon
	$( '#lib-path span, #button-lib-back, #button-lib-search' ).addClass( 'hide' );
	$( '#lib-search, #lib-search-btn' ).removeClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path' ).css( 'max-width', 40 );
	$( '#lib-search-input' ).focus();
} );
$( '#lib-search-btn' ).click( function() { // search
	var keyword = $( '#lib-search-input' ).val();
	if ( !keyword ) {
		$( '#lib-search-close' ).click();
	} else {
		if ( G.mode.slice( -5 ) === 'radio' ) {
			var query = {
				  query  : G.mode
				, string : keyword
				, mode   : 'search'
			}
		} else {
			var query = {
				  query  : 'search'
				, string : keyword
				, gmode  : G.mode
				, format : [ 'album', 'artist', 'file', 'title', 'time', 'track' ]
			}
		}
		list( query, function( html ) {
			if ( html != -1 ) {
				var data = {
					  html      : html
					, modetitle : 'search'
				}
				renderLibraryList( data );
				$( 'html, body' ).scrollTop( 0 );
			} else {
				$( '#lib-search-close' ).html( '<i class="fa fa-times"></i>&ensp;' );
				info( {
					  icon    : 'library'
					, title   : 'Library Database'
					, message : 'Nothing found for <wh>'+ keyword +'</wh>'
				} );
			}
		} );
	}
} );
$( '#lib-search-close' ).click( function() {
	G.keyword = '';
	$( '#lib-search, #lib-search-btn' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path span, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-search-close' ).empty();
	if ( $( '#lib-path .lipath').text() ) $( '#button-lib-back' ).removeClass( 'hide' );
	if ( !$( '#lib-search-input' ).val() ) return
	
	$( '#lib-search-input' ).val( '' );
	if ( G.mode === 'album' ) {
		$( '#mode-album' ).click();
	} else if ( G.query.length ) {
		var query = G.query[ G.query.length - 1 ];
		list( query, function( html ) {
			var data = {
				  html      : html
				, modetitle : query.modetitle
				, path      : query.path
			}
			renderLibraryList( data );
		} );
	} else {
		$( '#button-library' ).click();
	}
} );
$( '#lib-search-input' ).keyup( function( e ) {
	if ( e.key === 'Enter' ) $( '#lib-search-btn' ).click();
} );
$( '#button-lib-back' ).click( function() {
	menuHide();
	var $breadcrumbs = $( '#lib-breadcrumbs a' );
	var bL = $breadcrumbs.length
	var backmode = 'gmode' in G && G.gmode !== G.mode;
	if ( G.mode === $( '#mode-title' ).text().replace( ' ', '' ).toLowerCase()
		|| ( bL && bL < 2 )
		|| ( !bL && G.query.length === 1 )
	) {
		$( '#button-library' ).click();
	} else if ( bL && G.mode !== 'latest' && !backmode ) {
		bL > 1 ? $breadcrumbs.eq( -2 ).click() : $( '#button-library' ).click();
	} else {
		G.query.pop();
		var query = G.query[ G.query.length - 1 ];
		if ( query === 'album' ) {
			$( '#mode-album' ).click();
		} else {
			G.mode = query.gmode;
			list( query, function( html ) {
				if ( html != -1 ) {
					if ( backmode ) G.mode = G.gmode;
					if ( G.mode === 'album' ) {
						var path = 'ALBUM';
					} else {
						var path = query.path;
						G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
					}
					var data = {
						  html      : html
						, modetitle : query.modetitle
						, path      : path
					}
					renderLibraryList( data );
				} else {
					$( '#button-lib-back' ).click(); 
				}
			} );
		}
	}
} );
$( '.mode' ).click( function() {
	var $this = $( this );
	G.mode = $this.data( 'mode' );
	$( '#lib-search-close' ).click();
	if ( G.mode === 'bookmark' ) return
	
	if ( !G.status.counts[ G.mode ] && G.mode.slice( -5 ) !== 'radio' ) {
		if ( G.mode === 'playlists' ) {
			var message = 'No saved playlists found.';
		} else if ( G.mode === 'latest' ) {
			var message = 'No new albums added since last update.';
		} else {
			var message = '<wh>'+ $this.find( '.label' ).text() +'</wh> data not available.' 
						 +'<br>To populate Library database:'
						 +'<br>Settings > Library | <i class="fa fa-refresh-library wh"></i>'
		}
		info( {
			  icon    : 'library'
			, title   : 'Library Database'
			, message : message
		} );
		return
	}
	
	if ( !G.color && !G.status.counts[ G.mode ] && G.status.updating_db ) {
		infoUpdate();
		return
	}
	
	G.modescrolltop = $( window ).scrollTop();
	
	if ( G.mode === 'playlists' ) {
		if ( $( this ).find( 'gr' ).text() ) {
			$( '#button-pl-playlists' ).click();
			$( '#playlist' ).click();
		}
		return
	}
	
	var path = G.mode.toUpperCase();
	// G.modes: sd, nas, usb, webradio, dabradio, album, artist, albumartist, composer, conductor, genre, playlists
	// ( coverart, bookmark by other functions )
	if ( [ 'sd', 'nas', 'usb' ].includes( G.mode ) ) { // browse by directory
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	} else if ( G.mode.slice( -5 ) === 'radio' ) {
		var query = {
			  query : 'radio'
			, gmode : G.mode
		}
	} else { // browse by modes
		var query = {
			  query  : 'list'
			, mode   : G.mode
			, format : [ G.mode ]
		}
	}
	query.gmode = G.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path = G.mode.slice( -5 ) === 'radio' ? '' : path;
	query.modetitle = path;
	if ( query.query !== 'ls' ) G.query.push( query );
} );
$( '#lib-mode-list' ).click( function( e ) {
	if ( !G.press && $( '.bkedit' ).length && !$( e.target ).hasClass( 'bkedit' ) ) setBookmarkEdit();
} );
$( '#lib-mode-list' ).on( 'click', '.mode-bookmark', function( e ) { // delegate - id changed on renamed
	$( '#lib-search-close' ).click();
	if ( G.press || $( '.bkedit' ).length ) return
	
	var path = $( this ).find( '.lipath' ).text();
	var path0 = path.split( '/' )[ 0 ];
	var mode = path0.toLowerCase();
	if ( path0.slice( 3 ) !== 'radio' ) {
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
			, gmode  : mode
		}
	} else {
		path = path.slice( 9 );
		var query = {
			  query  : 'radio'
			, string : path
			, gmode  : mode
		}
	}
	G.mode = mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} ).on( 'click', '.bk-remove', function() {
	var $this = $( this ).parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.label' ).text() || path.split( '/' ).pop();
	var $img = $this.find( 'img' );
	if ( $img.length ) {
		var src = $img.attr( 'src' );
		var icon = '<img src="'+ src +'">'
		var ext = src.slice( -4 );
	} else {
		var icon = '<i class="fa fa-bookmark bookmark bl"></i>'
				  +'<br><a class="bklabel">'+ name +'</a>'
		var ext = '.txt';
	}
	info( {
		  icon    : 'bookmark'
		, title   : 'Remove Bookmark'
		, message : icon
		, oklabel : '<i class="fa fa-minus-circle"></i>Remove'
		, okcolor : red
		, ok      : function() {
			bash( [ 'bookmarkremove', name, path ] );
		}
	} );
} ).on( 'click', '.bk-rename', function() {
	var $this = $( this ).parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.label' ).text() || path.split( '/' ).pop();
	info( {
		  icon         : 'bookmark'
		, title        : 'Rename Bookmark'
		, message      : '<div class="infobookmark"><i class="fa fa-bookmark bookmark"></i>'
						+'<br><span class="bklabel">'+ name +'</span></div>'
		, textlabel    : 'To:'
		, values       : name
		, checkblank   : 1
		, checkchanged : 1
		, oklabel      : '<i class="fa fa-flash"></i>Rename'
		, ok           : function() {
			var newname = infoVal();
			bash( [ 'bookmarkrename', name, newname, path ] );
		}
	} );
} ).on( 'click', '.bk-cover', function() {
	var $this = $( this ).parent().parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.label' ).text() || path.split( '/' ).pop();
	var thumbnail = $this.find( 'img' ).length;
	if ( thumbnail ) {
		var icon = '<i class="iconcover"></i>';
		var message = '<img class="imgold" src="'+ $this.find( 'img' ).attr( 'src' ) +'">'
				  +'<p class="infoimgname">'+ name +'</p>';
	} else {
		var icon = 'bookmark';
		var message = '<div class="infobookmark"><i class="fa fa-bookmark"></i>'
					+'<br><span class="bklabel">'+ name +'</span></div>';
	}
	// [imagereplace]
	// select file
	//    - gif    > [file]   - no canvas
	//    - others > [base64] - data:image/jpeg;base64,...
	var imagepath = path.slice( 3, 8 ) !== 'radio' ? '/mnt/MPD/'+ path : '/srv/http/data/'+ path;
	info( {
		  icon        : icon
		, title       : 'Bookmark Thumbnail'
		, message     : message
		, filelabel   : '<i class="fa fa-folder-open"></i> File'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, buttonlabel : !thumbnail ? '' : '<i class="fa fa-bookmark"></i>Default'
		, buttoncolor : !thumbnail ? '' : orange
		, button      : !thumbnail ? '' : function() {
			bash( [ 'bookmarkcoverreset', imagepath, name ] );
		}
		, ok          : function() {
			imageReplace( imagepath +'/coverart', 'bookmark', name ); // no ext
		}
	} );
} )
$( '.mode-bookmark' ).press( setBookmarkEdit );
new Sortable( document.getElementById( 'lib-mode-list' ), {
	// onChoose > onClone > onStart > onMove > onChange > onUnchoose > onUpdate > onSort > onEnd
	  ghostClass    : 'lib-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onMove       : function() {
		$( '.bkedit' ).remove();
		$( '.mode-bookmark' ).children().addBack().removeAttr( 'style' );
	}
	, onUpdate      : function () {
		var order = [];
		$( '.mode' ).each( function() {
			order.push( $( this ).find( '.lipath' ).text() );
		} );
		bash( [ 'ordersave', JSON.stringify( order ) ] );
	}
} );
$( '#page-library' ).on( 'click', '#lib-list .coverart', function() {
	if ( G.press ) return
	
	G.scrolltop[ 'ALBUM' ] = $( window ).scrollTop();
	var $this = $( this );
	var path = $this.find( '.lipath' ).text();
	var query = {
		  query  : 'ls'
		, format : [ 'file' ]
		, gmode  : path.replace( /\/.*/, '' ).toLowerCase()
		, mode   : 'album'
		, string : path
	}
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : $this.find( G.display.albumbyartist ? '.coverart2' : '.coverart1' ).text()
			, path      : 'ALBUM'
		}
		renderLibraryList( data );
	} );
	query.modetitle = 'ALBUM';
	G.query.push( query );
} ).press( '.coverart', function( e ) {
	var $this = $( e.currentTarget );
	var src = $this.find( 'img' ).attr( 'src' );
	var i = G.display.albumbyartist ? '21' : '12';
	var album = $this.find( '.coverart'+ i[ 0 ] ).text();
	var artist = $this.find( '.coverart'+ i[ 1 ] ).text();
	info( {
		  icon    : 'album'
		, title   : 'Album Thumbnail'
		, message : `\
<img src="${ src }">
<wh><i class="fa fa-album"></i> ${ album }</wh>
<i class="fa fa-artist wh"></i> ${ artist }

Exclude this thumbnail?`
		, okcolor : orange
		, oklabel : '<i class="fa fa-minus-circle"></i> Exclude'
		, ok      : function() {
			bash( [ 'albumignore', album, artist ] );
			$this.remove();
		}
	} );
} ).on( 'click', '.coveredit',  function() {
	var $this = $( this );
	var $img = $this.siblings( 'img' );
	var $thisli = $this.parent().parent();
	var album = $thisli.find( '.lialbum' ).text();
	var artist = $thisli.find( '.liartist' ).text();
	var lipath = $thisli.next().find( '.lipath' ).text();
	var path = '/mnt/MPD/'+ getDirectory( lipath );
	if ( $this.hasClass( 'fa-save' ) ) {
		coverartSave();
	} else {
		coverartChange();
	}
} );
$( '#page-library' ).press( '.licoverimg',  function( e ) {
	var $this = $( e.currentTarget );
	$this.parent().removeClass( 'active' );
	$( '#menu-album' ).addClass( 'hide' );
	$this.find( 'img' )
		.css( 'opacity', '0.33' )
		.after( icoveredit );
	menuHide();
} );
$( '#page-library' ).on( 'click', '#lib-list li', function( e ) {
	if ( G.press ) return
	
	if ( $( '.licover .coveredit.cover' ).length ) {
		$( '.licover .coveredit.cover' ).remove();
		$( '.licover img' ).css( 'opacity', '' );
		return
	}
	var $this = $( this );
	var $target = $( e.target );
	if ( $target.hasClass( 'fa-save' ) || $target.hasClass( 'coverart' ) ) return
	
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	if ( $target.hasClass( 'lib-icon' ) || $target.hasClass( 'licoverimg' ) ) {
		if ( $this.hasClass( 'active' ) && menushow ) {
			menuHide();
		} else {
			$( '#lib-list li' ).removeClass( 'active' );
			contextmenuLibrary( $this, $target );
		}
		return
	}
	
	menuHide();
	if ( menushow ) return
	
	$( '#lib-list li' ).removeClass( 'active' );
	if ( $target.hasClass( 'bkedit' ) ) return
	
	if ( $( '.bkedit' ).length ) {
		$( '.bkedit' ).remove();
		$( '.licoverimg img' ).css( 'opacity', '' );
		if ( $( this ).hasClass( 'licover' ) ) return
	}
	
	if ( $this.hasClass( 'licover' ) ) {
		if ( $target.is( '.liartist, .fa-artist, .fa-albumartist, .licomposer, .fa-composer' ) ) {
			var name = ( $target.is( '.licomposer, .fa-composer' ) ) ? $this.find( '.licomposer' ).text() : $this.find( '.liartist' ).text();
			getBio( name );
		} else if ( $target.hasClass( 'liinfopath' ) ) {
			G.gmode = G.mode;
			var path = $target.text();
			G.mode = path.replace( /\/.*/, '' ).toLowerCase();
			var query = {
				  query  : 'ls'
				, string : path
				, format : [ 'file' ]
			}
			query.gmode = G.mode;
			list( query, function( html ) {
				var data = {
					  html      : html
					, modetitle : path
					, path      : path
				}
				renderLibraryList( data );
			} );
			G.query.push( query );
		}
		return
	} else if ( $target.hasClass( 'lialbum' ) ) {
		if ( !G.localhost ) window.open( 'https://www.last.fm/music/'+ $this.find( '.liartist' ).text() +'/'+ $this.find( '.lialbum' ).text(), '_blank' );
		return
	} else if ( $this.find( '.fa-music' ).length || $target.data( 'target' ) ) {
		contextmenuLibrary( $this, $target );
		return
	}
	
	$this.addClass( 'active' );
	var libpath = $( '#lib-path .lipath' ).text();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.liname' ).text();
	var mode = $( this ).data( 'mode' );
	var modefile = [ 'sd', 'nas', 'usb' ].includes( G.mode );
	// modes: sd, nas, usb, webradio, album, artist, albumartist, composer, conductor, date, genre
	if ( [ 'sd', 'nas', 'usb' ].includes( mode ) ) { // list by directory
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
		var modetitle = modefile ? path : $( '#mode-title' ).text();
	} else if ( G.mode.slice( -5 ) === 'radio' ) {
		if ( $( this ).hasClass( 'dir' ) ) {
			var query = {
				  query  : 'radio'
				, string : path
			}
			var modetitle = path;
		} else {
			contextmenuLibrary( $this, $target );
			return
		}
	} else if ( mode !== 'album' ) { // list by mode (non-album)
		if ( [ 'date', 'genre' ].includes( G.mode ) ) {
			var format = [ 'artist', 'album' ];
		} else if ( [ 'conductor', 'composer' ].includes( G.mode ) ) {
			var format = [ 'album', 'artist' ];
		} else {
			var format = [ 'album' ];
		}
		var query = {
			  query  : 'find'
			, mode   : G.mode
			, string : path
			, format : format
		}
		var modetitle = path;
	} else { // track list
		if ( G.mode === 'album' ) {
			if ( name ) { // albums with the same names
				var query = {
					  query  : 'find'
					, mode   : [ 'album', 'artist' ]
					, string : [ name, path ]
				}
				var modetitle = name;
			} else {
				var query = {
					  query  : 'find'
					, mode   : 'album'
					, string : path
					, format : [ 'album', 'artist' ]
				}
				var modetitle = path;
			}
		} else {
			var query = {
				  query  : 'find'
				, mode   : [ 'album', G.mode ]
				, string : [ name, libpath ]
			}
			var modetitle = libpath;
		}
	}
	G.scrolltop[ libpath ] = $( window ).scrollTop();
	query.gmode = G.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : modetitle
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path = path;
	query.modetitle = modetitle;
	if ( query.query !== 'ls' || !modefile ) G.query.push( query );
} );
$( '.page' ).on( 'click', '.index a', function() {
	var index = $( this ).find( 'wh' ).text()[ 0 ];
	if ( !index ) return
	
	if ( index === '#' ) {
		var scrollT = 0;
	} else {
		if ( G.library ) {
			var el = G.mode === 'album' || G.mode === 'latest' ? '.coverart' : '#lib-list li';
		} else {
			var el = '#pl-savedlist li';
		}
		var scrollT = $( el +'[data-index='+ index +']' ).offset().top;
	}
	$( 'html, body' ).scrollTop( scrollT - ( $( '#bar-top' ).is( ':visible' ) ? 80 : 40 ) );
} );
// PLAYLIST /////////////////////////////////////////////////////////////////////////////////////
$( '#button-playlist' ).click( function() {
	$( '#playlist' ).click();
} );
$( '#pl-manage i' ).click( function() {
	menuHide();
} );
$( '#button-pl-back' ).click( function() {
	menuHide();
	if ( G.savedplaylist ) {
		$( '#button-pl-playlists' ).click();
	} else {
		getPlaylist();
	}
} );
$( '#button-pl-playlists' ).click( function() {
	G.savedlist = 1;
	G.savedplaylist = 0;
	list( { cmd: 'list' }, function( data ) {
		renderPlaylistList( data );
	}, 'json' );
} );
$( '#button-pl-save' ).click( function() {
	var audiocdL = $( '#pl-list .fa-audiocd' ).length;
	var upnpL = $( '#pl-list .fa-upnp' ).length;
	var notsavedL = $( '#pl-list .notsaved' ).length;
	if ( audiocdL || upnpL ) {
		info( {
			  icon    : 'file-playlist'
			, title   : 'Save Playlist'
			, message : '<i class="fa fa-warning wh"></i> Saved playlist cannot contain:<br>'
						+ audiocdL ? audiocdL +'<i class="fa fa-audiocd wh"></i>' : ''
						+ upnpL ? upnpL +'&emsp;<i class="fa fa-upnp wh"></i>' : ''
						+ notsavedL ? notsavedL +'&emsp;<i class="fa fa-save wh"></i>' : ''
		} );
	} else {
		playlistNew();
	}
} );
$( '#button-pl-consume' ).click( function() {
	if ( G.status.consume ) {
		$( this ).removeClass( 'bl' );
		banner( 'Consume Mode', 'Off', 'playlist' );
	} else {
		$( this ).addClass( 'bl' );
		banner( 'Consume Mode', 'On - Remove each song after played.', 'playlist' );
	}
	G.status.consume = !G.status.consume;
	bash( [ 'mpcoption', 'consume', G.status.consume ] );
} );
$( '#button-pl-librandom' ).click( function() {
	var $this = $( this );
	if ( G.status.librandom ) {
		G.status.librandom = false;
		$this.removeClass( 'bl' );
		banner( 'Roll The Dice', 'Off ...', 'librandom' );
		bash( [ 'librandom', false ] );
	} else {
		info( {
			  icon    : 'librandom'
			, title   : 'Roll The Dice'
			, message : 'Randomly add songs and play continuously.'
			, checkbox : [ 'Start from current song' ]
			, ok      : function() {
				G.status.librandom = true;
				$this.addClass( 'bl' );
				banner( 'Roll The Dice', 'On ...', 'librandom' );
				bash( [ 'librandom', true, infoVal() ] );
			}
		} );
	}
} );
$( '#button-pl-shuffle' ).click( function() {
	info( {
		  icon    : 'shuffle'
		, title   : 'Shuffle Playlist'
		, message : 'Shuffle all tracks in playlist?'
		, ok      : function() {
			bash( [ 'plshuffle' ] );
		}
	} );
} );
$( '#button-pl-clear' ).click( function() {
	if ( G.status.pllength === 1 ) {
		info( {
			  icon        : 'playlist'
			, title       : 'Clear Playlist'
			, oklabel     : '<i class="fa fa-minus-circle"></i>Clear'
			, okcolor     : red
			, ok          : function() {
				bash( [ 'plremove' ] );
				banner( 'Playlist', 'Clear ...', 'playlist blink', -1 );
			}
		} );
	} else {
		info( {
			  icon        : 'playlist'
			, title       : 'Remove From Playlist'
			, buttonlabel : [ '<i class="fa fa-playlist"></i>Select', '<i class="fa fa-crop"></i>Crop' ]
			, buttoncolor : [ orange ]
			, button      : [
				  function() {
					$( '#pl-list .li1' ).before( '<i class="fa fa-minus-circle pl-remove"></i>' );
					$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
				}
				, function() {
					$( '#pl-list li:not( .active )' ).remove();
					if ( !G.status.librandom ) local();
					bash( [ 'plcrop' ] );
				}
			]
			, oklabel     : '<i class="fa fa-minus-circle"></i>All'
			, okcolor     : red
			, ok          : function() {
				bash( [ 'plremove' ] );
				setPlaybackBlank();
			}
		} );
	}
} );
$( '#pl-search-input' ).keyup( playlistFilter );
$( '#pl-search-close, #pl-search-btn' ).click( function() {
	$( '#pl-search-close' ).empty();
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).addClass( 'hide' );
	$( '#pl-manage, #button-pl-search, #pl-list li' ).removeClass( 'hide' );
	$( '#pl-search-input' ).val( '' );
	$( '#pl-list' ).html( function() {
		return $( this ).html().replace( /<bl>|<\/bl>/g, '' );
	} )
} );
$( '#button-pl-search' ).click( function() {
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).removeClass( 'hide' );
	$( '#pl-manage, #button-pl-search' ).addClass( 'hide' );
	$( '#pl-search-input' ).focus();
} );
new Sortable( document.getElementById( 'pl-list' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onStart       : function() {
		$( '#pl-list li.active' ).addClass( 'sortactive' );
	}
	, onUpdate      : function ( e ) {
		G.status.song = $( '#pl-list li.sortactive' ).index();
		$( '#pl-list li.sortactive' ).removeClass( 'sortactive' );
		sortPlaylist( 'pl-list', e.oldIndex, e.newIndex );
	}
} );
new Sortable( document.getElementById( 'pl-savedlist' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onUpdate      : function ( e ) {
		sortPlaylist( 'pl-savedlist', e.oldIndex, e.newIndex );
	}
} );
$( '#pl-list' ).on( 'click', 'li', function( e ) {
	$target = $( e.target );
	if ( $target.hasClass( 'pl-icon' ) || $target.hasClass( 'fa-save' ) ) return
	
	var $this = $( this );
	if ( ![ 'mpd', 'upnp' ].includes( G.status.player ) ) {
		$this.find( '.pl-icon' ).click();
		return
	}
	
	var $liactive = $( '#pl-list li.active' );
	var listnumber = $this.index() + 1;
	$( '#menu-plaction' ).addClass( 'hide' );
	$liactive.find( '.song' ).empty();
	$liactive.find( '.li1 .radioname' ).removeClass( 'hide' );
	$liactive.find( '.li2 .radioname' ).addClass( 'hide' );
	if ( $this.hasClass( 'active' ) ) {
		if ( G.status.state == 'play' ) {
			if ( $this.find( '.lipath' ).text().slice( 0, 4 ) !== 'http' ) {
				$( '#pause' ).click();
				$this.find( '.elapsed i' ).removeClass( 'fa-play' ).addClass( 'fa-pause' );
			} else {
				$( '#stop' ).click();
			}
		} else {
			$( '#play' ).click();
		}
	} else {
		clearIntervalAll();
		$( '.elapsed' ).empty();
		bash( [ 'mpcplayback', 'play', listnumber ] );
		$( '#pl-list li.active, #playback-controls .btn' ).removeClass( 'active' );
		$this.add( '#play' ).addClass( 'active' );
	}
} ).on( 'click', '.savewr', function() {
	G.list.li = $( this ).parent();
	webRadioSave( $( this ).next().next().text() );
	menuHide();
} ).on( 'click', '.pl-icon', function() {
	var $this = $( this );
	var $thisli = $this.parent();
	G.list = {};
	G.list.li = $thisli;
	G.list.path = $thisli.find( '.lipath' ).text();
	G.list.artist = $thisli.find( '.artist' ).text();
	G.list.name = $thisli.find( '.name' ).text();
	G.list.index = $thisli.index();
	var $menu = $( '#menu-plaction' );
	$( '#pl-list li' ).removeClass( 'updn' );
	$( '.pl-remove' ).remove();
	$thisli.addClass( 'updn' );
	if ( !$menu.hasClass( 'hide' ) && $menu.css( 'top' ) === ( $thisli.position().top + 48 ) +'px' ) {
		$menu.addClass( 'hide' );
		$thisli.removeClass( 'updn' );
		return
	}
	
	var state = G.status.state;
	var play = state === 'play';
	var active = $thisli.hasClass( 'active' );
	var audiocd = $thisli.hasClass( 'audiocd' );
	var notsaved = $thisli.hasClass( 'notsaved' );
	var radio = $thisli.hasClass( 'webradio' );
	var upnp = $thisli.hasClass( 'upnp' );
	$( '#menu-plaction a' ).removeClass( 'hide' );
	$menu.find( '.current' ).toggleClass( 'hide', active || play );
	if ( G.status.player === 'mpd' || G.status.player === 'upnp' ) {
		if ( active ) {
			$menu.find( '.play' ).toggleClass( 'hide', play );
			$menu.find( '.pause' ).toggleClass( 'hide', !play || radio );
			$menu.find( '.stop' ).toggleClass( 'hide', state === 'stop' );
		} else {
			$menu.find( '.pause, .stop' ).addClass( 'hide' );
		}
	} else {
		$menu.find( '.play, .pause, .stop, .current' ).addClass( 'hide' );
	}
	$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp || G.status.counts.playlists === 0 );
	$menu.find( '.similar, .submenu' ).toggleClass( 'hide', radio );
	$menu.find( '.tag' ).toggleClass( 'hide', audiocd || radio || upnp );
	$menu.find( '.tagcd' ).toggleClass( 'hide', !audiocd );
	$menu.find( '.wrsave' ).toggleClass( 'hide', !notsaved );
	contextmenuScroll( $menu, $thisli.offset().top + 48 );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	plRemove( $( this ).parent() );
} );
$( '#pl-savedlist' ).on( 'click', 'li', function( e ) {
	menuHide();
	var $target = $( e.target );
	if ( $target.hasClass( 'savewr' ) ) return
	
	$this = $( this );
	if ( $this.hasClass( 'active' ) && $( '.contextmenu:not( .hide )' ).length ) return
	
	var pladd = 'file' in G.pladd;
	var plicon = $target.hasClass( 'pl-icon' );
	if ( G.savedplaylist || plicon ) {
		if ( pladd ) {
			playlistInsertSelect( $this );
		} else {
			var datatarget = $target.data( 'target' ) || $this.find( '.pl-icon' ).data ( 'target' );
			var $menu = $( datatarget );
			G.list = {};
			G.list.li = $this; // for contextmenu
			$( '#pl-savedlist li' ).removeClass( 'active' );
			if ( G.savedlist ) {
				G.list.name = $this.find( '.plname' ).text().trim();
				G.list.path = G.list.name;
			} else {
				G.list.artist = $this.find( '.artist' ).text().trim();
				G.list.name = $this.find( '.name' ).text().trim();
				G.list.path = $this.find( '.lipath' ).text().trim() || G.list.name;
				G.list.track = $this.data( 'track' );
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', !G.status.pllength );
				$( '.minus-circle' ).removeClass( 'hide' );
				$( '.tag' ).addClass( 'hide' );
				if ( ( G.display.tapaddplay || G.display.tapreplaceplay )
					&& G.savedplaylist 
					&& !plicon
					&& G.status.player === 'mpd'
				) {
					$menu.find( 'a:eq( 0 ) .submenu' ).click();
					return
				}
				
				$menu.find( '.replace' ).toggleClass( 'hide', !G.status.pllength );
				$menu.find( '.similar' ).toggleClass( 'hide', G.list.path.slice( 0, 4 ) === 'http' );
				$menu.find( '.wrsave' ).toggleClass( 'hide', !$this.hasClass( 'notsaved' ) );
			}
			$this.addClass( 'active' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
			contextmenuScroll( $menu, $this.position().top + 48 );
		}
	} else {
		G.savedlist = 0;
		G.savedplaylist = 1;
		renderSavedPlaylist( $this.find( '.plname' ).text() );
		if ( pladd ) playlistInsertTarget();
	}
} ).on( 'click', '.savewr', function() {
	G.list.li = $( this ).parent();
	webRadioSave( $( this ).next().next().text() );
	menuHide();
} );
// lyrics /////////////////////////////////////////////////////////////////////////////////////
$( '#lyricstextarea' ).on( 'input', function() {
	if ( G.lyrics === $( this ).val()  ) {
		$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
		$( '#lyricsback' ).removeClass( 'hide' );
	} else {
		$( '#lyricsundo, #lyricssave' ).removeClass( 'hide' );
		$( '#lyricsback' ).addClass( 'hide' );
	}
} );
$( '#lyricsedit' ).click( function() {
	$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
	$( '#lyricsdelete' ).toggleClass( 'hide', !G.lyrics );
	$( '#lyricseditbtngroup' ).removeClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).addClass( 'hide' );
	$( '#lyricstextarea' )
		.val( G.lyrics )
		.scrollTop( $( '#lyricstext' ).scrollTop() );
} );
$( '#lyricsclose' ).click( function() {
	if ( $( '#lyricstextarea' ).val() === G.lyrics || !$( '#lyricstextarea' ).val() ) {
		lyricsHide();
	} else {
		info( {
			  icon     : 'lyrics'
			, title    : 'Lyrics'
			, message  : 'Discard changes made to this lyrics?'
			, ok       : lyricsHide
		} );
	}
} );
$( '#lyricsback' ).click( function() {
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
} );
$( '#lyricsundo' ).click( function() {
	info( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Discard changes made to this lyrics?'
		, ok       : function() {
			$( '#lyricstextarea' ).val( G.lyrics );
			$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
			$( '#lyricsback' ).removeClass( 'hide' );
		}
	} );
} );
$( '#lyricssave' ).click( function() {
	info( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Save this lyrics?'
		, ok       : function() {
			G.lyrics = $( '#lyricstextarea' ).val();
			var artist = $( '#lyricsartist' ).text();
			var title = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'save', G.lyrics.replace( /\n/g, '\\n' ) ] );
			lyricstop = $( '#lyricstextarea' ).scrollTop();
			lyricsShow( G.lyrics );
			$( '#lyricseditbtngroup' ).addClass( 'hide' );
			$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
		}
	} );
} );	
$( '#lyricsdelete' ).click( function() {
	info( {
		  icon    : 'lyrics'
		, title   : 'Lyrics'
		, message : 'Delete this lyrics?'
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : red
		, ok      : function() {
			var artist = $( '#lyricsartist' ).text();
			var title = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'delete' ] );
			G.lyrics = '';
			lyricsHide();
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
