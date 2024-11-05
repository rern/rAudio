function barVisible( a, b ) {
	var visible = ! $bartop.hasClass( 'hide' );
	if ( ! a ) return visible
	
	return visible ? a : b
}
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
	$.post( url, ( data ) => {
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
			var similarhtml  = '<p>'+ ico( 'artist' ) +'&ensp;Similar Artists:<p><span>';
			similar.forEach( a => similarhtml += '<a class="biosimilar">'+ a.name +'</a>,&ensp;' );
			similarhtml = similarhtml.slice( 0, -7 ) +'</span><br><br>';
		}
		var biohtml = `
<div class="container" tabindex="0">
<div id="biocontent">
	<p class="artist">${ ico( 'close close-root' ) + name }</p>
	<p class="genre">${ backhtml + ico( 'genre' ) +'&ensp;'+ genre }</p>
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
			$( '#bio .container' ).trigger( 'focus' );
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
		, list         : [ 'New IP', 'text' ]
		, focus        : 0
		, boxwidth     : 170
		, values       : location.host
		, checkchanged : true
		, checkip      : [ 0 ]
		, beforeshow   : () => $( '#infoList input' ).prop( 'type', 'tel' )
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
		if ( V.playlisthome ) {
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
	var bars = barVisible();
	if ( V.library ) {
		var $bg_cg  = bars ? $( '#bar-top, #playback-controls i, .menu a, .submenu, #playlist' ) : $( '.menu a, .submenu' );
		var $bg_cm  = bars ? $( '#playback-controls .active, #colorok, #library, #button-library' ) : $( '#colorok, #button-library' );
		var $bg_cga = bars ? $( '.content-top, #playback, #lib-index' ) : $( '.content-top, #lib-index' );
		var $t_cg   = $( '#colorcancel, #button-lib-back, #lib-breadcrumbs a:first-of-type, #lib-breadcrumbs a:last-of-type' );
		var $t_cgl  = $( '#lib-index a' );
		var $t_cg60 = $( '#lib-list li' );
	} else {
		var $bg_cg  = bars ? $( '#bar-top, #playback-controls i, .menu a, .submenu, #library' ) : $( '.menu a, .submenu' );
		var $bg_cm  = bars ? $( '#playback-controls .active, #colorok, #playlist, #button-playlist' ) : $( '#colorok, #button-playlist' );
		var $bg_cga = bars ? $( '.content-top, #playback, #pl-index' ) : $( '.content-top, #pl-index' );
		var $t_cg   = $( '#colorcancel, #button-pl-back' );
		var $t_cgl  = $( '#pl-index a' );
		var $t_cg60 = V.playlisthome ? $( '#pl-list li' ) : $( '#pl-savedlist li' );
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
	V.list.li          = $li;
	V.list.licover     = $li.hasClass( 'licover' );
	V.list.singletrack = ! V.list.licover && $li.find( '.li-icon' ).hasClass( 'i-music' );
	// file modes  - path > path ... > tracks
	// album mode  - path > tracks
	// other modes - name > name-album > filtered tracks
	V.list.path        = $li.find( '.lipath' ).text() || $( '#mode-title' ).text();
	if ( V.mode.slice( -5 ) === 'radio' ) V.list.dir = $li.find( '.lidir' ).text();
	if ( V.librarytrack && ! V.list.licover ) {
		V.list.name   = $li.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		V.list.artist = $( '.licover .liartist' ).text() || '';
	} else {
		V.list.name   = $li.find( '.name' ).text() || V.list.path;
	}
	V.list.track = $li.data( 'track' ) || '';  // cue - in contextmenu
	if ( V.searchlist ) V.mode = $li.find( 'i' ).data( 'menu' );
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
	if ( V.list.li.hasClass( 'nodata' ) ) {
		$menu.find( 'a, .submenu' ).addClass( 'hide' );
		$menu.find( '.exclude, .update' ).removeClass( 'hide' );
	} else {
		var filemode = [ 'album', 'latest', 'nas', 'sd', 'usb', 'webradio', 'dabradio' ].includes( V.mode );
		$menu.find( '.playnext, .replace, .i-play-replace' ).toggleClass( 'hide', S.pllength === 0 );
		$menu.find( '.playnext' ).toggleClass( 'hide', S.state !== 'play' );
		$menu.find( '.update' ).toggleClass( 'hide', ! ( 'updating_db' in S ) );
		$menu.find( '.bookmark, .exclude, .update, .thumb' ).toggleClass( 'hide', ! filemode );
		$menu.find( '.directory' ).toggleClass( 'hide', filemode || ! V.librarytrack );
		$menu.find( '.tag' ).toggleClass( 'hide', ! V.librarytrack || ! filemode );
		$menu.find( '.wredit' ).toggleClass( 'hide', V.mode !== 'webradio' );
		$menu.find( '.wrdirrename' ).toggleClass( 'hide', V.mode.slice( -5 ) !== 'radio' );
		$menu.find( '.update, .tag' ).toggleClass( 'disabled', S.updating_db );
	}
	$li.siblings( 'li' ).removeClass( 'active' );
	$li.addClass( 'active' );
	if ( V.list.licover ) {
		var menutop = barVisible( 310, 270 );
	} else {
		var menutop = $li.offset().top + 48;
	}
	contextmenuScroll( $menu, menutop );
	if ( ! [ 'sd', 'nas', 'usb' ].includes( V.mode ) || $li.hasClass( 'nodata' ) ) return
	
	bash( [ 'mpcls', V.list.path, 'CMD DIR' ], function( data ) {
		if ( ! data ) {
			$li.addClass( 'nodata' );
			contextmenuLibrary( $li, $target );
		}
	}, 'json' );
}
function contextmenuScroll( $menu, menutop ) {
	var fixedmenu = V.library && ( V.list.licover && V.wH > 767 ) && D.fixedcover ? true : false;
	$menu
		.css( 'top',  menutop )
		.toggleClass( 'fixed', fixedmenu )
		.removeClass( 'hide' );
	var targetB   = $menu.offset().top + $menu.height();
	var topH      = barVisible( 80, 40 );
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
	} else {
		var imagefilenoext = '/mnt/MPD/'+ path +'/cover';
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
	var icon  = 'coverart';
	var title = 'Change Album Cover Art';
	info( {
		  icon        : icon
		, title       : title
		, message     : '<img class="imgold" src="'+ src +'">'
					   +'<p class="infoimgname">'+ ico( 'album wh' ) +' '+ album
					   +'<br>'+ ico( 'artist wh' ) +' '+ artist +'</p>'
		, footer      : embedded
		, file        : { oklabel: ico( 'flash' ) +'Replace', type: 'image/*' }
		, buttonlabel : ! coverartlocal ? '' : ico( 'remove' ) +'Remove'
		, buttoncolor : ! coverartlocal ? '' : red
		, button      : ! coverartlocal ? '' : () => {
			var ext = src.replace( /\?v.*/, '' ).slice( -3 );
			bash( [ 'coverartreset', imagefilenoext +'.'+ ext, path, artist, album, 'CMD COVERFILE MPDPATH ARTIST ALBUM' ] );
		}
		, ok          : () => {
			imageReplace( 'coverart', imagefilenoext );
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
function dirName( path ) {
	return path.substring( 0, path.lastIndexOf( '/' ) )
}	
function displayBars() {
	if ( ! $( '#bio' ).hasClass( 'hide' ) ) return
	
	var smallscreen = V.wH < 590 || V.wW < 500;
	var lcd         = ( V.wH <= 320 && V.wW <= 480 ) || ( V.wH <= 480 && V.wW <= 320 );
	if ( ! D.bars || ( smallscreen && ! D.barsalways ) || lcd ) {
		$( '#bar-top' ).addClass( 'hide' );
		$( '#bar-bottom' ).addClass( navigator.maxTouchPoints ? 'hide' : 'transparent' );
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
	if ( ! S.state || ! barVisible() ) return // suppress on reboot
	
	var mpd_upnp = [ 'mpd', 'upnp' ].includes( S.player );
	var noprevnext = S.pllength < 2 || ! mpd_upnp;
	$( '#playback-controls' ).toggleClass( 'hide', S.pllength === 0 );
	$( '#previous, #next' ).toggleClass( 'hide', noprevnext );
	$( '#pause' ).toggleClass( 'hide', S.webradio );
	$( '#playback-controls i' ).removeClass( 'active' );
	$( '#'+ S.state ).addClass( 'active' ); // suppress on reboot
	$( '#coverL, #coverR' ).toggleClass( 'disabled', noprevnext );
	$( '#coverM' ).toggleClass( 'disabled', ! mpd_upnp );
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
	if ( ! hidetime ) $( '#time' ).roundSlider( S.webradio || S.player !== 'mpd' || ! S.pllength ? 'disable' : 'enable' );
	$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', ! hidetime );
	$( '#time-band' ).toggleClass( 'disabled', S.pllength === 0 || S.webradio || S.player !== 'mpd' );
	$( '#time' ).toggleClass( 'disabled', S.webradio || ! [ 'mpd', 'upnp' ].includes( S.player ) );
	$( '.volumeband' ).toggleClass( 'disabled', D.volumenone || $volume.is( ':visible' ) );
	$( '#map-time' ).toggleClass( 'hide', D.cover );
	$( '#button-time, #button-volume' ).toggleClass( 'hide', ! D.buttons );
	$( '#playback-row' ).css( 'align-items', D.buttons ? '' : 'center' );
}
function displaySave() {
	var values  = infoVal();
	[ 'library', 'libraryoption', 'playback', 'playlist' ].forEach( chk => {
		$.each( chkdisplay[ chk ], ( k, v ) => {
			if ( ! ( k in values ) && k !== '-' ) values[ k ] = D[ k ];
		} );
	} );
	if ( values.tapreplaceplay ) values.plclear = false;
	jsonSave( 'display', values );
}
function displaySubMenu() {
	$( '#dsp' )
		.toggleClass( 'i-camilladsp', D.camilladsp )
		.toggleClass( 'i-equalizer', D.equalizer );
	D.dsp = D.camilladsp || D.equalizer;
	[ 'dsp', 'logout', 'multiraudio', 'relays', 'snapclient' ].forEach( el => {
		var enabled = D[ el ];
		$( '#'+ el )
			.toggleClass( 'hide', ! enabled )
			.prev().toggleClass( 'sub', enabled );
	} ); // submenu toggled by css .settings + .submenu
	if ( localhost ) $( '#power' ).addClass( 'sub' );
}
function guideHide() {
	if ( V.guide ) {
		V.guide        = false;
		var barvisible = barVisible();;
		$( '#coverTR' ).toggleClass( 'empty', S.pllength === 0 && ! barvisible && S.player === 'mpd' );
		$( '.map' ).removeClass( 'mapshow' );
		$( '#bar-bottom' ).removeClass( 'translucent' );
		if ( ! barvisible ) $( '#bar-bottom' ).addClass( 'transparent' );
		$( '.band, #volbar' ).addClass( 'transparent' );
		$( '.guide, #volume-bar, #volume-text' ).addClass( 'hide' );
	}
}
function htmlHash( html ) {
	var hash = versionHash();
	return html.replace( /\^\^\^/g, hash )
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
				$( this ).replaceWith( '<i class="i-folder li-icon" data="album"></i>' );
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
			var src   = $this.attr( 'src' );
			var ext   = src.slice( -16, -13 );
			if ( ext === 'jpg' ) {
				$this.attr( 'src', src.replace( 'jpg?v=', 'png?v=' ) );
			} else if ( ext === 'png' ) {
				$this.attr( 'src', src.replace( 'png?v=', 'gif?v=' ) );
			} else {
				$this.replaceWith( '<i class="i-'+ $this.data( 'icon' ) +' li-icon" data-menu="filesavedpl"></i>' );
			}
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
		if ( V.libraryhome ) icon += '<a class="label">'+ bookmark +'</a>';
		$this.replaceWith( icon );
		$( '#infoList input' ).parents( 'tr' ).removeClass( 'hide' );
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
	$.post( 'cmd.php', data, ( std ) => {
		if ( std == -1 ) infoWarning( I.icon, I.title, 'Target directory not writable.' )
	} );
	banner( 'coverart', I.title, 'Change ...', -1 );
}
function infoDisplayKeyValue( type ) {
	var json   = chkdisplay[ type ];
	var keys   = Object.keys( json );
	keys       = keys.filter( k => k !== '-' );
	var values = {}
	keys.forEach( k => { values[ k ] = D[ k ] } );
	var list   = [];
	Object.values( json ).forEach( ( l, i ) => {
		if ( ! l ) {
			list.push( [ '', '' ] );
		} else if ( [ 'library', 'playback' ].includes( type ) ) {
			list.push( i % 2 ? [ l, 'checkbox' ] : [ l, 'checkbox', { sameline: true } ] );
		} else {
			list.push( [ l, 'checkbox' ] );
		}
	} );
	return { keys : keys, values: values, list: list }
}
function infoLibrary() {
	var kv = infoDisplayKeyValue( 'library' );
	info( {
		  icon         : 'library'
		, title        : 'Library'
		, tablabel     : [ 'Show', 'Options' ]
		, tab          : [ '', infoLibraryOption ]
		, messagealign : 'left'
		, list         : kv.list
		, checkcolumn  : true
		, values       : kv.values
		, checkchanged : true
		, beforeshow   : () => {
			var $el  = {};
			kv.keys.forEach( ( k, i ) => $el[ k ] = $( '#infoList input' ).eq( i ) );
			$el.sd.add( $el.usb ).prop( 'disabled', S.shareddata );
		}
		, ok           : displaySave
	} );
}
function infoLibraryOption() {
	var kv = infoDisplayKeyValue( 'libraryoption' );
	info( {
		  icon         : 'library'
		, title        : 'Library'
		, tablabel     : [ 'Show', 'Options' ]
		, tab          : [ infoLibrary, '' ]
		, messagealign : 'left'
		, list         : kv.list
		, values       : kv.values
		, checkchanged : true
		, beforeshow   : () => {
			var $el  = {}
			kv.keys.forEach( ( k, i ) => $el[ k ] = $( '#infoList input' ).eq( i ) );
			$( '#infoList tr' ).css( 'height', '36px' );
			$( '#infoList td' ).css( 'width', '293px' );
			$el.albumyear.prop( 'disabled', ! D.albumbyartist );
			$el.fixedcover.prop( 'disabled', D.hidecover );
			$el.albumbyartist.on( 'input', function() {
				var enable = $( this ).prop( 'checked' );
				if ( ! enable ) $el.albumyear.prop( 'checked', false );
				$el.albumyear.prop( 'disabled', ! enable )
			} );
			$el.tapaddplay.on( 'input', function() {
				if ( $( this ).prop( 'checked' ) ) $el.tapreplaceplay.prop( 'checked', false );
			} );
			$el.tapreplaceplay.on( 'input', function() {
				if ( $( this ).prop( 'checked' ) ) $el.tapaddplay.prop( 'checked', false );
			} );
			$el.hidecover.on( 'input', function() {
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
function infoThumbnail( icon, message, path, subdir ) {
	if ( ! path ) subdir = true;
	var list = [ '', 'radio', { kv: { 'Only added or removed': '', 'Rebuild all': 'overwrite' }, sameline: false } ];
	info( {
		  icon    : icon
		, title   : 'Update Thumbnails'
		, message : message
		, list    : subdir ? list : false
		, ok      : () => {
			$( 'body' ).append(
				 '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">'
				+'<input type="hidden" name="path" value="'+ path +'">'
				+'<input type="hidden" name="overwrite" value="'+ infoVal() +'">'
				+'</form>'
			);
			$( '#formtemp' ).submit();
		}
	} );
}
function infoTitle() {
	var artist = S.Artist;
	var title  = S.Title;
	var album  = S.Album;
	if ( album.includes( '://' ) ) album = '';
	artist  = artist.replace( /(["`])/g, '\\$1' );
	title   = title.replace( /(["`])/g, '\\$1' );
	var list = [
		  [ ico( 'artist wh' ), 'text' ]
		, [ ico( 'music wh' ),  'text' ]
		, [ ico( 'album wh' ),  'text' ]
	];
	var paren      = title.slice( -1 ) === ')';
	if ( paren ) {
		var titlenoparen = title.replace( / $|\(.*$/, '' );
		list.push( [ ico( 'music wh' ) +'<gr>Title includes: </gr>'+ title.replace( /^.*\(/, '(' ),  'checkbox' ] );
	}
	var footer = '<span class="lyrics">'+ ico( 'lyrics' ) +' Lyrics</span>'
				+'<span class="bio">'+ ico( 'bio' ) +' Bio</span>'
				+'<span class="similar">'+ ico( 'lastfm' ) +' Add Similar</span>'
				+'<span class="scrobble">'+ ico( 'lastfm' ) +' Scrobble</span>';
	info( {
		  icon        : 'playback'
		, title       : 'Current Track'
		, list        : list
		, footer      : footer
		, footeralign : 'left'
		, width       : 460
		, boxwidth    : 'max'
		, values      : paren ? [ artist, titlenoparen, album ] : [ artist, title, album ]
		, beforeshow  : () => {
			$( '#infoList input' ).eq( 2 ).toggleClass( 'hide', album === '' );
			$( '.infofooter' )
				.css( 'padding-left', '40px' )
				.find( 'span' ).css( { 'margin-right': '20px', cursor: 'pointer' } );
			$( '.infofooter .lyrics' ).toggleClass( 'hide', ! S.lyrics );
			$( '.infofooter .scrobble' ).toggleClass( 'hide', ! S.scrobble );
			if ( S.scrobble ) $( '.infofooter .scrobble' ).toggleClass( 'disabled', ! artist || ! title || ! S.webradio || S.scrobbleconf[ S.player ] );
			if ( paren ) {
				$( '#infoList input:checkbox' ).on( 'input', function() {
					$( '#infoList input' ).eq( 1 ).val( $( this ).prop( 'checked' ) ? title : titlenoparen );
				} );
			}
			$( '#infoList input' ).on( 'input', function() {
				var val = infoVal();
				$( '#infoList .scrobble' ).toggleClass( 'disabled', val[ 0 ] === '' || val[ 1 ] === '' );
			} );
			$( '#infoList' ).on( 'click', '.infofooter span', function() {
				var values = infoVal();
				var artist = values[ 0 ]
				var title  = values[ 1 ]
				var $this  = $( this );
				if ( $this.hasClass( 'lyrics' ) ) {
					V.lyricsartist = artist || S.Artist;
					V.lyricstitle  = title || S.Title;
					lyricsGet();
				} else if ( $this.hasClass( 'bio' ) ) {
					bio( artist );
				} else if ( $this.hasClass( 'similar' ) ) {
					addSimilar();
				} else if ( $this.hasClass( 'scrobble' ) ) {
					bash( [ 'scrobble.sh', ...values, 'CMD ARTIST TITLE' ] );
					banner( 'lastfm blink', 'Scrobble', 'Send ...' );
				}
				$( '#infoX' ).trigger( 'click' );
			} );
		}
		, okno        : true
	} );
}
function intervalClear() {
	$.each( V.interval, ( k, v ) => clearInterval( v ) );
	setProgress( S.webradio ? 0 : '' ); // stop progress animation
	if ( D.vumeter ) $( '#vuneedle' ).css( 'transform', '' );
}
function intervalElapsedClear() {
	[ 'elapsed', 'elapsedpl' ].forEach( k => clearInterval( V.interval[ k ] ) );
	if ( D.vumeter ) $( '#vuneedle' ).css( 'transform', '' );
}
function libraryHome() {
	list( { library: 'home' }, function( data ) {
		O             = data.order;
		S.updating_db = data.updating;
		if ( data.html !== V.libraryhtml ) {
			V.libraryhtml = data.html;
			var html      = htmlHash( data.html );
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
		if ( V.color ) $( '.mode.webradio' ).trigger( 'click' );
	}, 'json' );
}
function list( query, callback, json ) {
	if ( V.debug ) {
		bashConsoleLog( JSON.stringify( query ) );
		return
	}
	
	$.post(
		  'library' in query  ? 'library.php' : 'playlist.php'
		, query
		, callback || null
		, json || null
	);
}
function lyricsGet( refresh ) {
	banner( 'lyrics blink', 'Lyrics', 'Fetch ...', -1 );
	bash( [ 'lyrics', V.lyricsartist, V.lyricstitle, refresh || '', 'CMD ARTIST TITLE ACTION' ], data => {
		lyricsShow( data );
		bannerHide();
		$( '#lyricsrefresh' ).removeClass( 'blink' );
	} );
}
function lyrics( artist, title ) {
	V.lyricsartist = artist || S.Artist;
	V.lyricstitle  = title || S.Title;
	if ( $( '#lyricstitle' ).text() === V.lyricstitle && $( '#lyricsartist' ).text() === V.lyricsartist ) {
		$( '#lyrics' ).removeClass( 'hide' );
		$( '#lyricstext' )
			.scrollTop( 0 )
			.trigger( 'focus' );
		return
	}
	
	lyricsGet();
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
	if ( barVisible() ) {
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
function menuLibraryPlaylist( $tabs, click ) {
	V.liplmenu = false;
	if ( click ) $( document.activeElement ).trigger( 'click' );
	$tabs
		.removeClass( 'focus' )
		.trigger( 'blur' );
	$( '#fader' ).addClass( 'hide' );
	$( '#bar-top, #bar-bottom' ).css( 'z-index', '' );
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
	if ( S.state === 'stop' && barVisible() ) {
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
	O.forEach( mode => {
		if ( mode.includes( '/' ) ) {
			var $libmode = $( '.mode.bookmark' ).filter( ( i, el ) => $( el ).find( '.lipath' ).text() === mode );
		} else {
			var $libmode = $( '.mode.'+ mode );
		}
		$libmode.detach();
		$( '#lib-mode-list' ).append( $libmode );
	} );
}
function pageScroll( top ) {
	setTimeout( () => $( 'html, body' ).scrollTop( top ), 0 );
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
			V.coverdefault = ! D.covervu && ! D.vumeter ? V.coverart : V.covervu;
			delete status.display;
			delete V.coverTL;
			displaySubMenu();
			bannerHide();
		}
		if ( V.volumeactive ) delete status.volume; // immediately change volume when pageInactive > pageActive
		$.each( status, ( k, v ) => { S[ k ] = v } ); // need braces
		V.volumecurrent = S.volume;
		var dataerror = $( '#data .copy' ).length;
		if ( $( '#data' ).hasClass( 'hide' ) || dataerror ) {
			if ( dataerror ) {
				$( '#data' ).empty();
				$( '#button-data, #data' ).addClass( 'hide' );
			}
			renderPlaybackAll();
		} else {
			setStatusData();
		}
	} );
}
function playlistBlink( off ) {
	if ( off ) {
		clearTimeout( V.timeoutpl );
		$( '#playlist, #button-playlist' ).removeClass( 'blink' );
	} else {
		V.timeoutpl = setTimeout( () => $( '#playlist, #button-playlist' ).addClass( 'blink' ), 1000 );
	}
}
function playlistGet() {
	if ( ! S.pllength ) {
		renderPlaylist();
		return
	}
	
	if ( $( '#pl-list' ).is( ':empty' ) ) {
		if ( $( '#bar-top' ).hasClass( 'hide' ) ) banner( 'playlist blink', 'Playlist', 'Get ...', -1 )
	} else {
		if ( ! V.playlist ) switchPage( 'playlist' );
		setPlaylistScroll();
	}
	playlistBlink();
	list( { playlist: 'current' }, data => {
		playlistBlink( 'off' );
		renderPlaylist( data );
		bannerHide();
	}, 'json' );
}
function playlistInsert( pos ) {
	var plname = $( '#savedpl-path .lipath' ).text();
	banner( 'file-playlist', V.pladd.name, 'Add ...' );
	bash( [ 'savedpledit', plname, 'add', pos, V.pladd.path, 'CMD NAME ACTION TO FILE' ], () => {
		renderSavedPlTrack( plname );
		if ( pos === 'last' ) {
			setTimeout( () => $( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } ), 300 );
		}
		bannerHide();
	} );
}
function playlistInsertSelect() {
	info( {
		  ...V.pladd
		, list        : [ 'Position:', 'radio', { Before: 1, After: 2 } ]
		, footer      : '<wh>'+ ( V.pladd.index + 1 ) +'<gr> • </gr>'+ V.pladd.track +'</wh>'
		, beforeshow  : playlistInsertSet
		, buttonlabel : ico( 'undo' ) +'Select'
		, buttoncolor : orange
		, button      : () => {
			infoReset();
			banner( V.pladd.icon, V.pladd.title, 'Select position to insert', -1 );
		}
		, cancel      : savedPlaylistAddClear
		, ok          : () => playlistInsert( +infoVal() + V.pladd.index )
	} );
	bannerHide();
}
function playlistInsertSet() {
	$( '.infomessage' ).addClass( 'tagmessage' );
	$( '#infoList table' ).before( '<hr>' ).after( '<hr>' );
}
function playlistInsertTarget() {
	V.pladd.title = 'Add to '+ V.pladd.name;
	info( {
		  ...V.pladd
		, list       : [ 'Position:', 'radio', { First : 1, Select: 'select', Last: 'last' } ]
		, values     : 'last'
		, beforeshow : () => {
			playlistInsertSet();
			$( '#infoList' ).on( 'click', 'label:eq( 1 )', function() {
				infoReset();
				banner( V.pladd.icon, V.pladd.title, 'Select position to insert', -1 );
			} );
		}
		, cancel     : savedPlaylistAddClear
		, ok         : () => playlistInsert( infoVal() )
	} );
	bannerHide();
}
function playlistRemove( $li ) {
	if ( S.pllength === 1 ) {
		bash( [ 'mpcremove' ] );
	} else {
		bash( [ 'mpcremove', $li.index() + 1, 'CMD POS' ] );
	}
	$li.remove();
}
function playlistRemoveRange( range ) {
	bannerHide();
	var $disabled = $( '#bar-top, #bar-bottom, .content-top' );
	var clear = () => {
		delete V.plrange;
		$disabled.removeClass( 'disabled' );
		bannerHide();
	}
	var param = { updn: { step: 1, min: 1, max: S.pllength, link: true } }
	info( {
		  icon       : 'playlist'
		, title      : 'Remove Range'
		, list       : [ [ 'From', 'number', param ], [ 'To', 'number', param ] ]
		, boxwidth   : 80
		, values     : range || { from: 1, to: S.pllength }
		, beforeshow : () => {
			$( '#infoList tr' ).prepend( '<td>'+ ico( 'cursor' ) +'</td>' );
			$( '#infoList td:nth-child( 2 )' ).css( { 'padding-right': '5px', 'text-align': 'right' } );
			$( '#infoList' ).on( 'click', '.i-cursor', function() {
				V.plrange      = infoVal();
				V.plrange.type = $( this ).parents( 'tr' ).index() === 0 ? 'from' : 'to';
				$( '#infoOverlay' ).addClass( 'hide' );
				$disabled.addClass( 'disabled' );
				banner( 'cursor blink', 'Playlist', 'Select Range', -1 );
			} );
		}
		, cancel     : clear
		, ok         : () => {
			var v = infoVal( 'array' );
			bash( [ 'mpcremove', ...v, 'CMD POS TO' ] );
			$( '#pl-list li' ).slice( v[ 0 ] - 1, v[ 1 ] ).remove();
			clear();
		}
	} );
}
function playlistSkip() {
	if ( ! $( '#pl-list li' ).length ) {
		list( { playlist: 'current' }, data => {
			$( '#pl-list' ).html( data.html ).promise().done( playlistSkip );
		}, 'json' );
		return
	}
	
	intervalClear();
	if ( S.state !== 'stop' ) {
		setProgress( 0 );
		$( '#elapsed, #total, #progress' ).empty();
	}
	bash( [ 'mpcskippl', S.song + 1, S.state, 'CMD POS ACTION' ] );
}
function refreshData() {
	if ( V.library ) {
		if ( $( '#lib-search-input' ).val() ) return
		
		if ( V.libraryhome ) { // home
			libraryHome();
		} else {
			if ( [ 'sd', 'nas', 'usb' ].includes( V.mode ) ) return
			
			if ( V.mode === 'album' && $( '#lib-list .coverart' ).length ) {
				$( '.mode.album' ).trigger( 'click' );
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
				$( '.mode.'+ V.mode ).trigger( 'click' );
			}
		}
	} else if ( V.playback ) {
		playbackStatusGet( 'withdisplay' );
	} else {
		if ( V.playlistlist ) {
			$( '#button-pl-playlists' ).trigger( 'click' );
		} else if ( V.playlisttrack ) {
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
	V.libraryhome = true;
	V.mode        = '';
	[ 'albumlist', 'librarylist', 'librarytrack', 'searchlist' ].forEach( k => V[ k ] = false );
	V.query       = [];
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-path .lipath' ).empty()
	$( '#lib-path, #lib-title, #button-lib-search, #button-lib-update' ).removeClass( 'hide' );
	$( '#lib-breadcrumbs, #lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	$( '#page-library .content-top, #page-library .search, #lib-list' ).addClass( 'hide' );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '#lib-list, #page-library .index, #search-list' ).remove();
	$( '#lib-mode-list' )
		.css( 'padding-top', barVisible( '', 50 ) )
		.removeClass( 'hide' );
	if ( O ) orderLibrary();
	pageScroll( V.modescrolltop );
	$( '.bkedit' ).remove();
	$( '.mode.edit' ).removeClass( 'edit' );
	renderLibraryCounts();
	setButtonUpdate();
}
function renderLibraryCounts() {
	var songs = C.song ? C.song.toLocaleString() + ico( 'music' ) : '';
	$( '#li-count' ).html( songs );
	$( '.mode:not( .bookmark )' ).each( ( i, el ) => {
		var $this = $( el );
		var mode  = $this.data( 'mode' );
		var count = C[ mode ];
		$this
			.toggleClass( 'hide', ! D[ mode ] )
			.toggleClass( 'nodata', ! count );
		if ( typeof count !== 'boolean' ) $this.find( 'gr' ).html( count ? count.toLocaleString() : '' );
	} );
	$( '.mode gr' ).toggleClass( 'hide', ! D.count );
	$( '.mode .label' ).toggleClass( 'hide', ! D.label );
}
function renderLibraryList( data ) { // V.librarylist
	V.libraryhome  = false;
	if ( V.librarylist && data.html === V.librarylisthtml ) {
		if ( V.color ) colorSet()
		return
	}
	
	V.librarylist = true;
	$( '#lib-title, #lib-mode-list, .menu, #button-lib-update' ).addClass( 'hide' );
	$( '#button-lib-back' )
		.toggleClass( 'back-left', D.backonleft )
		.removeClass( 'hide' );
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
	} else if ( data.path ) { // dir breadcrumbs
		var dir      = data.path.split( '/' );
		var dir0     = dir[ 0 ];
		var htmlpath = ico( V.mode );
		if ( V.mode.slice( -5 ) === 'radio' ) htmlpath += '<a>'+ V.mode +' / </a>';
		htmlpath    += '<a>'+ dir0 +' / <span class="lidir">'+ dir0 +'</span></a>';
		var lidir    = dir0;
		var iL       = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir    += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +' / <span class="lidir">'+ lidir +'</span></a>';
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
	$( '#lib-list, #page-library .index' ).remove();
	if ( ! data.html ) return // empty radio
	
	var html = htmlHash( data.html );
	$( '#lib-mode-list' ).after( html ).promise().done( () => {
		if ( $( '#lib-list' ).hasClass( 'track' ) ) {
			V.librarytrack = true;
			if ( $( '#liimg' ).attr( 'src' ).slice( 0, 16 ) === '/data/shm/online' ) $( '.licoverimg ' ).append( V.icoversave );
		} else {
			V.librarytrack = false;
			imageLoad( 'lib-list' );
			if ( [ 'album', 'latest' ].includes( V.mode ) ) $( '#lib-list' ).addClass( 'album' );
		}
		$( '.liinfopath' ).toggleClass( 'hide', [ 'sd', 'nas', 'usb', 'webradio' ].includes( V.mode ) );
		if ( V.mode === 'album' ) { // V.albumlist
			V.albumlist = true;
			if ( ! $( '.licover' ).length ) $( '#lib-list img' ).eq( 0 ).on( 'load', function() {
				$( '#lib-breadcrumbs' ).append( '<span class="button-coverart"><img src="'+ $( this ).attr( 'src' ) +'"></span>' );
			} );
			if ( V.iactive ) $( '#lib-list .coverart' ).eq( V.iactive ).addClass( 'active' );
		} else {
			V.albumlist = false;
			if ( V.color ) {
				colorSet();
			} else if ( V.librarytrack ) {
				setTrackCoverart();
			}
		}
		renderLibraryPadding();
		$( '#lib-list' ).removeClass( 'hide' );
		pageScroll( V.scrolltop[ data.path ] || 0 );
	} );
}
function renderLibraryPadding() {
	var padding = barVisible( 129, 89 );
	if ( V.librarytrack ) {
		if ( D.fixedcover && V.wH > 734 ) padding += 230;
	} else if ( [ 'album', 'latest' ].includes( V.mode ) ) {
		$( '#lib-list' ).css( 'padding-bottom', '100vh' ); // force scrollbar to get .coverart height
		padding += $( '.coverart' ).eq( 0 ).height() - 49;
	}
	var $list = V.searchlist ? $( '#search-list' ) : $( '#lib-list' );
	$list.css( {
		  'padding-bottom' : 'calc( 100vh - '+ padding +'px )'
		, 'width'          :  V.librarytrack ? '100%' : ''
	} )
}
function renderPlayback() {
	if ( ! S.state ) return // suppress on reboot
	
	local();
	if ( S.state === 'stop' ) setProgress( 0 );
	if ( ! V.volumeactive ) setVolume(); // immediately change volume when pageInactive > pageActive
	setButtonOptions();
	clearInterval( V.interval.blinkdot );
	$( '#qr' ).remove();
	if ( S.player === 'mpd' && S.state === 'stop' && ! S.pllength ) { // empty queue
		setPlaybackBlank();
		return
	}
	
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#coverTR' ).removeClass( 'empty' );
	setInfo();
	setCoverart();
	V.timehms = S.Time ? second2HMS( S.Time ) : '';
	if ( S.elapsed === false || S.webradio ) {
		setBlinkDot();
		return
	}
	
	$timeRS.option( 'max', S.Time || 100 );
	if ( S.state === 'stop' ) {
		setPlaybackStop();
		return
	}
	
	$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
	$( '#total' ).text( V.timehms );
	if ( S.elapsed === false || S.Time === false || ! ( 'elapsed' in S ) || S.elapsed > S.Time ) {
		$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
		blinkDot();
		return
	}
	
	var elapsedhms = S.elapsed ? second2HMS( S.elapsed ) : '';
	var htmlelapsed = ico( S.state ) +'<span>'+ elapsedhms +'</span>';
	if ( S.elapsed ) {
		htmlelapsed += ' / ';
	} else {
		setTimeout( () => $( '#progress span' ).after( ' / ' ), 1000 );
	}
	htmlelapsed +=  V.timehms;
	$( '#progress' ).html( htmlelapsed );
	if ( S.state === 'pause' ) {
		if ( S.elapsed ) $( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
		$( '#total' ).addClass( 'wh' );
		setProgress();
	} else { //play
		setProgressElapsed();
	}
}
function renderPlaybackAll() {
	displayBars();
	displayPlayback();
	renderPlayback();
	bannerHide();
}
function renderPlaylist( data ) { // V.playlisthome - current playlist
	V.playlisthome  = true;
	V.playlistlist  = false;
	V.playlisttrack = false;
	$( '#button-pl-back' ).addClass( 'hide' );
	$( '#pl-search-close' ).trigger( 'click' );
	$( '#button-pl-playlists' ).toggleClass( 'disabled', C.playlists === 0 );
	$( '#button-pl-librandom' )
		.toggleClass( 'bl', S.librandom )
		.toggleClass( 'disabled', C.song === 0 || ! ( 'song' in C ) );
	$( '#pl-savedlist, #page-playlist .index' ).remove();
	if ( ! data ) {
		V.playlisthtml = '';
		S.pllength     = 0;
		S.consume      = false;
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disabled' );
		$( '#button-pl-consume' ).removeClass( 'bl' );
		$( '#pl-search-close' ).trigger( 'click' );
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		pageScroll( 0 );
		switchPage( 'playlist' );
		return
	}
	
	[ 'consume', 'elapsed', 'librandom', 'song' ].forEach( k => S[ k ] = data[ k ] );
	$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '.pllength' ).removeClass( 'disabled' );
	$( '#button-pl-shuffle' ).toggleClass( 'disabled', S.pllength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', S.consume );
	if ( data.html !== V.playlisthtml ) {
		V.playlisthtml = data.html;
		var html = htmlHash( data.html );
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
	var padding = barVisible( 129, 89 );
	$( '#pl-savedlist, #pl-list' ).css( 'padding-bottom', 'calc( 100vh - '+ padding +'px )' );
}
function renderPlaylistSet() {
	$( '.emptyadd, #menu-plaction' ).addClass( 'hide' );
	if ( V.playlisthome ) {
		$( '#pl-savedlist, #savedpl-path' ).addClass( 'hide' );
		$( '#pl-list, #pl-path, #pl-manage, #button-pl-search' ).removeClass( 'hide' );
	} else {
		$( '#pl-savedlist' ).css( 'width', V.playlistlist ? '' : '100%' );
		$( '#pl-list, #pl-path, #pl-manage, #pl-search, #button-pl-search' ).addClass( 'hide' );
		$( '#button-pl-back' ).toggleClass( 'back-left', D.backonleft );
		$( '#pl-savedlist, #savedpl-path, #button-pl-back' ).removeClass( 'hide' );
	}
	renderPlaylistPadding();
	if ( 'pladd' in V ) $( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).addClass( 'disabled' );

}
function renderSavedPl( data ) { // V.playlistlist - list of saved playlists
	V.playlisthome  = false;
	V.playlistlist  = true;
	V.playlisttrack = false;
	$( '#savedpl-path' ).html( data.counthtml );
	var html        = htmlHash( data.html );
	$( '#pl-savedlist, #page-playlist .index' ).remove();
	$( '#pl-list' ).after( html ).promise().done( renderPlaylistSet );
}
function renderSavedPlTrack( name ) { // V.playlisttrack - tracks in a playlist
	V.playlisthome  = false;
	V.playlistlist  = false;
	V.playlisttrack = true;
	menuHide();
	list( { playlist: 'get', name: name }, function( data ) {
		$( '#page-playlist .index' ).remove();
		$( '#savedpl-path' ).html( data.counthtml );
		var html = htmlHash( data.html );
		$( '#pl-savedlist' ).html( html ).promise().done( () => {
			imageLoad( 'pl-savedlist' );
			renderPlaylistSet();
			pageScroll( 0 );
		} );
	}, 'json' );
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
	intervalClear();
	$( '#vuneedle' ).css( 'transform', '' );
	$( '#elapsed, #total, #progress' ).empty();
	if ( S.state === 'play' ) {
		$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
		blinkDot();
		if ( D.radioelapsed ) {
			$( '#progress' ).html( ico( S.state ) +'<span></span>' );
			setProgressElapsed();
		} else {
			setProgress( 0 );
		}
	}
}
function setBookmarkEdit() {
	if ( $( '.bkedit' ).length ) {
		$( '.bkedit' ).remove();
		$( '.mode.edit' ).removeClass( 'edit' );
		return
	}
	
	V.bklabel = $( this ).find( '.label' );
	$( '.mode.bookmark' ).each( ( i, el ) => {
		var $this      = $( el );
		var buttonhtml = ico( 'remove bkedit bk-remove' );
		if ( ! $this.find( 'img' ).length ) buttonhtml += ico( 'edit bkedit bk-rename' );
		if ( ! S.webradio ) buttonhtml += '<div class="bkedit bk-cover">'+ ico( 'coverart' ) +'</div>';
		$this.append( buttonhtml );
	} );
	$( '.mode.bookmark' ).addClass( 'edit' );
}
function setButtonOptions() {
	$( '#snapclient' ).toggleClass( 'on', S.player === 'snapcast' );
	$( '#relays' ).toggleClass( 'on', S.relayson );
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
	setButtonUpdate();
	setButtonUpdating();
	if ( $volume.is( ':hidden' ) ) $( '#'+ prefix +'-mute' ).toggleClass( 'hide', S.volumemute === 0 );
}
function setButtonUpdateAddons() {
	if ( S.updateaddons ) {
		$( '#button-settings, #addons i' ).addClass( 'bl' );
		if ( ! barVisible() ) {
			var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
			$( '#'+ prefix +'-addons' ).addClass( 'hide' );
			$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
		}
	} else {
		$( '#button-settings, #addons i' ).removeClass( 'bl' );
		$( '#mi-addons, #ti-addons' ).addClass( 'hide' );
	}
}
function setButtonUpdate() {
	var toggle = () => {
		$( '#update, #button-lib-update' ).toggleClass( 'disabled', ! C.nas && ! C.sd && ! C.usb );
	}
	if ( 'nas' in C ) {
		toggle();
		return
	}
	
	bash( [ 'lsmnt' ], tf => {
		$.each( tf, ( k, v ) => { C[ k ] = v } );
		toggle();
	}, 'json' );
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
		$( '#button-lib-update' ).addClass( 'bl' );
		if ( localhost ) blinkUpdate();
		$( '#update' ).addClass( 'on' );
	} else {
		$( '#library, #button-library' ).removeClass( 'blink' );
		$( '#button-lib-update' ).removeClass( 'bl' );
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
		var coverart = S.webradio ? ( S.coverart || S.stationcover ) : S.coverart;
		if ( coverart ) {
			$( '#vu' ).addClass( 'hide' );
			$( '#coverart' )
				.attr( 'src', coverart + versionHash() )
				.css( 'max-height', ( V.wH - $( '#playback-row' ).offset().top ) +'px' )
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
	if ( S.webradio ) {
		var url = S.file.replace( /#charset=.*/, '' );
		if ( S.state !== 'play' ) {
			$( '#artist' ).text( S.station );
			$( '#title' ).html( dots );
			$( '#album' ).text( url );
		} else {
			$( '#artist' ).text( S.Artist || S.station );
			$( '#title' ).html( S.Title || V.blinkdot );
			blinkDot();
			$( '#album' ).text( S.Album || url );
		}
	} else {
		$( '#artist' ).html( S.Artist || dots );
		$( '#title' )
			.html( S.Title || dots )
			.toggleClass( 'gr', S.state === 'pause' );
		var album = S.Album || S.file;
		if ( S.booklet ) album += ' '+ ico( 'booklet gr' );
		$( '#album' ).html( album );
		$( '#composer' ).text( S.Composer );
		$( '#conductor' ).text( S.Conductor );
	}
	$( '#divcomposer' ).toggleClass( 'hide', ! D.composername || S.Composer === '' );
	$( '#divconductor' ).toggleClass( 'hide', ! D.conductorname || S.Conductor === '' );
	var current = {
		  Artist : $( '#artist' ).text()
		, Title  : $( '#title' ).text()
		, Album  : $( '#album' ).text()
	}
	var changed = [ 'Artist', 'Title', 'Album' ].some( k => {
		return prev[ k ] !== current[ k ]
	} );
	$( '#artist' ).toggleClass( 'disabled', S.Artist === '' );
	$( '#title' ).toggleClass( 'disabled', S.Title === '' );
	$( '#album' ).toggleClass( 'disabled', S.Album === '' );
	if ( changed ) setInfoScroll();
	var sonpos   = [ 'mpd', 'upnp' ].includes( S.player ) && S.pllength > 1 ? S.song + 1 +'/'+ S.pllength : '';
	var sampling = sonpos;
	sampling += sonpos && S.sampling ? ' • ' : '';
	if ( S.sampling ) sampling += S.sampling;
	if ( S.webradio ) {
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
	$( '#playback-controls, #infoicon i, #vu,#divcomposer, #divconductor' ).addClass( 'hide' );
	$( '#divartist, #divtitle, #divalbum' ).removeClass( 'scroll-left' );
	$( '#artist, #title, #album, #progress, #elapsed, #total' ).empty();
	setProgress( 0 );
	$( '#sampling' ).empty();
	if ( S.ip || D.ap ) {
		setPlaybackBlankQR();
		$( '#coverTR' ).toggleClass( 'empty', ! barVisible() );
		$( '#coverart' ).addClass( 'hide' );
	} else {
		$( '#coverart' ).removeClass( 'hide' );
		$( '#sampling' ).html( 'Network not connected:&emsp; <a href="settings.php?p=networks">'+ ico( 'networks' ) +'&ensp;Setup</a>' );
	}
	vu();
	loaderHide();
}
function setPlaybackBlankQR() {
	var ip = S.ip || D.apconf.ip;
	if ( ! ip ) return
	
	if ( typeof QRCode !== 'function' ) {
		$.getScript( '/assets/js/plugin/'+ jfiles.qrcode, setPlaybackBlankQR );
		return
	}
	
	var htmlqr = '';
	if ( ! S.ip && D.ap ) {
		htmlqr += '<gr>Access Point:</gr> <wh>'+ D.apconf.ssid +'</wh>'
				 +'<br><gr>Password:</gr> <wh>'+ D.apconf.passphrase +'</wh>'
				 +'<div class="code">'+ qrCode( D.apconf.qr ) +'</div>';
	}
	htmlqr   +=  '<gr>http://</gr>'+ ip
				+ ( S.hostname ? '<br><gr>http://'+ S.hostname +'</gr>' : '' )
				+'<div class="code">'+ qrCode( 'http://'+ ip ) +'</div>';
	$( '#qr' ).remove();
	$( '#map-cover' ).before( '<div id="qr">'+ htmlqr +'</div>' );
}
function setPlaybackStop() {
	setProgress( 0 );
	$( '#elapsed, #total, #progress' ).empty();
	$( '#title' ).removeClass( 'gr' );
	if ( V.timehms ) {
		$( '#progress' ).html( ico( 'stop' ) +'<span></span>'+ V.timehms );
		$( '#elapsed' )
			.text( V.timehms )
			.addClass( 'gr' );
	}
	if ( ! S.webradio ) return
	
	S.coverart = false;
	setCoverart();
	setInfo();
	$( '#artist, #title, #album' ).addClass( 'disabled' );
	$( '#sampling' ).html( S.sampling +' • '+ S.ext );
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
	intervalClear();
	switchPage( 'playlist' );
	if ( V.sortable
		|| [ 'airplay', 'spotify' ].includes( S.player )
		|| ( D.audiocd && $( '#pl-list li' ).length < S.song + 1 ) // on eject cd S.song not yet refreshed
	) {
		return
	}
	
	var litop = barVisible( 80, 40 );
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
	$( '#pl-list .elapsed' ).empty();
	var $elapsed     = $liactive.find( '.elapsed' );
	var $name        = $liactive.find( '.li1 .name' );
	var $stationname = $liactive.find( '.li2 .stationname' );
	$stationname.addClass( 'hide' );
	if ( S.state === 'stop' || S.player === 'snapcast' ) {
		if ( S.webradio ) {
			$name.text( $liactive.find( '.liname' ).text() );
			setPlaylistWebRadioCoverart();
		}
	} else {
		if ( S.elapsed === false ) return
		
		var slash = S.Time ? ' <gr>/</gr>' : '';
		if ( S.player === 'upnp' ) $liactive.find( '.time' ).text( second2HMS( S.Time ) );
		if ( S.state === 'pause' ) {
			elapsedtxt = second2HMS( S.elapsed );
			$elapsed.html( ico( 'pause' ) + elapsedtxt + slash );
			setPlaylistInfoWidth();
		} else if ( S.state === 'play' ) {
			if ( S.webradio ) {
				$stationname.removeClass( 'hide' );
				$name.html( S.Title || '·&ensp;·&ensp;·' );
				if ( S.coverart && S.coverart !== S.stationcover ) {
					$liactive.find( 'img' ).on( 'lazyloaded', setPlaylistWebRadioCoverart ); // fix - lazysizes load stationcover
					setPlaylistWebRadioCoverart(); // lazysizes already loaded
				}
			}
			var elapsedL0 = 0;
			var elapsedL  = 0;
			if ( S.elapsed ) $elapsed.html( ico( 'play' ) + second2HMS( S.elapsed ) + slash );
			V.interval.elapsedpl = setInterval( () => {
				S.elapsed++;
				if ( S.elapsed === S.Time ) {
					intervalClear();
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
function setPlaylistWebRadioCoverart() {
	var coverart = S.state === 'play' ? S.coverart + versionHash() : S.stationcover;
	$( '#pl-list li.active img' )
		.data( 'src', coverart )
		.attr( 'src', coverart);
}
function setPlayPauseColor() {
	var pause = S.state === 'pause';
	$( '#title' ).toggleClass( 'gr', pause );
	$( '#elapsed' ).toggleClass( 'bl', pause );
	$( '#total' ).toggleClass( 'wh', pause );
	$( '#progress i' ).prop( 'class', pause ? 'i-pause' : 'i-play' );
}
function setProgress( position ) {
	if ( position !== 0 ) position = S.elapsed;
	if ( S.state !== 'play' || ! position ) clearInterval( V.interval.elapsed );
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
	if ( S.elapsed === false || S.state !== 'play' || 'audiocdadd' in V ) return // wait for cd cache on start
	
	var elapsedhms;
	var $elapsed = S.elapsed === false ? $( '#total, #progress span' ) : $( '#elapsed, #progress span' );
	if ( S.elapsed ) $elapsed.text( second2HMS( S.elapsed ) );
	if ( S.Time ) {
		$timeRS.option( 'max', S.Time );
		setProgress();
		if ( ! localhost ) {
			setTimeout( setProgressAnimate, 0 ); // delay to after setvalue on load
		} else {
			$timeprogress.css( 'transition-duration', '0s' );
		}
		V.interval.elapsed = setInterval( () => {
			S.elapsed++;
			if ( S.elapsed < S.Time ) {
				if ( localhost ) {
					$timeRS.setValue( S.elapsed );
					$( '#time-bar' ).css( 'width', S.elapsed / S.Time * 100 +'%' );
				}
				elapsedhms = second2HMS( S.elapsed );
				$elapsed.text( elapsedhms );
				if ( S.state !== 'play' ) clearInterval( V.interval.elapsed );
			} else {
				S.elapsed = 0;
				intervalClear();
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
function setStatusData() {
	var list = {
		  status  : S
		, display : D
		, count   : C
	}
	var html = '';
	$.each( list, ( k, v ) => html += '"'+ k +'": '+ highlightJSON( v ) +'<br>' );
	$( '#data' ).html( html );
	$( '#button-data, #data' ).removeClass( 'hide' );
}
function setTrackCoverart() {
	if ( V.mode === 'album' ) $( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
	if ( D.hidecover ) {
		$( '.licover' ).addClass( 'hide' );
		$( '#lib-list li' ).eq( 1 ).removeClass( 'track1' );
	} else {
		$( '.licover' )
			.removeClass( 'hide' )
			.toggleClass( 'nofixed', ! D.fixedcover );
		$( '#lib-list li' ).eq( 1 ).toggleClass( 'track1', D.fixedcover );
		$( '#liimg' ).off( 'error' ).on( 'error', function() {
			$( this ).attr( 'src', V.coverdefault );
		} );
		$( '.liinfo .lialbum' ).toggleClass( 'hide', V.mode === 'album' );
	}
}
function setVolume() {
	if ( V.animate ) return
	
	$volumeRS.setValue( S.volume );
	setVolumeUpDn();
	if ( ! S.volume ) $volumehandle.rsRotate( -310 );
	$( '#volume-bar' ).css( 'width', S.volume +'%' );
	$( '#volume-text' )
		.text( S.volumemute || S.volume )
		.toggleClass( 'bll', S.volumemute > 0 );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
		$( '#'+ prefix +'-mute' ).toggleClass( 'hide', ! S.volumemute );
	}
	S.volumemute ? volumeColorMute( S.volumemute ) : volumeColorUnmute();
}
function setVolumeUpDn() {
	if ( D.volume ) {
		$( '#voldn, #volL, #volB, #volume-band-dn' ).toggleClass( 'disabled', S.volume === 0 );
		$( '#volup, #volR, #volT, #volume-band-up' ).toggleClass( 'disabled', S.volume === 100 );
	}
}
function sortPlaylist( pl, iold, inew ) {
	V.sortable = true;
	setTimeout( () => V.sortable = false, 500 );
	if ( pl === 'pl-list' ) {
		bash( [ 'mpcmove', iold + 1, inew + 1, 'CMD FROM TO' ] );
	} else {
		bash( [ 'savedpledit', $( '#savedpl-path .lipath' ).text(), 'move', iold + 1, inew + 1, 'CMD NAME ACTION FROM TO' ] );
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
	intervalClear();
	// get scroll position before changed
	if ( V.library ) {
		if ( V.librarylist ) {
			V.liscrolltop = $( window ).scrollTop();
		} else {
			V.modescrolltop = $( window ).scrollTop();
		}
		if ( V.colorpicker ) $( '#colorcancel' ).trigger( 'click' );
	} else if ( V.playlist ) {
		if ( ! V.playlisthome ) V.plscrolltop = $( window ).scrollTop();
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
		if ( ! V.playlisthome ) pageScroll( V.plscrolltop );
	}
	$( '.page' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
}
function versionHash() {
	return '?v='+ Math.round( Date.now() / 1000 )
}
function volumeAnimate( target, volume ) {
	clearTimeout( V.volumebar );
	$( '.volumeband' ).addClass( 'disabled' );
	$( '#volume-bar' ).animate(
		  { width: target +'%' }
		, {
			  duration : Math.abs( target - volume ) * 40
			, easing   : 'linear'
			, complete : () => {
				V.volumebar = volumeBarHide();
				$( '.volumeband' ).removeClass( 'disabled' );
				setVolume();
			}
		}
	);
}
function volumeBarHide( nodelay ) {
	setTimeout( () => {
		$( '#info' ).removeClass( 'hide' ); // 320 x 480
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		$( '.volumeband' ).addClass( 'transparent' );
	}, nodelay ? 0 : 3000 );
}
function volumeBarSet( pagex ) {
	V.volume.x = pagex - V.volume.min;
	S.volume   = Math.round( V.volume.x / V.volume.width * 100 );
	volumeMaxSet();
	setVolume();
}

function volumeBarShow() {
	if ( ! $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	V.volumebar = volumeBarHide();
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	$( '#volume-band-dn, #volume-band-up' ).removeClass( 'transparent' );
}
function volumeColorMute() {
	$volumetooltip
		.text( S.volumemute )
		.addClass( 'bl' );
	$volumehandle.addClass( 'bgr60' );
	$( '#volmute' ).addClass( 'mute active' );
	if ( $volume.is( ':hidden' ) ) {
		var prefix = $time.is( ':visible' ) ? 'ti' : 'mi';
		$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
	}
}
function volumeColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' ).removeClass( 'mute active' )
	$( '#mi-mute, #ti-mute' ).addClass( 'hide' );
}
function volumeUpDown( up ) {
	up ? S.volume++ : S.volume--;
	volumeMaxSet();
	S.volumemute = 0;
	setVolume();
	volumeSet();
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
