var n     = 1;
var page  = {
	  playback : 1
	, library  : 22
	, playlist : 39
	, settings : 47
	, total    : 58
}
var E     = {};
[ 'close', 'bar-bottom', 'guideimg' ].forEach( el => E[ el ] = document.getElementById( el ) );
var hash  = E.guideimg.src.replace( /.*jpg/, '' )
var tabs  = E[ 'bar-bottom' ].children;
var tabsL = tabs.length;
for( i = 0; i < tabsL; i++ ) {
	E[ tabs[ i ].id ] = tabs[ i ];
	tabs[ i ].addEventListener( 'click', function() {
		var tabactive = document.getElementsByClassName( 'active' )[ 0 ];
		if ( this === tabactive ) return
		
		var id = this.id;
		var active;
		if ( id === 'guidenext' ) {
			n = n < page.total ? n + 1 : 1;
		} else if ( id === 'guideprev' ) {
			n = n > 1 ? n - 1 : page.total;
		} else {
			n = page[ id ];
		}
		if ( n > 0 && n < page.library ) {
			active = 'playback';
		} else if ( n >= page.library && n < page.playlist ) {
			active = 'library';
		} else if ( n >= page.playlist && n < page.settings ) {
			active = 'playlist';
		} else if ( n >= page.settings && n <= page.total ) {
			active = 'settings';
		}
		tabactive.className = '';
		E[ active ].className = 'active'
		E.guideimg.src = '/assets/img/guide/'+ n +'.jpg'+ hash;
	} );
}
//---------------------------------------------------------------------------------------
document.title = 'Guide';
E.playback.classList.add( 'active' );
E.close.addEventListener( 'click', function() {
	location.href = '/';
} );
document.body.addEventListener( 'keydown', ( e ) => {
	switch ( e.key ) {
		case 'ArrowLeft':
		case 'ArrowUp':
			E.guideprev.click();
			break
		case 'ArrowRight':
		case 'ArrowDown':
			E.guidenext.click();
			break
		case 'x':
			if ( e.ctrlKey ) location.href = '/';
			break
	}
} );
if ( navigator.maxTouchPoints ) { // swipe
	var xstart;
	window.addEventListener( 'touchstart', function( e ) {
		xstart = e.changedTouches[ 0 ].pageX;
	} );
	window.addEventListener( 'touchend', function( e ) {
		var xdiff = xstart - e.changedTouches[ 0 ].pageX;
		if ( Math.abs( xdiff ) > 100 ) {
			xdiff > 0 ? E.guidenext.click() : E.guideprev.click();
		}
	} );
}
