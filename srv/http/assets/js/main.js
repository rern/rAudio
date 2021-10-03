var G = {
	  addplay       : 0
	, apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : 'd666cd06ec4fcf84c3b86279831a1c8e'
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
	, localhost     : [ 'localhost', '127.0.0.1' ].indexOf( location.hostname ) !== -1
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
	, xswipe        : 100
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
if ( G.localhost ) {
	var blinkdot = '<a>·</a>&ensp;<a>·</a>&ensp;<a>·</a>';
/*	var drag = false, pY; // drag scroll vertically
	$( 'body' ).on( 'touchmove mousemove', function( e ) {
		if ( drag ) $( window ).scrollTop( $( window ).scrollTop() + ( pY - e.pageY ) );
	} ).on( 'mousedown', function( e ) {
		drag = true;
		pY = e.pageY;
	} ).on( 'touchend mouseup mouseleave', function() {
		drag = false;
	} );*/
} else {
	var blinkdot = '<a class="dot">·</a>&ensp;<a class="dot dot2">·</a>&ensp;<a class="dot dot3">·</a>';
}
var icoveredit = '<div class="coveredit cover"><i class="iconcover"></i></div>';
var icoversave = '<i class="coveredit fa fa-save cover-save"></i>';
var orange = '#de810e';
var red = '#bb2828';
var canvas = document.getElementById( 'iconrainbow' );
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
var nameplayer = {
	  airplay    : 'AirPlay'
	, bluetooth  : 'Bluetooth Renderer'
	, snapclient : 'Snapcast Client'
	, spotify    : 'Spotify Connect'
	, touch      : 1
	, upnp       : 'UPnP'
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

if ( !navigator.maxTouchPoints ) { // iOS safari cannot be detected by php HTTP_USER_AGENT
	$( 'head' ).append( '<link rel="stylesheet" href="/assets/css/desktop.css">' );
	$.getScript( '/assets/js/shortcut.js' );
}
	
statusRefresh();

$( '.page' ).click( function( e ) {
	if ( [ 'coverTR', 'timeTR' ].indexOf( e.target.id ) === -1 ) $( '#settings' ).addClass( 'hide' );
} ).on( 'touchstart mousedown', function( e ) {
	var $target = $( e.target );
	var targetid = e.target.id;
	if ( G.display.noswipe || G.drag || G.down
		|| targetid === 'time-knob'|| targetid === 'volume-knob'
		|| targetid === 'time-band'|| targetid === 'volume-band'
		|| $target.parents( '#time-knob' ).length || $target.parents( '#volume-knob' ).length
	) return

	G.xstart = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	G.swipe = 0;
} ).on( 'touchmove mousemove', function( e ) {
	if ( !G.xstart ) return
	
	var xmove = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	if ( Math.abs( G.xstart - xmove ) > 10 ) {
		G.swipe = 1;
		setTimeout( function() { G.swipe = 0 }, 200 );
	}
} ).on( 'touchend mouseup', function( e ) { // no mouseleave for swipe
	if ( !G.swipe ) {
		G.xstart = 0;
		return
	}
	
	var xend = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	var xdiff = G.xstart - xend;
	if ( Math.abs( xdiff ) > G.xswipe ) $( '#'+ pagenext[ G.page ][ xdiff > 0 ? 1 : 0 ] ).click();
	G.xstart = 0;
	
} );

$( '#loader' ).click( function() {
	loaderHide();
} );
$( '#coverart' ).on( 'load', function() {
	if ( G.status.coverart.slice( 0, 9 ) === '/data/shm'
		&& [ 'NAS', 'SD/', 'USB' ].indexOf( G.status.file.slice( 0, 3 ) ) !== -1
	) {
		$( '#divcover' ).append( icoversave );
	} else {
		$( '#divcover .coveredit' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
	}
	if ( ( window.innerWidth - $( '#divcover' ).width() ) < 80 ) {
		$( '#volume-band-dn' ).css( 'left', 0 );
		$( '#volume-band-up' ).css( 'right', 0 );
	} else {
		$( '#volume-band-dn' ).css( 'left', '' );
		$( '#volume-band-up' ).css( 'right', '' );
	}
	loaderHide();
} ).on( 'error', coverartDefault );
// COMMON /////////////////////////////////////////////////////////////////////////////////////
$( '#logo, #reload, #button-library, #button-playlist' ).press( function() { // from info.js
	location.reload();
} );
$( '#logo' ).click( function() {
	window.open( 'https://github.com/rern/rAudio-1/discussions' );
} );
$( '#button-settings' ).click( function() {
	if ( $( '#settings' ).hasClass( 'hide' ) ) {
		$( '#settings' )
			.css( 'top', ( $( '#bar-top' ).is( ':visible' ) ? '40px' : 0 ) )
			.css( 'pointer-events', 'none' ) // suppress coverTR tap on show
			.removeClass( 'hide' );
		setTimeout( function() {
			$( '#settings' ).css( 'pointer-events', '' );
		}, 300 );
	} else {
		$( '#settings' ).addClass( 'hide' );
	}
	$( '.contextmenu' ).addClass( 'hide' );
} );
$( '.settings' ).click( function() {
	location.href = 'settings.php?p='+ this.id;
} );
$( '#settings' ).on( 'click', '.submenu', function() {
	switch ( this.id ) {
		case 'relays':
			bash( '/srv/http/bash/relays.sh '+ !G.status.relayson );
			break;
		case 'equalizer':
			equalizer();
			break;
		case 'snapclient':
			var startstop = G.status.player === 'snapclient' ? 'stop' : 'start';
			bash( '/srv/http/bash/snapcast.sh '+ startstop, function( data ) {
				bannerHide();
				if ( data == -1 ) {
					info( {
						  icon    : 'snapcast'
						, title   : 'Snapcast'
						, message : 'Snapcast server not available'
					} );
				}
			} );
			banner( 'Snapcast - Sync Streaming Client', ( G.status.player === 'snapclient' ? 'Stop ...' : 'Start ...' ), 'snapcast blink', -1 );
			break;
		case 'update':
			infoUpdate( '' );
			break;
		case 'lock':
			$.post( cmdphp, { cmd: 'logout' }, function() {
				location.reload();
			} );
			break;
		case 'screenoff':
			bash( [ 'screenoff' ] );
			G.screenoff = 1;
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
		case 'guide':
			location.href = 'settings/guide.php';
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
			bash( [ 'power' ] );
		}
	} );
} );
$( '#displaylibrary' ).click( function() {
	infoLibrary();
} );
$( '#displayplayback' ).click( function() {
	infoPlayback();
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
	$( '#playback-controls i, #button-library, #lib-list li.active, #colorok,  \
		#bar-top, #bar-bottom i, .menu a, .submenu, .content-top' ).css( 'background-color', '' );
	$( '#colorcancel, #mode-title, #button-lib-back, .lib-icon, gr, \
		#lib-list li.active i, #lib-list li.active .time, #lib-list li.active .li2' ).css( 'color', '' );
	$( '.menu a' ).css( 'border-top', '' );
	$( '#lib-list li' ).css( 'border-bottom', '' );
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
	$( '.menu' ).addClass( 'hide' );
	$( '#lib-path span' ).removeClass( 'hide' );
	if ( !$( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
	if ( G.library ) {
		if ( G.librarylist || G.bookmarkedit ) {
			if ( G.librarylist ) G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
			G.mode = '';
			G.librarylist = 0;
			G.bookmarkedit = 0;
			G.query = [];
		}
		renderLibrary();
	} else {
		switchPage( 'library' );
		if ( G.status.updating_db ) banner( 'Library Database', 'Update ...', 'refresh-library blink' );
	}
} );
$( '#playback' ).click( function() {
	if ( G.playback && ( window.innerHeight - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).click();
	} else {
		getPlaybackStatus();
		switchPage( 'playback' );
	}
} );
$( '#playlist' ).click( function() {
	G.pladd = {};
	if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) {
			G.savedlist = 0;
			G.savedplaylist = 0;
			getPlaylist();
		}
		$( '.menu' ).addClass( 'hide' );
	} else {
		switchPage( 'playlist' );
		if ( !G.savedlist && !G.savedplaylist ) {
			G.status.playlistlength ? getPlaylist() : renderPlaylist( -1 );
		}
	}
} );
$( '#page-playback' ).click( function( e ) {
	if ( G.press
		|| [ 'coverT', 'timeT', 'volume-bar', 'volume-band', 'volume-band-dn', 'volume-band-up' ].indexOf( e.target.id ) !== -1 ) return
	
	if ( G.guide ) hideGuide();
	if ( $( '#divcover .coveredit' ).length ) {
		if ( !$( e.target ).hasClass( '.coveredit.cover' ) ) {
			$( '#divcover .coveredit.cover' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
	}
} );
$( '#bar-top, #bar-bottom, #button-library' ).click( function() {
	if ( G.guide ) hideGuide();
	if ( !$( '#colorpicker' ).hasClass( 'hide' ) ) $( '#colorcancel' ).click();
} );
$( '#bar-top' ).click( function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide' );
} );
$( '#settings' ).click( function() {
	$( this ).addClass( 'hide' );
} );
$( '#lib-list, #pl-list, #pl-savedlist' ).on( 'click', 'p', function() {
	$( '.menu' ).addClass( 'hide' );
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
		if ( G.plremove ) {
			G.plremove = 0;
			getPlaybackStatus();
		}
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
	if ( artist === $( '#lyricsartist' ).text() && title === $( '#lyricstitle' ).text() && G.lyrics ) {
		lyricsShow( 'current' );
		return
	}
	
	artist = artist.replace( /(["`])/g, '\\$1' );
	var title = $( '#title' ).text().replace( /(["`])/g, '\\$1' );
	file = G.status.player === 'mpd' ? '/mnt/MPD/'+ G.status.file : '';
	bash( [ 'lyricsexist', artist, title, file ], function( data ) {
		if ( data ) {
			G.lyricsTitle = title;
			G.lyricsArtist = artist;
			lyricsShow( data );
			return
		}
		
		var noparen = title.slice( -1 ) !== ')';
		var titlenoparen = title.replace( / $| \(.*$/, '' );
		info( {
			  icon        : 'lyrics'
			, title       : 'Bio / Lyrics'
			, width       : 500
			, textlabel   : [ '<i class="fa fa-artist wh"></i>', '<i class="fa fa-music wh"></i>' ]
			, values      : noparen ? [ artist, title ] : [ artist, titlenoparen ]
			, boxwidth    : 'max'
			, checkbox    : noparen ? '' : [ 'Title with parentheses content' ]
			, beforeshow  : noparen ? '' : function() {
				$( '#infoContent input' ).change( function() {
					$( '#infoContent input:text:eq( 1 )' ).val( $( this ).prop( 'checked' ) ? title : titlenoparen );
				} );
			}
			, buttonlabel : 'Bio'
			, buttoncolor : orange
			, button      : function() {
				if ( $( '#bio legend' ).text() != G.status.Artist ) {
					getBio( infoVal()[ 0 ] );
				} else {
					$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
					$( '#bio' ).removeClass( 'hide' );
				}
			}
			, oklabel     : 'Lyrics'
			, ok          : function() {
				var values = infoVal();
				G.lyricsArtist = values[ 0 ];
				G.lyricsTitle = values[ 1 ];
				bash( [ 'lyrics', G.lyricsArtist, G.lyricsTitle ], function( data ) {
					lyricsShow( data );
				} );
				banner( 'Lyrics', 'Fetch ...', 'search blink', 20000 );
			}
		} );
	} );
} );
$( '#album, #guide-album' ).click( function() {
	window.open( 'https://www.last.fm/music/'+ $( '#artist' ).text() +'/'+ $( '#album' ).text(), '_blank' );
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
		if ( e.value === 0 ) volColorUnmute(); // restore handle color immediately on start drag
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
		volumeDrag( e.value );
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, change            : function( e ) {
		if ( G.drag ) return
		
		$( '#volume-knob, #vol-group i' ).addClass( 'disable' );
		bash( [ 'volume', G.status.volume, e.value, G.status.control ] );
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, valueChange       : function( e ) {
		if ( G.drag || !G.create ) return // !G.create - suppress fire before 'create'
		
		G.status.volume = e.value;
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, stop              : function() {
		G.drag = 0;
		volumePushstream();
	}
} );
$( '#volmute' ).click( function() {
	$( '#volume-knob, #vol-group i' ).addClass( 'disable' );
	bash( [ 'volume', G.status.volume, 0, G.status.control ] );
} );
$( '#volup, #voldn' ).click( function() {
	var voldn = this.id === 'voldn';
	if ( ( G.status.volume === 0 && voldn ) || ( G.status.volume === 100 && !voldn ) ) return
	
	bash( [ 'volumeupdown', ( voldn ? '-' : '+' ), G.status.control ] );
} ).on( 'touchend mouseup mouseleave', function() {
	if ( G.volhold ) {
		G.volhold = 0;
		clearInterval( G.intVolume );
		volumePushstream();
	}
} ).press( function( e ) {
	G.volhold = 1;
	var voldn = e.currentTarget.id === 'voldn';
	var vol = G.status.volume;
	if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
	
	G.intVolume = setInterval( function() {
		if ( ( vol === 0 && voldn ) || ( vol === 100 && !voldn ) ) return
		
		voldn ? vol-- : vol++;
		$volumeRS.setValue( vol );
		volumeDrag( vol );
	}, 100 );
} );
$( '#time-band' ).on( 'touchstart mousedown', function() {
	hideGuide();
	if ( G.status.player !== 'mpd' || G.status.stream ) return
	
	G.down = 1;
	clearIntervalAll();
	if ( G.status.state !== 'play' ) $( '#title' ).addClass( 'gr' );
} ).on( 'touchmove mousemove', function( e ) {
	if ( !G.down || G.status.player !== 'mpd' || G.status.stream ) return
	
	G.drag = 1;
	e.preventDefault();
	var pageX = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	mpcSeekBar( pageX );
} ).on( 'touchend mouseup mouseleave', function( e ) {
	if ( !G.down || G.status.player !== 'mpd' || G.status.stream ) return
	
	G.down = 0;
	G.drag = 0;
	var pageX = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	mpcSeekBar( pageX );
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	hideGuide();
	if ( G.status.volumenone || $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	G.down = 1;
	clearTimeout( G.volumebar );
} ).on( 'touchmove mousemove', function( e ) {
	if ( !G.down || G.status.volumenone ) return
	
	G.drag = 1;
	e.preventDefault();
	var pageX = e.pageX || e.originalEvent.touches[ 0 ].pageX;
	volumeBarSet( pageX );
} ).on( 'touchend mouseup mouseleave', function( e ) {
	if ( !G.down || G.status.volumenone || $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	G.volumebar = setTimeout( volumeBarHide, 3000 );
	G.down = 0;
	if ( G.drag ) {
		G.drag = 0;
		volumePushstream();
	}
} ).click( function() {
	if ( G.status.volumenone ) return
	
	$( '#volume-text' )
		.text( G.status.volumemute === 0 ? G.status.volume : G.status.volumemute )
		.toggleClass( 'bl', G.status.volumemute !== 0 );
	$( '#volume-bar' ).css( 'width', G.status.volume +'%' );
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	$( '#volume-band-dn, #volume-band-up' ).removeClass( 'transparent' );
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
	volumePushstream();
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
		volumeDrag( vol );
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
		|| !G.status.playlistlength
		|| G.guide
		|| $( e.target ).hasClass( 'band' )
	) return
	
	$( '#coverart' )
		.css( 'opacity', 0.33 )
		.after( icoveredit );
} ).on( 'click', '.fa-save', function() {
	coverartSave();
} ).on( 'click', '.iconcover', function() {
	G.status.webradio ? webRadioCoverart () : coverartChange();
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
	, volT    : 'volup'
	, volL    : 'voldn'
	, volM    : 'volmute'
	, volR    : 'volup'
	, volB    : 'voldn'
}
$( '.map' ).click( function() {
	if ( G.press ) return
	
	if ( $( '#info' ).hasClass( 'hide' ) ) {
		$( '#info' ).removeClass( 'hide' );
		clearTimeout( G.volumebar );
		volumeBarHide();
		return
		
	} else if ( $( '#divcover .coveredit' ).length ) {
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
		$( '.guide' ).toggleClass( 'hide', !G.status.playlistlength && G.status.player === 'mpd' );
		$( '#guide-bio, #guide-album' ).toggleClass( 'hide', !G.status.playlistlength );
		$( '#guide-bio, #guide-lyrics' ).toggleClass( 'hide', G.status.stream && G.status.state === 'stop' );
		$( '#guide-album' ).toggleClass( 'hide', $( '#album' ).hasClass( 'disabled' ) );
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
	if ( cmd === 'cover' ) {
		$( '#bar-bottom' ).removeClass( 'translucent' );
		if ( G.status.player === 'mpd' && !G.status.playlistlength
			|| $( '#page-playback' ).css( 'transform' ) !== 'none'
		) return
		
		if ( !( 'coverTL' in G )
			&& ( window.innerHeight - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 40
			&& !G.display.volumenone
			&& !$( '#volume-knob' ).is( ':visible' )
		) {
			if ( $( '#info' ).hasClass( 'hide' ) ) {
				$( '#info' ).removeClass( 'hide' );
			} else {
				$( '#info' ).addClass( 'hide' );
				$( '#volume-band' ).mouseup();
			}
			return
		}
		
		if ( window.innerWidth < 545 && window.innerWidth < window.innerHeight ) return
		
		var list = [ 'bars', 'time', 'cover', 'coversmall', 'volume', 'buttons' ];
		if ( 'coverTL' in G ) {
			list.forEach( function( el ) {
				G.display[ el ] = G.coverTL[ el ];
			} );
			delete G.coverTL;
			if ( G.display.bars ) {
				$( '#bar-top' ).removeClass( 'hide' );
				$( '#bar-bottom' ).removeClass( 'transparent' );
			} else {
				$( '#bar-top' ).addClass( 'hide' );
				$( '#bar-bottom' ).addClass( 'transparent' );
			}
		} else {
			G.coverTL = {};
			list.forEach( function( el ) {
				G.coverTL[ el ] = G.display[ el ];
			} );
			if ( this.id === 'coverTL' ) {
				if ( G.display.time || G.display.volume ) {
					G.display.time = G.display.coversmall = G.display.volume = G.display.buttons = false;
					$( '#bar-top' ).addClass( 'hide' );
					$( '.page' ).addClass ( 'barshidden' );
					$( '#bar-bottom' ).addClass( 'transparent' );
				} else {
					G.display.time = G.display.volume = G.display.buttons = true;
					$( '#bar-top' ).removeClass( 'hide' );
					$( '.page' ).addClass ( 'barshidden' );
					$( '#bar-bottom' ).removeClass( 'transparent hide' );
					$( '#playback' ).addClass( 'active' );
				}
			} else {
				G.display.time = G.display.cover = G.display.coversmall = G.display.volume = G.display.buttons = true;
			}
		}
		$( '.band' ).addClass( 'transparent' );
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		$( '.volumeband' ).toggleClass( 'hide', G.display.volumenone );
		setButtonControl();
		displayPlayback();
		if ( G.status.state === 'play' && !G.status.stream && !G.localhost ) {
			setProgress();
			setTimeout( setProgressAnimate, 0 );
		}
		if ( 'coverTL' in G && G.display.coversmall ) $( '#timemap' ).removeClass( 'hide' );
	} else if ( cmd === 'settings' ) {
		$( '#button-settings' ).click();
	} else if ( cmd === 'repeat' ) {
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
	} else {
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
			if ( G.status.player === 'airplay' ) {
				bash( '/srv/http/bash/shairport.sh stop' );
			} else if ( G.status.player === 'bluetooth' ) {
				bash( [ 'bluetoothplayerstop' ] );
			} else if ( G.status.player === 'snapclient' ) {
				bash( '/srv/http/bash/snapcast.sh stop' );
			} else if ( G.status.player === 'spotify' ) {
				bash( '/srv/http/bash/spotifyd.sh stop' );
			} else if ( G.status.player === 'upnp' ) {
				bash( '/srv/http/bash/upmpdcli.sh stop' );
			}
			if ( G.status.player !== 'mpd' ) {
				banner( nameplayer[ G.status.player ], 'Stop ...', G.status.player +' blink', -1 );
				return
			}
			
			$( '#title' ).removeClass( 'gr' );
			if ( !G.status.playlistlength ) return
			
			bash( [ 'mpcplayback', 'stop' ] );
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
			var pllength = G.status.playlistlength;
			var song = G.status.song;
			if ( pllength < 2 ) return
			
			bash( [ 'mpcprevnext', cmd, song, pllength ] );
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
$( '#bio' ).on( 'click', '.closebio', function() {
	$( '#bio' ).addClass( 'hide' );
	displayBars();
} );
// LIBRARY /////////////////////////////////////////////////////////////////////////////////////
$( '#lib-breadcrumbs' ).on( 'click', 'a', function() {
	G.mode = 'file';
	if ( G.query.length > 1 ) G.scrolltop[ G.query[ G.query.length - 1 ].modetitle ] = $( window ).scrollTop();
	var path = $( this ).find( '.lidir' ).text();
	var query = {
		  query  : 'ls'
		, string : path
		, format : [ 'file' ]
	}
	query.gmode = G.mode;
	list( query, function( data ) {
		data.path = path;
		data.modetitle = path;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} );
$( '#lib-breadcrumbs' ).on( 'click', '.button-webradio-new', function() {
	webRadioNew();
} );
$( '#lib-breadcrumbs' ).on ( 'click', '#button-coverart', function() {
	if ( $( this ).find( 'img' ).length ) {
		var message = 'Update thumbnails and directory icons?'
	} else {
		var message = 'With existing album coverarts:'
					+'<br>  &bull; Create thumbnails'
					+'<br>  &bull; Create directory icons'
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
	if ( $( '#lib-path .lipath' ).text() === 'Webradio' ) return
	
	$( '#lib-path span, #button-lib-back, #button-lib-search' ).addClass( 'hide' );
	$( '#lib-search, #lib-search-btn' ).removeClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path' ).css( 'max-width', '40px' );
	$( '#lib-search-input' ).focus();
} );
$( '#lib-search-btn' ).click( function() { // search
	var keyword = $( '#lib-search-input' ).val();
	if ( !keyword ) {
		$( '#lib-search-close' ).click();
	} else {
		var query = {
			  query  : 'search'
			, string : keyword
		}
		query.gmode = G.mode;
		list( query, function( data ) {
			if ( data != -1 ) {
				data.modetitle = 'search';
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
		}, 'json' );
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
		list( query, function( data ) {
			data.path = query.path;
			data.modetitle = query.modetitle;
			renderLibraryList( data );
		}, 'json' );
	} else {
		$( '#button-library' ).click();
	}
} );
$( '#lib-search-input' ).keyup( function( e ) {
	if ( e.key === 'Enter' ) $( '#lib-search-btn' ).click();
} );
$( '#button-lib-back' ).click( function() {
	if ( G.gmode ) {
		G.mode = G.gmode;
		delete G.gmode;
	}
	$( '.menu' ).addClass( 'hide' );
	if ( G.query.length < 2 || G.mode === 'webradio' ) {
		$( '#button-library' ).click();
		return
	}
	
	if ( [ 'file', 'nas', 'sd', 'usb' ].indexOf( G.mode ) !== -1 && G.query[ 0 ] !== 'playlist' ) {
		if ( $( '#lib-breadcrumbs a' ).length > 1 ) {
			$( '#lib-breadcrumbs a' ).eq( -2 ).click();
		} else {
			$( '#button-library' ).click();
		}
	} else {
		G.query.pop();
		var query = G.query[ G.query.length - 1 ];
		if ( query === 'album' ) {
			$( '#mode-album' ).click();
		} else if ( query === 'playlist' ) {
			$( '#playlist' ).click();
		} else {
			list( query, function( data ) {
				if ( data != -1 ) {
					if ( G.mode === 'album' ) {
						data.path = 'ALBUM';
					} else {
						G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
						data.path = query.path;
					}
					data.modetitle = query.modetitle;
					renderLibraryList( data );
				} else {
					$( '#button-lib-back' ).click(); 
				}
			}, 'json' );
		}
	}
} );
$( '#lib-mode-list' ).contextmenu( function( e ) { // disable default image context menu
	e.preventDefault();
} );
$( '.mode' ).click( function() {
	G.mode = $( this ).data( 'mode' );
	$( '#lib-search-close' ).click();
	if ( !G.color && !G.status.counts[ G.mode ] && G.status.updating_db ) {
		infoUpdate();
		return
	}
	
	G.modescrolltop = $( window ).scrollTop();
	if ( G.mode === 'bookmark' ) return
	
	var path = G.mode.toUpperCase();
	// G.modes: sd, nas, usb, webradio, album, artist, albumartist, composer, conductor, genre
	// ( coverart, bookmark by other functions )
	if ( [ 'sd', 'nas', 'usb' ].indexOf( G.mode ) !== -1 ) { // browse by directory
		if ( !G.status.counts[ G.mode ] ) {
			infoNoData();
			return
		}
		
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	} else if ( G.mode === 'webradio' ) {
		var query = {
			  query  : 'webradio'
		}
	} else { // browse by modes
		var query = {
			  query  : 'list'
			, mode   : G.mode
			, format : [ G.mode ]
		}
	}
	query.gmode = G.mode;
	list( query, function( data ) {
		data.path = path;
		data.modetitle = path;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} );
$( '#lib-mode-list' ).click( function( e ) {
	if ( G.press || !G.bookmarkedit ) return
	
	if ( !$( e.target ).hasClass( 'bkedit' ) && !$( e.target ).hasClass( 'iconcover' ) ) {
		bookmarkeditClear();
		return
	}
} );
$( '#lib-mode-list' ).on( 'click', '.mode-bookmark', function( e ) { // delegate - id changed on renamed
	$( '#lib-search-close' ).click();
	if ( G.press || G.bookmarkedit ) return
	
	var path = $( this ).find( '.lipath' ).text();
	if ( G.bookmarkedit ) return
	
	var query = {
		  query  : 'ls'
		, string : path
		, format : [ 'file' ]
	}
	query.gmode = G.mode;
	list( query, function( data ) {
		data.path = path;
		data.modetitle = path;
		G.mode = 'file';
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} ).on( 'click', '.bk-remove', function() {
	var $this = $( this ).parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.bklabel' ).text() || path.split( '/' ).pop();
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
			G.bookmarkedit = 1;
			$.post( cmdphp, {
				  cmd    : 'bookmarkremove'
				, path   : path
				, delete : name
			} );
			$this.parent().remove();
		}
	} );
} ).on( 'click', '.bk-rename', function() {
	var $this = $( this ).parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.bklabel' ).text() || path.split( '/' ).pop();
	info( {
		  icon       : 'bookmark'
		, title      : 'Rename Bookmark'
		, message    : '<div class="infobookmark"><i class="fa fa-bookmark bookmark"></i>'
						+'<br><span class="bklabel">'+ name +'</span></div>'
		, textlabel  : 'To:'
		, values     : name
		, checkblank : 1
		, oklabel    : '<i class="fa fa-flash"></i>Rename'
		, ok         : function() {
			var newname = infoVal();
			$.post( cmdphp, {
				  cmd    : 'bookmarkrename'
				, path   : path
				, name   : name
				, rename : newname
			} );
			$this.find( '.bklabel' ).text( newname );
		}
	} );
} ).on( 'click', '.bk-cover .iconcover', function() {
	var $this = $( this ).parent().parent();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.bklabel' ).text() || path.split( '/' ).pop();
	var thumbnail = $this.find( 'img' ).length;
	if ( thumbnail ) {
		var icon = '<img class="imgold" src="'+ $this.find( 'img' ).attr( 'src' ) +'">'
				  +'<p class="infoimgname">'+ name +'</p>';
	} else {
		var icon = '<div class="infobookmark"><i class="fa fa-bookmark"></i><br><span class="bklabel">'+ $this.find( '.bklabel' ).text() +'</span></div>';
	}
	// [imagereplace]
	// select file
	//    - gif    > [file]   - no canvas
	//    - others > [base64] - data:image/jpeg;base64,...
	var imagefile = '/mnt/MPD/'+ path +'/coverart'; // no ext
	info( {
		  icon        : 'bookmark'
		, title       : 'Change Bookmark Thumbnail'
		, message     : icon
		, filelabel   : '<i class="fa fa-folder-open"></i> File'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, buttonlabel : !thumbnail ? '' : '<i class="fa fa-bookmark"></i>Default'
		, buttoncolor : !thumbnail ? '' : orange
		, button      : !thumbnail ? '' : function() {
			bash( [ 'bookmarkreset', path ] );
		}
		, ok          : function() {
			imageReplace( imagefile, 'bookmark' );
		}
	} );
} ).press( '.mode-bookmark', function() {
	if ( G.drag ) return
	
	G.bookmarkedit = 1;
	G.bklabel = $( this ).find( '.bklabel' );
	$( '.mode-bookmark' ).each( function() {
		var $this = $( this );
		var path = $this.find( '.lipath' ).text();
		var buttonhtml = '<i class="bkedit bk-remove fa fa-minus-circle"></i>';
		if ( !$this.find( 'img' ).length ) buttonhtml += '<i class="bkedit bk-rename fa fa-edit-circle"></i>';
		bash( [ 'coverexists', path ], function( cover ) {
			if ( !cover ) buttonhtml += '<div class="bkedit bk-cover"><i class="iconcover"></i></div>';
			$this.append( buttonhtml );
		} );
	} );
	$( '.mode-bookmark' )
		.css( 'background', 'hsl(0,0%,15%)' )
		.find( '.fa-bookmark, .bklabel, img' )
		.css( 'opacity', 0.33 );
} );
new Sortable( document.getElementById( 'lib-mode-list' ), {
	  ghostClass    : 'lib-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onStart       : function () {
		G.drag = 1;
		bookmarkeditClear();
	}
	, onEnd         : function () {
		G.drag = 0;
	}
	, onUpdate      : function () {
		var order = [];
		$( '.mode' ).each( function() {
			order.push( $( this ).find( '.lipath' ).text() );
		} );
		bash( [ 'ordersave', JSON.stringify( order ) ] );
	}
} );
$( '#lib-list' ).on( 'click', '.coverart', function() {
	if ( G.press ) return
	
	G.scrolltop[ 'ALBUM' ] = $( window ).scrollTop();
	var $this = $( this );
	var path = $this.find( '.lipath' ).text();
	var query = {
		  query  : 'ls'
		, format : [ 'file' ]
		, gmode  : 'file'
		, mode   : 'album'
		, string : path
	}
	list( query, function( data ) {
		data.modetitle = $this.find( G.display.albumbyartist ? '.coverart2' : '.coverart1' ).text();
		data.path = 'ALBUM';
		renderLibraryList( data );
	}, 'json' );
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
	var path = '/mnt/MPD/'+ lipath.substr( 0, lipath.lastIndexOf( '/' ) );
	if ( $this.hasClass( 'fa-save' ) ) {
		coverartSave();
	} else {
		coverartChange();
	}
} );
$( '#lib-list' ).press( '.licoverimg',  function( e ) {
	var $this = $( e.currentTarget );
	$this.parent().removeClass( 'active' );
	$( '#menu-album' ).addClass( 'hide' );
	$this.find( 'img' )
		.css( 'opacity', '0.33' )
		.after( icoveredit );
	$( '.menu' ).addClass( 'hide' );
} );
$( '#lib-list' ).on( 'click', 'li', function( e ) {
	if ( G.press ) return
	
	if ( $( '.licover .coveredit.cover' ).length ) {
		$( '.licover .coveredit.cover' ).remove();
		$( '.licover img' ).css( 'opacity', '' );
		return
	}
	var $this = $( this );
	var $target = $( e.target );
	if ( $target.hasClass( 'fa-save' ) || $target.hasClass( '.coverart' ) ) return
	
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	if ( $target.hasClass( 'lib-icon' ) || $target.hasClass( 'licoverimg' ) ) {
		if ( $this.hasClass( 'active' ) && menushow ) {
			$( '.menu' ).addClass( 'hide' );
		} else {
			$( '#lib-list li' ).removeClass( 'active' );
			contextmenuLibrary( $this, $target );
		}
		return
	}
	
	$( '.menu' ).addClass( 'hide' );
	if ( menushow ) return
	
	$( '#lib-list li' ).removeClass( 'active' );
	if ( $target.hasClass( 'bkedit' ) ) return
	
	if ( $( '.bkedit' ).length ) {
		$( '.bkedit' ).remove();
		$( '.licoverimg img' ).css( 'opacity', '' );
		if ( $( this ).is( '.licover' ) ) return
	}
	
	if ( $this.hasClass( 'licover' ) ) {
		if ( $target.is( '.liartist, .fa-artist, .fa-albumartist, .licomposer, .fa-composer' ) ) {
			var name = ( $target.is( '.licomposer, .fa-composer' ) ) ? $this.find( '.licomposer' ).text() : $this.find( '.liartist' ).text();
			getBio( name );
		} else if ( $target.is( '.liinfopath' ) ) {
			G.gmode = G.mode;
			G.mode = 'file';
			var path = $target.text();
			var query = {
				  query  : 'ls'
				, string : path
				, format : [ 'file' ]
			}
			query.gmode = G.mode;
			list( query, function( data ) {
				data.path = path;
				data.modetitle = path;
				renderLibraryList( data );
			}, 'json' );
			G.query.push( query );
		}
		return
	} else if ( $target.hasClass( 'lialbum' ) ) {
		window.open( 'https://www.last.fm/music/'+ $this.find( '.liartist' ).text() +'/'+ $this.find( '.lialbum' ).text(), '_blank' );
		return
	} else if ( $this.find( '.fa-music' ).length || G.mode === 'webradio' || $target.data( 'target' ) ) {
		contextmenuLibrary( $this, $target );
		return
	}
	
	$this.addClass( 'active' );
	var libpath = $( '#lib-path .lipath' ).text();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.liname' ).text();
	var mode = $( this ).data( 'mode' );
	// modes: file, sd, nas, usb, webradio, album, artist, albumartist, composer, conductor, genre
	if ( [ 'file', 'sd', 'nas', 'usb' ].indexOf( mode ) !== -1 ) { // list by directory
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
		var modetitle = path;
	} else if ( mode !== 'album' ) { // list by mode (non-album)
		if ( [ 'genre', 'composer', 'date' ].indexOf( G.mode ) !== -1 ) {
			var format = [ 'album', 'artist' ];
		} else if ( G.mode === 'conductor' ) {
			var format = [ 'album', 'conductor' ];
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
	list( query, function( data ) {
		data.path = path;
		data.modetitle = modetitle;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = modetitle;
	G.query.push( query );
} );
$( '.index' ).on( 'click', 'a', function() {
	var index = $( this ).find( 'wh' ).text()[ 0 ];
	if ( !index ) return
	
	if ( index === '#' ) {
		var scrollT = 0;
	} else {
		if ( G.library ) {
			var el = G.mode === 'album' ? '.coverart' : '#lib-list li';
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
$( '#button-pl-back' ).click( function() {
	$( '.menu' ).addClass( 'hide' );
	if ( G.savedplaylist ) {
		$( '#button-pl-open' ).click();
	} else {
		getPlaylist();
	}
} );
$( '#button-pl-open' ).click( function() {
	G.savedlist = 1;
	G.savedplaylist = 0;
	renderPlaylistList();
} );
$( '#button-pl-save' ).click( function() {
	var audiocdL = $( '#pl-list .fa-audiocd' ).length;
	var upnpL = $( '#pl-list .fa-upnp' ).length;
	var notsavedL = $( '#pl-list .notsaved' ).length;
	if ( audiocdL || upnpL ) {
		info( {
			  icon    : 'playlist'
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
		banner( 'Roll The Dice', 'Off ...', 'dice' );
		bash( [ 'librandom', false ] );
	} else {
		info( {
			  icon    : 'dice'
			, title   : 'Roll The Dice'
			, message : 'Randomly add songs and play continuously?'
			, ok      : function() {
				G.status.librandom = true;
				$this.addClass( 'bl' );
				banner( 'Roll The Dice', 'Add+play ...', 'dice' );
				bash( [ 'librandom', true ] );
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
	if ( G.plremove ) {
		G.plremove = 0;
		getPlaybackStatus();
		return
	}
	
	if ( G.status.playlistlength === 1 ) {
		info( {
			  icon        : 'playlist'
			, title       : 'Clear Playlist'
			, oklabel     : '<i class="fa fa-minus-circle"></i>Clear'
			, okcolor     : red
			, ok          : function() {
				bash( [ 'plremove' ] );
				setPlaybackBlank();
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
					G.plremove = 1;
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
		G.sortable = 1;
		setTimeout( function() { G.sortable = 0 }, 500 );
		bash( [ 'plorder', ( e.oldIndex + 1 ), ( e.newIndex + 1 ) ], function() {
			setTimeout( setPlaylistScroll, 600 );
		} );
	}
} );
new Sortable( document.getElementById( 'pl-savedlist' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onUpdate      : function ( e ) {
		if ( !$( '#pl-path .lipath' ).length ) return
		G.sortable = 1;
		setTimeout( function() { G.sortable = 0 }, 500 );
		
		var plname = $( '#pl-path .lipath' ).text();
		list( {
			  cmd  : 'edit'
			, name : plname
			, old  : e.oldIndex
			, new  : e.newIndex
		} );
	}
} );
$( '#pl-list' ).on( 'click', 'li', function( e ) {
	$target = $( e.target );
	if ( G.plremove ) {
		if ( !$target.hasClass( 'pl-remove' ) ) {
			G.plremove = 0;
			getPlaybackStatus();
		}
		return
	}
	
	if ( G.swipe || $target.hasClass( 'pl-icon' ) || $target.hasClass( 'fa-save' ) ) return
	
	var $this = $( this );
	if ( [ 'mpd', 'upnp' ].indexOf( G.status.player ) === -1 ) {
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
		$liactive.find( '.elapsed' ).empty();
		$( '#pl-list li.active, #playback-controls .btn' ).removeClass( 'active' );
		$this.add( '#play' ).addClass( 'active' );
	}
} ).on( 'click', '.savewr', function() {
	G.list.li = $( this ).parent();
	webRadioSave( $( this ).next().next().text() );
	$( '.contextmenu' ).addClass( 'hide' );
} ).on( 'click', '.pl-icon', function() {
	var $this = $( this );
	var $thisli = $this.parent();
	G.list = {};
	G.list.li = $thisli;
	G.list.path = $thisli.find( '.lipath' ).text();
	G.list.artist = $thisli.find( '.artist' ).text();
	G.list.name = $thisli.find( '.name' ).text();
	G.list.index = $thisli.index();
	var menutop = ( $thisli.position().top + 48 ) +'px';
	var $menu = $( '#menu-plaction' );
	$( '#pl-list li' ).removeClass( 'updn' );
	$thisli.addClass( 'updn' );
	if ( !$menu.hasClass( 'hide' ) && $menu.css( 'top' ) === menutop ) {
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
	$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp );
	$menu.find( '.similar, .submenu' ).toggleClass( 'hide', radio );
	$menu.find( '.tag' ).toggleClass( 'hide', audiocd || radio || upnp );
	$menu.find( '.tagcd' ).toggleClass( 'hide', !audiocd );
	$menu.find( '.wrsave' ).toggleClass( 'hide', !notsaved );
	contextmenuScroll( $menu, menutop );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	plRemove( $( this ).parent() );
} );
$( '#pl-savedlist' ).on( 'click', 'li', function( e ) {
	$( '.menu' ).addClass( 'hide' );
	var $target = $( e.target );
	if ( G.swipe || $target.hasClass( 'savewr' ) ) return
	
	$this = $( this );
	if ( $this.hasClass( 'active' ) && $( '.contextmenu:not( .hide )' ).length ) return
	
	var pladd = Object.keys( G.pladd ).length;
	var plicon = $target.hasClass( 'pl-icon' );
	if ( G.savedplaylist || plicon ) {
		if ( !pladd ) {
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
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', !G.status.playlistlength );
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
				
				$( '.replace' ).toggleClass( 'hide', !G.status.playlistlength );
				$( '.similar' ).toggleClass( 'hide', G.list.path.slice( 0, 4 ) === 'http' );
				$menu.find( '.wrsave' ).toggleClass( 'hide', !$this.hasClass( 'notsaved' ) );
			}
			$this.addClass( 'active' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
			var menutop = ( $this.position().top + 48 ) +'px';
			contextmenuScroll( $menu, menutop );
		} else {
			playlistInsertSelect( $this );
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
	$( '.contextmenu' ).addClass( 'hide' );
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
