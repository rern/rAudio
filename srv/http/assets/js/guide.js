var page = {
	  playback : 1
	, library  : 22
	, playlist : 39
	, settings : 47
	, total    : 58
}
var n    = 1;
var E    = { bar: document.getElementById( 'bar-bottom' ) };
[ 'close', 'guideimg' ].forEach( el => E[ el ] = document.getElementsByClassName( el )[ 0 ] );
tabs     = E.bar.children;
tabsL    = tabs.length;
for( i = 0; i < tabsL; i++ ) {
	E[ tabs[ i ].id ] = tabs[ i ];
	tabs[ i ].addEventListener( 'click', function() {
		if ( id === 'next' ) {
			var n = n < page.total ? n + 1 : 1;
		} else if ( id === 'prev' ) {
			var n = n > 1 ? n - 1 : page.total;
		} else {
			var n = page[ this.id ];
		}
		E.guideimg.src = '/assets/img/guide/'+ n +'.jpg<?=$hash?>';
	} );
}
E.playback.classList.add( 'active' );
E.close.addEventListener( 'click', function() {
	location.href = '/';
} );
document.body.addEventListener( 'keydown', ( e ) => {
	switch ( e.key ) {
		case 'ArrowLeft':
		case 'ArrowUp':
			E.prev.click();
			break
		case 'ArrowRight':
		case 'ArrowDown':
			E.next.click();
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
			xdiff > 0 ? E.next.click() : E.prev.click();
		}
	} );
}
