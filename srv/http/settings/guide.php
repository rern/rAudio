<div id="guide" style="user-select: none;">
	<p><a class="gr" href="https://github.com/rern/rAudio-1"><i class="fa fa-github fa-lg bl" style="vertical-align: -2px"></i> Source</a><span id="count" style="float: right"></span></p>
	<div id="library" class="btn btn-default"><i class="fa fa-library"></i><span>Library</span></div>
	<div id="playback" class="btn btn-default active"><i class="fa fa-playback"></i><span>Playback</span></div>
	<div id="playlist" class="btn btn-default"><i class="fa fa-playlist"></i><span>Playlist</span></div>
	<div id="settings" class="btn btn-default"><i id="settings" class="fa fa-gear"></i></div>
	<div class="prev-next"><i id="previous" class="fa fa-arrow-left"></i>&emsp;<i id="next" class="fa fa-arrow-right"></i></div>
	<img id="image" src="/assets/img/guide/1.jpg?v=<?=$time?>">
</div>
<script>
document.getElementsByClassName( 'container' )[ 0 ].classList.remove( 'hide' );
var close = document.getElementsByClassName( 'close' )[ 0 ];
close.addEventListener( 'click', function() {
	location.href = '/';
} );

var nlibrary = 23;
var nplaylist = 40;
var nsettings = 48;
var ntotal = 60;
var n = 1;

var $ = function( id ) { return document.getElementById( id ) }
var btn = document.getElementsByClassName( 'btn' );
var count = $( 'count' ); // not jQuery on this page
var image = $( 'image' );
var next = $( 'next' );
var previous = $( 'previous' );

count.textContent = n +' / '+ ntotal;
Array.from( btn ).forEach( function( el ) {
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
next.addEventListener( 'click', function() {
	n = n < ntotal ? n + 1 : 1;
	renderPage( n );
} );
previous.addEventListener( 'click', function() {
	n = n > 1 ? n - 1 : ntotal;
	renderPage( n );
} );
// swipe
var xstart;
window.addEventListener( 'touchstart', function( e ) {
	xstart = e.changedTouches[ 0 ].pageX;
} );
window.addEventListener( 'touchend', function( e ) {
	var xdiff = xstart - e.changedTouches[ 0 ].pageX;
	if ( Math.abs( xdiff ) > 100 ) {
		xdiff > 0 ? next.click() : previous.click();
	}
} );

function renderPage( n ) {
	image.src = '/assets/img/guide/'+ n +'.jpg?v=<?=$time?>';
	count.textContent = n +' / '+ ntotal;
	Array.from( btn ).forEach( function( el ) {
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
	$( id ).classList.add( 'active' );
}
</script>
