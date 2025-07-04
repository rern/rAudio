function LIST( query, callback, json ) {
	if ( V.debug ) {
		COMMON.debugConsole( JSON.stringify( query ) );
		return
	}
	
	$.post(
		  'library' in query  ? 'library.php' : 'playlist.php'
		, query
		, callback || null
		, json || null
	);
}
function REFRESHDATA() {
	BASH( [ 'status.sh' ], list => {
		if ( list == -1 ) {
			INFO( {
				  icon    : 'networks'
				, title   : 'Shared Data'
				, message : V.i_warning +'<wh>Server offline</wh>'
							+'<br><br>Disable and restore local data?'
				, cancel  : loader
				, okcolor : V.orange
				, ok      : () => BASH( [ 'settings/system.sh', 'shareddatadisable' ], () => location.reload() )
			} );
			return
		}
		
		try {
			var status = JSON.parse( list );
		} catch( e ) {
			COMMON.dataError( e.message, list );
			return false
		}
		
		C = status.counts;
		delete status.counts;
		if ( 'display' in status ) {
			D              = status.display;
			V.coverdefault = ! D.covervu && ! D.vumeter ? V.coverart : V.covervu;
			delete status.display;
			delete V.coverTL;
			DISPLAY.subMenu();
			BANNER_HIDE();
			$( '.content-top .i-back' ).toggleClass( 'left', D.backonleft );
		}
		$.each( status, ( k, v ) => { S[ k ] = v } ); // need braces
		COMMON.statusToggle( 'refresh' );
		V.playback ? UTIL.refreshPlayback() : UTIL.refresh();
		DISPLAY.controls();
	} );
}
//-----------------------------------------------------------------------------------------------------------------
var BIO       = {
	  get   : ( artist, getsimilar ) => {
		if ( artist === $( '#biocontent .artist' ).text() ) {
			$( '#bio' ).removeClass( 'hide' );
			V.observer.observe( $( '#bioimg' )[ 0 ] );
			return
		}
		
		COMMON.loader();
		var url = 'http://ws.audioscrobbler.com/2.0/'
				 +'?autocorrect=1'
				 +'&format=json'
				 +'&method=artist.getinfo'
				 +'&api_key='+ V.apikeylastfm
				 +'&artist='+ encodeURI( artist.replace( '&', 'and' ) );
		$.post( url, ( data ) => {
			if ( 'error' in data || ( ! data.artist.bio.content ) ) {
				INFO( {
					  icon    : 'bio'
					, title   : 'Bio'
					, message : 'No data available.'
				} );
				COMMON.loaderHide();
				return
			}
			
			V.bioartist.push( artist );
			var data     = data.artist;
			var name     = data.name;
			var content  = data.bio.content.replace( /\n/g, '<br>' ).replace( /Read more on Last.fm.*/, '</a>' );
			var genre    = data.tags.tag[ 0 ].name;
			var backhtml = getsimilar ? ICON( 'back bioback' ) : '';
			var similar  =  data.similar.artist;
			if ( similar ) {
				var similarhtml  = '<p>'+ ICON( 'artist' ) +'&ensp;Similar Artists:<p><span>';
				similar.forEach( a => similarhtml += '<a class="biosimilar">'+ a.name +'</a>,&ensp;' );
				similarhtml = similarhtml.slice( 0, -7 ) +'</span><br><br>';
			}
			var biohtml = `
	<div class="container" tabindex="0">
	<div id="biocontent">
		<p class="artist">${ ICON( 'close close-root' ) + name }</p>
		<p class="genre">${ backhtml + ICON( 'genre' ) +'&ensp;'+ genre }</p>
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
						BIO.image();
						return
					}
					
					if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) $( '#biocontent' ).before( '<img id="biobanner" src="'+ data.musicbanner[ 0 ].url +'">' )
					var imageshtml = '';
					if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
						data.artistthumb.forEach( el => imageshtml += '<a href="'+ el.url +'" target="_blank"><img src="'+ el.url.replace( '/fanart/', '/preview/' ) +'"></a>' );
					}
					BIO.image( imageshtml )
					$( '#bio' ).scrollTop( 0 );
				} ).fail( function() { // 404 not found
					BIO.image();
				} );
				$( '#bio .container' ).trigger( 'focus' );
			} );
		} );
	}
	, image : imageshtml => {
		var $artist    = $( '#biocontent .artist' );
		if ( ! imageshtml ) {
			if ( $artist.text() !== S.Artist || ! S.coverart ) {
				COMMON.loaderHide();
				return
			}
			
			imageshtml = '<a><img src="'+ S.coverart +'"></a>';
		}
		$artist
			.before( '<div id="bioimg">'+ imageshtml +'</div>' )
			.prepend( '<img id="biotitleimg" src="'+ $( '#bioimg img' ).last().attr( 'src' ) +'">' );
		var titleafter = $artist.prev()[ 0 ].id === 'bioimg';
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
		COMMON.loaderHide();
	}
}
var COLOR     = {
	  cssSet   : () => {
		var css = { '--h': V.ctx.hsl.h, '--s': V.ctx.hsl.s +'%' };
		V.color.ml.forEach( v => { css[ '--ml'+ v ] = ( V.ctx.hsl.l + v - 35 ) +'%' } );
		$( ':root' ).css( css );
	}
	, hide     : () => {
		$( '#colorpicker' ).addClass( 'hide' );
		$( 'body' ).css( 'overflow', '' );
		if ( V.color.page !== 'library' ) $( '#'+ V.color.page ).trigger( 'click' );
		delete V.color;
		delete V.ctx;
	}
	, liActive : () => $( '#lib-list li' ).eq( 0 ).addClass( 'active' )
	, pick     : {
		  gradient : () => {
			var ctx = V.ctx.context;
			var h   = V.ctx.hsl.h;
			var w   = V.ctx.width;
			for( var i = 0; i <= w; i++ ){                                     // each line
				var grad      = ctx.createLinearGradient( 0, 0, w, 0 );        // 0                  ---               width
				var iy        = i / w * 100;
				grad.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                 // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
				grad.addColorStop( 1, 'hsl('+ h +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
				ctx.fillStyle = grad;
				ctx.fillRect( 0, w - i, w, 1 );
			}
		}
		, hue      : ( x, y ) => {
			if ( y ) {
				V.ctx.hsl.h = UTIL.xy.degree( x, y, V.ctx.wheel.cx, V.ctx.wheel.cy )
			} else {
				V.ctx.hsl.h += x;
			}
			COLOR.pick.rotate();
			COLOR.pick.gradient();
			COLOR.cssSet();
		}
		, key      : {
			  code : {
				  ArrowUp    : [ 'y', -1 ]
				, ArrowDown  : [ 'y',  1 ]
				, ArrowRight : [ 'x',  1 ]
				, ArrowLeft  : [ 'x', -1 ]
				, '+'        :  1
				, '-'        : -1
			}
			, hue  : key => {
				COLOR.pick.hue( COLOR.pick.key.code[ key ] );
			}
			, sat  : key => {
				var [ xy, v ] = COLOR.pick.key.code[ key ];
				if ( xy === 'x' ) {
					var x = V.ctx.x + v;
					if ( x < 0 || x > V.ctx.width ) return
					
					var y = V.ctx.y;
				} else {
					var y = V.ctx.y + v;
					if ( y < 0 || y > V.ctx.width ) return
					
					var x = V.ctx.x;
				}
				COLOR.pick.point( x, y );
				COLOR.pick.sat( x, y );
			}
		}
		, point    : ( x, y ) => {
			var m = V.ctx.sat.margin;
			$( '#sat' )
				.css( { left: ( x + m ) +'px', top: ( y + m ) +'px' } ) // margin 55px - r 5px
				.removeClass( 'hide' );
		}
		, rotate   : () => {
			$( '#hue' ).css( 'transform', 'rotate( '+ V.ctx.hsl.h +'deg )' )
				.find( 'div' ).css( 'background', 'hsl( '+ V.ctx.hsl.h +', 100%, 50% )' );
		}
		, sat      : ( x, y ) => {
			var d, f, m;
			var [ r, g, b ] = V.ctx.context.getImageData( x, y, 1, 1 ).data;
			if ( r + g + b === 0 ) return
			 // rgb > s l
			r /= 255;
			g /= 255;
			b /= 255;
			m  = Math.max( r, g, b );
			d  = m - Math.min( r, g, b );
			f  = 1 - Math.abs( m + m - d - 1 ); 
			V.ctx.hsl.l = Math.round( ( m + m - d ) / 2 * 100 );
			V.ctx.hsl.s = f ? Math.round( d / f * 100 ) : 0;
			COLOR.cssSet();
			V.ctx.x = x;
			V.ctx.y = y;
		}
		, xy       : e => {
			var [ x, y ] = COMMON.pageXY( e );
			if ( V.sat ) { // offset to top left
				x -= V.ctx.sat.tx;
				y -= V.ctx.sat.ty;
				COLOR.pick.sat( x, y );
			} else {
				COLOR.pick.hue( x, y );
			}
		}
	}
	, picker   : () => {
		$( '#colorpicker' ).removeClass( 'hide' ); // to get offset
		$( '#colorreset' ).toggleClass( 'hide', ! V.color.custom );
		$( 'body' ).css( 'overflow', 'hidden' );
		var $box        = $( '#box' );
		var box_margin  = parseInt( $box.css( 'margin' ) );
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' ).map( Number );
		var [ ty, tx ]  = Object.values( $( '#wheel' ).offset() );
		var wheel_c     = $( '#wheel' ).width() / 2;
		V.ctx           = {
			  context : $box[ 0 ].getContext( '2d', { willReadFrequently: true } )
			, hsl     : { h, s, l }
			, hsl_cur : { h, s, l } // for #colorcancel
			, sat     : {
				  tx     : tx + box_margin
				, ty     : ty + box_margin
				, margin : box_margin - $( '#sat' ).outerWidth() / 2
			}
			, width   : $box.width()
			, wheel   : { cx: tx + wheel_c, cy: ty + wheel_c }
		}
		COLOR.pick.gradient(); // sat box
		var h = V.ctx.hsl.h;
		var l = V.ctx.hsl.l / 100;
		var a = V.ctx.hsl.s / 100 * Math.min( l, 1 - l );
		var k, rgb, v;
		var [ r, g, b ] = ( () => { // hsl > rgb
			rgb = [];
			[ 0, 8, 4 ].forEach( n => {
				k = ( n + h / 30 ) % 12;
				v = l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
				rgb.push( Math.round( v * 255 ) );
			} );
			return rgb
		} )();
		var pb, pg, pr;
		match:
		for ( var y = 0; y < V.ctx.width; y++ ) { // find pixel with rgb +/- 1
			for ( var x = 0; x < V.ctx.width; x++ ) {
				[ pr, pg, pb ] = V.ctx.context.getImageData( x, y, 1, 1 ).data;
				if ( Math.abs( r - pr ) < 2 && Math.abs( g - pg ) < 2 && Math.abs( b - pb ) < 2 ) {
					COLOR.pick.rotate();
					COLOR.pick.point( x, y );
					V.ctx.x = x;
					V.ctx.y = y;
					break match;
				}
			}
		}
	}
	, save     : () => BASH( [ 'color', Object.values( V.ctx.hsl ).join( ' ' ), 'CMD HSL' ] )
}
var COVERART  = {
	  change  : () =>  {
		if ( V.playback ) {
			var src           = $COVERART.attr( 'src' );
			var path          = UTIL.dirName( S.file );
			var album         = S.Album;
			var artist        = S.Artist;
			var onlinefetched = $( '#divcover .cover-save' ).length;
		} else {
			var rsc           = $( '#liimg' ).attr( 'src' );
			var path          = $( '.licover .lipath' ).text();
			if ( path.split( '.' ).pop() === 'cue' ) path = UTIL.dirName( path );
			var album         = $( '.licover .lialbum' ).text();
			var artist        = $( '.licover .liartist' ).text();
			var onlinefetched = $( '.licover .cover-save' ).length;
		}
		var coverdefault = src.slice( 0, -13 ) === V.coverdefault;
		if ( coverdefault ) {
			if ( 'discid' in S ) {
				var file = '/srv/http/data/audiocd/'+ S.discid +'.jpg';
			} else {
				var file = '/mnt/MPD/'+ path +'/cover.jpg';
			}
		} else {
			var file = decodeURIComponent( src.slice( 0, -13 ) );
			if ( file.slice( 0, 4 ) !== '/srv' ) file = '/srv/http'+ file;
		}
		var embedded        = src.split( '/' )[ 3 ] === 'embedded' ? '(Embedded)' : '';
		var coverartlocal = ( V.playback && ! embedded && ! onlinefetched && ! coverdefault )
							|| ( V.library && ! embedded && ! onlinefetched && ! coverdefault )
							&& $( '#liimg' ).attr( 'src' ).slice( 0, 7 ) !== '/assets';
		INFO( {
			  icon        : V.icoverart
			, title       : 'Album Cover Art'
			, message     : '<img class="imgold" src="'+ src +'">'
						   +'<p class="infoimgname">'+ ICON( 'album wh' ) +' '+ album
						   +'<br>'+ ICON( 'artist wh' ) +' '+ artist +'</p>'
			, footer      : embedded
			, file        : { oklabel: ICON( 'flash' ) +'Replace', type: 'image/*' }
			, buttonlabel : ! coverartlocal ? '' : ICON( 'remove' ) +' Remove'
			, buttoncolor : ! coverartlocal ? '' : V.orange
			, button      : ! coverartlocal ? '' : () => {
				BASH( [ 'cmd-coverart.sh', 'reset', 'coverart', file, V.playback, 'CMD TYPE FILE CURRENT' ] );
				if ( V.playback ) COVERART.default();
			}
			, ok          : () => UTIL.imageReplace( 'coverart', file.slice( 0, -4 ) )
		} );
	}
	, default : () => {
		if ( D.vumeter ) return
		
		var hash = UTIL.versionHash();
		if ( ! D.covervu ) {
			$COVERART
				.attr( 'src', V.coverdefault + hash )
				.css( 'border', V.coverdefault === V.coverart ? 'none' : '' )
				.removeClass( 'hide' );
			$( '#vu' ).addClass( 'hide' );
		} else {
			$COVERART
				.addClass( 'hide' )
				.attr( 'src', V.coverdefault + hash );
			$( '#vu' ).removeClass( 'hide' );
			PLAYBACK.vu();
		}
	}
	, onError : () => {
		document.addEventListener( 'error', function( e ) { // img error - faster than exist checked on server
			if ( e.target.tagName !== 'IMG' ) return
			
			var $img = $( e.target );
			var src  = $img.attr( 'src' );
			var ext  = src.slice( -16, -13 );
			if ( ext === 'jpg' ) {
				$img.attr( 'src', src.replace( 'jpg?v=', 'png?v=' ) );
			} else if ( ext === 'png' ) {
				$img.attr( 'src', src.replace( 'png?v=', 'gif?v=' ) );
			} else if ( I.active ) {
				var icon = I.icon === 'bookmark' ? 'bookmark' : $LI.find( '.li-icon' )[ 0 ].classList[ 0 ].slice( 2 );
				$img.replaceWith( ICON( icon +' msgicon' ) );
			} else if ( V.playback ) {
				$img.attr( 'src', V.coverart );
			} else if ( V.playlist ) {
				var icon = $img.parent()[ 0 ].classList[ 0 ];
				$img.replaceWith( '<i class="i-'+ icon +' li-icon" data-menu="filesavedpl"></i>' );
			} else { // lib-list (home - already exist checked)
				if ( MODE.album() ) {
					$img.attr( 'src', V.coverart );
				} else if ( ! MODE.radio() ) {
					$img.replaceWith( '<i class="i-folder li-icon" data-menu="folder"></i>' );
				} else {
					var dir = $img.parent().hasClass( 'dir' );
					var icon = dir ? 'folder' : V.mode;
					var menu = dir ? 'wrdir' : 'webradio';
					$img.replaceWith( '<i class="i-'+ icon +' li-icon" data-menu="'+ menu +'"></i>' );
				}
			}
		}, true ); // useCapture (from parent > target - img onerror not bubble)
	}
	, save    : () => {
		if ( V.playback ) {
			var src    = $COVERART.attr( 'src' );
			var file   = S.file;
			var path   = '/mnt/MPD/'+ UTIL.dirName( file );
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
			if ( path.slice( -4 ) === '.cue' ) path = UTIL.dirName( path );
			var icon          = 'coverart';
			var title         = 'Save Album Cover Art';
			INFO( {
				  icon    : icon
				, title   : title
				, message :  '<img class="infoimgnew" src="'+ base64 +'">'
							+'<p class="infoimgname">'+ ICON( 'folder' ) +' '+ album
							+'<br>'+ ICON( 'artist' ) +' '+ artist +'</p>'
				, ok      : () => {
					UTIL.imageReplace( 'coverart', path +'/cover' );
					BANNER( icon, title, 'Save ...' );
				}
			} );
		}
	}
}
var DISPLAY   = {
	  bars       : () => {
		if ( ! $( '#bio' ).hasClass( 'hide' ) ) return
		
		var smallscreen = V.wH < 590 || V.wW < 500;
		var lcd         = ( V.wH <= 320 && V.wW <= 480 ) || ( V.wH <= 480 && V.wW <= 320 );
		if ( ! D.bars || ( smallscreen && ! D.barsalways ) || lcd ) {
			$( '#bar-top' ).addClass( 'hide' );
			$( '#bar-bottom' ).addClass( V.touch ? 'hide' : 'transparent' );
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
		DISPLAY.bottom();
		if ( UTIL.barVisible() ) DISPLAY.controls();
	}
	, bottom     : () => {
		$( '#playback' )
			.removeAttr( 'class' )
			.addClass( 'i-'+ S.player );
		$( '#bar-bottom i' ).removeClass( 'active' );
		$( '#'+ V.page ).addClass( 'active' );
	}
	, controls   : () => {
		var mpd_upnp = [ 'mpd', 'upnp' ].includes( S.player );
		var noprevnext = S.pllength < 2 || ! mpd_upnp;
		$( '#playback-controls' ).toggleClass( 'hide', S.pllength === 0 );
		$( '#previous, #next' ).toggleClass( 'hide', noprevnext );
		$( '#pause' ).toggleClass( 'hide', S.webradio );
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#'+ ( S.state || 'stop' ) ).addClass( 'active' );
		$( '#coverL, #coverR' ).toggleClass( 'disabled', noprevnext );
	}
	, guideHide  : () => {
		if ( V.guide ) {
			V.guide        = false;
			var barvisible = UTIL.barVisible();;
			$( '#coverTR' ).toggleClass( 'empty', S.pllength === 0 && ! barvisible && S.player === 'mpd' );
			$( '.divmap' ).removeClass( 'mapshow' );
			$( '#bar-bottom' ).removeClass( 'translucent' );
			if ( ! barvisible ) $( '#bar-bottom' ).addClass( 'transparent' );
			$( '.band, #volbar' ).addClass( 'transparent' );
			$( '.guide, #volume-bar, #volume-bar-point, #volume-band-level' ).addClass( 'hide' );
		}
	}
	, keyValue   : type => {
		var json   = DISPLAY.option.list[ type ];
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
	, option     : {
		  library       : () => {
			var kv = DISPLAY.keyValue( 'library' );
			INFO( {
				  icon         : 'library'
				, title        : 'Library'
				, tablabel     : [ 'Show', 'Options' ]
				, tab          : [ '', DISPLAY.option.libraryOption ]
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
				, ok           : DISPLAY.save
			} );
		}
		, libraryOption : () => {
			var kv = DISPLAY.keyValue( 'libraryoption' );
			INFO( {
				  icon         : 'library'
				, title        : 'Library'
				, tablabel     : [ 'Show', 'Options' ]
				, tab          : [ DISPLAY.option.library, '' ]
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
				, ok           : DISPLAY.save
			} );
		}
		, list          : {
			  library       : {
				  album          : ICON( 'album' ) +'<gr>Album</gr>'
					, nas        : ICON( 'networks' ) +'<gr>NAS</gr>'
				, albumartist    : ICON( 'albumartist' ) +'<gr>Album Artist</gr>'
					, sd         : ICON( 'microsd' ) +'<gr>SD</gr>'
				, artist         : ICON( 'artist' ) +'<gr>Artist</gr>'
					, usb        : ICON( 'usbdrive' ) +'<gr>USB</gr>'
				, composer       : ICON( 'composer' ) +'<gr>Composer</gr>'
					, playlists  : ICON( 'playlists' ) +'<gr>Playlists</gr>'
				, conductor      : ICON( 'conductor' ) +'<gr>Conductor</gr>'
					, webradio   : ICON( 'webradio' ) +'<gr>Web Radio</gr>'
				, date           : ICON( 'date' ) +'<gr>Date</gr>'
					, '-'        : ''
				, genre          : ICON( 'genre' ) +'<gr>Genre</gr>'
					, count      : 'Count'
				, latest         : ICON( 'latest' ) +'<gr>Latest</gr>'
					, label      : 'Label'
			}
			, libraryoption : {
				  albumbyartist  : ICON( 'album' ) +'Sort by artist'
				, albumyear      : ICON( 'album' ) +'Sort by artist > year'
				, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;'+ ICON( 'play-plus infomenusub' ) +'<gr>Add + Play</gr>'
				, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;'+ ICON( 'play-replace infomenusub' ) +'<gr>Replace + Play</gr>'
				, playbackswitch : 'Switch to Playback <gr>on '+ ICON( 'play-plus infomenusub' ) +'or '+ ICON( 'play-replace infomenusub' )
				, backonleft     : ICON( 'back bl' ) +'Back button on left side'
				, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
				, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
			}
			, playback      : {
				  bars             : 'Top-Bottom bars'
					, barsalways   : 'Bars always on'
				, time             : 'Time'
					, radioelapsed : 'Web Radio elapsed'
				, cover            : 'Cover art'
					, covervu      : '<img class="imgicon" src="'+ V.covervu +'"> As default'
				, volume           : 'Volume'
					, vumeter      : '<img class="imgicon" src="'+ V.covervu +'"> VU meter'
				, buttons          : 'Buttons'
					, progress     : 'Progress keep-alive'
				, composername     : ICON( 'composer' ) +'<gr>Composer</gr>'
					, '-'              : ''
				, conductorname     : ICON( 'conductor' ) +'<gr>Conductor</gr>'
			}
			, playlist      : {
				  plclear        : 'Confirm <gr>on</gr> <a class="infomenu">'+ ICON( 'replace' ) +'Replace'+ ICON( 'play-replace sub' ) + '<a>'
				, plsimilar      : 'Confirm <gr>on</gr> <a class="infomenu">'+ ICON( 'lastfm' ) +'Add similar</a>'
				, audiocdplclear : 'Clear on '+ ICON( 'audiocd' ) +'Audio CD load'
			}
		}
		, playback      : () => {
			if ( 'coverTL' in V ) $( '#coverTL' ).trigger( 'click' );
			var kv = DISPLAY.keyValue( 'playback' );
			INFO( {
				  icon         : 'playback'
				, title        : 'Playback'
				, message      : 'Show:<span style="margin-left: 117px">Options:</span>'
				, messagealign : 'left'
				, list         : kv.list
				, values       : kv.values
				, checkchanged : true
				, beforeshow   : () => {
					var $chk = $( '#infoList input' );
					var $el  = {}
					kv.keys.forEach( ( k, i ) => $el[ k ] = $chk.eq( i ) );
					function restoreEnabled() {
						var list = [ 'time', 'cover', 'covervu', 'vumeter', 'volume' ];
						if ( D.volumenone ) list.pop();
						list.forEach( el => $el[ el ].prop( 'disabled', false ) );
					}
					function tcvValue() {
						return {
							  time   : $el.time.prop( 'checked' )
							, cover  : $el.cover.prop( 'checked' )
							, volume : $el.volume.prop( 'checked' )
						}
					}
					if ( D.volumenone ) $el.volume.prop( 'disabled', true ).prop( 'checked', false );
					$el.bars.on( 'input', function() {
						if ( $( this ).prop( 'checked' ) ) {
							$el.barsalways.prop( 'disabled', false );
						} else {
							$el.barsalways
								.prop( 'checked', false )
								.prop( 'disabled', true );
						}
					} );
					$el.time.on( 'input', function() {
						var tcv = tcvValue();
						if ( ! tcv.time ) {
							if ( tcv.cover ) {
								if ( ! tcv.volume ) $el.cover.prop( 'disabled', true );
							} else {
								$el.volume.prop( 'disabled', true );
							}
						} else {
							restoreEnabled();
						}
					} );
					$el.cover.on( 'input', function() {
						var tcv = tcvValue();
						if ( ! tcv.cover ) {
							if ( tcv.time ) {
								if ( ! tcv.volume ) $el.time.prop( 'disabled', true );
							} else {
								$el.volume.prop( 'disabled', true );
							}
							[ 'covervu', 'vumeter' ].forEach( el => {
								$el[ el ]
									.prop( 'checked', false )
									.prop( 'disabled', true );
							} );
						} else {
							restoreEnabled();
						}
					} );
					$el.volume.on( 'input', function() {
						var tcv = tcvValue();
						if ( ! tcv.volume ) {
							if ( tcv.cover ) {
								if ( ! tcv.time ) $el.cover.prop( 'disabled', true );
							} else {
								$el.time.prop( 'disabled', true );
							}
						} else {
							restoreEnabled();
						}
					} );
					$el.covervu.on( 'input', function() {
						if ( $( this ).prop( 'checked' ) ) $el.vumeter.prop( 'checked', false );
					} );
					$el.vumeter.on( 'input', function() {
						if ( $( this ).prop( 'checked' ) ) $el.covervu.prop( 'checked', false );
					} );
				}
				, ok           : DISPLAY.save
			} );
		}
		, playlist      : () => {
			if ( 'coverTL' in V ) $( '#coverTL' ).trigger( 'click' );
			var kv = DISPLAY.keyValue( 'playlist' );
			INFO( {
				  icon         : 'playlist'
				, title        : 'Playlist'
				, message      : 'Options:'
				, messagealign : 'left'
				, list         : kv.list
				, values       : kv.values
				, checkchanged : true
				, ok           : DISPLAY.save
			} );
		}
	}
	, library    : () => {
		$( '#lib-mode-list, #search-list' ).css( 'padding-top', UTIL.barVisible( '', 50 ) )
		LIBRARY.order();
		DISPLAY.pageScroll( V.modescrolltop );
		$( '.mode.dabradio' ).toggleClass( 'hide', C.dabradio === 0 );
		$( '.mode:not( .bookmark )' ).each( ( i, el ) => {
			var $this = $( el );
			var mode  = $this.data( 'mode' );
			var count = C[ mode ];
			$this
				.toggleClass( 'hide', ! D[ mode ] )
				.toggleClass( 'nodata', ! count );
			var $gr   = $this.find( 'gr' );
			if ( $gr.length ) $gr.html( count ? count.toLocaleString() : '' );
		} );
		$( '.mode gr' ).toggleClass( 'hide', ! D.count );
		$( '.mode .label' ).toggleClass( 'hide', ! D.label );
	}
	, pageScroll : top => setTimeout( () => $( 'html, body' ).scrollTop( top ), 0 )
	, playback   : () => {
		$TIME.toggleClass( 'hide', ! D.time );              // #time hidden on load - set before get :hidden
		var hidetime   = ! D.time || ! PROGRESS.visible(); // #time hidden by css on small screen
		var hidevolume = ! D.volume || D.volumenone;
		$VOLUME.toggleClass( 'hide', hidevolume );
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
		$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', ! hidetime );
		$( '#time-band' ).toggleClass( 'disabled', S.pllength === 0 || S.webradio || S.player !== 'mpd' );
		$( '#time' ).toggleClass( 'disabled', S.webradio || ! [ 'mpd', 'upnp' ].includes( S.player ) );
		$( '.volumeband' ).toggleClass( 'disabled', D.volumenone || VOLUME.visible() );
		$( '#map-time' ).toggleClass( 'hide', D.cover );
		$( '#button-time, #button-volume' ).toggleClass( 'hide', ! D.buttons );
		$( '#playback-row' ).css( 'align-items', D.buttons ? '' : 'center' );
	}
	, save       : () => {
		var values  = _INFO.val();
		[ 'library', 'libraryoption', 'playback', 'playlist' ].forEach( chk => {
			$.each( DISPLAY.option.list[ chk ], ( k, v ) => {
				if ( ! ( k in values ) && k !== '-' ) values[ k ] = D[ k ];
			} );
		} );
		if ( values.tapreplaceplay ) values.plclear = false;
		COMMON.json.save( 'display', values );
		BASH( [ 'display' ] );
	}
	, subMenu    : () => {
		$( '#dsp' )
			.toggleClass( 'i-camilladsp', D.camilladsp )
			.toggleClass( 'i-equalizer', D.equalizer );
		D.dsp = D.camilladsp || D.equalizer;
		[ 'dsp', 'lock', 'multiraudio', 'relays', 'snapclient' ].forEach( el => {
			var enabled = D[ el ];
			$( '#'+ el )
				.toggleClass( 'hide', ! enabled )
				.prev().toggleClass( 'sub', enabled );
		} ); // submenu toggled by css .settings + .submenu
		if ( V.localhost ) $( '#power' ).addClass( 'sub' );
	}
}
var EQ        = {
	  flat   : new Array( 10 ).fill( 62 )
	, freq   : [ 31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ]
	, bands  : []
	, bottom : ICON( 'edit', 'eqedit' )
			 + ICON( 'save disabled hide', 'eqsave' )
			 +'<div id="divpreset"><select id="eqpreset">PRESETS</select><input id="eqname" type="text" class="hide"></div>'
			 + ICON( 'add', 'eqnew' ) + ICON( 'back bl hide', 'eqback' )
	, level : () => {
		E.preset[ E.active ].forEach( ( v, i ) => $( '#eq .label.dn a' ).eq( i ).text( v - 62 ) );
	}
}
EQ            = {
	  ...EQ
	, bands : ( () => {
		var bands = [];
		EQ.freq.forEach( ( hz, i ) => {
			var band = hz < 1000 ? hz +' Hz' : ( hz / 1000 ) +' kHz';
			bands.push( '0'+ i +'. '+ band );
		} );
		return bands
	} )()
	, info  : data => {
		E = data;
		EQ.user  = [ 'airplay', 'spotify' ].includes( S.player ) ? 'root' : 'mpd';
		var opt  = COMMON.select.option( Object.keys( E.preset ) );
		INFO( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, list       : COMMON.eq.html( 42, 82, EQ.freq, EQ.bottom.replace( 'PRESETS', opt ) )
			, values     : [ ...E.preset[ E.active ], E.active ]
			, beforeshow : () => {
				COMMON.eq.beforShow( {
					  init  : () => {
						EQ.level();
						$( '#eqedit' ).toggleClass( 'disabled', Object.keys( E.preset ).length === 1 );
					}
					, input : ( i, v ) => {
						BASH( [ 'equalizerset', EQ.bands[ i ], v, EQ.user, 'CMD BAND VAL USR' ] );
						$( '#eq .label.dn a' ).eq( i ).text( v - 62 );
					}
					, end   : () => {
						if ( E.active === 'Flat' ) {
							for ( var i = 1; i < 10; i++ ) {
								var name = 'New '+ i;
								if ( ! ( name in E.preset ) ) break;
							}
							E.active         = name;
							E.preset[ name ] = EQ.flat;
						}
						E.preset[ E.active ] = _INFO.val().slice( 0, 10 );
						$( '#eqedit' ).removeClass( 'disabled' );
						$( '#eqpreset' ).html( COMMON.select.option( Object.keys( E.preset ) ) );
						I.values = [ ...E.preset[ E.active ], E.active ];
						_INFO.setValues();
						COMMON.select.set();
						COMMON.json.save( 'equalizer', E );
					}
				} );
			}
			, cancel     : () => E = {}
			, okno       : true
		} );
	}
}
var FILEIMAGE = {
	  get    : () => {
		$( '#infoButton a' ).addClass( 'disabled' );
		$( '#infoFileLabel i' ).addClass( 'blink' );
		delete I.infofilegif;
		I.rotate   = 0;
		$( '.infoimgname' ).addClass( 'hide' );
		$( '.infoimgnew, .infoimgwh' ).remove();
		if ( I.infofile.name.slice( -3 ) !== 'gif' ) {
			FILEIMAGE.reader();
		} else { // animated gif or not
			var formdata = new FormData();
			formdata.append( 'cmd', 'giftype' );
			formdata.append( 'file', I.infofile );
			fetch( 'cmd.php', { method: 'POST', body: formdata } )
				.then( response => response.json() ) // set response data as json > animated
				.then( animated => { // 0 / 1
					if ( animated ) {
						I.infofilegif = '/srv/http/data/shm/local/tmp.gif';
						var img    = new Image();
						img.src    = URL.createObjectURL( I.infofile );
						img.onload = function() {
							var imgW   = img.width;
							var imgH   = img.height;
							var resize = FILEIMAGE.resize( 'gif', imgW, imgH );
							FILEIMAGE.render( img.src, imgW +' x '+ imgH, resize ? resize.wxh : '' );
							BANNER_HIDE();
						}
					} else {
						FILEIMAGE.reader();
					}
				} );
		}
	}
	, reader : () => {
		var maxsize   = ( V.library && V.libraryhome ) ? 200 : 1000;
		var reader    = new FileReader();
		reader.onload = function( e ) {
			var img    = new Image();
			img.src    = e.target.result;
			img.onload = function() {
				var imgW          = img.width;
				var imgH          = img.height;
				var filecanvas    = document.createElement( 'canvas' );
				var ctx           = filecanvas.getContext( '2d' );
				filecanvas.width  = imgW;
				filecanvas.height = imgH;
				ctx.drawImage( img, 0, 0 );
				var resize = FILEIMAGE.resize( 'jpg', imgW, imgH );
				if ( resize ) {
					var canvas    = document.createElement( 'canvas' );
					canvas.width  = resize.w;
					canvas.height = resize.h;
					var option    = {
						  unsharpAmount    : 100  // 0...500 Default: 0 (try 50-100)
						, unsharpThreshold : 5    // 0...100 Default: 0 (try 10)
						, unsharpRadius    : 0.6
//						, quality          : 3    // 0...3   Default: 3 (Lanczos win)
//						, alpha            : true //         Default: false (black crop background)
					}
					pica.resize( filecanvas, canvas, option ).then( function() {
						FILEIMAGE.render( canvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH, resize.wxh );
					} );
				} else {
					FILEIMAGE.render( filecanvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH );
				}
				BANNER_HIDE();
			}
		}
		reader.readAsDataURL( I.infofile );
		$( '#infoList' )
			.off( 'click', '.infoimgnew' )
			.on( 'click', '.infoimgnew', function() {
			if ( ! $( '.infomessage .rotate' ).length ) return
			
			I.rotate     += 90;
			if ( I.rotate === 360 ) I.rotate = 0;
			var canvas    = document.createElement( 'canvas' );
			var ctx       = canvas.getContext( '2d' );
			var image     = $( this )[ 0 ];
			var img       = new Image();
			img.src       = image.src;
			img.onload    = function() {
				ctx.drawImage( image, 0, 0 );
			}
			var w         = img.width;
			var h         = img.height;
			var cw        = Math.round( w / 2 );
			var ch        = Math.round( h / 2 );
			canvas.width  = h;
			canvas.height = w;
			ctx.translate( ch, cw );
			ctx.rotate( Math.PI / 2 );
			ctx.drawImage( img, -cw, -ch );
			image.src     = canvas.toDataURL( 'image/jpeg' );
		} );
	}
	, render : ( src, original, resize ) => {
		$( '.infomessage .imgnew' ).remove();
		$( '.infomessage' ).append(
			 '<span class="imgnew">'
				+'<img class="infoimgnew" src="'+ src +'">'
				+'<div class="infoimgwh">'
				+ ( resize ? resize : '' )
				+ ( original ? 'original: '+ original : '' )
				+ ( src.slice( 0, 4 ) === 'blob' ? '' : '<br>'+ ICON( 'redo rotate' ) +'Tap to rotate' )
				+'</div>'
			+'</span>'
		);
		$( '#infoButton a' ).removeClass( 'disabled blink' );
		$( '#infoFileLabel i' ).removeClass( 'blink' );
	}
	, resize : ( ext, imgW, imgH ) => {
		var maxsize = ( V.library && V.libraryhome ) ? 200 : ( ext === 'gif' ? 600 : 1000 );
		if ( imgW > maxsize || imgH > maxsize ) {
			var w = imgW > imgH ? maxsize : Math.round( imgW / imgH * maxsize );
			var h = imgW > imgH ? Math.round( imgH / imgW * maxsize ) : maxsize;
			return {
				  w   : w
				, h   : h
				, wxh : w +' x '+ h
			}
		}
	}
}
var LIBRARY   = {
	  addReplace : () => {
		V.mpccmd    = [ 'mpcadd', $LI.find( '.lipath' ).text() ];
		V.action    = D.tapaddplay ? 'addplay' : 'replaceplay';
		V.list.name = $LI.find( '.name' ).text()
		PLAYLIST.addCommand();
	}
	, coverart   : () => {
		if ( D.hidecover ) {
			$( '.licover' ).addClass( 'hide' );
			$( '#lib-list li' ).eq( 1 ).removeClass( 'track1' );
			if ( MODE.album() ) $( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
		} else {
			$( '.licover' )
				.removeClass( 'hide' )
				.toggleClass( 'nofixed', ! D.fixedcover );
			$( '#lib-list li' ).eq( 1 ).toggleClass( 'track1', D.fixedcover );
			$( '#liimg' ).on( 'error', function() {
				$( this ).attr( 'src', V.coverdefault );
			} );
			$( '.liinfo .lialbum' ).toggleClass( 'hide', MODE.album() );
		}
	}
	, get        : () => {
		V.html.librarylist = '';
		LIST( { library: 'home' }, function( data ) {
			O = { modes: data.modes, order: data.order };
			[ 'nas', 'sd', 'usb' ].forEach( k => { C[ k ] = data.lsmnt[ k ] } );
			if ( data.html !== V.html.library ) V.html.library = data.html;
			if ( ! $( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
			if ( V.library ) {
				if ( V.librarylist ) V.scrolltop[ $( '#lib-path' ).text() ] = $( window ).scrollTop();
				LIBRARY.home( data.html );
			} else {
				UTIL.switchPage( 'library' );
				if ( S.updating_db ) BANNER( 'refresh-library blink', 'Library Database', 'Update ...' );
			}
			if ( V.color ) $( '.mode.webradio' ).trigger( 'click' );
		}, 'json' );
	}
	, home       : html => { // V.libraryhome
		V.libraryhome = true;
		V.search      = false;
		V.mode        = '';
		[ 'albumlist', 'librarylist', 'librarytrack', 'search' ].forEach( k => V[ k ] = false );
		V.query       = [];
		var title     = 'LIBRARY';
		if ( C.song ) title += ' <a>'+ C.song.toLocaleString() + ICON( 'music' ) +'</a>';
		$( '#lib-mode-list' ).html( UTIL.htmlHash( html ) ).promise().done( () => {
			DISPLAY.library();
			COMMON.draggable( 'lib-mode-list' );
		} );
		$( '#lib-home-title' ).html( title );
		$( '#lib-path' ).empty()
		$( '#lib-home-title, #button-lib-search, #button-lib-update' ).removeClass( 'hide' );
		$( '#lib-title, #lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
		$( '#lib-search-close' ).empty();
		$( '#lib-search-input' ).val( '' );
		$( '#page-library .content-top, #page-library .search, #lib-list' ).addClass( 'hide' );
		$( '#page-library .content-top, #lib-mode-list, #search-list' ).removeClass( 'hide' );
		$( '#lib-list, #page-library .index, #search-list' ).remove();
	}
	, list       : data => { // V.librarylist / V.librarytrack
		if ( ! V.search ) {
			V.libraryhome = false;
			V.librarylist = true;
			if ( data.html === V.html.librarylist ) {
				if ( V.color ) COLOR.liActive();
				return
			}
		}
		
		V.html.librarylist = data.html;
		$( '#lib-home-title, #lib-mode-list, .menu, #button-lib-update' ).addClass( 'hide' );
		$( '#button-lib-back' ).removeClass( 'hide' );
		$( '#lib-path' ).text( data.path );
		if ( data.modetitle.toLowerCase() === V.mode ) {
			data.modetitle = data.modetitle
									.replace( 'MARTIST', 'M ARTIST' )
									.replace( 'BRADIO', 'B RADIO' );
		}
		if ( 'count' in data && V.mode !== 'latest' ) {
			$( '#lib-list' ).css( 'width', '100%' );
			var htmlpath = '';
		} else if ( data.path === '/srv/http/data/'+ V.mode ) { // radio root
			var htmlpath = ICON( V.mode ) + data.modetitle;
		} else if ( ! MODE.file( '+radio' ) ) {
			var htmlpath = ICON( V.search ? 'search' : V.mode ) + data.modetitle;
		} else if ( data.path ) { // dir breadcrumbs
			var dir      = data.path.split( '/' );
			var dir0     = dir[ 0 ];
			var htmlpath = ICON( V.mode );
			htmlpath    += '<a>'+ dir0 +' / <span class="lidir">'+ dir0 +'</span></a>';
			var lidir    = dir0;
			var iL       = dir.length;
			for ( var i = 1; i < iL; i++ ) {
				lidir    += '/'+ dir[ i ];
				htmlpath += '<a>'+ dir[ i ] +' / <span class="lidir">'+ lidir +'</span></a>';
			}
		}
		if ( V.mode === 'webradio' ) {
			htmlpath += ICON( 'add btntitle button-webradio-new' );
		} else if ( V.mode === 'latest' ) {
			htmlpath += ICON( 'flash btntitle button-latest-clear' );
		}
		$( '#lib-title' )
			.html( '<span id="mode-title">'+ htmlpath +'</span>' )
			.removeClass( 'hide' )
			.toggleClass( 'path', $( '#lib-title a' ).length > 0 );
		if ( MODE.radio () ) $( '#lib-title a' ).slice( 0, 4 ).remove();
		$( '#lib-list, #page-library .index' ).remove();
		if ( ! data.html ) return // empty list
		
		var html = UTIL.htmlHash( data.html );
		$( '#lib-mode-list' ).after( html ).promise().done( () => {
			V.albumlist = MODE.album();
			if ( $( '#lib-list' ).hasClass( 'track' ) ) {
				V.librarytrack = true;
				if ( $( '#liimg' ).attr( 'src' ).slice( 0, 16 ) === '/data/shm/online' ) $( '.licoverimg ' ).append( V.icoversave );
			} else {
				V.librarytrack = false;
				if ( V.albumlist ) $( '#lib-list' ).addClass( 'album' );
			}
			$( '.liinfopath' ).toggleClass( 'hide', MODE.file( '+radio' ) );
			if ( V.albumlist ) {
				if ( $( '.licover' ).length ) {
					$( '.liinfo .lialbum' ).addClass( 'hide' );
				} else {
					$( '#lib-list img' ).eq( 0 ).on( 'load', function() {
						$( '#mode-title' ).append( '<span id="thumbupdate"><img src="'+ $( this ).attr( 'src' ) +'"><i class="i-refresh-overlay"></i></span>' );
					} );
				}
				if ( V.iactive ) $( '#lib-list .coverart' ).eq( V.iactive ).addClass( 'active' );
			} else if ( V.librarytrack ) {
				LIBRARY.coverart();
			}
			$( '#lib-search, #button-lib-search, #search-list' ).addClass( 'hide' );
			DISPLAY.pageScroll( V.scrolltop[ data.path ] || 0 );
			LIBRARY.padding();
			if ( V.color ) COLOR.liActive();
		} );
	}
	, order      : () => {
		if ( O.order === false ) return
		
		$list = $( '#lib-mode-list' );
		$bk   = $( '.mode.bookmark' );
		O.order.forEach( mode => {
			if ( O.modes.includes( mode ) ) {
				$list.append( $( '.mode.'+ mode ) );
			} else {
				$bk.filter( ( i, el ) => {
					var $el = $( el );
					var cl  = $el.hasClass( 'bkradio' ) ? '.name' : '.lipath';
					if ( $el.find( cl ).text() === mode ) {
						$list.append( $el );
						return false
					}
				} );
			}
		} );
	}
	, padding    : () => {
		var padding = UTIL.barVisible( 129, 89 );
		if ( V.librarytrack ) {
			if ( D.fixedcover && V.wH > 734 ) padding += 230;
		} else if ( MODE.album() ) {
			padding += $( '.coverart' ).height() - 49;
		}
		var $list = V.search ? $( '#search-list' ) : $( '#lib-list' );
		$list.css( {
			  'padding-bottom' : 'calc( 100vh - '+ padding +'px )'
			, 'width'          :  V.librarytrack ? '100%' : ''
		} );
	}
}
var LYRICS    = {
	  fetch        : refresh => {
		BANNER( 'lyrics blink', 'Lyrics', 'Fetch ...', -1 );
		var artist = LYRICS.plain( V.lyricsartist );
		var title  = LYRICS.plain( V.lyricstitle );
		BASH( [ 'lyrics', artist, title, S.file, refresh || '', 'CMD ARTIST TITLE FILE ACTION' ], data => {
			LYRICS.show( data );
			BANNER_HIDE();
			$( '#lyricsrefresh' ).removeClass( 'blink' );
		} );
	}
	, get          : ( artist, title ) => {
		V.lyricsartist = artist || S.Artist;
		V.lyricstitle  = title || S.Title;
		if ( $( '#lyricstitle' ).text() === V.lyricstitle && $( '#lyricsartist' ).text() === V.lyricsartist ) {
			$( '#lyrics' ).removeClass( 'hide' );
			$( '#lyricstext' )
				.scrollTop( 0 )
				.trigger( 'focus' );
			return
		}
		
		LYRICS.fetch();
	}
	, hide         : () => {
		$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
		$( '#lyricseditbtngroup' ).addClass( 'hide' );
		$( '#lyrics' ).addClass( 'hide' );
	}
	, plain : str => str.normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' )
	, show         : data => {
		V.lyrics       = data;
		var lyricshtml = data ? data.replace( /\n/g, '<br>' ) +'<br><br><br>·&emsp;·&emsp;·' : '<gr>(Lyrics not available.)</gr>';
		$( '#divlyricstitle img' ).attr( 'src', $COVERART.attr( 'src' ) );
		$( '#lyricstitle' ).text( V.lyricstitle );
		$( '#lyricsartist' ).text( V.lyricsartist );
		$( '#lyricstext' ).html( lyricshtml );
		if ( UTIL.barVisible() ) {
			$( '#lyrics' ).css( { top: '', height: '' } )
		} else {
			$( '#lyrics' ).css( { top: 0, height: '100vh' } )
		}
		$( '#lyrics' ).removeClass( 'hide' );
		$( '#lyricstext' ).scrollTop( 0 );
		BANNER_HIDE();
	}
}
var MENU      = {
	  hide     : () => {
		$( '.menu' ).addClass( 'hide' );
		$( '.contextmenu ' ).find( 'a, i' ).removeClass( 'hide' );
		$( '#lib-list li, #pl-savedlist li, #search-list li' ).removeClass( 'active' );
		$( '#pl-list li' ).removeClass( 'updn' );
	}
	, library  : $target => {
		if ( $LI.hasClass( 'active' ) ) {
			$LI.removeClass( 'active' );
			MENU.hide();
			return
		}
		
		MENU.hide();
		var mode           = V.search ? $LI.data( 'mode' ) : V.mode;
		var $menu          = $( '#menu-'+ $LI.find( '.li-icon' ).data( 'menu' ) );
		V.list             = {};
		V.list.licover     = $LI.hasClass( 'licover' );
		V.list.singletrack = ! V.list.licover && $LI.find( '.li-icon' ).hasClass( 'i-music' );
		// file modes  - path > path ... > tracks
		// album mode  - path > tracks
		// other modes - name > name-album > filtered tracks
		V.list.path        = $LI.find( '.lipath' ).text() || $( '#mode-title' ).text();
		if ( V.librarytrack && ! V.list.licover && $LI.find( '.li1' ).length ) {
			V.list.name = $LI.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		} else {
			V.list.name = $LI.find( '.name' ).text() || V.list.path;
		}
		V.list.track = $LI.data( 'track' ) || '';  // cue - in contextmenu
		if ( ( D.tapaddplay || D.tapreplaceplay )
			&& ! $target.hasClass( 'li-icon' )
			&& ! V.list.licover
			&& S.player === 'mpd'
		) {
			var i = D.tapaddplay ? 0 : 1;
			$menu.find( '.submenu' ).eq( i ).trigger( 'click' );
			$LI.addClass( 'active' );
			return
		}
		if ( $LI.hasClass( 'nodata' ) ) {
			$menu.find( 'a, .submenu' ).addClass( 'hide' );
			$menu.find( '.exclude, .update' ).removeClass( 'hide' );
		} else {
			var album_file_radio = [ 'album', 'latest', 'nas', 'sd', 'usb', 'webradio', 'dabradio' ].includes( mode );
			var librarytrack     = V.librarytrack && $( '#lib-title a' ).length > 0;
			$menu.find( '.playnext, .replace, .wrreplace, .i-play-replace' ).toggleClass( 'hide', S.pllength === 0 );
			$menu.find( '.playnext' ).toggleClass( 'hide', S.state !== 'play' );
			$menu.find( '.update' ).toggleClass( 'hide', ! ( 'updating_db' in S ) );
			$menu.find( '.bookmark, .exclude, .update, .thumb' ).toggleClass( 'hide', ! album_file_radio );
			$menu.find( '.thumbnail' ).toggleClass( 'hide', V.list.licover );
			$menu.find( '.directory' ).toggleClass( 'hide', librarytrack );
			$menu.find( '.tag' ).toggleClass( 'hide', ! librarytrack );
			$menu.find( '.wredit' ).toggleClass( 'hide', mode !== 'webradio' );
			$menu.find( '.wrdirrename' ).toggleClass( 'hide', mode.slice( -5 ) !== 'radio' );
			$menu.find( '.update, .tag' ).toggleClass( 'disabled', S.updating_db );
		}
		$LI.siblings( 'li' ).removeClass( 'active' );
		$LI.addClass( 'active' );
		if ( V.list.licover ) {
			var menutop = UTIL.barVisible( 310, 270 );
		} else {
			var menutop = $LI.offset().top + 48;
		}
		MENU.scroll( $menu, menutop );
		if ( ! MODE.file() || $LI.hasClass( 'nodata' ) ) return
		
		BASH( [ 'mpcls', V.list.path, 'CMD DIR' ], function( data ) {
			if ( ! data ) {
				$LI.addClass( 'nodata' );
				MENU.library( $target );
			}
		}, 'json' );
	}
	, playlist : $target => {
		$LI           = $target.closest( 'li' );
		var webradio  = $LI.hasClass( 'webradio' );
		V.list        = {};
		V.list.path   = $LI.find( '.lipath' ).text();
		V.list.name   = $LI.find( webradio ? '.liname' : '.name' ).eq( 0 ).text();
		V.list.index  = $LI.index();
		var $menu = $( '#menu-plaction' );
		var menushow  = ! $menu.hasClass( 'hide' );
		var updn = $LI.hasClass( 'updn' );
		MENU.hide();
		$( '.pl-remove' ).remove();
		if ( menushow && updn ) return
		
		var state     = S.state;
		var play      = state === 'play';
		var active    = $LI.hasClass( 'active' );
		var audiocd   = $LI.hasClass( 'audiocd' );
		var notsaved  = $LI.hasClass( 'notsaved' );
		var upnp      = $LI.hasClass( 'upnp' );
		$LI.addClass( 'updn' );
		$( '#menu-plaction a' ).removeClass( 'hide' );
		$menu.find( '.current' ).toggleClass( 'hide', active || play );
		if ( S.player === 'mpd' || S.player === 'upnp' ) {
			if ( active ) {
				$menu.find( '.play' ).toggleClass( 'hide', play );
				$menu.find( '.pause' ).toggleClass( 'hide', ! play || webradio );
				$menu.find( '.stop' ).toggleClass( 'hide', state === 'stop' );
			} else {
				$menu.find( '.pause, .stop' ).addClass( 'hide' );
			}
		} else {
			$menu.find( '.pause, .stop, .current' ).addClass( 'hide' );
		}
		var singletrack = S.pllength < 2;
		$menu.find( '.savedpladd' ).toggleClass( 'hide', audiocd || notsaved || upnp || C.playlists === 0 );
		$menu.find( '.similar' ).toggleClass( 'hide', webradio );
		$menu.find( '.tag' ).toggleClass( 'hide', webradio || upnp || audiocd );
		$menu.find( '.wrsave' ).toggleClass( 'hide', ! notsaved );
		$menu.find( '.remove' ).toggleClass( 'sub', ! singletrack );
		$menu.find( '.crop, .i-track.submenu' ).toggleClass( 'hide', singletrack );
		MENU.scroll( $menu, $LI.offset().top + 48 );
	}
	, scroll   : ( $menu, menutop ) => {
		var fixedmenu = V.library && ( V.list.licover && V.wH > 767 ) && D.fixedcover ? true : false;
		$menu
			.css( 'top',  menutop )
			.toggleClass( 'fixed', fixedmenu )
			.removeClass( 'hide' );
		COMMON.scrollToView( $menu );
	}
}
var MODE      = {
	  album : () => {
		return [ 'album', 'latest' ].includes( V.mode )
	}
	, file  : radio => {
		var modes = [ 'sd', 'nas', 'usb' ];
		if ( radio ) modes.push( 'dabradio', 'webradio' );
		return modes.includes( V.mode )
	}
	, radio : () => V.mode.slice( -5 ) === 'radio'
}
var PLAYBACK  = {
	  blank     : () => {
		$( '#page-playback .emptyadd' ).toggleClass( 'hide', S.player !== 'mpd' );
		$( '#playback-controls, #infoicon i, #vu,#divcomposer, #divconductor' ).addClass( 'hide' );
		$( '#divartist, #divtitle, #divalbum' ).removeClass( 'scroll-left' );
		$( '#artist, #title, #album, #progress, #elapsed, #total' ).empty();
		PROGRESS.set( 0 );
		$( '#sampling' ).empty();
		if ( S.ip || D.ap ) {
			var ip = S.ip || D.apconf.ip;
			if ( ! ip ) return
			
			var htmlqr = '';
			if ( ! S.ip && D.ap ) {
				htmlqr += '<gr>Access Point:</gr> '+ D.apconf.ssid
						 +'<div class="gr">Password: <wh>'+ D.apconf.passphrase +'</wh></div>'
						 + QRCode( D.apconf.qr );
			}
			htmlqr   += 'http://<wh>'+ ip +'</wh>'
					  + '<br>http://'+ S.hostname
					  + QRCode( 'http://'+ ip );
			if ( ! $( '#qr' ).length ) $( '#divcover' ).append( '<div id="qr" class="qr"></div>' );
			$( '#qr' ).html( htmlqr );
			$( '#coverTR' ).toggleClass( 'empty', ! UTIL.barVisible() );
			$COVERART.addClass( 'hide' );
		} else {
			$COVERART.removeClass( 'hide' );
			$( '#sampling' ).html( 'Network not connected:&emsp; <a href="settings.php?p=networks">'+ ICON( 'networks' ) +'&ensp;Setup</a>' );
		}
		PLAYBACK.vu();
		COMMON.loaderHide();
	}
	, button    : {
		  options  : () => {
			$( '#snapclient' ).toggleClass( 'on', S.player === 'snapcast' );
			$( '#relays' ).toggleClass( 'on', S.relayson );
			$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
			var time = PROGRESS.visible();
			var prefix = time ? 'ti' : 'mi';
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
					if ( time ) {
						$( '#mi-'+ option ).addClass( 'hide' );
						$( '#ti-'+ option ).toggleClass( 'hide', ! S[ option ] );
					} else {
						$( '#ti-'+ option ).addClass( 'hide' );
						$( '#mi-'+ option ).toggleClass( 'hide', ! S[ option ] );
					}
					$( '#button-pl-'+ option ).toggleClass( 'bl', S[ option ] );
				} );
			}
			PLAYBACK.button.update();
			PLAYBACK.button.updating();
			if ( ! VOLUME.visible() ) $( '#'+ prefix +'-mute' ).toggleClass( 'hide', S.volumemute === 0 );
		}
		, update   : () => {
			if ( S.updateaddons ) {
				$( '#button-settings, #addons i' ).addClass( 'bl' );
				if ( ! UTIL.barVisible() ) {
					var prefix = PROGRESS.visible() ? 'ti' : 'mi';
					$( '#'+ prefix +'-addons' ).addClass( 'hide' );
					$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
				}
			} else {
				$( '#button-settings, #addons i' ).removeClass( 'bl' );
				$( '#mi-addons, #ti-addons' ).addClass( 'hide' );
			}
		}
		, updating : () => {
			var $icon = $( '#library, #button-library, .i-libupdate' );
			if ( S.updating_db ) {
				$icon.addClass( 'blink' );
				$( '#refresh-library, #button-lib-update' ).addClass( 'bl' );
				$( '#update' ).addClass( 'on' );
				if ( $( '#bar-bottom' ).css( 'display' ) === 'none' || $( '#bar-bottom' ).hasClass( 'transparent' ) ) {
					var prefix = PROGRESS.visible() ? 'ti' : 'mi';
					$( '#'+ prefix +'-libupdate' ).removeClass( 'hide' );
				}
			} else {
				$icon.removeClass( 'blink' );
				$( '#refresh-library, #button-lib-update' ).removeClass( 'bl' );
				$( '#mi-libupdate, #ti-libupdate' ).addClass( 'hide' );
				$( '#update' ).removeClass( 'on' );
			}
		}
	}
	, coverart  : () => {
		if ( ! D.cover ) {
			COMMON.loaderHide();
			return
		}
		
		if ( D.vumeter ) {
			$COVERART
				.addClass( 'hide' )
				.attr( 'src', '' );
			$( '#vu' ).removeClass( 'hide' );
			COMMON.loaderHide();
		} else {
			var src = S.webradio ? ( S.coverart || S.stationcover ) : S.coverart;
			if ( src ) {
				src += UTIL.versionHash();
				$( '#vu' ).addClass( 'hide' );
				$COVERART
					.attr( 'src', src )
					.removeClass( 'hide' )
					.on( 'load', function() {
						var cover = $COVERART[ 0 ].getBoundingClientRect();
						$COVERART.css( 'height', cover.bottom > V.wH ? V.wH - cover.top +'px' : '' );
						$( '#offset-l, #offset-r' ).toggleClass( 'hide', V.wW - cover.width > 15 );
					} );
				if ( S.webradio ) PLAYLIST.coverart( src );
			} else {
				COVERART.default();
			}
		}
	}
	, elapsed   : () => {
		UTIL.intervalClear( 'elapsed' );
		if ( S.elapsed === false || S.state !== 'play' || 'audiocdadd' in V ) return // wait for cd cache on start
		
		var elapsedhms;
		var t_e      = S.elapsed === false ? '#total' : '#elapsed';
		var $elapsed = $( t_e +', #progress span, #pl-list li.active .elapsed' );
		if ( S.elapsed ) $elapsed.text( UTIL.second2HMS( S.elapsed ) );
		if ( S.Time ) { // elapsed + time
			 PROGRESS.set( S.elapsed );
		} else { // elapsed only
			if ( ! D.radioelapsed ) {
				$elapsed.html( V.blinkdot );
				return
			}
		}
		
		V.interval.elapsed = setInterval( () => {
			S.elapsed++;
			if ( ! S.Time || S.elapsed < S.Time ) {
				if ( V.localhost ) {
					PROGRESS.arc( S.elapsed / S.Time );
					$( '#time-bar' ).css( 'width', S.elapsed / S.Time * 100 +'%' );
				}
				elapsedhms = UTIL.second2HMS( S.elapsed );
				$elapsed.text( elapsedhms );
				if ( S.state !== 'play' ) UTIL.intervalClear( 'elapsed' );
			} else {
				S.elapsed = 0;
				UTIL.intervalClear();
				$elapsed.empty();
				PROGRESS.set( 0 );
			}
		}, 1000 );
	}
	, main      : () => {
		if ( ! S.state ) return // suppress on reboot
		
		LOCAL();
		if ( S.state === 'stop' ) PROGRESS.set( 0 );
		VOLUME.set();
		PLAYBACK.button.options();
		$( '#qr' ).remove();
		if ( S.player === 'mpd' && S.state === 'stop' && ! S.pllength ) { // empty queue
			PLAYBACK.blank();
			return
		}
		
		PLAYBACK.info.set();
		PLAYBACK.coverart();
		V.timehms      = S.Time ? UTIL.second2HMS( S.Time ) : '';
		var elapsedhms = S.elapsed ? UTIL.second2HMS( S.elapsed ) : '';
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#coverTR' ).removeClass( 'empty' );
		if ( S.state === 'stop' ) {
			PLAYBACK.stop();
			return
		}
		
		var htmlelapsed = ICON( S.state ) +'<span>'+ elapsedhms +'</span>';
		if ( S.elapsed ) {
			htmlelapsed += ' / ';
		} else {
			setTimeout( () => $( '#progress span' ).after( ' / ' ), 1000 );
		}
		htmlelapsed +=  V.timehms;
		$( '#progress' ).html( htmlelapsed );
		$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
		$( '#total' ).text( V.timehms );
		if ( S.webradio || S.elapsed === false || S.Time === false || ! ( 'elapsed' in S ) || S.elapsed > S.Time ) {
			UTIL.intervalClear();
			$( '#vuneedle' ).css( 'transform', '' );
			$( '#elapsed, #total, #progress' ).empty();
			if ( S.state === 'play' ) {
				$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
				if ( D.radioelapsed ) {
					$( '#progress' ).html( ICON( S.state ) +'<span></span>' );
					PLAYBACK.elapsed();
				} else {
					PROGRESS.set( 0 );
				}
			}
			return
		}
		
		if ( S.state === 'pause' ) {
			if ( S.elapsed ) $( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
			$( '#total' ).addClass( 'wh' );
			PROGRESS.set( S.elapsed );
		} else { //play
			PLAYBACK.elapsed();
		}
	}
	, info      : {
		  color  : () => {
			var pause = S.state === 'pause';
			$( '#title' ).toggleClass( 'gr', pause );
			$( '#elapsed' ).toggleClass( 'bl', pause );
			$( '#total' ).toggleClass( 'wh', pause );
			$( '#progress i' ).prop( 'class', pause ? 'i-pause' : 'i-play' );
		}
		, scroll : () => {
			var tWmax = 0;
			var $el   = $( '#artist, #title, #album' );
			$el
				.removeClass( 'scrollleft scrollellipse' )
				.removeAttr( 'style' );
			$el.each( ( i, el ) => {
				var tW = Math.ceil( el.clientWidth );
				if ( tW > V.wW - 20 ) {
					if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
					$( el ).addClass( 'scrollleft' );
				}
			} );
			if ( ! tWmax ) return
			
			$( '.scrollleft' ).css( { // same width and speed
				  width                : tWmax
				, 'animation-duration' : ( ( V.wW + tWmax ) / 80 ) +'s'
			} );
			if ( V.localhost ) {
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
		, set : () => {
			var prev = {
				  Artist : $( '#artist' ).text()
				, Title  : $( '#title' ).text()
				, Album  : $( '#album' ).text()
			}
			if ( S.webradio ) {
				var url = S.file.replace( /#charset=.*/, '' );
				if ( S.state === 'play' ) {
					$( '#artist' ).text( S.Artist || S.station );
					$( '#title' ).html( S.Title || V.blinkdot );
					$( '#album' ).text( S.Album || url );
				} else {
					$( '#artist' ).text( S.station );
					$( '#title' ).html( V.dots );
					$( '#album' ).text( url );
				}
			} else {
				$( '#artist' ).html( S.Artist || V.dots );
				$( '#title' )
					.html( S.Title || V.dots )
					.toggleClass( 'gr', S.state === 'pause' );
				var album = S.Album || S.file;
				if ( S.booklet ) album += ' '+ ICON( 'booklet gr' );
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
			if ( changed ) PLAYBACK.info.scroll();
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
	}
	, stop      : () => {
		PROGRESS.set( 0 );
		$( '#elapsed, #total, #progress' ).empty();
		$( '#title' ).removeClass( 'gr' );
		if ( V.timehms ) {
			$( '#progress' ).html( ICON( 'stop' ) +'<span></span>'+ V.timehms );
			$( '#elapsed' )
				.text( V.timehms )
				.addClass( 'gr' );
			$
		}
	}
	, vu        : () => {
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
}
var PLAYLIST  = {
	  add         : () => {
		if ( D.plclear && V.action.slice( 0, 7 ) === 'replace' ) {
			PLAYLIST.replace( PLAYLIST.addCommand );
		} else {
			$( '#infoX' ).trigger( 'click' );
			PLAYLIST.addCommand();
		}
	}
	, addCommand  : () => {
		var mpccmd0   = V.mpccmd[ 0 ];
		if ( mpccmd0 === 'mpcaddls' ) {
			var keys = 'DIR';
		} else if ( [ 'mpcadd', 'mpcaddload', 'mpcaddplaynext' ].includes( mpccmd0 ) ) {
			var keys = 'FILE';
		} else if ( mpccmd0 === 'mpcaddfind' ) {
			var keys = 'MODE STRING';
			if ( V.mpccmd.length > 3 ) keys += ' MODE2 STRING2';
			if ( V.mpccmd.length > 5 ) keys += ' MODE3 STRING3';
		}
		V.mpccmd.push( V.action, 'CMD '+ keys +' ACTION' );
		var cmd_title = {
			  add         : 'Add to Playlist'
			, playnext    : 'Add to Playlist to play next'
			, addplay     : 'Add to Playlist and play'
			, replace     : 'Replace Playlist'
			, replaceplay : 'Replace Playlist and play'
		}
		V.title       = cmd_title[ V.action ];
		if ( MODE.file() ) {
			V.msg = '<a class="li1">'+ V.list.name +'</a>';
			if ( $LI.find( '.li2' ).length ) V.msg += '<a class="li2">'+ $LI.find( '.li2' ).text() +'</a>';
		} else if ( $LI.data( 'mode' ) === 'lsmode' ) {
			V.msg  = '<a class="li1">'+ $( '#lib-path' ).text() +'</a><a class="li2">'+ $LI.find( '.name' ).text() +'</a>';
		} else {
			V.msg = V.list.path;
		}
		BANNER( 'playlist', V.title, V.msg );
		var cmd = V.mpccmd[ 0 ] === 'mpcaddfind' ? V.mpccmd.map( v => v.trim() ) : V.mpccmd;
		BASH( cmd );
		if ( D.playbackswitch && V.action.slice( -4 ) === 'play' ) UTIL.switchPage( 'playback' );
	}
	, addSimilar  : () => {
		var icon  = 'lastfm';
		var title = 'Add Similar';
		BANNER( icon +' blink', title, 'Get similar tracks ...', -1 );
		BASH( [ 'mpcsimilar', V.list.path, 'CMD FILE' ], error => {
			if ( error ) {
				BANNER_HIDE();
				INFO( {
					  icon    : icon
					, title   : title
					, message : error
				} );
			}
		} );
	}
	, blink       : off => {
		if ( off ) {
			clearTimeout( V.timeoutpl );
			$( '#playlist, #button-playlist' ).removeClass( 'blink' );
		} else {
			V.timeoutpl = setTimeout( () => $( '#playlist, #button-playlist' ).addClass( 'blink' ), 1000 );
		}
	}
	, coverart    : src => {
		var $icon = $( '#pl-list li.active .li-icon' );
		if ( $icon.is( 'i' ) ) {
			$icon.replaceWith( '<img class="iconthumb li-icon" src="'+ src +'" data-menu="filesavedpl">' );
		} else {
			$icon.attr( 'src', src );
		}
	}
	, get         : () => {
		if ( ! S.pllength ) {
			PLAYLIST.render.home();
			return
		}
		
		if ( $( '#pl-list' ).is( ':empty' ) ) {
			if ( $( '#bar-top' ).hasClass( 'hide' ) ) BANNER( 'playlist blink', 'Playlist', 'Get ...', -1 )
		}
		PLAYLIST.blink();
		LIST( { playlist: 'current' }, data => {
			PLAYLIST.blink( 'off' );
			PLAYLIST.render.home( data );
			BANNER_HIDE();
		}, 'json' );
	}
	, insert      : {
		  position : pos => {
			var plname = $( '#pl-title .lipath' ).text();
			BANNER( 'playlists', V.pladd.name, 'Add ...' );
			BASH( [ 'savedpledit', plname, 'add', pos, V.pladd.path, 'CMD NAME ACTION TO FILE' ], () => {
				PLAYLIST.playlists.list( plname );
				if ( pos === 'last' ) {
					setTimeout( () => $( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } ), 300 );
				}
				BANNER_HIDE();
			} );
		}
		, select   : () => {
			INFO( {
				  ...V.pladd
				, list        : [ 'Position:', 'radio', { Before: 1, After: 2 } ]
				, footer      : '<wh>'+ ( V.pladd.index + 1 ) +'<gr> • </gr>'+ V.pladd.track +'</wh>'
				, beforeshow  : PLAYLIST.insert.set
				, buttonlabel : ICON( 'undo' ) +'Select'
				, buttoncolor : V.orange
				, button      : () => {
					_INFO.reset();
					BANNER( V.pladd.icon, V.pladd.title, 'Select position to insert', -1 );
				}
				, cancel      : PLAYLIST.playlists.addClear
				, ok          : () => PLAYLIST.insert.position( +_INFO.val() + V.pladd.index )
			} );
			BANNER_HIDE();
		}
		, set      : () => {
			$( '.infomessage' ).addClass( 'tagmessage' );
			$( '#infoList table' ).before( '<hr>' ).after( '<hr>' );
		}
		, target   : () => {
			V.pladd.title = 'Add to '+ V.pladd.name;
			INFO( {
				  ...V.pladd
				, list       : [ 'Position:', 'radio', { First : 1, Select: 'select', Last: 'last' } ]
				, values     : 'last'
				, beforeshow : () => {
					PLAYLIST.insert.set();
					$( '#infoList label' ).eq( 1 ).on( 'click', function() {
						$( '#infoX' ).trigger( 'click' );
						BANNER( V.pladd.icon, V.pladd.title, 'Select position to insert', -1 );
					} );
				}
				, cancel     : PLAYLIST.playlists.addClear
				, ok         : () => PLAYLIST.insert.position( _INFO.val() )
			} );
			BANNER_HIDE();
		}
	}
	, load        : ( name, play, replace ) => {
		BANNER( 'playlists', name, 'Load ...' );
		BASH( [ 'playlist', name, play, replace, 'CMD NAME PLAY REPLACE' ], () => {
			if ( ! S.pllength ) $( '#playback-controls, #playback-controls i' ).removeClass( 'hide' );
		} );
	}
	, new         : name => {
		INFO( {
			  icon         : 'playlists'
			, title        : 'Save Playlist'
			, message      : 'Save current playlist as:'
			, list         : [ 'Name', 'text' ]
			, values       : name
			, checkblank   : true
			, ok           : () => PLAYLIST.playlists.save( _INFO.val() )
		} );
	}
	, playlists   : {
		  addClear : () => {
			delete V.pladd;
			$( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).removeClass( 'disabled' );
		}
		, home  : () => { // V.playlistlist
			V.playlisthome  = false;
			V.playlistlist  = true;
			V.playlisttrack = false;
			LIST( { playlist: 'list' }, data => {
				DISPLAY.pageScroll( 0 );
				$( '#pl-title' ).html( ICON( 'playlists wh' ) +'PLAYLISTS' );
				var html        = UTIL.htmlHash( data.html );
				$( '#page-playlist .index' ).remove();
				$( '#pl-savedlist' ).html( html ).promise().done( PLAYLIST.render.set );
			}, 'json' );
		}
		, list : name => { // V.playlisttrack
			V.playlisthome  = false;
			V.playlistlist  = false;
			V.playlisttrack = true;
			MENU.hide();
			LIST( { playlist: 'get', name: name }, function( data ) {
				$( '#page-playlist .index' ).remove();
				$( '#pl-title' ).html( data.counthtml );
				var html = UTIL.htmlHash( data.html );
				$( '#pl-savedlist' ).html( html ).promise().done( () => {
					var id = 'pl-savedlist';
					PLAYLIST.render.set();
					DISPLAY.pageScroll( 0 );
					COMMON.draggable( id );
				} );
			}, 'json' );
		}
		, save          : ( name, oldname, replace ) => {
			if ( oldname ) {
				BASH( [ 'savedplrename', oldname, name, replace, 'CMD NAME NEWNAME REPLACE' ], data => {
					if ( data == -1 ) PLAYLIST.playlists.saveExist( 'rename', name, oldname );
				} );
			} else {
				BASH( [ 'savedplsave', name, replace, 'CMD NAME REPLACE' ], data => {
					if ( data == -1 ) {
						PLAYLIST.playlists.saveExist( 'save', name );
					} else {
						BANNER( 'playlist', 'Playlist Saved', name );
					}
				} );
			}
		}
		, saveExist     : ( type, name, oldname ) => {
			var rename = type === 'rename';
			INFO( {
				  icon        : 'playlists'
				, title       : rename ? 'Rename Playlist' : 'Save Playlist'
				, message     : 'Playlist: <wh>'+ name +'</wh>'
							   +'<br><br>Already exists.'
				, buttonlabel : ICON( 'undo' ) +'Rename'
				, buttoncolor : V.orange
				, button      : () => rename ? CONTEXT.plrename() : PLAYLIST.new( name )
				, oklabel     : ICON( 'flash' ) +'Replace'
				, ok          : () => rename ? PLAYLIST.playlists.save( name, oldname, 'replace' ) : PLAYLIST.playlists.save( name, '' , 'replace' )
			} );
		}
	}
	, remove      : $li => {
		if ( S.pllength === 1 ) {
			$li.remove();
			BASH( [ 'mpcremove' ] );
			return
		}
		
		var pos = $li.index() + 1;
		BASH( [ 'mpcremove', pos, 'CMD POS' ] );
		if ( $li.hasClass( 'webradio' ) ) {
			var $count = $( '#pl-radiocount' );
			$count.text( +$count.text() - 1 );
		} else {
			var $count = $( '#pl-trackcount' );
			var $time  = $( '#pl-time' );
			$count.text( +$count.text() - 1 );
			var time = $time.data( 'time' ) - $li.find( '.time' ).data( 'time' );
			$time
				.data( 'time', time )
				.text( UTIL.second2HMS( time ) );
		}
		$li.remove();
		$( '#pl-list li .pos' ).each( ( i, el ) => $( el ).text( i + 1 ) );
	}
	, removeRange : range => {
		BANNER_HIDE();
		var $disabled = $( '#bar-top, #bar-bottom, .content-top' );
		var clear = () => {
			delete V.plrange;
			$disabled.removeClass( 'disabled' );
			BANNER_HIDE();
		}
		var param = { updn: { step: 1, min: 1, max: S.pllength, link: true } }
		INFO( {
			  icon       : 'playlist'
			, title      : 'Remove Range'
			, list       : [ [ ICON( 'cursor' ) +' From', 'number', param ], [ ICON( 'cursor' ) + COMMON.sp( 23 ) +'To', 'number', param ] ]
			, boxwidth   : 80
			, values     : range || [ 1, S.pllength ]
			, beforeshow : () => {
				$( '#infoList td:first-child' ).on( 'click', function() {
					V.plrange = _INFO.val();
					V.rangei  = $( this ).parent().index();
					$( '#infoOverlay' ).addClass( 'hide' );
					$disabled.addClass( 'disabled' );
					BANNER( 'cursor blink', 'Remove Range', ( V.rangei ? 'To' : 'From' ) +': Select ...', -1 );
				} );
			}
			, cancel     : clear
			, ok         : () => {
				var v = _INFO.val( 'array' );
				BASH( [ 'mpcremove', ...v, 'CMD POS TO' ] );
				$( '#pl-list li' ).slice( v[ 0 ] - 1, v[ 1 ] ).remove();
				clear();
			}
		} );
	}
	, render      : {
		  home    : data => { // V.playlisthome
			V.playlisthome  = true;
			V.playlistlist  = false;
			V.playlisttrack = false;
			if ( ! V.playlist ) UTIL.switchPage( 'playlist' );
			$( '#button-pl-back, #pl-savedlist' ).addClass( 'hide' );
			$( '#pl-search-close' ).trigger( 'click' );
			$( '#button-pl-playlists' ).toggleClass( 'disabled', C.playlists === 0 );
			$( '#button-pl-librandom' )
				.toggleClass( 'bl', S.librandom )
				.toggleClass( 'disabled', C.song === 0 || ! ( 'song' in C ) );
			$( '#page-playlist .index' ).remove();
			if ( ! data ) {
				V.html.playlist = '';
				S.pllength      = 0;
				S.consume       = false;
				$( '#playback-controls' ).addClass( 'hide' );
				$( '#pl-home-title' ).html( 'PLAYLIST' );
				$( '.pllength' ).addClass( 'disabled' );
				$( '#button-pl-consume' ).removeClass( 'bl' );
				$( '#pl-search-close' ).trigger( 'click' );
				$( '#pl-list' ).empty();
				$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
				DISPLAY.pageScroll( 0 );
				return
			}
			
			[ 'consume', 'elapsed', 'librandom', 'song' ].forEach( k => S[ k ] = data[ k ] );
			$( '#pl-home-title' ).html( 'PLAYLIST '+ data.counthtml );
			$( '.pllength' ).removeClass( 'disabled' );
			$( '#button-pl-shuffle' ).toggleClass( 'disabled', S.pllength < 2 );
			$( '#button-pl-consume' ).toggleClass( 'bl', S.consume );
			if ( data.html !== V.html.playlist ) {
				V.html.playlist = data.html;
				var html        = UTIL.htmlHash( data.html );
				$( '#pl-list' ).html( html ).promise().done( () => {
					var id = 'pl-list';
					PLAYLIST.render.set();
					PLAYLIST.render.scroll();
					COMMON.draggable( id );
				} );
			} else {
				PLAYLIST.render.set();
				PLAYLIST.render.scroll();
			}
		}
		, padding : () => {
			var padding = UTIL.barVisible( 129, 89 );
			$( '#pl-savedlist, #pl-list' ).css( 'padding-bottom', 'calc( 100vh - '+ padding +'px )' );
		}
		, scroll : () => {
			if ( ! V.playlist || ! V.playlisthome ) return
			
			UTIL.intervalClear();
			if ( V.sort
				|| [ 'airplay', 'spotify' ].includes( S.player )
				|| ( D.audiocd && $( '#pl-list li' ).length < S.song + 1 ) // on eject cd S.song not yet refreshed
			) {
				return
			}
			
			var litop     = UTIL.barVisible( 80, 40 );
			$( '#menu-plaction' ).addClass( 'hide' );
			$( '#pl-list li' ).removeClass( 'active pause play updn' );
			var $liactive = $( '#pl-list li' ).eq( S.song );
			$liactive.addClass( 'active' );
			if ( ! $( '.pl-remove' ).length && ! I.active ) {
				if ( $( '#pl-list li' ).length < 5 ) {
					var top = 0;
				} else {
					var top = $liactive.offset().top - litop - ( 49 * 3 );
				}
				DISPLAY.pageScroll( top );
			}
			$( '#pl-list .elapsed' ).empty();
			if ( S.webradio ) PLAYLIST.render.widthRadio();
			if ( S.elapsed === false ) return
			
			$liactive.addClass( S.state );
			if ( S.player === 'upnp' ) $liactive.find( '.time' ).text( UTIL.second2HMS( S.Time ) );
			if ( S.state === 'pause' ) {
				elapsedtxt = UTIL.second2HMS( S.elapsed );
				$liactive.find( '.elapsed' ).text( elapsedtxt );
				PLAYLIST.render.width();
			} else {
				PLAYBACK.elapsed();
			}
		}
		, set     : () => {
			$( '.emptyadd, #menu-plaction' ).addClass( 'hide' );
			if ( V.playlisthome ) {
				$( '#pl-savedlist, #pl-title' ).addClass( 'hide' );
				$( '#pl-list, #pl-home-title, #pl-manage, #button-pl-search' ).removeClass( 'hide' );
			} else {
				$( '#pl-savedlist' ).css( 'width', V.playlistlist ? '' : '100%' );
				$( '#pl-list, #pl-home-title, #pl-manage, #pl-search, #button-pl-search' ).addClass( 'hide' );
				$( '#pl-savedlist, #pl-title, #button-pl-back' ).removeClass( 'hide' );
			}
			PLAYLIST.render.padding();
			if ( 'pladd' in V ) $( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).addClass( 'disabled' );
		}
		, width : () => {
			// li-icon + margin + duration + margin
			var $liactive = $( '#pl-list li.active' );
			var $title    = $liactive.find( '.name' );
			var titleW    = $title.scrollWidth;
			var elapsedW  = $liactive.find( '.elapsed' ).width();
			var timeW     = $liactive.find( '.time' ).width();
			var iWdW      = 40 + 10 + elapsedW + timeW + 9;
			var cW        = document.body.clientWidth;
			$title.css(  'max-width', iWdW + titleW < cW ? '' : cW - iWdW );
		}
		, widthRadio : stop => {
			var $liactive = $( '#pl-list li.active' );
			var $img      = $liactive.find( 'img' );
			var $name     = $liactive.find( '.name' );
			var $li2      = $liactive.find( '.li2' ); 
			var $station  = $li2.find( '.station' );
			var $artist   = $li2.find( '.artist' );
			var $url      = $li2.find( '.url' );
			if ( S.state === 'stop' || stop ) {
				$img.attr( 'src', $img.data( 'src' ) );
				$name.text( $station.text() );
				$station.addClass( 'hide' );
				$artist.addClass( 'hide' );
				$url.removeClass( 'hide' );
			} else {
				if ( S.coverart ) $img.attr( 'src', S.coverart );
				$name.html( S.Title || V.dots );
				if ( S.Artist ) {
					$artist
						.text( S.Artist + ( S.Album ? ' - '+ S.Album : '' ) )
						.removeClass( 'hide' );
					$url.addClass( 'hide' );
				} else {
					$artist.addClass( 'hide' );
					$url.removeClass( 'hide' );
				}
				$station.removeClass( 'hide' );
			}
		}
	}
	, replace     : callback => {
		INFO( {
			  icon    : 'playlist'
			, title   : 'Playlist Replace'
			, message : 'Replace current playlist?'
			, ok      : callback
		} );
	}
	, skip        : () => {
		if ( ! $( '#pl-list li' ).length ) {
			LIST( { playlist: 'current' }, data => {
				$( '#pl-list' ).html( data.html ).promise().done( PLAYLIST.skip );
			}, 'json' );
			return
		}
		
		UTIL.intervalClear();
		if ( S.state !== 'stop' ) {
			PROGRESS.set( 0 );
			$( '#elapsed, #total, #progress' ).empty();
		}
		BASH( [ 'mpcskip', S.song + 1, S.state, 'CMD POS ACTION' ] );
	}
}
var PROGRESS  = {
	  arc     : length => $TIME_ARC.css( 'stroke-dasharray', '0, 0, '+ ( length * 654 ) +', 654' )
	, bar     : e => {
		var ratio      = UTIL.xy.ratio( e, 'time' );
		S.elapsed      = Math.round( ratio * S.Time );
		var elapsedhms = UTIL.second2HMS( S.elapsed );
		if ( S.elapsed ) {
			$( '#progress span' ).html( elapsedhms );
		} else {
			$( '#progress' ).html( ICON( 'pause' ) +'<span>'+ elapsedhms +'</span> / '+ UTIL.second2HMS( S.Time ) );
		}
		$( '#time-bar' ).css( 'width', ( ratio * 100 ) +'%' );
	}
	, command : () => BASH( [ 'mpcseek', S.elapsed, S.state, 'CMD ELAPSED STATE' ] )
	, knob    : e => {
		var deg   = UTIL.xy.e2deg( e, 'time' );
		deg       = ( deg + 90 ) % 360; // (east: 0°) 270°@0%---180°@50%---270°@100%
		S.elapsed = Math.round( S.Time * deg / 360 );
		PROGRESS.set( S.elapsed );
		$( '#elapsed, #total' ).removeClass( 'gr' );
		if ( S.state !== 'play' ) $( '#elapsed' ).addClass( 'bl' );
		$( '#elapsed' ).text( UTIL.second2HMS( S.elapsed ) );
		$( '#total' ).text( UTIL.second2HMS( S.Time ) );
		if ( S.state === 'stop' && UTIL.barVisible() ) {
			$( '#playback-controls i' ).removeClass( 'active' );
			$( '#pause' ).addClass( 'active' );
			$( '#title' ).addClass( 'gr' );
		}
	}
	, set     : elapsed => { // if defined - no animate
		if ( ! D.time && ! D.cover ) return
		
		if ( S.state !== 'play' || ! S.elapsed ) UTIL.intervalClear( 'elapsed' );
		if ( elapsed === undefined ) {
			var s = S.Time - S.elapsed; // seconds from current to full
			var l = 1;                  // full circle
			var w = 100;
		} else {
			var s = 0;
			var l = 0;
			var w = 0;
			if ( elapsed ) {
				l = S.Time ? elapsed / S.Time : 0;
				w = l * 100;
			}
		}
		if ( V.localhost ) { // no animation - fix high cpu load
			$( '#time path, #time-bar' ).css( 'transition-duration', '0s' );
			PROGRESS.arc( l );
			$( '#time-bar' ).css( 'width', w +'%' );
		} else {
			$( '#time path, #time-bar' ).css( 'transition-duration', s +'s' );
			PROGRESS.visible() ? PROGRESS.arc( l ) : $( '#time-bar' ).css( 'width', w +'%' );
		}
		if ( ! V.pageactive ) return
		
		if ( elapsed && S.state === 'play' ) setTimeout( () => PROGRESS.set(), 300 );
	}
	, visible : () => $( '#time-knob' ).css( 'display' ) !== 'none' // both .hide and css show/hide
}
var UTIL      = {
	  barVisible      : ( a, b ) => {
		var visible = ! $( '#bar-top' ).hasClass( 'hide' );
		if ( ! a ) return visible
		
		return visible ? a : b
	}
	, changeIP        : () => { // for android app
		INFO( {
			  icon         : 'networks'
			, title        : 'IP Address'
			, message      : 'Switch rAudio:'
			, list         : [ 'New IP', 'text' ]
			, boxwidth     : 170
			, values       : location.host
			, checkchanged : true
			, checkip      : [ 0 ]
			, beforeshow   : () => $( '#infoList input' ).prop( 'type', 'tel' )
			, ok           : () => {
				var ip = _INFO.val();
				var changed = Android.changeIP( ip );
				if ( changed ) {
					location.href = 'http://'+ ip;
				} else {
					INFO( {
						  icon    : 'networks'
						, title   : 'IP Address'
						, message : 'Not found: '+ ip
						, ok      : UTIL.changeIP
					} );
				}
			}
		} );
	}
	, dirName         : path => path.slice( 0, path.lastIndexOf( '/' ) )
	, htmlHash        : html => {
		var hash = UTIL.versionHash();
		return html.replace( /\^\^\^/g, hash )
	}
	, imageReplace    : ( type, imagefilenoext ) => {
		var data = {
			  cmd     : 'imagereplace'
			, type    : type
			, file    : imagefilenoext +'.'+ ( I.infofilegif ? 'gif' : 'jpg' )
			, data    : 'infofilegif' in I ? I.infofilegif : $( '.infoimgnew' ).attr( 'src' )
			, current : V.playback
		}
		if ( V.debug ) {
			console.log( '%cDebug: %ccmd.php', 'color:red', 'color:white' );
			console.log( data );
			return
		}
		
		$.post( 'cmd.php', data, std => {
			if ( std == -1 ) {
				BANNER_HIDE();
				var dir = imagefilenoext.slice( 0, imagefilenoext.lastIndexOf( '/' ) );
				_INFO.warning( I.icon, I.title, 'No write permission:<br><c>'+ dir +'</c>' );
			}
		} );
		BANNER( V.icoverart.replace( 'coverart', 'coverart blink' ), I.title, 'Change ...', -1 );
	}
	, infoTitle       : () => {
		var artist = S.Artist;
		var title  = S.Title;
		var album  = S.Album;
		if ( album.includes( '://' ) ) album = '';
		artist  = artist.replace( /(["`])/g, '\\$1' );
		title   = title.replace( /(["`])/g, '\\$1' );
		var list = [
			  [ ICON( 'artist wh' ), 'text' ]
			, [ ICON( 'music wh' ),  'text' ]
			, [ ICON( 'album wh' ),  'text' ]
		];
		var paren      = title.slice( -1 ) === ')';
		if ( paren ) {
			var titlenoparen = title.replace( / $|\(.*$/, '' );
			list.push( [ ICON( 'music wh' ) +'<gr>Title includes: </gr>'+ title.replace( /^.*\(/, '(' ),  'checkbox' ] );
		}
		INFO( {
			  icon        : 'playback'
			, title       : 'Current Track'
			, list        : list
			, footer      : _INFO.footerIcon( {
				  Lyrics        : 'lyrics'
				, Bio           : 'bio'
				, 'Add Similar' : 'lastfm'
				, Scrobble      : 'scrobble'
			} )
			, footeralign : 'left'
			, width       : 460
			, boxwidth    : 'max'
			, values      : paren ? [ artist, titlenoparen, album ] : [ artist, title, album ]
			, beforeshow  : () => {
				if ( S.scrobble ) $( '.infofooter .scrobble' ).toggleClass( 'disabled', ! artist || ! title || ! S.webradio || S.scrobbleconf[ S.player ] );
				if ( paren ) {
					$( '#infoList input:checkbox' ).on( 'input', function() {
						$( '#infoList input' ).eq( 1 ).val( $( this ).prop( 'checked' ) ? title : titlenoparen );
					} );
				}
				$( '#infoList input' ).on( 'input', function() {
					var val = _INFO.val();
					$( '#infoList .scrobble' ).toggleClass( 'disabled', val[ 0 ] === '' || val[ 1 ] === '' );
				} );
				$( '.infofooter' ).css( 'padding-left', '35px' );
				var $span = $( '.infofooter span' );
				$span.eq( 0 ).toggleClass( 'hide', ! S.lyrics );
				$span.eq( 3 ).toggleClass( 'hide', ! S.scrobble );
				$span.on( 'click', function() {
					var values = _INFO.val();
					var artist = values[ 0 ]
					var title  = values[ 1 ]
					var $this  = $( this );
					var i      = $( this ).index();
					if ( i === 0 ) {
						V.lyricsartist = artist || S.Artist;
						V.lyricstitle  = title || S.Title;
						LYRICS.fetch();
					} else if ( i === 1 ) {
						BIO.get( artist );
					} else if ( i === 2 ) {
						PLAYLIST.addSimilar();
					} else {
						BASH( [ 'scrobble.sh', ...values, 'CMD ARTIST TITLE' ] );
						BANNER( 'lastfm blink', 'Scrobble', 'Send ...' );
					}
					$( '#infoX' ).trigger( 'click' );
				} );
			}
			, okno        : true
		} );
	}
	, intervalClear   : elpased => {
		if ( elapsed ) {
			clearInterval( V.interval.elapsed );;
		} else {
			$.each( V.interval, ( k, v ) => clearInterval( v ) );
		}
		if ( D.vumeter ) $( '#vuneedle' ).css( 'transform', '' );
	}
	, refresh         : () => {
		if ( V.library ) {
			if ( V.libraryhome ) {
				LIBRARY.get();
			} else {
				var query = V.query[ V.query.length -1 ];
				LIST( query, function( html ) {
					if ( html ) {
						var data = {
							  html      : html
							, modetitle : query.modetitle
							, path      : query.path || V.mode.toUpperCase()
						}
						LIBRARY.list( data );
					}
				} );
			}
		} else {
			if ( V.playlisthome ) {
				PLAYLIST.get();
			} else if ( V.playlistlist ) {
				PLAYLIST.playlists.home();
			} else {
				PLAYLIST.playlists.list( $( '#pl-title .name' ).text() );
			}
		}
	}
	, refreshPlayback : () => {
		DISPLAY.bars();
		DISPLAY.playback();
		PLAYBACK.main();
		BANNER_HIDE();
	}
	, second2HMS      : second => {
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
	, switchPage      : page => {
		UTIL.intervalClear();
		// get scroll position before changed
		if ( V.library ) {
			if ( V.librarylist ) {
				V.liscrolltop = $( window ).scrollTop();
			} else {
				V.modescrolltop = $( window ).scrollTop();
			}
		} else if ( V.playlist ) {
			if ( ! V.playlisthome ) V.plscrolltop = $( window ).scrollTop();
		}
		V.library = V.playback = V.playlist = false;
		V[ page ] = true;
		V.page    = page;
		DISPLAY.bottom();
		// restore page scroll
		if ( V.playback ) {
			DISPLAY.pageScroll( 0 );
			PLAYBACK.vu();
		} else if ( V.library ) {
			if ( V.librarylist ) {
				DISPLAY.pageScroll( V.liscrolltop );
			} else {
				LIBRARY.get();
			}
		} else {
			if ( ! V.playlisthome ) DISPLAY.pageScroll( V.plscrolltop );
		}
		$( '.page' ).addClass( 'hide' );
		$( '#page-'+ page ).removeClass( 'hide' );
	}
	, versionHash     : () => '?v='+ Math.round( Date.now() / 1000 )
	, xy              : {
		  degree : ( x, y, cx, cy ) => {
			var rad = Math.atan2( y - cy, x - cx );
			var deg = Math.round( rad * 180 / Math.PI );
			if ( deg < 0 ) deg += 360;
			return deg
		}
		, e2deg  : ( e, el ) => { // el: time/volume
			var [ x, y ] = COMMON.pageXY( e );
			return UTIL.xy.degree( x, y, V[ el ].cx, V[ el ].cy )
		}
		, get    : el => {
			if ( V.animate ) return
			
			if ( PAGE === 'camilla' ) {
				
				return
			}
			
			DISPLAY.guideHide();
			if ( $( el ).parents( '#divcover' ).length ) {
				return {
					  x    : $COVERART.offset().left
					, w    : $COVERART.width()
					, type : 'bar'
				}
			} else {
				var id = $( el ).parents( '.knob' )[ 0 ].id;
				var [ y, x ] = Object.values( $( '#'+ id ).offset() );
				return {
					  cx   : x + 115
					, cy   : y + 115
					, type : 'knob'
				}
			}
		}
		, ratio  : ( e, type ) => {
			var x     = V[ type ].x;
			var w     = V[ type ].w;
			var posX  = COMMON.pageX( e ) - x;
			posX      = posX < 0 ? 0 : ( posX > w ? w : posX );
			return posX / w
		}
	}
}	
var VOLUME    = {
	  ...VOLUME
	, bar     : e => {
		var ratio = UTIL.xy.ratio( e, 'volume' );
		S.volume  = Math.round( ratio * 100 );
		VOLUME.command();
		VOLUME.set();
	}
	, barHide : ms => {
		V.volumebar = setTimeout( () => {
			$( '#volume-bar, #volume-bar-point, #volume-band-level' ).addClass( 'hide' );
			$( '.volumeband' ).addClass( 'transparent' );
		}, ms !== undefined ? ms : 5000 );
	}
	, barShow : hide => {
		$( '#volume-bar, #volume-bar-point, #volume-band-level' ).removeClass( 'hide' );
		$( '.volumeband:not( #volume-band )' ).removeClass( 'transparent' );
		if ( hide ) VOLUME.barHide();
	}
	, knob    : e => {
		var deg     = UTIL.xy.e2deg( e, 'volume' );
		if ( deg > 30 && deg < 150 ) return
		
		var deg_vol = deg >= 150 ? deg : deg + 360; // [0°-30°] + 360° >> [360°-390°] - 150° = [210°-240°]
		S.volume    = Math.round( ( deg_vol - 150 ) / 240 * 100 );
		VOLUME.command();
		VOLUME.set();
	}
	, set     : () => {
		var $bar     = $( '#volume-bar' );
		var $level   = $( '#volume-level' );
		var vol_prev = $level.text();
		var mute     = S.volumemute !== 0;
		$level
			.text( S.volume )
			.toggleClass( 'hide', mute );
		$( '#volume-mute' )
			.text( S.volumemute )
			.toggleClass( 'hide', ! mute );
		$( '#volume-band-level' )
			.text( S.volumemute || S.volume )
			.toggleClass( 'bll', S.volumemute > 0 );
		$( '#vol .point' ).toggleClass( 'bgr60', mute );
		$( '#volmute' ).toggleClass( 'mute active', mute );
		$( '#ti-mute, #mi-mute' ).addClass( 'hide' );
		if ( mute && ! VOLUME.visible() ) {
			var prefix = PROGRESS.visible() ? 'ti' : 'mi';
			$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
		}
		if ( V.updn ) {
			var ms    = 100;
		} else if ( V.drag || vol_prev === '' || ! $( '#volume-knob, #volume-bar' ).not( '.hide' ).length ) { // onload - empty
			var ms    = 0;
		} else {
			var ms    = Math.abs( S.volume - vol_prev ) * 40; // 1%:40ms
			V.animate = true;
			setTimeout( () => delete V.animate, ms );
			if ( ! $bar.hasClass( 'hide' ) ) { // suppress on push received
				clearTimeout( V.volumebar );
				VOLUME.barHide( ms + 5000 );
			}
		}
		var ms_knob = VOLUME.visible() ? ms : 0;
		var ms_bar  = $bar.hasClass( 'hide' ) ? 0 : ms;
		$( '#vol, #vol .point' ).css( 'transition-duration', ms_knob +'ms' );
		$( '#volume-bar, #volume-bar-point' ).css( 'transition-duration', ms_bar +'ms' );
		var deg     = 150 + S.volume * 2.4; // (east: 0°) 150°@0% --- 30°@100% >> 240°:100%
		$( '#vol' ).css( 'transform', 'rotate( '+ deg +'deg' )
			.find( 'div' ).css( 'transform', 'rotate( -'+ deg +'deg' );
		$bar.css( 'width', S.volume +'%' );
		$( '#volume-bar-point' ).css( 'left', S.volume +'%' );
	}
	, upDown  : up => {
		if ( ( ! up && S.volume === 0 ) || ( up && S.volume === 100 ) ) return
		
		clearTimeout( V.volumebar );
		DISPLAY.guideHide();
		up ? S.volume++ : S.volume--;
		S.volumemute = 0;
		VOLUME.command();
		VOLUME.set();
	}
	, visible : () => $VOLUME.css( 'display' ) !== 'none'
}
var WEBRADIO  = {
	  exists : ( error, name, url, charset ) => {
		INFO( {
			  icon    : 'webradio'
			, title   : 'Add Web Radio'
			, message : V.i_warning + error
						+'<br><br><wh>'+ url +'</wh>'
			, ok      : () => name ? WEBRADIO.new( name, url, charset ) : CONTEXT.wredit()
		} );
	}
	, list   : [
		  [ 'Name',    'text', { colspan: 3 } ]
		, [ 'URL',     'text', { colspan: 3 } ]
		, [ 'Charset', 'text', { sameline: true, width: 190 } ]
		, [ '',        '<a href="https://www.iana.org/assignments/character-sets/character-sets.xhtml" target="_blank">'+ ICON( 'help gr' ), { sameline: true } ]
		, [ '',        '<gr>New folder</gr> <i class="i-folder-plus" tabindex="0"></i>' ]
		, [ '',        'hidden' ] // DIR
		, [ '',        'hidden' ] // OLDURL
	]
	, new    : ( name, url, charset ) => {
		INFO( {
			  icon       : 'webradio'
			, title      : ( V.library ? 'Add' : 'Save' ) +' Web Radio'
			, boxwidth   : 'max'
			, list       : WEBRADIO.list
			, values     : {
				  NAME    : name
				, URL     : url
				, CHARSET : charset || 'UTF-8'
				, DIR     : $( '#lib-path' ).text()
			}
			, checkblank : [ 0, 1 ]
			, beforeshow : () => {
				if ( V.playlist ) $( '#infoList input' ).eq( 1 ).prop( 'disabled', true );
				$( '#infoList tr:eq( 2 ) td' ).last()
					.css( { 'text-align': 'right', cursor: 'pointer' } )
					.on( 'click', function() {
						INFO( {
							  icon       : 'webradio'
							, title      : 'Add Folder'
							, list       : [ 'Name', 'text' ]
							, checkblank : true
							, cancel     : () => $( '.button-webradio-new' ).trigger( 'click' )
							, ok         : () => BASH( [ 'dirnew', $( '#lib-path' ).text() +'/'+ _INFO.val(), 'CMD DIR' ] )
						} );
					} );
			}
			, ok         : () => {
				var val = _INFO.val();
				if ( [ 'm3u', 'pls' ].includes( val.URL.slice( -3 ) ) ) BANNER( 'webradio blink', 'Web Radio', 'Get URL ...', -1 );
				BASH( COMMON.cmd_json2args( 'webradioadd', val ), error => {
					BANNER_HIDE();
					if ( error ) WEBRADIO.exists( error, val.NAME, val.URL, val.CHARSET );
				} );
			}
		} );
	}
}
