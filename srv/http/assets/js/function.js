function bash( command, callback, json ) {
	if ( typeof command === 'string' ) {
		var args = { cmd: 'bash', bash : command }
	} else {
		var args = { cmd: 'sh', sh: [ 'cmd.sh' ].concat( command ) }
	}
	$.post( 
		  cmdphp
		, args
		, callback || null
		, json || null
	);
}
function list( args, callback, json ) {
	$.post(
		  ( 'cmd' in args  ? 'mpdplaylist.php' : 'mpdlibrary.php' )
		, args
		, callback || null
		, json || null
	);
}

//----------------------------------------------------------------------
function blinkDot() {
	if ( ! G.localhost ) return
	
	$( '.dot' ).css( 'animation', 'none' );
	var $d1 = $( '.dot1' );
	var $d2 = $( '.dot2' );
	var $d3 = $( '.dot3' );
	G.intBlinkDot = setInterval( () => {
		$d1.css( 'opacity', 1 );
		$d2.css( 'opacity', 0.1 );
		$d3.css( 'opacity', 0.50 );
		setTimeout( () => {
			$d1.css( 'opacity', 0.50 );
			$d2.css( 'opacity', 1 );
			$d3.css( 'opacity', 0.1 );
			setTimeout( () => {
				$d1.css( 'opacity', 0.1 );
				$d2.css( 'opacity', 0.50 );
				$d3.css( 'opacity', 1 );
			}, 1000 );
		}, 1000 );
	}, 3000 );
}
function blinkUpdate() {
	var $icons = $( '#library, #button-library, #i-libupdate, #ti-libupdate' );
	$icons.removeClass( 'blink' );
	G.intBlinkUpdate = setInterval( () => {
		$icons.addClass( 'clear' );
		setTimeout( () => $icons.removeClass( 'clear' ), 1500 );
	}, 2500 );
}
function changeIP() { // for android app
	info( {
		  icon         : 'networks'
		, title        : 'IP Address'
		, message      : 'Switch rAudio:'
		, textlabel    : 'New IP'
		, focus        : 0
		, boxwidth     : 170
		, values       : location.host
		, beforeshow   : () => $( '#infoContent input' ).prop( 'type', 'tel' )
		, ok           : () => {
			var ip = infoVal();
			if ( ip === location.host ) {
				location.reload();
				return
			}
			
			var changed = Android.changeIP( ip );
			if ( changed ) {
				location.href = 'http://'+ ip;
			} else {
				info( {
					  icon    : 'networks'
					, title   : 'IP Address'
					, message : 'Not found: '+ ip
					, ok      : changeIP
				} );
			}
		}
	} );
}
function clearIntervalAll() {
	// .btn-cmd[play], #time[start change], #time-band[touchstart mousedown], #pl-list li, 
	// psNotify, pushstream[disconnect], renderPlayback, setProgressElapsed, setPlaylistScroll, switchPage
	[ G.intBlinkDot, G.intBlinkUpdate, G.intElapsedPl, G.intElapsed, G.intRelaysTimer, G.intVu ].forEach( el => clearInterval( el ) );
	if ( G.status.state === 'play' && ! G.status.stream ) setProgress(); // stop progress animation
	$( '#vuneedle' ).css( 'transform', '' );
}
function colorSet() {
	var rgb0 = $( '#colorcancel' ).css( 'color' ).replace( /rgb\(|,|\)/g, '' ); // rgb(aaa, bb, cc) > aaa bb cc
	$( '#lib-list .lib-icon' ).eq( 0 ).click();
	$( '.licover' ).toggleClass( 'hide', G.wH < 590 );
	$( '#colorreset' )
		.toggleClass( 'hide', G.display.color === '' )
		.before( '<canvas id="canvascolor"></canvas>' );
	G.colorpicker = new KellyColorPicker( {
		  place  : 'canvascolor'
		, size   : 230
		, color  : $( '#button-library' ).css( 'background-color' )
		, userEvents : {
			change : function( e ) {
				var hex = e.getCurColorHex();
				var h = Math.round( 360 * e.getCurColorHsv().h );
				var hsg = 'hsl('+ h +',3%,';
				var rgb = Object.values( e.getCurColorRgb() ).join( ' ' );
				$( '#colorok' ).toggleClass( 'disabled', rgb === rgb0 );
				// background
				$( '#bar-top, #playback-controls i, #playlist, .menu a, .submenu' ).css( 'background-color', hsg +'30%)' );
				$( '#playback-controls .active, #library, #button-library, #lib-list li:eq( 0 ), #colorok' ).css( 'background-color', hex );
				$( '.content-top, #lib-index, #playback, #colorcancel' ).css( 'background-color', hsg +'20%)' );
				// text
				$( '#lib-index a' ).css( 'cssText', 'color: '+ hsg +'40%)' );
				$( '#button-lib-back, #colorcancel' ).css( 'color', hex );
				$( '.lib-icon, #lib-list .li2' ).css( 'cssText', 'color: '+ hsg +'60%) !important' );
				$( '#lib-list li' ).eq( 0 ).find( 'i, .time, .li2' ).css( 'color', hsg +'30%)' );
				$( '.menu a' ).css( 'cssText', 'color: '+ hsg +'75%)' );
				// line
				$( '#lib-list li' ).css( 'border-bottom', '1px solid '+ hsg +'20%)' );
				$( '.menu a' ).css( 'border-top', '1px solid '+ hsg +'20%)' );
			}
		}
	} );
	$( '#colorpicker' ).removeClass( 'hide' );
	$( 'body' ).addClass( 'disablescroll' );
}
function contextmenuLibrary( $li, $target ) {
	menuHide();
	var $menu          = $( $li.find( '.lib-icon' ).data( 'target' ) );
	G.list             = {};
	G.list.li          = $li; // for contextmenu
	G.list.licover     = $li.hasClass( 'licover' );
	G.list.singletrack = ! G.list.licover && $li.find( '.lib-icon' ).hasClass( 'fa-music' );
	// file modes  - path > path ... > tracks
	// album mode  - path > tracks
	// other modes - name > name-album > filtered tracks
	G.list.path        = $li.find( '.lipath' ).text() || $( '#mode-title' ).text();
	if ( G.playlist ) {
		G.list.name   = $li.find( '.liname' ).text() || '';
		G.list.artist = $li.find( '.liartist' ).text() || '';
	} else if ( $( '.licover' ).length && ! $li.hasClass( 'licover' ) ) {
		G.list.name   = $li.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		G.list.artist = $( '.licover .liartist' ).text() || '';
	} else {
		G.list.name = $li.find( '.li1' ).text() || $li.find( '.liname' ).text();
	}
	G.list.track = $li.data( 'track' ) || '';  // cue - in contextmenu
	if ( ( G.display.tapaddplay || G.display.tapreplaceplay )
		&& ! G.color
		&& ! $target.hasClass( 'lib-icon' )
		&& ! G.list.licover
		&& G.status.player === 'mpd'
	) {
		var i = G.display.tapaddplay ? 0 : 1;
		$menu.find( '.submenu' ).eq( i ).click();
		$li.addClass( 'active' );
		return
	}
	var filemode = [ 'nas', 'sd', 'usb', 'dabradio', 'webradio' ].includes( G.mode );
	$menu.find( '.playnext, .replace' ).toggleClass( 'hide', ! G.status.pllength );
	$menu.find( '.replace' ).next().toggleClass( 'hide', ! G.status.pllength );
	$menu.find( '.refresh-library' ).toggleClass( 'hide', ! ( 'updating_db' in G.status ) );
	$( '#menu-folder a:not(.sub)' ).toggleClass( 'hide', G.list.licover && ! filemode && G.mode !== 'album' );
	$menu.find( '.bookmark, .exclude, .update, .thumb' ).toggleClass( 'hide', ! filemode );
	$menu.find( '.directory' ).toggleClass( 'hide', filemode );
	$menu.find( '.tag' ).toggleClass( 'hide', ! $( '.licover' ).length || ! filemode );
	$menu.find( '.wredit' ).toggleClass( 'hide', G.mode !== 'webradio' );
	$menu.find( '.wrdirrename' ).toggleClass( 'hide', G.mode.slice( -5 ) !== 'radio' );
	$li.addClass( 'active' );
	if ( G.list.licover ) {
		var menutop = $bartop.is( ':visible' ) ? 310 : 270;
	} else {
		var menutop = $li.offset().top + 48;
	}
	contextmenuScroll( $menu, menutop );
	G.color = 0; // reset to 0 once show
}
function contextmenuScroll( $menu, menutop ) {
	var fixedmenu = G.library && ( G.list.licover && G.wH > 767 ) && G.display.fixedcover ? true : false;
	$menu
		.css( 'top',  menutop )
		.toggleClass( 'fixed', fixedmenu )
		.removeClass( 'hide' );
	var targetB   = $menu.offset().top + $menu.height();
	var topH      = $bartop.is( ':visible' ) ? 80 : 40;
	var wT        = $( window ).scrollTop();
	if ( targetB > ( G.wH - topH + wT ) ) $( 'html, body' ).animate( { scrollTop: targetB - G.wH + 42 } );
}
function coverartChange() {
	if ( G.playback ) {
		var src    = $( '#coverart' ).attr( 'src' );
		var path   = dirName( G.status.file );
		var album  = G.status.Album;
		var artist = G.status.Artist;
	} else {
		var src = $( '#liimg' ).attr( 'src' );
		var path   = $( '.licover .lipath' ).text();
		if ( path.split( '.' ).pop() === 'cue' ) path = dirName( path );
		var album  = $( '.licover .lialbum' ).text();
		var artist = $( '.licover .liartist' ).text();
	}
	if ( 'discid' in G.status ) {
		var imagefilenoext = '/srv/http/data/audiocd/'+ G.status.discid;
		var type = 'audiocd';
	} else {
		var imagefilenoext = '/mnt/MPD/'+ path +'/cover';
		var type = 'coverart';
	}
	if ( G.playback ) {
		var pbonlinefetched = $( '#divcover .cover-save' ).length;
		var pbcoverdefault  = $( '#coverart' ).attr( 'src' ) === G.coverdefault;
		var embedded        = $( '#coverart' ).attr( 'src' ).split( '/' )[ 3 ] === 'embedded' ? '(Embedded)' : '';
	} else {
		var lionlinefetched = $( '.licover .cover-save' ).length;
		var licoverdefault  = $( '.licoverimg img' ).attr( 'src' ) === G.coverdefault;
		var embedded        = $( '.licoverimg img' ).attr( 'src' ).split( '/' )[ 3 ] === 'embedded' ? '(Embedded)' : '';
	}
	var coverartlocal = ( G.playback && ! embedded && ! pbonlinefetched && ! pbcoverdefault )
						|| ( G.library && ! embedded && ! lionlinefetched && ! licoverdefault )
						&& $( '#liimg' ).attr( 'src' ).slice( 0, 7 ) !== '/assets';
	$( '#coverart, #liimg' ).removeAttr( 'style' );
	$( '.coveredit' ).remove();
	var icon = iconcover;
	var title = 'Change Album Cover Art';
	info( {
		  icon        : icon
		, title       : title
		, message     : '<img class="imgold">'
					   +'<p class="infoimgname"><i class="fa fa-album wh"></i> '+ album
					   +'<br><i class="fa fa-artist wh"></i> '+ artist +'</p>'
		, footer      : embedded
		, beforeshow  : () => $( '.imgold' ).attr( 'src', src ) // fix direct replace src
		, filelabel   : '<i class="fa fa-folder-open"></i>File'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, buttonlabel : ! coverartlocal ? '' : '<i class="fa fa-minus-circle"></i>Remove'
		, buttoncolor : ! coverartlocal ? '' : red
		, button      : ! coverartlocal ? '' : () => {
			var ext = $( '.infomessage .imgold' ).attr( 'src' ).slice( -3 );
			bash( [ 'coverartreset', imagefilenoext +'.'+ ext, path, artist, album ] );
		}
		, ok          : () => {
			imageReplace( type, imagefilenoext );
			banner( icon, title, 'Change ...' );
		}
	} );
}
function coverartDefault() {
	if ( G.display.vumeter ) return
	
	if ( ! G.display.covervu ) {
		$( '#coverart' )
			.attr( 'src', G.coverdefault )
			.css( 'border', G.coverdefault === G.coverart ? 'none' : '' )
			.removeClass( 'hide' );
		$( '#vu' ).addClass( 'hide' );
	} else {
		$( '#coverart' )
			.addClass( 'hide' )
			.attr( 'src', G.coverdefault );
		$( '#vu' ).removeClass( 'hide' );
		vu();
	}
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
}
function coverartSave() {
	if ( G.playback ) {
		var src    = $( '#coverart' ).attr( 'src' );
		var file   = G.status.file;
		var path   = '/mnt/MPD/'+ dirName( file );
		var artist = G.status.Artist;
		var album  = G.status.Album;
	} else {
		var src = $( '.licover img' ).attr( 'src' );
		var path   = '/mnt/MPD/'+ $( '.licover .lipath' ).text();
		var artist = $( '.licover .liartist' ).text();
		var album  = $( '.licover .lialbum' ).text();
	}
	var img    = new Image();
	img.src    = src;
	img.onload = function() {
		var imgW          = img.width;
		var imgH          = img.height;
		var filecanvas    = document.createElement( 'canvas' );
		var ctx           = filecanvas.getContext( '2d' );
		filecanvas.width  = imgW;
		filecanvas.height = imgH;
		ctx.drawImage( img, 0, 0 );
		var base64        = filecanvas.toDataURL( 'image/jpeg' );
		if ( path.slice( -4 ) === '.cue' ) path = dirName( path );
		var icon          = iconcover;
		var title         = 'Save Album Cover Art';
		info( {
			  icon    : icon
			, title   : title
			, message :  '<img class="infoimgnew" src="'+ base64 +'">'
						+'<p class="infoimgname"><i class="fa fa-folder"></i> '+ album
						+'<br><i class="fa fa-artist"></i> '+ artist +'</p>'
			, ok      : () => {
				imageReplace( 'coverart', path +'/cover' );
				banner( icon, title, 'Save ...' );
			}
		} );
	}
}
function cssKeyframes( name, trx0, trx100 ) {
	var moz       = '-moz-'+ trx0;
	var moz100    = '-moz-'+ trx100;
	var webkit    = '-webkit-'+ trx0;
	var webkit100 = '-webkit-'+ trx100;
	$( 'head' ).append(
		 '<style id="'+ name +'">'
			+'@-moz-keyframes '+    name +' { 0% { '+ moz +' }    100% { '+ moz100 +' } }'
			+'@-webkit-keyframes '+ name +' { 0% { '+ webkit +' } 100% { '+ webkit100 +' } }'
			+'@keyframes '+         name +' { 0% { '+ trx0 +'}    100% { '+ trx100 +'} }'
		+'</style>'
	);
}
function curl( channel, key, value ) {
	return 'curl -s -X POST http://127.0.0.1/pub?id='+ channel +' -d \'{ "'+ key +'": "'+ value +'" }\''
}
function curlPackage( pkg, active, enabled ) {
	return 'curl -s -X POST http://127.0.0.1/pub?id=package -d \'[ "'+ pkg +'", '+ active +', '+ enabled +' ]\''
}
function dirName( path ) {
	return path.substring( 0, path.lastIndexOf( '/' ) )
}	
function displayBars() {
	if ( ! $( '#bio' ).hasClass( 'hide' ) ) return
	
	var wW          = document.body.clientWidth;
	var smallscreen = G.wH < 590 ||wW < 500;
	var lcd         = ( G.wH <= 320 && wW <= 480 ) || ( G.wH <= 480 && wW <= 320 );
	if ( ! G.display.bars || ( smallscreen && ! G.display.barsalways ) || lcd ) {
		$( '#bar-top' ).addClass( 'hide' );
		$( '#bar-bottom' ).addClass( 'transparent' );
		$( '.page' ).addClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).removeClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).addClass( 'bars-off' );
		$( '.content-top' ).css( 'top', '' );
		$( '.emptyadd' ).css( 'top', 90 );
	} else {
		$( '#bar-top' ).removeClass( 'hide' );
		$( '#bar-bottom' ).removeClass( 'hide transparent' );
		$( '.page' ).removeClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).addClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).removeClass( 'bars-off' );
		$( '.content-top' ).css( 'top', G.display.bars || G.display.barsalways ? '' : 0 );
		$( '.emptyadd' ).css( 'top', '' );
	}
	displayBottom();
}
function displayBottom() {
	$( '#playback' )
		.removeAttr( 'class' )
		.addClass( 'fa fa-'+ G.status.player );
	$( '#bar-bottom i' ).removeClass( 'active' );
	$( '#'+ G.page ).addClass( 'active' );
}
function displayPlayback() {
	var $cover  = $( '#coverart-block' );
	$time.toggleClass( 'hide', ! G.display.time );
	$volume.toggleClass( 'hide', ! G.display.volume || G.display.volumenone );
	var time    = $time.is( ':visible' );
	var cover   = G.display.cover;
	var volume  = $volume.is( ':visible' );
	$cover.toggleClass( 'hide', ! cover );
	if ( ( ! time || ! volume ) && G.wW > 500 ) {
		$( '#time-knob, #volume-knob' ).css( 'width', '38%' );
		if ( ! time && ! volume ) {
			$cover.css( { width: '100%', 'max-width': '100%' } );
		} else if ( ! time || ! volume ) {
			$cover.css( { width: 'fit-content', 'max-width': '55vw' } );
		}
	} else {
		$( '#time-knob, #volume-knob' ).css( 'width', '' );
		$cover.css( { width: '', 'max-width': '' } );
	}
	if ( time ) $( '#time' ).roundSlider( G.status.stream || G.status.player !== 'mpd' || ! G.status.pllength ? 'disable' : 'enable' );
	$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', time );
	$( '#time-band' ).toggleClass( 'disabled', ! G.status.pllength || G.status.player !== 'mpd' || G.status.stream );
	$( '#time-knob, #coverBL, #coverBR' ).toggleClass( 'disabled', G.status.stream || ! [ 'mpd', 'upnp' ].includes( G.status.player ) );
	$( '.volumeband' ).toggleClass( 'hide', G.display.volumenone || volume );
	$( '#timemap' ).toggleClass( 'hide', G.display.cover );
	$( '#play-group, #vol-group' ).toggleClass( 'hide', ! G.display.buttons );
	if ( G.display.vumeter ) {
		var aligntop = 'stretch';
	} else if ( $( '.btn-group' ).is( ':hidden' ) ) {
		var align = 'center';
	} else if ( time && volume && ( G.wW < 900 && G.wW > 750 ) || G.wW < 600 ) {
		var align = 'stretch';
	} else {
		var align = 'center';
	}
	$( '#playback-row' ).css( 'align-items', align );
}
function displaySave( keys ) {
	var values  = infoVal();
	var display = JSON.parse( JSON.stringify( G.display ) );
	keys.forEach( ( k, i ) => display[ k ] = values[ i ] );
	[ 'audiocd', 'color',     'equalizer',  'logout',           'order',
	  'relays',  'screenoff', 'snapclient', 'snapclientactive', 'volumenone' ].forEach( item => delete display[ item ] );
	bash( [ 'displaysave', JSON.stringify( display ) ] );
}
function displaySubMenu() {
	if ( G.display.equalizer && typeof infoEqualizer !== 'function' ) {
		location.reload();
		return
	}
	
	$( '#dsp' )
		.toggleClass( 'fa-camilladsp', G.display.camilladsp )
		.toggleClass( 'fa-equalizer', G.display.equalizer );
	G.display.dsp = G.display.camilladsp || G.display.equalizer;
	var submenu   = [ 'dsp', 'logout', 'relays', 'snapclient', 'multiraudio' ];
	submenu.forEach( el => $( '#'+ el ).prev().toggleClass( 'sub', G.display[ el ] ) ); // submenu toggled by css .settings + .submenu
	if ( G.localhost ) $( '#power' ).addClass( 'sub' );
}
function getBio( artist, getsimilar ) {
	G.bioartist.push( artist );
	if ( artist === $( '#biocontent .name' ).text() ) {
		$( '#bio' ).removeClass( 'hide' );
		return
	}
	
	loader();
	var url = 'http://ws.audioscrobbler.com/2.0/'
			 +'?autocorrect=1'
			 +'&format=json'
			 +'&method=artist.getinfo'
			 +'&api_key='+ G.apikeylastfm
			 +'&artist='+ encodeURI( artist.replace( '&', 'and' ) );
	$.post( url, function( data ) {
		if ( 'error' in data || ( ! data.artist.bio.content ) ) {
			info( {
				  icon    : 'bio'
				, title   : 'Bio'
				, message : 'No data available.'
			} );
			loaderHide();
			return
		}
		
		var data     = data.artist;
		artistname   = data.name;
		var content  = data.bio.content.replace( /\n/g, '<br>' ).replace( /Read more on Last.fm.*/, '</a>' );
		var genre    = data.tags.tag[ 0 ].name;
		var backhtml = getsimilar ? '<i class="bioback fa fa-arrow-left"></i>' : '';
		var similar  =  data.similar.artist;
		if ( similar ) {
			var similarhtml  = '<p><i class="fa fa-artist fa-lg"></i>&ensp;Similar Artists:<p><span>';
			similar.forEach( a => similarhtml += '<a class="biosimilar">'+ a.name +'</a>,&ensp;' );
			similarhtml = similarhtml.slice( 0, -7 ) +'</span><br><br>';
		}
		var biohtml = `
<div class="container">
<div id="biocontent">
	<a class="name hide">${ artist }</a>
	<p class="artist"><a>${ artistname }<i class="closebio fa fa-times close-root"></i></a></p>
	<p class="genre"><i class="fa fa-genre fa-lg"></i>&ensp;${ genre }${ backhtml }</p>
	${ similarhtml }
	<p>${ content }</p>
	<div style="clear: both;"></div>
	<br><br>
	<p id="biosource">
		<gr>Text:</gr> <a href="https://www.last.fm">last.fm</a>&emsp;
		<gr>Image:</gr> <a href="https://www.fanart.tv">fanart.tv</a>
	</p>
</div>
</div>`;
		$( '#bio' ).html( biohtml ).promise().done( () => {
			$( '#bio' ).removeClass( 'hide' );
			$.get( 'https://webservice.fanart.tv/v3/music/'+ data.mbid +'?api_key='+ G.apikeyfanart ).done( data => {
				if ( 'error message' in data ) {
					loaderHide();
					return
				}
				
				if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) $( '#biocontent' ).before( '<img id="biobanner" src="'+ data.musicbanner[ 0 ].url +'">' )
				if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
					var img0        = '';
					var imageshtml  = '<div id="bioimg">';
					data.artistthumb.forEach( el => {
						var src     = el.url.replace( '/fanart/', '/preview/' );
						imageshtml += '<a href="'+ el.url +'" target="_blank"><img src="'+ src +'"></a>';
						if ( ! img0 ) img0 = src;
					} );
					imageshtml    += '</div>';
					var $artist    = $( '#biocontent .artist' );
					var $name      = $( '#biocontent .artist a' );
					window.innerWidth > 480 ? $artist.before( imageshtml ) : $artist.after( imageshtml );
					$name.prepend( '<img class="img0 hide" src="'+ img0 +'">' )
					var $img       = $( '#biocontent .img0' );
					var observer   = new IntersectionObserver( function( entries ) {
						entries.forEach( entry => {
							if ( window.innerWidth <= 480 ) return
							
							if ( entry.isIntersecting ) { // visible = true
								$name.css( 'margin-left', '' );
								$img.addClass( 'hide' );
							} else if ( entry.boundingClientRect.top < 0 ) { // above page top
								$name.css( 'margin-left', ( -1 * $name[ 0 ].offsetLeft ) +'px' );
								$img.removeClass( 'hide' );
							}
						} );
					} );
					observer.observe( $( '#bioimg img' ).last()[ 0 ] );
					loaderHide();
				} else {
					loaderHide();
				}
			} ).fail( function() { // 404 not found
				loaderHide();
			} );
		} );
	} );
}
function getPlaybackStatus( withdisplay ) {
	bash( '/srv/http/bash/status.sh '+ withdisplay, list => {
		if ( list == -1 ) {
			loaderHide();
			info( {
				  icon    : 'networks'
				, title   : 'Shared Data'
				, message : iconwarning +'Server offline'
							+'<br><br>Disable and restore local data?'
				, cancel  : loader
				, okcolor : orange
				, ok      : () => {
					bash( '/srv/http/bash/settings/system.sh shareddatadisconnect', () => location.reload() );
				}
			} );
			return
		}
		
		try {
			var status = JSON.parse( list );
		} catch( e ) {
			var msg = e.message;
			if ( msg.includes( 'position' ) ) {
				var pos = msg.replace( /.* position /, '' );
			} else {
				var pos = msg.replace( /.* column (.*) of .*/, '$1' );
			}
			var errors = '<red>Error:</red> '+ msg.replace( pos, '<red>'+ pos +'</red>' )
						+'<hr>'
						+ list.slice( 0, pos ) +'<red>&#9646;</red>'+ list.slice( pos );
			$( '#loader' )
				.html( '<pre>'+ errors +'</pre>' )
				.removeClass( 'hide' );
			return false
		}
		
		if ( 'display' in status ) {
			G.display      = status.display;
			G.coverdefault = ! G.display.covervu && ! G.display.vumeter ? G.coverart : G.covervu;
			delete status.display;
			delete G.coverTL;
			displaySubMenu();
			bannerHide();
		}
		$.each( status, ( k, v ) => { G.status[ k ] = v } ); // need braces
		if ( G.playback ) {
			displayPlayback();
		} else if ( G.library ) {
			if ( ! G.librarylist ) {
				libraryHome();
			}
		} else if ( G.playlist && ! G.savedlist && ! G.savedplaylist ) {
			$( '#pl-list .li1' ).find( '.name' ).css( 'max-width', '' );
			getPlaylist();
		}
		displayBars();
		renderPlayback();
		setButtonControl();
		setButtonUpdating();
	} );
}
function getPlaylist() {
	list( { cmd: 'current' }, ( data ) => renderPlaylist( data ), 'json' );
}
function hideGuide() {
	if ( G.guide ) {
		G.guide         = 0;
		var barvisible = $bartop.is( ':visible' );
		$( '#coverTR' ).toggleClass( 'empty', ! G.status.pllength && ! barvisible && G.status.player === 'mpd' );
		$( '.map' ).removeClass( 'mapshow' );
		$( '#bar-bottom' ).removeClass( 'translucent' );
		if ( ! barvisible ) $( '#bar-bottom' ).addClass( 'transparent' );
		$( '.band, #volbar' ).addClass( 'transparent' );
		$( '.guide, #volume-bar, #volume-text' ).addClass( 'hide' );
		$( '.coveredit' ).css( 'z-index', '' );
	}
}
function HMS2Second( HMS ) {
	var hhmmss = HMS.split( ':' ).reverse();
	if ( ! hhmmss[ 1 ] ) return +hhmmss[ 0 ];
	if ( ! hhmmss[ 2 ] ) return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60;
	return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60 + hhmmss[ 2 ] * 3600;
}
function imageLoad( list ) {
	var $lazyload = $( '#'+ list +' .lazyload' );
	if ( ! $lazyload.length ) return
	
	if ( list === 'lib-list' ) {
		if ( G.mode === 'album' || G.mode === 'latest' ) {
			$lazyload.off( 'error' ).on( 'error', function() {
				$( this ).attr( 'src', '/assets/img/coverart.svg' );
			} );
		} else {
			$lazyload.off( 'error' ).on( 'error', function() {
				var $this = $( this );
				var src = $this.attr( 'src' );
				if ( G.mode.slice( -5 ) === 'radio' ) {
					if ( $this.parent().hasClass( 'dir' ) ) {
						var icon = 'folder';
						var menu = 'wrdir';
					} else {
						var icon = G.mode;
						var menu = 'webradio';
					}
				} else {
					var icon = $this.parent().data( 'index' ) !== 'undefined' ? 'folder' : G.mode;
					var menu = 'folder';
				}
				$this.replaceWith( '<i class="fa fa-'+ icon +' lib-icon" data-target="#menu-'+ menu +'"></i>' );
			} );
		}
	} else {
		$lazyload.off( 'error' ).on( 'error', function() {
			var $this = $( this );
			$this.replaceWith( '<i class="fa fa-'+ $this.data( 'icon' ) +' pl-icon" data-target="#menu-filesavedpl"></i>' );
		} );
	}
}
function imageReplace( type, imagefilenoext, bookmarkname ) {
	var data = {
		  cmd          : 'imagereplace'
		, type         : type
		, imagefile    : imagefilenoext +'.'+ ( I.infofilegif ? 'gif' : 'jpg' )
		, bookmarkname : bookmarkname || ''
		, imagedata    : 'infofilegif' in I ? I.infofilegif : $( '.infoimgnew' ).attr( 'src' )
	}
	$.post( cmdphp, data, function( std ) {
		if ( std == -1 ) {
			info( {
				  icon    : I.icon
				, title   : I.title
				, message : iconwarning +'Target directory not writable.'
			} );
		}
	} );
	banner( '<i class="iconcover blink"></i>', I.title, 'Change ...', -1 );
}
var chklibrary = {
	  album          : '<i class="fa fa-album wh"></i><gr>Album</gr>'
		, nas        : '<i class="fa fa-networks wh"></i><gr>Network</gr>'
	, albumartist    : '<i class="fa fa-albumartist wh"></i><gr>Album Artist</gr>'
		, sd         : '<i class="fa fa-microsd wh"></i><gr>SD</gr>'
	, artist         : '<i class="fa fa-artist wh"></i><gr>Artist</gr>'
		, usb        : '<i class="fa fa-usbdrive wh"></i><gr>USB</gr>'
	, composer       : '<i class="fa fa-composer wh"></i><gr>Composer</gr>'
		, playlists  : '<i class="fa fa-playlists wh"></i><gr>Playlists</gr>'
	, conductor      : '<i class="fa fa-conductor wh"></i><gr>Conductor</gr>'
		, webradio   : '<i class="fa fa-webradio wh"></i><gr>Web Radio</gr>'
	, date           : '<i class="fa fa-date wh"></i><gr>Date</gr>'
		, '-'        : ''
	, genre          : '<i class="fa fa-genre wh"></i><gr>Genre</gr>'
		, count      : 'Count'
	, latest         : '<i class="fa fa-latest wh"></i><gr>Latest</gr>'
		, label      : 'Label'
}
var chklibrary2 = {
	  albumbyartist  : '<i class="fa fa-album wh"></i>Sort Album by artists'
	, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-plus wh"></i><gr>Add + Play</gr>'
	, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-replace wh"></i><gr>Replace + Play</gr>'
	, playbackswitch : 'Switch to Playback <gr>on <i class="fa fa-play-plus wh"></i>or <i class="fa fa-play-replace wh"></i>'
	, '-'            : ''
	, backonleft     : '<i class="fa fa-arrow-left wh"></i>Back button on left side'
	, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
	, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
}
function infoLibrary( page ) {
	var page2    = page === 2;
	var checkbox = Object.values( page2 ? chklibrary2 : chklibrary );
	var keys     = Object.keys( page2 ? chklibrary2 : chklibrary );
	keys         = keys.filter( k => k !== '-' );
	var values   = [];
	keys.forEach( k => values.push( G.display[ k ] ) );
	info( {
		  icon         : 'library'
		, title        : 'Library'
		, tab          : [ 'Show', 'Options' ]
		, tabfunction  : [ infoLibrary, () => infoLibrary( 2 ) ]
		, tabactive    : page2 ? 1 : 0
		, messagealign : 'left'
		, checkbox     : checkbox
		, checkcolumn  : page2 ? '' : 1
		, noreload     : ! I.infohide
		, values       : values
		, checkchanged : 1
		, beforeshow   : () => {
			var $chk = $( '#infoContent input' );
			var $el  = {}
			keys.forEach( ( k, i ) => $el[ k ] = $chk.eq( i ) );
			if ( page2 ) {
				$( '.infomessage, #infoContent td' ).css( 'width', '296' );
				$el.tapaddplay.click( function() {
					if ( $( this ).prop( 'checked' ) ) $el.tapreplaceplay.prop( 'checked', 0 );
				} );
				$el.tapreplaceplay.click( function() {
					if ( $( this ).prop( 'checked' ) ) $el.tapaddplay.prop( 'checked', 0 );
				} );
				$el.hidecover.change( function() {
					var enable = $( this ).prop( 'checked' ) ? 0 : 1;
					$el.fixedcover
						.prop( 'disabled', ! enable )
						.prop( 'checked', 0 )
						.parent().toggleClass( 'gr', ! enable );
				} );
				$el.fixedcover.prop( 'disabled', G.display.hidecover );
			} else {
				$el.sd.add( $el.usb ).prop( 'disabled', G.status.shareddata );
			}
		}
		, ok           : () => displaySave( keys )
	} );
}
function infoUpdate( path ) {
	if ( G.status.updating_db ) {
		info( {
			  icon    : 'refresh-library'
			, title   : 'Library Database'
			, message : 'Update in progress ...'
		} );
		return
	}
	
	info( {
		  icon       : 'refresh-library'
		, title      : 'Library Database'
		, message    : path ? '<i class="fa fa-folder"></i> <wh>'+ path +'</wh>' : ''
		, radio      : path ? '' : { 'Only changed files' : '', 'Rebuild entire database': 'rescan' }
		, beforeshow : () => {
			if ( ! G.status.counts ) {
				$( '#infoContent input' ).eq( 0 ).prop( 'disabled', 1 );
				$( '#infoContent input' ).eq( 1 ).prop( 'checked', 1 );
			}
		}
		, ok         : () => bash( [ 'mpcupdate', path || infoVal() ] )
	} );
}
function libraryHome() {
	$.post( 'mpdlibrary.php', { query: 'home' }, function( html ) {
		if ( html !== G.libraryhtml ) {
			G.libraryhtml = html;
			var timestamp = Math.round( Date.now() / 1000 );
			var html = html.replaceAll( '^^^', timestamp );
			$( '#lib-mode-list' ).html( html );
		}
		if ( ! $( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
		if ( G.library ) {
			if ( G.librarylist ) G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
			renderLibrary();
		} else {
			switchPage( 'library' );
			if ( G.status.updating_db ) banner( 'refresh-library blink', 'Library Database', 'Update ...' );
			if ( G.color ) $( '#mode-webradio' ).click();
		}
		$( '#lib-mode-list .bkcoverart' ).off( 'error' ).on( 'error', function() {
			$( this ).replaceWith( '<i class="fa fa-bookmark bookmark bl"></i>' );
		} );
		$( '#lib-path span' ).removeClass( 'hide' );
	} );
}
function local( delay ) {
	G.local = 1;
	setTimeout( () => G.local = 0, delay || 300 );
}
function lyricsShow( data ) {
	if ( data !== 'current' ) {
		G.lyrics       = data;
		var lyricshtml = data ? data.replace( /\n/g, '<br>' ) +'<br><br><br>·&emsp;·&emsp;·' : '<gr>(Lyrics not available.)</gr>';
		if ( G.lyricsCover ) $( '#divlyricstitle img' ).attr( 'src', G.lyricsCover );
		$( '#lyricstitle' ).text( G.lyricsTitle );
		$( '#lyricsartist' ).text( G.lyricsArtist );
		$( '#lyricstext' ).html( lyricshtml );
	}
	if ( $bartop.is( ':visible' ) ) {
		$( '#bar-bottom' ).addClass( 'lyrics-bar-bottom' );
		$( '#lyrics' ).css( { top: '', height: '' } )
	} else {
		$( '#lyrics' ).css( { top: 0, height: '100vh' } )
	}
	$( '#lyrics' ).removeClass( 'hide' );
	$( '#lyricstext' ).scrollTop( 0 );
	bannerHide();
}
function lyricsHide() {
	if ( $( '#artist' ).text() !== G.lyricsArtist || $( '#title' ).text() !== G.lyricsTitle ) {
		G.lyrics       = '';
		G.lyricsArtist = '';
		G.lyricsTitle  = '';
		$( '#lyricstext' ).empty();
		$( '#lyricstextarea' ).val( '' );
	}
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyrics' ).addClass( 'hide' );
	$( '#bar-bottom' ).removeClass( 'lyrics-bar-bottom' );
}
function menuHide() {
	$( '.menu' ).addClass( 'hide' );
	$( '.contextmenu ' ).find( 'a, i' ).removeClass( 'hide' );
	$( '.pl-remove' ).remove();
	$( '#lib-list li, #pl-savedlist li' ).removeClass( 'active' );
	$( '#pl-list li' ).removeClass( 'updn' );
}
function mpcSeek( elapsed ) {
	G.status.elapsed = elapsed;
	local();
	setProgress();
	if ( G.status.state === 'play' ) setTimeout( setProgressAnimate, 0 );
	$( '#elapsed, #total' ).removeClass( 'gr' );
	if ( G.status.state !== 'play' ) $( '#elapsed' ).addClass( 'bl' );
	$( '#elapsed' ).text( second2HMS( elapsed ) );
	$( '#total' ).text( second2HMS( G.status.Time ) );
	if ( G.status.state === 'stop' && $bartop.is( ':visible' ) ) {
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#pause' ).addClass( 'active' );
		$( '#title' ).addClass( 'gr' );
	}
	bash( [ 'mpcseek', elapsed, G.status.state ] );
}
function mpcSeekBar( pageX ) {
	var $timeband  = $( '#time-band' );
	var posX       = pageX - $timeband.offset().left;
	var bandW      = $timeband.width();
	posX           = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var pos        = posX / bandW;
	var elapsed    = Math.round( pos * G.status.Time );
	var elapsedhms = second2HMS( elapsed );
	if ( G.status.elapsed ) {
		$( '#progress span' ).html( elapsedhms );
	} else {
		$( '#progress' ).html( '<i class="fa fa-pause"></i><span>'+ elapsedhms +'</span> / '+ second2HMS( G.status.Time ) );
	}
	$( '#time-bar' ).css( 'width', ( pos * 100 ) +'%' );
	if ( ! G.drag ) mpcSeek( elapsed );
}
function orderLibrary() {
	G.display.order.forEach( name => {
		var $libmode = $( '.lib-mode' ).filter( ( i, el ) => $( el ).find( '.lipath' ).text() === name );
		$libmode.detach();
		$( '#lib-mode-list' ).append( $libmode );
	} );
}
function playlistInsert( indextarget ) {
	var plname = $( '#pl-path .lipath' ).text();
	bash( [ 'savedpledit', plname, 'add', indextarget, G.pladd.file ], () => {
		renderSavedPlaylist( plname );
		if ( indextarget === 'last' ) {
			setTimeout( () => $( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } ), 300 );
		}
		G.pladd = {}
	} );
}
function playlistInsertSelect( $this ) {
	var track = '<gr>'+ ( $this.index() + 1 ) +' - </gr>'+ $this.find( '.name' ).text();
	var content = `\
${ G.pladd.title }
<br><gr>${ G.pladd.album }</gr>
<br><br>
<input type="radio" name="inforadio" value="1">Before</label>
<hr>
${ track }
<hr>
<input type="radio" name="inforadio" value="2">After</label>
`;
	info( {
		  icon        : 'file-playlist'
		, title       : 'Insert'
		, content     : content
		, values      : [ 1 ]
		, buttonlabel : '<i class="fa fa-undo"></i>Select'
		, button      : playlistInsertTarget
		, cancel      : () => G.pladd = {}
		, ok          : () => playlistInsert( +infoVal() + $this.index() )
	} );
	bannerHide();
}
function playlistInsertTarget() {
	info( {
		  icon       : 'file-playlist'
		, title      : 'Add to a playlist'
		, message    : '<wh>'+ G.pladd.title +'</wh>'
					  +'<br>'+ G.pladd.album
					  +'<hr>'
					  +'Select where to add:'
		, radio      : { First : 'first', Select: 'select', Last: 'last' }
		, values     : 'last'
		, beforeshow : () => {
			$( '#infoContent input' ).eq( 1 ).click( function() {
				local();
				$( '#infoX' ).click();
			} );
		}
		, cancel     : () => {
			if ( ! G.local ) G.pladd = {}
		}
		, ok         : () => playlistInsert( infoVal() )
	} );
	bannerHide();
}
function playlistFilter() {
	var keyword = $( '#pl-search-input' ).val();
	var regex   = new RegExp( keyword, 'i' );
	var count   = 0;
	$( '#pl-list li' ).each( ( i, el ) => {
		var $this = $( el );
		var match = ( $this.text().search( regex ) !== -1 ) ? true : false;
		count     = match ? ( count + 1 ) : count;
		$this.toggleClass( 'hide', ! match );
		if ( ! $this.hasClass( 'hide' ) ) {
			var name = $this.find( '.name' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			var li2  = $this.find( '.li2' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			$this.find( '.name' ).html( name );
			$this.find( '.li2' ).html( li2 );
		}
	} );
	$( 'html, body' ).scrollTop( 0 );
	if ( keyword ) {
		$( '#pl-search-close' ).html( '<i class="fa fa-times"></i><span>'+ count +' <gr>of</gr> </span>' );
	} else {
		$( '#pl-search-close' ).empty();
	}
}
function playlistRemove( $li ) {
	if ( $( '#pl-list li' ).length === 1 ) {
		bash( [ 'mpcremove' ] );
	} else {
		var total  = $( '#pl-time' ).data( 'time' ) - $li.find( '.time' ).data( 'time' );
		var file   = $li.hasClass( 'file' );
		var $count = file ? $( '#pl-trackcount' ) : $( '#pl-radiocount' );
		var count  = +$count.text().replace( /,|\./g, '' ) - 1;
		if ( count ) {
			$count.text( count.toLocaleString() );
			if ( file ) $( '#pl-time' )
							.data( 'time', total )
							.text( second2HMS( total ) );
		} else {
			if ( file ) {
				$( '#pl-time' ).data( 'time', 0 ).empty();
				$count.next().addBack().remove()
			} else {
				$count.prev().addBack().remove();
			}
		}
		var poscurent = '';
		var pos = $li.index() + 1;
		if ( $li.hasClass( 'active' ) ) {
			if ( $li.next().is( 'li' ) ) {
				poscurent = pos;
				$li.next().addClass( 'active' );
			} else {
				poscurent = pos - 1;
				$li.prev().addClass( 'active' );
			}
		}
		bash( [ 'mpcremove', pos, poscurent ] );
		$( '#pl-list li .pos' ).slice( pos ).each( ( i, el ) => {
			$( el ).text( pos );
			pos++
		} );
		$li.remove();
	}
}
function refreshPage( resetdata ) {
	if ( G.library ) {
		if ( $( '#lib-search-input' ).val() ) return
		
		if ( ! G.librarylist ) { // home
			if ( resetdata ) G.libraryhtml = '';
			libraryHome();
		} else {
			if ( resetdata ) G.librarylisthtml = '';
			if ( [ 'sd', 'nas', 'usb' ].includes( G.mode ) ) {
				$( '#lib-breadcrumbs .lidir' ).last().click();
			} else if ( G.mode === 'album' ) {
				$( '#mode-album' ).click();
			} else if ( G.query.length ) {
				var query = G.query[ G.query.length - 1 ];
				list( query, function( html ) {
					var data = {
						  html      : html
						, modetitle : query.modetitle
						, path      : query.path
					}
					renderLibraryList( data );
				} );
			} else {
				$( '#mode-'+ G.mode ).click();
			}
		}
	} else if ( G.playback ) {
		getPlaybackStatus( 'withdisplay' );
	} else {
		if ( ! $( '#pl-list' ).hasClass( 'hide' ) ) {
			if ( resetdata ) G.playlisthtml = '';
			getPlaylist();
		} else if ( ! G.savedplaylist ) {
			$( '#button-pl-playlists' ).click();
		} else {
			renderSavedPlaylist( $( '#pl-path .lipath' ).text() )
		}
	}
}
function renderLibrary() {
	G.mode        = '';
	G.librarylist = 0;
	G.query       = [];
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-title, #lib-path>i, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path .lipath' ).empty()
	$( '#lib-breadcrumbs, #lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	$( '#page-library .content-top, #lib-list' ).addClass( 'hide' );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '.mode:not( .mode-bookmark )' ).each( ( i, el ) => {
		var name = el.id.replace( 'mode-', '' );
		$( el ).parent().toggleClass( 'hide', ! G.display[ name ] );
	} );
	if ( G.display.label ) {
		$( '#lib-mode-list a.label' ).show();
		$( '.mode' ).removeClass( 'nolabel' );
	} else {
		$( '#lib-mode-list a.label' ).hide();
		$( '.mode:not( .mode-bookmark )' ).addClass( 'nolabel' );
	}
	$( '#lib-list' ).addClass( 'hide' );
	$( '#lib-mode-list' )
		.css( 'padding-top', $bartop.is( ':visible' ) ? '' : 50 )
		.removeClass( 'hide' );
	if ( G.display.order ) orderLibrary();
	$( 'html, body' ).scrollTop( G.modescrolltop );
	$( '.bkedit' ).remove();
	$( '.mode-bookmark' ).children().addBack().removeAttr( 'style' );
	renderLibraryCounts();
}
function renderLibraryCounts() {
	$( '.mode gr' ).toggleClass( 'hide', ! G.display.count );
	var songs = G.status.counts.song ? G.status.counts.song.toLocaleString() +'<i class="fa fa-music gr"></i>' : '';
	$( '#li-count' ).html( songs );
	$.each( G.status.counts, ( k, v ) => $( '#mode-'+ k ).find( 'gr' ).text( v ? v.toLocaleString() : '' ) );
}
function renderLibraryList( data ) {
	G.librarylist = 1;
	$( '#lib-title, #lib-mode-list, .menu' ).addClass( 'hide' );
	$( '#button-lib-back' )
		.toggleClass( 'back-left', G.display.backonleft )
		.toggleClass( 'hide', data.modetitle === 'search' );
	$( '#lib-path .lipath' ).text( data.path );
	var root      = data.modetitle.toLowerCase() === G.mode;
	var modetitle = ! root ? data.modetitle : data.modetitle
												.replace( 'MARTIST', 'M ARTIST' )
												.replace( 'BRADIO', 'B RADIO' );
	var htmlmodetitle = '<i class="fa fa-'+ G.mode +'"></i> <span id="mode-title" '+ ( root ? 'class="spaced"' : '' ) +'>'+ modetitle +'</span>';
	if ( 'count' in data && G.mode !== 'latest' ) {
		$( '#lib-path' ).css( 'max-width', 40 );
		$( '#lib-list' ).css( 'width', '100%' );
		$( '#lib-search-close' ).html( '<i class="fa fa-times"></i><span>' + data.count + ' <gr>of</gr></span>' );
		var htmlpath = '';
	} else if ( [ 'DABRADIO', 'WEBRADIO' ].includes( data.path ) ) {
		var htmlpath = htmlmodetitle;
		$( '#lib-path .lipath' ).empty();
	} else if ( ! [ 'sd', 'nas', 'usb', 'dabradio', 'webradio' ].includes( G.mode ) ) {
		var htmlpath = htmlmodetitle;
		$( '#button-lib-search' ).addClass( 'hide' );
	} else if ( data.path ) { // dir breadcrumbs
		var dir      = data.path.split( '/' );
		var dir0     = dir[ 0 ];
		var htmlpath = '<i class="fa fa-'+ G.mode +'"></i>';
		if ( G.mode.slice( -5 ) === 'radio' ) htmlpath += '<a>'+ G.mode +'/</a>';
		htmlpath    += '<a>'+ dir0 +'<bll>/</bll><span class="lidir">'+ dir0 +'</span></a>';
		var lidir   = dir0;
		var iL      = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir    += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +'<bll>/</bll><span class="lidir">'+ lidir +'</span></a>';
		}
	}
	if ( G.mode === 'album' ) {
		if ( G.query.length === 1 ) htmlpath += '<span class="btntitle" id="button-coverart"><img src="/assets/img/iconcover.svg"></span>';
	} else if ( G.mode === 'webradio' ) {
		htmlpath += '<i class="btntitle button-webradio-new fa fa-plus-circle"></i>';
	} else if ( G.mode === 'latest' ) {
		htmlpath += '<i class="btntitle button-latest-clear fa fa-minus-circle"></i>';
	} else if ( G.mode === 'dabradio' ) {
		htmlpath += root ? '<i class="btntitle button-dab-refresh fa fa-refresh"></i>' : '';
	}
	$( '#lib-breadcrumbs' )
						.html( htmlpath )
						.removeClass( 'hide' );
	if ( data.html === G.librarylisthtml ) {
		$( '#lib-list, #lib-index, #lib-index1' ).removeClass( 'hide' );
		return
	}
	
	G.librarylisthtml = data.html;
	$( '#lib-list, #lib-index, #lib-index1' ).remove();
	if ( ! data.html ) return // empty radio
	
	var timestamp = Math.round( Date.now() / 1000 );
	var html      = data.html.replaceAll( '^^^', timestamp );
	$( '#lib-mode-list' ).after( html ).promise().done( () => {
		if ( $( '.licover' ).length ) {
			if ( $( '#liimg' ).attr( 'src' ).slice( 0, 5 ) === '/data' ) $( '.licoverimg ' ).append( icoversave );
		} else {
			imageLoad( 'lib-list' );
		}
		$( '.liinfopath' ).toggleClass( 'hide', [ 'sd', 'nas', 'usb', 'webradio' ].includes( G.mode ) );
		if ( G.mode === 'album' && $( '#lib-list .coverart' ).length ) {
			G.albumlist = 1;
			$( '#lib-list img' ).eq( 0 ).on( 'load', function() {
				$( '#button-coverart img' ).attr( 'src', $( this ).attr( 'src' ) );
			} );
			if ( G.iactive ) $( '#lib-list .coverart' ).eq( G.iactive ).addClass( 'active' );
			$( '#lib-list' ).removeClass( 'hide' );
		} else {
			G.albumlist = 0;
			$( '#lib-list p' )
				.toggleClass( 'fixedcover', G.display.fixedcover )
				.toggleClass( 'bars-on', $bartop.is( ':visible' ) );
			$( '#lib-list' ).removeClass( 'hide' );
			G.color ? colorSet() : setTrackCoverart();
		}
		$( '#lib-list' ).css( 'width', $( '#lib-index' ).length ? '' : '100%' );
		var pH = G.wH - 80;
		pH -= G.albumlist ? $( '.coverart' ).height() : 49;
		if ( $bartop.is( ':hidden' ) ) pH += 40;
		$( '#lib-list p' )
			.removeClass( 'bars-on' )
			.toggleClass( 'fixedcover', G.display.fixedcover && $( '.licover' ).length === 1 )
			.css( 'height', pH );
		$( 'html, body' ).scrollTop( G.scrolltop[ data.path ] || 0 );
	} );
}
function renderPlayback() {
	if ( ! G.status.state ) return // suppress on reboot
	
	local();
	if ( G.status.state === 'stop' ) setProgress( 0 );
	setVolume();
	clearInterval( G.intBlinkDot );
	if ( ! G.status.pllength && G.status.player === 'mpd' && G.status.state === 'stop' ) { // empty queue
		setPlaybackBlank();
		return
	}
	
	$( '.emptyadd, .qr' ).addClass( 'hide' );
	$( '#coverart' ).css( 'opacity', '' );
	$( '#divcover .coveredit.cover' ).remove();
	$( '#coverTR' ).removeClass( 'empty' );
	$( '#qrwebui, #qrip' ).empty();
	setInfo();
	setCoverart();
	var istate = '<i class="fa fa-'+ G.status.state +'"></i>';
	if ( G.status.elapsed === false || G.status.webradio ) {
		setBlinkDot();
		return
	}
	
	var time    = 'Time' in G.status ? G.status.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	$timeRS.option( 'max', time || 100 );
	if ( G.status.state === 'stop' ) {
		$( '#elapsed, #total, #progress' ).empty();
		$( '#title' ).removeClass( 'gr' );
		if ( timehms ) {
			$( '#progress' ).html( istate +'<span></span>'+ timehms );
			$( '#elapsed' )
				.text( timehms )
				.addClass( 'gr' );
		}
		return
	}
	
	$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
	if ( G.status.elapsed === false || G.status.Time === false || ! ( 'elapsed' in G.status ) || G.status.elapsed > time ) {
		$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
		blinkDot();
		return
	}

	if ( G.status.elapsed ) {
		var elapsedhms = second2HMS( G.status.elapsed );
		$( '#progress' ).html( istate +'<span>'+ elapsedhms +'</span> / '+ timehms );
	} else {
		$( '#progress' ).html( istate +'<span></span>'+ timehms );
		setTimeout( () => $( '#progress span' ).after( ' / ' ), 1000 );
	}
	setProgress();
	if ( G.status.state === 'pause' ) {
		$( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
		$( '#total' ).addClass( 'wh' );
	} else { //play
		setProgressElapsed();
	}
}
function renderPlaylist( data ) {
	G.savedlist      = 0;
	G.savedplaylist  = 0;
	G.status.elapsed = data.elapsed;
	G.status.song    = data.song;
	$( '#pl-search-close' ).click();
	$( '#button-pl-back, #pl-savedlist, #pl-index' ).addClass( 'hide' );
	$( '#button-pl-playlists' ).toggleClass( 'disabled', G.status.counts.playlists === 0 );
	if ( ! G.status.pllength || data == -1 ) {
		G.playlisthtml = '';
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disabled' );
		$( '#pl-search-close' ).click();
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		switchPage( 'playlist' );
		return
	}
	
	$( '.playlist' ).removeClass( 'hide' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '#button-pl-save, #button-pl-clear, #button-pl-search' ).removeClass( 'disabled' );
	$( '#button-pl-shuffle' ).toggleClass( 'disabled', G.status.pllength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-librandom' )
		.toggleClass( 'bl', G.status.librandom )
		.toggleClass( 'disabled', G.status.counts.song === 0 );
	if ( data.html !== G.playlisthtml ) {
		G.playlisthtml = data.html;
		var timestamp  = Math.round( Date.now() / 1000 );
		var html = data.html.replaceAll( '^^^', timestamp ) +'<p></p>';
		$( '#pl-list' ).html( html ).promise().done( () => {
			imageLoad( 'pl-list' );
			setPlaylistScroll();
		} );
	} else {
		setPlaylistScroll();
	}
	$( '.list p' ).toggleClass( 'bars-on', $bartop.is( ':visible' ) );
}
function renderPlaylistList( data ) {
	$( '.playlist, #button-pl-search, #menu-plaction' ).addClass( 'hide' );
	$( '#menu-plaction' ).addClass( 'hide' );
	
	$( '#pl-path' ).html( data.counthtml );
	$( '#button-pl-back, #pl-savedlist, #pl-index' ).removeClass( 'hide' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
	var barvisible = $bartop.is( ':visible' );
	if ( data.html !== G.playlisthtml ) {
		G.playlistlisthtml = data.html;
		var timestamp      = Math.round( Date.now() / 1000 );
		var html           = data.html.replaceAll( '^^^', timestamp ) +'<p></p>';
		$( '#pl-savedlist' ).html( html ).promise().done( () => {
			$( '.list p' ).toggleClass( 'bars-on', barvisible );
			$( '#pl-savedlist' ).css( 'width', '' );
			$( '#pl-index' ).html( data.index[ 0 ] );
			$( '#pl-index1' ).html( data.index[ 1 ] );
			$( 'html, body' ).scrollTop( 0 );
		} );
	} else {
		$( '.list p' ).toggleClass( 'bars-on', barvisible );
	}
}
function renderSavedPlaylist( name ) {
	menuHide();
	list( { cmd: 'get', name: name }, function( data ) {
		$( '#pl-path' ).html( data.counthtml );
		$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
		$( '#button-pl-back, #pl-savedlist' ).removeClass( 'hide' );
		var timestamp = Math.round( Date.now() / 1000 );
		var html = data.html.replaceAll( '^^^', timestamp ) +'<p></p>';
		$( '#pl-savedlist' ).html( data.html ).promise().done( () => {
			imageLoad( 'pl-savedlist' );
			$( '.list p' ).toggleClass( 'bars-on', $bartop.is( ':visible' ) );
			$( '#pl-savedlist' ).css( 'width', '100%' );
			$( '#pl-index, #pl-index1' ).addClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
		} );
	}, 'json' );
}
function saveToPlaylist( title, album, file ) {
	G.pladd.title = title;
	G.pladd.album = album;
	G.pladd.file  = file;
	local();
	$( '#button-pl-playlists' ).click();
	if ( ! G.playlist ) $( '#button-playlist' ).click();
	banner( 'file-playlist blink', 'Add to a playlist', 'Select target playlist', 5000 );
}
function second2HMS( second ) {
	if ( ! second || second < 1 ) return ''
	
	var second = Math.round( second );
	if ( second < 60 ) return second;
	
	var ss = second % 60;
	var mm = Math.floor( ( second % 3600 ) / 60 );
	if ( ss < 10 ) ss = '0'+ ss;
	if ( second < 3600 ) return mm +':'+ ss;
	
	if ( mm < 10 ) mm = '0'+ mm;
	var hh = Math.floor( second / 3600 );
	return hh  +':'+ mm +':'+ ss;
}
function setBlinkDot() {
	[ G.intBlinkDot, G.intElapsedPl, G.intElapsed, G.intVu ].forEach( el => clearInterval( el ) );
	$( '#vuneedle' ).css( 'transform', '' );
	$( '#elapsed, #total, #progress' ).empty();
	if ( G.status.state === 'play' ) {
		$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
		blinkDot();
		if ( G.display.radioelapsed ) {
			$( '#progress' ).html( '<i class="fa fa-'+ G.status.state +'"></i><span></span>' );
			setProgressElapsed();
		}
	}
}
function setBookmarkEdit() {
	if ( $( '.bkedit' ).length ) {
		$( '.bkedit' ).remove();
		$( '.mode-bookmark' ).children().addBack().removeAttr( 'style' );
		return
	}
	
	G.bklabel = $( this ).find( '.label' );
	$( '.mode-bookmark' ).each( ( i, el ) => {
		var $this      = $( el );
		var path       = $this.find( '.lipath' ).text();
		var buttonhtml = '<i class="bkedit bk-remove fa fa-minus-circle"></i>';
		if ( ! $this.find( 'img' ).length ) buttonhtml += '<i class="bkedit bk-rename fa fa-edit-circle"></i>';
		buttonhtml    += '<div class="bkedit bk-cover">'+ iconcover +'</div>';
		$this.append( buttonhtml );
	} );
	$( '.mode-bookmark' )
		.css( 'background', 'hsl(0,0%,15%)' )
		.find( '.fa-bookmark, .label, img' )
		.css( 'opacity', 0.33 );
}
function setButtonControl() {
	if ( ! G.status.state ) return // suppress on reboot
	
	if ( $bartop.is( ':visible' ) ) {
		var mpd_upnp = [ 'mpd', 'upnp' ].includes( G.status.player );
		var noprevnext = G.status.pllength < 2 || ! mpd_upnp;
		$( '#playback-controls' ).toggleClass( 'hide', G.status.pllength === 0 && mpd_upnp );
		$( '#previous, #next' ).toggleClass( 'hide', noprevnext );
		$( '#coverL, #coverR' ).toggleClass( 'disabled', noprevnext );
		$( '#play, #pause, #coverM' ).toggleClass( 'disabled', ! mpd_upnp );
		$( '#pause' ).toggleClass( 'hide', G.status.stream && G.status.player !== 'upnp' );
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#'+ G.status.state ).addClass( 'active' ); // suppress on reboot
	}
	if ( G.playback ) setTimeout( setButtonOptions, 0 );
}
function setButtonOptions() {
	$( '#relays' ).toggleClass( 'on', G.status.relayson );
	$( '#snapclient' ).toggleClass( 'on', G.status.player === 'snapcast' || G.display.snapclientactive );
	$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
	var timevisible = $time.is( ':visible' );
	var prefix = timevisible ? 'ti' : 'i';
	$( '#'+ prefix +'-btsender' ).toggleClass( 'hide', ! G.status.btreceiver );
	$( '#'+ prefix +'-relays' ).toggleClass( 'hide', ! G.status.relayson );
	$( '#'+ prefix +'-stoptimer' ).toggleClass( 'hide', ! G.status.stoptimer );
	$( '#'+ prefix +'-snapclient' ).toggleClass( 'hide', ! G.display.snapclientactive );
	if ( ! G.status.stream && G.status.player === 'mpd' ) {
		if ( $( '#play-group' ).is( ':visible' ) ) {
			$( '#random' ).toggleClass( 'active', G.status.random );
			$( '#repeat' ).toggleClass( 'active', G.status.repeat );
			$( '#single' ).toggleClass( 'active', G.status.single );
		} else {
			$( '#'+ prefix +'-random' ).toggleClass( 'hide', ! G.status.random );
			$( '#'+ prefix +'-repeat' ).toggleClass( 'hide', ! G.status.repeat || G.status.single );
			$( '#'+ prefix +'-repeat1' ).toggleClass( 'hide', ! ( G.status.repeat && G.status.single ) );
			$( '#'+ prefix +'-single' ).toggleClass( 'hide', ! G.status.single || ( G.status.repeat && G.status.single ) );
		}
		[ 'consume', 'librandom' ].forEach( option => {
			if ( timevisible ) {
				$( '#i-'+ option ).addClass( 'hide' );
				$( '#ti-'+ option ).toggleClass( 'hide', ! G.status[ option ] );
			} else {
				$( '#ti-'+ option ).addClass( 'hide' );
				$( '#i-'+ option ).toggleClass( 'hide', ! G.status[ option ] );
			}
			$( '#button-pl-'+ option ).toggleClass( 'bl', G.status[ option ] );
		} );
	}
	setButtonUpdateAddons();
	setButtonUpdating();
	if ( $volume.is( ':hidden' ) && G.status.volumemute ) $( '#'+ prefix +'-mute' ).removeClass( 'hide' );
}
function setButtonUpdateAddons() {
	if ( G.status.updateaddons ) {
		$( '#button-settings, #addons i' ).addClass( 'bl' );
		if ( ! G.display.bars ) {
			var prefix = $time.is( ':visible' ) ? 'ti' : 'i';
			$( '#'+ prefix +'-addons' ).addClass( 'hide' );
			$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
		}
	} else {
		$( '#button-settings, #addons i' ).removeClass( 'bl' );
		$( '#i-addons, #ti-addons' ).addClass( 'hide' );
	}
}
function setButtonUpdating() {
	clearInterval( G.intBlinkUpdate );
	if ( G.status.updating_db ) {
		if ( $( '#bar-bottom' ).is( ':hidden' ) || $( '#bar-bottom' ).hasClass( 'transparent' ) ) {
			var prefix = $time.is( ':visible' ) ? 'ti' : 'i';
			$( '#'+ prefix +'-libupdate' ).removeClass( 'hide' );
		} else {
			$( '#library, #button-library' ).addClass( 'blink' );
		}
		if ( G.localhost ) blinkUpdate();
		$( '#update' ).addClass( 'on' );
	} else {
		$( '#library, #button-library' ).removeClass( 'blink' );
		$( '#i-libupdate, #ti-libupdate' ).addClass( 'hide' );
		$( '#update' ).removeClass( 'on' );
	}
	$( '#i-dabupdate' ).toggleClass( 'hide', ! G.status.updatingdab );
}
function setCoverart() {
	if ( ! G.display.cover ) {
		loaderHide();
		return
	}
	
	if ( G.display.vumeter ) {
		$( '#coverart' )
			.addClass( 'hide' )
			.attr( 'src', '' );
		$( '#vu' ).removeClass( 'hide' );
		loaderHide();
	} else {
		var coverart = G.status.stream ? ( G.status.coverart || G.status.stationcover ) : G.status.coverart;
		if ( coverart ) {
			$( '#vu' ).addClass( 'hide' );
			$( '#coverart' )
				.attr( 'src', coverart )
				.removeClass( 'hide' );
		} else {
			coverartDefault();
		}
	}
}
function setInfo() {
	G.prevartist = $( '#artist' ).text();
	G.prevtitle  = $( '#title' ).text();
	G.prevalbum  = $( '#album' ).text();
	if ( ! G.status.stream || G.status.player === 'upnp' ) {
		$( '#artist' ).text( G.status.Artist );
		$( '#title' )
			.text( G.status.Title )
			.toggleClass( 'gr', G.status.state === 'pause' );
		$( '#album' ).text( G.status.Album || G.status.file );
	} else { // webradio
		var url = G.status.file.replace( /#charset=.*/, '' );
		if ( G.status.state !== 'play' ) {
			$( '#artist' ).text( G.status.station );
			$( '#title' ).html( '·&ensp;·&ensp;·' );
			$( '#album' ).text( url );
		} else {
			$( '#artist' ).text( G.status.Artist || ( ! G.status.Artist && ! G.status.Title ? G.status.station : '' ) );
			$( '#title' ).html( G.status.Title || blinkdot );
			blinkDot();
			$( '#album' ).text( G.status.Album || url );
		}
	}
	$( '#artist' ).toggleClass( 'disabled', G.status.Artist === '' );
	$( '#title' ).toggleClass( 'disabled', G.status.Title === '' );
	$( '#album' ).toggleClass( 'disabled', G.status.Album === '' );
	setInfoScroll();
	var sampling = G.status.sampling;
	if ( G.status.stream ) {
		if ( G.status.icon === 'dabradio' ) {
			sampling += ' • DAB';
		} else if ( G.status.Album && G.status.station ) {
			sampling += ' • '+ G.status.station;
		} else {
			sampling += ' • '+ G.status.ext;
		}
	}
	$( '#sampling' ).html( sampling );
	if ( G.status.icon !== $( '#playericon' ).prop( 'class' ).replace( 'fa fa-', '' ) ) {
		$( '#playericon' ).removeAttr( 'class' );
		if ( G.status.icon ) $( '#playericon' ).addClass( 'fa fa-'+ G.status.icon );
	}
	if ( $time.is( ':hidden' ) ) setProgressElapsed();
}
function setInfoScroll() {
	var wW = document.body.clientWidth;
	if ( wW === G.wW
		&& $( '#artist' ).text() === G.prevartist
		&& $( '#title' ).text() === G.prevtitle
		&& $( '#album' ).text() === G.prevalbum
	) return // suppress multiple fires, skip if same width and same data
	
	G.wH = document.body.clientHeight;
	G.wW = wW;
	var tWmax = 0;
	var $el   = $( '#artist, #title, #album' );
	$el
		.removeClass( 'scrollleft scrollellipse' )
		.removeAttr( 'style' );
	$el.each( ( i, el ) => {
		var tW = Math.ceil( el.getBoundingClientRect().width );
		if ( tW > G.wW - 20 ) {
			if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
			$( el ).addClass( 'scrollleft' );
		}
	} );
	if ( ! tWmax ) return
	
	$( '.scrollleft' ).css( { // same width and speed
		  width     : tWmax
		, animation : ( G.wW + tWmax ) / G.scrollspeed +'s infinite linear scrollleft'
	} );
	if ( G.localhost ) {
		$( '.scrollleft' )
			.css( 'animation-iteration-count', 1 )
			.on( 'animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function() {
				$( this )
					.removeClass( 'scrollleft' )
					.removeAttr( 'style' )
					.addClass( 'scrollellipse' );
			} );
	}
}
function setPlaybackBlank() {
	$( '#page-playback .emptyadd' ).toggleClass( 'hide', G.status.player !== 'mpd' );
	$( '#playback-controls, #infoicon i, #vu' ).addClass( 'hide' );
	$( '#divartist, #divtitle, #divalbum' ).removeClass( 'scroll-left' );
	$( '#artist, #title, #album, #progress, #elapsed, #total' ).empty();
	setProgress( 0 );
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' )
		.attr( 'src', G.coverdefault )
		.css( 'opacity', '' );
	if ( G.status.ip ) {
		$( '#qrip' ).html( '<gr>http://</gr>'+ G.status.ip +'<br><gr>http://</gr>'+ G.status.hostname );
		var qr = new QRCode( {
			  msg : 'http://'+ G.status.ip
			, dim : 230
			, pad : 11
		} );
		$( '#qrwebui' ).html( qr );
		$( '.qr' ).removeClass( 'hide' );
		$( '#coverTR' ).toggleClass( 'empty', $bartop.is( ':hidden' ) );
		$( '#coverart' ).addClass( 'hide' );
		$( '#sampling' ).empty();
	} else {
		$( '#coverart' ).removeClass( 'hide' );
		$( '#sampling' )
			.css( 'display', 'block' )
			.html( 'Network not connected:&emsp; <i class="fa fa-networks fa-lg wh"></i>&ensp;Setup' )
			.on( 'click', '.fa-networks', function() {
				location.href = 'settings.php?p=networks';
			} );
		$( '.qr' ).addClass( 'hide' );
	}
	vu();
}
function setPlaylistInfoWidth() {
	// pl-icon + margin + duration + margin
	var $liactive = $( '#pl-list li.active' );
	var $duration = $liactive.find( '.duration' );
	var $title    = $liactive.find( '.name' );
	var titleW    = $title.scrollWidth;
	var iWdW      = 40 + 10 + $duration.width() + 9;
	var wW        = document.body.clientWidth;
	$title.css(  'max-width', iWdW + titleW < wW ? '' : wW - iWdW );
}
function setPlaylistScroll() {
	clearIntervalAll();
	switchPage( 'playlist' );
	if ( G.sortable
		|| ( G.display.audiocd && $( '#pl-list li' ).length < G.status.song + 1 ) // on eject cd G.status.song not yet refreshed
	) return
	
	var litop = $bartop.is( ':visible' ) ? 80 : 40;
	$( '#menu-plaction' ).addClass( 'hide' );
	$( '#pl-list li' ).removeClass( 'active updn' );
	$liactive = $( '#pl-list li' ).eq( G.status.song || 0 );
	$liactive.addClass( 'active' );
	if ( ! $( '.pl-remove' ).length && I.infohide ) {
		if ( $( '#pl-list li' ).length < 5 ) {
			var top = 0;
		} else {
			var top = $liactive.offset().top - litop - ( 49 * 3 );
		}
		$( 'html, body' ).scrollTop( top );
	}
	$( '#pl-list .elapsed' ).empty();
	var $this        = $( '#pl-list li' ).eq( G.status.song );
	var $elapsed     = $this.find( '.elapsed' );
	var $name        = $this.find( '.name' );
	var $stationname = $this.find( '.li2 .stationname' );
	$stationname.addClass( 'hide' );
	if ( G.status.state === 'stop' ) {
		if ( G.status.webradio ) $name.text( $this.find( '.liname' ).text() );
		$stationname.addClass( 'hide' );
	} else {
		if ( G.status.elapsed === false ) return
		
		var slash = G.status.Time ? ' <gr>/</gr>' : '';
		if ( G.status.player === 'upnp' ) $this.find( '.time' ).text( second2HMS( G.status.Time ) );
		if ( G.status.state === 'pause' ) {
			elapsedtxt = second2HMS( G.status.elapsed );
			$elapsed.html( '<i class="fa fa-pause"></i>'+ elapsedtxt + slash );
			setPlaylistInfoWidth();
		} else if ( G.status.state === 'play' ) {
			$stationname.removeClass( 'hide' );
			if ( G.status.webradio ) {
				$stationname.removeClass( 'hide' );
				$name.html( G.status.Title || '·&ensp;·&ensp;·' );
			}
			var elapsedL0 = 0;
			var elapsedL  = 0;
			if ( G.status.elapsed ) $elapsed.html( '<i class="fa fa-play"></i>'+ second2HMS( G.status.elapsed ) + slash );
			G.intElapsedPl = setInterval( () => {
				G.status.elapsed++;
				if ( G.status.elapsed === G.status.Time ) {
					clearIntervalAll();
					G.status.elapsed = 0;
					$elapsed.empty();
					setPlaylistScroll();
				} else {
					elapsedtxt = second2HMS( G.status.elapsed );
					$elapsed.html( '<i class="fa fa-play"></i>'+ elapsedtxt + slash );
					elapsedL = elapsedtxt.length;
					if ( elapsedL > elapsedL0 ) {
						elapsedL0 = elapsedL;
						setPlaylistInfoWidth();
					}
				}
			}, 1000 );
		}
	}
}
function setProgress( position ) {
	if ( G.status.state !== 'play' || G.status.elapsed === 0 ) clearInterval( G.intElapsed );
	if ( position !== 0 ) position = G.status.elapsed;
	$timeprogress.css( 'transition-duration', '0s' );
	$timeRS.setValue( position );
	var w = position && G.status.Time ? position / G.status.Time * 100 : 0;
	$( '#time-bar' ).css( 'width', w +'%' );
}
function setProgressAnimate() {
	if ( ! G.display.time && ! G.display.cover ) return
	
	$timeprogress.css( 'transition-duration', G.status.Time - G.status.elapsed +'s' );
	$timeRS.setValue( G.status.Time );
	$( '#time-bar' ).css( 'width', '100%' );
}
function setProgressElapsed() {
	clearInterval( G.intElapsed );
	if ( G.status.elapsed === false || G.status.state !== 'play' || 'autoplaycd' in G ) return // wait for cd cache on start
	
	var elapsedhms;
	var $elapsed = G.status.elapsed === false ? $( '#total, #progress span' ) : $( '#elapsed, #progress span' );
	if ( G.status.elapsed ) $elapsed.text( second2HMS( G.status.elapsed ) );
	if ( G.status.Time ) {
		var time = G.status.Time;
		$timeRS.option( 'max', time );
		setProgress();
		if ( ! G.localhost ) {
			setTimeout( setProgressAnimate, 0 ); // delay to after setvalue on load
		} else {
			$timeprogress.css( 'transition-duration', '0s' );
		}
		G.intElapsed = setInterval( () => {
			G.status.elapsed++;
			if ( G.status.elapsed < time ) {
				if ( G.localhost ) {
					$timeRS.setValue( G.status.elapsed );
					$( '#time-bar' ).css( 'width', G.status.elapsed / time * 100 +'%' );
				}
				elapsedhms = second2HMS( G.status.elapsed );
				$elapsed.text( elapsedhms );
				if ( G.status.state !== 'play' ) clearInterval( G.intElapsed );
			} else {
				G.status.elapsed = 0;
				clearIntervalAll();
				$elapsed.empty();
				setProgress( 0 );
			}
		}, 1000 );
	} else if ( G.display.radioelapsed ) {
		$( '#elapsed' ).html( blinkdot );
		$elapsed = $( '#total, #progress span' );
		$elapsed.text( second2HMS( G.status.elapsed ) );
		G.intElapsed = setInterval( () => {
			G.status.elapsed++;
			elapsedhms = second2HMS( G.status.elapsed );
			$elapsed.text( elapsedhms );
			if ( G.status.state !== 'play' ) clearInterval( G.intElapsed );
		}, 1000 );
	}
}
function setTrackCoverart() {
	if ( G.display.hidecover || ! $( '#liimg' ).length ) return
	
	$( '#liimg' ).off( 'load' ).on( 'load', function() { // not exist on initial page load
		$( 'html, body' ).scrollTop( 0 );
	} ).off( 'error' ).on( 'error', function() {
		$( this ).attr( 'src', G.coverdefault );
	} );
	if ( G.mode === 'album' ) {
		$( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
		$( '.liinfo .lialbum' ).addClass( 'hide' );
	} else {
		$( '.liinfo .lialbum' ).removeClass( 'hide' );
	}
	if ( ! G.display.fixedcover ) {
		$( '.licover' ).addClass( 'nofixed' );
		$( '#lib-list li' ).eq( 1 ).removeClass( 'track1' );
	}
}
function setVolume() {
	var mute = G.status.volumemute !== 0;
	$volumeRS.setValue( G.status.volume );
	if ( G.status.volume === 0 ) $volumehandle.rsRotate( -310 );
	mute ? volumeColorMute( G.status.volumemute ) : volumeColorUnmute();
	$( '#voldn' ).toggleClass( 'disabled', G.status.volume === 0 );
	$( '#volmute' ).toggleClass( 'disabled', G.status.volume === 0 && ! mute );
	$( '#volup' ).toggleClass( 'disabled', G.status.volume === 100 );
	$( '#volume-bar' ).css( 'width', G.status.volume +'%' );
	$( '#volume-text' )
		.text( G.status.volumemute || G.status.volume )
		.toggleClass( 'bl', mute );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'i';
		$( '#'+ prefix +'-mute' ).toggleClass( 'hide', ! mute );
	}
}
function sortPlaylist( pl, iold, inew ) {
	G.sortable = 1;
	setTimeout( () => G.sortable = 0, 500 );
	if ( pl === 'pl-list' ) {
		bash( [ 'mpcmove', iold + 1, inew + 1 ] );
	} else {
		bash( [ 'savedpledit', $( '#pl-path .lipath' ).text(), 'move', iold, inew ] );
	}
	var i    = Math.min( iold, inew );
	var imax = Math.max( iold, inew ) + 1;
	$( '#'+ pl +' li .pos' ).slice( i, imax ).each( ( i, el ) => {
		i++
		$( el ).text( i );
	} );
}
function stopAirplay() {
	info( {
		  icon    : 'airplay'
		, title   : 'AirPlay'
		, message : 'AirPlay is playing.'
				   +'<br>Stop AirPlay?'
		, ok      : () => $( '#stop' ).click()
	} );
}
function switchPage( page ) {
	clearIntervalAll();
	// get scroll position before changed
	if ( G.library ) {
		if ( G.librarylist ) {
			G.liscrolltop = $( window ).scrollTop();
		} else {
			G.modescrolltop = $( window ).scrollTop();
		}
		if ( G.color ) $( '#colorcancel' ).click();
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) G.plscrolltop = $( window ).scrollTop();
	}
	$( '.page, .menu' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
	G.library = G.playback = G.playlist = 0;
	G[ page ] = 1;
	G.page    = page;
	displayBottom();
	// restore page scroll
	if ( G.playback ) {
		$( 'html, body' ).scrollTop( 0 );
		vu();
	} else if ( G.library ) {
		if ( G.librarylist ) {
			$( 'html, body' ).scrollTop( G.liscrolltop );
		} else {
			renderLibrary();
		}
	} else {
		if ( G.savedlist || G.savedplaylist ) $( 'html, body' ).scrollTop( G.plscrolltop );
	}
}
function thumbUpdate( path ) {
	var form  = '<form id="formtemp" action="/settings/addons-progress.php" method="post">';
	[ 'cove', 'update', 'main', path || '' ].forEach( el => form += '<input type="hidden" name="opt[]" value="'+ el +'">' );
	$( 'body' ).append( form +'</form>' );
	$( '#formtemp' ).submit();
}
function urlReachable( url, sec ) {
	if ( ! sec ) {
		var sec = 0;
	} else if ( sec === 5 ) {
		info( {
			  icon    : 'camilladsp'
			, title   : 'CamillaDSP'
			, message : 'CamillaDSP settings not available.'
		} );
		loaderHide();
		return
	}
	
	fetch( url, { mode: 'no-cors' } ).then( function() {
		location.href = url;
	} ).catch( function() {
		sec++
		setTimeout( () => urlReachable( url, sec ), 1000 );
	} );
}
function volumeBarHide() {
	$( '#info' ).removeClass( 'hide' ); // 320 x 480
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.volumeband' ).addClass( 'transparent' );
}
function volumeBarSet( pageX ) {
	clearTimeout( G.volumebar );
	if ( pageX === 'toggle' ) {
		var vol = G.status.volumemute || 0;
		var cmd = [ 'volume' ];
	} else {
		var posX  = pageX - $( '#volume-band' ).offset().left;
		var bandW = $( '#volume-band' ).width();
		posX      = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
		var vol   = Math.round( posX / bandW * 100 );
		var cmd   = [ 'volume', G.status.volume, vol, G.status.card, G.status.control ]
	}
	if ( G.drag ) {
		$( '#volume-bar' ).css( 'width', vol +'%' );
		bash( [ 'volume', 'drag', vol, G.status.card, G.status.control ] );
	} else {
		var ms = Math.ceil( Math.abs( vol - G.status.volume ) / 5 ) * 0.2 * 1000;
		$( '#volume-bar' ).animate(
			  { width: vol +'%' }
			, {
				  duration : ms
				, easing   : 'linear'
				, complete : () => G.volumebar = setTimeout( volumeBarHide, 3000 )
			}
		);
		$( '.volumeband' ).addClass( 'disabled' );
		
		bash( cmd, () => $( '.volumeband' ).removeClass( 'disabled' ) );
	}
	$( '#volume-text' ).text( G.status.volumemute || vol );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
	G.status.volume = vol;
	$volumeRS.setValue( G.status.volume );
}
function volumeBarShow() {
	if ( G.status.volumenone || ! $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	G.volumebar = setTimeout( volumeBarHide, 3000 );
	$( '#volume-text' )
		.text( G.status.volumemute === 0 ? G.status.volume : G.status.volumemute )
		.toggleClass( 'bl', G.status.volumemute !== 0 );
	$( '#volume-bar' ).css( 'width', G.status.volume +'%' );
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	$( '#volume-band-dn, #volume-band-up' ).removeClass( 'transparent' );
}
function volumeColorMute() {
	$volumetooltip
		.text( G.status.volumemute )
		.addClass( 'bl' );
	$volumehandle.addClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'fa-volume' )
		.addClass( 'fa-mute active' );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'i';
		$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
	}
}
function volumeColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'fa-mute active' )
		.addClass( 'fa-volume' );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
}
function vu() {
	if ( G.status.state !== 'play' || G.display.vumeter || $( '#vu' ).hasClass( 'hide' ) ) {
		clearInterval( G.intVu );
		$( '#vuneedle' ).css( 'transform', '' );
		return
	}
	
	setTimeout( () => {
		var range = 8; // -/+
		var deg   = 0;
		var inc;
		clearInterval( G.intVu );
		$( '#vuneedle' ).css( 'transform', 'rotate( '+ Math.random() * range +'deg )' );
		G.intVu = setInterval( () => {
			inc  = Math.random() * range * 2;
			deg += inc;
			if ( deg < -range ) {
				deg = -range + inc;
			} else if ( deg > range ) {
				deg = range - inc;
			}
			$( '#vuneedle' ).css( 'transform', 'rotate( '+ ( deg + 31 ) +'deg )' );
		}, 300 );
	}, 300 );
}
