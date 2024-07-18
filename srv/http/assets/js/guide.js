var n     = 1;
var page  = {
	  playback : 1
	, library  : 22
	, playlist : 39
	, settings : 47
	, total    : 58
}
var E     = {};
[ 'bar-bottom', 'close', 'guideimg' ].forEach( el => E[ el ] = document.getElementById( el ) );
var hash  = E.guideimg.src.replace( /.*jpg/, '' )
var tabs  = E[ 'bar-bottom' ].children;
var tabsL = tabs.length;
for( i = 0; i < tabsL; i++ ) {
	E[ tabs[ i ].id ] = tabs[ i ];
	tabs[ i ].addEventListener( 'click', function() {
		var tabactive = E[ 'bar-bottom' ].querySelector( '.active' );
		if ( this === tabactive ) return
		
		var id = this.id;
		var active;
		if ( id === 'guidenext' ) {
			n++;
			if ( n > page.total ) n = 1;
		} else if ( id === 'guideprev' ) {
			n--;
			if ( n < 1 ) n = page.total;
		} else {
			n = page[ id ];
		}
		if ( n >= page.settings ) {
			active = 'settings';
		} else if ( n >= page.playlist ) {
			active = 'playlist';
		} else if ( n >= page.library ) {
			active = 'library';
		} else {
			active = 'playback';
		}
		tabactive.className = '';
		E[ active ].className = 'active'
		E.guideimg.src = '/assets/img/guide/'+ n +'.jpg'+ hash;
	} );
}
//---------------------------------------------------------------------------------------
document.title = 'Guide';
E.playback.classList.add( 'active' );
E.close.addEventListener( 'click', () => location.href = '/' );
document.body.addEventListener( 'keydown', e => {
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
	window.addEventListener( 'touchstart', e => {
		xstart = e.changedTouches[ 0 ].pageX;
	} );
	window.addEventListener( 'touchend', e => {
		var xdiff = xstart - e.changedTouches[ 0 ].pageX;
		if ( Math.abs( xdiff ) > 100 ) {
			xdiff > 0 ? E.guidenext.click() : E.guideprev.click();
		}
	} );
}
