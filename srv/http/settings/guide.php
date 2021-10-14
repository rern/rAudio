<?php
$time = time();
include 'logosvg.php';
?>
<!DOCTYPE html>
<html>
<head>
	<title>rAudio</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="msapplication-tap-highlight" content="no">
	<link rel="icon" href="/assets/img/icon.png">
	<link rel="stylesheet" href="/assets/css/colors.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/common.<?=$time?>.css">
	<link rel="stylesheet" href="/assets/css/settings.<?=$time?>.css">
</head>
<body style="height: 100%; user-select: none;">
<div class="head" style="top: 0">
	<i class="page-icon fa fa-question-circle"></i><span class='title'>USER GUIDE</span>
	<a href="/"><i id="close" class="fa fa-times"></i></a>
</div>
<div id="guide" style="user-select: none;">
	<p><a class="gr" href="https://github.com/rern/rAudio-1" target="_blank"><i class="fa fa-github fa-lg bl"></i> Source</a><span id="count" style="float: right"></span></p>
	<div id="library" class="btn btn-default"><i class="fa fa-library"></i><span>Library</span></div>
	<div id="playback" class="btn btn-default active"><i class="fa fa-playback"></i><span>Playback</span></div>
	<div id="playlist" class="btn btn-default"><i class="fa fa-playlist"></i><span>Playlist</span></div>
	<div id="settings" class="btn btn-default"><i id="settings" class="fa fa-gear"></i></div>
	<div class="prev-next"><i id="previous" class="fa fa-arrow-left"></i>&emsp;<i id="next" class="fa fa-arrow-right"></i></div>
	<img id="image" src="/assets/img/guide/1.<?=$time?>.jpg">
</div>
<script>
var xstart, swipe;
var xswipe = 100;
var nlibrary = 23;
var nplaylist = 40;
var nsettings = 47;
var ntotal = 58;
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
	image.src = '/assets/img/guide/'+ n +'.<?=$time?>.jpg';
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
</body>
</html>
