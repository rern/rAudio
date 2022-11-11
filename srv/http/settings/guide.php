<style>
#guide {
	position: absolute;
	width: 100%;
	height: 100%;
	max-width: 512px;
	left: 0;
	right: 0;
	margin: 0 auto;
	padding: 10px 20px
}
#guide .bottom-bar {
	height: 33px;
	background: var( --cg );
}
#guide p {
	margin: 0;
	line-height: 40px;
}
#guide p gr {
	float: right;
}
#guide .btn {
	display: inline-block;
	width: 115px;
	line-height: 33px;
	padding-right: 5px;
	text-align: center;
}
#guide i {
	width: 33px;
	vertical-align: -2px;
	font-size: 20px;
	text-align: center;
}
#guide .btn.active {
	background-color: var( --cm ) !important;
}
#guide img {
	width: 100%;
}
#guide #settings {
	width: 34px;
	padding-right: 0;
}
#guide #settings i {
	margin: 3px 0 0 0;
}
.prev-next {
	display: inline-block;
	float: right;
	font-size: 24px;
	line-height: 34px;
	color: var( --cm );
}
@media (max-width: 515px) {
	#guide {
		max-width: 100%;
		padding: 40px 5px;
	}
}
@media (max-width: 450px) {
	#guide .btn {
		width: 80px;
	}
}
</style>
<div id="guide" style="user-select: none;">
	<p><span id="count" style="float: right"></span></p>
	
	<img id="image" src="/assets/img/guide/1.jpg?v=<?=$time?>">
	
	<div class="bottom-bar">
		   <a id="library" class="btn btn-default"><i class="fa fa-library"></i><span>Library</span></a><!--
		--><a id="playback" class="btn btn-default active"><i class="fa fa-playback"></i><span>Playback</span></a><!--
		--><a id="playlist" class="btn btn-default"><i class="fa fa-playlist"></i><span>Playlist</span></a><!--
		--><i id="settings" class="btn fa fa-gear"></i>&ensp;
		   <i id="previous" class="fa fa-arrow-left"></i>&emsp;<i id="next" class="fa fa-arrow-right"></i>
	</div>
</div>
<script>
document.getElementsByClassName( 'help-head' )[ 0 ].remove();

document.getElementsByClassName( 'container' )[ 0 ].classList.remove( 'hide' );
var close = document.getElementsByClassName( 'close' )[ 0 ];
close.addEventListener( 'click', function() {
	location.href = '/';
} );

var nlibrary  = 23;
var nplaylist = 40;
var nsettings = 48;
var ntotal    = 60;
var n         = 1;

var $         = function( id ) { return document.getElementById( id ) }
var btn       = document.getElementsByClassName( 'btn' );
var count     = $( 'count' ); // not jQuery on this page
var image     = $( 'image' );
var next      = $( 'next' );
var previous  = $( 'previous' );

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
	image.src         = '/assets/img/guide/'+ n +'.jpg?v=<?=$time?>';
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
