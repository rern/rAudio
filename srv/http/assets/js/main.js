C = {}; // counts
D = {}; // display
E = {}; // equalizer
O = []; // order
S = {}; // status
V = {   // var global
	  apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : '328f08885c2b5a4d1dbe1496cab60b15'
	, sharedsecret  : '8be57656a311be3fd8f003a71b3e0c06'
	, bioartist     : []
	, blinkdot      : blinkdot
	, coverart      : '/assets/img/coverart.svg'
	, icoveredit    : '<div class="coveredit cover-change">'+ ico( 'coverart' ) +'</div>'
	, icoversave    : '<div class="coveredit cover-save">'+ ico( 'save' ) +'</div>'
	, interval      : {}
	, covervu       : '/assets/img/vu.svg'
	, guide         : false
	, library       : false
	, librarylist   : false
	, list          : {}
	, local         : false
	, lyrics        : ''
	, lyricsartist  : ''
	, lyricstitle   : ''
	, mode          : ''
	, modescrolltop : 0
	, page          : 'playback'
	, pladd         : {}
	, playback      : true
	, playlist      : false
	, plhome        : true
	, query         : []
	, rotate        : 0
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
colorIcon( '.submenu.i-color' );
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
var vumeter = '<img class="imgicon" src="'+ V.covervu +'"> ';
var chkdisplay = {
	  libmain   : {
		  album          : ico( 'album' ) +'<gr>Album</gr>'
			, nas        : ico( 'networks' ) +'<gr>Network</gr>'
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
	, liboption : {
		  albumbyartist  : ico( 'album' ) +'<gr>Album</gr> - Sort by artist'
		, albumyear      : ico( 'album' ) +'Sort by artist > year'
		, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;'+ ico( 'play-plus infomenusub' ) +'<gr>Add + Play</gr>'
		, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;'+ ico( 'play-replace infomenusub' ) +'<gr>Replace + Play</gr>'
		, playbackswitch : 'Switch to Playback <gr>on '+ ico( 'play-plus infomenusub' ) +'or '+ ico( 'play-replace infomenusub' )
		, backonleft     : ico( 'back bl' ) +'Back button on left side'
		, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
		, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
	}
	, playback  : {
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
	, playlist  : {
		  plclear        : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'replace' ) +'Replace'+ ico( 'play-replace sub' ) + '<a>'
		, plsimilar      : 'Confirm <gr>on</gr> <a class="infomenu">'+ ico( 'lastfm' ) +'Add similar</a>'
		, audiocdplclear : 'Clear on '+ ico( 'audiocd' ) +'Audio CD load'
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

if ( navigator.maxTouchPoints ) { // swipeleft / right ////////////////////////////////
	if ( ! D.noswipe ) {
		var xstart;
		window.addEventListener( 'touchstart', function( e ) {
			var $target = $( e.target );
			if ( [ 'time-band', 'time-knob', 'volume-band', 'volume-knob' ].includes( e.target.id )
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
			if ( Math.abs( diff ) > 100 ) $( '#'+ pagenext[ V.page ][ diff > 0 ? 1 : 0 ] ).trigger( 'click' );
			xstart = false;
		} );
	}
	$( '.page' ).on( 'contextmenu', function( e ) { // on press - disable default context menu
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		return false
	} );
	$( '#hovercursor, #shortcut' ).remove();
}
	
$( 'body' ).on( 'click', function( e ) {
	if ( I.active || V.colorpicker ) return
	
	var $target = $( e.target );
	if ( ! $target.is( '.bkcoverart, .bkradio, .savedlist' ) ) menuHide();
	if ( ! V.local && $( '.pl-remove' ).length && ! $target.hasClass( 'pl-remove' ) ) $( '.pl-remove' ).remove();
	if ( V.guide ) guideHide();
} );
$( '#page-playback' ).on( 'click', function( e ) {
	if ( V.press
		|| [ 'coverT', 'timeT', 'volume-bar', 'volume-band', 'volume-band-dn', 'volume-band-up' ].includes( e.target.id ) ) return
	
	if ( $( '#divcover .coveredit' ).length ) {
		if ( ! $( e.target ).hasClass( 'coveredit' ) ) {
			$( '#divcover .cover-change' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
	}
} );
$( '#loader' ).on( 'click', function() {
	loaderHide();
} );
$( '#coverart' ).on( 'load', function() {
	if ( ! S.webradio && S.player === 'mpd' && S.coverart.slice( 0, 16 ) === '/data/shm/online' ) {
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
$( '#logo, #refresh' ).on( 'click', function() {
	if ( ! localhost ) window.open( 'https://github.com/rern/rAudio/discussions' );
} );
$( '#debug' ).on( 'click', function() {
	if ( ! V.press ) setStatusData();
} );
$( '#button-data' ).on( 'click', function() {
	$( '#button-data, #data' ).addClass( 'hide' );
} );
$( '#button-settings' ).on( 'click', function( e ) {
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
$( '.settings' ).on( 'click', function() {
	location.href = 'settings.php?p='+ this.id;
} );
$( '#settings' ).on( 'click', '.submenu', function() {
	switch ( this.id ) {
		case 'dsp':
			$( this ).hasClass( 'i-camilladsp' ) ? location.href = 'settings.php?p=camilla' :equalizer();
			break;
		case 'logout':
			$.post( 'cmd.php', { cmd: 'logout' }, () => location.reload() );
			break;
		case 'snapclient':
			var active = $( this ).hasClass( 'on' );
			if ( active ) {
				if ( S.snapclient ) {
					bash( [ 'snapcast.sh', 'stop' ] );
				} else {
					$( '#stop' ).trigger( 'click' );
				}
			} else {
				$( '#stop' ).trigger( 'click' );
				bash( [ 'snapcast.sh', 'start' ], data => {
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
			banner( 'snapcast blink', 'Snapcast', ( active ? 'Disconnect ...' : 'Connect ...' ) );
			break;
		case 'relays':
			$( '#stop' ).trigger( 'click' );
			bash( S.relayson ? [ 'relays.sh', 'OFF' ] : [ 'relays.sh' ] );
			break;
		case 'guide':
			location.href = 'settings.php?p=guide';
			break;
		case 'screenoff':
			bash( [ 'screenoff' ] );
			V.screenoff = true;
			break;
		case 'update':
			if ( ! $( '#update' ).hasClass( 'on' ) ) infoUpdate( '' );
			break;
		case 'displaycolor':
			V.color = true;
			if ( V.library ) {
				V.librarylist && V.mode !== 'album' ? colorSet() : $( '#mode-webradio' ).trigger( 'click' );
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
					, radio      : data.list
					, values     : currentip
					, beforeshow : function() {
						$( '#infoContent input' ).each( ( i, el ) => {
							if ( $( el ).val() === currentip ) $( el ).prop( 'disabled', true );
						} );	
						$( '#infoContent input' ).on( 'change', function() {
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
		, checkbox     : kv.checkbox
		, checkcolumn  : true
		, values       : kv.values
		, checkchanged : true
		, beforeshow   : () => {
			var $chk = $( '#infoContent input' );
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
			$el.bars.on( 'change', function() {
				if ( $( this ).prop( 'checked' ) ) {
					$el.barsalways.prop( 'disabled', false );
				} else {
					$el.barsalways
						.prop( 'checked', false )
						.prop( 'disabled', true );
				}
			} );
			$el.time.on( 'change', function() {
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
			$el.cover.on( 'change', function() {
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
			$el.volume.on( 'change', function() {
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
			$el.covervu.on( 'change', function() {
				if ( $( this ).prop( 'checked' ) ) $el.vumeter.prop( 'checked', false );
			} );
			$el.vumeter.on( 'change', function() {
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
		, checkbox     : kv.checkbox
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
		, beforeshow : () => colorIcon( '#infoIcon' )
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
	if ( V.playlist && ! V.savedpl && ! V.savedpltrack) setPlaylistScroll();
	if ( S.player !== 'mpd' ) switchPage( 'playback' );
} );
$( '#library, #button-library' ).on( 'click', function() {
	if ( V.library && V.librarylist ) {
		libraryHome();
	} else {
		switchPage( 'library' );
		refreshData();
	}
	if ( S.updating_db ) banner( 'library blink', 'Library Database', 'Update ...' );
} );
$( '#playback' ).on( 'click', function() {
	if ( V.playback && ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).trigger( 'click' );
	} else {
		playbackStatusGet();
		switchPage( 'playback' );
	}
} );
$( '#playlist, #button-playlist' ).on( 'click', function() {
	if ( ! V.local ) V.pladd = {}
	if ( V.playlist ) {
		if ( ! V.plhome ) playlistGet();
	} else {
		V.plhome ? playlistGet() : switchPage( 'playlist' );
	}
} );
$( '#bar-top' ).on( 'click', function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide ' );
} );
$( '#settings' ).on( 'click', function() {
	$( this ).addClass( 'hide' );
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
			bash( [ 'titlewithparen', S.Title, 'CMD TITLE' ], function( paren ) {
				if ( paren === '-1' ) {
					infoTitle();
				} else {
					S.scrobble && S.webradio ? infoTitle() : lyricsGet();
				}
			} );
		} else {
			S.scrobble && S.webradio ? infoTitle() : lyricsGet();
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
		, oklabel : ico( 'remove' ) +'Eject'
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
		
		if ( V.press ) {
			var diff  = 3;
		} else {
			if ( ! V.volumeprev ) V.volumeprev = S.volume; // V.volumeprev from psVolume()
			var diff  = Math.abs( e.value - V.volumeprev || S.volume - S.volumemute ); // change || mute/unmute
		}
		var speed = diff * 40; // 1% : 40ms
		$volumehandlerotate.css( 'transition-duration', speed +'ms' );
		setTimeout( () => {
			$volumehandlerotate.css( 'transition-duration', '100ms' );
			$( '#volume-knob, #volmute' ).removeClass( 'disabled' );
			$( '#voldn' ).toggleClass( 'disabled', e.value === 0 );
			$( '#volup' ).toggleClass( 'disabled', e.value === 100 );
		}, speed );
	}
	, drag              : function( e ) {
		S.volume = e.value;
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
		volumeSetAt();
	}
	, change            : function( e ) {
		if ( V.drag ) return
		
		$( '#volume-knob, #button-volume i' ).addClass( 'disabled' );
		volumeSet( e.value );
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
	}
	, valueChange       : function( e ) {
		if ( V.drag || ! V.create ) return // ! V.create - suppress fire before 'create'
		
		S.volume     = e.value;
		V.volumeprev = false;
		$volumehandle.rsRotate( e.value ? -this._handle1.angle : -310 );
	}
	, stop              : () => {
		volumePush( S.volume, V.drag ? 'dragpress' : 'push' );
		V.drag = false;
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	guideHide();
	clearTimeout( V.volumebar );
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
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
	
	V.drag ? volumePush( S.volume, 'dragpress' ) : volumeBarSet( e.pageX || e.changedTouches[ 0 ].pageX );
	V.start = V.drag = false;
} ).on( 'mouseleave', function() {
	if ( V.start ) $( '#volume-band' ).trigger( 'mouseup' );
} );
$( '#volmute, #volM' ).on( 'click', function() {
	S.volumemute ? volumePush( S.volumemute, 'unmute' ) : volumePush( S.volume, 'mute' );
	volumeSet( S.volumemute, 'toggle' );
} );
$( '#voldn, #volup, #volT, #volB, #volL, #volR, #volume-band-dn, #volume-band-up' ).on( 'click', function() {
	var $this = $( this );
	local();
	guideHide();
	volumeUpDown( $this.hasClass( 'up' ) );
	if ( $this.hasClass( 'band' ) ) $( '#volume-text, #volume-bar' ).removeClass( 'hide' );
} ).on( 'touchend mouseup mouseleave', function() {
	if ( ! V.press ) return
	
	clearInterval( V.interval.volume );
	if ( D.volume ) {
		$( '#volume-text' ).text( S.volume );
		$( '#volume-bar' ).css( 'width', S.volume +'%' );
	} else {
		$volumeRS.setValue( S.volume );
		clearTimeout( V.volumebar );
		V.volumebar = setTimeout( volumeBarHide, 3000 );
	}
	if ( V.press ) volumePush();
} ).press( function( e ) {
	clearTimeout( V.volumebar );
	if ( ! D.volume ) $( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	var up = $( e.currentTarget ).hasClass( 'up' );
	V.interval.volume = setInterval( () => volumeUpDown( up ), 100 );
} );
$( '#volume-text' ).on( 'click', function() { // mute / unmute
	clearTimeout( V.volumebar );
	volumeBarSet( 'toggle' );
} );
$( '#divcover' ).press( function( e ) {
	if ( ! S.pllength
		|| V.guide
		|| ( S.webradio && S.state === 'play' )
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
		banner( 'coverart blink', 'Coverart Online', 'Fetch ...', -1 );
		bash( [ 'coverartonline', S.Artist, S.Album.replace( /\(.*/, '' ), 'CMD ARTIST ALBUM' ], url => {
			console.log( url );
			bannerHide();
		} );
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
$( '.map' ).on( 'click', function( e ) {
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
			guideHide();
			return
		}
		
		V.guide    = true;
		var time   = $time.is( ':visible' );
		var volume = $volume.is( ':visible' );
		$( '#coverTR' ).removeClass( 'empty' );
		$( '.mapcover, .guide' ).addClass( 'mapshow' );
		$( '#guide-bio' ).toggleClass( 'hide', S.Artist === '' );
		$( '#guide-lyrics' ).toggleClass( 'hide', S.Artist === '' || S.Title === '' );
		$( '#guide-booklet' ).toggleClass( 'hide', S.Album === '' );
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
					$( '#single' ).trigger( 'click' );
					S.repeat = false;
					S.single = false;
					setButtonOptions();
					local( 600 );
					bash( [ 'mpcoption', 'repeat', false, 'CMD OPTION ONOFF' ] );
					bash( [ 'mpcoption', 'single', false, 'CMD OPTION ONOFF' ] );
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
	if ( ws.readyState !== 1 ) return // fix - missing elapsed if ws closed > reconnect
	
	var $this = $( this );
	var cmd   = this.id;
	if ( S.state === cmd ) return
	
	if ( $this.hasClass( 'btn-toggle' ) ) {
		var onoff = ! S[ cmd ];
		S[ cmd ] = onoff;
		bash( [ 'mpcoption', cmd, onoff, 'CMD OPTION ONOFF' ] );
		setButtonOptions();
		local( 600 );
	} else {
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ cmd ).addClass( 'active' );
		if ( S.webradio ) {
			$( '#divcover .cover-change' ).remove();
			$( '#coverart' ).css( 'opacity', '' );
		}
		if ( cmd === 'play' ) {
			var stateprev = S.state;
			S.state = cmd;
			vu();
			setPlayPauseColor();
			if ( stateprev === 'stop' ) {
				S.webradio ? $( '#title, #elapsed' ).html( blinkdot ) : $( '#elapsed' ).empty();
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
			
			intervalClear();
			setProgress( 0 );
			$( '#elapsed, #total, #progress' ).empty();
			bash( [ 'mpcprevnext', cmd, 'CMD ACTION' ] );
		}
	}
	if ( $( '#relays' ).hasClass( 'on' ) && cmd === 'play' ) bash( [ 'relaystimerreset' ] );
} );
$( '#bio' ).on( 'click', '.biosimilar', function() {
	bio( $( this ).text(), 'getsimilar' );
} );
$( '#bio' ).on( 'click', '.bioback', function() {
	V.bioartist.pop();
	var getsimilar = V.bioartist.length > 1 ? 'getsimilar' : '';
	bio( V.bioartist.pop(), getsimilar );
} );
$( '#bio' ).on( 'click', '.closebio', function() {
	V.bioartist = [];
	$( '#bio' ).addClass( 'hide' );
	if ( 'observer' in V ) V.observer.disconnect();
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
			, ok           : () => {
				bash( [ 'latestclear' ], () => $( '#library' ).trigger( 'click' ) );
			}
		} );
	}
} );
$( '#lib-breadcrumbs' ).on ( 'click', '.button-coverart', function() {
	if ( $( this ).find( 'img' ).length ) {
		var message = 'Update thumbnails and directory icons?'
	} else {
		var message = 'With existing album coverarts:'
					 +'<br>  • Create thumbnails'
					 +'<br>  • Create directory icons'
	}
	info( {
		  icon         : $( '.button-coverart' )[ 0 ].outerHTML
		, title        : 'Album Thumbnails'
		, message      : message
		, messagealign : 'left'
		, ok           : thumbUpdate
	} );
} );
$( '#button-lib-search' ).on( 'click', function() { // icon
	$( '#lib-path span, #button-lib-back, #button-lib-search' ).addClass( 'hide' );
	$( '#lib-search, #lib-search-btn' ).removeClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path' ).css( 'max-width', 40 );
	$( '#lib-search-input' ).focus();
} );
$( '#lib-search-btn' ).on( 'click', function() { // search
	var keyword = $( '#lib-search-input' ).val();
	if ( ! keyword ) {
		$( '#lib-search-close' ).trigger( 'click' );
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
$( '#lib-search-close' ).on( 'click', function( e ) {
	e.stopPropagation();
	$( '#lib-search, #lib-search-btn' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path span, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-search-close' ).empty();
	if ( $( '#lib-path .lipath').text() ) $( '#button-lib-back' ).removeClass( 'hide' );
	if ( $( '#lib-search-input' ).val() ) {
		$( '#lib-search-input' ).val( '' );
		$( '#lib-breadcrumbs a' ).length ? $( '#lib-breadcrumbs a' ).last().trigger( 'click' ) : $( '#library' ).trigger( 'click' );
	}
} );
$( '#lib-search-input' ).on( 'keyup paste cut', function( e ) {
	if ( e.key === 'Enter' ) $( '#lib-search-btn' ).trigger( 'click' );
} );
$( '#button-lib-back' ).on( 'click', function() {
	var $breadcrumbs = $( '#lib-breadcrumbs a' );
	var bL           = $breadcrumbs.length
	if ( ( bL && bL < 2 ) || ( ! bL && V.query.length < 2 ) ) {
		$( '#library' ).trigger( 'click' );
		return
	}
	
	V.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
	var backmode     = 'gmode' in V && V.gmode !== V.mode;
	if ( bL && V.mode !== 'latest' && ! backmode ) {
		bL > 1 ? $breadcrumbs.eq( -2 ).trigger( 'click' ) : $( '#library' ).trigger( 'click' );
	} else {
		V.query.pop();
		var query = V.query.slice( -1 )[ 0 ];
		if ( query === 'album' ) {
			$( '#mode-album' ).trigger( 'click' );
		} else {
			if ( 'gmode' in query ) V.mode = query.gmode;
			list( query, function( html ) {
				if ( html != -1 ) {
					if ( backmode ) V.mode = V.gmode;
					if ( V.mode === 'album' ) {
						var path = 'ALBUM';
					} else {
						var path = query.path;
					}
					var data = {
						  html      : html
						, modetitle : query.modetitle
						, path      : path
					}
					renderLibraryList( data );
				} else {
					$( '#button-lib-back' ).trigger( 'click' ); 
				}
			} );
		}
	}
} );
$( '#lib-mode-list' ).on( 'click', function( e ) {
	if ( ! V.press && $( '.bkedit' ).length && ! $( e.target ).hasClass( 'bkedit' ) ) setBookmarkEdit();
} ).on( 'click', '.mode', function() {
	var $this = $( this );
	V.mode    = $this.data( 'mode' );
	$( '#lib-search-close' ).trigger( 'click' );
	if ( V.mode === 'bookmark' ) return
	
	if ( ! C[ V.mode ] && V.mode.slice( -5 ) !== 'radio' ) {
		var json = {
			  icon    : 'library'
			, title   : 'Library Database'
		}
		if ( V.mode === 'playlists' ) {
			json.message = 'No saved playlists found.';
		} else if ( V.mode === 'latest' ) {
			json.message = 'No new albums added since last update.';
		} else {
			json.message    = 'Database not yet available in this mode.'
							 +'<br>If music files already in SD, NAS or USB,'
							 +'<br>import them to database:'
							 +'<div class="menu" style="width: 160px"><a class="sub nohover">'
							 + ico( 'library' )+' Library</a>'+ ico( 'refresh-library submenu bgm' ) +'</div>';
			json.okno       = true;
			json.beforeshow = () => {
				$( '#infoContent' ).on( 'click', '.submenu', function() {
					$( '#update' ).trigger( 'click' );
				} );
			}
		}
		info( json );
		return
	}
	
	if ( ! V.color && ! C[ V.mode ] && S.updating_db ) {
		infoUpdate();
		return
	}
	
	V.modescrolltop = $( window ).scrollTop();
	
	if ( V.mode === 'playlists' ) {
		if ( $( this ).find( 'gr' ).text() ) {
			$( '#button-pl-playlists' ).trigger( 'click' );
			$( '#playlist' ).trigger( 'click' );
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
	
	V.list.li   = $( this );
	V.list.name = V.list.li.find( '.bkname' ).text();
	V.list.path = V.list.li.find( '.lipath' ).text();
	V.mpccmd  = [ 'mpcadd', V.list.path ];
	if ( D.tapaddplay ) {
		V.action = 'addplay';
		addToPlaylistCommand();
		return
	}
	
	if ( D.tapreplaceplay ) {
		V.action = 'replaceplay';
		addToPlaylistCommand();
		return
	}
	
	var $img = V.list.li.find( '.bkcoverart' );
	var icon = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : ico( 'bookmark bl' );
	var content = `\
<div class="infomessage">${ icon }
<wh>${ V.list.name }</wh>
<a class="li2 hide">${ V.list.path }</a>
</div>
<div class="menu">
<a data-cmd="add" class="sub cmd"><i class="i-plus-o"></i>Add</a><i class="i-play-plus submenu cmd" data-cmd="addplay"></i>
<div class="pllength">
<a data-cmd="playnext" class="cmd"><i class="i-add"></i>Play next</a>
<a data-cmd="replace" class="sub cmd"><i class="i-replace"></i>Replace</a><i class="i-play-replace submenu cmd" data-cmd="replaceplay"></i>
</div>
</div>`;
	info( {
		  icon       : 'playlist'
		, title      : 'Add to Playlist'
		, content    : content
		, values     : 'addplay'
		, beforeshow : () => {
			$( '#infoContent .pllength' ).toggleClass( 'hide', ! S.pllength );
			$( '#infoContent' ).on( 'click', '.cmd', function() {
				V.list.li = $( '.infomessage' );
				V.mpccmd  = V.action === 'playnext' ? [ 'mpcaddplaynext', V.list.path ] : [ 'mpcadd', V.list.path ];
				V.action  = $( this ).data( 'cmd' );
				$( '#infoX' ).trigger( 'click' );
				addToPlaylist();
			} );
		}
		, okno      : true
	} );
} ).on( 'click', '.mode-bookmark', function( e ) { // delegate - id changed on renamed
	var $this = $( this );
	$( '#lib-search-close' ).trigger( 'click' );
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
		, oklabel : ico( 'remove' ) +'Remove'
		, okcolor : red
		, ok      : () => bash( [ 'bookmarkremove', name, 'CMD NAME' ] )
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
		, ok           : () => bash( [ 'bookmarkrename', name, infoVal(), 'CMD NAME NEWNAME' ] )
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
	var imagefilenoext = '/mnt/MPD/'+ $this.find( '.lipath' ).text() +'/coverart';
	info( {
		  icon        : icon
		, title       : 'Bookmark Thumbnail'
		, message     : message
		, filelabel   : ico( 'folder-open' ) +'File'
		, fileoklabel : ico( 'flash' ) +'Replace'
		, filetype    : 'image/*'
		, buttonlabel : ! thumbnail ? '' : ico( 'bookmark' ) +'Default'
		, buttoncolor : ! thumbnail ? '' : orange
		, button      : ! thumbnail ? '' : () => bash( [ 'bookmarkcoverreset', name, 'CMD NAME' ] )
		, ok          : () => imageReplace( 'bookmark', imagefilenoext, name ) // no ext
	} );
} ).press( '.mode-bookmark', setBookmarkEdit );
new Sortable( document.getElementById( 'lib-mode-list' ), {
	// onChoose > onClone > onStart > onMove > onChange > onUnchoose > onUpdate > onSort > onEnd
	  ghostClass    : 'lib-sortable-ghost'
	, delay         : 400
	, onMove       : function() {
		$( '.bkedit' ).remove();
		$( '.mode-bookmark' ).children().addBack().removeAttr( 'style' );
	}
	, onUpdate      : function () {
		var order = [];
		$( '.mode' ).each( ( i, el ) => order.push( $( el ).find( '.lipath' ).text() ) );
		bash( { cmd: [ 'order' ], json: order } );
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
			, modetitle : $this.find( '.liname' ).text()
			, path      : path
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
		, oklabel : ico( 'remove' ) +'Exclude'
		, ok      : () => {
			bash( [ 'albumignore', album, artist, 'CMD ALBUM ARTIST' ] );
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
			bio( name );
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
	} else if ( $this.find( '.i-music' ).length || $target.data( 'menu' ) ) {
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
$( '#button-pl-back' ).on( 'click', function() {
	V.savedpl ? playlistGet() : $( '#button-pl-playlists' ).trigger( 'click' );
} );
$( '#button-pl-playlists' ).on( 'click', function() {
	list( { playlist: 'list' }, ( data ) => renderSavedPl( data ), 'json' );
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
		infoWarning( 'file-playlist', 'Save Playlist', message );
	} else {
		playlistNew();
	}
} );
$( '#button-pl-consume' ).on( 'click', function() {
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
	bash( [ 'mpcoption', 'consume', S.consume, 'CMD OPTION ONOFF' ] );
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
			, message    : 'Randomly add songs and play continuously.'
			, checkbox   : [ 'Start playing the random songs' ]
			, values     : [ true ]
			, beforeshow : () => $( '#infoContent table' ).toggleClass( 'hide', S.song + 1 === S.pllength )
			, ok         : () => {
				S.librandom = true;
				$this.addClass( 'bl' );
				banner( icon, title, 'On ...' );
				bash( [ 'librandom', infoVal(), 'CMD PLAY' ] );
			}
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
		info( {
			  icon        : 'playlist'
			, title       : 'Clear Playlist'
			, oklabel     : ico( 'remove' ) +'Clear'
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
					$( '#pl-list .li1' ).before( ico( 'remove pl-remove' ) );
					$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
					infoButtonCommand();
					local();
				}
				, () => {
					bash( [ 'mpccrop' ] );
					$( '#pl-list li:not( .active )' ).remove();
				}
			]
			, oklabel     : ico( 'remove' ) +'All'
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
$( '#pl-search-close, #pl-search-btn' ).on( 'click', function() {
	$( '#pl-search-close' ).empty();
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).addClass( 'hide' );
	$( '#pl-manage, #button-pl-search, #pl-list li' ).removeClass( 'hide' );
	$( '#pl-search-input' ).val( '' );
	$( '#pl-list' ).html( function() {
		return $( this ).html().replace( /<bll>|<\/bll>/g, '' );
	} )
} );
$( '#button-pl-search' ).on( 'click', function() {
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).removeClass( 'hide' );
	$( '#pl-manage, #button-pl-search' ).addClass( 'hide' );
	$( '#pl-search-input' ).focus();
} );
new Sortable( document.getElementById( 'pl-list' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
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
		$this.find( '.li-icon' ).trigger( 'click' );
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
			if ( S.webradio ) {
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
		bash( [ 'mpcplayback', 'play', listnumber, 'CMD ACTION POS' ] );
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
	var upnp      = $thisli.hasClass( 'upnp' );
	$thisli.addClass( 'updn' );
	$( '#menu-plaction a' ).removeClass( 'hide' );
	$menu.find( '.current' ).toggleClass( 'hide', active || play );
	if ( S.player === 'mpd' || S.player === 'upnp' ) {
		if ( active ) {
			$menu.find( '.play' ).toggleClass( 'hide', play );
			$menu.find( '.pause' ).toggleClass( 'hide', ! play || S.webradio );
			$menu.find( '.stop' ).toggleClass( 'hide', state === 'stop' );
		} else {
			$menu.find( '.pause, .stop' ).addClass( 'hide' );
		}
	} else {
		$menu.find( '.pause, .stop, .current' ).addClass( 'hide' );
	}
	$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp || C.playlists === 0 );
	$menu.find( '.similar, .submenu' ).toggleClass( 'hide', S.webradio );
	$menu.find( '.tag' ).toggleClass( 'hide', S.webradio || upnp || audiocd );
	$menu.find( '.wrsave' ).toggleClass( 'hide', ! notsaved );
	contextmenuScroll( $menu, $thisli.offset().top + 48 );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	playlistRemove( $( this ).parent() );
} );
$( '#savedpl-path' ).on( 'click', '.savedlist', function() {
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
	if ( V.savedpltrack || liicon ) {
		if ( pladd ) {
			playlistInsertSelect( $this );
		} else {
			var menu  = $target.data( 'menu' ) || $this.find( '.li-icon' ).data ( 'menu' );
			var $menu = $( '#menu-'+ menu );
			V.list    = {};
			V.list.li = $this; // for contextmenu
			$( '#pl-savedlist li' ).removeClass( 'active' );
			if ( V.savedpl ) {
				V.list.name = $this.find( '.plname' ).text().trim();
				V.list.path = V.list.name;
			} else {
				V.list.artist = $this.find( '.artist' ).text().trim();
				V.list.name   = $this.find( '.name' ).text().trim();
				V.list.path   = $this.find( '.lipath' ).text().trim() || V.list.name;
				V.list.track  = $this.data( 'track' );
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', ! S.pllength );
				$( '.remove' ).removeClass( 'hide' );
				$( '.tag' ).addClass( 'hide' );
				if ( ( D.tapaddplay || D.tapreplaceplay )
					&& V.savedpltrack 
					&& ! liicon
					&& S.player === 'mpd'
				) {
					$menu.find( 'a:eq( 0 ) .submenu' ).trigger( 'click' );
					return
				}
				
				$menu.find( '.replace' ).toggleClass( 'hide', ! S.pllength );
				$menu.find( '.similar' ).toggleClass( 'hide', S.webradio );
				$menu.find( '.wrsave' ).toggleClass( 'hide', ! $this.hasClass( 'notsaved' ) );
			}
			$this.addClass( 'active' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', S.player !== 'mpd' );
			contextmenuScroll( $menu, $this.position().top + 48 );
		}
	} else {
		V.savedpl      = false;
		V.savedpltrack = true;
		renderSavedPlTrack( $this.find( '.plname' ).text() );
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
$( '#lyricsedit' ).on( 'click', function() {
	$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
	$( '#lyricsdelete' ).toggleClass( 'hide', ! V.lyrics );
	$( '#lyricseditbtngroup' ).removeClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).addClass( 'hide' );
	$( '#lyricstextarea' )
		.val( V.lyrics )
		.scrollTop( $( '#lyricstext' ).scrollTop() );
} );
$( '#lyricsrefresh' ).on( 'click', function() {
	lyricsGet();
} );
$( '#lyricsclose' ).on( 'click', function() {
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
$( '#lyricsback' ).on( 'click', function() {
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
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

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
