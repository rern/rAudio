document.title = 'Guide';
[ '.helphead', '#debug' ].forEach( cl => document.querySelector( cl ).remove() );
[ '.head', '#bar-bottom' ].forEach( k => document.querySelector( k ).classList.remove( 'hide' ) );
var P          = {
	  playback : 1
	, library  : 22
	, playlist : 39
	, settings : 47
	, total    : 57
}
var E          = {
	  bar : document.getElementById( 'bar-bottom' )
	, img : document.querySelector( 'img' )
};
var HASH       = '?v='+ Math.round( Date.now() / 1000 );
var n          = 1;
[ 'close', 'library', 'playback', 'playlist', 'settings', 'prev', 'next' ].forEach( id => {
	E[ id ] = document.getElementById( id )
	E[ id ].addEventListener( 'click', function() {
		var tabactive = document.querySelector( 'div.active' );
		if ( this === tabactive ) return
		
		var active;
		if ( id === 'close' ) {
			location.href = '/';
		} else if ( id === 'next' ) {
			n++;
			if ( n > P.total ) n = 1;
		} else if ( id === 'prev' ) {
			n--;
			if ( n < 1 ) n = P.total;
		} else {
			n = P[ id ];
		}
		if ( n >= P.settings ) {
			active = 'settings';
		} else if ( n >= P.playlist ) {
			active = 'playlist';
		} else if ( n >= P.library ) {
			active = 'library';
		} else {
			active = 'playback';
		}
		tabactive.className = '';
		document.getElementById( active ).className = 'active'
		E.img.src = '/assets/img/guide/'+ n +'.jpg'+ HASH;
	} );
} );
E.playback.classList.add( 'active' );
//---------------------------------------------------------------------------------------
document.querySelector( '.i-gear' ).addEventListener( 'click', () => {
	var hide = window.getComputedStyle( E.bar ).getPropertyValue( 'display' ) === 'none' ;
	E.bar.style.display = hide ? 'block' : 'none';
} );
document.body.addEventListener( 'keydown', e => {
	switch ( e.key ) {
		case 'ArrowLeft':
		case 'ArrowUp':
			E.prev.click();
			break
		case 'ArrowRight':
		case 'ArrowDown':
		case ' ':
			e.preventDefault();
			E.next.click();
			break
		case 'x':
			if ( e.ctrlKey ) E.close.click();
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
			xdiff > 0 ? E.next.click() : E.prev.click();
		}
	} );
}
