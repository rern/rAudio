function list( args, callback, json ) {
	$.post(
		  'playlist' in args  ? 'mpdplaylist.php' : 'mpdlibrary.php'
		, args
		, callback || null
		, json || null
	);
}

//----------------------------------------------------------------------
function bio( artist, getsimilar ) {
	if ( artist === $( '#biocontent .artist' ).text() ) {
		$( '#bio' ).removeClass( 'hide' );
		V.observer.observe( $( '#bioimg' )[ 0 ] );
		return
	}
	
	loader();
	var url = 'http://ws.audioscrobbler.com/2.0/'
			 +'?autocorrect=1'
			 +'&format=json'
			 +'&method=artist.getinfo'
			 +'&api_key='+ V.apikeylastfm
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
		
		V.bioartist.push( artist );
		var data     = data.artist;
		var name     = data.name;
		var content  = data.bio.content.replace( /\n/g, '<br>' ).replace( /Read more on Last.fm.*/, '</a>' );
		var genre    = data.tags.tag[ 0 ].name;
		var backhtml = getsimilar ? ico( 'back bioback' ) : '';
		var similar  =  data.similar.artist;
		if ( similar ) {
			var similarhtml  = '<p>'+ ico( 'artist i-lg' ) +'&ensp;Similar Artists:<p><span>';
			similar.forEach( a => similarhtml += '<a class="biosimilar">'+ a.name +'</a>,&ensp;' );
			similarhtml = similarhtml.slice( 0, -7 ) +'</span><br><br>';
		}
		var biohtml = `
<div class="container">
<div id="biocontent">
	<p class="artist">${ ico( 'close close-root closebio' ) + name }</p>
	<p class="genre">${ backhtml + ico( 'genre i-lg' ) +'&ensp;'+ genre }</p>
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
			$( '#bio' )
				.removeClass( 'hide' )
				.scrollTop( 0 );
			$.get( 'https://webservice.fanart.tv/v3/music/'+ data.mbid +'?api_key='+ V.apikeyfanart ).done( data => {
				if ( 'error message' in data ) {
					bioImageSet();
					return
				}
				
				if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) $( '#biocontent' ).before( '<img id="biobanner" src="'+ data.musicbanner[ 0 ].url +'">' )
				var imageshtml = '';
				if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
					data.artistthumb.forEach( el => imageshtml += '<a href="'+ el.url +'" target="_blank"><img src="'+ el.url.replace( '/fanart/', '/preview/' ) +'"></a>' );
				}
				bioImageSet( imageshtml )
				$( '#bio' ).scrollTop( 0 );
			} ).fail( function() { // 404 not found
				bioImageSet();
			} );
		} );
	} );
}
function bioImageSet( imageshtml ) {
	var $artist    = $( '#biocontent .artist' );
	if ( ! imageshtml ) {
		if ( $artist.text() !== S.Artist || ! S.coverart ) {
			loaderHide();
			return
		}
		
		imageshtml = '<a><img src="'+ S.coverart +'"></a>';
	}
	$artist
		.before( '<div id="bioimg">'+ imageshtml +'</div>' )
		.prepend( '<img id="biotitleimg" src="'+ $( '#bioimg img' ).last().attr( 'src' ) +'">' );
	var titleafter = $artist.prev().prop('id') === 'bioimg';
	if ( 'observer' in V ) V.observer.disconnect();
	if ( V.wW < 481 ) {
		var options = { rootMargin: '-50px 0px 0px 0px' } // detect when pass 50px before top
		if ( titleafter ) $artist.insertBefore( $( '#bioimg' ) );
		$( '#biotitleimg' ).css( 'margin-left', 0 );
	} else {
		var options = { rootMargin: '0px' }
		if ( ! titleafter ) $artist.insertAfter( $( '#bioimg' ) );
		$( '#biotitleimg' ).css( 'margin-left', -1 * ( V.wW / 3 > 200 ? 220 : V.wW / 3 + 20 ) +'px' );
	}
	V.observer   = new IntersectionObserver( entries => $( '#biotitleimg' ).toggleClass( 'hide', entries[ 0 ].isIntersecting ), options );
	V.observer.observe( $( '#bioimg' )[ 0 ] );
	loaderHide();
}
function blinkDot() {
	if ( ! localhost ) return
	
	$( '.dot' ).css( 'animation', 'none' );
	var $d1 = $( '.dot1' );
	var $d2 = $( '.dot2' );
	var $d3 = $( '.dot3' );
	V.interval.blinkdot = setInterval( () => {
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
	var $icons = $( '#library, #button-library, #mi-libupdate, #ti-libupdate' );
	$icons.removeClass( 'blink' );
	V.interval.blinkupdate = setInterval( () => {
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
		, checkchanged : true
		, checkip      : [ 0 ]
		, beforeshow   : () => $( '#infoContent input' ).prop( 'type', 'tel' )
		, ok           : () => {
			var ip = infoVal();
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
	$.each( V.interval, ( k, v ) => clearInterval( v ) );
	if ( S.state === 'play' && ! S.stream ) setProgress(); // stop progress animation
	$( '#vuneedle' ).css( 'transform', '' );
}
function colorIcon( el ) {
	$( el ).html( '<canvas></canvas>' );
	var canvas      = $( el ).find( 'canvas' )[ 0 ];
	var ctx         = canvas.getContext( '2d' );
	var cw          = canvas.width / 2;
	var ch          = canvas.height / 2;
	for( i = 0; i < 360; i += 0.25 ) {
		var rad         = i * Math.PI / 180;
		ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
		ctx.beginPath();
		ctx.moveTo( cw, ch );
		ctx.lineTo( cw + cw * Math.cos( rad ), ch + ch * Math.sin( rad ) );
		ctx.stroke();
	}
}
function colorSet() {
	V.color = false;
	$( 'body' ).css( 'overflow', 'hidden' );
	if ( V.library ) {
		if ( V.librarytrack && $( '.licover' ).is( ':visible' ) ) {
			$( '.licover' ).css( 'margin-top', '-230px' );
			$( '#lib-list li.track1' ).css( 'margin-top', 0 );
			$( '#lib-list li' ).eq( 1 ).trigger( 'click' )
			setTimeout( () => $( '#lib-list li' ).eq( 1 ).addClass( 'active' ), 0 );
		} else {
			$( '#lib-list .li-icon' ).eq( 0 ).trigger( 'click' );
		}
	} else {
		if ( V.plhome ) {
			$( '#pl-list li' ).slice( 0, S.song ).css( 'display', 'none' );
			$( '#pl-list li.active .li-icon' ).trigger( 'click' );
		} else {
			$( '#pl-savedlist .li-icon' ).eq( 0 ).trigger( 'click' );
		}
	}
	pageScroll( 0 );
	$( '#lyrics' ).before( `
<div id="colorpicker">
	<div id="divcolor">
	<i id="colorcancel" class="i-close"></i>
	<canvas id="canvascolor"></canvas>
	<a id="colorreset" class="infobtn ${ D.color ? '' : 'hide' }"><i class="i-set0"></i> Default</a><a id="colorok" class="infobtn infobtn-primary disabled">OK</a>
	</div>
</div>
` );
	typeof KellyColorPicker === 'function' ? colorSetPicker() : $.getScript( '/assets/js/plugin/'+ jfiles.html5kellycolorpicker, colorSetPicker );
}
function colorSetPicker() {
	local();
	if ( V.library ) {
		var $bg_cg  = D.bars ? $( '#bar-top, #playback-controls i, .menu a, .submenu, #playlist' ) : $( '.menu a, .submenu' );
		var $bg_cm  = D.bars ? $( '#playback-controls .active, #colorok, #library, #button-library' ) : $( '#colorok, #button-library' );
		var $bg_cga = D.bars ? $( '.content-top, #playback, #lib-index' ) : $( '.content-top, #lib-index' );
		var $t_cg   = $( '#colorcancel, #button-lib-back, #lib-breadcrumbs a:first-of-type, #lib-breadcrumbs a:last-of-type' );
		var $t_cgl  = $( '#lib-index a' );
		var $t_cg60 = $( '#lib-list li' );
	} else {
		var $bg_cg  = D.bars ? $( '#bar-top, #playback-controls i, .menu a, .submenu, #library' ) : $( '.menu a, .submenu' );
		var $bg_cm  = D.bars ? $( '#playback-controls .active, #colorok, #playlist, #button-playlist' ) : $( '#colorok, #button-playlist' );
		var $bg_cga = D.bars ? $( '.content-top, #playback, #pl-index' ) : $( '.content-top, #pl-index' );
		var $t_cg   = $( '#colorcancel, #button-pl-back' );
		var $t_cgl  = $( '#pl-index a' );
		var $t_cg60 = V.plhome ? $( '#pl-list li' ) : $( '#pl-savedlist li' );
	}
	var $menu_a     = $( '.menu a' ).not( '.hide' );
	V.colorelements = $( 'body' ).add( $bg_cg ).add( $bg_cm ).add( $bg_cga ).add( $t_cg ).add( $t_cgl ).add( $t_cg60 ).add( $menu_a );
	V.colorpicker   = new KellyColorPicker( {
		  place  : 'canvascolor'
		, size   : 230
		, color  : $( '#button-library' ).css( 'background-color' )
		, userEvents : {
			change : function( e ) {
				var hex = e.getCurColorHex();
				var h = Math.round( 360 * e.getCurColorHsv().h );
				var hsg = 'hsl('+ h +',3%,';
				if ( ! V.local ) $( '#colorok' ).removeClass( 'disabled' );
				// background
				$bg_cg.css( 'background-color', hsg +'30%)' );
				$bg_cm.add( V.list.li ).css( 'background-color', hex );
				$bg_cga.css( 'background-color', hsg +'20%)' );
				// text
				$t_cgl.css( 'color', hsg +'40%)' );
				$t_cg.css( 'color', hex );
				$t_cg60.not( '.active' ).find( 'i, .li2' ).css( 'css', 'color: '+ hsg +'60%)' );
				V.list.li.find( 'i, .time, .li2' ).css( 'color', hsg +'30%)' );
				$menu_a.css( 'color', hsg +'75%)' );
				// line
				$t_cg60.css( 'border-bottom', '1px solid '+ hsg +'20%)' );
				$menu_a.css( 'border-top', '1px solid '+ hsg +'20%)' );
			}
		}
	} );
}
function contextmenuLibrary( $li, $target ) {
	menuHide();
	var $menu          = $( '#menu-'+ $li.find( '.li-icon' ).data( 'menu' ) );
	V.list             = {};
	V.list.li          = $li; // for contextmenu
	V.list.licover     = $li.hasClass( 'licover' );
	V.list.singletrack = ! V.list.licover && $li.find( '.li-icon' ).hasClass( 'i-music' );
	// file modes  - path > path ... > tracks
	// album mode  - path > tracks
	// other modes - name > name-album > filtered tracks
	V.list.path        = $li.find( '.lipath' ).text() || $( '#mode-title' ).text();
	if ( V.playlist ) {
		V.list.name   = $li.find( '.liname' ).text() || '';
		V.list.artist = $li.find( '.liartist' ).text() || '';
	} else if ( V.librarytrack && ! V.list.licover ) {
		V.list.name   = $li.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		V.list.artist = $( '.licover .liartist' ).text() || '';
	} else {
		V.list.name   = $li.find( '.name' ).text() || V.list.path;
	}
	V.list.track = $li.data( 'track' ) || '';  // cue - in contextmenu
	if ( ( D.tapaddplay || D.tapreplaceplay )
		&& ! V.color
		&& ! $target.hasClass( 'li-icon' )
		&& ! V.list.licover
		&& S.player === 'mpd'
	) {
		var i = D.tapaddplay ? 0 : 1;
		$menu.find( '.submenu' ).eq( i ).trigger( 'click' );
		$li.addClass( 'active' );
		return
	}
	var filemode = [ 'nas', 'sd', 'usb', 'dabradio', 'webradio' ].includes( V.mode );
	$menu.find( '.playnext, .replace, .i-play-replace' ).toggleClass( 'hide', ! S.pllength );
	$menu.find( '.refresh-library' ).toggleClass( 'hide', ! ( 'updating_db' in S ) );
	$menu.find( '.bookmark, .exclude, .update, .thumb' ).toggleClass( 'hide', ! filemode );
	$menu.find( '.directory' ).toggleClass( 'hide', filemode );
	$menu.find( '.tag' ).toggleClass( 'hide', ! V.librarytrack || ! filemode );
	$menu.find( '.wredit' ).toggleClass( 'hide', V.mode !== 'webradio' );
	$menu.find( '.wrdirrename' ).toggleClass( 'hide', V.mode.slice( -5 ) !== 'radio' );
	$li.addClass( 'active' );
	if ( V.list.licover ) {
		var menutop = $bartop.is( ':visible' ) ? 310 : 270;
	} else {
		var menutop = $li.offset().top + 48;
	}
	contextmenuScroll( $menu, menutop );
}
function contextmenuScroll( $menu, menutop ) {
	var fixedmenu = V.library && ( V.list.licover && V.wH > 767 ) && D.fixedcover ? true : false;
	$menu
		.css( 'top',  menutop )
		.toggleClass( 'fixed', fixedmenu )
		.removeClass( 'hide' );
	var targetB   = $menu.offset().top + $menu.height();
	var topH      = $bartop.is( ':visible' ) ? 80 : 40;
	var wT        = $( window ).scrollTop();
	if ( targetB > ( V.wH - topH + wT ) ) $( 'html, body' ).animate( { scrollTop: targetB - V.wH + 42 } );
}
function coverartChange() {
	if ( V.playback ) {
		var src    = $( '#coverart' ).attr( 'src' );
		var path   = dirName( S.file );
		var album  = S.Album;
		var artist = S.Artist;
	} else {
		var src = $( '#liimg' ).attr( 'src' );
		var path   = $( '.licover .lipath' ).text();
		if ( path.split( '.' ).pop() === 'cue' ) path = dirName( path );
		var album  = $( '.licover .lialbum' ).text();
		var artist = $( '.licover .liartist' ).text();
	}
	if ( 'discid' in S ) {
		var imagefilenoext = '/srv/http/data/audiocd/'+ S.discid;
		var type = 'audiocd';
	} else {
		var imagefilenoext = '/mnt/MPD/'+ path +'/cover';
		var type = 'coverart';
	}
	if ( V.playback ) {
		var pbonlinefetched = $( '#divcover .cover-save' ).length;
		var pbcoverdefault  = $( '#coverart' ).attr( 'src' ) === V.coverdefault;
		var embedded        = $( '#coverart' ).attr( 'src' ).split( '/' )[ 3 ] === 'embedded' ? '(Embedded)' : '';
	} else {
		var lionlinefetched = $( '.licover .cover-save' ).length;
		var licoverdefault  = $( '.licoverimg img' ).attr( 'src' ) === V.coverdefault;
		var embedded        = $( '.licoverimg img' ).attr( 'src' ).split( '/' )[ 3 ] === 'embedded' ? '(Embedded)' : '';
	}
	var coverartlocal = ( V.playback && ! embedded && ! pbonlinefetched && ! pbcoverdefault )
						|| ( V.library && ! embedded && ! lionlinefetched && ! licoverdefault )
						&& $( '#liimg' ).attr( 'src' ).slice( 0, 7 ) !== '/assets';
	$( '#coverart, #liimg' ).removeAttr( 'style' );
	$( '.coveredit' ).remove();
	var icon  = 'coverart';
	var title = 'Change Album Cover Art';
	info( {
		  icon        : icon
		, title       : title
		, message     : '<img class="imgold">'
					   +'<p class="infoimgname">'+ ico( 'album wh' ) +' '+ album
					   +'<br>'+ ico( 'artist wh' ) +' '+ artist +'</p>'
		, footer      : embedded
		, beforeshow  : () => $( '.imgold' ).attr( 'src', src ) // fix direct replace src
		, filelabel   : ico( 'folder-open' ) +'File'
		, fileoklabel : ico( 'flash' ) +'Replace'
		, filetype    : 'image/*'
		, buttonlabel : ! coverartlocal ? '' : ico( 'remove' ) +'Remove'
		, buttoncolor : ! coverartlocal ? '' : red
		, button      : ! coverartlocal ? '' : () => {
			var ext = $( '.infomessage .imgold' ).attr( 'src' ).slice( -3 );
			bash( [ 'coverartreset', imagefilenoext +'.'+ ext, path, artist, album, 'CMD COVERFILE MPDPATH ARTIST ALBUM' ] );
		}
		, ok          : () => {
			imageReplace( type, imagefilenoext );
			banner( icon, title, 'Change ...' );
		}
	} );
}
function coverartDefault() {
	if ( D.vumeter ) return
	
	var hash = versionHash();
	if ( ! D.covervu ) {
		$( '#coverart' )
			.attr( 'src', V.coverdefault + hash )
			.css( 'border', V.coverdefault === V.coverart ? 'none' : '' )
			.removeClass( 'hide' );
		$( '#vu' ).addClass( 'hide' );
	} else {
		$( '#coverart' )
			.addClass( 'hide' )
			.attr( 'src', V.coverdefault + hash );
		$( '#vu' ).removeClass( 'hide' );
		vu();
	}
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
}
function coverartSave() {
	if ( V.playback ) {
		var src    = $( '#coverart' ).attr( 'src' );
		var file   = S.file;
		var path   = '/mnt/MPD/'+ dirName( file );
		var artist = S.Artist;
		var album  = S.Album;
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
		var icon          = 'coverart';
		var title         = 'Save Album Cover Art';
		info( {
			  icon    : icon
			, title   : title
			, message :  '<img class="infoimgnew" src="'+ base64 +'">'
						+'<p class="infoimgname">'+ ico( 'folder' ) +' '+ album
						+'<br>'+ ico( 'artist' ) +' '+ artist +'</p>'
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
	
	var smallscreen = V.wH < 590 || V.wW < 500;
	var lcd         = ( V.wH <= 320 && V.wW <= 480 ) || ( V.wH <= 480 && V.wW <= 320 );
	if ( ! D.bars || ( smallscreen && ! D.barsalways ) || lcd ) {
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
		$( '.content-top' ).css( 'top', D.bars || D.barsalways ? '' : 0 );
		$( '.emptyadd' ).css( 'top', '' );
	}
	displayBottom();
	if ( ! S.state || $bartop.is( ':hidden' ) ) return // suppress on reboot
	
	var mpd_upnp = [ 'mpd', 'upnp' ].includes( S.player );
	var noprevnext = S.pllength < 2 || ! mpd_upnp;
	$( '#playback-controls' ).toggleClass( 'hide', S.pllength === 0 && mpd_upnp );
	$( '#previous, #next' ).toggleClass( 'hide', noprevnext );
	$( '#coverL, #coverR' ).toggleClass( 'disabled', noprevnext );
	$( '#play, #pause, #coverM' ).toggleClass( 'disabled', ! mpd_upnp );
	$( '#pause' ).toggleClass( 'hide', S.stream && S.player !== 'upnp' );
	$( '#playback-controls i' ).removeClass( 'active' );
	$( '#'+ S.state ).addClass( 'active' ); // suppress on reboot
}
function displayBottom() {
	$( '#playback' )
		.removeAttr( 'class' )
		.addClass( 'i-'+ S.player );
	$( '#bar-bottom i' ).removeClass( 'active' );
	$( '#'+ V.page ).addClass( 'active' );
}
function displayPlayback() {
	$time.toggleClass( 'hide', ! D.time );              // #time hidden on load - set before get :hidden
	var hidetime   = ! D.time || $time.is( ':hidden' ); // #time hidden by css on small screen
	var hidevolume = ! D.volume || D.volumenone;
	$volume.toggleClass( 'hide', hidevolume );
	var $cover     = $( '#coverart-block' );
	$cover.toggleClass( 'hide', ! D.cover );
	if ( ( hidetime || hidevolume ) && V.wW > 500 ) {
		$( '#time-knob, #volume-knob' ).css( 'width', '38%' );
		if ( hidetime && hidevolume ) {
			$cover.css( { width: '100%', 'max-width': '100%' } );
		} else if ( hidetime || hidevolume ) {
			$cover.css( { width: 'fit-content', 'max-width': '55vw' } );
		}
	} else {
		$( '#time-knob, #volume-knob' ).css( 'width', '' );
		$cover.css( { width: '', 'max-width': '' } );
	}
	if ( ! hidetime ) $( '#time' ).roundSlider( S.stream || S.player !== 'mpd' || ! S.pllength ? 'disable' : 'enable' );
	$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', ! hidetime );
	$( '#time-band' ).toggleClass( 'disabled', ! S.pllength || S.player !== 'mpd' || S.stream );
	$( '#time, #coverBL, #coverBR' ).toggleClass( 'disabled', S.stream || ! [ 'mpd', 'upnp' ].includes( S.player ) );
	$( '.volumeband' ).toggleClass( 'disabled', D.volumenone || $volume.is( ':visible' ) );
	$( '#map-time' ).toggleClass( 'hide', D.cover );
	$( '#button-time, #button-volume' ).toggleClass( 'hide', ! D.buttons );
	$( '#playback-row' ).css( 'align-items', D.buttons ? '' : 'center' );
}
function displaySave() {
	var values  = infoVal();
	[ 'libmain', 'liboption', 'playback' ].forEach( chk => {
		$.each( chkdisplay[ chk ], ( k, v ) => {
			if ( ! ( k in values ) && k !== '-' ) values[ k ] = D[ k ];
		} );
	} );
	bash( { cmd: [ 'display' ], json: values } );
}
function displaySubMenu() {
	$( '#dsp' )
		.toggleClass( 'i-camilladsp', D.camilladsp )
		.toggleClass( 'i-equalizer', D.equalizer );
	D.dsp = D.camilladsp || D.equalizer;
	[ 'dsp', 'logout', 'relays', 'snapclient', 'multiraudio' ].forEach( el => $( '#'+ el ).prev().toggleClass( 'sub', D[ el ] ) ); // submenu toggled by css .settings + .submenu
	if ( localhost ) $( '#power' ).addClass( 'sub' );
}
function guideHide() {
	if ( V.guide ) {
		V.guide        = false;
		var barvisible = $bartop.is( ':visible' );
		$( '#coverTR' ).toggleClass( 'empty', ! S.pllength && ! barvisible && S.player === 'mpd' );
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
		if ( V.mode === 'album' || V.mode === 'latest' ) {
			$lazyload.off( 'error' ).on( 'error', function() {
				imageOnError( this );
			} );
		} else if ( [ 'artist', 'albumartist', 'composer', 'conductor', 'date', 'genre' ].includes( V.mode ) ) {
			$lazyload.off( 'error' ).on( 'error', function() {
				var $this = $( this );
				$this.replaceWith( '<i class="i-album li-icon" data="album"></i>' );
			} );
		} else {
			$lazyload.off( 'error' ).on( 'error', function() {
				var $this = $( this );
				var src = $this.attr( 'src' );
				if ( V.mode.slice( -5 ) === 'radio' ) {
					if ( $this.parent().hasClass( 'dir' ) ) {
						var icon = 'folder';
						var menu = 'wrdir';
					} else {
						var icon = V.mode;
						var menu = 'webradio';
					}
				} else {
					var icon = $this.parent().data( 'index' ) !== 'undefined' ? 'folder' : V.mode;
					var menu = 'folder';
				}
				$this.replaceWith( '<i class="i-'+ icon +' li-icon" data-menu="'+ menu +'"></i>' );
			} );
		}
	} else {
		$lazyload.off( 'error' ).on( 'error', function() {
			var $this = $( this );
			$this.replaceWith( '<i class="i-'+ $this.data( 'icon' ) +' li-icon" data-menu="filesavedpl"></i>' );
		} );
	}
}
function imageOnError( el, bookmark ) {
	var $this      = $( el );
	var src        = $this.attr( 'src' );
	if ( src.slice( -16, -13 ) === 'jpg' ) {
		$this.attr( 'src', src.replace( 'jpg?v=', 'gif?v=' ) );
	} else if ( ! bookmark ) {
		$this.attr( 'src', V.coverart );
	} else { // bookmark
		var icon = ico( 'bookmark bl' );
		if ( ! V.librarylist ) icon += '<a class="label">'+ bookmark +'</a>';
		$this.replaceWith( icon );
		$( '#infoContent input' ).parents( 'tr' ).removeClass( 'hide' );
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
	$.post( 'cmd.php', data, function( std ) {
		if ( std == -1 ) infoWarning( I.icon, I.title, 'Target directory not writable.' )
	} );
	banner( 'coverart', I.title, 'Change ...', -1 );
}
function infoLibrary() {
	var keys     = Object.keys( chkdisplay.libmain );
	keys         = keys.filter( k => k !== '-' );
	var values   = {}
	keys.forEach( k => { values[ k ] = D[ k ] } );
	info( {
		  icon         : 'library'
		, title        : 'Library'
		, tablabel     : [ 'Show', 'Options' ]
		, tab          : [ '', infoLibraryOption ]
		, messagealign : 'left'
		, checkbox     : Object.values( chkdisplay.libmain )
		, checkcolumn  : true
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			var $el  = {};
			keys.forEach( ( k, i ) => $el[ k ] = $( '#infoContent input' ).eq( i ) );
			$el.sd.add( $el.usb ).prop( 'disabled', S.shareddata );
		}
		, ok           : displaySave
	} );
}
function infoLibraryOption() {
	var keys     = Object.keys( chkdisplay.liboption );
	keys         = keys.filter( k => k !== '-' );
	var values   = {}
	keys.forEach( k => { values[ k ] = D[ k ] } );
	info( {
		  icon         : 'library'
		, title        : 'Library'
		, tablabel     : [ 'Show', 'Options' ]
		, tab          : [ infoLibrary, '' ]
		, messagealign : 'left'
		, checkbox     : Object.values( chkdisplay.liboption )
		, values       : values
		, checkchanged : true
		, beforeshow   : () => {
			var $el  = {}
			keys.forEach( ( k, i ) => $el[ k ] = $( '#infoContent input' ).eq( i ) );
			$( '#infoContent tr' ).css( 'height', '36px' );
			$( '#infoContent td' ).css( 'width', '294px' );
			$el.albumyear.prop( 'disabled', ! D.albumbyartist );
			$el.fixedcover.prop( 'disabled', D.hidecover );
			$el.albumbyartist.on( 'click', function() {
				var enable = $( this ).prop( 'checked' );
				if ( ! enable ) $el.albumyear.prop( 'checked', false );
				$el.albumyear.prop( 'disabled', ! enable )
			} );
			$el.tapaddplay.on( 'click', function() {
				if ( $( this ).prop( 'checked' ) ) $el.tapreplaceplay.prop( 'checked', false );
			} );
			$el.tapreplaceplay.on( 'click', function() {
				if ( $( this ).prop( 'checked' ) ) $el.tapaddplay.prop( 'checked', false );
			} );
			$el.hidecover.on( 'change', function() {
				if ( $( this ).prop( 'checked' ) ) {
					$el.fixedcover.prop( 'checked', false ).prop( 'disabled', true );
				} else {
					$el.fixedcover.prop( 'disabled', false );
				}
			} );
		}
		, ok           : displaySave
	} );
}
function infoTitle() {
	var artist = S.Artist;
	var title  = S.Title;
	var album  = S.Album;
	if ( album.includes( '://' ) ) album = '';
	artist  = artist.replace( /(["`])/g, '\\$1' );
	title   = title.replace( /(["`])/g, '\\$1' );
	var noparen      = title.slice( -1 ) !== ')';
	var titlenoparen = title.replace( / $|\(.*$/, '' );
	var paren        = title.replace( /^.*\(/, '(' );
	var content      = `\
<table>
<tr><td>${ ico( 'artist wh' ) }</td><td><input class="required" type="text"></td></tr>
<tr><td>${ ico( 'music wh' ) }</td><td><input class="required" type="text"></td></tr>
<tr class="album"><td>${ ico( 'album wh' ) }</td><td><input type="text"></td></tr>
<tr id="paren"><td></td><td><label><input type="checkbox"><gr>${ ico( 'music wh' ) }Title includes:</gr> ${ paren }</label></td></tr>
<tr style="height: 10px;"></tr>
<tr><td colspan="2" class="btnbottom">
	<span class="lyrics">${ ico( 'lyrics' ) } Lyrics</span>
	<span class="bio">&emsp;${ ico( 'bio' ) } Bio</span>
	<span class="similar">&emsp;${ ico( 'lastfm' ) } Add Similar</span>
	<span class="scrobble">&emsp;${ ico( 'lastfm' ) } Scrobble</span>
	</td></tr>
</table>`;
	info( {
		  icon        : 'playback'
		, title       : 'Current Track'
		, content     : content
		, width       : 460
		, boxwidth    : 'max'
		, values      : noparen ? [ artist, title, album ] : [ artist, titlenoparen, album ]
		, beforeshow  : () => {
			if ( noparen ) {
				$( '#paren' ).addClass( 'hide' );
			} else {
				$( '#infoContent input:checkbox' ).on( 'change', function() {
					$( '#infoContent input:text' ).eq( 1 ).val( $( this ).prop( 'checked' ) ? title : titlenoparen );
				} );
			}
			$( '#infoContent input.required' ).on( 'keyup paste cut', function() {
				var $this = $( this );
				$this.css( 'border-color', $this.val() ? '' : 'red' );
				$( '#infoContent .scrobble' ).toggleClass( 'disabled', $this.val() === '' );
			} );
			$( '#infoContent .lyrics' ).toggleClass( 'hide', ! S.lyrics );
			$( '#infoContent .album' ).toggleClass( 'hide', album === '' );
			$( '#infoContent .scrobble' ).toggleClass( 'hide', ! S.scrobble || ! S.webradio );
			$( '#infoContent' ).on( 'click', '.btnbottom span', function() {
				var values = infoVal();
				var artist = values[ 0 ]
				var title  = values[ 1 ]
				var $this  = $( this );
				if ( $this.hasClass( 'lyrics' ) ) {
					V.lyricsartist = artist || S.Artist;
					V.lyricstitle  = title || S.Title;
					var file       = S.player === 'mpd' ? '/mnt/MPD/'+ S.file : '';
					bash( [ 'lyrics', V.lyricsartist, V.lyricstitle, file, 'CMD ARTIST TITLE ACTION' ], data => lyricsShow( data ) );
					banner( 'search blink', 'Lyrics', 'Fetch ...', 20000 );
				} else if ( $this.hasClass( 'bio' ) ) {
					bio( artist );
				} else if ( $this.hasClass( 'similar' ) ) {
					addSimilar();
				} else if ( $this.hasClass( 'scrobble' ) ) {
					bash( [ 'scrobble', ...values, 'CMD ARTIST TITLE ALBUM' ] );
					banner( 'lastfm blink', 'Scrobble', 'Send ...' );
				}
				$( '#infoX' ).trigger( 'click' );
			} );
		}
		, okno        : true
	} );
}
function infoUpdate( path ) {
	if ( S.updating_db ) {
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
		, message    : path ? ico( 'folder' ) +' <wh>'+ path +'</wh>' : ''
		, radio      : path ? '' : { 'Only changed files' : '', 'Rebuild entire database': 'rescan' }
		, beforeshow : () => {
			if ( ! C ) {
				$( '#infoContent input' ).eq( 0 ).prop( 'disabled', true );
				$( '#infoContent input' ).eq( 1 ).prop( 'checked', true );
			}
		}
		, ok         : () => bash( [ 'mpcupdate', path || infoVal(), 'CMD DIR' ] )
	} );
}
function libraryHome() {
	list( { query: 'home' }, function( data ) {
		C        = data.counts;
		O        = data.order;
		var html = data.html;
		if ( html !== V.libraryhtml ) {
			V.libraryhtml = html;
			var hash      = versionHash();
			var html      = html.replace( /\^\^\^/g, hash );
			$( '#lib-mode-list' ).html( html );
		}
		if ( ! $( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
		if ( V.library ) {
			if ( V.librarylist ) V.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
			renderLibrary();
		} else {
			switchPage( 'library' );
			if ( S.updating_db ) banner( 'refresh-library blink', 'Library Database', 'Update ...' );
		}
		$( '#lib-mode-list .bkcoverart' ).off( 'error' ).on( 'error', function() {
			imageOnError( this, $( this ).prev().text() );
		} );
		$( '#lib-path span' ).removeClass( 'hide' );
		if ( V.color ) $( '#mode-webradio' ).trigger( 'click' );
	}, 'json' );
}
function lyricsGet( artist, title, file ) {
	V.lyricsartist = artist || S.Artist;
	V.lyricstitle  = title || S.Title;
	if ( $( '#lyricstitle' ).text() === V.lyricstitle && $( '#lyricsartist' ).text() === V.lyricsartist ) {
		$( '#lyrics' ).removeClass( 'hide' );
		$( '#lyricstext' ).scrollTop( 0 );
		return
	}
	
	$( '#lyricsrefresh' ).addClass( 'blink' );
	bash( [ 'lyrics', V.lyricsartist, V.lyricstitle, 'CMD ARTIST TITLE' ], data => {
		lyricsShow( data );
		bannerHide();
		$( '#lyricsrefresh' ).removeClass( 'blink' );
	} );
	if ( $( '#lyrics' ).hasClass( 'hide' ) ) banner( 'lyrics blink', 'Lyrics', 'Fetch ...' );
}
function lyricsHide() {
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyrics' ).addClass( 'hide' );
}
function lyricsShow( data ) {
	V.lyrics       = data;
	var lyricshtml = data ? data.replace( /\n/g, '<br>' ) +'<br><br><br>·&emsp;·&emsp;·' : '<gr>(Lyrics not available.)</gr>';
	$( '#divlyricstitle img' ).attr( 'src', $( '#coverart' ).attr( 'src' ) );
	$( '#lyricstitle' ).text( V.lyricstitle );
	$( '#lyricsartist' ).text( V.lyricsartist );
	$( '#lyricstext' ).html( lyricshtml );
	if ( $bartop.is( ':visible' ) ) {
		$( '#lyrics' ).css( { top: '', height: '' } )
	} else {
		$( '#lyrics' ).css( { top: 0, height: '100vh' } )
	}
	$( '#lyrics' ).removeClass( 'hide' );
	$( '#lyricstext' ).scrollTop( 0 );
	bannerHide();
}
function menuHide() {
	$( '.menu' ).addClass( 'hide' );
	$( '.contextmenu ' ).find( 'a, i' ).removeClass( 'hide' );
	$( '#lib-list li, #pl-savedlist li' ).removeClass( 'active' );
	$( '#pl-list li' ).removeClass( 'updn' );
}
function mpcSeek( elapsed ) {
	S.elapsed = elapsed;
	local();
	setProgress();
	if ( S.state === 'play' ) setTimeout( setProgressAnimate, 0 );
	$( '#elapsed, #total' ).removeClass( 'gr' );
	if ( S.state !== 'play' ) $( '#elapsed' ).addClass( 'bl' );
	$( '#elapsed' ).text( second2HMS( elapsed ) );
	$( '#total' ).text( second2HMS( S.Time ) );
	if ( S.state === 'stop' && $bartop.is( ':visible' ) ) {
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#pause' ).addClass( 'active' );
		$( '#title' ).addClass( 'gr' );
	}
	bash( [ 'mpcseek', elapsed, S.state, 'CMD ELAPSED STATE' ] );
}
function mpcSeekBar( pageX ) {
	var $timeband  = $( '#time-band' );
	var posX       = pageX - $timeband.offset().left;
	var bandW      = $timeband.width();
	posX           = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var pos        = posX / bandW;
	var elapsed    = Math.round( pos * S.Time );
	var elapsedhms = second2HMS( elapsed );
	if ( S.elapsed ) {
		$( '#progress span' ).html( elapsedhms );
	} else {
		$( '#progress' ).html( ico( 'pause' ) +'<span>'+ elapsedhms +'</span> / '+ second2HMS( S.Time ) );
	}
	$( '#time-bar' ).css( 'width', ( pos * 100 ) +'%' );
	if ( ! V.drag ) mpcSeek( elapsed );
}
function orderLibrary() {
	O.forEach( name => {
		var $libmode = $( '.lib-mode' ).filter( ( i, el ) => $( el ).find( '.lipath' ).text() === name );
		$libmode.detach();
		$( '#lib-mode-list' ).append( $libmode );
	} );
}
function pageScroll( pos ) {
	setTimeout( () => $( 'html, body' ).scrollTop( pos ), 0 );
}
function playbackStatusGet( withdisplay ) {
	bash( [ 'status.sh', withdisplay ], list => {
		if ( list == -1 ) {
			loaderHide();
			info( {
				  icon    : 'networks'
				, title   : 'Shared Data'
				, message : iconwarning +'Server offline'
							+'<br><br>Disable and restore local data?'
				, cancel  : loader
				, okcolor : orange
				, ok      : () => bash( [ 'settings/system.sh', 'shareddatadisable' ], () => location.reload() )
			} );
			return
		}
		
		try {
			var status = JSON.parse( list );
		} catch( e ) {
			errorDisplay( e.message, list );
			return false
		}
		
		C = status.counts;
		delete status.counts;
		if ( 'display' in status ) {
			D              = status.display;
			D.logout       = status.login;
			V.coverdefault = ! D.covervu && ! D.vumeter ? V.coverart : V.covervu;
			delete status.display;
			delete V.coverTL;
			displaySubMenu();
			bannerHide();
		}
		$.each( status, ( k, v ) => { S[ k ] = v } ); // need braces
		var dataerror = $( '#data .copy' ).length;
		if ( $( '#data' ).hasClass( 'hide' ) || dataerror ) {
			if ( dataerror ) {
				$( '#data' ).empty();
				$( '#button-data, #data' ).addClass( 'hide' );
			}
			renderPlaybackAll();
		} else {
			$( '#data' ).html( highlightJSON( S ) )
			$( '#button-data, #data' ).removeClass( 'hide' );
		}
	} );
}
function playlistInsert( indextarget ) {
	var plname = $( '#pl-path .lipath' ).text();
	bash( [ 'savedpledit', plname, 'add', indextarget, V.pladd.file, 'CMD NAME TYPE TO FILE' ], () => {
		renderSavedPlTrack( plname );
		if ( indextarget === 'last' ) {
			setTimeout( () => $( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } ), 300 );
		}
		V.pladd = {}
	} );
}
function playlistInsertSelect( $this ) {
	var track = '<gr>'+ ( $this.index() + 1 ) +' - </gr>'+ $this.find( '.name' ).text();
	var content = `\
${ V.pladd.title }
<br><gr>${ V.pladd.album }</gr>
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
		, buttonlabel : ico( 'undo' ) +'Select'
		, button      : playlistInsertTarget
		, cancel      : () => V.pladd = {}
		, ok          : () => playlistInsert( +infoVal() + $this.index() )
	} );
	bannerHide();
}
function playlistInsertTarget() {
	info( {
		  icon       : 'file-playlist'
		, title      : 'Add to a playlist'
		, message    : '<wh>'+ V.pladd.title +'</wh>'
					  +'<br>'+ V.pladd.album
					  +'<hr>'
					  +'Select where to add:'
		, radio      : { First : 1, Select: 'select', Last: 'last' }
		, values     : 'last'
		, beforeshow : () => {
			$( '#infoContent input' ).eq( 1 ).on( 'click', function() {
				local();
				$( '#infoX' ).trigger( 'click' );
			} );
		}
		, cancel     : () => {
			if ( ! V.local ) V.pladd = {}
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
		var name   = $this.find( '.name' ).text();
		var artist = $this.find( '.artist' ).text();
		var album  = $this.find( '.album' ).text();
		var txt    = name + artist + album;
		var match  = txt.search( regex ) !== -1 ? true : false;
		count      = match ? ( count + 1 ) : count;
		$this.toggleClass( 'hide', ! match );
		if ( match ) {
			name   = name.replace( regex, function( match ) { return '<bll>'+ match +'</bll>' } );
			artist = artist.replace( regex, function( match ) { return '<bll>'+ match +'</bll>' } );
			album  = album.replace( regex, function( match ) { return '<bll>'+ match +'</bll>' } );
			$this.find( '.name' ).html( name );
			$this.find( '.artist' ).html( artist );
			$this.find( '.album' ).html( album );
		}
	} );
	pageScroll( 0 );
	if ( keyword ) {
		$( '#pl-search-close' ).html( ico( 'close' ) +'<span>'+ count +' <gr>of</gr> </span>' );
	} else {
		$( '#pl-search-close' ).empty();
	}
}
function playlistGet() {
	list( { playlist: 'current' }, ( data ) => renderPlaylist( data ), 'json' );
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
		bash( [ 'mpcremove', pos, poscurent, 'CMD POS CURRENT' ] );
		$( '#pl-list li .pos' ).slice( pos ).each( ( i, el ) => {
			$( el ).text( pos );
			pos++
		} );
		$li.remove();
	}
}
function refreshData() {
	if ( V.library ) {
		if ( $( '#lib-search-input' ).val() ) return
		
		if ( ! V.librarylist ) { // home
			libraryHome();
		} else {
			if ( [ 'sd', 'nas', 'usb' ].includes( V.mode ) ) {
				$( '#lib-breadcrumbs a' ).last().trigger( 'click' );
			} else if ( V.mode === 'album' && $( '#lib-list .coverart' ).length ) {
				$( '#mode-album' ).trigger( 'click' );
			} else if ( V.query.length ) {
				var query = V.query.slice( -1 )[ 0 ];
				list( query, function( html ) {
					var data = {
						  html      : html
						, modetitle : query.modetitle
						, path      : query.path
					}
					renderLibraryList( data );
				} );
			} else {
				$( '#mode-'+ V.mode ).trigger( 'click' );
			}
		}
	} else if ( V.playback ) {
		playbackStatusGet( 'withdisplay' );
	} else {
		if ( V.savedpl ) {
			$( '#button-pl-playlists' ).trigger( 'click' );
		} else if ( V.savedpltrack ) {
			renderSavedPlTrack( $( '#savedpl-path .lipath' ).text() );
		} else {
			playlistGet();
		}
	}
	if ( 'active' in E ) {
		bash( [ 'equalizerget' ], function( data ) {
			E = data;
			eqOptionPreset();
		}, 'json' );
	}
}
function renderLibrary() { // library home
	V.mode         = '';
	V.librarylist  = false;
	V.librarytrack = false;
	V.query        = [];
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
		$( el ).parent().toggleClass( 'hide', ! D[ name ] );
	} );
	if ( D.label ) {
		$( '#lib-mode-list a.label' ).show();
		$( '#lib-mode-list' ).removeClass( 'nolabel' );
	} else {
		$( '#lib-mode-list a.label' ).hide();
		$( '#lib-mode-list' ).addClass( 'nolabel' );
	}
	$( '#lib-list' ).addClass( 'hide' );
	$( '#lib-mode-list' )
		.css( 'padding-top', $bartop.is( ':visible' ) ? '' : 50 )
		.removeClass( 'hide' );
	if ( O ) orderLibrary();
	pageScroll( V.modescrolltop );
	$( '.bkedit' ).remove();
	$( '.mode-bookmark' ).children().addBack().removeAttr( 'style' );
	if ( D.count ) {
		renderLibraryCounts();
		$( '.mode gr' ).removeClass( 'hide' );
	} else {
		$( '.mode gr' ).addClass( 'hide' );
	}
}
function renderLibraryCounts() {
	var songs = C.song ? C.song.toLocaleString() + ico( 'music' ) : '';
	$( '#li-count' ).html( songs );
	$.each( C, ( k, v ) => $( '#mode-'+ k ).find( 'gr' ).html( v ? v.toLocaleString() : '' ) );
	if ( D.albumyear ) $( '#mode-album' ).find( 'gr' ).html( C.albumyear.toLocaleString() );
}
function renderLibraryList( data ) { // V.librarylist
	if ( V.librarylist && data.html === V.librarylisthtml ) {
		if ( V.color ) colorSet()
		return
	}
	
	V.librarylist = true;
	$( '#lib-title, #lib-mode-list, .menu' ).addClass( 'hide' );
	$( '#button-lib-back' )
		.toggleClass( 'back-left', D.backonleft )
		.toggleClass( 'hide', data.modetitle === 'search' );
	$( '#lib-path .lipath' ).text( data.path );
	var root      = data.modetitle.toLowerCase() === V.mode;
	var modetitle = ! root ? data.modetitle : data.modetitle
												.replace( 'MARTIST', 'M ARTIST' )
												.replace( 'BRADIO', 'B RADIO' );
	var htmlmodetitle = ico( V.mode ) +' <span id="mode-title" '+ ( root ? 'class="spaced"' : '' ) +'>'+ modetitle +'</span>';
	if ( 'count' in data && V.mode !== 'latest' ) {
		$( '#lib-path' ).css( 'max-width', 40 );
		$( '#lib-list' ).css( 'width', '100%' );
		var htmlpath = '';
	} else if ( [ 'DABRADIO', 'WEBRADIO' ].includes( data.path ) ) {
		var htmlpath = htmlmodetitle;
		$( '#lib-path .lipath' ).empty();
	} else if ( ! [ 'sd', 'nas', 'usb', 'dabradio', 'webradio' ].includes( V.mode ) ) {
		var htmlpath = htmlmodetitle;
		$( '#button-lib-search' ).addClass( 'hide' );
	} else if ( data.path ) { // dir breadcrumbs
		var dir      = data.path.split( '/' );
		var dir0     = dir[ 0 ];
		var htmlpath = ico( V.mode );
		if ( V.mode.slice( -5 ) === 'radio' ) htmlpath += '<a>'+ V.mode +' / </a>';
		htmlpath    += '<a>'+ dir0 +' <wh>/</wh> <span class="lidir">'+ dir0 +'</span></a>';
		var lidir    = dir0;
		var iL       = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir    += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +' <wh>/</wh> <span class="lidir">'+ lidir +'</span></a>';
		}
	}
	if ( V.mode === 'webradio' ) {
		htmlpath += ico( 'add btntitle button-webradio-new' );
	} else if ( V.mode === 'latest' ) {
		htmlpath += ico( 'flash btntitle button-latest-clear' );
	} else if ( V.mode === 'dabradio' ) {
		htmlpath += root ? ico( 'refresh btntitle button-dab-refresh' ) : '';
	}
	$( '#lib-breadcrumbs' )
						.html( htmlpath )
						.removeClass( 'hide' );
	V.librarylisthtml = data.html;
	$( '#lib-list, #lib-index, #lib-index1' ).remove();
	if ( ! data.html ) return // empty radio
	
	var hash = versionHash();
	var html = data.html.replace( /\^\^\^/g, hash );
	$( '#lib-mode-list' ).after( html ).promise().done( () => {
		V.librarytrack = ! $( '#lib-list li:not( .licover )' ).find( '.i-folder, .iconthumb' ).length;
		if ( $( '.licover' ).length ) { // V.librarytrack
			if ( $( '#liimg' ).attr( 'src' ).slice( 0, 16 ) === '/data/shm/online' ) $( '.licoverimg ' ).append( V.icoversave );
		} else {
			imageLoad( 'lib-list' );
		}
		$( '.liinfopath' ).toggleClass( 'hide', [ 'sd', 'nas', 'usb', 'webradio' ].includes( V.mode ) );
		if ( [ 'album', 'latest' ].includes( V.mode ) && $( '#lib-list .coverart' ).length ) {
			if ( V.wW / 200 > $( '#lib-list .coverart' ).length ) $( '#lib-list' ).addClass( 'max200px' );
			$( '#lib-list' ).addClass( 'album' );
		}
		if ( V.mode === 'album' ) { // V.albumlist
			V.albumlist = true;
			if ( ! $( '.licover' ).length ) $( '#lib-list img' ).eq( 0 ).on( 'load', function() {
				$( '#lib-breadcrumbs' ).append( '<span class="button-coverart"><img src="'+ $( this ).attr( 'src' ) +'"></span>' );
			} );
			if ( V.iactive ) $( '#lib-list .coverart' ).eq( V.iactive ).addClass( 'active' );
		} else {
			V.albumlist = false;
			V.color ? colorSet() : setTrackCoverart();
		}
		renderLibraryPadding();
		$( '#lib-list' ).removeClass( 'hide' );
		pageScroll( V.scrolltop[ data.path ] || 0 );
	} );
}
function renderLibraryPadding() {
	var padding = D.bars ? 129 : 89;
	if ( V.librarytrack && D.fixedcover && V.wH > 734 ) {
		padding += 230;
	} else if ( V.mode === 'album' ) {
		$( '#lib-list' ).css( 'padding-bottom', '100vh' ); // force scrollbar to get .coverart height
		padding += $( '.coverart' ).eq( 0 ).height() - 49;
	}
	$( '#lib-list' ).css( {
		  'padding-bottom' : 'calc( 100vh - '+ padding +'px )'
		, 'width'          :  V.librarytrack ? '100%' : ''
	} )
}
function renderPlayback() {
	if ( ! S.state ) return // suppress on reboot
	
	local();
	if ( S.state === 'stop' ) setProgress( 0 );
	setVolume( S.volume );
	clearInterval( V.interval.blinkdot );
	$( '#qrwebui, #qrip' ).remove();
	if ( S.player === 'mpd' && S.state === 'stop' && ! S.pllength ) { // empty queue
		setPlaybackBlank();
		return
	}
	
	$( '.emptyadd, .qr' ).addClass( 'hide' );
	$( '#coverart' ).css( 'opacity', '' );
	$( '#divcover .cover-change' ).remove();
	$( '#coverTR' ).removeClass( 'empty' );
	setInfo();
	setCoverart();
	setButtonOptions();
	var istate = ico( S.state );
	if ( S.elapsed === false || S.webradio ) {
		setBlinkDot();
		return
	}
	
	var time    = 'Time' in S ? S.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	$timeRS.option( 'max', time || 100 );
	if ( S.state === 'stop' ) {
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
	if ( S.elapsed === false || S.Time === false || ! ( 'elapsed' in S ) || S.elapsed > time ) {
		$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
		blinkDot();
		return
	}

	if ( S.elapsed ) {
		var elapsedhms = second2HMS( S.elapsed );
		$( '#progress' ).html( istate +'<span>'+ elapsedhms +'</span> / '+ timehms );
	} else {
		$( '#progress' ).html( istate +'<span></span>'+ timehms );
		setTimeout( () => $( '#progress span' ).after( ' / ' ), 1000 );
	}
	setProgress();
	if ( S.state === 'pause' ) {
		$( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
		$( '#total' ).addClass( 'wh' );
	} else { //play
		setProgressElapsed();
	}
}
function renderPlaybackAll() {
	displayBars();
	displayPlayback();
	renderPlayback();
	setButtonUpdating();
}
function renderPlaylist( data ) { // V.plhome - current playlist
	V.plhome       = true;
	V.savedpl      = false;
	V.savedpltrack = false;
	S.elapsed      = data.elapsed;
	S.song         = data.song;
	$( '#pl-search-close' ).trigger( 'click' );
	$( '#button-pl-playlists' ).toggleClass( 'disabled', C.playlists === 0 );
	if ( data == -1 ) {
		V.playlisthtml = '';
		$( '#playback-controls, #pl-index, #pl-index1' ).addClass( 'hide' );
		$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disabled' );
		$( '#pl-search-close' ).trigger( 'click' );
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		pageScroll( 0 );
		switchPage( 'playlist' );
		return
	}
	
	$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '#button-pl-save, #button-pl-clear, #button-pl-search' ).removeClass( 'disabled' );
	$( '#button-pl-shuffle' ).toggleClass( 'disabled', S.pllength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', S.consume );
	$( '#button-pl-librandom' )
		.toggleClass( 'bl', S.librandom )
		.toggleClass( 'disabled', C.song === 0 );
	if ( data.html !== V.playlisthtml ) {
		V.playlisthtml = data.html;
		var hash = versionHash();
		var html = data.html.replace( /\^\^\^/g, hash );
		$( '#pl-list' ).html( html ).promise().done( () => {
			renderPlaylistSet();
			setPlaylistScroll();
			imageLoad( 'pl-list' );
		} );
	} else {
		renderPlaylistSet();
		setPlaylistScroll();
	}
}
function renderPlaylistPadding() {
	var padding = D.bars ? 129 : 89;
	$( '#pl-savedlist, #pl-list' ).css( 'padding-bottom', 'calc( 100vh - '+ padding +'px )' );
}
function renderPlaylistSet() {
	$( '.emptyadd, #menu-plaction' ).addClass( 'hide' );
	if ( V.plhome ) {
		$( '#pl-index, #pl-index1' ).addClass( 'hide' );
		$( '#pl-savedlist, #savedpl-path, #button-pl-back' ).addClass( 'hide' );
		$( '#pl-list, #pl-path, #pl-manage' ).removeClass( 'hide' );
	} else {
		$( '#pl-index, #pl-index1' ).toggleClass( 'hide', V.savedpltrack );
		$( '#pl-savedlist' ).css( 'width', V.savedpl ? '' : '100%' );
		$( '#pl-list, #pl-path, #pl-manage' ).addClass( 'hide' );
		$( '#button-pl-back' ).toggleClass( 'back-left', D.backonleft );
		$( '#pl-savedlist, #savedpl-path, #button-pl-back' ).removeClass( 'hide' );
	}
	renderPlaylistPadding();
}
function renderSavedPl( data ) { // V.savedpl - list of saved playlists
	V.plhome       = false;
	V.savedpl      = true;
	V.savedpltrack = false;
	$( '#savedpl-path' ).html( data.counthtml );
	var barvisible = $bartop.is( ':visible' );
	var hash = versionHash();
	var html = data.html.replace( /\^\^\^/g, hash );
	$( '#pl-savedlist' ).html( html ).promise().done( () => {
		$( '#pl-index' ).html( data.index[ 0 ] );
		$( '#pl-index1' ).html( data.index[ 1 ] );
		renderPlaylistSet();
		pageScroll( 0 );
	} );
}
function renderSavedPlTrack( name ) { // V.savedpltrack - tracks in a playlist
	V.plhome       = false;
	V.savedpl      = false;
	V.savedpltrack = true;
	menuHide();
	list( { playlist: 'get', name: name }, function( data ) {
		$( '#savedpl-path' ).html( data.counthtml );
		var hash = versionHash();
		var html = data.html.replace( /\^\^\^/g, hash );
		$( '#pl-savedlist' ).html( html ).promise().done( () => {
			imageLoad( 'pl-savedlist' );
			renderPlaylistSet();
			pageScroll( 0 );
		} );
	}, 'json' );
}
function saveToPlaylist( title, album, file ) {
	V.pladd.title = title;
	V.pladd.album = album;
	V.pladd.file  = file;
	local();
	$( '#button-pl-playlists' ).trigger( 'click' );
	if ( ! V.playlist ) setTimeout( () => $( '#button-playlist' ).trigger( 'click' ), 100 );
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
	clearIntervalAll();
	$( '#vuneedle' ).css( 'transform', '' );
	$( '#elapsed, #total, #progress' ).empty();
	if ( S.state === 'play' ) {
		$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
		blinkDot();
		if ( D.radioelapsed ) {
			$( '#progress' ).html( ico( S.state ) +'<span></span>' );
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
	
	V.bklabel = $( this ).find( '.label' );
	$( '.mode-bookmark' ).each( ( i, el ) => {
		var $this      = $( el );
		var path       = $this.find( '.lipath' ).text();
		var buttonhtml = ico( 'remove bkedit bk-remove' );
		if ( ! $this.find( 'img' ).length ) buttonhtml += ico( 'edit bkedit bk-rename' );
		if ( ! [ 'http', 'rtsp' ].includes( path.slice( 0, 4 ) ) ) buttonhtml += '<div class="bkedit bk-cover">'+ ico( 'coverart' ) +'</div>';
		$this.append( buttonhtml );
	} );
	$( '.mode-bookmark' )
		.css( 'background', 'hsl(0,0%,15%)' )
		.find( '.i-bookmark, .label, img' )
		.css( 'opacity', 0.33 );
}
function setButtonOptions() {
	$( '#relays' ).toggleClass( 'on', S.relayson );
	$( '#snapclient' ).toggleClass( 'on', S.player === 'snapcast' );
	$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
	var timevisible = $time.is( ':visible' );
	var prefix = timevisible ? 'ti' : 'mi';
	$( '#'+ prefix +'-btsender' ).toggleClass( 'hide', ! S.btreceiver );
	$( '#'+ prefix +'-relays' ).toggleClass( 'hide', ! S.relayson );
	$( '#'+ prefix +'-stoptimer' ).toggleClass( 'hide', ! S.stoptimer );
	if ( S.player === 'mpd' ) {
		if ( $( '#button-time' ).is( ':visible' ) ) {
			$( '#random' ).toggleClass( 'active', S.random );
			$( '#repeat' ).toggleClass( 'active', S.repeat );
			$( '#single' ).toggleClass( 'active', S.single );
		} else {
			$( '#'+ prefix +'-random' ).toggleClass( 'hide', ! S.random );
			$( '#'+ prefix +'-repeat' ).toggleClass( 'hide', ! S.repeat || S.single );
			$( '#'+ prefix +'-repeat1' ).toggleClass( 'hide', ! ( S.repeat && S.single ) );
			$( '#'+ prefix +'-single' ).toggleClass( 'hide', ! S.single || ( S.repeat && S.single ) );
		}
		[ 'consume', 'librandom' ].forEach( option => {
			if ( timevisible ) {
				$( '#mi-'+ option ).addClass( 'hide' );
				$( '#ti-'+ option ).toggleClass( 'hide', ! S[ option ] );
			} else {
				$( '#ti-'+ option ).addClass( 'hide' );
				$( '#mi-'+ option ).toggleClass( 'hide', ! S[ option ] );
			}
			$( '#button-pl-'+ option ).toggleClass( 'bl', S[ option ] );
		} );
	}
	setButtonUpdateAddons();
	setButtonUpdating();
	if ( $volume.is( ':hidden' ) ) $( '#'+ prefix +'-mute' ).toggleClass( 'hide', S.volumemute === 0 );
}
function setButtonUpdateAddons() {
	if ( S.updateaddons ) {
		$( '#button-settings, #addons i' ).addClass( 'bl' );
		if ( ! D.bars ) {
			var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
			$( '#'+ prefix +'-addons' ).addClass( 'hide' );
			$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
		}
	} else {
		$( '#button-settings, #addons i' ).removeClass( 'bl' );
		$( '#mi-addons, #ti-addons' ).addClass( 'hide' );
	}
}
function setButtonUpdating() {
	clearInterval( V.interval.blinkupdate );
	if ( S.updating_db ) {
		if ( $( '#bar-bottom' ).is( ':hidden' ) || $( '#bar-bottom' ).hasClass( 'transparent' ) ) {
			var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
			$( '#'+ prefix +'-libupdate' ).removeClass( 'hide' );
		} else {
			$( '#library, #button-library' ).addClass( 'blink' );
		}
		if ( localhost ) blinkUpdate();
		$( '#update' ).addClass( 'on' );
	} else {
		$( '#library, #button-library' ).removeClass( 'blink' );
		$( '#mi-libupdate, #ti-libupdate' ).addClass( 'hide' );
		$( '#update' ).removeClass( 'on' );
	}
	$( '#mi-dabupdate' ).toggleClass( 'hide', ! S.updatingdab );
}
function setCoverart() {
	if ( ! D.cover ) {
		loaderHide();
		return
	}
	
	if ( D.vumeter ) {
		$( '#coverart' )
			.addClass( 'hide' )
			.attr( 'src', '' );
		$( '#vu' ).removeClass( 'hide' );
		loaderHide();
	} else {
		var coverart = S.stream ? ( S.coverart || S.stationcover ) : S.coverart;
		if ( coverart ) {
			$( '#vu' ).addClass( 'hide' );
			$( '#coverart' )
				.attr( 'src', coverart + versionHash() )
				.removeClass( 'hide' );
		} else {
			coverartDefault();
		}
	}
}
function setInfo() {
	var prev = {
		  Artist : $( '#artist' ).text()
		, Title  : $( '#title' ).text()
		, Album  : $( '#album' ).text()
	}
	if ( ! S.stream || S.player === 'upnp' ) {
		$( '#artist' ).text( S.Artist );
		$( '#title' )
			.text( S.Title )
			.toggleClass( 'gr', S.state === 'pause' );
		$( '#album' ).text( S.Album || S.file );
	} else { // webradio
		var url = S.file.replace( /#charset=.*/, '' );
		if ( S.state !== 'play' ) {
			$( '#artist' ).text( S.station );
			$( '#title' ).html( '·&ensp;·&ensp;·' );
			$( '#album' ).text( url );
		} else {
			$( '#artist' ).text( S.Artist || ( ! S.Artist && ! S.Title ? S.station : '' ) );
			$( '#title' ).html( S.Title || V.blinkdot );
			blinkDot();
			$( '#album' ).text( S.Album || url );
		}
	}
	$( '#artist' ).toggleClass( 'disabled', S.Artist === '' );
	$( '#title' ).toggleClass( 'disabled', S.Title === '' );
	$( '#album' ).toggleClass( 'disabled', S.Album === '' );
	var changed = [ 'Artist', 'Title', 'Album' ].some( k => {
		return prev[ k ] !== S[ k ]
	} );
	if ( changed ) setInfoScroll();
	var sampling = S.sampling;
	if ( S.stream ) {
		if ( S.icon === 'dabradio' ) {
			sampling += ' • DAB';
		} else if ( S.Album && S.station ) {
			var station = [ 'radiofrance', 'radioparadise' ].includes( S.icon ) ? S.station.split( ' - ' ).pop() : S.station;
			sampling += ' • '+ station;
		} else {
			sampling += ' • '+ S.ext;
		}
	}
	$( '#sampling' ).html( sampling );
	if ( S.icon ) {
		if ( 'i-'+ S.icon !== $( '#playericon' ).prop( 'class' ) ) {
			$( '#playericon' )
				.removeAttr( 'class' )
				.addClass( S.icon ? 'i-'+ S.icon : 'hide' );
		}
	} else {
		$( '#playericon' )
				.removeAttr( 'class' )
				.addClass( 'hide' );
	}
	if ( $time.is( ':hidden' ) ) setProgressElapsed();
}
function setInfoScroll() {
	var tWmax = 0;
	var $el   = $( '#artist, #title, #album' );
	$el
		.removeClass( 'scrollleft scrollellipse' )
		.removeAttr( 'style' );
	$el.each( ( i, el ) => {
		var tW = Math.ceil( el.getBoundingClientRect().width );
		if ( tW > V.wW - 20 ) {
			if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
			$( el ).addClass( 'scrollleft' );
		}
	} );
	if ( ! tWmax ) return
	
	$( '.scrollleft' ).css( { // same width and speed
		  width     : tWmax
		, animation : ( V.wW + tWmax ) / V.scrollspeed +'s infinite linear scrollleft'
	} );
	if ( localhost ) {
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
	$( '#page-playback .emptyadd' ).toggleClass( 'hide', S.player !== 'mpd' );
	$( '#playback-controls, #infoicon i, #vu' ).addClass( 'hide' );
	$( '#divartist, #divtitle, #divalbum' ).removeClass( 'scroll-left' );
	$( '#artist, #title, #album, #progress, #elapsed, #total' ).empty();
	setProgress( 0 );
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' )
		.attr( 'src', V.coverdefault )
		.css( 'opacity', '' );
	if ( S.ip ) {
		V.qr ? setPlaybackBlankQR() : $.getScript( '/assets/js/plugin/'+ jfiles.qrcode, setPlaybackBlankQR );
		$( '#coverTR' ).toggleClass( 'empty', $bartop.is( ':hidden' ) );
		$( '#coverart' ).addClass( 'hide' );
		$( '#sampling' ).empty();
	} else {
		$( '#coverart' ).removeClass( 'hide' );
		$( '#sampling' )
			.css( 'display', 'block' )
			.html( 'Network not connected:&emsp; '+ ico( 'networks i-lg wh' ) +'&ensp;Setup' )
			.on( 'click', '.i-networks', function() {
				location.href = 'settings.php?p=networks';
			} );
		$( '.qr' ).addClass( 'hide' );
	}
	vu();
}
function setPlaybackBlankQR() {
	V.qr = new QRCode( {
		  msg : 'http://'+ S.ip
		, dim : 230
		, pad : 11
	} );
	$( '#map-cover' ).before( `
<div id="qrwebui">${ V.qr.outerHTML }</div>
<div id="qrip"><gr>http://</gr>${ S.ip }<br><gr>http://</gr>${ S.hostname }
</div>` );
}
function setPlaylistInfoWidth() {
	// li-icon + margin + duration + margin
	var $liactive = $( '#pl-list li.active' );
	var $duration = $liactive.find( '.duration' );
	var $title    = $liactive.find( '.name' );
	var titleW    = $title.scrollWidth;
	var iWdW      = 40 + 10 + $duration.width() + 9;
	var cW        = document.body.clientWidth;
	$title.css(  'max-width', iWdW + titleW < cW ? '' : cW - iWdW );
}
function setPlaylistScroll() {
	clearIntervalAll();
	switchPage( 'playlist' );
	if ( V.sortable
		|| [ 'airplay', 'spotify' ].includes( S.player )
		|| ( D.audiocd && $( '#pl-list li' ).length < S.song + 1 ) // on eject cd S.song not yet refreshed
	) {
		$( '#page-playlist' ).css( 'visibility', '' );
		return
	}
	
	var litop = $bartop.is( ':visible' ) ? 80 : 40;
	$( '#menu-plaction' ).addClass( 'hide' );
	$( '#pl-list li' ).removeClass( 'active updn' );
	$liactive = $( '#pl-list li' ).eq( S.song || 0 );
	$liactive.addClass( 'active' );
	if ( ! $( '.pl-remove' ).length && ! I.active ) {
		if ( $( '#pl-list li' ).length < 5 ) {
			var top = 0;
		} else {
			var top = $liactive.offset().top - litop - ( 49 * 3 );
		}
		pageScroll( top );
	}
	$( '#page-playlist' ).css( 'visibility', '' );
	$( '#pl-list .elapsed' ).empty();
	var $this        = $( '#pl-list li' ).eq( S.song );
	var $elapsed     = $this.find( '.elapsed' );
	var $name        = $this.find( '.name' );
	var $stationname = $this.find( '.li2 .stationname' );
	$stationname.addClass( 'hide' );
	if ( S.state === 'stop' ) {
		if ( S.webradio ) $name.text( $this.find( '.liname' ).text() );
		$stationname.addClass( 'hide' );
	} else {
		if ( S.elapsed === false ) return
		
		var slash = S.Time ? ' <gr>/</gr>' : '';
		if ( S.player === 'upnp' ) $this.find( '.time' ).text( second2HMS( S.Time ) );
		if ( S.state === 'pause' ) {
			elapsedtxt = second2HMS( S.elapsed );
			$elapsed.html( ico( 'pause' ) + elapsedtxt + slash );
			setPlaylistInfoWidth();
		} else if ( S.state === 'play' ) {
			$stationname.removeClass( 'hide' );
			if ( S.webradio ) {
				$stationname.removeClass( 'hide' );
				$name.html( S.Title || '·&ensp;·&ensp;·' );
			}
			var elapsedL0 = 0;
			var elapsedL  = 0;
			if ( S.elapsed ) $elapsed.html( ico( 'play' ) + second2HMS( S.elapsed ) + slash );
			V.interval.elapsedpl = setInterval( () => {
				S.elapsed++;
				if ( S.elapsed === S.Time ) {
					clearIntervalAll();
					S.elapsed = 0;
					$elapsed.empty();
					setPlaylistScroll();
				} else {
					elapsedtxt = second2HMS( S.elapsed );
					$elapsed.html( ico( 'play' ) + elapsedtxt + slash );
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
	if ( S.state !== 'play' || S.elapsed === 0 ) clearInterval( V.interval.elapsed );
	if ( position !== 0 ) position = S.elapsed;
	$timeprogress.css( 'transition-duration', '0s' );
	$timeRS.setValue( position );
	var w = position && S.Time ? position / S.Time * 100 : 0;
	$( '#time-bar' ).css( 'width', w +'%' );
}
function setProgressAnimate() {
	if ( ! D.time && ! D.cover ) return
	
	$timeprogress.css( 'transition-duration', S.Time - S.elapsed +'s' );
	$timeRS.setValue( S.Time );
	$( '#time-bar' ).css( 'width', '100%' );
}
function setProgressElapsed() {
	clearInterval( V.interval.elapsed );
	if ( S.elapsed === false || S.state !== 'play' || 'autoplaycd' in V ) return // wait for cd cache on start
	
	var elapsedhms;
	var $elapsed = S.elapsed === false ? $( '#total, #progress span' ) : $( '#elapsed, #progress span' );
	if ( S.elapsed ) $elapsed.text( second2HMS( S.elapsed ) );
	if ( S.Time ) {
		var time = S.Time;
		$timeRS.option( 'max', time );
		setProgress();
		if ( ! localhost ) {
			setTimeout( setProgressAnimate, 0 ); // delay to after setvalue on load
		} else {
			$timeprogress.css( 'transition-duration', '0s' );
		}
		V.interval.elapsed = setInterval( () => {
			S.elapsed++;
			if ( S.elapsed < time ) {
				if ( localhost ) {
					$timeRS.setValue( S.elapsed );
					$( '#time-bar' ).css( 'width', S.elapsed / time * 100 +'%' );
				}
				elapsedhms = second2HMS( S.elapsed );
				$elapsed.text( elapsedhms );
				if ( S.state !== 'play' ) clearInterval( V.interval.elapsed );
			} else {
				S.elapsed = 0;
				clearIntervalAll();
				$elapsed.empty();
				setProgress( 0 );
			}
		}, 1000 );
	} else if ( D.radioelapsed ) {
		$( '#elapsed' ).html( V.blinkdot );
		$elapsed = $( '#total, #progress span' );
		$elapsed.text( second2HMS( S.elapsed ) );
		V.interval.elapsed = setInterval( () => {
			S.elapsed++;
			elapsedhms = second2HMS( S.elapsed );
			$elapsed.text( elapsedhms );
			if ( S.state !== 'play' ) clearInterval( V.interval.elapsed );
		}, 1000 );
	}
}
function setTrackCoverart() {
	if ( D.hidecover || ! $( '#liimg' ).length ) return
	
	$( '#liimg' ).off( 'error' ).on( 'error', function() {
		$( this ).attr( 'src', V.coverdefault );
	} );
	if ( V.mode === 'album' ) {
		$( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
		$( '.liinfo .lialbum' ).addClass( 'hide' );
	} else {
		$( '.liinfo .lialbum' ).removeClass( 'hide' );
	}
	if ( ! D.fixedcover ) {
		$( '.licover' ).addClass( 'nofixed' );
		$( '#lib-list li' ).eq( 1 ).removeClass( 'track1' );
	}
}
function setVolume( val ) {
	var mute = S.volumemute !== 0;
	$volumeRS.setValue( val );
	mute ? volumeColorMute( S.volumemute ) : volumeColorUnmute();
	$( '#voldn' ).toggleClass( 'disabled', val === 0 );
	$( '#volmute' ).toggleClass( 'disabled', val === 0 && ! mute );
	$( '#volup' ).toggleClass( 'disabled', val === 100 );
	$( '#volume-bar' ).css( 'width', val +'%' );
	$( '#volume-text' )
		.text( S.volumemute || val )
		.toggleClass( 'bl', mute );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
		$( '#'+ prefix +'-mute' ).toggleClass( 'hide', ! mute );
	}
}
function sortPlaylist( pl, iold, inew ) {
	V.sortable = true;
	setTimeout( () => V.sortable = false, 500 );
	if ( pl === 'pl-list' ) {
		bash( [ 'mpcmove', iold + 1, inew + 1, 'CMD FROM TO' ] );
	} else {
		bash( [ 'savedpledit', $( '#savedpl-path .lipath' ).text(), 'move', iold + 1, inew + 1, 'CMD NAME TYPE FROM TO' ] );
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
		, ok      : () => $( '#stop' ).trigger( 'click' )
	} );
}
function switchPage( page ) {
	clearIntervalAll();
	// get scroll position before changed
	if ( V.library ) {
		if ( V.librarylist ) {
			V.liscrolltop = $( window ).scrollTop();
		} else {
			V.modescrolltop = $( window ).scrollTop();
		}
		if ( V.colorpicker ) $( '#colorcancel' ).trigger( 'click' );
	} else if ( V.playlist ) {
		if ( ! V.plhome ) V.plscrolltop = $( window ).scrollTop();
	}
	V.library = V.playback = V.playlist = false;
	V[ page ] = true;
	V.page    = page;
	displayBottom();
	// restore page scroll
	if ( V.playback ) {
		pageScroll( 0 );
		vu();
	} else if ( V.library ) {
		V.librarylist ? pageScroll( V.liscrolltop ) : renderLibrary();
	} else {
		if ( ! V.plhome ) pageScroll( V.plscrolltop );
	}
	$( '.page, .menu' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
}
function thumbUpdate( path ) {
	var htmlform = '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">'
				  +'<input type="hidden" name="alias" value="albumthumbnail">'
				  +'<input type="hidden" name="path" value="'+ ( path || '' ) +'">';
	$( 'body' ).append(
		 '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">'
		+'<input type="hidden" name="alias" value="albumthumbnail">'
		+'<input type="hidden" name="path" value="'+ ( path || '' ) +'">'
		+'</form>'
	);
	$( '#formtemp' ).submit();
}
function urlReachable( url, sec ) {
	if ( ! sec ) var sec = 0;
	
	fetch( url, { mode: 'no-cors' } ).then( function() {
		location.href = url;
	} ).catch( function() {
		sec++
		setTimeout( () => urlReachable( url, sec ), 1000 );
	} );
}
function versionHash() {
	return '?v='+ Math.round( Date.now() / 1000 )
}
function volumeBarHide() {
	$( '#info' ).removeClass( 'hide' ); // 320 x 480
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.volumeband' ).addClass( 'transparent' );
}
function volumeBarSet( pageX ) {
	clearTimeout( V.volumebar );
	if ( pageX === 'toggle' ) {
		var vol = S.volumemute || 0;
		var cmd = [ 'volume' ];
	} else {
		var posX    = pageX - $( '#volume-band' ).offset().left;
		var bandW   = $( '#volume-band' ).width();
		posX        = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
		var current = V.drag ? 'drag' : S.volume;
		var vol     = Math.round( posX / bandW * 100 );
		var cmd     = [ 'volume', current, vol, S.control, S.card, 'CMD CURRENT TARGET CONTROL CARD' ];
	}
	if ( V.drag ) {
		bash( cmd );
	} else {
		$( '#volume-bar' ).animate(
			  { width: vol +'%' }
			, {
				  duration : Math.abs( vol - S.volume ) * 40
				, easing   : 'linear'
				, complete : () => V.volumebar = setTimeout( volumeBarHide, 3000 )
			}
		);
		$( '.volumeband' ).addClass( 'disabled' );
		bash( cmd, () => $( '.volumeband' ).removeClass( 'disabled' ) );
	}
	$( '#volume-bar' ).css( 'width', vol +'%' );
	$( '#volume-text' ).text( S.volumemute || vol );
	$( '#mi-mute, #ti-mute' ).addClass( 'hide' );
	S.volume = vol;
	$volumeRS.setValue( S.volume );
}
function volumeBarShow() {
	if ( ! $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	V.volumebar = setTimeout( volumeBarHide, 3000 );
	$( '#volume-text' )
		.text( S.volumemute === 0 ? S.volume : S.volumemute )
		.toggleClass( 'bl', S.volumemute !== 0 );
	$( '#volume-bar' ).css( 'width', S.volume +'%' );
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	$( '#volume-band-dn, #volume-band-up' ).removeClass( 'transparent' );
}
function volumeColorMute() {
	$volumetooltip
		.text( S.volumemute )
		.addClass( 'bl' );
	$volumehandle
		.addClass( 'bgr60' )
		.rsRotate( 0 ? -this._handle1.angle : -310 );
	$( '#volmute' )
		.removeClass( 'i-volume' )
		.addClass( 'i-mute active' );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
		$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
	}
}
function volumeColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'i-mute active' )
		.addClass( 'i-volume' );
	$( '#mi-mute, #ti-mute' ).addClass( 'hide' );
}
function volumeUpDown( up ) {
	up ? S.volume++ : S.volume--;
	if ( S.volume < 0 || S.volume > 100 ) return
	
	if ( D.volume ) {
		$volumeRS.setValue( S.volume );
	} else {
		$( '#volume-text' ).text( S.volume );
		$( '#volume-bar' ).css( 'width', S.volume +'%' );
	}
	var cmd = 'volumeupdn';
	if ( S.btreceiver ) {
		cmd += 'bt';
	} else if ( ! S.control ) {
		cmd += 'mpc';
	}
	bash( [ cmd, up ? '+' : '-', S.control, S.card, 'CMD UPDN CONTROL CARD' ] );
}
function vu() {
	if ( S.state !== 'play' || D.vumeter || $( '#vu' ).hasClass( 'hide' ) ) {
		clearInterval( V.interval.vu );
		$( '#vuneedle' ).css( 'transform', '' );
		return
	}
	
	setTimeout( () => {
		var range = 8; // -/+
		var deg   = 0;
		var inc;
		clearInterval( V.interval.vu );
		$( '#vuneedle' ).css( 'transform', 'rotate( '+ Math.random() * range +'deg )' );
		V.interval.vu = setInterval( () => {
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
