C = {} // counts
D = {} // display
E = {} // equalizer
O = {} // order
V = {   // var global
	  ...V
	, apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : '328f08885c2b5a4d1dbe1496cab60b15'
	, sharedsecret  : '8be57656a311be3fd8f003a71b3e0c06'
	, blinkdot      : '<wh class="dot dot1">·</wh>&ensp;<wh class="dot dot2">·</wh>&ensp;<wh class="dot dot3">·</wh>'
	, coverart      : '/assets/img/coverart.svg'
	, covervu       : '/assets/img/vu.svg'
	, dots          : '·&ensp;·&ensp;·'
	, html          : {}
	, icoverart     : '<img class="icoverart" src="/assets/img/coverart.svg">'
	, icoversave    : '<div class="coveredit cover-save">'+ ICON( 'save' ) +'</div>'
	, option        : {
		  pica        : {
			  unsharpAmount    : 100  // 0...500 Default = 0 (try 50-100)
			, unsharpThreshold : 5    // 0...100 Default = 0 (try 10)
			, unsharpRadius    : 0.6
//			, quality          : 3    // 0...3 Default = 3 (Lanczos win=3)
//			, alpha            : true // Default = false (black crop background)
		}
		, roundslider : {
			  animation   : false
			, borderWidth : 0
			, radius      : 115
			, svgMode     : true
			, width       : 22
		}
		, sortable   : {
			  delay               : 200
			, delayOnTouchOnly    : true
			, touchStartThreshold : 5
		}
	}
	, page          : 'playback'
	, wH            : window.innerHeight
	, wW            : window.innerWidth
};
[ 'bioartist',     'query' ].forEach(                                            k => V[ k ] = [] );
[ 'interval',      'list',         'scrolltop',   'status' ].forEach(            k => V[ k ] = {} );
[ 'guide',         'library',      'librarylist', 'local', 'playlist' ].forEach( k => V[ k ] = false );
[ 'lyrics',        'lyricsartist', 'mode' ].forEach(                             k => V[ k ] = '' );
[ 'modescrolltop', 'rotate' ].forEach(                                           k => V[ k ] = 0 );
[ 'playback',      'playlisthome' ].forEach(                                     k => V[ k ] = true );
$LI     = '';
$TIME   = $( '#time-knob' );
$VOLUME = $( '#volume-knob' );

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
	if ( I.active || V.color ) return
	
	var $target = $( e.target );
	if ( $target.parents( '#time-knob' ).length
		|| $target.parents( '#volume-knob' ).length
		|| $( '#data' ).length
		|| ! $( '#bio' ).hasClass( 'hide' )
		|| [ 'time-band', 'time-knob', 'volume-band', 'volume-knob' ].includes( e.target.id )
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
	if ( I.active || V.color ) return
	
	var $target = $( e.target );
	if ( ! V.press && ! $target.is( '.bkedit' ) ) {
		$( '.mode' ).removeClass( 'edit' );
		$( '.mode .bkedit' ).remove();
	}
	if ( ! $target.is( '.bkcoverart, .bkradio, .disabled, .savedlist' ) ) MENU.hide();
	if ( ! V.local && $( '.pl-remove' ).length && ! $target.hasClass( 'pl-remove' ) ) $( '.pl-remove' ).remove();
	if ( V.guide ) DISPLAY.guideHide();
} );
$( '#loader' ).on( 'click', function() {
	COMMON.loaderHide();
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
	COMMON.loaderHide();
} ).on( 'error', COVERART.default );

// COMMON /////////////////////////////////////////////////////////////////////////////////////
$( '#logo, #refresh' ).on( 'click', function() {
	if ( ! V.localhost ) window.open( 'https://github.com/rern/rAudio/discussions' );
} );
$( '#button-settings' ).on( 'click', function( e ) {
	e.stopPropagation();
	if ( D.loginsetting ) {
		INFO( {
			  icon       : 'lock'
			, title      : 'Settings'
			, list       : [ '', 'password' ]
			, checkblank : true
			, oklabel    : 'Login'
			, ok         : () => {
				COMMON.loader();
				$.post( 'cmd.php', { cmd: 'login', pwd: _INFO.val(), loginsetting: true }, verified => {
					if ( verified != -1 ) {
						D.loginsetting = false;
						COMMON.loaderHide();
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
			$( '#color' ).html( '<canvas width="20" height="20"></canvas>' );
			COLOR.wheel( '#color canvas' );
		}
		MENU.hide();
		$( '#settings' )
			.css( 'top', UTIL.barVisible( 40, 0 ) )
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
			if ( $this.hasClass( 'i-camilladsp' ) ) {
				location.href = 'settings.php?p=camilla';
			} else {
				fetch( '/data/system/equalizer.json', { cache: 'no-store' } )
					.then( data => data.json() )
					.then( data => EQ.info( data ) );
			}
			break;
		case 'lock':
			$.post( 'cmd.php', { cmd: 'logout' }, () => location.reload() );
			break;
		case 'snapclient':
			var active = $this.hasClass( 'on' );
			if ( active ) {
				$( '#stop' ).trigger( 'click' );
			} else {
				BASH( [ 'snapserverlist' ], data => {
					if ( ! data.length ) {
						delete V.bannerdelay;
						BANNER_HIDE();
						INFO( {
							  icon    : 'snapcast'
							, title   : 'SnapClient'
							, message : 'No SnapServers found.'
						} );
						return
					}
					
					if ( data.length === 1 ) {
						BASH( [ 'snapclient.sh', data[ 0 ].replace( /.* /, '' ) ] );
					} else {
						INFO( {
							  icon    : 'snapcast'
							, title   : 'SnapClient'
							, message : 'Select server:'
							, list    : [ '', 'radio', { kv: data } ]
							, ok      : () => BASH( [ 'snapclient.sh', _INFO.val().replace( /.* /, '' ) ] )
						} );
					}
				}, 'json' );
			}
			BANNER( 'snapcast blink', 'SnapClient', ( active ? 'Stop ...' : 'Start ...' ) );
			break;
		case 'relays':
			$( '#stop' ).trigger( 'click' );
			BASH( [ 'relays.sh', S.relayson ? 'off' : '' ] );
			break;
		case 'help':
			location.href = 'settings.php?p=guide';
			break;
		case 'screenoff':
			BASH( [ 'screenoff' ] );
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
			BASH( [ 'color', true, 'CMD LIST' ], data => {
				V.color = data;
				$( 'body' ).css( 'overflow', 'hidden' );
				$( '#colorreset' ).toggleClass( 'hide', ! D.color );
				$( '#colorok' ).toggleClass( 'disabled', ! D.color );
				$( '#colorpicker' ).removeClass( 'hide' );
				COLOR.picker();
				if ( V.playlist && V.playlisthome ) return
				
				var $list = $( '.page:not( .hide ) .list:not( .hide )' );
				if ( V.playback ) {
					$( '#library' ).trigger( 'click' );
				} else if ( ! $list.find( '.li2' ).length ) {
					$( V.library ? '.mode.webradio' : '#button-pl-back' ).trigger( 'click' );
				} else {
					$list.find( 'li:not( .licover )' ).eq( 0 ).addClass( 'active' );
				}
			}, 'json' );
			break;
		case 'multiraudio':
			BASH( [ 'multiraudiolist' ], data => {
				var currentip = data.current;
				INFO( {
					  icon       : 'multiraudio'
					, title      : 'Switch rAudio'
					, list       : [ '', 'radio', { kv: data.list, sameline: false } ]
					, values     : currentip
					, beforeshow : () => {
						$( '#infoList input' ).each( ( i, el ) => {
							if ( $( el ).val() === currentip ) $( el ).prop( 'disabled', true );
						} );	
						$( '#infoList input' ).on( 'input', function() {
							var ip = _INFO.val();
							if ( typeof Android === 'object' ) Android.changeIP( ip );
							COMMON.loader();
							location.href = 'http://'+ ip;
						} );
					}
					, okno       : true
				} );
			}, 'json' );
			break;
	}
} );
$( '#power' ).on( 'click', COMMON.power );
$( '#displaylibrary' ).on( 'click', DISPLAY.option.library );
$( '#displayplayback' ).on( 'click', function() {
	DISPLAY.option.playback();
} );
$( '#displayplaylist' ).on( 'click', function() {
	DISPLAY.option.playlist();
} );
$( '#library, #button-library' ).on( 'click', function() {
	if ( V.library ) {
		if ( V.search ) {
			$( '#lib-search-close' ).trigger( 'click' );
		} else if ( V.librarylist ) {
			LIBRARY.get();
		}
	} else {
		UTIL.switchPage( 'library' );
	}
	if ( S.updating_db ) BANNER( 'library blink', 'Library Database', 'Update ...' );
} );
$( '#playback' ).on( 'click', function() {
	if ( V.playback && ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 30 ) {
		$( '#stop' ).trigger( 'click' );
	} else {
		if ( ! V.playback ) {
			REFRESHDATA();
			UTIL.switchPage( 'playback' );
		}
	}
} );
$( '#playlist, #button-playlist' ).on( 'click', function() {
	if ( V.playlist ) {
		if ( ! V.playlisthome ) PLAYLIST.get();
	} else {
		V.playlisthome ? PLAYLIST.get() : UTIL.switchPage( 'playlist' );
	}
} );
$( '#bar-top' ).on( 'click', function( e ) {
	if ( e.target.id !== 'button-settings' ) $( '#settings' ).addClass( 'hide ' );
} );
// PLAYBACK /////////////////////////////////////////////////////////////////////////////////////
$( '#info' ).on( 'click', function() {
	if ( V.localhost ) PLAYBACK.info.scroll();
} );
$( '.emptyadd' ).on( 'click', function() {
	$( '#library' ).trigger( 'click' );
} );
$( '#artist, #guide-bio' ).on( 'click', function() {
	BIO.get( S.Artist );
} );
$( '#title, #guide-lyrics' ).on( 'click', function() {
	if ( S.lyrics
		&& ( ! S.webradio || ( S.state === 'play' && [ 'radiofrance', 'radioparadise' ].includes( S.icon ) ) )
	) {
		if ( S.Title.includes( '(' ) ) {
			BASH( [ 'titlewithparen', S.Title, 'CMD TITLE' ], paren => {
				if ( paren == -1 ) {
					UTIL.infoTitle();
				} else {
					S.scrobble && S.webradio ? UTIL.infoTitle() : LYRICS.get();
				}
			} );
		} else {
			S.scrobble && S.webradio ? UTIL.infoTitle() : LYRICS.get();
		}
	} else if ( S.Artist || S.Title ) {
		UTIL.infoTitle();
	}
	
} );
$( '#album, #guide-booklet' ).on( 'click', function() {
	if ( V.press || V.localhost ) return
	
	var urllastfm  = 'https://www.last.fm/music/'+ S.Artist +'/'+ S.Album;
	if ( S.booklet ) {
		if ( typeof Android !== 'object' ) {
			var newwindow  = window.open( '', '_blank' ); // fix: popup blocked on mobile
			newwindow.location.href = '/mnt/MPD/'+ UTIL.dirName( S.file ) +'/booklet.pdf';
		} else {
			INFO( {
				  icon    : 'booklet'
				, title   : 'Album Booklet'
				, message : ICON( 'warning' ) +' View on Android with <wh>rAudio</wh> on <wh>Firefox</wh>.'
						  +'<br><br>Or continue with album on <wh>Last.fm</wh> ?'
				, oklabel : ICON( 'lastfm' ) +'Album'
				, ok      : () => window.open( urllastfm, '_blank' )
			} );
		}
	} else {
		window.open( urllastfm, '_blank' );
	}
} );
$( '#infoicon' ).on( 'click', '.i-audiocd', function() {
	INFO( {
		  icon    : 'audiocd'
		, title   : 'Audio CD'
		, message : 'Eject and clear Audio CD tracks?'
		, oklabel : ICON( 'flash' ) +'Eject'
		, okcolor : V.red
		, ok      : () => BASH( [ 'audiocd.sh', 'ejecticonclick' ] )
	} );
} );
$( '#elapsed' ).on( 'click', function() {
	S.state === 'play' ? $( '#pause' ).trigger( 'click' ) : $( '#play' ).trigger( 'click' );
} );
$( '#time' ).roundSlider( {
	  ...V.option.roundslider
	, sliderType  : 'min-range'
	, width       : 22
	, startAngle  : 90
	, endAngle    : 450
	, showTooltip : false
	, create      : function ( e ) {
		$TIME_RS      = this;
		$TIME_RS_PROG = $( '#time .rs-transition, #time-bar' );
	}
	, start       : function () { // drag start
		V.drag = true;
		UTIL.intervalClear.all();
		$( '.map' ).removeClass( 'mapshow' );
		if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
	}
	, drag        : function ( e ) { // drag with no transition by default
		$( '#elapsed' ).text( UTIL.second2HMS( e.value ) );
	}
	, change      : function( e ) { // not fire on 'setValue'
		UTIL.intervalClear.all();
		UTIL.mpcSeek( e.value );
	}
	, stop        : function() {
		V.drag = false;
	}
} );
$( '#time-band' ).on( 'touchstart mousedown', function() {
	if ( S.player !== 'mpd' || S.webradio ) return
	
	V.start = true;
	DISPLAY.guideHide();
	UTIL.intervalClear.all();
	if ( S.state !== 'play' ) $( '#title' ).addClass( 'gr' );
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.start ) return
	
	V.drag = true;
	PLAYBACK.seekBar( e );
} ).on( 'touchend mouseup', function( e ) {
	if ( ! V.start ) return
	
	V.start = V.drag = false;
	PLAYBACK.seekBar( e );
} ).on( 'mouseleave', function() {
	V.start = V.drag = false;
} );
$( '#volume' ).roundSlider( {
	// init     : valueChange > create > beforeValueChange > valueChange
	// tap      : beforeValueChange > change > valueChange
	// drag     : start > [ beforeValueChange > drag > valueChange ] > change > stop
	// setValue : beforeValueChange > valueChange
	// angle    : this._handle1.angle (instaed of inconsistent e.handle.angle/e.handles[ 0 ].angle)
	  ...V.option.roundslider
	, width             : 50
	, handleSize        : '-25'
	, startAngle        : -50
	, endAngle          : 230
	, editableTooltip   : false
	, create            : function () {
		V.create       = true;
		$VOLUME_RS     = this;
		$VOL_TOOLTIP   = $( '#volume .rs-tooltip' );
		$VOL_HANDLE    = $( '#volume .rs-handle' );
		$VOL_HANDLE_TR = $( '#volume .rs-handle, #volume .rs-transition' );
	}
	, start             : function( e ) {
		V.drag = true;
		if ( e.value === 0 ) VOLUME.color.unMute(); // restore handle color immediately on start drag
		$( '.map' ).removeClass( 'mapshow' );
	}
	, beforeValueChange : function( e ) {
		if ( V.local || V.drag ) return
		
		if ( S.volumemax && e.value > S.volumemax ) {
			BANNER( 'volumelimit', 'Volume Limit', 'Max: '+ S.volumemax );
			if ( S.volume === S.volumemax ) return false
			
			$VOLUME_RS.setValue( S.volumemax );
			S.volume = S.volumemax;
			VOLUME.set();
			return false
		}
		
		if ( V.press ) {
			$VOL_HANDLE_TR.css( 'transition-duration', '100ms' );
			return
		}
		
		if ( 'volumediff' in V ) {
			var diff = V.volumediff;
			delete V.volumediff;
		} else {
			var diff  = Math.abs( e.value - S.volume || S.volume - S.volumemute ); // change || mute/unmute
		}
		V.animate = diff * 40; // 1% : 40ms
		$VOL_HANDLE_TR.css( 'transition-duration', V.animate +'ms' );
		setTimeout( () => {
			$VOL_HANDLE_TR.css( 'transition-duration', '100ms' );
			$( '#volume-knob' ).css( 'pointer-events', '' );
			V.animate = false;
		}, V.animate );
	}
	, drag              : function( e ) {
		S.volume = e.value;
		$VOL_HANDLE.rsRotate( e.value ? -this._handle1.angle : -310 );
		VOLUME.set();
	}
	, change            : function( e ) {
		if ( V.drag ) return
		
		S.volume = e.value;
		$( '#volume-knob' ).css( 'pointer-events', 'none' );
		VOLUME.set();
		$VOL_HANDLE.rsRotate( e.value ? -this._handle1.angle : -310 );
	}
	, valueChange       : function( e ) {
		if ( V.drag || ! V.create ) return // ! V.create - suppress fire before 'create'
		
		S.volume     = e.value;
		$VOL_HANDLE.rsRotate( e.value ? -this._handle1.angle : -310 );
		VOLUME.disable();
		if ( S.volumemute ) VOLUME.color.unMute();
	}
	, stop              : () => {
		V.drag = false;
		VOLUME.push();
		VOLUME.disable()
	}
} );
$( '#volume-band' ).on( 'touchstart mousedown', function() {
	DISPLAY.guideHide();
	VOLUME.bar.hideClear();
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	var $this = $( this );
	V.volume  = {
		  current : S.volume
		, min     : $this.offset().left
		, width   : $this.width()
	}
} ).on( 'touchmove mousemove', function( e ) {
	if ( ! V.volume ) return
	
	VOLUME.bar.hideClear();
	V.drag = true;
	VOLUME.bar.set( e );
	$( '#volume-bar' ).css( 'width', V.volume.x );
	VOLUME.set();
} ).on( 'touchend mouseup', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) {
		VOLUME.bar.show();
		return
	}
	
	if ( V.drag ) {
		VOLUME.push();
	} else { // click
		VOLUME.bar.set( e );
		VOLUME.animate( S.volume, V.volume.current );
		VOLUME.set();
	}
	$VOLUME_RS.setValue( S.volume );
	V.volume    = V.drag = false;
	VOLUME.bar.hide();
} ).on( 'mouseleave', function() {
	V.volume = V.drag = false;
} );
$( '#volmute, #volM' ).on( 'click', function() {
	VOLUME.toggle();
	V.local = false;
	VOLUME.setValue();
} );
$( '#voldn, #volup, #volT, #volB, #volL, #volR, #volume-band-dn, #volume-band-up' ).on( 'click', function() {
	var $this = $( this );
	LOCAL();
	DISPLAY.guideHide();
	VOLUME.upDown( $this.hasClass( 'up' ) );
	if ( $this.hasClass( 'band' ) ) $( '#volume-text, #volume-bar' ).removeClass( 'hide' );
} ).press( {
	  action   : e => { 
		VOLUME.bar.hideClear();
		if ( ! D.volume ) $( '#volume-bar, #volume-text' ).removeClass( 'hide' );
		var up = $( e.currentTarget ).hasClass( 'up' );
		V.interval.volume = setInterval( () => VOLUME.upDown( up ), 100 );
	}
	, end      : () => { // on end
		clearInterval( V.interval.volume );
		if ( D.volume ) {
			$( '#volume-text' ).text( S.volume );
			$( '#volume-bar' ).css( 'width', S.volume +'%' );
		} else {
			$VOLUME_RS.setValue( S.volume );
			VOLUME.bar.hideClear();
			VOLUME.bar.hide();
		}
		VOLUME.push();
	}
} );
$( '#volume-text' ).on( 'click', function() { // mute / unmute
	VOLUME.bar.hideClear();
	VOLUME.animate( S.volumemute, S.volume );
	VOLUME.toggle();
} );
$( '#divcover' ).on( 'click', '.cover-save', function() {
	COVERART.save();
} ).press( e => {
	if ( typeof Android === 'object' && e.target.id === 'coverT' ) {
		UTIL.changeIP();
		return
	}
	
	if ( ! S.pllength
		|| V.guide
		|| ( S.webradio && S.state === 'play' )
		|| [ 'time-band', 'volume-band' ].includes( e.target.id )
	) return
	
	S.webradio ? CONTEXT.thumbnail() : COVERART.change();
} );
$( '#coverT' ).press( () => {
	if ( typeof Android === 'object' ) UTIL.changeIP();
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
		VOLUME.bar.hideClear();
		VOLUME.bar.hide( 'nodelay' );
		return
		
	} else if ( 'screenoff' in V ) {
		delete V.screenoff;
		return
	}
	
	var cmd = btnctrl[ this.id.replace( /[a-z]/g, '' ) ];
	if ( cmd === 'guide' ) {
		VOLUME.bar.hideClear();
		if ( V.guide ) {
			DISPLAY.guideHide();
			return
		}
		
		V.guide    = true;
		var time   = $TIME.is( ':visible' );
		var volume = $VOLUME.is( ':visible' );
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
		$( '#bar-bottom' ).toggleClass( 'translucent', ! UTIL.barVisible() );
		if ( S.player === 'mpd' ) {
			if ( ! time && ! S.webradio ) {
				$( '#time-band' )
					.removeClass( 'transparent' )
					.text( S.Time ? UTIL.second2HMS( S.Time ) : '' );
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
	
	DISPLAY.guideHide();
	switch ( cmd ) {
		case 'cover':
			$( '#bar-bottom' ).removeClass( 'translucent' );
			if ( ! ( 'coverTL' in V )
				&& ( V.wH - $( '#coverart' )[ 0 ].getBoundingClientRect().bottom ) < 40
				&& ! D.volumenone
				&& $VOLUME.is( ':hidden' )
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
			DISPLAY.bars();
			DISPLAY.playback();
			PLAYBACK.button.options();
			if ( S.state === 'play' && ! S.webradio && ! V.localhost ) {
				PLAYBACK.progress.set();
				setTimeout( PLAYBACK.progress.animate, 0 );
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
						BASH( [ 'mpcoption', option, false, 'CMD OPTION TF' ] );
					} );
					PLAYBACK.button.options();
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
	if ( V.press || WS.readyState !== 1 ) return // fix - missing elapsed if ws closed > reconnect
	
	var cmd   = this.id;
	if ( S.player === 'mpd' && S.state === cmd ) return
	
	if ( $( this ).hasClass( 'btn-toggle' ) ) {
		var tf   = ! S[ cmd ];
		S[ cmd ] = tf;
		BASH( [ 'mpcoption', cmd, tf, 'CMD OPTION TF' ] );
		PLAYBACK.button.options();
		LOCAL( 600 );
	} else {
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ cmd ).addClass( 'active' );
		if ( cmd === 'play' ) {
			var stateprev = S.state;
			S.state = cmd;
			PLAYBACK.vu();
			PLAYBACK.info.color();
			if ( stateprev === 'stop' ) {
				S.webradio ? $( '#title, #elapsed' ).html( V.blinkdot ) : $( '#elapsed' ).empty();
				$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
				$( '#total' ).text( V.timehms );
			}
			BASH( [ 'mpcplayback', 'play', 'CMD ACTION' ] );
		} else if ( cmd === 'stop' ) {
			S.state = cmd;
			UTIL.intervalClear.elapsed();
			PLAYBACK.stop();
			if ( S.player !== 'mpd' ) {
				BASH( [ 'playerstop', S.elapsed, 'CMD ELAPSED' ] );
				var icon_player = {
					  airplay   : 'AirPlay'
					, bluetooth : 'Bluetooth'
					, snapcast  : 'Snapcast'
					, spotify   : 'Spotify'
					, upnp      : 'UPnP'
				}
				BANNER( S.player, icon_player[ S.player ], 'Stop ...' );
				return
			}
			
			if ( S.pllength ) BASH( [ 'mpcplayback', 'stop', 'CMD ACTION' ] );
		} else if ( cmd === 'pause' ) {
			if ( S.state === 'stop' ) return
			
			S.state = cmd;
			UTIL.intervalClear.elapsed();
			PLAYBACK.info.color();
			BASH( [ 'mpcplayback', 'pause', 'CMD ACTION' ] );
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
			PLAYLIST.skip();
		}
	}
} );
$( '#previous, #next, #coverR, #coverL' ).press( e => {
	var next = [ 'next', 'coverR' ].includes( e.target.id );
	if ( ( next && S.song + 1 === S.pllength ) || ( ! next && S.song === 0 ) ) return
	
	BANNER( 'playlist', 'Playlist', 'Skip to '+ ( next ? 'last ...' : 'first ...' ) );
	S.song   = next ? S.pllength - 1 : 0;
	PLAYLIST.skip();
} );
$( '#bio' ).on( 'click', '.biosimilar', function() {
	BIO.get( $( this ).text(), 'getsimilar' );
} ).on( 'click', '.bioback', function() {
	V.bioartist.pop();
	var getsimilar = V.bioartist.length > 1 ? 'getsimilar' : '';
	BIO.get( V.bioartist.pop(), getsimilar );
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
	if ( MODE.radio() ) {
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
	LIST( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path === '/srv/http/data/'+ V.mode ? V.mode.toUpperCase() : path
			, path      : path
		}
		LIBRARY.list( data );
	} );
} ).on( 'click', '.button-webradio-new', function() {
	WEBRADIO.new();
} ).on( 'click', '.button-latest-clear', function() {
	if ( V.librarytrack ) {
		INFO( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear from Latest album list:<br><br>'+ $( '.licover .lialbum' ).text()
			, ok           : () => {
				BASH( [ 'latestclear', $( '.licover .lipath' ).text(), 'CMD DIR' ], () => $( '#button-lib-back' ).trigger( 'click' ) );
			}
		} );
	} else {
		INFO( {
			  icon         : 'latest'
			, title        : 'Latest'
			, message      : 'Clear Latest albums list?'
			, ok           : () => BASH( [ 'latestclear' ], () => $( '#library' ).trigger( 'click' ) )
		} );
	}
} ).on ( 'click', '#thumbupdate', function() {
	CONTEXT.thumbupdate( 'modealbum' );
} );
$( '#button-lib-update' ).on( 'click', function() {
	if ( S.updating_db ) {
		INFO( {
			  icon    : 'refresh-library'
			, title   : 'Library Database'
			, message : 'Currently updating ...'
			, oklabel : ICON( 'flash' ) +'Stop'
			, okcolor : V.orange
			, ok      : () => BASH( [ 'mpcupdatestop' ] )
		} );
		return
	}
	
	var modes   = [ 'NAS', 'SD', 'USB' ];
	var message = '';
	modes.forEach( k => {
		message += COMMON.sp( 20 ) +'<label><input type="checkbox"><i class="i-'+ k.toLowerCase() +'"></i>'+ k +'</label>';
	} );
	var kv   = {
		  'Update changed files'    : 'update'
		, 'Update all files'        : 'rescan'
	}
	INFO( {
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
			var val = _INFO.val();
			var path = '';
			if ( val.ACTION !== 'refresh' ) {
				var modes = [];
				modes.forEach( k => {
					if ( val[ k ] ) modes.push( k );
				} );
				if ( modes.length < 3 ) path = modes.join( ' ' );
			}
			BASH( [ 'mpcupdate', val.ACTION, path, val.LATEST, 'CMD ACTION PATHMPD LATEST' ] );
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
	LIST( query, function( data ) {
		if ( data == -1 ) {
			INFO( {
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
			LIBRARY.padding();
			DISPLAY.pageScroll( 0 );
			$( '#lib-title' )
					.html( ICON( 'search' ) + keyword )
					.removeClass( 'hide' );
		} );
		$( '#button-lib-back, #lib-mode-list' ).addClass( 'hide' );
		$( '#lib-search-close' ).html( data.count +' <gr>of</gr>' );
	}, 'json' );
} );
$( '#page-library' ).on( 'click', '.index.modes i', function() {
	if ( ! $( this ).index() ) {
		DISPLAY.pageScroll( 0 );
		return
	}
	
	var mode   = this.className.replace( 'i-', '' );
	var scroll = $( '#search-list li[data-mode='+ mode +']' ).eq( 0 ).offset().top;
	scroll    -= $( '.content-top' )[ 0 ].getBoundingClientRect().bottom;
	DISPLAY.pageScroll( scroll );
} );
$( '#lib-search-close' ).on( 'click', function() {
	LIBRARY.get();
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
		$( '#lib-title' ).html( ICON( 'search' ) + $( '#lib-search-input' ).val() );
		$( '#lib-search, #button-lib-search, #search-list' ).removeClass( 'hide' );
		return
	}
	
	var $target = '';
	if ( MODE.album() ) {
		$target = $( '.licover' ).length ? $( '.mode.'+ V.mode ) : $( '#library' );
	} else if ( MODE.file( 'radio' ) ) {
		var $breadcrumbs = $( '#lib-title a' );
		$target = $breadcrumbs.length > 1 ? $breadcrumbs.eq( -2 ) : $( '#library' );
	} else if ( V.query.length === 1 && ! MODE.radio() ) {
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
	LIST( query, function( html ) {
		if ( 'gmode' in V && V.gmode !== V.mode ) V.mode = V.gmode;
		var data = {
			  html      : html
			, modetitle : query.modetitle
			, path      : query.path
		}
		LIBRARY.list( data );
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
	
	var moderadio = MODE.radio();
	var path      = V.mode.toUpperCase();
	// V.modes: sd, nas, usb, webradio, dabradio, album, latest, artist, albumartist, composer, conductor, genre, playlists
	// ( coverart, bookmark by other functions )
	if ( MODE.file() ) { // browse by directory
		var query = {
			  library : 'lsdir'
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
	LIST( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : moderadio ? pathradio : path
		}
		LIBRARY.list( data );
	} );
	query.path      = moderadio ? '' : path;
	query.modetitle = path;
	V.query.push( query );
} ).on( 'click', '.bkradio', function( e ) { // delegate - id changed on renamed
	if ( V.press || $( '.bkedit' ).length ) return
	
	$LI          = $( this );
	if ( D.tapaddplay || D.tapreplaceplay ) {
		LIBRARY.addReplace();
		return
	}
	
	var $img     = $LI.find( '.bkcoverart' );
	var icon     = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : ICON( 'bookmark bl' );
	var path     = $LI.find( '.lipath' ).text();
	V.list.name  = $LI.find( '.name' ).text();
	INFO( {
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
				PLAYLIST.add();
			} );
		}
		, okno      : true
	} );
} ).on( 'click', '.mode.bookmark:not( .bkradio )', function( e ) { // delegate - id changed on renamed
	if ( V.press || $( '.bkedit' ).length ) return
	
	var path  = $( this ).find( '.lipath' ).text();
	V.mode    = path.slice( 0, 4 ) === '/srv' ? path.slice( 15, 23 ) : path.split( '/' )[ 0 ].toLowerCase();
	var query = {
		  library : V.mode === 'webradio' ? 'radio' : 'ls'
		, string  : path
		, gmode   : V.mode
	}
	LIST( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : path
			, path      : path
		}
		LIBRARY.list( data );
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
		var icon = ICON( 'bookmark bl' )
				  +'<br><a class="bklabel">'+ name +'</a>'
	}
	INFO( {
		  icon    : 'bookmark'
		, title   : 'Remove Bookmark'
		, message : icon
		, oklabel : ICON( 'remove' ) +'Remove'
		, okcolor : V.red
		, ok      : () => BASH( [ 'bookmarkremove', name, 'CMD NAME' ] )
	} );
} ).on( 'click', '.bk-rename', function() {
	var $this = $( this ).parent();
	var name  = $this.find( '.name' ).text();
	INFO( {
		  icon         : 'bookmark'
		, title        : 'Rename Bookmark'
		, message      : '<div class="infobookmark">'+ ICON( 'bookmark bookmark' )
						+'<br><span class="bklabel">'+ name +'</span></div>'
		, list         : [ 'To:', 'text' ]
		, values       : name
		, checkblank   : true
		, checkchanged : true
		, oklabel      : ICON( 'flash' ) +'Rename'
		, ok           : () => BASH( [ 'bookmarkrename', name, _INFO.val(), 'CMD NAME NEWNAME' ] )
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
		var message = '<div class="infobookmark">'+ ICON( 'bookmark' )
					 +'<span class="bklabel">'+ name +'</span></div>';
	}
	var dir   = '/mnt/MPD/'+ $this.find( '.lipath' ).text();
	INFO( {
		  icon        : icon
		, title       : 'Bookmark Thumbnail'
		, message     : message
		, file        : { oklabel: ICON( 'flash' ) +'Replace', type: 'image/*' }
		, buttonlabel : ! thumbnail ? '' : ICON( 'bookmark' ) +' Icon'
		, buttoncolor : ! thumbnail ? '' : V.orange
		, button      : ! thumbnail ? '' : () => {
			BASH( [ 'cmd-coverart.sh', 'reset', 'folderthumb', dir, 'CMD TYPE DIR' ] );
		}
		, ok          : () => {
			IMAGE.replace( 'bookmark', dir +'/coverart' );
		}
	} );
} ).on( 'click', '.dabradio.nodata', function() {
	COMMON.dabScan();
} ).press( {
	  delegate : '.mode.bookmark'
	, action   : () => {
		V.bklabel = $( this ).find( '.label' );
		$( '.mode.bookmark' ).each( ( i, el ) => {
			var $this      = $( el );
			var buttonhtml = ICON( 'remove bkedit bk-remove' );
			if ( ! $this.find( 'img' ).length )  buttonhtml += ICON( 'edit bkedit bk-rename' );
			if ( ! $this.hasClass( 'bkradio' ) ) buttonhtml += ICON( 'coverart bkedit bk-cover' );
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
	LIST( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : $this.find( '.liname' ).text()
			, path      : path
		}
		LIBRARY.list( data );
	} );
	V.query.push( query );
} ).press( {
	  delegate : '.coverart'
	, action   : function( e ) {
		var $this  = $( e.currentTarget );
		INFO( {
			  icon    : V.icoverart
			, title   : COMMON.capitalize( V.mode ) +' Thumbnail'
			, message : $this.find( 'img' )[ 0 ].outerHTML
						+'<p>'+ $this.find( '.coverart1' ).text()
						+'<br>'+ $this.find( '.coverart2' ).text()
						+'</p>'
						+'<br>Remove this thumbnail from list?'
			, okcolor : V.orange
			, oklabel : ICON( 'remove' ) +'Exclude'
			, ok      : () => {
				BASH( [ 'albumignore', album, artist, 'CMD ALBUM ARTIST' ] );
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
	var path    = '/mnt/MPD/'+ UTIL.dirName( lipath );
	if ( $this.hasClass( 'cover-save' ) ) {
		COVERART.save();
	} else {
		COVERART.change();
	}
} ).press( {
	  delegate : '.licoverimg'
	, action   : function( e ) {
		var $this = $( e.currentTarget );
		$this.parent().removeClass( 'active' );
		$( '#menu-album' ).addClass( 'hide' );
		COVERART.change();
	}
} ).on( 'click', '#lib-list li, #search-list li', function( e ) {
	e.stopPropagation();
	if ( V.press ) return
	
	$LI             = $( this );
	var $target     = $( e.target );
	if ( $target.is( '.i-save, .coverart' ) ) return
	
	var l_mode      = $LI.data( 'mode' );
	var l_modefile  = [ 'lsmode', 'nas', 'sd', 'usb' ].includes( l_mode );
	var l_moderadio = l_mode.slice( -5 ) === 'radio'; // radio .dir has no mode
	if ( $target.is( '.li-icon, .licoverimg' )
		|| $target.data( 'menu' )
		|| $LI.find( '.i-music' ).length
		|| l_moderadio
	) {
		MENU.library( $target );
		return
	}
	
	if ( D.tapaddplay || D.tapreplaceplay ) {
		if ( $LI.find( '.li-icon' ).is( '.i-music' ) || l_moderadio ) {
			LIBRARY.addReplace();
			return
		}
	}
	
	MENU.hide();
	if ( $LI.hasClass( 'licover' ) ) {
		if ( $target.is( '.liartist, .i-artist, .i-albumartist, .licomposer, .i-composer' ) ) {
			var name = ( $target.is( '.licomposer, .i-composer' ) ) ? $LI.find( '.licomposer' ).text() : $LI.find( '.liartist' ).text();
			BIO.get( name );
		} else if ( $target.hasClass( 'liinfopath' ) ) {
			V.gmode     = V.mode;
			var path    = $target.text();
			V.mode      = path.replace( /\/.*/, '' ).toLowerCase();
			var query   = {
				  library : 'ls'
				, string  : path
				, gmode   : V.mode
			}
			LIST( query, function( html ) {
				var data = {
					  html      : html
					, modetitle : path
					, path      : path
				}
				LIBRARY.list( data );
			} );
		}
		return
	}
	
	if ( $target.hasClass( 'lialbum' ) ) {
		if ( ! V.localhost ) window.open( 'https://www.last.fm/music/'+ $LI.find( '.liartist' ).text() +'/'+ $LI.find( '.lialbum' ).text(), '_blank' );
		return
	}
	
	if ( ! V.search ) $LI.addClass( 'active' );
	var libpath    = $( '#lib-path' ).text();
	var path       = $LI.find( '.lipath' ).text();
	if ( l_modefile ) {
		if ( MODE.file( 'radio' ) ) {
			var query     = {
				  library : 'ls'
				, string  : path
			}
			var modetitle = path;
		} else {
			var query     = {
				  library : 'lsmode'
				, string  : [ path, libpath ]
			}
			var modetitle = libpath; // keep title of non-file modes
		}
	} else if ( MODE.radio() ) { // dabradio, webradio
		path          = libpath +'/'+ path;
		var query     = {
			  library : 'radio'
			, string  : path
		}
		var modetitle = path;
	} else if ( ! V.search && V.mode.slice( -6 ) === 'artist' ) {
		var query     = { // artist, albumartist
			  library : 'findartist'
			, mode    : V.mode
			, string  : path
			, format  : [ 'album', 'file' ]
		}
		var modetitle = path;
	} else if ( l_mode !== 'album' ) { // non-album
		if ( [ 'date', 'genre' ].includes( V.mode ) ) {
			var format = [ 'artist', 'album', 'file' ];
		} else if ( [ 'conductor', 'composer' ].includes( V.mode ) ) {
			var format = [ 'album', 'artist', 'file' ];
		}
		var query     = {
			  library : 'findmode'
			, mode    : V.search ? l_mode : V.mode
			, string  : path
			, format  : format
		}
		var modetitle = path;
	} else { // album
		var name = $LI.find( '.liname' ).text();
		if ( MODE.album() ) {
			if ( name ) { // albums with the same names
				var query     = {
					  library : 'find'
					, mode    : [ 'album', 'artist', 'file' ]
					, string  : [ name, path ]
				}
				var modetitle = name;
			} else {
				var query     = {
					  library : 'findmode'
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
	LIST( query, function( html ) {
		if ( ! html ) {
			$LI
				.removeClass( 'active' )
				.addClass( 'nodata' );
			MENU.library( $target );
			return
		}
		
		var data = {
			  html      : html
			, modetitle : modetitle
			, path      : path
		}
		LIBRARY.list( data );
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
	DISPLAY.pageScroll( scrollT - UTIL.barVisible( 80, 40 ) );
} );
// PLAYLIST /////////////////////////////////////////////////////////////////////////////////////
$( '#button-pl-back' ).on( 'click', function() {
	if ( 'pladd' in V ) {
		I.active  = false;
		PLAYLIST.get();
		BANNER_HIDE();
	} else {
		V.playlistlist ? PLAYLIST.get() : $( '#button-pl-playlists' ).trigger( 'click' );
	}
} );
$( '#button-pl-consume' ).on( 'click', function() {
	S.consume = ! S.consume;
	$( this ).toggleClass( 'bl', S.consume );
	BANNER( 'playlist', 'Consume Mode', S.consume ? 'On - Remove each song after played.' : 'Off' );
	BASH( [ 'mpcoption', 'consume', S.consume, 'CMD OPTION TF' ] );
} );
$( '#button-pl-librandom' ).on( 'click', function() {
	var $this = $( this );
	var icon  = 'librandom';
	var title = 'Roll The Dice';
	if ( S.librandom ) {
		S.librandom = false;
		$this.removeClass( 'bl' );
		BANNER( icon, title, 'Off ...' );
		BASH( [ 'librandom', 'OFF' ] );
	} else {
		INFO( {
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
					BANNER( icon, title, 'On ...' );
					BASH( [ 'librandom', action, album, 'CMD ACTION ALBUM' ] );
				} );
			}
			, okno      : true
		} );
	}
} );
$( '#button-pl-shuffle' ).on( 'click', function() {
	INFO( {
		  icon    : 'shuffle'
		, title   : 'Shuffle Playlist'
		, message : 'Shuffle all tracks in playlist?'
		, ok      : () => BASH( [ 'mpcshuffle' ] )
	} );
} );
$( '#button-pl-clear' ).on( 'click', function() {
	if ( S.pllength === 1 ) {
		BASH( [ 'mpcremove' ] );
		PLAYLIST.render.home();
	} else if ( $( '.pl-remove' ).length ) {
		$( '.pl-remove' ).remove();
	} else {
		INFO( {
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
							$( '#pl-list .li1' ).before( ICON( 'remove pl-remove' ) );
							$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
							$( '#infoX' ).trigger( 'click' );
							break;
						case 'range':
							PLAYLIST.removeRange();
							break;
						case 'crop':
							CONTEXT.crop();
							$( '#infoX' ).trigger( 'click' );
							break;
					}
				} );
			}
			, ok         : () => {
				BASH( [ 'mpcremove' ] );
				PLAYBACK.blank();
				PLAYLIST.render.home();
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
				+ audiocdL ? audiocdL + ICON( 'audiocd wh' ) : ''
				+ upnpL ? upnpL +'&emsp;'+ ICON( 'upnp wh' ) : ''
				+ notsavedL ? notsavedL +'&emsp;'+ ICON( 'save wh' ) : ''
		_INFO.warning( 'playlists', 'Save Playlist', message );
	} else {
		PLAYLIST.new();
	}
} );
$( '#button-pl-playlists' ).on( 'click', function() {
	DISPLAY.pageScroll( 0 );
	LIST( { playlist: 'list' }, ( data ) => PLAYLIST.playlists.home( data ), 'json' );
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
	DISPLAY.pageScroll( 0 );
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
		PLAYLIST.removeRange( V.plrange );
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
				PLAYLIST.render.widthRadio( 'stop' );
				$( '#stop' ).trigger( 'click' );
			} else {
				$( '#pause' ).trigger( 'click' );
				$this.find( '.elapsed i' ).toggleClass( 'i-play i-pause' );
			}
		} else {
			$( '#play' ).trigger( 'click' );
		}
	} else {
		UTIL.intervalClear.all();
		$( '.elapsed' ).empty();
		BASH( [ 'mpcskippl', $this.index() + 1, 'play', 'CMD POS ACTION' ] );
		$( '#pl-list li.active, #playback-controls .btn' ).removeClass( 'active' );
		$this.add( '#play' ).addClass( 'active' );
	}
} ).on( 'click', '.li-icon, .savewr', function() {
	if ( 'plrange' in V ) return
	
	MENU.playlist( $( this ) );
} ).on( 'click', '.pl-remove', function() { // remove from playlist
	PLAYLIST.remove( $( this ).parent() );
} );
$( '#pl-title' ).on( 'click', '.savedlist', function() {
	var $menu   = $( '#menu-playlist' );
	var active = ! $menu.hasClass( 'hide' );
	MENU.hide();
	if ( active ) return
	
	V.list.path = $( '#pl-title .lipath' ).text();
	$menu.find( '.plrename, .pldelete' ).addClass( 'hide' );
	MENU.scroll( $menu, 88 );
} );
$( '#page-playlist' ).on( 'click', '#pl-savedlist li', function( e ) {
	e.stopPropagation();
	$LI          = $( this );
	var $target  = $( e.target );
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	var active   = $LI.hasClass( 'active' );
	MENU.hide();
	if ( menushow && active ) return
	
	var liicon   = $target.hasClass( 'li-icon' );
	if ( V.playlisttrack || liicon ) {
		if ( 'pladd' in V ) {
			V.pladd.index = $LI.index();
			V.pladd.track = $LI.find( '.li1 .name' ).text()
							+'<br><gr>'+ $LI.find( '.li2 .name' ).text() +'</gr>';
			PLAYLIST.insert.select();
		} else {
			var menu  = $target.data( 'menu' ) || $LI.find( '.li-icon' ).data ( 'menu' );
			var $menu = $( '#menu-'+ menu );
			V.list    = {};
			$( '#pl-savedlist li.active' ).removeClass( 'active' );
			if ( V.playlistlist ) {
				V.list.name = $LI.find( '.lipath' ).text();
				V.list.path = V.list.name;
			} else {
				V.list.name   = $LI.find( '.name' ).text();
				V.list.path   = $LI.find( '.lipath' ).text() || V.list.name;
				V.list.track  = $LI.data( 'track' );
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
				$menu.find( '.wrsave' ).toggleClass( 'hide', ! $LI.hasClass( 'notsaved' ) );
			}
			$LI.addClass( 'active' );
			$menu.find( '.playnext, .replace, .i-play-replace' ).toggleClass( 'hide', S.pllength === 0 );
			$menu.find( '.playnext' ).toggleClass( 'hide', S.state !== 'play' );
			$menu.find( '.submenu' ).toggleClass( 'disabled', S.player !== 'mpd' );
			MENU.scroll( $menu, $LI.position().top + 48 );
		}
	} else {
		var name = $LI.find( '.lipath' ).text();
		PLAYLIST.playlists.list( name );
		if ( 'pladd' in V ) {
			V.pladd.name = name;
			PLAYLIST.insert.target();
		}
	}
} );

new Sortable( document.getElementById( 'lib-mode-list' ), {
	  ...V.option.sortable
	, onClone  : () => V.sortable = true
	, onUpdate : () => {
		var order = [];
		$( '.mode' ).each( ( i, el ) => {
			var $el  = $( el );
			if ( $el.hasClass( 'bookmark' ) ) {
				var data = $el.find( $el.hasClass( 'bkradio' ) ? '.name' : '.lipath' ).text();
			} else {
				var data = $el.data( 'mode' );
			}
			order.push( data );
		} );
		COMMON.json.save( 'order', order );
		setTimeout( () => delete V.sortable, 1000 );
	}
} );
new Sortable( document.getElementById( 'pl-list' ), {
	  ...V.option.sortable
	, onUpdate   : e => {
		V.sortable = true
		BASH( [ 'mpcmove', e.oldIndex + 1, e.newIndex + 1, 'CMD FROM TO' ] );
		$( '#pl-list li .pos' ).each( ( i, el ) => $( el ).text( i + 1 ) );
		setTimeout( () => delete V.sortable, 1000 );
	}
} );
new Sortable( document.getElementById( 'pl-savedlist' ), {
	  ...V.option.sortable
	, onUpdate   : e => {
		V.sortable = true
		BASH( [ 'savedpledit', $( '#pl-title .lipath' ).text(), 'move', e.oldIndex + 1, e.newIndex + 1, 'CMD NAME ACTION FROM TO' ] );
		$( '#pl-savedlist li .pos' ).each( ( i, el ) => $( el ).text( i + 1 ) );
		setTimeout( () => delete V.sortable, 1000 );
	}
} );

// color /////////////////////////////////////////////////////////////////////////////////////
$( '#colorok' ).on( 'click', function() {
	COLOR.save( V.ctx.hsl );
	COLOR.hide();
} );
$( '#colorreset' ).on( 'click', function() {
	COLOR.cssSet( V.color.cd );
	BASH( [ 'color', true, 'CMD RESET' ] );
	COLOR.hide();
} );
$( '#colorcancel' ).on( 'click', function() {
	V.ctx.hsl = COMMON.json.clone( V.ctx.hsl0 );
	COLOR.cssSet( V.ctx.hsl );
	COLOR.hide();
	if ( S.player === 'mpd' ) {
		if ( V.playlist ) PLAYLIST.render.scroll();
	} else {
		UTIL.switchPage( 'playback' );
	}
} );
$( '#pickhue' ).on( 'touchstart mousedown', e => {
	V.hue = true;
	COLOR.pick.xy( e, 'hue' );
	$( '#pickhue' ).css( 'border-radius', 0 );     // drag outside #pickhue
	$( '#picknone, #picksat' ).addClass( 'hide' ); // drag inside
	$( '#colorok' ).removeClass( 'disabled' );
} ).on( 'touchmove mousemove', e => {
	if ( V.hue ) COLOR.pick.xy( e, 'hue' );
} ).on( 'touchend mouseup', () => {
	if ( ! V.hue ) return
	
	V.hue = false;
	if ( V.ctx.hsl.h < 0 ) V.ctx.hsl.h += 360;
	$( '#pickhue' ).css( 'border-radius', '' );
	$( '#picknone, #picksat' ).removeClass( 'hide' );
} );
$( '#picksat' ).on( 'touchstart mousedown', e => {
	V.sat = true;
	COLOR.pick.xy( e, 'sat', 'clear' );
	$( '#colorok' ).removeClass( 'disabled' );
} ).on( 'touchmove', e => {
	if ( ! V.sat  ) return
	
	var et = e.touches[ 0 ];
	if ( 'picksat' === document.elementFromPoint( et.clientX, et.clientY ).id ) {
		COLOR.pick.xy( e, 'sat', V.satout );
		if ( V.satout ) V.satout = false;
	} else {
		V.satout = true;
		COLOR.pick.point( V.ctx.sat.x, V.ctx.sat.y );
	}
} ).on( 'mousemove', e => {
	if ( V.sat ) COLOR.pick.xy( e, 'sat' );
} ).on( 'mouseleave', () => {
	if ( V.sat ) COLOR.pick.point( V.ctx.sat.x, V.ctx.sat.y );
} ).on( 'mouseenter', () => {
	if ( V.sat ) $( '#sat' ).addClass( 'hide' );
} );
$( '#colorpicker' ).on( 'touchend mouseup', () => { // drag stop both inside and outside #picksat
	if ( ! V.sat ) return
	
	V.sat = false;
	COLOR.pick.point( V.ctx.sat.x, V.ctx.sat.y );
} );
// eq /////////////////////////////////////////////////////////////////////////////////////
$( '#infoOverlay' ).on( 'click', '#eqnew', function() {
	$( '#eqedit, #eq .select2-container, #eqnew' ).addClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).removeClass( 'hide' );
	$( '#eqname' )
		.css( 'display', 'inline-block' )
		.val( E.active );
} ).on( 'click', '#eqedit', function() {
	var list    = [];
	var values  = [];
	var presets = Object.keys( E.preset ).sort();
	presets.forEach( k => {
		if ( k === 'Flat' ) return
		
		list.push( [ '', 'text', { suffix: ICON( 'remove' ) } ] );
		values.push( k );
	} );
	var e = COMMON.json.clone( E );
	INFO( {
		  icon         : 'equalizer'
		, title        : 'Presets'
		, list         : list
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			$( '#infoList input' ).on( 'blur', function() {
				var index = $( this ).parents( 'tr' ).index();
				var name0 = values[ index ];
				var name1 = $( this ).val();
				if ( name0 !== name1 ) {
					if ( e.active === name0 ) e.active = name1;
					e.preset[ name1 ] = e.preset[ name0 ];
					delete e.preset[ name0 ];
				}
			} );
			$( '#infoList i' ).on( 'click', function() {
				var $tr   = $( this ).parents( 'tr' );
				var name1 = $tr.find( 'input' ).val();
				if ( e.active === name1 ) e.active = 'Flat';
				delete e.preset[ name1 ];
				$tr.remove();
				if ( ! $( '#infoList tr' ).length ) $( '#infoList table' ).append( '<tr><td><gr>(empty)<gr></td></tr>' );
				$( '#infoOk' ).removeClass( 'disabled' );
			} );
		}
		, cancel       : () => EQ.info( E )
		, ok           : () => {
			COMMON.json.save( 'equalizer', e );
			EQ.info( e );
		}
	} );
} ).on( 'click', '#eqback', function() {
	$( '#eqedit, #eq .select2-container, #eqnew' ).removeClass( 'hide' );
	$( '#eqsave, #eqname, #eqback' ).addClass( 'hide' );
	$( '#eqname' ).empty();
} ).on( 'input', '#eqname', function( e ) {
	$( '#eqsave' ).toggleClass( 'disabled', $( this ).val() in E.preset );
	if ( e.key === 'Enter' && ! $eqsave.hasClass( 'disabled' ) ) $eqsave.trigger( 'click' );
} ).on( 'input', '#eqpreset', function() { // preset
	var name   = $( this ).val();
	E.active   = name;
	var values = E.preset[ name ];
	BASH( [ 'equalizer', values.join( ' ' ), EQ.user, 'CMD VALUES USR' ] );
	I.values = [ ...values, name ];
	_INFO.setValues();
	EQ.level();
	COMMON.json.save( 'equalizer', E );
} ).on( 'click', '#eqsave', function() {
	var name         = $( '#eqname' ).val();
	E.preset[ name ] = E.preset[ E.active ];
	E.active         = name;
	COMMON.json.save( 'equalizer', E );
	$( '#eqback' ).trigger( 'click' );
	$( '#eqpreset' )
		.html( COMMON.htmlOption( Object.keys( E.preset ) ) )
		.val( name )
		.trigger( 'change' );
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
	LYRICS.fetch( 'refresh' );
} );
$( '#lyrics' ).on( 'click', '.i-close',  function() {
	if ( $( '#lyricsedit' ).hasClass( 'hide' ) && $( '#lyricstextarea' ).val() !== V.lyrics ) {
		INFO( {
			  icon     : 'lyrics'
			, title    : 'Lyrics'
			, message  : 'Discard changes made to this lyrics?'
			, ok       : LYRICS.hide
		} );
	} else {
		LYRICS.hide();
	}
} );
$( '#lyricsback' ).on( 'click', function() {
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
	$( '#lyricsartist' ).css( 'width', '' );
} );
$( '#lyricsundo' ).on( 'click', function() {
	INFO( {
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
	INFO( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Save this lyrics?'
		, ok       : () => {
			V.lyrics   = $( '#lyricstextarea' ).val();
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			BASH( [ 'lyrics', artist, title, 'save', V.lyrics.replace( /\n/g, '\\n' ), 'CMD ARTIST TITLE ACTION DATA' ] );
			lyricstop  = $( '#lyricstextarea' ).scrollTop();
			LYRICS.show( V.lyrics );
			$( '#lyricseditbtngroup' ).addClass( 'hide' );
			$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
		}
	} );
} );	
$( '#lyricsdelete' ).on( 'click', function() {
	INFO( {
		  icon    : 'lyrics'
		, title   : 'Lyrics'
		, message : 'Delete this lyrics?'
		, oklabel : ICON( 'remove' ) +'Delete'
		, okcolor : V.red
		, ok      : () => {
			var artist = $( '#lyricsartist' ).text();
			var title  = $( '#lyricstitle' ).text();
			BASH( [ 'lyrics', artist, title, 'delete', 'CMD ARTIST TITLE ACTION' ] );
			V.lyrics   = '';
			LYRICS.hide();
		}
	} );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
