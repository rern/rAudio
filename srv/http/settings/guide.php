</div>

<img class="guideimg" src="/assets/img/guide/1.jpg<?=$hash?>">
<div id="bar-bottom">
<?php
$html     = '';
foreach( [ 'library', 'playback', 'playlist', 'settings' ] as $id ) {
	$html.= '<div id="'.$id.'" class="btn">'.i( $id ).' <a>'.ucfirst( $id ).'</a></div>';
}
$html    .= '<div id="prevnext">'.i( 'back prev' ).' '.i( 'arrow-right next' ).'</div>';
echo $html.'</div>';
?>
</div>
<script>
[ 'helphead', 'i-gear' ].forEach( cl => document.getElementsByClassName( cl )[ 0 ].remove() );

nlibrary  = 22;
nplaylist = 39;
nsettings = 47;
ntotal    = 58;
n         = 1;
E         = {};
[ 'close', 'guideimg', 'next', 'prev' ].forEach( ( el ) => {
	E[ el ] = document.getElementsByClassName( el )[ 0 ];
} );
E.btns    = Array.from( document.getElementsByClassName( 'btn' ) );
E.btns[ 1 ].classList.add( 'active' );
E.close.addEventListener( 'click', function() {
	location.href = '/';
} );
E.btns.forEach( ( el ) => {
	el.addEventListener( 'click', function() {
		var page = {
			  playback : 1
			, library  : nlibrary
			, playlist : nplaylist
			, settings : nsettings
		}
		n = page[ this.id ]
		renderPage( n );
	} );
} );
E.next.addEventListener( 'click', function() {
	n = n < ntotal ? n + 1 : 1;
	renderPage( n );
} );
E.prev.addEventListener( 'click', function() {
	n = n > 1 ? n - 1 : ntotal;
	renderPage( n );
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

function renderPage( n ) {
	E.guideimg.src = '/assets/img/guide/'+ n +'.jpg<?=$hash?>';
	E.btns.forEach( ( el ) => {
		el.classList.remove( 'active' );
	} );
	if ( n >= 1 && n < nlibrary ) {
		var id = 'playback';
	} else if ( n >= nlibrary && n < nplaylist ) {
		var id = 'library';
	} else if ( n >= nplaylist && n < nsettings ) {
		var id = 'playlist';
	} else {
		var id = 'settings';
	}
	document.getElementById( id ).classList.add( 'active' );
}
</script>
</body>
</html>
