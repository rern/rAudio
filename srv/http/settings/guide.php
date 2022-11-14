<style>
.container { padding: 40px 0 0 0 }
#guide {
	width: 100%;
	height: 100%;
	left: 0;
	right: 0;
	margin: 0 auto;
	user-select: none;
}
.help-block { margin: 0 }
#guide .bottom-bar {
	height: 33px;
	background: var( --cga );
}
#guide p {
	margin: 0;
	line-height: 40px;
}
#guide a {
	display: inline-block;
	width: 20%;
	line-height: 33px;
	padding-right: 5px;
	text-align: center;
	cursor: pointer;
}
#guide i {
	width: 33px;
	vertical-align: -2px;
	font-size: 20px;
	text-align: center;
}
#guide a.active { background-color: var( --cm ) !important }
#guide img { width: 100% }
#prevnext { padding-right: 0 !important }
@media ( max-width: 450px ) {
	#guide a span { display: none }
}
</style>

<p class="help-block" style="display: none">
Bottom bar:
 • Icons - Skip to each section
 • Arrow icons / Swipe - Previous / next page
</p>
<div id="guide">
	<p><span id="count" style="float: right"></span></p>
	
	<img src="/assets/img/guide/1.jpg?v=<?=$time?>">
	
<?php
$html     = '<div class="bottom-bar">';
foreach( [ 'library', 'playback', 'playlist', 'settings' ] as $id ) {
	$html.= '<a id="'.$id.'"><i class="fa fa-'.$id.'"></i><span>'.ucfirst( $id ).'</span></a>';
}
$html    .= '<a id="prevnext"><i class="prev fa fa-arrow-left"></i><i class="next fa fa-arrow-right"></i></a></div>';
echo $html;
?>
</div>
<script>
var nlibrary  = 23;
var nplaylist = 40;
var nsettings = 48;
var ntotal    = 60;
var n         = 1;
var count     = document.getElementById( 'count' );
var buttons   = Array.from( document.getElementsByTagName( 'a' ) );
var help      = document.getElementsByClassName( 'help-block' )[ 0 ];
var next      = document.getElementsByClassName( 'next' )[ 0 ];
var prev      = document.getElementsByClassName( 'prev' )[ 0 ];

count.textContent = n +' / '+ ntotal;
document.getElementById( 'playback' ).classList.add( 'active' );
document.getElementsByClassName( 'container' )[ 0 ].classList.remove( 'hide' );

document.getElementsByClassName( 'close' )[ 0 ].addEventListener( 'click', function() {
	location.href = '/';
} );
document.getElementsByClassName( 'help-head' )[ 0 ].addEventListener( 'click', function() {
	help.style.display = help.style.display === 'none' ? '' : 'none';
} );

buttons.forEach( ( el ) => {
	if ( el.id === 'prevnext' ) return
	
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
prev.addEventListener( 'click', function() {
	n = n > 1 ? n - 1 : ntotal;
	renderPage( n );
} );
// swipe
if ( navigator.maxTouchPoints ) { // swipe
	var xstart;
	window.addEventListener( 'touchstart', function( e ) {
		xstart = e.changedTouches[ 0 ].pageX;
	} );
	window.addEventListener( 'touchend', function( e ) {
		var xdiff = xstart - e.changedTouches[ 0 ].pageX;
		if ( Math.abs( xdiff ) > 100 ) {
			xdiff > 0 ? next.click() : prev.click();
		}
	} );
}

function renderPage( n ) {
	count.textContent = n +' / '+ ntotal;
	document.getElementsByTagName( 'img' )[ 0 ].src = '/assets/img/guide/'+ n +'.jpg?v=<?=$time?>';
	buttons.forEach( ( el ) => {
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
