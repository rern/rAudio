C = {}; // counts
D = {}; // display
O = []; // order
S = {}; // status
V = {   // var global
	  apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : 'd666cd06ec4fcf84c3b86279831a1c8e'
	, sharedsecret  : '390372d3a1f60d4030e2a612260060e0'
	, bioartist     : []
	, blinkdot      : '<a class="dot dot1">·</a>&ensp;<a class="dot dot2">·</a>&ensp;<a class="dot dot3">·</a>'
	, coverart      : '/assets/img/coverart.svg'
	, icoveredit    : '<div class="coveredit cover-change">'+ ico( 'coverart' ) +'</div>'
	, icoversave    : '<div class="coveredit cover-save">'+ ico( 'save' ) +'</div>'
	, covervu       : '/assets/img/vu.svg'
	, guide         : false
	, library       : false
	, librarylist   : false
	, list          : {}
	, local         : false
	, lyrics        : ''
	, lyricsArtist  : ''
	, lyricsTitle   : ''
	, mode          : ''
	, modescrolltop : 0
	, page          : 'playback'
	, pladd         : {}
	, playback      : true
	, playlist      : false
	, query         : []
	, rotate        : 0
	, savedlist     : false
	, savedplaylist : false
	, scrollspeed   : 80 // pixel/s
	, scrolltop     : {}
	, similarpl     : -1
	, status        : {}
	, wH            : window.innerHeight
	, wW            : window.innerWidth
}
var $bartop     = $( '#bar-top' );
var $time       = $( '#time-knob' );
var $volume     = $( '#volume-knob' );
var data        = {}
var picaOption  = { // pica.js
	  unsharpAmount    : 100  // 0...500 Default = 0 (try 50-100)
	, unsharpThreshold : 5    // 0...100 Default = 0 (try 10)
	, unsharpRadius    : 0.6
//	, quality          : 3    // 0...3 Default = 3 (Lanczos win=3)
//	, alpha            : true // Default = false (black crop background)
};
// color icon
$( '.submenu.i-color' ).html( '<canvas></canvas>' );
var canvas      = $( '.submenu.i-color canvas' )[ 0 ];
var ctx         = canvas.getContext( '2d' );
var cw          = canvas.width / 2;
var ch          = canvas.height / 2;
for( i = 0; i < 360; i += 0.25 ) {
	var rad         = i * Math.PI / 180;
	ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
	ctx.beginPath();
	ctx.moveTo( cw, ch );
	ctx.lineTo( cw + cw * Math.cos( rad ), ch + ch * Math.sin( rad ) );
	ctx.stroke();
}
var pagenext    = {
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

if ( navigator.maxTouchPoints ) { // swipeleft / right ////////////////////////////////
	var xstart;
	window.addEventListener( 'touchstart', function( e ) {
		var $target = $( e.target );
		if ( D.noswipe
			|| [ 'time-band', 'time-knob', 'volume-band', 'volume-knob' ].includes( e.target.id )
			|| $target.parents( '#time-knob' ).length
			|| $target.parents( '#volume-knob' ).length
			|| ! $( '#bio' ).hasClass( 'hide' )
			|| I.active
			|| ! $( '#data' ).hasClass( 'hide' )
		) return
		
		xstart = e.changedTouches[ 0 ].pageX;
	} );
	window.addEventListener( 'touchend', function( e ) {
		if ( ! xstart ) return
		
		var diff = xstart - e.changedTouches[ 0 ].pageX;
		if ( Math.abs( diff ) > 100 ) $( '#'+ pagenext[ V.page ][ diff > 0 ? 1 : 0 ] ).click();
		xstart = false;
	} );
	$( '#hovercursor, #shortcut' ).remove();
}
	
$( 'body' ).click( function( e ) {
	if ( I.active || V.colorpicker ) return
	
	var $target = $( e.target );
	if ( ! $target.is( '.bkcoverart, .bkradio, .savedlist' ) ) menuHide();
	if ( ! V.local && $( '.pl-remove' ).length && ! $target.hasClass( 'pl-remove' ) ) $( '.pl-remove' ).remove();
} );
$( '#page-library' ).on( 'click', 'p', function() {
	$( '.licover .cover-change' ).remove();
	$( '.licover img' ).css( 'opacity', '' );
	$( '#lib-list li' ).removeClass( 'active' );
	if ( ! $( '#lib-search-input' ).val() ) $( '#lib-search-close' ).click();
} );
$( '#page-playback' ).click( function( e ) {
	if ( V.press
		|| [ 'coverT', 'timeT', 'volume-bar', 'volume-band', 'volume-band-dn', 'volume-band-up' ].includes( e.target.id ) ) return
	
	if ( V.guide ) hideGuide();
	if ( $( '#divcover .coveredit' ).length ) {
		if ( ! $( e.target ).hasClass( 'coveredit' ) ) {
			$( '#divcover .cover-change' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
	}
} );
$( '#page-playlist' ).on( 'click', 'p', function() {
	if ( V.savedlist || V.savedplaylist ) return
	
	$( '#pl-savedlist li' ).removeClass( 'active' );
	$( '#pl-list li' ).removeClass( 'updn' );
	$( '#pl-list .name' ).css( 'max-width', '' );
	if ( ! $( '#pl-search-input' ).val() ) $( '#pl-search-close' ).click();
} );
$( '.page' ).contextmenu( function( e ) { // touch device - on press - disable default context menu
	e.preventDefault();
	e.stopPropagation();
    e.stopImmediatePropagation();
	return false
} );
$( '#loader' ).click( function() {
	loaderHide();
} );
$( '#coverart' ).on( 'load', function() {
	if ( ! S.stream && S.player === 'mpd' && S.coverart.slice( 0, 16 ) === '/data/shm/online' ) {
		$( '#coverart' ).after( V.icoversave );
	} else {
		$( '#divcover .coveredit' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
	}
	if ( ( V.wW - $( '#divcover' ).width() ) < 80 ) {
		$( '#volume-band-dn' ).css( 'left', 0 );
		$( '#volume-band-up' ).css( 'right', 0 );
	} else {
		$( '#volume-band-dn' ).css( 'left', '' );
		$( '#volume-band-up' ).css( 'right', '' );
	}
	loaderHide();
} ).on( 'error', coverartDefault );

// COMMON /////////////////////////////////////////////////////////////////////////////////////
$( '#logo, #button-library, #button-playlist, #refresh' ).press( function() {
	location.reload();
} );
$( '#logo, #refresh' ).click( function() {
	if ( ! localhost ) window.open( 'https://github.com/rern/rAudio-1/discussions' );
} );
$( '#status' ).click( function() {
	$( '#data' ).html( highlightJSON( S ) )
	$( '#button-data, #data' ).removeClass( 'hide' );
	$( '.page' ).addClass( 'hide' );
} );
$( '#button-data' ).click( function() {
	$( '#page-'+ V.page ).removeClass( 'hide' );
	$( '#button-data, #data' ).addClass( 'hide' );
} );
$( '#button-settings' ).click( function( e ) {
	e.stopPropagation();
	if ( $( '#settings' ).hasClass( 'hide' ) ) {
		menuHide();
		$( '#settings' )
			.css( 'top', ( $bartop.is( ':visible' ) ? 40 : 0 ) )
			.css( 'pointer-events', 'none' ) // suppress coverTR tap on show
			.removeClass( 'hide' );
		setTimeout( () => $( '#settings' ).css( 'pointer-events', '' ), 300 );
	} else {
		$( '#settings' ).addClass( 'hide' );
	}
} )
$( '.settings' ).click( function() {
	location.href = 'settings.php?p='+ this.id;
} );
$( '#settings' ).on( 'click', '.submenu', function() {
	switch ( this.id ) {
		case 'dsp':
			if ( $( this ).hasClass( 'i-camilladsp' ) ) {
				bash( [ 'camillagui' ], () => urlReachable( 'http://'+ location.host +':5005' ) );
				loader();
			} else {
				equalizer();
			}
			break;
		case 'logout':
			$.post( 'cmd.php', { cmd: 'logout' }, () => location.reload() );
			break;
		case 'snapclient':
			var active = $( this ).hasClass( 'on' );
			if ( active ) {
				if ( S.snapclient ) {
					bash( dirbash +'snapcast.sh stop' );
				} else {
					$( '#stop' ).click();
				}
			} else {
				$( '#stop' ).click();
				bash( dirbash +'snapcast.sh start', data => {
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
			banner( 'snapcast blink', 'Snapcast', ( active ? 'Disconnect ...' : 'Connect ...' ), -1 );
			break;
		case 'relays':
			$( '#stop' ).click();
			bash( dirsettings +'relays.sh '+ ! S.relayson );
			break;
		case 'guide':
			location.href = 'settings.php?p=guide';
			break;
		case 'screenoff':
			bash( [ 'screenoff', 'dpms force off' ] );
			V.screenoff = true;
			break;
		case 'update':
			infoUpdate( '' );
			break;
		case 'displaycolor':
			V.color = true;
			if ( V.library ) {
				V.librarylist ? colorSet() : $( '#mode-webradio' ).click();
			} else if ( V.playlist && S.pllength ) {
				colorSet();
			} else {
				$( '#library' ).click();
			}
			break;
		case 'multiraudio':
			bash( [ 'multiraudiolist' ], data => {
				info( {
					  icon       : 'multiraudio'
					, title      : 'Switch rAudio'
					, radio      : data.list
					, values     : data.current
					, beforeshow : function() {
						$( '#infoContent input' ).change( function() {
							var ip = infoVal();
							if ( typeof Android === 'object' ) Android.changeIP( ip );
							loader();
							location.href = 'http://'+ ip;
						} );
					}
					, okno       : true
				} );
			}, 'json' );
			break;
	}
} );
$( '#power' ).click( infoPower );
$( '#displaylibrary' ).click( infoLibrary );
$( '#displayplayback' ).click( function() {
	var vumeter     = '<img class="imgicon" src="'+ V.covervu +'"> ';
	var chkplayback = {
		  bars             : 'Top-Bottom bars'
			, barsalways   : 'Bars always on'
		, time             : 'Time'
			, radioelapsed : 'Web Radio time'
		, cover            : 'Cover art'
			, covervu      : vumeter +'As default'
		, volume           : 'Volume'
			, vumeter      : vumeter +'VU meter'
		, buttons          : 'Buttons'
			, noswipe      : 'Disable swipe'
	}
	if ( 'coverTL' in V ) $( '#coverTL' ).click();
	var keys   = Object.keys( chkplayback );
	var values = [];
	keys.forEach( k => values.push( D[ k ] ) );
	info( {
		  icon         : 'playback'
		, title        : 'Playback'
		, message      : 'Show:<span style="margin-left: 117px">Options:</span>'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplayback )
		, checkcolumn  : true
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			var $chk = $( '#infoContent input' );
			var $el  = {}
			keys.forEach( ( k, i ) => $el[ k ] = $chk.eq( i ) );
			function restoreEnabled() {
				var list = [ 'time', 'cover', 'covervu', 'vumeter', 'volume' ];
				if ( D.volumenone ) list.pop();
				list.forEach( el => $el[ el ].prop( 'disabled', false ) );
			}
			function tcvValue() {
				return {
					  time   : $el.time.prop( 'checked' )
					, cover  : $el.cover.prop( 'checked' )
					, volume : $el.volume.prop( 'checked' )
				}
			}
			if ( D.volumenone ) $el.volume.prop( 'disabled', true );
			$el.bars.change( function() {
				if ( $( this ).prop( 'checked' ) ) {
					$el.barsalways.prop( 'disabled', false );
				} else {
					$el.barsalways
						.prop( 'checked', false )
						.prop( 'disabled', true );
				}
			} );
			$el.time.change( function() {
				var tcv = tcvValue();
				if ( ! tcv.time ) {
					if ( tcv.cover ) {
						if ( ! tcv.volume ) $el.cover.prop( 'disabled', true );
					} else {
						$el.volume.prop( 'disabled', true );
					}
				} else {
					restoreEnabled();
				}
			} );
			$el.cover.change( function() {
				var tcv = tcvValue();
				if ( ! tcv.cover ) {
					if ( tcv.time ) {
						if ( ! tcv.volume ) $el.time.prop( 'disabled', true );
					} else {
						$el.volume.prop( 'disabled', true );
					}
					[ 'covervu', 'vumeter' ].forEach( el => {
						$el[ el ]
							.prop( 'checked', false )
							.prop( 'disabled', true );
					} );				} else {
					restoreEnabled();
				}
			} );
			$el.volume.change( function() {
				var tcv = tcvValue();
				if ( ! tcv.volume ) {
					if ( tcv.cover ) {
						if ( ! tcv.time ) $el.cover.prop( 'disabled', true );
					} else {
						$el.time.prop( 'disabled', true );
					}
				} else {
					restoreEnabled();
				}
			} );
			$el.covervu.change( function() {
				if ( $( this ).prop( 'checked' ) ) $el.vumeter.prop( 'checked', false );
			} );
			$el.vumeter.change( function() {
				if ( $( this ).prop( 'checked' ) ) $el.covervu.prop( 'checked', false );
			} );
		}
		, ok           : () => displaySave( keys )
	} );
} );
$( '#displayplaylist' ).click( function() {
	var chkplaylist = {
		  plclear        : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'replace' ) +'Replace'+ ico( 'play-replace sub' ) + '<a>'
		, plsimilar      : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'lastfm' ) +'Add similar</a>'
		, audiocdplclear : 'Clear on '+ ico( 'audiocd' ) +'Audio CD load'
	}
	if ( 'coverTL' in V ) $( '#coverTL' ).click();
	var keys   = Object.keys( chkplaylist );
	var values = [];
	keys.forEach( k => values.push( D[ k ] ) );
	info( {
		  icon         : 'playlist'
		, title        : 'Playlist'
		, message      : 'Options:'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplaylist )
		, values       : values
		, checkchanged : true
		, ok           : () => displaySave( keys )
	} );
} );
$( 'body' ).on( 'click', '#colorok', function() {
	var hsv = V.colorpicker.getCurColorHsv(); // hsv = { h: N, s: N, v: N } N = 0-1
	var s   = hsv.s;
	var v   = hsv.v;
	var L   = ( 2 - s ) * v / 2;
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
} ).on( 'click', '#colorreset', function() {
	info( {
		  icon    : 'gear'
		, title   : 'Colors'
		, message : 'Reset colors to default?'
		, ok      : () => {
			bash( [ 'color', 'reset' ] );
			loader();
		}
	} );
} ).on( 'click', '#colorcancel', function() {
	$( '#colorpicker' ).remove();
	V.colorpicker.destroy();
	V.colorpicker   = false;
	V.colorelements.removeAttr( 'style' );
	V.colorelements = '';
	if ( V.playlist && ! V.savedlist && ! V.savedplaylist) setPlaylistScroll();
	if ( S.player !== 'mpd' ) switchPage( 'playback' );
} );
$( '#library, #button-library' ).click( function() {
	if ( V.library && V.librarylist ) {
		libraryHome();
	} else {
		switchPage( 'library' );
		refreshData();
	}
} );
$( '#playback' ).click( function() {
	if ( V.playback && ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).click();
	} else {
		getPlaybackStatus();
		switchPage( 'playback' );
	}
} );
$( '#playlist, #button-playlist' ).click( function() {
	if ( ! V.local ) V.pladd = {}
	var savedpl = V.savedlist || V.savedplaylist;
	if ( V.playlist ) {
		if ( savedpl ) getPlaylist();
	} else {
		savedpl ? switchPage( 'playlist' ) : getPlaylist(); // switchPage( 'playlist' ) in setPlaylistScroll()
	}
} );
$( '#bar-top, #bar-bottom, #page-library' ).click( function() {
	if ( V.guide ) hideGuide();
} );
$( '#bar-top' ).click( function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide' );
} );
$( '#settings' ).click( function() {
	$( this ).addClass( 'hide' );
} );
// PLAYBACK /////////////////////////////////////////////////////////////////////////////////////
$( '#info' ).click( function() {
	if ( localhost ) setInfoScroll();
} );
$( '.emptyadd' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'i-plus-circle' ) ) {
		$( '#library' ).click();
	} else if ( $( e.target ).hasClass( 'i-gear' ) ) {
		$( '#button-settings' ).click();
	}
} );
$( '#artist, #guide-bio' ).click( function() {
	if ( $( '#bio legend' ).text() != S.Artist ) {
		getBio( $( '#artist' ).text() );
	} else {
		$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
		$( '#bio' ).removeClass( 'hide' );
	}
} );
$( '#title, #guide-lyrics' ).click( function() {
	var artist = $( '#artist' ).text();
	var title  = $( '#title' ).text();
	var album  = $( '#album' ).text();
	if ( album.includes( '://' ) ) album = '';
	if ( V.lyrics
		&& ! S.webradio
		&& artist === $( '#lyricsartist' ).text()
		&& title === $( '#lyricstitle' ).text()
	) {
		lyricsShow( 'current' );
		return
	}
	
	artist  = artist.replace( /(["`])/g, '\\$1' );
	title   = title.replace( /(["`])/g, '\\$1' );
	file    = S.player === 'mpd' ? '/mnt/MPD/'+ S.file : '';
	var src = $( '#coverart' ).attr( 'src' );
	V.lyricsCover = src.slice( 0, 7 ) === '/asses' ? '' : src;
	var noparen      = title.slice( -1 ) !== ')';
	var titlenoparen = title.replace( / $|\(.*$/, '' );
	var paren        = title.replace( /^.*\(/, '(' );
	var content      = `\
<table>
<tr><td>${ ico( 'artist wh' ) }</td><td><input class="required" type="text"></td></tr>
<tr><td>${ ico( 'music wh' ) }</td><td><input class="required" type="text"></td></tr>
<tr class="album"><td>${ ico( 'album wh' ) }</td><td><input type="text"></td></tr>
<tr id="paren"><td></td><td><label><input type="checkbox"><gr>Title includes:</gr>&emsp;${ paren }</label></td></tr>
<tr style="height: 10px;"></tr>
<tr><td colspan="2" class="btnbottom">
	<span class="lyrics">${ ico( 'lyrics' ) } Lyrics</span>
	<span class="bio">&emsp;${ ico( 'bio' ) } Bio</span>
	<span class="pladd">&emsp;${ ico( 'file-playlist' ) } Add</span>
	<span class="scrobble">&emsp;${ ico( 'lastfm' ) } Scrobble</span>
	</td></tr>
</table>`;
	info( {
		  icon        : 'Music'
		, title       : 'Track'
		, content     : content
		, boxwidth    : 320
		, values      : noparen ? [ artist, title, album ] : [ artist, titlenoparen, album ]
		, beforeshow  : () => {
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
			$( '#infoContent .pladd' ).toggleClass( 'hide', S.player !== 'mpd' );
			$( '#infoContent .scrobble' ).toggleClass( 'hide', ! S.scrobble || ! S.webradio );
			$( '#infoContent' ).on( 'click', '.btnbottom span', function() {
				var values = infoVal();
				var artist = values[ 0 ]
				var title  = values[ 1 ]
				var $this  = $( this );
				if ( $this.hasClass( 'lyrics' ) ) {
					V.lyricsArtist = artist;
					V.lyricsTitle  = title;
					bash( [ 'lyrics', artist, title, file ], data => {
						lyricsShow( data );
					} );
					banner( 'search blink', 'Lyrics', 'Fetch ...', 20000 );
				} else if ( $this.hasClass( 'bio' ) ) {
					if ( $( '#bio legend' ).text() != S.Artist ) {
						getBio( artist );
					} else {
						$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
						$( '#bio' ).removeClass( 'hide' );
					}
				} else if ( $this.hasClass( 'pladd' ) ) {
					saveToPlaylist( S.Title, S.Album, S.file );
				} else if ( $this.hasClass( 'scrobble' ) ) {
					bash( [ 'scrobble', ...values ] );
					banner( 'lastfm blink', 'Scrobble', 'Send ...' );
				}
				$( '#infoX' ).click();
			} );
		}
		, okno        : true
	} );
} );
$( '#album, #guide-album' ).click( function() {
	if ( ! localhost ) window.open( 'https://www.last.fm/music/'+ $( '#artist' ).text() +'/'+ $( '#album' ).text(), '_blank' );
} );
$( '#infoicon' ).on( 'click', '.i-audiocd', function() {
	info( {
		  icon    : 'audiocd'
		, title   : 'Audio CD'
		, oklabel : ico( 'minus-circle' ) +'Eject'
		, okcolor : red
		, ok      : () => bash( dirbash +'audiocd.sh ejecticonclick' )
	} );
} );
$( '#elapsed' ).click( function() {
	S.state === 'play' ? $( '#pause' ).click() : $( '#play' ).click();
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
		$timeRS       = this;
		$timeprogress = $( '#time .rs-transition, #time-bar' );
	}
	, start       : function () { // drag start
		V.drag = true;
		clearIntervalAll();
		$( '.map' ).removeClass( 'mapshow' );
		if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
	}
	, drag        : function ( e ) { // drag with no transition by default
		$( '#elapsed' ).text( second2HMS( e.value ) );
	}
	, change      : function( e ) { // not fire on 'setValue'
		clearIntervalAll();
		mpcSeek( e.value );
	}
	, stop        : function() {
		V.drag = false;
	}
} );
$( '#time-band' ).on( 'touchstart mousedown', function() {
	if ( S.player !== 'mpd' || S.stream ) return
	
	V.start = true;
	hideGuide();
	clearIntervalAll();
	if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.start ) return
	
	V.drag = true;
	mpcSeekBar( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.start ) return
	
	V.start = V.drag = false;
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
		V.create       = true;
		$volumeRS      = this;
		$volumetooltip = $( '#volume .rs-tooltip' );
		$volumehandle  = $( '#volume .rs-handle' );
		$volumehandlerotate = $( '#volume .rs-transition, #volume .rs-handle' );
	}
	, start             : function( e ) {
		V.drag = true;
		if ( e.value === 0 ) volumeColorUnmute(); // restore handle color immediately on start drag
		$( '.map' ).removeClass( 'mapshow' );
	}
	, beforeValueChange : function( e ) {
		if ( V.local || V.drag ) return
		
		var diff  = e.value - S.volume || S.volume - S.volumemute; // change || mute/unmute
		var speed = Math.round( Math.abs( diff ) / 5 * 0.2 * 10 ) / 10; // @5 0.2s > round 1 digit: * 10 / 10
		$volumehandlerotate.css( 'transition-duration', speed +'s' );
		setTimeout( () => $volumehandlerotate.css( 'transition-duration','' ), speed * 1000 + 500 );
	}
	, drag              : function( e ) {
		S.volume = e.value;
		$volumehandle.rsRotate( - this._handle1.angle );
		bash( [ 'volume', 'drag', e.value, S.card, S.control ] );
	}
	, change            : function( e ) {
		if ( V.drag ) return
		
		$( '#volume-knob, #button-volume i' ).addClass( 'disabled' );
		bash( [ 'volume', S.volume, e.value, S.card, S.control ] );
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, valueChange       : function( e ) {
		if ( V.drag || ! V.create ) return // ! V.create - suppress fire before 'create'
		
		S.volume = e.value;
		$volumehandle.rsRotate( - this._handle1.angle );
	}
	, stop              : function() {
		V.drag = false;
		bash( [ 'volumepushstream' ] );
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	hideGuide();
	clearTimeout( V.volumebar );
	if ( S.volumenone || $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	V.start = true;
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.start ) return
	
	V.drag = true;
	volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) {
		volumeBarShow();
		return
	}
	
	if ( ! V.start ) return
	
	V.start = V.drag = false;
	volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
} );
$( '#volmute, #volM' ).click( function() {
	$( '#volume-knob, #button-volume i' ).addClass( 'disabled' );
	bash( [ 'volume' ] );
} );
$( '#volup, #voldn, #volT, #volB, #volL, #volR' ).click( function( e ) {
	var voldn = [ 'voldn', 'volB', 'volL' ].includes( e.currentTarget.id );
	if ( ( S.volume === 0 && voldn ) || ( S.volume === 100 && ! voldn ) ) return
	
	bash( [ 'volumeupdown', voldn ? '-' : '+', S.card, S.control ] );
} ).on( 'touchend mouseup mouseleave', function() {
	if ( V.volhold ) {
		V.volhold = false;
		clearInterval( V.intVolume );
		bash( [ 'volumepushstream' ] );
	}
} ).press( function( e ) {
	V.volhold = true;
	var voldn = e.currentTarget.id === 'voldn';
	var voldn = [ 'voldn', 'volB', 'volL' ].includes( e.currentTarget.id );
	var vol   = S.volume;
	if ( ( vol === 0 && voldn ) || ( vol === 100 && ! voldn ) ) return
	
	V.intVolume = setInterval( () => {
		if ( ( vol === 0 && voldn ) || ( vol === 100 && ! voldn ) ) return
		
		voldn ? vol-- : vol++;
		$volumeRS.setValue( vol );
		bash( [ 'volume', 'drag', vol, S.card, S.control ] );
	}, 100 );
} );
$( '#volume-band-dn, #volume-band-up' ).click( function() {
	hideGuide();
	if ( S.volumenone ) return
	
	var updn = this.id.slice( -2 );
	var vol = S.volume;
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
	clearTimeout( V.intVolume );
	clearTimeout( V.volumebar );
	setTimeout( volumeBarHide, 3000 );
} ).press( function( e ) {
	if ( S.volumenone ) return
	
	clearTimeout( V.volumebar );
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	var voldn = e.currentTarget.id === 'volume-band-dn';
	var vol   = S.volume;
	if ( ( vol === 0 && voldn ) || ( vol === 100 && ! voldn ) ) return
	
	V.intVolume = setInterval( () => {
		if ( ( vol === 0 && voldn ) || ( vol === 100 && ! voldn ) ) return
		
		voldn ? vol-- : vol++;
		S.volume = vol;
		$( '#volume-text' ).text( vol );
		$( '#volume-bar' ).css( 'width', vol +'%' );
		bash( [ 'volume', 'drag', vol, S.card, S.control ] );
	}, 100 );
} );
$( '#volume-text' ).click( function() { // mute / unmute
	clearTimeout( V.volumebar );
	volumeBarSet( 'toggle' );
} );
$( '#divcover' ).press( function( e ) {
	if (
		( S.stream && S.state === 'play' )
		|| ! S.pllength
		|| V.guide
		|| $( e.target ).hasClass( 'band' )
		|| e.target.id === 'coverT'
	) return
	
	$( '#coverart' )
		.css( 'opacity', 0.33 )
		.after( V.icoveredit );
} ).on( 'click', '.cover-save', function() {
	coverartSave();
} ).on( 'click', '.cover-change', function() {
	S.webradio ? webRadioCoverart() : coverartChange();
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
$( '.map' ).click( function( e ) {
	e.stopPropagation();
	if ( V.press ) return
	
	if ( $( '#info' ).hasClass( 'hide' ) ) {
		$( '#info' ).removeClass( 'hide' );
		clearTimeout( V.volumebar );
		volumeBarHide();
		return
		
	} else if ( $( '#divcover .cover-change' ).length ) {
		$( '#divcover .cover-change' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
		return
		
	} else if ( 'screenoff' in V ) {
		delete V.screenoff;
		return
	}
	
	var cmd = btnctrl[ this.id ];
	if ( cmd === 'guide' ) {
		clearTimeout( V.volumebar );
		if ( V.guide ) {
			hideGuide();
			return
		}
		
		V.guide    = true;
		var time   = $time.is( ':visible' );
		var volume = $volume.is( ':visible' );
		$( '#coverTR' ).removeClass( 'empty' );
		$( '.mapcover, .guide' ).addClass( 'mapshow' );
		$( '.guide' ).toggleClass( 'hide', ! S.pllength && S.player === 'mpd' );
		$( '#guide-bio, #guide-lyrics' ).toggleClass( 'hide', S.stream && S.state === 'stop' );
		$( '#guide-album' ).toggleClass( 'hide', $( '#album' ).hasClass( 'disabled' ) );
		$( '#guide-bio, #guide-lyrics, #guide-album' ).toggleClass( 'hide', ! S.pllength || ( S.stream && S.state !== 'play' ) );
		$( '#coverL, #coverM, #coverR, #coverB' ).toggleClass( 'disabled', ! S.pllength );
		$( '.maptime' ).toggleClass( 'mapshow', ! D.cover );
		$( '.mapvolume' ).toggleClass( 'mapshow', volume );
		$( '#bar-bottom' ).toggleClass( 'translucent', $bartop.is( ':hidden' ) );
		if ( time || volume ) {
			$( '#coverTL' )
				.removeClass( 'i-scale-dn' )
				.addClass( 'i-scale-up' );
		} else {
			$( '#coverTL' )
				.removeClass( 'i-scale-up' )
				.addClass( 'i-scale-dn' );
		}
		if ( S.player === 'mpd' ) {
			if ( ! time && ! S.stream ) {
				$( '#time-band' )
					.removeClass( 'transparent' )
					.text( S.Time ? second2HMS( S.Time ) : '' );
			}
			if ( ! volume && ! D.volumenone ) {
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
			if ( ! ( 'coverTL' in V )
				&& ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 40
				&& ! D.volumenone
				&& $volume.is( ':hidden' )
			) {
				if ( $( '#info' ).hasClass( 'hide' ) ) {
					$( '#info' ).removeClass( 'hide' );
				} else {
					$( '#info' ).addClass( 'hide' );
					$( '#volume-band' ).click();
				}
				return
			}
			
			var list = [ 'bars', 'time', 'cover', 'volume', 'buttons' ];
			if ( 'coverTL' in V ) {
				list.forEach( el => D[ el ] = V.coverTL[ el ] );
				delete V.coverTL;
			} else {
				V.coverTL = {};
				list.forEach( el => V.coverTL[ el ] = D[ el ] );
				if ( this.id === 'coverTL' ) {
					if ( D.time || D.volume ) {
						D.bars = D.time = D.volume = D.buttons = false;
					} else {
						D.bars = D.time = D.volume = D.buttons = true;
					}
				} else {
					D.time = D.cover = D.volume = D.buttons = true;
				}
			}
			$( '.band' ).addClass( 'transparent' );
			$( '#volume-bar, #volume-text' ).addClass( 'hide' );
			$( '.volumeband' ).toggleClass( 'hide', D.volumenone );
			displayBars();
			setButtonControl();
			displayPlayback();
			if ( S.state === 'play' && ! S.stream && ! localhost ) {
				setProgress();
				setTimeout( setProgressAnimate, 0 );
			}
			if ( 'coverTL' in V && ! D.cover ) $( '#map-time' ).removeClass( 'hide' );
			break;
		case 'settings':
			$( '#button-settings' ).click();
			break;
		case 'repeat':
			if ( S.repeat ) {
				if ( S.single ) {
					$( '#single' ).click();
					S.repeat = false;
					S.single = false;
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
			if ( cmd === 'play' && S.state === 'play' ) cmd = ! S.stream ? 'pause' : 'stop';
			$( '#'+ cmd ).click();
	}
} );
$( '.btn-cmd' ).click( function() {
	var $this = $( this );
	var cmd   = this.id;
	if ( $this.hasClass( 'btn-toggle' ) ) {
		var onoff = ! S[ cmd ];
		S[ cmd ] = onoff;
		bash( [ 'mpcoption', cmd, onoff ] );
		setButtonOptions();
		local( 600 );
	} else {
		if ( S.stream ) {
			$( '#divcover .cover-change' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
		if ( cmd === 'play' ) {
			if ( S.state === 'play' ) return
			
			S.state = cmd;
			if ( ! S.elapsed ) $( '#elapsed' ).empty(); // 0 or false
			if ( ! S.stream && S.elapsed !== false ) setProgressAnimate();
			bash( [ 'mpcplayback', 'play' ] );
			$( '#title' ).removeClass( 'gr' );
			$( '#elapsed' ).removeClass( 'bl gr' );
			$( '#total' )
				.text( second2HMS( S.Time ) )
				.removeClass( 'wh' );
			$( '#progress i' ).removeAttr( 'class' ).addClass( 'i-play' );
			if ( S.stream ) $( '#title, #elapsed' ).html( V.blinkdot );
			vu();
		} else if ( cmd === 'stop' ) {
			S.state = cmd;
			clearInterval( V.intElapsed );
			clearInterval( V.intElapsedPl );
			elapsedscrobble = S.webradio ? '' : S.elapsed;
			if ( S.player !== 'mpd' ) {
				bash( [ 'playerstop', elapsedscrobble ] );
				banner( S.player, icon_player[ S.player ], 'Stop ...' );
				return
			}
			
			$( '#title' ).removeClass( 'gr' );
			if ( ! S.pllength ) return
			
			bash( [ 'mpcplayback', 'stop', elapsedscrobble ] );
			$( '#pl-list .elapsed' ).empty();
			if ( V.playback ) {
				$( '#total' ).empty();
				if ( S.Time ) {
					var timehms = second2HMS( S.Time );
					setProgress( 0 );
					$( '#elapsed' )
						.text( timehms )
						.addClass( 'gr' );
					$( '#total, #progress' ).empty();
					$( '#progress' ).html( ico( 'stop' ) +'<span></span>'+ timehms );
				} else {
					$( '#title' ).html( '·&ensp;·&ensp;·' );
					$( '#elapsed, #progress' ).empty();
					vu();
				}
				if ( V.playback && S.stream ) {
					[ 'Artist', 'Title', 'Album', 'coverart' ].forEach( el => S[ el ] = '' );
					setInfo();
					setCoverart();
				}
			} else if ( V.playlist ) {
				$( '#pl-list .song' ).empty();
				$( '#pl-list .li1' ).find( '.name, .song' ).css( 'max-width', '' );
				$( '#pl-list .li2 .radioname' ).addClass( 'hide' );
				$( '#pl-list .li1 .radioname' ).removeClass( 'hide' );
			}
		} else if ( cmd === 'pause' ) {
			if ( S.state === 'stop' ) return
			
			S.state = cmd;
			bash( [ 'mpcplayback', 'pause' ] );
			$( '#title' ).addClass( 'gr' );
			$( '#elapsed' ).addClass( 'bl' );
			$( '#total' ).addClass( 'wh' );
			$( '#progress i' ).removeAttr( 'class' ).addClass( 'i-pause' );
		} else if ( cmd === 'previous' || cmd === 'next' ) {
			var pllength = S.pllength;
			var song     = S.song;
			if ( pllength < 2 ) return
			
			clearIntervalAll();
			$timeRS.setValue( 0 );
			$( '#elapsed, #total, #progress' ).empty();
			elapsedscrobble = S.webradio ? '' : S.elapsed || '';
			bash( [ 'mpcprevnext', cmd, song, pllength, S.state, elapsedscrobble ] );
			if ( V.playlist ) {
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
$( '#bio' ).on( 'click', '.biosimilar', function() {
	getBio( $( this ).text(), 'getsimilar' );
} );
$( '#bio' ).on( 'click', '.bioback', function() {
	V.bioartist.pop();
	var getsimilar = V.bioartist.length > 1 ? 'getsimilar' : '';
	getBio( V.bioartist.pop(), getsimilar );
} );
$( '#bio' ).on( 'click', '.closebio', function() {
	V.bioartist = [];
	$( '#bio' ).addClass( 'hide' );
} );
// LIBRARY /////////////////////////////////////////////////////////////////////////////////////
$( '#lib-breadcrumbs' ).on( 'click', 'a', function() {
	V.query = [];
	delete V.gmode;
	if ( V.query.length > 1 ) V.scrolltop[ V.query.slice( -1 )[ 0 ].modetitle ] = $( window ).scrollTop();
	var path = $( this ).find( '.lidir' ).text();
	if ( V.mode.slice( -5 ) === 'radio' ) {
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
	query.gmode = V.mode;
	list( query, function( html ) {
		if ( ! path && V.mode.slice( -5 ) === 'radio' ) path = V.mode.toUpperCase();
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path      = path;
	query.modetitle = path;
} );
$( '#lib-breadcrumbs' ).on( 'click', '.button-webradio-new', function() {
	webRadioNew();
} ).on( 'click', '.button-dab-refresh', function() {
	info( {
		  icon     : 'dabradio'
		, title    : 'DAB Radio'
		, message  : ( $( '#lib-list li' ).length ? 'Rescan' : 'Scan' ) +' digital radio stations?'
		, ok       : () => bash( [ 'dabscan' ] )
	} );
} ).on( 'click', '.button-latest-clear', function() {
	if ( V.librarytracklist ) {
		info( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear from Latest album list:<br><br>'+ $( '.licover .lialbum' ).text()
			, ok           : () => {
				bash( [ 'latestclear', $( '.licover .lipath' ).text() ], () => $( '#button-lib-back' ).click() );
			}
		} );
	} else {
		info( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear Latest albums list?'
			, ok           : () => {
				bash( [ 'latestclear' ], () => $( '#library' ).click() );
			}
		} );
	}
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
		  icon         : 'coverart'
		, title        : 'Album Thumbnails'
		, message      : message
		, messagealign : 'left'
		, ok           : () => thumbUpdate()
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
	if ( ! keyword ) {
		$( '#lib-search-close' ).click();
	} else {
		if ( V.mode.slice( -5 ) === 'radio' ) {
			var query = {
				  query  : V.mode
				, string : keyword
				, mode   : 'search'
			}
		} else {
			var query = {
				  query  : 'search'
				, string : keyword
				, gmode  : V.mode
				, format : [ 'album', 'artist', 'file', 'title', 'time', 'track' ]
			}
		}
		list( query, function( data ) {
			if ( data !== -1 ) {
				var list = {
					  html      : data.html
					, modetitle : 'search'
				}
				renderLibraryList( list );
				pageScroll( 0 );
				$( '#lib-search-close' ).html( ico( 'close' ) +'<span>'+ data.count +' <gr>of</gr> </span>' );
				$( '#lib-breadcrumbs, #button-lib-back' ).addClass( 'hide' );
			} else {
				info( {
					  icon    : 'library'
					, title   : 'Library Database'
					, message : 'Nothing found for <wh>'+ keyword +'</wh>'
				} );
				$( '#lib-search-close' ).html( ico( 'close' ) );
			}
		}, 'json' );
	}
} );
$( '#lib-search-close' ).click( function( e ) {
	e.stopPropagation();
	$( '#lib-search, #lib-search-btn' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path span, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-search-close' ).empty();
	if ( $( '#lib-path .lipath').text() ) $( '#button-lib-back' ).removeClass( 'hide' );
	if ( $( '#lib-search-input' ).val() ) {
		$( '#lib-search-input' ).val( '' );
		$( '#lib-breadcrumbs a' ).length ? $( '#lib-breadcrumbs a' ).last().click() : $( '#library' ).click();
	}
} );
$( '#lib-search-input' ).on( 'keyup paste cut', function( e ) {
	if ( e.key === 'Enter' ) $( '#lib-search-btn' ).click();
} );
$( '#button-lib-back' ).click( function() {
	var $breadcrumbs = $( '#lib-breadcrumbs a' );
	var bL           = $breadcrumbs.length
	if ( ( bL && bL < 2 ) || ( ! bL && V.query.length < 2 ) ) {
		$( '#library' ).click();
		return
	}
	
	var backmode     = 'gmode' in V && V.gmode !== V.mode;
	if ( bL && V.mode !== 'latest' && ! backmode ) {
		bL > 1 ? $breadcrumbs.eq( -2 ).click() : $( '#library' ).click();
	} else {
		V.query.pop();
		var query = V.query.slice( -1 )[ 0 ];
		if ( query === 'album' ) {
			$( '#mode-album' ).click();
		} else {
			if ( 'gmode' in query ) V.mode = query.gmode;
			list( query, function( html ) {
				if ( html != -1 ) {
					if ( backmode ) V.mode = V.gmode;
					if ( V.mode === 'album' ) {
						var path = 'ALBUM';
					} else {
						var path = query.path;
						V.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
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
$( '#lib-mode-list' ).click( function( e ) {
	if ( ! V.press && $( '.bkedit' ).length && ! $( e.target ).hasClass( 'bkedit' ) ) setBookmarkEdit();
} ).on( 'click', '.mode', function() {
	var $this = $( this );
	V.mode    = $this.data( 'mode' );
	$( '#lib-search-close' ).click();
	if ( V.mode === 'bookmark' ) return
	
	if ( ! C[ V.mode ] && V.mode.slice( -5 ) !== 'radio' ) {
		if ( V.mode === 'playlists' ) {
			var message = 'No saved playlists found.';
		} else if ( V.mode === 'latest' ) {
			var message = 'No new albums added since last update.';
		} else {
			var message = 'Database not yet available in this mode.'
						 +'<br>If music files already in SD, NAS or USB,'
						 +'<br>import them to database:'
						 +'<div class="menu" style="width: 160px"><a class="sub nohover">'+ ico( 'library' )+' Library</a>'+ ico( 'refresh-library submenu bgm' ) +'</div>'
		}
		info( {
			  icon    : 'library'
			, title   : 'Library Database'
			, message : message
			, okno    : true
			, beforeshow : () => {
				$( '#infoContent' ).on( 'click', '.submenu', function() {
					$( '#update' ).click();
				} );
			}
		} );
		return
	}
	
	if ( ! V.color && ! C[ V.mode ] && S.updating_db ) {
		infoUpdate();
		return
	}
	
	V.modescrolltop = $( window ).scrollTop();
	
	if ( V.mode === 'playlists' ) {
		if ( $( this ).find( 'gr' ).text() ) {
			$( '#button-pl-playlists' ).click();
			$( '#playlist' ).click();
		}
		return
	}
	
	var path = V.mode.toUpperCase();
	// V.modes: sd, nas, usb, webradio, dabradio, album, artist, albumartist, composer, conductor, genre, playlists
	// ( coverart, bookmark by other functions )
	if ( [ 'sd', 'nas', 'usb' ].includes( V.mode ) ) { // browse by directory
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	} else if ( V.mode.slice( -5 ) === 'radio' ) {
		var query = {
			  query : 'radio'
			, gmode : V.mode
		}
	} else { // browse by modes
		var query = {
			  query  : 'list'
			, mode   : V.mode
			, format : [ V.mode ]
		}
	}
	query.gmode = V.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path      = V.mode.slice( -5 ) === 'radio' ? '' : path;
	query.modetitle = path;
	if ( query.query !== 'ls' && query.query !== 'radio' ) V.query.push( query );
} ).on( 'click', '.bkradio', function( e ) { // delegate - id changed on renamed
	if ( V.press || $( '.bkedit' ).length ) return
	
	var $this = $( this );
	var path  = $this.find( '.lipath' ).text();
	var name  = $this.find( '.bkname' ).text();
	var msg   = '<div class="li1">'+ name +'</div>'
				+'<a class="li2">'+ path +'</a>';
	if ( D.tapaddplay ) {
		addToPlaylistCommand( 'addplay', [ 'mpcadd', path ], msg );
		return
	}
	
	if ( D.tapreplaceplay ) {
		addToPlaylistCommand( 'replaceplay', [ 'mpcadd', path ], msg );
		return
	}
	
	var $img = $this.find( '.bkcoverart' );
	var icon = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : ico( 'bookmark bl' );
	var content = `\
<div class="infomessage">${ icon }
<wh>${ name }</wh>
</div>
<div class="menu">
<a data-cmd="add" class="sub cmd"><i class="i-plus-o"></i>Add</a><i class="i-play-plus submenu cmd" data-cmd="addplay"></i>
<a data-cmd="playnext" class="cmd"><i class="i-plus-circle"></i>Play next</a>
<a data-cmd="replace" class="sub cmd"><i class="i-replace"></i>Replace</a><i class="i-play-replace submenu cmd" data-cmd="replaceplay"></i>
</div>`;
	info( {
		  icon      : 'playlist'
		, title     : 'Add to Playlist'
		, content   : content
		, values    : 'addplay'
		, beforeshow : () => {
			$( '#infoContent' ).on( 'click', '.cmd', function() {
				V.bkradio   = true;
				var cmd     = $( this ).data( 'cmd' );
				var action  = cmd === 'playnext' ? 'mpcaddplaynext' : 'mpcadd';
				$( '#infoX' ).click();
				addToPlaylist( cmd, [ action, path ], msg );
			} );
		}
		, okno      : true
	} );
} ).on( 'click', '.mode-bookmark', function( e ) { // delegate - id changed on renamed
	var $this = $( this );
	$( '#lib-search-close' ).click();
	if ( V.press || $( '.bkedit' ).length || $this.hasClass( 'bkradio' ) ) return
	
	var path  = $this.find( '.lipath' ).text();
	var path0 = path.split( '/' )[ 0 ];
	var mode  = path0.toLowerCase();
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
	V.mode = mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path      = path;
	query.modetitle = path;
	V.query.push( query );
} ).on( 'click', '.bk-remove', function() {
	var $this = $( this ).parent();
	var name  = $this.find( '.bkname' ).text();
	var $img  = $this.find( 'img' );
	if ( $img.length ) {
		var icon = '<img src="'+ $img.attr( 'src' ) +'">'
	} else {
		var icon = ico( 'bookmark bookmark bl' )
				  +'<br><a class="bklabel">'+ name +'</a>'
	}
	info( {
		  icon    : 'bookmark'
		, title   : 'Remove Bookmark'
		, message : icon
		, oklabel : ico( 'minus-circle' ) +'Remove'
		, okcolor : red
		, ok      : () => bash( [ 'bookmarkremove', name ] )
	} );
} ).on( 'click', '.bk-rename', function() {
	var $this = $( this ).parent();
	var name  = $this.find( '.bkname' ).text();
	info( {
		  icon         : 'bookmark'
		, title        : 'Rename Bookmark'
		, message      : '<div class="infobookmark">'+ ico( 'bookmark bookmark' )
						+'<br><span class="bklabel">'+ name +'</span></div>'
		, textlabel    : 'To:'
		, values       : name
		, checkblank   : true
		, checkchanged : true
		, oklabel      : ico( 'flash' ) +'Rename'
		, ok           : () => bash( [ 'bookmarkrename', name, infoVal() ] )
	} );
} ).on( 'click', '.bk-cover', function() {
	var $this = $( this ).parent().parent();
	var name  = $this.find( '.bkname' ).text();
	var thumbnail = $this.find( 'img' ).length;
	if ( thumbnail ) {
		var icon    = 'coverart';
		var message = '<img class="imgold" src="'+ $this.find( 'img' ).attr( 'src' ) +'">'
					 +'<p class="infoimgname">'+ name +'</p>';
	} else {
		var icon    = 'bookmark';
		var message = '<div class="infobookmark">'+ ico( 'bookmark' )
					 +'<br><span class="bklabel">'+ name +'</span></div>';
	}
	var path      = $this.find( '.lipath' ).text();
	var imagepath = path.slice( 3, 8 ) !== 'radio' ? '/mnt/MPD/'+ path : '/srv/http/data/'+ path;
	info( {
		  icon        : icon
		, title       : 'Bookmark Thumbnail'
		, message     : message
		, filelabel   : ico( 'folder-open' ) +'File'
		, fileoklabel : ico( 'flash' ) +'Replace'
		, filetype    : 'image/*'
		, buttonlabel : ! thumbnail ? '' : ico( 'bookmark' ) +'Default'
		, buttoncolor : ! thumbnail ? '' : orange
		, button      : ! thumbnail ? '' : () => bash( [ 'bookmarkcoverreset', imagepath, name ] )
		, ok          : () => imageReplace( 'bookmark', imagepath +'/coverart', name ) // no ext
	} );
} ).press( '.mode-bookmark', setBookmarkEdit );
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
		$( '.mode' ).each( ( i, el ) => order.push( $( el ).find( '.lipath' ).text() ) );
		bash( [ 'ordersave', JSON.stringify( order ) ] );
	}
} );
$( '#page-library' ).on( 'click', '#lib-list .coverart', function() {
	if ( V.press ) return
	
	V.scrolltop[ 'ALBUM' ] = $( window ).scrollTop();
	var $this = $( this );
	var path  = $this.find( '.lipath' ).text();
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
			, modetitle : $this.find( D.albumbyartist ? '.coverart2' : '.coverart1' ).text()
			, path      : 'ALBUM'
		}
		renderLibraryList( data );
	} );
	query.modetitle = 'ALBUM';
	V.query.push( query );
} ).press( '.coverart', function( e ) {
	var $this  = $( e.currentTarget );
	var src    = $this.find( 'img' ).attr( 'src' );
	var i      = D.albumbyartist ? '21' : '12';
	var album  = $this.find( '.coverart'+ i[ 0 ] ).text();
	var artist = $this.find( '.coverart'+ i[ 1 ] ).text();
	info( {
		  icon    : 'album'
		, title   : 'Album Thumbnail'
		, message : `\
<img src="${ src }">
<wh>${ ico( 'album' ) } ${ album }</wh>
${ ico( 'artist wh' ) } ${ artist }

Exclude this thumbnail?`
		, okcolor : orange
		, oklabel : ico( 'minus-circle' ) +'Exclude'
		, ok      : () => {
			bash( [ 'albumignore', album, artist ] );
			$this.remove();
		}
	} );
} ).on( 'click', '.coveredit',  function() {
	var $this   = $( this );
	var $img    = $this.siblings( 'img' );
	var $thisli = $this.parent().parent();
	var album   = $thisli.find( '.lialbum' ).text();
	var artist  = $thisli.find( '.liartist' ).text();
	var lipath  = $thisli.next().find( '.lipath' ).text();
	var path    = '/mnt/MPD/'+ dirName( lipath );
	if ( $this.hasClass( 'cover-save' ) ) {
		coverartSave();
	} else {
		coverartChange();
	}
} ).press( '.licoverimg',  function( e ) {
	var $this = $( e.currentTarget );
	$this.parent().removeClass( 'active' );
	$( '#menu-album' ).addClass( 'hide' );
	$this.find( 'img' )
		.css( 'opacity', '0.33' )
		.after( V.icoveredit );
} ).on( 'click', '#lib-list li', function( e ) {
	e.stopPropagation();
	if ( V.press ) return
	
	if ( $( '.licover .cover-change' ).length ) {
		$( '.licover .cover-change' ).remove();
		$( '.licover img' ).css( 'opacity', '' );
		return
	}
	var $this   = $( this );
	var $target = $( e.target );
	if ( $target.is( '.i-save, .coverart' ) ) return
	
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	var active   = $this.hasClass( 'active' );
	menuHide();
	if ( ( menushow && V.mode !== 'webradio' ) || $target.is( '.li-icon, .licoverimg' ) ) {
		if ( ! active ) contextmenuLibrary( $this, $target );
		return
	}
	
	if ( $this.hasClass( 'licover' ) ) {
		if ( $target.is( '.liartist, .i-artist, .i-albumartist, .licomposer, .i-composer' ) ) {
			var name = ( $target.is( '.licomposer, .i-composer' ) ) ? $this.find( '.licomposer' ).text() : $this.find( '.liartist' ).text();
			getBio( name );
		} else if ( $target.hasClass( 'liinfopath' ) ) {
			V.gmode     = V.mode;
			var path    = $target.text();
			V.mode      = path.replace( /\/.*/, '' ).toLowerCase();
			var query   = {
				  query  : 'ls'
				, string : path
				, format : [ 'file' ]
			}
			query.gmode = V.mode;
			list( query, function( html ) {
				var data = {
					  html      : html
					, modetitle : path
					, path      : path
				}
				renderLibraryList( data );
			} );
			V.query.push( query );
		}
		return
	} else if ( $target.hasClass( 'lialbum' ) ) {
		if ( ! localhost ) window.open( 'https://www.last.fm/music/'+ $this.find( '.liartist' ).text() +'/'+ $this.find( '.lialbum' ).text(), '_blank' );
		return
	} else if ( $this.find( '.i-music' ).length || $target.data( 'target' ) ) {
		contextmenuLibrary( $this, $target );
		return
	}
	
	$this.addClass( 'active' );
	var libpath  = $( '#lib-path .lipath' ).text();
	var path     = $this.find( '.lipath' ).text();
	var name     = $this.find( '.liname' ).text();
	var mode     = $this.data( 'mode' );
	var modefile = [ 'sd', 'nas', 'usb' ].includes( V.mode );
	// modes: sd, nas, usb, dabradio, webradio, album, artist, albumartist, composer, conductor, date, genre
	if ( [ 'sd', 'nas', 'usb' ].includes( mode ) ) { // file
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
		var modetitle = modefile ? path : $( '#mode-title' ).text();
	} else if ( V.mode.slice( -5 ) === 'radio' ) { // dabradio, webradio
		if ( $this.hasClass( 'dir' ) ) {
			var query = {
				  query  : 'radio'
				, string : path
			}
			var modetitle = path;
		} else {
			contextmenuLibrary( $this, $target );
			return
		}
	} else if ( mode !== 'album' ) { // non-album
		if ( [ 'date', 'genre' ].includes( V.mode ) ) {
			var format = [ 'artist', 'album', 'file' ];
		} else if ( [ 'conductor', 'composer' ].includes( V.mode ) ) {
			var format = [ 'album', 'artist', 'file' ];
		} else {
			var format = [ 'album', 'file' ]; // artist, albumartist
		}
		var query = {
			  query  : 'find'
			, mode   : V.mode
			, string : path
			, format : format
		}
		var modetitle = path;
	} else { // album
		if ( V.mode === 'album' ) {
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
				, mode   : [ 'album', V.mode ]
				, string : [ name, libpath ]
			}
			var modetitle = libpath;
		}
	}
	V.scrolltop[ libpath ] = $( window ).scrollTop();
	query.gmode            = V.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : modetitle
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path      = path;
	query.modetitle = modetitle;
	if ( query.query !== 'ls' || ! modefile ) V.query.push( query );
} );
$( '.page' ).on( 'click', '.index a', function() {
	var index = $( this ).find( 'wh' ).text()[ 0 ];
	if ( ! index ) return
	
	if ( index === '#' ) {
		var scrollT = 0;
	} else {
		if ( V.library ) {
			var el = V.mode === 'album' || V.mode === 'latest' ? '.coverart' : '#lib-list li';
		} else {
			var el = '#pl-savedlist li';
		}
		var scrollT = $( el +'[data-index='+ index +']' ).offset().top;
	}
	pageScroll( scrollT - ( $bartop.is( ':visible' ) ? 80 : 40 ) );
} );
// PLAYLIST /////////////////////////////////////////////////////////////////////////////////////
$( '#button-pl-back' ).click( function() {
	if ( V.savedplaylist ) {
		$( '#button-pl-playlists' ).click();
	} else {
		getPlaylist();
	}
} );
$( '#button-pl-playlists' ).click( function() {
	V.savedlist     = true;
	V.savedplaylist = false;
	list( { playlist: 'list' }, ( data ) => renderPlaylistList( data ), 'json' );
} );
$( '#button-pl-save' ).click( function() {
	var audiocdL  = $( '#pl-list .i-audiocd' ).length;
	var upnpL     = $( '#pl-list .i-upnp' ).length;
	var notsavedL = $( '#pl-list .notsaved' ).length;
	if ( audiocdL || upnpL ) {
		message = 'Saved playlist cannot contain:<br>'
				+ audiocdL ? audiocdL + ico( 'audiocd wh' ) : ''
				+ upnpL ? upnpL +'&emsp;'+ ico( 'upnp wh' ) : ''
				+ notsavedL ? notsavedL +'&emsp;'+ ico( 'save wh' ) : ''
		infoWarning( 'file-playlist', 'Save Playlist', message );
	} else {
		playlistNew();
	}
} );
$( '#button-pl-consume' ).click( function() {
	var $this = $( this );
	var icon  = 'playlist';
	var title = 'Consume Mode';
	if ( S.consume ) {
		$this.removeClass( 'bl' );
		banner( icon, title, 'Off' );
	} else {
		$this.addClass( 'bl' );
		banner( icon, title, 'On - Remove each song after played.' );
	}
	S.consume = ! S.consume;
	bash( [ 'mpcoption', 'consume', S.consume ] );
} );
$( '#button-pl-librandom' ).click( function() {
	var $this = $( this );
	var icon  = 'librandom';
	var title = 'Roll The Dice';
	if ( S.librandom ) {
		S.librandom = false;
		$this.removeClass( 'bl' );
		banner( icon, title, 'Off ...' );
		bash( [ 'librandom', false ] );
	} else {
		info( {
			  icon       : icon
			, title      : title
			, message    : 'Randomly add songs and play continuously.'
			, checkbox   : [ 'Start playing the random songs' ]
			, values     : [ true ]
			, beforeshow : () => $( '#infoContent table' ).toggleClass( 'hide', S.song + 1 === S.pllength )
			, ok         : () => {
				S.librandom = true;
				$this.addClass( 'bl' );
				banner( icon, title, 'On ...' );
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
		, ok      : () => bash( [ 'mpcshuffle' ] )
	} );
} );
$( '#button-pl-clear' ).click( function() {
	if ( S.pllength === 1 ) {
		info( {
			  icon        : 'playlist'
			, title       : 'Clear Playlist'
			, oklabel     : ico( 'minus-circle' ) +'Clear'
			, okcolor     : red
			, ok          : () => {
				bash( [ 'mpcremove' ] );
				renderPlaylist( -1 );
			}
		} );
	} else if ( $( '.pl-remove' ).length ) {
		$( '.pl-remove' ).remove();
	} else {
		info( {
			  icon        : 'playlist'
			, title       : 'Remove From Playlist'
			, buttonlabel : [ ico( 'playlist' ) +'Select', ico( 'crop' ) +'Crop' ]
			, buttoncolor : [ orange ]
			, button      : [
				  () => {
					local();
					$( '#pl-list .li1' ).before( ico( 'minus-circle pl-remove' ) );
					$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
				}
				, () => {
					if ( ! S.librandom ) local();
					bash( [ 'mpccrop' ] );
					$( '#pl-list li:not( .active )' ).remove();
				}
			]
			, oklabel     : ico( 'minus-circle' ) +'All'
			, okcolor     : red
			, ok          : () => {
				bash( [ 'mpcremove' ] );
				setPlaybackBlank();
				renderPlaylist( -1 );
			}
		} );
	}
} );
$( '#pl-search-input' ).on( 'keyup paste cut', playlistFilter );
$( '#pl-search-close, #pl-search-btn' ).click( function() {
	$( '#pl-search-close' ).empty();
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).addClass( 'hide' );
	$( '#pl-manage, #button-pl-search, #pl-list li' ).removeClass( 'hide' );
	$( '#pl-search-input' ).val( '' );
	$( '#pl-list' ).html( function() {
		return $( this ).html().replace( /<bll>|<\/bll>/g, '' );
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
		S.song = $( '#pl-list li.sortactive' ).index();
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
	e.stopPropagation();
	$target = $( e.target );
	if ( $target.is( '.i-save, .li-icon, .pl-remove' ) ) return
	
	var $this = $( this );
	if ( ! [ 'mpd', 'upnp' ].includes( S.player ) ) {
		$this.find( '.li-icon' ).click();
		return
	}
	
	var $liactive  = $( '#pl-list li.active' );
	var listnumber = $this.index() + 1;
	$( '#menu-plaction' ).addClass( 'hide' );
	$liactive.find( '.song' ).empty();
	$liactive.find( '.li1 .radioname' ).removeClass( 'hide' );
	$liactive.find( '.li2 .radioname' ).addClass( 'hide' );
	if ( $this.hasClass( 'active' ) ) {
		if ( S.state == 'play' ) {
			if ( $this.find( '.lipath' ).text().slice( 0, 4 ) !== 'http' ) {
				$( '#pause' ).click();
				$this.find( '.elapsed i' ).removeClass( 'i-play' ).addClass( 'i-pause' );
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
} ).on( 'click', '.li-icon, .savewr', function() {
	var $this     = $( this );
	var $thisli   = $this.parent();
	V.list        = {};
	V.list.li     = $thisli;
	V.list.path   = $thisli.find( '.lipath' ).text();
	V.list.artist = $thisli.find( '.artist' ).text();
	V.list.name   = $thisli.find( '.name' ).text();
	V.list.index  = $thisli.index();
	var $menu = $( '#menu-plaction' );
	var menushow  = ! $menu.hasClass( 'hide' );
	var updn = $thisli.hasClass( 'updn' );
	menuHide();
	$( '.pl-remove' ).remove();
	if ( menushow && updn) return
	
	var state     = S.state;
	var play      = state === 'play';
	var active    = $thisli.hasClass( 'active' );
	var audiocd   = $thisli.hasClass( 'audiocd' );
	var notsaved  = $thisli.hasClass( 'notsaved' );
	var radio     = $thisli.hasClass( 'webradio' );
	var upnp      = $thisli.hasClass( 'upnp' );
	$thisli.addClass( 'updn' );
	$( '#menu-plaction a' ).removeClass( 'hide' );
	$menu.find( '.current' ).toggleClass( 'hide', active || play );
	if ( S.player === 'mpd' || S.player === 'upnp' ) {
		if ( active ) {
			$menu.find( '.play' ).toggleClass( 'hide', play );
			$menu.find( '.pause' ).toggleClass( 'hide', ! play || radio );
			$menu.find( '.stop' ).toggleClass( 'hide', state === 'stop' );
		} else {
			$menu.find( '.pause, .stop' ).addClass( 'hide' );
		}
	} else {
		$menu.find( '.play, .pause, .stop, .current' ).addClass( 'hide' );
	}
	$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp || C.playlists === 0 );
	$menu.find( '.similar, .submenu' ).toggleClass( 'hide', radio );
	$menu.find( '.tag' ).toggleClass( 'hide', audiocd || radio || upnp );
	$menu.find( '.tagcd' ).toggleClass( 'hide', ! audiocd );
	$menu.find( '.wrsave' ).toggleClass( 'hide', ! notsaved );
	contextmenuScroll( $menu, $thisli.offset().top + 48 );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	playlistRemove( $( this ).parent() );
} );
$( '#savedpl-path' ).click( '.savedlist', function() {
	var $menu   = $( '#menu-playlist' );
	var active = ! $menu.hasClass( 'hide' );
	menuHide();
	if ( active ) return
	
	V.list.path = $( '#savedpl-path .lipath' ).text();
	$menu.find( '.plrename, .pldelete' ).addClass( 'hide' );
	contextmenuScroll( $menu, 88 );
} );
$( '#pl-savedlist' ).on( 'click', 'li', function( e ) {
	e.stopPropagation();
	var $target  = $( e.target );
	var $this    = $( this );
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	var active   = $this.hasClass( 'active' );
	menuHide();
	if ( menushow && active ) return
	
	var pladd    = 'file' in V.pladd;
	var liicon   = $target.hasClass( 'li-icon' );
	if ( V.savedplaylist || liicon ) {
		if ( pladd ) {
			playlistInsertSelect( $this );
		} else {
			var datatarget = $target.data( 'target' ) || $this.find( '.li-icon' ).data ( 'target' );
			var $menu      = $( datatarget );
			V.list         = {};
			V.list.li      = $this; // for contextmenu
			$( '#pl-savedlist li' ).removeClass( 'active' );
			if ( V.savedlist ) {
				V.list.name = $this.find( '.plname' ).text().trim();
				V.list.path = V.list.name;
			} else {
				V.list.artist = $this.find( '.artist' ).text().trim();
				V.list.name   = $this.find( '.name' ).text().trim();
				V.list.path   = $this.find( '.lipath' ).text().trim() || V.list.name;
				V.list.track  = $this.data( 'track' );
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', ! S.pllength );
				$( '.minus-circle' ).removeClass( 'hide' );
				$( '.tag' ).addClass( 'hide' );
				if ( ( D.tapaddplay || D.tapreplaceplay )
					&& V.savedplaylist 
					&& ! liicon
					&& S.player === 'mpd'
				) {
					$menu.find( 'a:eq( 0 ) .submenu' ).click();
					return
				}
				
				$menu.find( '.replace' ).toggleClass( 'hide', ! S.pllength );
				$menu.find( '.similar' ).toggleClass( 'hide', V.list.path.slice( 0, 4 ) === 'http' );
				$menu.find( '.wrsave' ).toggleClass( 'hide', ! $this.hasClass( 'notsaved' ) );
			}
			$this.addClass( 'active' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', S.player !== 'mpd' );
			contextmenuScroll( $menu, $this.position().top + 48 );
		}
	} else {
		V.savedlist     = false;
		V.savedplaylist = true;
		renderSavedPlaylist( $this.find( '.plname' ).text() );
		if ( pladd ) playlistInsertTarget();
	}
} );
// lyrics /////////////////////////////////////////////////////////////////////////////////////
$( '#lyricstextarea' ).on( 'input', function() {
	if ( V.lyrics === $( this ).val()  ) {
		$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
		$( '#lyricsback' ).removeClass( 'hide' );
	} else {
		$( '#lyricsundo, #lyricssave' ).removeClass( 'hide' );
		$( '#lyricsback' ).addClass( 'hide' );
	}
} );
$( '#lyricsedit' ).click( function() {
	$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
	$( '#lyricsdelete' ).toggleClass( 'hide', ! V.lyrics );
	$( '#lyricseditbtngroup' ).removeClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).addClass( 'hide' );
	$( '#lyricstextarea' )
		.val( V.lyrics )
		.scrollTop( $( '#lyricstext' ).scrollTop() );
} );
$( '#lyricsclose' ).click( function() {
	if ( $( '#lyricstextarea' ).val() === V.lyrics || ! $( '#lyricstextarea' ).val() ) {
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
		, ok       : () => {
			$( '#lyricstextarea' ).val( V.lyrics );
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
		, ok       : () => {
			V.lyrics   = $( '#lyricstextarea' ).val();
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'save', V.lyrics.replace( /\n/g, '\\n' ) ] );
			lyricstop  = $( '#lyricstextarea' ).scrollTop();
			lyricsShow( V.lyrics );
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
		, oklabel : ico( 'minus-circle' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'delete' ] );
			V.lyrics   = '';
			lyricsHide();
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
