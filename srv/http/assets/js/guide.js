var n     = 1;
var page  = {
	  playback : 1
	, library  : 22
	, playlist : 39
	, settings : 47
	, total    : 57
}
var E     = {
	  bar   : document.getElementById( 'bar-bottom' )
	, close : document.getElementById( 'close' )
	, gear  : document.querySelector( '.i-gear' )
	, img   : document.getElementById( 'guideimg' )
};
var hash  = E.img.src.replace( /.*jpg/, '' )
var tabs  = E.bar.children;
var tabsL = tabs.length;
for( i = 0; i < tabsL; i++ ) {
	E[ tabs[ i ].id ] = tabs[ i ];
	tabs[ i ].addEventListener( 'click', function() {
		var tabactive = E.bar.querySelector( '.active' );
		if ( this === tabactive ) return
		
		var id = this.id;
		var active;
		if ( id === 'next' ) {
			n++;
			if ( n > page.total ) n = 1;
		} else if ( id === 'prev' ) {
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
		E.img.src = '/assets/img/guide/'+ n +'.jpg'+ hash;
	} );
}
//---------------------------------------------------------------------------------------
document.title = 'Guide';
[ '.container', '.helphead' ].forEach( cl => document.querySelector( cl ).remove() );
E.playback.classList.add( 'active' );
E.close.addEventListener( 'click', () => location.href = '/' );
E.gear.addEventListener( 'click', () => {
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
			xdiff > 0 ? E.next.click() : E.prev.click();
		}
	} );
}
