C = {}; // counts
D = {}; // display
E = {}; // equalizer
O = []; // order
V = {   // var global
	  apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : '328f08885c2b5a4d1dbe1496cab60b15'
	, sharedsecret  : '8be57656a311be3fd8f003a71b3e0c06'
	, blinkdot      : '<wh class="dot dot1">·</wh>&ensp;<wh class="dot dot2">·</wh>&ensp;<wh class="dot dot3">·</wh>'
	, coverart      : '/assets/img/coverart.svg'
	, html          : {}
	, icoverart     : '<img class="icoverart" src="/assets/img/coverart.svg">'
	, icoversave    : '<div class="coveredit cover-save">'+ ico( 'save' ) +'</div>'
	, covervu       : '/assets/img/vu.svg'
	, page          : 'playback'
	, scrollspeed   : 80 // pixel/s
	, similarpl     : -1
	, wH            : window.innerHeight
	, wW            : window.innerWidth
};
[ 'bioartist',     'query' ].forEach(                                                     k => V[ k ] = [] );
[ 'interval',      'list',         'scrolltop',   'status' ].forEach(                     k => V[ k ] = {} );
[ 'guide',         'library',      'librarylist', 'local', 'playlist' ].forEach( k => V[ k ] = false );
[ 'lyrics',        'lyricsartist', 'mode' ].forEach(                                      k => V[ k ] = '' );
[ 'modescrolltop', 'rotate' ].forEach(                                                    k => V[ k ] = 0 );
[ 'playback',      'playlisthome' ].forEach(                                              k => V[ k ] = true );
var $bartop     = $( '#bar-top' );
var $time       = $( '#time-knob' );
var $volume     = $( '#volume-knob' );
var data        = {}
var dots        = '·&ensp;·&ensp;·';
var picaOption  = { // pica.js
	  unsharpAmount    : 100  // 0...500 Default = 0 (try 50-100)
	, unsharpThreshold : 5    // 0...100 Default = 0 (try 10)
	, unsharpRadius    : 0.6
//	, quality          : 3    // 0...3 Default = 3 (Lanczos win=3)
//	, alpha            : true // Default = false (black crop background)
};
var icon_player = {
	  airplay   : 'AirPlay'
	, bluetooth : 'Bluetooth'
	, snapcast  : 'Snapcast'
	, spotify   : 'Spotify'
	, upnp      : 'UPnP'
}
var vumeter     = '<img class="imgicon" src="'+ V.covervu +'"> ';
var chkdisplay  = {
	  library       : {
		  album          : ico( 'album' ) +'<gr>Album</gr>'
			, nas        : ico( 'networks' ) +'<gr>NAS</gr>'
		, albumartist    : ico( 'albumartist' ) +'<gr>Album Artist</gr>'
			, sd         : ico( 'microsd' ) +'<gr>SD</gr>'
		, artist         : ico( 'artist' ) +'<gr>Artist</gr>'
			, usb        : ico( 'usbdrive' ) +'<gr>USB</gr>'
		, composer       : ico( 'composer' ) +'<gr>Composer</gr>'
			, playlists  : ico( 'playlists' ) +'<gr>Playlists</gr>'
		, conductor      : ico( 'conductor' ) +'<gr>Conductor</gr>'
			, webradio   : ico( 'webradio' ) +'<gr>Web Radio</gr>'
		, date           : ico( 'date' ) +'<gr>Date</gr>'
			, '-'        : ''
		, genre          : ico( 'genre' ) +'<gr>Genre</gr>'
			, count      : 'Count'
		, latest         : ico( 'latest' ) +'<gr>Latest</gr>'
			, label      : 'Label'
	}
	, libraryoption : {
		  albumbyartist  : ico( 'album' ) +'Sort by artist'
		, albumyear      : ico( 'album' ) +'Sort by artist > year'
		, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;'+ ico( 'play-plus infomenusub' ) +'<gr>Add + Play</gr>'
		, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;'+ ico( 'play-replace infomenusub' ) +'<gr>Replace + Play</gr>'
		, playbackswitch : 'Switch to Playback <gr>on '+ ico( 'play-plus infomenusub' ) +'or '+ ico( 'play-replace infomenusub' )
		, backonleft     : ico( 'back bl' ) +'Back button on left side'
		, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
		, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
	}
	, playback      : {
		  bars             : 'Top-Bottom bars'
			, barsalways   : 'Bars always on'
		, time             : 'Time'
			, radioelapsed : 'Web Radio elapsed'
		, cover            : 'Cover art'
			, covervu      : vumeter +'As default'
		, volume           : 'Volume'
			, vumeter      : vumeter +'VU meter'
		, buttons          : 'Buttons'
			, progress     : 'Progress keep-alive'
		, composername     : ico( 'composer' ) +'<gr>Composer</gr>'
			, '-'              : ''
		, conductorname     : ico( 'conductor' ) +'<gr>Conductor</gr>'
	}
	, playlist      : {
		  plclear        : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'replace' ) +'Replace'+ ico( 'play-replace sub' ) + '<a>'
		, plsimilar      : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'lastfm' ) +'Add similar</a>'
		, audiocdplclear : 'Clear on '+ ico( 'audiocd' ) +'Audio CD load'
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

if ( navigator.maxTouchPoints ) { // swipe
	$( '.page' ).on( 'contextmenu', function( e ) { // on press - disable default context menu
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		return false
	} );
	$( 'link[ href*="hovercursor.css" ]' ).remove();
}
var xstart;
window.addEventListener( 'touchstart', function( e ) {
	var $target = $( e.target );
	if ( I.active
		|| [ 'time-band', 'time-knob', 'volume-band', 'volume-knob' ].includes( e.target.id )
		|| $target.parents( '#time-knob' ).length
		|| $target.parents( '#volume-knob' ).length
		|| ! $( '#bio' ).hasClass( 'hide' )
		|| $( '#data' ).length
	) return
	
	xstart      = e.changedTouches[ 0 ].pageX;
} );
window.addEventListener( 'touchend', function( e ) {
	if ( ! xstart ) return
	
	var diff  = xstart - e.changedTouches[ 0 ].pageX;
	xstart = false;
	if ( Math.abs( diff ) < 100 ) return
	
	var pages = [ 'library', 'playback',  'playlist' ];
	var i     = pages.indexOf( V.page );
	var ilast = pages.length - 1;
	diff > 0 ? i++ : i--;
	if ( i < 0 ) {
		i = ilast;
	} else if ( i > ilast ) {
		i = 0;
	}
	$( '#'+ pages[ i ] ).trigger( 'click' );
} );

$( 'body' ).on( 'click', function( e ) {
	if ( I.active || V.colorpicker ) return
	
	var $target = $( e.target );
	if ( ! $target.is( '.bkcoverart, .bkradio, .disabled, .savedlist' ) ) menuHide();
	if ( ! V.local && $( '.pl-remove' ).length && ! $target.hasClass( 'pl-remove' ) ) $( '.pl-remove' ).remove();
	if ( V.guide ) guideHide();
} );
$( '#loader' ).on( 'click', function() {
	loaderHide();
} );
$( '#coverart' ).on( 'load', function() {
	if ( ! S.webradio && S.player === 'mpd' && S.coverart.slice( 0, 16 ) === '/data/shm/online' ) {
		$( '#coverart' ).after( V.icoversave );
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
$( '#logo, #refresh' ).on( 'click', function() {
	if ( ! localhost ) window.open( 'https://github.com/rern/rAudio/discussions' );
} );
$( '#button-settings' ).on( 'click', function( e ) {
	e.stopPropagation();
	if ( D.loginsetting ) {
		info( {
			  icon       : 'lock'
			, title      : 'Settings'
			, list       : [ '', 'password' ]
			, checkblank : true
			, oklabel    : 'Login'
			, ok         : () => {
				loader();
				$.post( 'cmd.php', { cmd: 'login', pwd: infoVal(), loginsetting: true }, verified => {
					if ( verified != -1 ) {
						D.loginsetting = false;
						loaderHide();
						setTimeout( () => D.loginsetting = true, 900 );
					}
					$( '#button-settings' ).trigger( 'click' );
				} );
			}
		} );
		return
	}
	
	if ( $( '#settings' ).hasClass( 'hide' ) ) {
		if ( ! $( '#color canvas' ).length ) { // color icon
			$( '#color' ).html( '<canvas></canvas>' );
			var canvas = $( '#color canvas' )[ 0 ];
			var ctx    = canvas.getContext( '2d' );
			var cw     = canvas.width / 2;
			var ch     = canvas.height / 2;
			for ( var i = 0; i < 360; i += 0.25 ) {
				var rad         = i * Math.PI / 180;
				ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
				ctx.beginPath();
				ctx.moveTo( cw, ch );
				ctx.lineTo( cw + cw * Math.cos( rad ), ch + ch * Math.sin( rad ) );
				ctx.stroke();
			}
		}
		menuHide();
		$( '#settings' )
			.css( 'top', barVisible( 40, 0 ) )
			.css( 'pointer-events', 'none' ) // suppress coverTR tap on show
			.removeClass( 'hide' );
		setTimeout( () => $( '#settings' ).css( 'pointer-events', '' ), 300 );
	} else {
		$( '#settings' ).addClass( 'hide' );
	}
} );
$( '#settings' ).on( 'click', '.settings', function() {
	location.href = 'settings.php?p='+ this.id;
} ).on( 'click', '.submenu', function() {
	var $this = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	switch ( this.id ) {
		case 'dsp':
			$this.hasClass( 'i-camilladsp' ) ? location.href = 'settings.php?p=camilla' : equalizer();
			break;
		case 'lock':
			$.post( 'cmd.php', { cmd: 'logout' }, () => location.reload() );
			break;
		case 'snapclient':
			var active = $this.hasClass( 'on' );
			if ( active ) {
				$( '#stop' ).trigger( 'click' );
			} else {
				bash( [ 'snapserverlist' ], data => {
					if ( ! data.length ) {
						delete V.bannerdelay;
						bannerHide();
						info( {
							  icon    : 'snapcast'
							, title   : 'SnapClient'
							, message : 'No SnapServers found.'
						} );
						return
					}
					
					if ( data.length === 1 ) {
						bash( [ 'snapclient.sh', data[ 0 ].replace( /.* /, '' ) ] );
					} else {
						info( {
							  icon    : 'snapcast'
							, title   : 'SnapClient'
							, message : 'Select server:'
							, list    : [ '', 'radio', { kv: data } ]
							, ok      : () => bash( [ 'snapclient.sh', infoVal().replace( /.* /, '' ) ] )
						} );
					}
				}, 'json' );
			}
			banner( 'snapcast blink', 'SnapClient', ( active ? 'Stop ...' : 'Start ...' ) );
			break;
		case 'relays':
			$( '#stop' ).trigger( 'click' );
			bash( [ 'relays.sh', S.relayson ? 'off' : '' ] );
			break;
		case 'help':
			location.href = 'settings.php?p=guide';
			break;
		case 'screenoff':
			bash( [ 'screenoff' ] );
			V.screenoff = true;
			break;
		case 'refresh-library':
			if ( 'sd' in C ) {
				$( '#button-lib-update' ).trigger( 'click' );
			} else {
				$.post( 'cmd.php', { cmd: 'countmnt' }, counts => {
					$.each( counts, ( k, v ) => { C[ k ] = v } );
					$( '#button-lib-update' ).trigger( 'click' );
				}, 'json' );
			}
			break;
		case 'color':
			V.color = true;
			if ( V.library ) {
				V.librarylist && V.mode !== 'album' ? colorSet() : $( '.mode.webradio' ).trigger( 'click' );
			} else if ( V.playlist && S.pllength ) {
				colorSet();
			} else {
				$( '#library' ).trigger( 'click' );
			}
			break;
		case 'multiraudio':
			bash( [ 'multiraudiolist' ], data => {
				var currentip = data.current;
				info( {
					  icon       : 'multiraudio'
					, title      : 'Switch rAudio'
					, list       : [ '', 'radio', { kv: data.list, sameline: false } ]
					, values     : currentip
					, beforeshow : () => {
						$( '#infoList input' ).each( ( i, el ) => {
							if ( $( el ).val() === currentip ) $( el ).prop( 'disabled', true );
						} );	
						$( '#infoList input' ).on( 'input', function() {
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
$( '#power' ).on( 'click', infoPower );
$( '#displaylibrary' ).on( 'click', infoLibrary );
$( '#displayplayback' ).on( 'click', function() {
	if ( 'coverTL' in V ) $( '#coverTL' ).trigger( 'click' );
	var kv = infoDisplayKeyValue( 'playback' );
	info( {
		  icon         : 'playback'
		, title        : 'Playback'
		, message      : 'Show:<span style="margin-left: 117px">Options:</span>'
		, messagealign : 'left'
		, list         : kv.list
		, values       : kv.values
		, checkchanged : true
		, beforeshow   : () => {
			var $chk = $( '#infoList input' );
			var $el  = {}
			kv.keys.forEach( ( k, i ) => $el[ k ] = $chk.eq( i ) );
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
			if ( D.volumenone ) $el.volume.prop( 'disabled', true ).prop( 'checked', false );
			$el.bars.on( 'input', function() {
				if ( $( this ).prop( 'checked' ) ) {
					$el.barsalways.prop( 'disabled', false );
				} else {
					$el.barsalways
						.prop( 'checked', false )
						.prop( 'disabled', true );
				}
			} );
			$el.time.on( 'input', function() {
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
			$el.cover.on( 'input', function() {
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
					} );
				} else {
					restoreEnabled();
				}
			} );
			$el.volume.on( 'input', function() {
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
			$el.covervu.on( 'input', function() {
				if ( $( this ).prop( 'checked' ) ) $el.vumeter.prop( 'checked', false );
			} );
			$el.vumeter.on( 'input', function() {
				if ( $( this ).prop( 'checked' ) ) $el.covervu.prop( 'checked', false );
			} );
		}
		, ok           : displaySave
	} );
} );
$( '#displayplaylist' ).on( 'click', function() {
	if ( 'coverTL' in V ) $( '#coverTL' ).trigger( 'click' );
	var kv = infoDisplayKeyValue( 'playlist' );
	info( {
		  icon         : 'playlist'
		, title        : 'Playlist'
		, message      : 'Options:'
		, messagealign : 'left'
		, list         : kv.list
		, values       : kv.values
		, checkchanged : true
		, ok           : displaySave
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
	bash( [ 'color', h +' '+ s +' '+ l, 'CMD HSL' ] );
	loader();
} ).on( 'click', '#colorreset', function() {
	info( {
		  icon       : 'color'
		, title      : 'Colors'
		, message    : 'Reset colors to default?'
		, beforeshow : () => {
			$( '#infoIcon' ).html( '<canvas></canvas>' );
			var ctx = $( '#infoIcon canvas' )[ 0 ].getContext( '2d' );
			ctx.drawImage( $( '#color canvas' )[ 0 ], 0, 0 );
		}
		, ok         : () => {
			bash( [ 'color', 'reset', 'CMD HSL' ] );
			loader();
		}
	} );
} ).on( 'click', '#colorcancel', function() {
	$( '#colorpicker' ).remove();
	V.colorpicker.destroy();
	V.colorpicker   = false;
	V.colorelements.removeAttr( 'style' );
	V.colorelements = '';
	setPlaylistScroll();
	if ( S.player !== 'mpd' ) switchPage( 'playback' );
} );
$( '#library, #button-library' ).on( 'click', function() {
	if ( V.library ) {
		if ( V.search ) {
			$( '#lib-search-close' ).trigger( 'click' );
		} else if ( V.librarylist ) {
			libraryHome();
		}
	} else {
		switchPage( 'library' );
	}
	if ( S.updating_db ) banner( 'library blink', 'Library Database', 'Update ...' );
} );
$( '#playback' ).on( 'click', function() {
	if ( V.playback && ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).trigger( 'click' );
	} else {
		if ( ! V.playback ) {
			refreshData();
			switchPage( 'playback' );
		}
	}
} );
$( '#playlist, #button-playlist' ).on( 'click', function() {
	if ( V.playlist ) {
		if ( ! V.playlisthome ) playlistGet();
	} else {
		V.playlisthome ? playlistGet() : switchPage( 'playlist' );
	}
} );
$( '#bar-top' ).on( 'click', function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide ' );
} );
// PLAYBACK /////////////////////////////////////////////////////////////////////////////////////
$( '#info' ).on( 'click', function() {
	if ( localhost ) setInfoScroll();
} );
$( '.emptyadd' ).on( 'click', function() {
	$( '#library' ).trigger( 'click' );
} );
$( '#artist, #guide-bio' ).on( 'click', function() {
	bio( S.Artist );
} );
$( '#title, #guide-lyrics' ).on( 'click', function() {
	if ( S.lyrics
		&& ( ! S.webradio || ( S.state === 'play' && [ 'radiofrance', 'radioparadise' ].includes( S.icon ) ) )
	) {
		if ( S.Title.includes( '(' ) ) {
			bash( [ 'titlewithparen', S.Title, 'CMD TITLE' ], paren => {
				if ( paren == -1 ) {
					infoTitle();
				} else {
					S.scrobble && S.webradio ? infoTitle() : lyrics();
				}
			} );
		} else {
			S.scrobble && S.webradio ? infoTitle() : lyrics();
		}
	} else if ( S.Artist || S.Title ) {
		infoTitle();
	}
	
} );
$( '#album, #guide-booklet' ).on( 'click', function() {
	if ( V.press || localhost ) return
	
	var urllastfm  = 'https://www.last.fm/music/'+ S.Artist +'/'+ S.Album;
	if ( S.booklet ) {
		if ( typeof Android !== 'object' ) {
			var newwindow  = window.open( '', '_blank' ); // fix: popup blocked on mobile
			newwindow.location.href = '/mnt/MPD/'+ dirName( S.file ) +'/booklet.pdf';
		} else {
			info( {
				  icon    : 'booklet'
				, title   : 'Album Booklet'
				, message : ico( 'warning' ) +' View on Android with <wh>rAudio</wh> on <wh>Firefox</wh>.'
						  +'<br><br>Or continue with album on <wh>Last.fm</wh> ?'
				, oklabel : ico( 'lastfm' ) +'Album'
				, ok      : () => window.open( urllastfm, '_blank' )
			} );
		}
	} else {
		window.open( urllastfm, '_blank' );
	}
} );
$( '#infoicon' ).on( 'click', '.i-audiocd', function() {
	info( {
		  icon    : 'audiocd'
		, title   : 'Audio CD'
		, message : 'Eject and clear Audio CD tracks?'
		, oklabel : ico( 'flash' ) +'Eject'
		, okcolor : red
		, ok      : () => bash( [ 'audiocd.sh', 'ejecticonclick' ] )
	} );
} );
$( '#elapsed' ).on( 'click', function() {
	S.state === 'play' ? $( '#pause' ).trigger( 'click' ) : $( '#play' ).trigger( 'click' );
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
		intervalClear();
		$( '.map' ).removeClass( 'mapshow' );
		if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
	}
	, drag        : function ( e ) { // drag with no transition by default
		$( '#elapsed' ).text( second2HMS( e.value ) );
	}
	, change      : function( e ) { // not fire on 'setValue'
		intervalClear();
		mpcSeek( e.value );
	}
	, stop        : function() {
		V.drag = false;
	}
} );
$( '#time-band' ).on( 'touchstart mousedown', function() {
	if ( S.player !== 'mpd' || S.webradio ) return
	
	V.start = true;
	guideHide();
	intervalClear();
	if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.start ) return
	
	V.drag = true;
	mpcSeekBar( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.start ) return
	
	V.start = V.drag = false;
	mpcSeekBar( e.pageX || e.changedTouches[ 0 ].pageX );
} ).on( 'mouseleave', function() {
	V.start = V.drag = false;
} );
$( '#volume' ).roundSlider( {
	// init     : valueChange > create > beforeValueChange > valueChange
	// tap      : beforeValueChange > change > valueChange
	// drag     : start > [ beforeValueChange > drag > valueChange ] > change > stop
	// setValue : beforeValueChange > valueChange
	// angle    : this._handle1.angle (instaed of inconsistent e.handle.angle/e.handles[ 0 ].angle)
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
		V.create         = true;
		$volumeRS        = this;
		$volumetooltip   = $( '#volume .rs-tooltip' );
		$volumehandle    = $( '#volume .rs-handle' );
		$volumehandle_tr = $( '#volume .rs-handle, #volume .rs-transition' );
	}
	, start             : function( e ) {
		V.drag = true;
		if ( e.value === 0 ) volumeColorUnmute(); // restore handle color immediately on start drag
		$( '.map' ).removeClass( 'mapshow' );
	}
	, beforeValueChange : function( e ) {
		if ( V.local || V.drag ) return
		
		if ( S.volumemax && e.value > S.volumemax ) {
			banner( 'volumelimit', 'Volume Limit', 'Max: '+ S.volumemax );
			if ( S.volume === S.volumemax ) return false
			
			$volumeRS.setValue( S.volumemax );
			S.volume = S.volumemax;
			volumeSet();
			return false
		}
		
		if ( V.press ) {
			$volumehandle_tr.css( 'transition-duration', '100ms' );
			return
		}
		
		if ( 'volumediff' in V ) {
			var diff = V.volumediff;
			delete V.volumediff;
		} else {
			var diff  = Math.abs( e.value - S.volume || S.volume - S.volumemute ); // change || mute/unmute
		}
		V.animate = diff * 40; // 1% : 40ms
		$volumehandle_tr.css( 'transition-duration', V.animate +'ms' );
		setTimeout( () => {
			$volumehandle_tr.css( 'transition-duration', '100ms' );
			$( '#volume-knob' ).css( 'pointer-events', '' );
			V.animate = false;
		}, V.animate );
	}
	, drag              : function( e ) {
		S.volume = e.value;
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
		volumeSet();
	}
	, change            : function( e ) {
		if ( V.drag ) return
		
		S.volume = e.value;
		$( '#volume-knob' ).css( 'pointer-events', 'none' );
		volumeSet();
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
	}
	, valueChange       : function( e ) {
		if ( V.drag || ! V.create ) return // ! V.create - suppress fire before 'create'
		
		S.volume     = e.value;
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
		setVolumeUpDn();
		if ( S.volumemute ) volumeColorUnmute();
	}
	, stop              : () => {
		V.drag = false;
		volumePush();
		setVolumeUpDn()
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	guideHide();
	volumeBarHideClear();
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	var $this = $( this );
	V.volume  = {
		  current : S.volume
		, min     : $this.offset().left
		, width   : $this.width()
	}
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.volume ) return
	
	volumeBarHideClear();
	V.drag = true;
	volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
	$( '#volume-bar' ).css( 'width', V.volume.x );
	volumeSet();
} ).on( 'touchend mouseup', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) {
		volumeBarShow();
		return
	}
	
	if ( V.drag ) {
		volumePush();
	} else { // click
		volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
		volumeAnimate( S.volume, V.volume.current );
		volumeSet();
	}
	$volumeRS.setValue( S.volume );
	V.volume    = V.drag = false;
	volumeBarHide();
} ).on( 'mouseleave', function() {
	V.volume = V.drag = false;
} );
$( '#volmute, #volM' ).on( 'click', function() {
	volumeMuteToggle();
	V.local = false;
	setVolume();
} );
$( '#voldn, #volup, #volT, #volB, #volL, #volR, #volume-band-dn, #volume-band-up' ).on( 'click', function() {
	var $this = $( this );
	local();
	guideHide();
	volumeUpDown( $this.hasClass( 'up' ) );
	if ( $this.hasClass( 'band' ) ) $( '#volume-text, #volume-bar' ).removeClass( 'hide' );
} ).press( {
	  action   : e => { 
		volumeBarHideClear();
		if ( ! D.volume ) $( '#volume-bar, #volume-text' ).removeClass( 'hide' );
		var up = $( e.currentTarget ).hasClass( 'up' );
		V.interval.volume = setInterval( () => volumeUpDown( up ), 100 );
	}
	, end      : () => { // on end
		clearInterval( V.interval.volume );
		if ( D.volume ) {
			$( '#volume-text' ).text( S.volume );
			$( '#volume-bar' ).css( 'width', S.volume +'%' );
		} else {
			$volumeRS.setValue( S.volume );
			volumeBarHideClear();
			volumeBarHide();
		}
		volumePush();
	}
} );
$( '#volume-text' ).on( 'click', function() { // mute / unmute
	volumeBarHideClear();
	volumeAnimate( S.volumemute, S.volume );
	volumeMuteToggle();
} );
$( '#divcover' ).on( 'click', '.cover-save', function() {
	coverartSave();
} ).press( e => {
	if ( typeof Android === 'object' && e.target.id === 'coverT' ) {
		changeIP();
		return
	}
	
	if ( ! S.pllength
		|| V.guide
		|| ( S.webradio && S.state === 'play' )
		|| [ 'time-band', 'volume-band' ].includes( e.target.id )
	) return
	
	S.webradio ? thumbnail() : coverartChange();
} );
$( '#coverT' ).press( () => {
	if ( typeof Android === 'object' ) changeIP();
} );
var btnctrl = {
	  TL : 'cover'
	, T  : 'guide'
	, TR : 'settings'
	, L  : 'previous'
	, M  : 'play'
	, R  : 'next'
	, BL : 'random'
	, B  : 'stop'
	, BR : 'repeat'
}
$( '#map-cover .map' ).on( 'click', function( e ) {
	e.stopPropagation();
	if ( V.press ) return
	
	if ( $( '#info' ).hasClass( 'hide' ) ) {
		$( '#info' ).removeClass( 'hide' );
		volumeBarHideClear();
		volumeBarHide( 'nodelay' );
		return
		
	} else if ( 'screenoff' in V ) {
		delete V.screenoff;
		return
	}
	
	var cmd = btnctrl[ this.id.replace( /[a-z]/g, '' ) ];
	if ( cmd === 'guide' ) {
		volumeBarHideClear();
		if ( V.guide ) {
			guideHide();
			return
		}
		
		V.guide    = true;
		var time   = $time.is( ':visible' );
		var volume = $volume.is( ':visible' );
		$( '#coverTR' ).removeClass( 'empty' );
		$( '.mapcover, .guide' ).addClass( 'mapshow' );
		if ( S.pllength ) {
			$( '#guide-bio' ).toggleClass( 'hide', S.Artist === '' );
			$( '#guide-lyrics' ).toggleClass( 'hide', S.Artist === '' || S.Title === '' );
			$( '#guide-booklet' ).toggleClass( 'hide', S.Album === '' );
		} else {
			$( '#guide-bio, #guide-lyrics, #guide-booklet' ).addClass( 'hide' );
		}
		$( '#coverL, #coverM, #coverR, #coverB' ).toggleClass( 'disabled', S.pllength === 0 );
		$( '.maptime' ).toggleClass( 'mapshow', ! D.cover );
		$( '.mapvolume' ).toggleClass( 'mapshow', volume );
		$( '#bar-bottom' ).toggleClass( 'translucent', ! barVisible() );
		if ( S.player === 'mpd' ) {
			if ( ! time && ! S.webradio ) {
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
	
	guideHide();
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
					$( '#volume-band' ).trigger( 'click' );
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
			displayBars();
			displayPlayback();
			setButtonOptions();
			if ( S.state === 'play' && ! S.webradio && ! localhost ) {
				setProgress();
				setTimeout( setProgressAnimate, 0 );
			}
			if ( 'coverTL' in V && ! D.cover ) $( '#map-time' ).removeClass( 'hide' );
			break;
		case 'settings':
			$( '#button-settings' ).trigger( 'click' );
			break;
		case 'repeat':
			if ( S.repeat ) {
				if ( S.single ) {
					[ 'repeat', 'single' ].forEach( option => {
						S[ option ] = false;
						bash( [ 'mpcoption', option, false, 'CMD OPTION TF' ] );
					} );
					setButtonOptions();
				} else {
					$( '#single' ).trigger( 'click' );
				}
			} else {
				$( '#repeat' ).trigger( 'click' );
			}
			break
		default:
			if ( cmd === 'play' && S.state === 'play' ) cmd = ! S.webradio ? 'pause' : 'stop';
			$( '#'+ cmd ).trigger( 'click' );
	}
} );
$( '.btn-cmd' ).on( 'click', function() {
	if ( V.press || ws.readyState !== 1 ) return // fix - missing elapsed if ws closed > reconnect
	
	var cmd   = this.id;
	if ( S.player === 'mpd' && S.state === cmd ) return
	
	if ( $( this ).hasClass( 'btn-toggle' ) ) {
		var tf   = ! S[ cmd ];
		S[ cmd ] = tf;
		bash( [ 'mpcoption', cmd, tf, 'CMD OPTION TF' ] );
		setButtonOptions();
		local( 600 );
	} else {
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ cmd ).addClass( 'active' );
		if ( cmd === 'play' ) {
			var stateprev = S.state;
			S.state = cmd;
			vu();
			setPlayPauseColor();
			if ( stateprev === 'stop' ) {
				S.webradio ? $( '#title, #elapsed' ).html( V.blinkdot ) : $( '#elapsed' ).empty();
				$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
				$( '#total' ).text( V.timehms );
			}
			bash( [ 'mpcplayback', 'play', 'CMD ACTION' ] );
		} else if ( cmd === 'stop' ) {
			S.state = cmd;
			intervalElapsedClear();
			setPlaybackStop();
			if ( S.player !== 'mpd' ) {
				bash( [ 'playerstop', S.elapsed, 'CMD ELAPSED' ] );
				banner( S.player, icon_player[ S.player ], 'Stop ...' );
				return
			}
			
			if ( S.pllength ) bash( [ 'mpcplayback', 'stop', 'CMD ACTION' ] );
		} else if ( cmd === 'pause' ) {
			if ( S.state === 'stop' ) return
			
			S.state = cmd;
			intervalElapsedClear();
			setPlayPauseColor();
			bash( [ 'mpcplayback', 'pause', 'CMD ACTION' ] );
		} else if ( cmd === 'previous' || cmd === 'next' ) {
			if ( S.pllength < 2 ) return
			
			if ( S.random && cmd === 'next' ) { // previous in random = repeat
				var current = S.song;
				S.song = Math.floor( Math.random() * S.pllength ); // S.song: index from 0 to ( S.pllength - 1 )
				if ( S.song === current ) S.song = current === S.pllength - 1 ? 0 : current + 1; // last track: 0, else: +1
			} else {
				cmd == 'next' ? S.song++ : S.song--;
				if ( S.song < 0 ) {
					S.song = S.pllength - 1;
				} else if ( S.song === S.pllength ) {
					S.song = 0;
				}
			}
			playlistSkip();
		}
	}
} );
$( '#previous, #next, #coverR, #coverL' ).press( e => {
	var next = [ 'next', 'coverR' ].includes( e.target.id );
	if ( ( next && S.song + 1 === S.pllength ) || ( ! next && S.song === 0 ) ) return
	
	banner( 'playlist', 'Playlist', 'Skip to '+ ( next ? 'last ...' : 'first ...' ) );
	S.song   = next ? S.pllength - 1 : 0;
	playlistSkip();
} );
$( '#bio' ).on( 'click', '.biosimilar', function() {
	bio( $( this ).text(), 'getsimilar' );
} ).on( 'click', '.bioback', function() {
	V.bioartist.pop();
	var getsimilar = V.bioartist.length > 1 ? 'getsimilar' : '';
	bio( V.bioartist.pop(), getsimilar );
} ).on( 'click', '.i-close', function() {
	V.bioartist = [];
	$( '#bio' ).addClass( 'hide' );
	if ( 'observer' in V ) V.observer.disconnect();
} );
// LIBRARY /////////////////////////////////////////////////////////////////////////////////////
$( '#lib-title' ).on( 'click', 'a', function() {
	V.query  = [];
	delete V.gmode;
	if ( V.query.length > 1 ) V.scrolltop[ V.query.slice( -1 )[ 0 ].modetitle ] = $( window ).scrollTop();
	var path = $( this ).find( '.lidir' ).text();
	if ( modeRadio() ) {
		var query = {
			  library : 'radio'
			, string  : path
		}
	} else {
		var query = {
			  library : 'ls'
			, string  : path
		}
	}
	query.gmode = V.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path === '/srv/http/data/'+ V.mode ? V.mode.toUpperCase() : path
			, path      : path
		}
		renderLibraryList( data );
	} );
} ).on( 'click', '.button-webradio-new', function() {
	webRadioNew();
} ).on( 'click', '.button-latest-clear', function() {
	if ( V.librarytrack ) {
		info( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear from Latest album list:<br><br>'+ $( '.licover .lialbum' ).text()
			, ok           : () => {
				bash( [ 'latestclear', $( '.licover .lipath' ).text(), 'CMD DIR' ], () => $( '#button-lib-back' ).trigger( 'click' ) );
			}
		} );
	} else {
		info( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear Latest albums list?'
			, ok           : () => bash( [ 'latestclear' ], () => $( '#library' ).trigger( 'click' ) )
		} );
	}
} ).on ( 'click', '#thumbupdate', function() {
	thumbnailUpdate( 'modealbum' );
} );
$( '#button-lib-update' ).on( 'click', function() {
	if ( S.updating_db ) {
		info( {
			  icon    : 'refresh-library'
			, title   : 'Library Database'
			, message : 'Currently updating ...'
			, oklabel : ico( 'flash' ) +'Stop'
			, okcolor : orange
			, ok      : () => bash( [ 'mpcupdatestop' ] )
		} );
		return
	}
	
	var modes   = [ 'NAS', 'SD', 'USB' ];
	var message = '';
	modes.forEach( k => {
		message += sp( 20 ) +'<label><input type="checkbox"><i class="i-'+ k.toLowerCase() +'"></i>'+ k +'</label>';
	} );
	var kv   = {
		  'Update changed files'    : 'update'
		, 'Update all files'        : 'rescan'
	}
	info( {
		  icon       : 'refresh-library'
		, title      : 'Library Database'
		, message    : message +'&ensp;<hr>'
		, list       : [
			  [ '',                   'radio', { kv: kv, sameline: false } ]
			, [ 'Append Latest list', 'checkbox' ]
		]
		, values     : { NAS: C.nas, SD: C.sd, USB: C.usb, ACTION: 'update', LATEST: false }
		, beforeshow : () => {
			if ( ! C.latest ) $( '#infoList input' ).last().prop( 'disabled', true );
		}
		, ok         : () => {
			var val = infoVal();
			var path = '';
			if ( val.ACTION !== 'refresh' ) {
				var modes = [];
				modes.forEach( k => {
					if ( val[ k ] ) modes.push( k );
				} );
				if ( modes.length < 3 ) path = modes.join( ' ' );
			}
			bash( [ 'mpcupdate', val.ACTION, path, val.LATEST, 'CMD ACTION PATHMPD LATEST' ] );
		}
	} );
} );
$( '#button-lib-search' ).on( 'click', function() {
	if ( $( '#lib-search' ).hasClass( 'hide' ) ) {
		$( '#page-library .content-top .title, #button-lib-back, #button-lib-update' ).addClass( 'hide' );
		$( '#page-library .search:not( i )' ).removeClass( 'hide' );
		$( '#lib-title, #lib-search-close' ).empty();
		$( '#lib-search-input' ).trigger( 'focus' );
		return
	}
	
	var keyword = $( '#lib-search-input' ).val();
	if ( ! keyword || keyword === $( '#lib-title' ).text() ) return
	
	var query = {
		  library : 'search'
		, string  : keyword
		, format  : [ 'album', 'albumartist', 'artist', 'file', 'title', 'time', 'track' ]
	}
	list( query, function( data ) {
		if ( data == -1 ) {
			info( {
				  icon    : 'library'
				, title   : 'Library Search'
				, message : 'Nothing found for <wh>'+ keyword +'</wh>'
				, ok      : () => $( '#lib-search-input' ).trigger( 'focus' )
			} );
			return
		}
		
		V.search      = true;
		V.librarylist = true;
		$( '#search-list' ).remove();
		$( '#page-library' ).append( data.html ).promise().done( () => {
			renderLibraryPadding();
			pageScroll( 0 );
			$( '#lib-title' )
					.html( ico( 'search' ) + keyword )
					.removeClass( 'hide' );
		} );
		$( '#button-lib-back, #lib-mode-list' ).addClass( 'hide' );
		$( '#lib-search-close' ).html( data.count +' <gr>of</gr>' );
	}, 'json' );
} );
$( '#page-library' ).on( 'click', '.index.modes i', function() {
	if ( ! $( this ).index() ) {
		pageScroll( 0 );
		return
	}
	
	var mode   = this.className.replace( 'i-', '' );
	var scroll = $( '#search-list li[data-mode='+ mode +']' ).eq( 0 ).offset().top;
	scroll    -= $( '.content-top' )[ 0 ].getBoundingClientRect().bottom;
	pageScroll( scroll );
} );
$( '#lib-search-close' ).on( 'click', function() {
	libraryHome();
} );
$( '#lib-search-input' ).on( 'input', function() {
	if ( ! V.search ) return
	
	var kL = $( '#lib-search-input' ).val().length;
	if ( kL > 2 ) {
		$( '#button-lib-search' ).trigger( 'click' );
	} else if ( ! kL ) {
		V.search = false;
		$( '#lib-title, #lib-search-close' ).empty();
		$( '#search-list, .index.modes' ).remove();
	}
} );
$( '#button-lib-back' ).on( 'click', function() {
	if ( V.search ) {
		$( '#lib-list' ).remove();
		$( '#button-lib-back' ).addClass( 'hide' );
		$( '#lib-title' ).html( ico( 'search' ) + $( '#lib-search-input' ).val() );
		$( '#lib-search, #button-lib-search, #search-list' ).removeClass( 'hide' );
		return
	}
	
	var $target = '';
	if ( modeAlbum() ) {
		$target = $( '.licover' ).length ? $( '.mode.'+ V.mode ) : $( '#library' );
	} else if ( modeFile( 'radio' ) ) {
		var $breadcrumbs = $( '#lib-title a' );
		$target = $breadcrumbs.length > 1 ? $breadcrumbs.eq( -2 ) : $( '#library' );
	} else if ( V.query.length === 1 && ! modeRadio() ) {
		$target = $( '#library' );
	}
	if ( $target ) {
		$target.trigger( 'click' );
		return
	}
	
	V.scrolltop[ $( '#lib-path' ).text() ] = $( window ).scrollTop();
	V.query.pop();
	var query = V.query.slice( -1 )[ 0 ];
	if ( 'gmode' in query ) V.mode = query.gmode;
	list( query, function( html ) {
		if ( 'gmode' in V && V.gmode !== V.mode ) V.mode = V.gmode;
		var data = {
			  html      : html
			, modetitle : query.modetitle
			, path      : query.path
		}
		renderLibraryList( data );
	} );
} );
$( '#lib-mode-list' ).on( 'click', '.mode:not( .bookmark, .bkradio, .edit, .nodata )', function() {
	if ( V.press ) return
	
	V.mode          = $( this ).data( 'mode' );
	V.modescrolltop = $( window ).scrollTop();
	if ( V.mode === 'playlists' ) {
		$( '#button-pl-playlists' ).trigger( 'click' );
		setTimeout( () => $( '#playlist' ).trigger( 'click' ), 100 );
		return
	}
	
	var moderadio = modeRadio();
	var path      = V.mode.toUpperCase();
	// V.modes: sd, nas, usb, webradio, dabradio, album, latest, artist, albumartist, composer, conductor, genre, playlists
	// ( coverart, bookmark by other functions )
	if ( modeFile() ) { // browse by directory
		var query = {
			  library : 'ls'
			, string  : path
		}
	} else if ( moderadio ) {
		var pathradio = '/srv/http/data/'+ V.mode;
		var query = {
			  library : 'radio'
			, string  : pathradio
		}
	} else { // browse by modes
		var query = {
			  library : 'list'
			, mode    : V.mode
			, format  : [ V.mode ]
		}
	}
	query.gmode = V.mode;
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : moderadio ? pathradio : path
		}
		renderLibraryList( data );
	} );
	query.path      = moderadio ? '' : path;
	query.modetitle = path;
	V.query.push( query );
} ).on( 'click', '.bkradio', function( e ) { // delegate - id changed on renamed
	if ( V.press || $( '.bkedit' ).length ) return
	
	if ( D.tapaddplay || D.tapreplaceplay ) {
		tapAddReplace( $( this ) );
		return
	}
	
	var $this    = $( this );
	var $img     = $this.find( '.bkcoverart' );
	var icon     = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : ico( 'bookmark bl' );
	var path     = $this.find( '.lipath' ).text();
	V.list.name  = $this.find( '.name' ).text();
	info( {
		  icon       : 'playlist'
		, title      : 'Add to Playlist'
		, message    : icon +'<br><wh>'+ V.list.name +'</wh><a class="li2 hide">'+ path +'</a>'
		, list       : '<div class="menu">'+ $( '#menu-bkradio' ).html() +'</div>'
		, beforeshow : () => {
			$( '#infoList' ).find( '.playnext, .replace, .i-play-replace' ).toggleClass( 'hide', S.pllength === 0 );
			$( '#infoList' ).find( '.playnext' ).toggleClass( 'hide', S.state !== 'play' );
			$( '#infoList' ).on( 'click', '.menu a, .menu .submenu', function() {
				V.action = $( this ).data( 'cmd' );
				V.mpccmd = V.action === 'playnext' ? [ 'mpcaddplaynext', path ] : [ 'mpcadd', path ];
				addToPlaylist();
			} );
		}
		, okno      : true
	} );
} ).on( 'click', '.mode.bookmark:not( .bkradio )', function( e ) { // delegate - id changed on renamed
	if ( V.press || $( '.bkedit' ).length ) return
	
	var path  = $( this ).find( '.lipath' ).text();
	V.mode    = path.slice( 0, 4 ) === '/srv' ? path.slice( 15, 23 ) : path.split( '/' )[ 0 ].toLowerCase();
	if ( V.mode === 'webradio' ) {
		var library = 'radio';
	} else {
		var library = 'ls';
	}
	var query = {
		  library : library
		, string  : path
		, gmode   : V.mode
	}
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
	var name  = $this.find( '.name' ).text();
	var $img  = $this.find( 'img' );
	if ( $img.length ) {
		var icon = '<img src="'+ $img.attr( 'src' ) +'">'
	} else {
		var icon = ico( 'bookmark bl' )
				  +'<br><a class="bklabel">'+ name +'</a>'
	}
	info( {
		  icon    : 'bookmark'
		, title   : 'Remove Bookmark'
		, message : icon
		, oklabel : ico( 'remove' ) +'Remove'
		, okcolor : red
		, ok      : () => bash( [ 'bookmarkremove', name, 'CMD NAME' ] )
	} );
} ).on( 'click', '.bk-rename', function() {
	var $this = $( this ).parent();
	var name  = $this.find( '.name' ).text();
	info( {
		  icon         : 'bookmark'
		, title        : 'Rename Bookmark'
		, message      : '<div class="infobookmark">'+ ico( 'bookmark bookmark' )
						+'<br><span class="bklabel">'+ name +'</span></div>'
		, list         : [ 'To:', 'text' ]
		, values       : name
		, checkblank   : true
		, checkchanged : true
		, oklabel      : ico( 'flash' ) +'Rename'
		, ok           : () => bash( [ 'bookmarkrename', name, infoVal(), 'CMD NAME NEWNAME' ] )
	} );
} ).on( 'click', '.bk-cover', function() {
	var $this = $( this ).parent();
	var name  = $this.find( '.name' ).text();
	var thumbnail = $this.find( 'img' ).length;
	if ( thumbnail ) {
		var icon    = 'coverart';
		var message = '<img class="imgold" src="'+ $this.find( 'img' ).attr( 'src' ) +'">'
					 +'<p class="infoimgname">'+ name +'</p>';
	} else {
		var icon    = 'bookmark';
		var message = '<div class="infobookmark">'+ ico( 'bookmark' )
					 +'<span class="bklabel">'+ name +'</span></div>';
	}
	var dir   = '/mnt/MPD/'+ $this.find( '.lipath' ).text();
	info( {
		  icon        : icon
		, title       : 'Bookmark Thumbnail'
		, message     : message
		, file        : { oklabel: ico( 'flash' ) +'Replace', type: 'image/*' }
		, buttonlabel : ! thumbnail ? '' : ico( 'bookmark' ) +' Icon'
		, buttoncolor : ! thumbnail ? '' : orange
		, button      : ! thumbnail ? '' : () => {
			bash( [ 'cmd-coverart.sh', 'reset', 'folderthumb', dir, 'CMD TYPE DIR' ] );
		}
		, ok          : () => {
			imageReplace( 'bookmark', dir +'/coverart' );
		}
	} );
} ).on( 'click', '.dabradio.nodata', function() {
	infoDabScan();
} ).press( {
	  delegate : '.mode.bookmark'
	, action   : () => {
		if ( V.sortable ) return
		
		V.bklabel = $( this ).find( '.label' );
		$( '.mode.bookmark' ).each( ( i, el ) => {
			var $this      = $( el );
			var buttonhtml = ico( 'remove bkedit bk-remove' );
			if ( ! $this.find( 'img' ).length )  buttonhtml += ico( 'edit bkedit bk-rename' );
			if ( ! $this.hasClass( 'bkradio' ) ) buttonhtml += ico( 'coverart bkedit bk-cover' );
			$this.append( buttonhtml );
		} );
		$( '.mode.bookmark' ).addClass( 'edit' );
	}
} );
$( '#page-library' ).on( 'click', '#lib-list .coverart', function() {
	if ( V.press ) return
	
	V.scrolltop[ 'ALBUM' ] = $( window ).scrollTop();
	var $this = $( this );
	var path  = $this.find( '.lipath' ).text();
	var query = {
		  library : 'ls'
		, gmode   : path.replace( /\/.*/, '' ).toLowerCase()
		, mode    : 'album'
		, string  : path
	}
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : $this.find( '.liname' ).text()
			, path      : path
		}
		renderLibraryList( data );
	} );
	V.query.push( query );
} ).press( {
	  delegate : '.coverart'
	, action   : function( e ) {
		var $this  = $( e.currentTarget );
		info( {
			  icon    : V.icoverart
			, title   : capitalize( V.mode ) +' Thumbnail'
			, message : $this.find( 'img' )[ 0 ].outerHTML
						+'<p>'+ $this.find( '.coverart1' ).text()
						+'<br>'+ $this.find( '.coverart2' ).text()
						+'</p>'
						+'<br>Remove this thumbnail from list?'
			, okcolor : orange
			, oklabel : ico( 'remove' ) +'Exclude'
			, ok      : () => {
				bash( [ 'albumignore', album, artist, 'CMD ALBUM ARTIST' ] );
				$this.remove();
			}
		} );
	}
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
} ).press( {
	  delegate : '.licoverimg'
	, action   : function( e ) {
		var $this = $( e.currentTarget );
		$this.parent().removeClass( 'active' );
		$( '#menu-album' ).addClass( 'hide' );
		coverartChange();
	}
} ).on( 'click', '#lib-list li, #search-list li', function( e ) {
	e.stopPropagation();
	if ( V.press ) return
	
	var $this       = $( this );
	var $target     = $( e.target );
	if ( $target.is( '.i-save, .coverart' ) ) return
	
	var l_mode      = $this.data( 'mode' );
	var l_modefile  = [ 'nas', 'sd', 'usb' ].includes( l_mode );
	var l_moderadio = l_mode.slice( -5 ) === 'radio'; // radio .dir has no mode
	if ( $target.is( '.li-icon, .licoverimg' )
		|| $target.data( 'menu' )
		|| $this.find( '.i-music' ).length
		|| l_moderadio
	) {
		contextmenuLibrary( $this, $target );
		return
	}
	
	if ( D.tapaddplay || D.tapreplaceplay ) {
		if ( $this.find( '.li-icon' ).is( '.i-music' ) || l_moderadio ) {
			tapAddReplace( $this );
			return
		}
	}
	
	menuHide();
	if ( $this.hasClass( 'licover' ) ) {
		if ( $target.is( '.liartist, .i-artist, .i-albumartist, .licomposer, .i-composer' ) ) {
			var name = ( $target.is( '.licomposer, .i-composer' ) ) ? $this.find( '.licomposer' ).text() : $this.find( '.liartist' ).text();
			bio( name );
		} else if ( $target.hasClass( 'liinfopath' ) ) {
			V.gmode     = V.mode;
			var path    = $target.text();
			V.mode      = path.replace( /\/.*/, '' ).toLowerCase();
			var query   = {
				  library : 'ls'
				, string  : path
				, gmode   : V.mode
			}
			list( query, function( html ) {
				var data = {
					  html      : html
					, modetitle : path
					, path      : path
				}
				renderLibraryList( data );
			} );
		}
		return
	}
	
	if ( $target.hasClass( 'lialbum' ) ) {
		if ( ! localhost ) window.open( 'https://www.last.fm/music/'+ $this.find( '.liartist' ).text() +'/'+ $this.find( '.lialbum' ).text(), '_blank' );
		return
	}
	
	if ( ! V.search ) $this.addClass( 'active' );
	var libpath    = $( '#lib-path' ).text();
	var path       = $this.find( '.lipath' ).text();
	if ( l_modefile ) {
		var query     = {
			  library : 'ls'
			, string  : path
		}
		var modetitle = modeFile( 'radio' ) ? path : libpath; // keep title of non-file modes
	} else if ( modeRadio() ) { // dabradio, webradio
		path          = libpath +'/'+ path;
		var query     = {
			  library : 'radio'
			, string  : path
		}
		var modetitle = path;
	} else if ( ! V.search && V.mode.slice( -6 ) === 'artist' ) {
		var query     = {
			  library : 'findartist'
			, mode    : V.mode
			, string  : path
			, format  : [ 'album', 'file' ]
		}
		var modetitle = path;
	} else if ( l_mode !== 'album' ) { // non-album
		if ( [ 'date', 'genre' ].includes( V.mode ) ) {
			var format = [ 'artist', 'album' ];
		} else if ( [ 'conductor', 'composer' ].includes( V.mode ) ) {
			var format = [ 'album', 'artist' ];
		}
		var query     = {
			  library : 'find'
			, mode    : V.search ? l_mode : V.mode
			, string  : path
			, format  : format
		}
		var modetitle = path;
	} else { // album
		var name = $this.find( '.liname' ).text();
		if ( modeAlbum() ) {
			if ( name ) { // albums with the same names
				var query     = {
					  library : 'find'
					, mode    : [ 'album', 'artist', 'file' ]
					, string  : [ name, path ]
				}
				var modetitle = name;
			} else {
				var query     = {
					  library : 'find'
					, mode    : 'album'
					, string  : path
					, format  : [ 'album', 'artist' ]
				}
				var modetitle = path;
			}
		} else if ( V.search ) {
			var query     = {
				  library : 'ls'
				, string  : path
			}
			var modetitle = '';
		} else {
			var query     = {
				  library : 'find'
				, mode    : [ 'album', V.mode ]
				, string  : [ name, libpath ]
			}
			var modetitle = libpath;
		}
	}
	V.scrolltop[ libpath ] = $( window ).scrollTop();
	query.gmode            = V.mode;
	list( query, function( html ) {
		if ( ! html ) {
			$this
				.removeClass( 'active' )
				.addClass( 'nodata' );
			contextmenuLibrary( $this, $target );
			return
		}
		
		var data = {
			  html      : html
			, modetitle : modetitle
			, path      : path
		}
		renderLibraryList( data );
	} );
	query.path      = path;
	query.modetitle = modetitle;
	V.query.push( query );
} );
$( '.page' ).on( 'click', 'a.indexed', function() {
	var $this = $( this );
	var index = $this.text();
	if ( index.length > 1 ) {
		index = $this.hasClass( 'r' ) ? index[ 1 ] : index[ 0 ];
		$this.toggleClass( 'r' );
	}
	if ( index === '#' ) {
		var scrollT = 0;
	} else {
		if ( V.library ) {
			var el = '#lib-list '+ ( V.albumlist ? '.coverart' : 'li' );
		} else {
			var el = '#pl-savedlist li';
		}
		var $el = $( el +'[data-index='+ index +']' );
		if ( ! $el.length ) {
			$this.trigger( 'click' );
			return
		}
		
		var scrollT = $el.offset().top;
	}
	pageScroll( scrollT - barVisible( 80, 40 ) );
} );
// PLAYLIST /////////////////////////////////////////////////////////////////////////////////////
$( '#button-pl-back' ).on( 'click', function() {
	if ( 'pladd' in V ) {
		I.active  = false;
		playlistGet();
		bannerHide();
	} else {
		V.playlistlist ? playlistGet() : $( '#button-pl-playlists' ).trigger( 'click' );
	}
} );
$( '#button-pl-consume' ).on( 'click', function() {
	S.consume = ! S.consume;
	$( this ).toggleClass( 'bl', S.consume );
	banner( 'playlist', 'Consume Mode', S.consume ? 'On - Remove each song after played.' : 'Off' );
	bash( [ 'mpcoption', 'consume', S.consume, 'CMD OPTION TF' ] );
} );
$( '#button-pl-librandom' ).on( 'click', function() {
	var $this = $( this );
	var icon  = 'librandom';
	var title = 'Roll The Dice';
	if ( S.librandom ) {
		S.librandom = false;
		$this.removeClass( 'bl' );
		banner( icon, title, 'Off ...' );
		bash( [ 'librandom', 'OFF' ] );
	} else {
		info( {
			  icon       : icon
			, title      : title
			, message    : 'Randomly add and play continuously.'
			, list       : '<div class="menu">'
						  +'<a class="sub cmd"><i class="i-music"></i>Songs</a><i class="i-play-plus submenu cmd play"></i>'
						  +'<a class="sub cmd album"><i class="i-album"></i>Albums</a><i class="i-play-plus submenu cmd album"></i>'
						  +'</div>'
			, values     : [ true ]
			, beforeshow : () => {
				$( '#infoList .album' ).toggleClass( 'hide', C.album < 2 );
				$( '#infoList' ).on( 'click', '.cmd', function() {
					$( '#infoX' ).trigger( 'click' );
					S.librandom = true;
					$this.addClass( 'bl' );
					var action  = $( this ).hasClass( 'submenu' ) ? 'play' : '';
					var album   = $( this ).hasClass( 'album' );
					banner( icon, title, 'On ...' );
					bash( [ 'librandom', action, album, 'CMD ACTION ALBUM' ] );
				} );
			}
			, okno      : true
		} );
	}
} );
$( '#button-pl-shuffle' ).on( 'click', function() {
	info( {
		  icon    : 'shuffle'
		, title   : 'Shuffle Playlist'
		, message : 'Shuffle all tracks in playlist?'
		, ok      : () => bash( [ 'mpcshuffle' ] )
	} );
} );
$( '#button-pl-clear' ).on( 'click', function() {
	if ( S.pllength === 1 ) {
		bash( [ 'mpcremove' ] );
		renderPlaylist();
	} else if ( $( '.pl-remove' ).length ) {
		$( '.pl-remove' ).remove();
	} else {
		info( {
			  icon       : 'playlist'
			, title      : 'Remove From Playlist'
			, list       : [ '', 'radio', { 
				  kv       : {
					  '<i class="i-flash red"></i> All'        : 'all'
					, '<i class="i-cursor"></i>    Select ...' : 'select'
					, '<i class="i-track"></i>     Range ...'  : 'range'
					, '<i class="i-crop yl"></i>   Crop'       : 'crop'
				}
				, sameline : false
			} ]
			, beforeshow : () => {
				$( '#infoList input' ).on( 'input', function() {
					var cmd = $( '#infoList input:checked' ).val();
					switch ( cmd ) {
						case 'select':
							$( '#pl-list .li1' ).before( ico( 'remove pl-remove' ) );
							$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
							infoButtonCommand();
							local();
							break;
						case 'range':
							playlistRemoveRange();
							break;
						case 'crop':
							bash( [ 'mpccrop' ] );
							$( '#pl-list li:not( .active )' ).remove();
							$( '#infoX' ).trigger( 'click' );
							break;
					}
				} );
			}
			, ok         : () => {
				bash( [ 'mpcremove' ] );
				setPlaybackBlank();
				renderPlaylist();
			}
		} );
	}
} );
$( '#button-pl-save' ).on( 'click', function() {
	var audiocdL  = $( '#pl-list .i-audiocd' ).length;
	var upnpL     = $( '#pl-list .i-upnp' ).length;
	var notsavedL = $( '#pl-list .notsaved' ).length;
	if ( audiocdL || upnpL ) {
		message = 'Saved playlist cannot contain:<br>'
				+ audiocdL ? audiocdL + ico( 'audiocd wh' ) : ''
				+ upnpL ? upnpL +'&emsp;'+ ico( 'upnp wh' ) : ''
				+ notsavedL ? notsavedL +'&emsp;'+ ico( 'save wh' ) : ''
		infoWarning( 'playlists', 'Save Playlist', message );
	} else {
		playlistNew();
	}
} );
$( '#button-pl-playlists' ).on( 'click', function() {
	pageScroll( 0 );
	list( { playlist: 'list' }, ( data ) => renderSavedPl( data ), 'json' );
} );
$( '#button-pl-search' ).on( 'click', function() {
	if ( ! $( '#pl-search' ).hasClass( 'hide' ) ) return
		
	$( '#page-playlist .search' ).removeClass( 'hide' );
	$( '#pl-manage' ).addClass( 'hide' );
	$( '#pl-search-input' ).trigger( 'focus' );
} );
$( '#pl-search-input' ).on( 'input', function() {
	var keyword = $( '#pl-search-input' ).val();
	var regex   = new RegExp( keyword, 'ig' );
	var count   = 0;
	$( '#pl-list li' ).each( ( i, el ) => {
		var $this = $( el );
		var name  = $this.find( '.li1 .name' ).text();
		var ar_al = $this.find( '.ar_al' ).text();
		var txt   = name + ar_al;
		if ( txt.search( regex ) !== -1 ) {
			count++;
			name  = name.replace( regex, function( match ) { return '<bll>'+ match +'</bll>' } );
			ar_al = ar_al.replace( regex, function( match ) { return '<bll>'+ match +'</bll>' } );
			$this.find( '.name' ).html( name );
			$this.find( '.ar_al' ).html( ar_al );
			$this.removeClass( 'hide' );
		} else {
			$this.addClass( 'hide' );
		}
	} );
	pageScroll( 0 );
	$( '#pl-search-close' ).html( keyword ? count +' <gr>of</gr>' : '' );
} );
$( '#pl-search-close' ).on( 'click', function() {
	$( '#page-playlist .search' ).addClass( 'hide' );
	$( '#pl-manage, #pl-list li' ).removeClass( 'hide' );
	$( '#pl-search-close' ).empty();
	$( '#pl-search-input' ).val( '' );
	$( '#pl-list' ).html( function() {
		return $( this ).html().replace( /<bll>|<\/bll>/g, '' );
	} )
} );
$( '#pl-list' ).on( 'click', 'li', function( e ) {
	if ( 'plrange' in V ) {
		var pos     = $( this ).index() + 1;
		var inrange = V.rangei ? pos > V.plrange[ 0 ] : pos < V.plrange[ 1 ];
		inrange ? V.plrange[ V.rangei ] = pos : V.plrange = [ pos, pos ];
		playlistRemoveRange( V.plrange );
		delete V.rangei;
		return
	}
	
	e.stopPropagation();
	$target = $( e.target );
	if ( $target.is( '.i-save, .li-icon, .pl-remove' ) ) return
	
	var $this = $( this );
	if ( ! [ 'mpd', 'upnp' ].includes( S.player ) ) {
		$this.find( '.li-icon' ).trigger( 'click' );
		return
	}
	
	var $liactive  = $( '#pl-list li.active' );
	$( '#menu-plaction' ).addClass( 'hide' );
	$liactive.find( '.song' ).empty();
	if ( $this.hasClass( 'active' ) ) {
		if ( S.state === 'play' ) {
			if ( S.webradio ) {
				$liactive.removeClass( 'play' );
				$liactive.find( '.elapsed' ).empty();
				setPlaylistRadioInfo( 'stop' );
				$( '#stop' ).trigger( 'click' );
			} else {
				$( '#pause' ).trigger( 'click' );
				$this.find( '.elapsed i' ).toggleClass( 'i-play i-pause' );
			}
		} else {
			$( '#play' ).trigger( 'click' );
		}
	} else {
		intervalClear();
		$( '.elapsed' ).empty();
		bash( [ 'mpcskippl', $this.index() + 1, 'play', 'CMD POS ACTION' ] );
		$( '#pl-list li.active, #playback-controls .btn' ).removeClass( 'active' );
		$this.add( '#play' ).addClass( 'active' );
	}
} ).on( 'click', '.li-icon, .savewr', function() {
	if ( 'plrange' in V ) return
	
	var $this     = $( this );
	var $thisli   = $this.parent();
	var webradio  = $this.hasClass( 'webradio' );
	V.list        = {};
	V.list.li     = $thisli;
	V.list.path   = $thisli.find( '.lipath' ).text();
	V.list.name   = $thisli.find( webradio ? '.liname' : '.name' ).eq( 0 ).text();
	V.list.index  = $thisli.index();
	var $menu = $( '#menu-plaction' );
	var menushow  = ! $menu.hasClass( 'hide' );
	var updn = $thisli.hasClass( 'updn' );
	menuHide();
	$( '.pl-remove' ).remove();
	if ( menushow && updn ) return
	
	var state     = S.state;
	var play      = state === 'play';
	var active    = $thisli.hasClass( 'active' );
	var audiocd   = $thisli.hasClass( 'audiocd' );
	var notsaved  = $thisli.hasClass( 'notsaved' );
	var upnp      = $thisli.hasClass( 'upnp' );
	$thisli.addClass( 'updn' );
	$( '#menu-plaction a' ).removeClass( 'hide' );
	$menu.find( '.current' ).toggleClass( 'hide', active || play );
	if ( S.player === 'mpd' || S.player === 'upnp' ) {
		if ( active ) {
			$menu.find( '.play' ).toggleClass( 'hide', play );
			$menu.find( '.pause' ).toggleClass( 'hide', ! play || webradio );
			$menu.find( '.stop' ).toggleClass( 'hide', state === 'stop' );
		} else {
			$menu.find( '.pause, .stop' ).addClass( 'hide' );
		}
	} else {
		$menu.find( '.pause, .stop, .current' ).addClass( 'hide' );
	}
	$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp || C.playlists === 0 );
	$menu.find( '.similar' ).toggleClass( 'hide', webradio );
	$menu.find( '.tag' ).toggleClass( 'hide', webradio || upnp || audiocd );
	$menu.find( '.wrsave' ).toggleClass( 'hide', ! notsaved );
	$menu.find( '.i-track.submenu' ).toggleClass( 'disabled', S.pllength < 2 );
	contextmenuScroll( $menu, $thisli.offset().top + 48 );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	playlistRemove( $( this ).parent() );
} );
$( '#pl-title' ).on( 'click', '.savedlist', function() {
	var $menu   = $( '#menu-playlist' );
	var active = ! $menu.hasClass( 'hide' );
	menuHide();
	if ( active ) return
	
	V.list.path = $( '#pl-title .lipath' ).text();
	$menu.find( '.plrename, .pldelete' ).addClass( 'hide' );
	contextmenuScroll( $menu, 88 );
} );
$( '#page-playlist' ).on( 'click', '#pl-savedlist li', function( e ) {
	e.stopPropagation();
	var $target  = $( e.target );
	var $this    = $( this );
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	var active   = $this.hasClass( 'active' );
	menuHide();
	if ( menushow && active ) return
	
	var liicon   = $target.hasClass( 'li-icon' );
	if ( V.playlisttrack || liicon ) {
		if ( 'pladd' in V ) {
			V.pladd.index = $this.index();
			V.pladd.track = $this.find( '.li1 .name' ).text()
							+'<br><gr>'+ $this.find( '.li2 .name' ).text() +'</gr>';
			playlistInsertSelect();
		} else {
			var menu  = $target.data( 'menu' ) || $this.find( '.li-icon' ).data ( 'menu' );
			var $menu = $( '#menu-'+ menu );
			V.list    = {};
			V.list.li = $this; // for contextmenu
			$( '#pl-savedlist li.active' ).removeClass( 'active' );
			if ( V.playlistlist ) {
				V.list.name = $this.find( '.lipath' ).text();
				V.list.path = V.list.name;
			} else {
				V.list.name   = $this.find( '.name' ).text();
				V.list.path   = $this.find( '.lipath' ).text() || V.list.name;
				V.list.track  = $this.data( 'track' );
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', S.pllength === 0 );
				$( '.remove' ).removeClass( 'hide' );
				$( '.tag' ).addClass( 'hide' );
				if ( ( D.tapaddplay || D.tapreplaceplay )
					&& V.playlisttrack 
					&& ! liicon
					&& S.player === 'mpd'
				) {
					$menu.find( 'a:eq( 0 ) .submenu' ).trigger( 'click' );
					return
				}
				
				$menu.find( '.similar' ).toggleClass( 'hide', S.webradio );
				$menu.find( '.wrsave' ).toggleClass( 'hide', ! $this.hasClass( 'notsaved' ) );
			}
			$this.addClass( 'active' );
			$menu.find( '.playnext, .replace, .i-play-replace' ).toggleClass( 'hide', S.pllength === 0 );
			$menu.find( '.playnext' ).toggleClass( 'hide', S.state !== 'play' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', S.player !== 'mpd' );
			contextmenuScroll( $menu, $this.position().top + 48 );
		}
	} else {
		var name = $this.find( '.lipath' ).text();
		renderSavedPlTrack( name );
		if ( 'pladd' in V ) {
			V.pladd.name = name;
			playlistInsertTarget();
		}
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
$( '#lyricsedit' ).on( 'click', function() {
	$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
	$( '#lyricsdelete' ).toggleClass( 'hide', ! V.lyrics );
	$( '#lyricseditbtngroup' ).removeClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).addClass( 'hide' );
	$( '#lyricstextarea' )
		.val( V.lyrics )
		.scrollTop( $( '#lyricstext' ).scrollTop() );
	$( '#lyricsartist' ).css( 'width', 'calc( 100% - 124px )' );
} );
$( '#lyricsrefresh' ).on( 'click', function() {
	$( this ).addClass( 'blink' );
	lyricsGet( 'refresh' );
} );
$( '#lyrics' ).on( 'click', '.i-close',  function() {
	if ( $( '#lyricsedit' ).hasClass( 'hide' ) && $( '#lyricstextarea' ).val() !== V.lyrics ) {
		info( {
			  icon     : 'lyrics'
			, title    : 'Lyrics'
			, message  : 'Discard changes made to this lyrics?'
			, ok       : lyricsHide
		} );
	} else {
		lyricsHide();
	}
} );
$( '#lyricsback' ).on( 'click', function() {
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
	$( '#lyricsartist' ).css( 'width', '' );
} );
$( '#lyricsundo' ).on( 'click', function() {
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
$( '#lyricssave' ).on( 'click', function() {
	info( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Save this lyrics?'
		, ok       : () => {
			V.lyrics   = $( '#lyricstextarea' ).val();
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'save', V.lyrics.replace( /\n/g, '\\n' ), 'CMD ARTIST TITLE ACTION DATA' ] );
			lyricstop  = $( '#lyricstextarea' ).scrollTop();
			lyricsShow( V.lyrics );
			$( '#lyricseditbtngroup' ).addClass( 'hide' );
			$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
		}
	} );
} );	
$( '#lyricsdelete' ).on( 'click', function() {
	info( {
		  icon    : 'lyrics'
		, title   : 'Lyrics'
		, message : 'Delete this lyrics?'
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'delete', 'CMD ARTIST TITLE ACTION' ] );
			V.lyrics   = '';
			lyricsHide();
		}
	} );
} );
// onChoose > onClone > onStart > onMove > onChange > onUnchoose > onUpdate > onSort > onEnd
new Sortable( document.getElementById( 'lib-mode-list' ), {
	  ...sortableOpt
	, onChoose : () => {
		if ( V.press ) return
		
		setTimeout( () => {
			$( '.mode' ).removeClass( 'edit' );
			$( '.mode .bkedit' ).remove();
		}, 300 );
	}
	, onClone  : () => V.sortable = true
	, onUpdate : () => {
		var order = [];
		$( '.mode' ).each( ( i, el ) => {
			var $el  = $( el );
			order.push( $el.hasClass( 'bookmark' ) ? $el.find( '.lipath' ).text() : $el.data( 'mode' ) );
		} );
		jsonSave( 'order', order );
	}
	, onEnd    : () => delete V.sortable
} );
new Sortable( document.getElementById( 'pl-list' ), {
	  ...sortableOpt
	, onStart    : function() {
		$( '#pl-list li.active' ).addClass( 'sortactive' );
	}
	, onUpdate   : function ( e ) {
		S.song = $( '#pl-list li.sortactive' ).index();
		$( '#pl-list li.sortactive' ).removeClass( 'sortactive' );
		sortPlaylist( 'pl-list', e.oldIndex, e.newIndex );
	}
} );
new Sortable( document.getElementById( 'pl-savedlist' ), {
	  ...sortableOpt
	, onUpdate   : function ( e ) {
		sortPlaylist( 'pl-savedlist', e.oldIndex, e.newIndex );
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
