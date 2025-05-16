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
		if ( V.volumeactive ) delete status.volume; // immediately change volume when page inactive > page active
		$.each( status, ( k, v ) => { S[ k ] = v } ); // need braces
		V.volumecurrent = S.volume;
		if ( $( '#data' ).length ) $( '#data' ).html( COMMON.json.highlight( S ) )
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
		COMMON.loaderHide();
	}
}
var COLOR     = {
	  cssSet : hsl => {
		var css = { '--h': hsl.h, '--s': hsl.s +'%' };
		V.color.ml.forEach( v => { css[ '--ml'+ v ] = ( hsl.l + v - 35 ) +'%' } );
		$( ':root' ).css( css );
	}
	, hide   : () => {
		$( '#colorpicker' ).addClass( 'hide' );
		$( 'body' ).css( 'overflow', '' );
		delete V.color;
	}
	, pick   : {
		  gradient : () => {
			var ctx = V.ctx.context;
			var h   = V.ctx.hsl.h;
			var w   = V.ctx.sat.w;
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
			var c       = V.ctx.canvas.c;
			var rad     = Math.atan2( x - c, y - c );
			var h       = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
			V.ctx.hsl.h = h;
			COLOR.pick.rotate( h );
			COLOR.pick.gradient();
			COLOR.cssSet( V.ctx.hsl );
		}
		, point    : ( x, y ) => {
			$( '#sat' )
				.css( { left: ( x - 5 ) +'px', top: ( y - 5 ) +'px' } )
				.removeClass( 'hide' );
		}
		, rotate   : h => {
			$( '#hue' ).css( 'transform', 'rotate( '+ h +'deg )' );
		}
		, sat      : ( x, y ) => {
			x += V.ctx.sat.tl;
			y += V.ctx.sat.tl;
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
			COLOR.cssSet( V.ctx.hsl );
			V.ctx.sat.x = x;
			V.ctx.sat.y = y;
		}
		, set      : () => {
			COLOR.pick.gradient(); // sat box
			var l = V.ctx.hsl.l / 100;
			var a = V.ctx.hsl.s / 100 * Math.min( l, 1 - l );
			var k, rgb, v;
			var [ r, g, b ] = ( () => { // hsl > rgb
				rgb = [];
				[ 0, 8, 4 ].forEach( n => {
					k = ( n + V.ctx.hsl.h / 30 ) % 12;
					v = l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
					rgb.push( Math.round( v * 255 ) );
				} );
				return rgb
			} )();
			var br = V.ctx.sat.br
			var tl = V.ctx.sat.tl;
			var h  = V.ctx.hsl.h;
			var pb, pg, pr;
			match:
			for ( var y = tl; y < br; y++ ) { // find pixel with rgb +/- 1
				for ( var x = tl; x < br; x++ ) {
					[ pr, pg, pb ] = V.ctx.context.getImageData( x, y, 1, 1 ).data;
					if ( Math.abs( r - pr ) < 2 && Math.abs( g - pg ) < 2 && Math.abs( b - pb ) < 2 ) {
						COLOR.pick.rotate( h );
						COLOR.pick.point( x, y );
						break match;
					}
				}
			}
		}
		, xy       : ( e, hue_sat, clear ) => {
			if ( clear ) $( '#sat' ).addClass( 'hide' )
			var x = e.offsetX || e.changedTouches[ 0 ].pageX - V.ctx.tl[ hue_sat ].x;
			var y = e.offsetY || e.changedTouches[ 0 ].pageY - V.ctx.tl[ hue_sat ].y;
			COLOR.pick[ hue_sat ]( x, y );
		}
	}
	, picker : () => {
		if ( V.ctx ) {
			COLOR.pick.set();
			return
		}
		
		var canvas_w    = 230;
		var canvas_c    = canvas_w / 2;
		var hue_r       = 95;
		var sat_w       = 120;
		var sat_tl      = ( canvas_w - sat_w ) / 2;
		var sat_br      = sat_tl + sat_w;
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' ).map( Number );
		var [ ty, tx ]  = Object.values( $( '#base' ).offset() );
		V.ctx           = {
			  canvas  : { w: canvas_w, c: canvas_c }
			, context : COLOR.wheel( '#base' )
			, hsl     : { h, s, l }
			, hsl0    : { h, s, l } // for #colorcancel
			, sat     : { br: sat_br, tl: sat_tl, w: sat_w }
			, tl      : { // e.changedTouches[ 0 ].pageX/Y - tl[ x ].x/y = e.offsetX/Y
				  hue : { x: tx,          y: ty }
				, sat : { x: tx + sat_tl, y: ty + sat_tl }
			}
		}
		var ctx         = V.ctx.context;
		ctx.fillStyle   = '#000';
		ctx.beginPath();
		ctx.arc( canvas_c, canvas_c, hue_r, 0, 2 * Math.PI ); // hue cutout
		ctx.fill();
		ctx.translate( sat_tl, sat_tl );
		COLOR.pick.set();
	}
	, save   : hsl => BASH( [ 'color', Object.values( hsl ).join( ' ' ), 'CMD HSL' ] )
	, wheel  : el => { // for picker and color menu
		var canvas  = $( el )[ 0 ];
		var ctx     = canvas.getContext( '2d', { willReadFrequently: el === '#base' } );
		var c       = canvas.width / 2;
		var deg_rad = Math.PI / 180;
		for ( var i = 0; i < 360; i++ ) {
			ctx.beginPath();
			ctx.moveTo( c, c );
			ctx.arc( c, c, c, i * deg_rad, ( i + 2 ) * deg_rad ); // fix moire - +2 (overlap)
			ctx.fillStyle = 'hsl('+ i +', 100%, 50%)';
			ctx.fill();
		}
		return ctx // for picker
	}
}
var COVERART  = {
	  change  : () =>  {
		if ( V.playback ) {
			var $coverart     = $( '#coverart' );
			var path          = UTIL.dirName( S.file );
			var album         = S.Album;
			var artist        = S.Artist;
			var onlinefetched = $( '#divcover .cover-save' ).length;
		} else {
			var $coverart     = $( '#liimg' );
			var path          = $( '.licover .lipath' ).text();
			if ( path.split( '.' ).pop() === 'cue' ) path = UTIL.dirName( path );
			var album         = $( '.licover .lialbum' ).text();
			var artist        = $( '.licover .liartist' ).text();
			var onlinefetched = $( '.licover .cover-save' ).length;
		}
		var src          = $coverart.attr( 'src' );
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
			, ok          : () => IMAGE.replace( 'coverart', file.slice( 0, -4 ) )
		} );
	}
	, default : () => {
		if ( D.vumeter ) return
		
		var hash = UTIL.versionHash();
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
			PLAYBACK.vu();
		}
	}
	, save    : () => {
		if ( V.playback ) {
			var src    = $( '#coverart' ).attr( 'src' );
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
					IMAGE.replace( 'coverart', path +'/cover' );
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
		$( '#coverM' ).toggleClass( 'disabled', ! mpd_upnp );
	}
	, guideHide  : () => {
		if ( V.guide ) {
			V.guide        = false;
			var barvisible = UTIL.barVisible();;
			$( '#coverTR' ).toggleClass( 'empty', S.pllength === 0 && ! barvisible && S.player === 'mpd' );
			$( '.map' ).removeClass( 'mapshow' );
			$( '#bar-bottom' ).removeClass( 'translucent' );
			if ( ! barvisible ) $( '#bar-bottom' ).addClass( 'transparent' );
			$( '.band, #volbar' ).addClass( 'transparent' );
			$( '.guide, #volume-bar, #volume-text' ).addClass( 'hide' );
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
		var hidetime   = ! D.time || $TIME.is( ':hidden' ); // #time hidden by css on small screen
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
		if ( ! hidetime ) $( '#time' ).roundSlider( S.webradio || S.player !== 'mpd' || ! S.pllength ? 'disable' : 'enable' );
		$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', ! hidetime );
		$( '#time-band' ).toggleClass( 'disabled', S.pllength === 0 || S.webradio || S.player !== 'mpd' );
		$( '#time' ).toggleClass( 'disabled', S.webradio || ! [ 'mpd', 'upnp' ].includes( S.player ) );
		$( '.volumeband' ).toggleClass( 'disabled', D.volumenone || $VOLUME.is( ':visible' ) );
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
		var opt  = COMMON.htmlOption( Object.keys( E.preset ) );
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
						$( '#eqpreset' ).html( COMMON.htmlOption( Object.keys( E.preset ) ) );
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
					pica.resize( filecanvas, canvas, V.option.pica ).then( function() {
						FILEIMAGE.render( canvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH, resize.wxh );
					} );
				} else {
					FILEIMAGE.render( filecanvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH );
				}
				clearTimeout( V.timeout.file );
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
var IMAGE     = {
	  load    : list => {
		var $lazyload = $( '#'+ list +' .lazyload' );
		if ( ! $lazyload.length ) return
		
		if ( list === 'lib-list' ) {
			if ( MODE.album() ) {
				$lazyload.off( 'error' ).on( 'error', function() {
					IMAGE.error( this );
				} );
			} else if ( [ 'artist', 'albumartist', 'composer', 'conductor', 'date', 'genre' ].includes( V.mode ) ) {
				$lazyload.off( 'error' ).on( 'error', function() {
					$( this ).replaceWith( '<i class="i-folder li-icon" data="album"></i>' );
				} );
			} else {
				$lazyload.off( 'error' ).on( 'error', function() {
					var $this = $( this );
					var src = $this.attr( 'src' );
					if ( MODE.radio() ) {
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
	, error   : ( el, bookmark ) => {
		var $this      = $( el );
		var src        = $this.attr( 'src' );
		if ( src.slice( -16, -13 ) === 'jpg' ) {
			$this.attr( 'src', src.replace( 'jpg?v=', 'gif?v=' ) );
		} else if ( ! bookmark ) {
			$this.attr( 'src', V.coverart );
		} else { // bookmark
			var icon = ICON( 'bookmark bl' );
			if ( V.libraryhome ) icon += '<a class="label">'+ bookmark +'</a>';
			$this.replaceWith( icon );
			$( '#infoList input' ).parents( 'tr' ).removeClass( 'hide' );
		}
	}
	, replace : ( type, imagefilenoext ) => {
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
			$( '#liimg' ).off( 'error' ).on( 'error', function() {
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
		$( '#lib-mode-list' ).html( UTIL.htmlHash( html ) );
		$( '#lib-mode-list .bkcoverart' ).off( 'error' ).on( 'error', function() {
			IMAGE.error( this, $( this ).prev().text() );
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
		DISPLAY.library();
	}
	, list       : data => { // V.librarylist / V.librarytrack
		if ( ! V.search ) {
			V.libraryhome = false;
			V.librarylist = true;
			if ( data.html === V.html.librarylist ) return
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
		var htmltitle = '<span id="mode-title">'+ data.modetitle;
		if ( 'count' in data && V.mode !== 'latest' ) {
			$( '#lib-list' ).css( 'width', '100%' );
			var htmlpath = '';
		} else if ( data.path === '/srv/http/data/'+ V.mode ) { // radio root
			var htmlpath = ICON( V.mode ) + htmltitle;
		} else if ( ! MODE.file( 'radio' ) ) {
			var htmlpath = ICON( V.search ? 'search' : V.mode ) + htmltitle;
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
		if ( V.mode ) {
			if ( V.mode === 'webradio' ) {
				htmlpath += ICON( 'add btntitle button-webradio-new' );
			} else if ( V.mode === 'latest' ) {
				htmlpath += ICON( 'flash btntitle button-latest-clear' );
			}
			htmlpath     += '</span>';
			$( '#lib-title' )
				.html( htmlpath )
				.removeClass( 'hide' )
				.toggleClass( 'path', $( '#lib-title a' ).length > 0 );
			if ( MODE.radio () ) $( '#lib-title a' ).slice( 0, 4 ).remove();
		}
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
				IMAGE.load( 'lib-list' );
				if ( V.albumlist ) $( '#lib-list' ).addClass( 'album' );
			}
			$( '.liinfopath' ).toggleClass( 'hide', MODE.file( 'radio' ) );
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
			if ( MODE.album() ) {
				$( '.coverart img' ).eq( 0 ).on( 'lazyloaded', function() {
					LIBRARY.padding( $( '.coverart' ).eq( 0 ).height() );
				});
			} else {
				LIBRARY.padding();
			}
			if ( V.color ) $( '#lib-list li' ).eq( 0 ).addClass( 'active' );
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
	, padding    : coverartH => {
		var padding = UTIL.barVisible( 129, 89 );
		if ( V.librarytrack ) {
			if ( D.fixedcover && V.wH > 734 ) padding += 230;
		} else if ( coverartH ) {
			padding += coverartH - 49;
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
		var artist = UTIL.plain( V.lyricsartist );
		var title  = UTIL.plain( V.lyricstitle );
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
		$( '#divlyricstitle img' ).attr( 'src', $( '#coverart' ).attr( 'src' ) );
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
		$LI           = $target.parent();
		var webradio  = $target.hasClass( 'webradio' );
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
	  blank    : () => {
		$( '#page-playback .emptyadd' ).toggleClass( 'hide', S.player !== 'mpd' );
		$( '#playback-controls, #infoicon i, #vu,#divcomposer, #divconductor' ).addClass( 'hide' );
		$( '#divartist, #divtitle, #divalbum' ).removeClass( 'scroll-left' );
		$( '#artist, #title, #album, #progress, #elapsed, #total' ).empty();
		PLAYBACK.progress.set( 0 );
		$( '#sampling' ).empty();
		if ( S.ip || D.ap ) {
			var ip = S.ip || D.apconf.ip;
			if ( ! ip ) return
			
			var htmlqr = '';
			if ( ! S.ip && D.ap ) {
				htmlqr += '<gr>Access Point:</gr> <wh>'+ D.apconf.ssid +'</wh>'
						 +'<br><gr>Password:</gr> <wh>'+ D.apconf.passphrase +'</wh>'
						 +'<div class="code">'+ COMMON.qrCode( D.apconf.qr ) +'</div>';
			}
			htmlqr   +=  '<gr>http://</gr>'+ ip
						+ ( S.hostname ? '<br><gr>http://'+ S.hostname +'</gr>' : '' )
						+'<div class="code">'+ COMMON.qrCode( 'http://'+ ip ) +'</div>';
			$( '#qr' ).remove();
			$( '#map-cover' ).before( '<div id="qr">'+ htmlqr +'</div>' );
			$( '#coverTR' ).toggleClass( 'empty', ! UTIL.barVisible() );
			$( '#coverart' ).addClass( 'hide' );
		} else {
			$( '#coverart' ).removeClass( 'hide' );
			$( '#sampling' ).html( 'Network not connected:&emsp; <a href="settings.php?p=networks">'+ ICON( 'networks' ) +'&ensp;Setup</a>' );
		}
		PLAYBACK.vu();
		COMMON.loaderHide();
	}
	, button   : {
		  options : () => {
			$( '#snapclient' ).toggleClass( 'on', S.player === 'snapcast' );
			$( '#relays' ).toggleClass( 'on', S.relayson );
			$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
			var timevisible = $TIME.is( ':visible' );
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
			PLAYBACK.button.update();
			PLAYBACK.button.updating();
			if ( $VOLUME.is( ':hidden' ) ) $( '#'+ prefix +'-mute' ).toggleClass( 'hide', S.volumemute === 0 );
		}
		, update : () => {
			if ( S.updateaddons ) {
				$( '#button-settings, #addons i' ).addClass( 'bl' );
				if ( ! UTIL.barVisible() ) {
					var prefix = $TIME.is( ':visible' ) ? 'ti' : 'mi';
					$( '#'+ prefix +'-addons' ).addClass( 'hide' );
					$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
				}
			} else {
				$( '#button-settings, #addons i' ).removeClass( 'bl' );
				$( '#mi-addons, #ti-addons' ).addClass( 'hide' );
			}
		}
		, updating : () => {
			clearInterval( V.interval.blinkupdate );
			if ( S.updating_db ) {
				if ( $( '#bar-bottom' ).is( ':hidden' ) || $( '#bar-bottom' ).hasClass( 'transparent' ) ) {
					var prefix = $TIME.is( ':visible' ) ? 'ti' : 'mi';
					$( '#'+ prefix +'-libupdate' ).removeClass( 'hide' );
				} else {
					$( '#library, #button-library' ).addClass( 'blink' );
				}
				$( '#refresh-library, #button-lib-update' ).addClass( 'bl' );
				if ( V.localhost ) {
					var $icons = $( '#library, #button-library, #mi-libupdate, #ti-libupdate' );
					$icons.removeClass( 'blink' );
					V.interval.blinkupdate = setInterval( () => {
						$icons.addClass( 'clear' );
						setTimeout( () => $icons.removeClass( 'clear' ), 1500 );
					}, 2500 );
				}
				$( '#update' ).addClass( 'on' );
			} else {
				$( '#library, #button-library' ).removeClass( 'blink' );
				$( '#refresh-library, #button-lib-update' ).removeClass( 'bl' );
				$( '#mi-libupdate, #ti-libupdate' ).addClass( 'hide' );
				$( '#update' ).removeClass( 'on' );
			}
		}
	}
	, coverart : () => {
		if ( ! D.cover ) {
			COMMON.loaderHide();
			return
		}
		
		if ( D.vumeter ) {
			$( '#coverart' )
				.addClass( 'hide' )
				.attr( 'src', '' );
			$( '#vu' ).removeClass( 'hide' );
			COMMON.loaderHide();
		} else {
			var coverart = S.webradio ? ( S.coverart || S.stationcover ) : S.coverart;
			if ( coverart ) {
				$( '#vu' ).addClass( 'hide' );
				$( '#coverart' )
					.attr( 'src', coverart + UTIL.versionHash() )
					.removeClass( 'hide' );
			} else {
				COVERART.default();
			}
		}
		$( '.wl, .c1, .c2, .c3' ).toggleClass( 'narrow', V.wW < 500 );
	}
	, elapsed  : () => {
		UTIL.intervalClear.elapsed();
		if ( S.elapsed === false || S.state !== 'play' || 'audiocdadd' in V ) return // wait for cd cache on start
		
		var elapsedhms;
		var t_e      = S.elapsed === false ? '#total' : '#elapsed';
		var $elapsed = $( t_e +', #progress span, #pl-list li.active .elapsed' );
		if ( S.elapsed ) $elapsed.text( UTIL.second2HMS( S.elapsed ) );
		if ( S.Time ) { // elapsed + time
			$TIME_RS.option( 'max', S.Time );
			PLAYBACK.progress.set();
			if ( ! V.localhost ) {
				setTimeout( PLAYBACK.progress.animate, 0 ); // delay to after setvalue on load
			} else {
				$TIME_RS_PROG.css( 'transition-duration', '0s' );
			}
		} else { // elapsed only
			if ( ! D.radioelapsed ) {
				$( '#pl-list li.active .elapsed' ).html( V.blinkdot );
				return
			}
		}
		
		V.interval.elapsed = setInterval( () => {
			S.elapsed++;
			if ( ! S.Time || S.elapsed < S.Time ) {
				if ( V.localhost ) {
					$TIME_RS.setValue( S.elapsed );
					$( '#time-bar' ).css( 'width', S.elapsed / S.Time * 100 +'%' );
				}
				elapsedhms = UTIL.second2HMS( S.elapsed );
				$elapsed.text( elapsedhms );
				if ( S.state !== 'play' ) UTIL.intervalClear.elapsed();
			} else {
				S.elapsed = 0;
				UTIL.intervalClear.all();
				$elapsed.empty();
				PLAYBACK.progress.set( 0 );
			}
		}, 1000 );
	}
	, main     : () => {
		if ( ! S.state ) return // suppress on reboot
		
		LOCAL();
		if ( S.state === 'stop' ) PLAYBACK.progress.set( 0 );
		if ( ! V.volumeactive ) VOLUME.setValue(); // immediately change volume when page inactive > page active
		PLAYBACK.button.options();
		clearInterval( V.interval.blinkdot );
		$( '#qr' ).remove();
		if ( S.player === 'mpd' && S.state === 'stop' && ! S.pllength ) { // empty queue
			PLAYBACK.blank();
			return
		}
		
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#coverTR' ).removeClass( 'empty' );
		PLAYBACK.info.set();
		PLAYBACK.coverart();
		V.timehms = S.Time ? UTIL.second2HMS( S.Time ) : '';
		if ( S.elapsed === false || S.webradio ) {
			UTIL.blinkDot();
			return
		}
		
		$TIME_RS.option( 'max', S.Time || 100 );
		if ( S.state === 'stop' ) {
			PLAYBACK.stop();
			return
		}
		
		$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
		$( '#total' ).text( V.timehms );
		if ( S.elapsed === false || S.Time === false || ! ( 'elapsed' in S ) || S.elapsed > S.Time ) {
			$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
			UTIL.blinkDot();
			return
		}
		
		var elapsedhms = S.elapsed ? UTIL.second2HMS( S.elapsed ) : '';
		var htmlelapsed = ICON( S.state ) +'<span>'+ elapsedhms +'</span>';
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
			PLAYBACK.progress.set();
		} else { //play
			PLAYBACK.elapsed();
		}
	}
	, info     : {
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
				var tW = Math.ceil( el.getBoundingClientRect().width );
				if ( tW > V.wW - 20 ) {
					if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
					$( el ).addClass( 'scrollleft' );
				}
			} );
			if ( ! tWmax ) return
			
			$( '.scrollleft' ).css( { // same width and speed
				  width     : tWmax
				, animation : ( ( V.wW + tWmax ) / 80 ) +'s infinite linear scrollleft'
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
				if ( S.state !== 'play' ) {
					$( '#artist' ).text( S.station );
					$( '#title' ).html( V.dots );
					$( '#album' ).text( url );
				} else {
					$( '#artist' ).text( S.Artist || S.station );
					$( '#title' ).html( S.Title || V.blinkdot );
					UTIL.blinkDot();
					$( '#album' ).text( S.Album || url );
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
	, progress : {
		  animate : () => {
			if ( ! D.time && ! D.cover ) return
			
			$TIME_RS_PROG.css( 'transition-duration', S.Time - S.elapsed +'s' );
			$TIME_RS.setValue( S.Time );
			$( '#time-bar' ).css( 'width', '100%' );
		}
		, set        : position => {
			if ( position !== 0 ) position = S.elapsed;
			if ( S.state !== 'play' || ! position ) UTIL.intervalClear.elapsed();
			$TIME_RS_PROG.css( 'transition-duration', '0s' );
			$TIME_RS.setValue( position );
			var w = position && S.Time ? position / S.Time * 100 : 0;
			$( '#time-bar' ).css( 'width', w +'%' );
		}
	}
	, seekBar  : e => {
		var pageX      = e.pageX || e.changedTouches[ 0 ].pageX;
		var $timeband  = $( '#time-band' );
		var posX       = pageX - $timeband.offset().left;
		var bandW      = $timeband.width();
		posX           = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
		var pos        = posX / bandW;
		var elapsed    = Math.round( pos * S.Time );
		var elapsedhms = UTIL.second2HMS( elapsed );
		if ( S.elapsed ) {
			$( '#progress span' ).html( elapsedhms );
		} else {
			$( '#progress' ).html( ICON( 'pause' ) +'<span>'+ elapsedhms +'</span> / '+ UTIL.second2HMS( S.Time ) );
		}
		$( '#time-bar' ).css( 'width', ( pos * 100 ) +'%' );
		if ( ! V.drag ) UTIL.mpcSeek( elapsed );
	}
	, stop     : () => {
		PLAYBACK.progress.set( 0 );
		$( '#elapsed, #total, #progress' ).empty();
		$( '#title' ).removeClass( 'gr' );
		if ( V.timehms ) {
			$( '#progress' ).html( ICON( 'stop' ) +'<span></span>'+ V.timehms );
			$( '#elapsed' )
				.text( V.timehms )
				.addClass( 'gr' );
		}
		if ( ! S.webradio ) return
		
		S.coverart = false;
		PLAYBACK.coverart();
		PLAYBACK.info.set();
		$( '#artist, #title, #album' ).addClass( 'disabled' );
		$( '#sampling' ).html( S.sampling +' • '+ S.ext );
	}
	, vu       : () => {
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
		, home  : data => { // V.playlistlist
			V.playlisthome  = false;
			V.playlistlist  = true;
			V.playlisttrack = false;
			$( '#pl-title' ).html( ICON( 'playlists wh' ) +'PLAYLISTS' );
			var html        = UTIL.htmlHash( data.html );
			$( '#pl-savedlist, #page-playlist .index' ).remove();
			$( '#pl-list' ).after( html ).promise().done( PLAYLIST.render.set );
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
					IMAGE.load( 'pl-savedlist' );
					PLAYLIST.render.set();
					DISPLAY.pageScroll( 0 );
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
	, remove      : () => {
		if ( S.pllength === 1 ) {
			BASH( [ 'mpcremove' ] );
		} else {
			BASH( [ 'mpcremove', $LI.index() + 1, 'CMD POS' ] );
		}
		S.pllength--;
		$( '#pl-trackcount' ).text( S.pllength );
		var time = $( '#pl-time' ).data( 'time' ) - $LI.find( '.time' ).data( 'time' );
		$( '#pl-time' )
			.data( 'time', time )
			.text( UTIL.second2HMS( time ) );
		$LI.remove();
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
			$( '#button-pl-back' ).addClass( 'hide' );
			$( '#pl-search-close' ).trigger( 'click' );
			$( '#button-pl-playlists' ).toggleClass( 'disabled', C.playlists === 0 );
			$( '#button-pl-librandom' )
				.toggleClass( 'bl', S.librandom )
				.toggleClass( 'disabled', C.song === 0 || ! ( 'song' in C ) );
			$( '#pl-savedlist, #page-playlist .index' ).remove();
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
					PLAYLIST.render.set();
					PLAYLIST.render.scroll();
					IMAGE.load( 'pl-list' );
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
			
			UTIL.intervalClear.all();
			if ( V.sortable
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
				if ( S.coverart ) $img
									.removeClass( 'lazyload' )
									.attr( 'src', S.coverart );
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
		
		UTIL.intervalClear.all();
		if ( S.state !== 'stop' ) {
			PLAYBACK.progress.set( 0 );
			$( '#elapsed, #total, #progress' ).empty();
		}
		BASH( [ 'mpcskippl', S.song + 1, S.state, 'CMD POS ACTION' ] );
	}
	, sort        : ( pl, iold, inew ) => {
		V.sortable = true;
		setTimeout( () => V.sortable = false, 500 );
		if ( pl === 'pl-list' ) {
			BASH( [ 'mpcmove', iold + 1, inew + 1, 'CMD FROM TO' ] );
		} else {
			BASH( [ 'savedpledit', $( '#pl-title .lipath' ).text(), 'move', iold + 1, inew + 1, 'CMD NAME ACTION FROM TO' ] );
		}
		var i    = Math.min( iold, inew );
		var imax = Math.max( iold, inew ) + 1;
		$( '#'+ pl +' li .pos' ).slice( i, imax ).each( ( i, el ) => {
			i++
			$( el ).text( i );
		} );
	}
}
var UTIL      = {
	  barVisible      : ( a, b ) => {
		var visible = ! $( '#bar-top' ).hasClass( 'hide' );
		if ( ! a ) return visible
		
		return visible ? a : b
	}
	, blinkDot        : () => {
		if ( V.localhost ) {
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
			return
		}
		
		UTIL.intervalClear.all();
		$( '#vuneedle' ).css( 'transform', '' );
		$( '#elapsed, #total, #progress' ).empty();
		if ( S.state === 'play' ) {
			$( '#elapsed' ).html( S.state === 'play' ? V.blinkdot : '' );
			if ( D.radioelapsed ) {
				$( '#progress' ).html( ICON( S.state ) +'<span></span>' );
				PLAYBACK.elapsed();
			} else {
				PLAYBACK.progress.set( 0 );
			}
		}
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
	, intervalClear   : {
		  all : () => {
			$.each( V.interval, ( k, v ) => clearInterval( v ) );
			PLAYBACK.progress.set( S.webradio ? 0 : '' ); // stop progress animation
			if ( D.vumeter ) $( '#vuneedle' ).css( 'transform', '' );
		}
		, elapsed : () => {
			clearInterval( V.interval.elapsed );
			if ( D.vumeter ) $( '#vuneedle' ).css( 'transform', '' );
		}
	}
	, mpcSeek         : elapsed => {
		S.elapsed = elapsed;
		LOCAL();
		PLAYBACK.progress.set();
		if ( S.state === 'play' ) setTimeout( PLAYBACK.progress.animate, 0 );
		$( '#elapsed, #total' ).removeClass( 'gr' );
		if ( S.state !== 'play' ) $( '#elapsed' ).addClass( 'bl' );
		$( '#elapsed' ).text( UTIL.second2HMS( elapsed ) );
		$( '#total' ).text( UTIL.second2HMS( S.Time ) );
		if ( S.state === 'stop' && UTIL.barVisible() ) {
			$( '#playback-controls i' ).removeClass( 'active' );
			$( '#pause' ).addClass( 'active' );
			$( '#title' ).addClass( 'gr' );
		}
		BASH( [ 'mpcseek', elapsed, S.state, 'CMD ELAPSED STATE' ] );
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
			} else if ( V.playlisttrack ) {
				PLAYLIST.playlists.list( $( '#pl-title .name' ).text() );
			} else {
				PLAYLIST.get();
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
		UTIL.intervalClear.all();
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
				if ( ! V.color ) DISPLAY.pageScroll( V.liscrolltop );
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
}	
var VOLUME    = {
	  ...VOLUME
	, animate : ( target, volume ) => {
		VOLUME.bar.hideClear();
		$( '.volumeband' ).addClass( 'disabled' );
		$( '#volume-bar' ).animate(
			  { width: target +'%' }
			, {
				  duration : Math.abs( target - volume ) * 40
				, easing   : 'linear'
				, complete : () => {
					VOLUME.bar.hide();
					$( '.volumeband' ).removeClass( 'disabled' );
					VOLUME.setValue();
				}
			}
		);
	}
	, bar     : {
		hide : nodelay => {
			V.volumebar = setTimeout( () => {
				$( '#info' ).removeClass( 'hide' ); // 320 x 480
				$( '#volume-bar, #volume-text' ).addClass( 'hide' );
				$( '.volumeband' ).addClass( 'transparent' );
			}, nodelay ? 0 : 3000 );
		}
		, hideClear : () => clearTimeout( V.volumebar )
		, set : e => {
			var pageX  = e.pageX || e.changedTouches[ 0 ].pageX;
			V.volume.x = pageX - V.volume.min;
			S.volume   = Math.round( V.volume.x / V.volume.width * 100 );
			VOLUME.max();
			VOLUME.setValue();
		}
		, show : () => {
			if ( ! $( '#volume-bar' ).hasClass( 'hide' ) ) return
			
			VOLUME.bar.hide();
			$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
			$( '#volume-band-dn, #volume-band-up' ).removeClass( 'transparent' );
		}
	}
	, color   : {
		  mute : () =>  {
			$VOL_TOOLTIP
				.text( S.volumemute )
				.addClass( 'bl' );
			$VOL_HANDLE.addClass( 'bgr60' );
			$( '#volmute' ).addClass( 'mute active' );
			if ( $VOLUME.is( ':hidden' ) ) {
				var prefix = $TIME.is( ':visible' ) ? 'ti' : 'mi';
				$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
			}
		}
		, unMute : () => {
			$VOL_TOOLTIP.removeClass( 'bl' );
			$VOL_HANDLE.removeClass( 'bgr60' );
			$( '#volmute' ).removeClass( 'mute active' )
			$( '#mi-mute, #ti-mute' ).addClass( 'hide' );
		}
	}
	, disable : () => {
		if ( D.volume ) {
			$( '#voldn, #volL, #volB, #volume-band-dn' ).toggleClass( 'disabled', S.volume === 0 );
			$( '#volup, #volR, #volT, #volume-band-up' ).toggleClass( 'disabled', S.volume === 100 );
		}
	}
	, setValue : () => {
		if ( V.animate ) return
		
		if ( D.volume ) {
			$VOLUME_RS.setValue( S.volume );
			if ( ! S.volume ) $VOL_HANDLE.rsRotate( -310 );
		}
		VOLUME.disable();
		$( '#volume-bar' ).css( 'width', S.volume +'%' );
		$( '#volume-text' )
			.text( S.volumemute || S.volume )
			.toggleClass( 'bll', S.volumemute > 0 );
		if ( $VOLUME.is( ':hidden' ) ) {
			var prefix = $TIME.is( ':visible' ) ? 'ti' : 'mi';
			$( '#'+ prefix +'-mute' ).toggleClass( 'hide', ! S.volumemute );
		}
		S.volumemute ? VOLUME.color.mute( S.volumemute ) : VOLUME.color.unMute();
	}
	, upDown  : up => {
		up ? S.volume++ : S.volume--;
		if ( D.volume ) $VOLUME_RS.setValue( S.volume );
		VOLUME.max();
		S.volumemute = 0;
		VOLUME.setValue();
		VOLUME.set();
	}
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
