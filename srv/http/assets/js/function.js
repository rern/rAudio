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
function addonsdl( std ) {
	if ( std == -1 ) {
		info( {
			  icon    : 'jigsaw'
			, title   : 'Addons'
			, message : 'Download from Addons server failed.'
					   +'<br>Please try again later.'
			, ok      : function() {
				loader( 'hide' );
			}
		} );
	} else {
		location.href = '/settings/addons.php';
	}
}
function clearIntervalAll() {
	[ G.intElapsed, G.intElapsedPl, G.intKnob, G.intRelaysTimer, G.intVu ].forEach( function( el ) {
		clearInterval( el );
	} );
}
function colorSet() {
	$( '.licover' ).toggleClass( 'hide', window.innerHeight < 590 );
	colorpicker = new KellyColorPicker( {
		  place  : 'canvascolor'
		, size   : 230
		, color  : $( '#button-library' ).css( 'background-color' )
		, userEvents : {
			change : function( e ) {
				var hex = e.getCurColorHex();
				var h = Math.round( 360 * e.getCurColorHsv().h );
				var hsg = 'hsl('+ h +',3%,';
				$( '#bar-top, #playback-controls i, #tab-playlist, .menu a, .submenu, #colorcancel' ).css( 'background-color', hsg +'30%)' );
				$( '.content-top, #tab-playback' ).css( 'background', hsg +'20%)' );
				$( '.lib-icon, gr' ).css( 'cssText', 'color: '+ hsg +'60%) !important;' );
				$( '#lib-list li.active i, #lib-list li.active .time, #lib-list li.active .li2' ).css( 'color', hsg +'30%)' );
				$( '.menu a' ).css( 'border-top', '1px solid '+ hsg +'20%)' );
				$( '#lib-list li' ).css( 'border-bottom', '1px solid '+ hsg +'20%)' );
				$( '#playback-controls .active, #tab-library, #button-library, #lib-list li.active, #colorok' ).css( 'background-color', hex );
				$( '#button-lib-back, .lialbum' ).css( 'color', hex );
			}
		}
	} );
	$( '#colorpicker' ).removeClass( 'hide' );
	$( 'body' ).addClass( 'disablescroll' );
}
function contextmenuLibrary( $li, $target ) {
	$( '.menu' ).addClass( 'hide' );
	var $menu = $( $li.find( '.lib-icon' ).data( 'target' ) );
	G.list = {};
	G.list.li = $li; // for contextmenu
	G.list.licover = $li.hasClass( 'licover' );
	G.list.album = $li.find( '.lialbum' ).text()
	G.list.singletrack = !G.list.licover && $li.find( '.lib-icon' ).hasClass( 'fa-music' );
	// file modes  - path > path ... > tracks
	// album mode  - path > tracks
	// other modes - name > name-album > filtered tracks
	G.list.path = $li.find( '.lipath' ).text() || $( '#mode-title' ).text();
	if ( G.playlist ) {
		G.list.name = $li.find( '.liname' ).text() || '';
		G.list.artist = $li.find( '.liartist' ).text() || '';
	} else if ( $( '.licover' ).length && !$li.hasClass( 'licover' ) ) {
		G.list.name = $li.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		G.list.artist = $( '.licover .liartist' ).text() || '';
	} else {
		G.list.name = $li.find( '.li1' ).text() || $li.find( '.liname' ).text();
	}
	G.list.track = $li.data( 'track' ) || '';  // cue - in contextmenu
	if ( ( G.display.tapaddplay || G.display.tapreplaceplay )
		&& !G.color
		&& !$target.hasClass( 'lib-icon' )
		&& !G.list.licover
		&& G.status.player === 'mpd'
	) {
		var i = G.display.tapaddplay ? 0 : 1;
		$menu.find( '.submenu:eq( '+ i +' )' ).click();
		$li.addClass( 'active' );
		return
	}
	
	$( '.replace' ).next().addBack().toggleClass( 'hide', !G.status.playlistlength );
	$( '.refresh-library' ).toggleClass( 'hide', !( 'updating_db' in G.status ) );
	$( '#menu-folder a:not(.sub)' ).toggleClass( 'hide', G.list.licover && [ 'album', 'file', 'nas', 'sd', 'usb' ].indexOf( G.mode ) === -1 );
	$( '.tag' ).toggleClass( 'hide', !$( '.licover' ).length );
	$li.addClass( 'active' );
	if ( G.list.licover ) {
		var menutop = G.bars ? '310px' : '270px';
	} else {
		var menutop = ( $li.offset().top + 48 ) +'px';
	}
	$menu
		.css( 'top',  menutop )
		.removeClass( 'hide' );
	$menu.toggleClass( 'fixed', G.list.licover && $li.css( 'position' ) === 'fixed' );
	var targetB = $menu.offset().top + $menu.height();
	var wH = window.innerHeight;
	if ( targetB > wH - ( G.bars ? 80 : 40 ) + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
}
function coverartChange() {
	if ( G.playback ) {
		var src = $( '#coverart' ).attr( 'src' );
		var path = G.status.file.substr( 0, G.status.file.lastIndexOf( '/' ) );
		var album = G.status.Album;
		var artist = G.status.Artist;
	} else {
		var src = $( '.licoverimg img' ).attr( 'src' );
		var path = $( '.licover .lipath' ).text();
		if ( path.split( '.' ).pop() === 'cue' ) path = path.substr( 0, path.lastIndexOf( '/' ) );
		var album = $( '.licover .lialbum' ).text();
		var artist = $( '.licover .liartist' ).text();
	}
	if ( 'discid' in G.status ) {
		var imagefile = '/srv/http/data/audiocd/'+ G.status.discid; // no ext
		var type = 'audiocd';
	} else {
		var imagefile = '/mnt/MPD/'+ path +'/cover' // no ext
		var type = 'coverart';
	}
	if ( G.playback ) {
		var pbembedded = $( '#coverart' ).attr( 'src' ).split( '/' )[ 2 ] === 'embedded';
		var pbonlinefetched = $( '#divcover .cover-save' ).length;
		var pbcoverdefault = $( '#coverart' ).attr( 'src' ) === G.coverdefault;
	} else {
		var liembedded = $( '.licoverimg img' ).attr( 'src' ).split( '/' )[ 2 ] === 'embedded';
		var lionlinefetched = $( '.licover .cover-save' ).length;
		var licoverdefault = $( '.licoverimg img' ).attr( 'src' ) === G.coverdefault;
	}
	var coverartlocal = ( G.playback && !pbembedded && !pbonlinefetched && !pbcoverdefault )
						|| ( G.library && !liembedded && !lionlinefetched && !licoverdefault );
	var footer = ( G.playback && pbembedded ) || ( G.library && liembedded ) ? '(Embedded)' : '';
	info( {
		  icon        : 'coverart'
		, title       : 'Change Album CoverArt'
		, message     : '<img class="imgold">'
					   +'<p class="infoimgname">'+ album
					   +'<br>'+ artist +'</p>'
		, footer      : footer
		, beforeshow  : function() { // fix direct replace src
			$( '.imgold' ).attr( 'src', src );
		}
		, filelabel   : '<i class="fa fa-folder-open"></i>File'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, buttonlabel : !coverartlocal ? '' : '<i class="fa fa-minus-circle"></i>Remove'
		, buttoncolor : !coverartlocal ? '' : red
		, button      : !coverartlocal ? '' : function() {
			var ext = $( '.infomessage .imgold' ).attr( 'src' ).slice( -3 );
			bash( [ 'coverartreset', imagefile +'.'+ ext, path, artist, album ], function( url ) {
				G.playback ? $( '.coveredit' ).remove() : $( '.bkedit' ).remove();
				$( '#coverart, #liimg' ).css( 'opacity', '' );
				if ( G.playback ) {
					coverartDefault();
				} else {
					$( '.licoverimg img' ).attr( 'src', url || G.coverdefault );
				}
			} );
		}
		, ok          : function() {
			imageReplace( imagefile, type );
		}
	} );
}
function coverartDefault() {
	if ( G.display.novu ) {
		$( '#coverart' ).attr( 'src', G.coverdefault );
		$( '#vu' ).addClass( 'hide' );
	} else {
		$( '#coverart' )
			.addClass( 'hide' )
			.attr( 'src', G.coverdefault );
		$( '#vu' ).removeClass( 'hide' );
		if ( !$( '#vu' ).hasClass( 'hide' ) ) G.status.state === 'play' ? vu() : vuStop();
	}
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
}
function coverartSave() {
	if ( G.playback ) {
		var src = $( '#coverart' ).attr( 'src' );
		var file = G.status.file;
		var path = '/mnt/MPD/'+ file.substr( 0, file.lastIndexOf( '/' ) );
		var artist = G.status.Artist;
		var album = G.status.Album;
	} else {
		var src = $( '.licover img' ).attr( 'src' );
		var path = '/mnt/MPD/'+ $( '.licover .lipath' ).text();
		if ( path.slice( -4 ) === '.cue' ) path = path.substr( 0, path.lastIndexOf( '/' ) );
		var artist = $( '.licover .liartist' ).text();
		var album = $( '.licover .lialbum' ).text();
	}
	info( {
		  icon    : 'coverart'
		, title   : 'Save Album CoverArt'
		, message : '<img src="'+ src +'">'
					+'<p class="infoimgname">'+ album
					+'<br>'+ artist +'</p>'
		, ok      : function() {
			bash( [ 'coversave', '/srv/http'+ src.slice( 0, -15 ) + src.slice( -4 ), path ] );
		}
	} );
}
function cssKeyframes( name, trx0, trx100 ) {
	var moz = '-moz-'+ trx0;
	var moz100 = '-moz-'+ trx100;
	var webkit = '-webkit-'+ trx0;
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
function displayBars() {
	if ( !$( '#bio' ).hasClass( 'hide' ) ) return
	
	var wH = window.innerHeight;
	var wW = document.body.clientWidth;
	var smallscreen = wH < 590 ||wW < 500;
	var lcd = ( wH <= 320 && wW <= 480 ) || ( wH <= 480 && wW <= 320 );
	if ( !G.display.bars || ( smallscreen && !G.display.barsalways ) || lcd ) {
		G.bars = false;
		$( '#bar-top' ).addClass( 'hide' );
		$( '#bar-bottom' ).addClass( 'transparent' );
		$( '#page-playback, #lib-mode-list' ).addClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).removeClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).addClass( 'bars-off' );
		$( '.content-top' ).css( 'top', 0 );
		$( '.emptyadd' ).css( 'top', '90px' );
	} else {
		G.bars = true;
		$( '#bar-top' ).removeClass( 'hide' );
		$( '#bar-bottom' ).removeClass( 'hide transparent' );
		$( '#page-playback, #lib-mode-list' ).removeClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).addClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).removeClass( 'bars-off' );
		$( '.content-top' ).css( 'top', '40px' );
		$( '.emptyadd' ).css( 'top', '' );
		displayBottom();
	}
}
function displayBottom() {
	$( '#tab-playback' )
		.removeAttr( 'class' )
		.addClass( 'fa fa-'+ G.status.player );
	$( '#bar-bottom i' ).removeClass( 'active' );
	$( '#tab-'+ G.page ).addClass( 'active' );
}
function displayCheckboxSet( i, enable, check ) {
	$( '#infoContent input' ).eq( i )
		.prop( 'disabled', !enable )
		.prop( 'checked', check )
		.parent().toggleClass( 'gr', !enable );
}
function displayPlayback() {
	if ( G.status.player !== 'mpd' ) {
		G.iplayer = G.status.player;
	} else if ( 'file' in G.status ) {
		if ( G.status.file.indexOf( 'radiofrance.fr' ) !== -1 ) {
			G.iplayer = 'radiofrance';
		} else if ( G.status.file.indexOf( 'radioparadise.com' ) !== -1 ) {
			G.iplayer = 'radioparadise';
		} else if ( G.status.webradio ) {
			G.iplayer = 'webradio';
		} else if ( G.status.file.slice( 0, 4 ) === 'cdda' ) {
			G.iplayer = 'audiocd';
		} else {
			G.iplayer = '';
		}
	}
	$( '#playericon' )
		.removeAttr( 'class' )
		.addClass( 'hide' );
	if ( G.iplayer ) {
		$( '#playericon' )
			.addClass( 'fa fa-'+ G.iplayer )
			.removeClass( 'hide' );
	}
	$( '#time-knob' ).toggleClass( 'hide', !G.display.time );
	$( '#coverart-block' )
		.toggleClass( 'hide', !G.display.cover )
		.toggleClass( 'coversmall', G.display.coversmall );
	$( '#coverart' ).css( 'width', G.display.coversmall ? '230px' : '' );
	var volume = ( G.display.volumenone || !G.display.volume ) ? 0 : 1;
	$( '#volume-knob' ).toggleClass( 'hide', volume === 0 );
	var column = ( G.display.time ? 1 : 0 ) + ( G.display.cover ? 1 : 0 ) + volume;
	var $elements = $( '#time-knob, #coverart-block, #volume-knob, #play-group, #vol-group' );
	if ( column === 2 ) {
		$elements.css( 'width', '' );
		$( '#coverart-block' ).addClass( 'coverlarge' );
		$( '#time-knob, #volume-knob, #play-group, #vol-group' ).addClass( 'knobsmall' );
		$( '#time-knob' ).css( 'margin-right', '20px' );
		$( '#volume-knob' ).css( 'margin-left', '20px' );
	} else {
		$elements.css( 'width', column === 1 ? '100%' : '' );
		$( '#playback-row' ).css( 'max-width', '' );
		$( '#coverart-block' ).removeClass( 'coverlarge' );
		$( '#time-knob, #volume-knob, #play-group, #vol-group' ).removeClass( 'knobsmall' );
		$( '#time-knob' ).css( 'margin-right', '' );
		$( '#volume-knob' ).css( 'margin-left', '' );
	}
	$( '#play-group, #vol-group' ).toggleClass( 'hide', G.status.player !== 'mpd' || !G.display.buttons );
	if ( G.display.time ) {
		$( '#time' ).roundSlider( G.status.webradio || G.status.player !== 'mpd' || !G.status.playlistlength ? 'disable' : 'enable' );
		$( '#progress' ).empty();
	}
	$( '#time-bar, #time-band' ).toggleClass( 'hide', $( '#time-knob' ).is( ':visible' ) );
	$( '#time-band' ).toggleClass( 'disabled', !G.status.playlistlength || G.status.player !== 'mpd' || G.status.webradio );
	$( '#time, .timemap, .covermap' ).toggleClass( 'disabled', [ 'mpd', 'upnp' ].indexOf( G.status.player ) === -1 );
	$( '.volumeband' )
		.toggleClass( 'hide', G.display.volume )
		.toggleClass( 'disabled', G.status.volume == -1 );
	$( '.covermap.r1, #coverB' ).removeClass( 'disabled' );
	$( '#timemap' ).toggleClass( 'hide', G.display.cover );
	displayBars();
}
function displaySave( keys ) {
	var values = infoVal();
	keys.forEach( function( k, i ) {
		G.display[ k ] = values[ i ];
	} );
	$.post( cmdphp, { cmd: 'displayset', displayset : JSON.stringify( G.display ) } );
}
/*function flag( iso ) { // from: https://stackoverflow.com/a/11119265
	var iso0 = ( iso.toLowerCase().charCodeAt( 0 ) - 97 ) * -15;
	var iso1 = ( iso.toLowerCase().charCodeAt( 1 ) - 97 ) * -20;
	return iso1 +'px '+ iso0 +'px';
}*/
function getBio( artist ) {
	if ( artist === $( '#biocontent .artist' ).text() ) {
		$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
		$( '#bio' ).removeClass( 'hide' );
		return
	}
	
	loader();
	var url = 'http://ws.audioscrobbler.com/2.0/'
			+'?autocorrect=1'
			+'&format=json'
			+'&method=artist.getinfo'
			+'&api_key='+ G.apikeylastfm
			+'&artist='+ encodeURI( artist )
	$.post( url, function( data ) {
		if ( 'error' in data || ( !data.artist.bio.content ) ) {
			info( {
				  icon    : 'bio'
				, title   : 'Bio'
				, message : 'No data available.'
			} );
			loader( 'hide' );
			return
		}
		
		var data = data.artist;
		var content = data.bio.content.replace( /\n/g, '<br>' ).replace( /Read more on Last.fm.*/, '</a>' );
		var genre = data.tags.tag[ 0 ].name;
		if ( genre ) genre = '<p class="genre"><i class="fa fa-genre fa-lg"></i>&ensp;'+ genre +'</p>';
		var similar =  data.similar.artist;
		if ( similar ) {
			similars = '<p><i class="fa fa-artist fa-lg"></i>&ensp;Similar Artists:<p><span>';
			similar.forEach( function( artist ) {
				similars += '<a class="biosimilar">'+ artist.name +'</a>,&ensp;';
			} );
			similars = similars.slice( 0, -7 ) +'</span><br><br>';
		}
		var html = '<p class="artist"><i class="closebio fa fa-times close-root"></i>'+ artist +'</p>'
				+ genre
				+ similars
				+'<p>'+ content +'</p>'
				+'<div style="clear: both;"></div>'
				+'<br><br>'
				+'<p id="biosource">'
					+'<gr>Text:</gr> <a href="https://www.last.fm">last.fm</a>&emsp;'
					+'<gr>Image:</gr> <a href="https://www.fanart.tv">fanart.tv</a></p>';
		$( '#biocontent' ).html( html ).promise().done( function() {
			$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
			$( '#bio' )
				.removeClass( 'hide' )
				.scrollTop( 0 );
			$( '#biobanner, #bioimg' ).addClass( 'hide' );
			loader( 'hide' );
			
			$.get( 'https://webservice.fanart.tv/v3/music/'+ data.mbid +'?api_key='+ G.apikeyfanart, function( data ) {
				if ( 'error message' in data ) return
				
				if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) {
					$( '#biobanner' )
						.attr( 'src', data.musicbanner[ 0 ].url.replace( '//assets.', '//' ) )
						.removeClass( 'hide' );
				}
				if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
					var url = '';
					var images = '';
					data.artistthumb.forEach( function( el ) {
						url = el.url.replace( '//assets.', '//' );
						images += '<a href="'+ url +'" target="_blank"><img src="'+ url.replace( '/fanart/', '/preview/' ) +'"></a>';
					} );
					$( '#bioimg' )
						.html( images )
						.removeClass( 'hide' );
				}
			} );
		} );
	} );
}
function getOrientation( file, callback ) { // return: 1 - undefined
	var reader = new FileReader();
	reader.onload = function( e ) {
		var view = new DataView( e.target.result );
		if ( view.getUint16( 0, false ) != 0xFFD8 ) return callback( 1 ); // not jpeg
		
		var length = view.byteLength, offset = 2;
		while ( offset < length ) {
			if ( view.getUint16( offset + 2, false ) <= 8 ) return callback( 1 );
			
			var marker = view.getUint16( offset, false );
			offset += 2;
			if ( marker == 0xFFE1 ) {
				if ( view.getUint32( offset += 2, false ) != 0x45786966 ) return callback( 1 );
				
				var little = view.getUint16( offset += 6, false ) == 0x4949;
				offset += view.getUint32( offset + 4, little );
				var tags = view.getUint16( offset, little );
				offset += 2;
				for ( var i = 0; i < tags; i++ ) {
					if ( view.getUint16( offset + ( i * 12 ), little ) == 0x0112 ) {
						var ori = view.getUint16( offset + ( i * 12 ) + 8, little );
						return callback( ori );
					}
				}
			} else if ( ( marker & 0xFF00 ) != 0xFF00 ) {
				break;
			} else { 
				offset += view.getUint16( offset, false );
			}
		}
		return callback( 1 );
	};
	reader.readAsArrayBuffer( file.slice( 0, 64 * 1024 ) );
}
function getPlaybackStatus( render ) {
	G.getstatus = 1;
	local();
	bash( '/srv/http/bash/status.sh', function( list ) {
		if ( !list ) return
		
		try {
			var status = JSON.parse( list );
		} catch( e ) {
			var msg = e.message;
			if ( msg.indexOf( 'position' ) !== -1 ) {
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
		
		$.each( status, function( key, value ) {
			G.status[ key ] = value;
		} );
		setButtonControl();
		displayBottom();
		if ( G.playback || render ) { // 'render' - add to blank playlist
			displayPlayback();
			renderPlayback();
		} else if ( G.library ) {
			if ( !$( '#lib-search-close' ).text() && !G.librarylist ) renderLibrary();
			if ( counts ) {
				var counts = G.status.counts;
				$( '#lib-mode-list' ).data( 'count', counts.title )
				$( '#li-count' ).html( counts.title.toLocaleString() +' <i class="fa fa-music gr"></i>' );
				delete counts.title;
				$.each( counts, function( key, val ) {
					$( '#mode-'+ key ).find( 'grl' ).text( val ? val.toLocaleString() : '' );
				} );
			}
		} else {
			if ( !G.plremove && !G.savedlist && !G.savedplaylist && !G.sortable && !$( '#pl-search-close' ).text() ) getPlaylist();
		}
		setButtonUpdating();
		G.getstatus = 0;
	} );
}
function getPlaylist() {
	list( { cmd: 'current' }, renderPlaylist, 'json' );
}
function hideGuide() {
	if ( G.guide ) {
		G.guide = 0;
		$( '#coverTR' ).toggleClass( 'empty', !G.status.playlistlength && !G.bars );
		$( '.map' ).removeClass( 'mapshow' );
		$( '#bar-bottom' ).removeClass( 'translucent' );
		if ( !G.bars ) $( '#bar-bottom' ).addClass( 'transparent' );
		if ( !G.display.progressbar ) $( '#timebar' ).addClass( 'hide' );
		$( '.band, #volbar' ).addClass( 'transparent' );
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		$( '.coveredit' ).css( 'z-index', '' );
	}
}
function HMS2Second( HMS ) {
	var hhmmss = HMS.split( ':' ).reverse();
	if ( !hhmmss[ 1 ] ) return +hhmmss[ 0 ];
	if ( !hhmmss[ 2 ] ) return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60;
	return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60 + hhmmss[ 2 ] * 3600;
}
function imageReplace( imagefile, type ) {
	var ext = '.'+ G.infofile.name.split( '.' ).pop();
	var formData = new FormData();
	formData.append( 'cmd', 'imagereplace' );
	if ( ext !== '.gif' ) {
		ext = '.jpg';
		var base64 = $( '.infoimgnew' )
						.attr( 'src' )
						.split( ',' )
						.pop();
		formData.append( 'base64', base64 );
	} else { // gif - upload file
		formData.append( 'file', G.infofile );
	}
	formData.append( 'imagefile', imagefile + ext );
	formData.append( 'type', type );
	$.ajax( {
		  url         : cmdphp
		, type        : 'POST'
		, data        : formData
		, processData : false  // no - process the data
		, contentType : false  // no - contentType
		, success     : function() {
			G.playback ? $( '.coveredit' ).remove() : $( '.bkedit' ).remove();
			$( '#coverart, #liimg' ).css( 'opacity', '' );
		}
	} );
}
function imgLoadError( list ) { // on img load error
	lazyload.update();
	var $ellazy = $( '#'+ list +' .lazy' );
	if ( !$ellazy.length ) return
	
	if ( list === 'lib-list' ) {
		if ( G.mode === 'album' ) {
			$ellazy.off( 'error' ).on( 'error', function() {
				var $this = $( this );
				var src = $this.attr( 'src' );
				var src = src.slice( -3 ) === 'jpg' ? src.slice( 0, -3 ) + 'gif' : '/assets/img/coverart.svg';
				$this.attr( 'src', src );
			} );
		} else {
			var mode = G.mode === 'webradio' ? 'webradio' : 'folder';
			$ellazy.off( 'error' ).on( 'error', function() {
				$( this ).replaceWith( '<i class="fa fa-'+ mode +' lib-icon" data-target="#menu-'+ mode +'"></i>' );
			} );
		}
	} else {
		$ellazy.off( 'error' ).on( 'error', function() {
			var $this = $( this );
			var icon = $this.hasClass( 'webradio' ) ? 'webradio' : 'music';
			$this.replaceWith( '<i class="fa fa-'+ icon +' pl-icon" data-target="#menu-filesavedpl"></i>' );
		} );
	}
}
var chklibrary = {
	  album          : '<i class="fa fa-album wh"></i><gr>Album</gr>'
	, nas            : '<i class="fa fa-networks wh"></i><gr>Network</gr>'
	, albumartist    : '<i class="fa fa-albumartist wh"></i><gr>AlbumArtist</gr>'
	, sd             : '<i class="fa fa-microsd wh"></i><gr>SD</gr>'
	, artist         : '<i class="fa fa-artist wh"></i><gr>Artist</gr>'
	, usb            : '<i class="fa fa-usbdrive wh"></i><gr>USB</gr>'
	, composer       : '<i class="fa fa-composer wh"></i><gr>Composer</gr>'
	, webradio       : '<i class="fa fa-webradio wh"></i><gr>WebRadio</gr>'
	, conductor      : '<i class="fa fa-conductor wh"></i><gr>Conductor</gr>'
	, date           : '<i class="fa fa-date wh"></i><gr>Date</gr>'
	, genre          : '<i class="fa fa-genre wh"></i><gr>Genre</gr>'
	, '-'            : ''
	, count          : 'Count'
	, label          : 'Label'
}
var chklibrary2 = {
	  albumbyartist  : '<i class="fa fa-coverart wh"></i>Sort Album by artists'
	, backonleft     : '<i class="fa fa-arrow-left wh"></i>Back button on left side'
	, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-plus wh"></i><gr>Add + Play</gr>'
	, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-replace wh"></i><gr>Replace + Play</gr>'
	, playbackswitch : 'Switch to Playback <gr>on <i class="fa fa-play-plus wh"></i>or <i class="fa fa-play-replace wh"></i>'
	, plclear        : 'Confirm <gr>on replace Playlist</gr>'
	, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
	, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
}
function infoLibrary( page2 ) {
	var checkbox = Object.values( !page2 ? chklibrary : chklibrary2 );
	var keys = Object.keys( !page2 ? chklibrary : chklibrary2 );
	keys = keys.filter( function( k ) {
		return k[ 0 ] !== '-'
	} );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	info( {
		  icon         : 'library'
		, title        : !page2 ? 'Library Home Display' : 'Library/Playlist Options'
		, message      : !page2 ? '1/2 - Show selected items:' : '2/2 - Options:'
		, messagealign : 'left'
		, arrowright   : !page2 ? function() { infoLibrary( 2 ); } : ''
		, arrowleft    : !page2 ? '' : infoLibrary
		, checkbox     : checkbox
		, checkcolumn  : !page2 ? 1 : ''
		, values       : values
		, checkchanged : 1
		, beforeshow   : function() {
			$( '#infoContent' ).css( 'height', '340px' );
			if ( page2 ) {
				$( '.infomessage, #infoContent td' ).css( 'width', '286' );
				var $chk = $( '#infoContent input' );
				keys.forEach( function( k, i ) {
					window[ '$'+ k ] = $chk.eq( i );
					window[ k ] = i;
				} );
				$tapaddplay.add( $tapreplaceplay ).click( function() {
					var i = $chk.index( this ) === tapaddplay ? tapreplaceplay : tapaddplay;
					if ( $( this ).prop( 'checked' ) ) $chk.eq( i ).prop( 'checked', 0 );
				} );
				$hidecover.change( function() {
					if ( $( this ).prop( 'checked' ) ) {
						displayCheckboxSet( fixedcover, false, false );
					} else {
						displayCheckboxSet( fixedcover, true );
					}
				} );
				$fixedcover.prop( 'disabled', G.display.hidecover );
			} else {
				$( '#infoContent tr' ).last().before( '<tr><td colspan="2"><hr></td></tr>' );
			}
		}
		, ok           : function () {
			displaySave( keys );
			$( '#button-lib-back, #button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
			if ( G.library ) {
				if ( G.librarylist ) {
					if ( $( '.lib-index' ).length ) return
					
					if ( G.display.hidecover ) {
						$( '.licover' ).addClass( 'hide' );
					} else {
						if ( !$( '.licover' ).length ) {
							var query = G.query[ G.query.length - 1 ];
							list( query, function( data ) {
								data.path = query.path;
								data.modetitle = query.modetitle;
								renderLibraryList( data );
							}, 'json' );
							return
						}
						
						var pH = G.bars ? 130 : 90;
						if ( G.display.fixedcover ) {
							pH += 230;
							$( '.licover' ).removeClass( 'nofixed' );
							$( '#lib-list li:eq( 1 )' ).addClass( 'track1' );
							$( '#lib-list p' ).addClass( 'fixedcover' )
						} else {
							$( '.licover' ).addClass( 'nofixed' );
							$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
							$( '#lib-list p' ).removeClass( 'fixedcover' )
						}
						$( '.licover' ).removeClass( 'hide' );
					}
				} else {
					renderLibrary();
				}
			}
		}
	} );
}
var chkplayback = {
	  bars         : 'Top-Bottom bars'
	, barsalways   : 'Bars always on'
	, time         : 'Time'
	, progressbar  : 'Progress bar'
	, cover        : 'Coverart'
	, coversmall   : 'Small coverart'
	, volume       : 'Volume'
	, radioelapsed : 'WebRadio time'
	, buttons      : 'Buttons'
	, novu         : ''
}
function infoPlayback() {
	if ( 'coverTL' in G ) $( '#coverTL' ).tap();
	var keys = Object.keys( chkplayback );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	info( {
		  icon         : 'playback'
		, title        : 'Playback Display'
		, message      : 'Show selected items:'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplayback )
		, checkcolumn  : 1
		, radio        : {
			  '<img class="imgicon" src="/assets/img/vu.png">&ensp;<gr>No cover</gr>'       : false
			, '<img class="imgicon" src="/assets/img/coverart.svg">&ensp;<gr>No cover</gr>' : true
		}
		, radiocolumn  : 1
		, order        : [ 'checkbox', 'radio' ]
		, values       : values
		, checkchanged : 1
		, beforeshow   : function() {
			$( '#infoContent tr' ).last().before( '<tr><td colspan="2"><hr></td></tr>' );
			$( '#infoContent' ).find( 'tr:eq(5 ), tr:eq( 6 )' ).toggleClass( 'hide', !G.display.cover );
			if ( !G.display.bars ) displayCheckboxSet( 1 );      // disable by bars hide
			if ( G.display.time ) displayCheckboxSet( 3 );       // disable by time
			if ( !G.display.cover ) displayCheckboxSet( 5 );     // disable by cover
			if ( G.display.volumenone ) displayCheckboxSet( 6 ); // disable by mpd volume
			if ( !G.display.time && !G.display.volume ) {
				displayCheckboxSet( 4 ); // disable by autohide
				displayCheckboxSet( 8 );
			}
			if ( G.status.player !== 'mpd' ) displayCheckboxSet( 8 );
			var $chk = $( '#infoContent input' );
			keys.forEach( function( k, i ) {
				window[ '$'+ k ] = $chk.eq( i );
				window[ k ] = i;
			} );
			$time.add( $volume ).change( function() {
				var t = $time.prop( 'checked' );
				var v = $volume.prop( 'checked' );
				if ( t || v ) {
					displayCheckboxSet( cover, true );
					displayCheckboxSet( progressbar, false, false );
					displayCheckboxSet( buttons, true );
				} else {
					displayCheckboxSet( cover, false, true );
					displayCheckboxSet( progressbar, false, false );
					displayCheckboxSet( buttons, false, false );
				}
				if ( !t && $cover.prop( 'checked' ) ) {
					displayCheckboxSet( progressbar, true, true );
				} else {
					displayCheckboxSet( progressbar, false, false );
				}
				if ( !t && ( !v || G.display.volumenone ) ) {
					displayCheckboxSet( cover, true, true );
					displayCheckboxSet( progressbar, true, true );
				}
			} );
			$bars.change( function() {
				if ( $( this ).prop( 'checked' ) ) {
					displayCheckboxSet( barsalways, true );
				} else {
					displayCheckboxSet( barsalways, false, false );
				}
			} );
			$cover.change( function() {
				if ( $( this ).prop( 'checked' ) ) {
					if ( !$time.prop( 'checked' ) ) displayCheckboxSet( progressbar, true, true );
					displayCheckboxSet( coversmall, true );
					$( '#divnovu' ).removeClass( 'hide' );
				} else {
					displayCheckboxSet( progressbar, false, false );
					displayCheckboxSet( coversmall, false, false );
					if ( !$time.prop( 'checked' ) && ( !$volume.prop( 'checked' ) || G.display.volumenone ) ) displayCheckboxSet( time, true, true );
					$( '#divnovu' ).addClass( 'hide' );
				}
			} );
		}
		, ok           : function () {
			displaySave( keys );
			G.bars = G.display.bars;
			G.coverdefault = '/assets/img/'+ ( G.display.novu ? 'coverart.'+ hash +'.svg' : 'vu.'+ hash +'.png' );
			displayBars();
			if ( G.playback ) {
				displayPlayback();
				setButtonControl();
				renderPlayback();
				$( '#ti-relays, #i-relays' ).toggleClass( 'hide', !G.status.relayson );
			} else if ( G.library ) {
				$( '.list p' ).toggleClass( 'bars-on', G.bars );
				if ( bars !== G.bars && $( '.coverart' ).length ) {
					G.scrolltop[ 'ALBUM' ] = $( window ).scrollTop();
					$( '#mode-album' ).click();
				}
			}
		}
	} );
}
function infoNoData() {
	if ( G.mode === 'nas' ) {
		var message = 'Network storage not available.'
					 +'<br>To setup:'
					 +'<br>Settings > System - Storage - <i class="fa fa-plus-circle wh"></i>';
	} else {
		var message = 'Database not available for this location.'
					 +'<br>To populate new files to database:'
					 +'<br>Settings > Library | <i class="fa fa-refresh-library wh"></i>';
	}
	info( {
		  icon      : 'library'
		, title     : 'Library Database'
		, message   : message
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
		  icon    : 'refresh-library'
		, title   : 'Library Database'
		, message : ( path ? '<i class="fa fa-folder"></i> <wh>'+ path +'</wh>' : '' )
		, radio   : ( path ? '' : { 'Only changed files' : 1, 'Rebuild entire database': 2 } )
		, values  : [ 1 ]
		, ok      : function() {
			if ( infoVal() == 2 ) path = 'rescan';
			bash( [ 'mpcupdate', path ] );
		}
	} );
}
function loader( toggle ) {
	$( '#loader' ).toggleClass( 'hide', toggle === 'hide' );
	if ( !G.load ) {
		G.load = 1;
		$( '#loader' ).removeClass( 'splash' );
		$( '#volume .rs-transition' ).css( 'transition-property', '' ); // restore animation after load
	}
}
function local( delay ) {
	G.local = 1;
	setTimeout( function() { G.local = 0 }, delay || 300 );
}
function mpcSeek( seekto ) {
	var seektime = Math.round( seekto / 1000 * G.status.Time );
	if ( G.display.time ) {
		G.status.elapsed = seektime;
		elapsed = seektime;
		position = seekto;
		var elapsedhms = second2HMS( seektime );
		var timehms = second2HMS( G.status.Time );
		$( '#time' ).roundSlider( 'setValue', position );
		$( '#elapsed' ).html( elapsedhms );
		$( '#total' ).text( timehms );
	}
	if ( G.status.state === 'play' ) {
		bash( [ 'mpcseek', seektime ] );
	} else {
		if ( G.bars ) {
			$( '#playback-controls i' ).removeClass( 'active' );
			$( '#pause' ).addClass( 'active' );
			$( '#song' ).addClass( 'gr' );
		}
		local( 600 );
		bash( [ 'mpcseek', seektime, 'stop' ] );
	}
}
function mpcSeekBar( pageX ) {
	var $timeband = $( '#time-band' );
	var posX = pageX - $timeband.offset().left;
	var bandW = $timeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var pos = posX / bandW;
	var position = Math.round( pos * 1000 );
	var elapsedhms = second2HMS( Math.round( pos * G.status.Time ) );
	if ( G.status.state === 'pause' ) elapsedhms = '<bl>'+ elapsedhms +'</bl>';
	var timehms = second2HMS( Math.round( G.status.Time ) );
	$( '#progress' ).html( '<i class="fa fa-'+ G.status.state +'"></i><w>'+ elapsedhms +'</w> / '+ timehms );
	$( '#time-bar' ).css( 'width', ( position / 10 ) +'%' );
	if ( !G.drag ) mpcSeek( position );
}
function orderLibrary() {
	if ( !G.display.order ) return
	
	$.each( G.display.order, function( i, name ) {
		var $libmode = $( '.lib-mode' ).filter( function() {
			return $( this ).find( '.lipath' ).text() === name;
		} );
		$libmode.detach();
		$( '#lib-mode-list' ).append( $libmode );
	} );
}
function playlistInsert( indextarget ) {
	var plname = $( '#pl-path .lipath' ).text();
	list( {
		  cmd         : 'edit'
		, name        : plname
		, index       : G.pladd.index
		, indextarget : indextarget
	}, function() {
		renderSavedPlaylist( plname );
		if ( G.pladd.select === 'last' ) {
			setTimeout( function() {
				$( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } );
			}, 300 );
		}
		G.pladd = {};
	} );
}
function playlistInsertSelect( $this ) {
	info( {
		  icon        : 'playlist'
		, title       : 'Add to playlist'
		, message     : 'Insert'
				   +'<br><w>'+ G.pladd.name +'</w>'
				   +'<br>before'
				   +'<br><w># '+ ( $this.index() + 1 ) +' - '+ $this.find( '.name' ).text() +'</w>'
		, buttonlabel : '<i class="fa fa-undo"></i>Reselect'
		, button  : function() {
			playlistInsertTarget();
		}
		, cancel      : function() {
			G.plappend = {};
		}
		, ok          : function() {
			playlistInsert( $this.index() )
		}
	} );
}
function playlistInsertTarget() {
	info( {
		  icon    : 'playlist'
		, title   : 'Add to playlist'
		, message : 'Select where to add:'
				   +'<br><w>'+ G.list.name +'</w>'
		, radio   : { First : 'first', Select: 'select', Last: 'last' }
		, cancel  : function() {
			G.pladd = {};
		}
		, ok      : function() {
			var target = infoVal();
			G.pladd.select = target;
			if ( target !== 'select' ) {
				playlistInsert( target );
			}
		}
	} );
}
function playlistFilter() {
	var keyword = $( '#pl-search-input' ).val();
	var regex = new RegExp( keyword, 'i' );
	var count = 0;
	$( '#pl-list li' ).each( function() {
		var $this = $( this );
		var match = ( $this.text().search( regex ) !== -1 ) ? 1 : 0;
		count = match ? ( count + 1 ) : count;
		$this.toggleClass( 'hide', !match );
		if ( !$this.hasClass( 'hide' ) ) {
			var name = $this.find( '.name' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			var li2 = $this.find( '.li2' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			$this.find( '.name' ).html( name );
			$this.find( '.li2' ).html( li2 );
		}
	} );
	$( 'html, body' ).scrollTop( 0 );
	if ( keyword ) {
		$( '#pl-search-close' ).html( '<i class="fa fa-times"></i><span>'+ count +' <grl>of</grl> </span>' );
	} else {
		$( '#pl-search-close' ).empty();
	}
}
function playlistProgress() {
	clearIntervalAll();
	var $this = $( '#pl-list li' ).eq( G.status.song );
	var $elapsed = $this.find( '.elapsed' );
	var $name = $this.find( '.name' );
	var $song = $this.find( '.song' );
	var slash = G.status.webradio ? '' : ' <gr>/</gr>';
	$( '.li1 .radioname' ).removeClass( 'hide' );
	$( '.li2 .radioname' ).addClass( 'hide' );
	if ( G.status.player === 'upnp' ) $this.find( '.time' ).text( second2HMS( G.status.Time ) );
	if ( G.status.state === 'pause' ) {
		elapsedtxt = second2HMS( G.status.elapsed );
		$elapsed.html( '<i class="fa fa-pause"></i>'+ elapsedtxt + slash );
		setTitleWidth();
	} else if ( G.status.state === 'play' ) {
		$this.find( '.li1 .radioname' ).addClass( 'hide' );
		$this.find( '.li2 .radioname' ).removeClass( 'hide' );
		if ( G.status.webradio ) {
			$name.addClass( 'hide' );
			$this.find( '.li2 .radioname' ).removeClass( 'hide' );
			$song.html( G.status.Title || blinkdot );
		} else {
			$name.removeClass( 'hide' );
			$song.empty();
			$( '.elapsed, .song' ).empty();
		}
		var time = $this.find( '.time' ).data( 'time' );
		G.intElapsedPl = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === time ) {
				clearIntervalAll();
				$elapsed.empty();
				G.status.elapsed = 0;
				if ( G.status.state === 'play' ) {
					$( '#pl-list li .elapsed' ).empty();
					setPlaylistScroll();
				}
			} else {
				elapsedtxt = second2HMS( G.status.elapsed );
				$elapsed.html( '<i class="fa fa-play"></i>'+ elapsedtxt + slash );
				setTitleWidth();
			}
		}, 1000 );
	} else { // stop
		$song
			.empty()
			.css( 'max-width', '' );
		$elapsed.empty();
		setTitleWidth();
	}
}
function plRemove( $li ) {
	if ( G.status.playlistlength === 1 ) {
		bash( [ 'plremove' ] );
	} else {
		var total = $( '#pl-time' ).data( 'time' ) - $li.find( '.time' ).data( 'time' );
		var file = $li.hasClass( 'file' );
		var $count = file ? $( '#pl-trackcount' ) : $( '#pl-radiocount' );
		var count = +$count.text().replace( /,|\./g, '' ) - 1;
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
		var tracknum = $li.index() + 1;
		if ( $li.hasClass( 'active' ) ) {
			if ( tracknum < G.status.playlistlength ) {
				var activenext = tracknum;
				$li.next().addClass( 'active' );
			} else {
				var activenext = tracknum - 1;
				$li.prev().addClass( 'active' );
			}
		} else {
			var activenext = '';
		}
		bash( [ 'plremove', tracknum, activenext ] );
		$li.remove();
	}
}
function renderLibrary() {
	G.query = [];
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#button-coverart' ).addClass( 'hidden' );
	$( '#lib-title, #lib-path>i, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path .lipath' ).empty()
	$( '#button-lib-back' ).toggleClass( 'back-left', G.display.backonleft );
	$( '#lib-breadcrumbs, #lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	if ( G.librarylist ) {
		$( 'html, body' ).scrollTop( G.liscrolltop );
		return
	}
	
	$( '#page-library .content-top, #lib-list' ).addClass( 'hide' );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '.mode:not( .mode-bookmark )' ).each( function() {
		var name = this.id.replace( 'mode-', '' );
		$( this ).parent().toggleClass( 'hide', !G.display[ name ] );
	} );
	$( '.mode grl' ).toggleClass( 'hide', !G.display.count );
	if ( G.display.label ) {
		$( '#lib-mode-list a.label' ).show();
		$( '.mode' ).removeClass( 'nolabel' );
	} else {
		$( '#lib-mode-list a.label' ).hide();
		$( '.mode:not( .mode-bookmark )' ).addClass( 'nolabel' );
	}
	$( '#lib-list' ).empty().addClass( 'hide' );
	$( '#lib-mode-list' ).removeClass( 'hide' );
	$( '.mode-bookmark' ).children()
		.add( '.coverart img' ).css( 'opacity', '' );
	$( '.bkedit' ).remove();
	$( '#liimg' ).css( 'opacity', '' );
	orderLibrary();
	$( 'html, body' ).scrollTop( G.modescrolltop );
}
function renderLibraryList( data ) {
	if ( data == -1 ) {
		infoNoData();
		return
	}
	
	G.librarylist = 1;
	$( '#lib-title, #lib-mode-list, .menu' ).addClass( 'hide' );
	$( '#button-lib-back' ).toggleClass( 'hide', data.modetitle === 'search' );
	$( '#lib-path .lipath' ).text( data.path );
	if ( 'count' in data ) {
		$( '#lib-path' ).css( 'max-width', '40px' );
		$( '#lib-list' ).css( 'width', '100%' );
		$( '#lib-search-close' ).html( '<i class="fa fa-times"></i><span>' + data.count + ' <grl>of</grl></span>&ensp;' );
		var htmlpath = '';
	} else if ( [ 'file', 'sd', 'nas', 'usb' ].indexOf( G.mode ) === -1 ) {
		// track view - keep previous title
		if ( G.mode === 'webradio' ) {
			var radioclass = ' class="radiomodetitle"';
			var radiobtn = '&ensp;<i class="button-webradio-new fa fa-plus-circle"></i>';
		} else {
			var radioclass = '';
			var radiobtn = '';
		}
		var htmlpath = '<i class="fa fa-'+ G.mode +'"></i> <span id="mode-title"'+ radioclass +'>'+ data.modetitle +'</span>'+ radiobtn;
		$( '#button-lib-search' ).addClass( 'hide' );
	} else { // dir breadcrumbs
		var dir = data.path.split( '/' );
		var dir0 = dir[ 0 ];
		var htmlpath = '<i class="fa fa-'+ dir0.toLowerCase() +'"></i>';
		htmlpath += '<a>'+ dir0 +'/<span class="lidir">'+ dir0 +'</span></a>';
		var lidir = dir0;
		var iL = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +'<blb>/</blb><span class="lidir">'+ lidir +'</span></a>';
		}
	}
	$( '#lib-breadcrumbs' )
		.html( htmlpath )
		.removeClass( 'hide' );
	$( '#lib-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		imgLoadError( 'lib-list' );
		$( '#mode-title' ).toggleClass( 'spaced', data.modetitle.toLowerCase() === G.mode );
		$( '.liinfopath' ).toggleClass( 'hide', G.mode === 'file' );
		if ( G.mode === 'album' && $( '#lib-list .coverart' ).length ) {
			G.albumlist = 1;
			$img0 = $( '#lib-list img[data-src$=".jpg"]:eq( 0 )');
			var html = '<span id="button-coverart"><i class="fa ';
			if ( $img0.length ) {
				html += 'fa-refresh albumrefresh"></i><img src="'+ $img0.data( 'src' ) +'" class="albumimg"></span>';
				var defaultcover = 0;
			} else {
				html += 'fa-search albumrefresh"></i><i class="fa fa-coverart"></i>';
				defaultcover = 1;
			}
			$( '#lib-breadcrumbs' ).append( html );
		} else {
			G.albumlist = 0;
		}
		if ( $( '.licover' ).length ) setTrackCoverart();
		$( '#lib-list p' )
			.toggleClass( 'fixedcover', $( '#lib-list li:eq( 1 )' ).hasClass( 'track1' ) )
			.toggleClass( 'bars-on', G.bars );
		if ( 'index' in data ) {
			$( '#lib-list' ).css( 'width', '' );
			$( '#lib-index' ).html( data.index[ 0 ] )
			$( '#lib-index1' ).html( data.index[ 1 ] )
			$( '#lib-index, #lib-index1' ).removeClass( 'hide' );
		} else {
			$( '#lib-list' ).css( 'width', '100%' );
			$( '#lib-index, #lib-index1' ).addClass( 'hide' );
		}
		$( '#lib-list' ).removeClass( 'hide' );
		if ( G.library ) $( 'html, body' ).scrollTop( G.scrolltop[ data.path ] || 0 );
		if ( G.iactive && G.albumlist ) $( '#lib-list .coverart' ).eq( G.iactive ).addClass( 'active' );
		if ( $( '.coverart' ).length ) {
			var coverH = $( '.coverart' ).height();
			var pH = $( '#lib-list p' ).height();
			$( '#lib-list p' )
				.removeClass( 'bars-on' )
				.css( 'height', pH + 49 - coverH );
		}
	} );
	if ( G.color ) {
		$( '#lib-list li:eq( 0 )' ).tap();
		colorSet();
	}
	if ( G.albumlist ) return
	
	if ( G.mode === 'album' ) {
		$( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
		$( '.liinfo .lialbum' ).addClass( 'hide' );
	} else {
		$( '.liinfo .lialbum' ).removeClass( 'hide' );
	}
}
function renderPlayback() {
	clearIntervalAll();
	// song and album before update for song/album change detection
	var previousartist = $( '#artist' ).text();
	var prevtitle = $( '#song' ).text();
	var previousalbum = $( '#album' ).text();
	// volume
	if ( !G.display.volumenone &&  G.display.volume ) {
		$volumeRS.setValue( G.status.volume );
		G.status.volumemute != 0 ? volColorMute( G.status.volumemute ) : volColorUnmute();
	}
	// empty queue
	if ( !G.status.playlistlength && G.status.player === 'mpd' && G.status.state === 'stop' ) {
		renderPlaybackBlank();
		return
	}
	
	$( '.playback-controls' ).css( 'visibility', 'visible' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#artist, #song, #album' )
		.css( 'width', '' )
		.removeClass( 'capitalize albumgray' );
	$( '#coverart' ).css( 'opacity', '' );
	$( '#divcover .fa-coverart' ).remove();
	$( '#coverTR' ).removeClass( 'empty' );
	$( '#qrwebui, #qrip' ).empty();
	
	$( '#artist' ).html( G.status.Artist );
	$( '#song' )
		.html( G.status.Title )
		.toggleClass( 'gr', G.status.state === 'pause' );
	$( '#album' ).html( G.status.Album ).promise().done( function() {
		scrollLongText();
	} );
	var sampling = G.status.sampling;
	if ( G.status.webradio ) {
		if ( G.status.state === 'play' && G.status.station ) {
			sampling += ' &bull; '+ G.status.station;
		} else {
			sampling += sampling ? ' &bull; Radio' : 'Radio';
		}
	}
	$( '#sampling' ).html( sampling );
	var displaytime = $( '#time-knob' ).is( ':visible' );
	// webradio ////////////////////////////////////////
	if ( [ 'Radio', 'UPnP' ].indexOf( G.status.ext ) !== -1 ) {
		$( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).css( 'width', 0 );
		$( '#progress, #elapsed, #total' ).empty();
		if ( G.status.state !== 'play' ) {
			$( '#song' ).html( '·&ensp;·&ensp;·' );
			renderPlaybackCoverart( G.status.coverartradio );
		} else {
			if ( !G.status.Title || G.status.Title !== prevtitle ) renderPlaybackCoverart( G.status.coverart || G.status.coverartradio );
			if ( !G.status.Title ) $( '#song' ).html( blinkdot );
			if ( !$( '#vu' ).hasClass( 'hide' ) ) vu();
			$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
			if ( G.display.radioelapsed || G.localhost ) {
				if ( displaytime ) {
					G.intElapsed = setInterval( function() {
						G.status.elapsed++;
						elapsedhms = second2HMS( G.status.elapsed );
						$( '#total' ).text( elapsedhms ).addClass( 'gr' );
					}, 1000 );
				} else {
					G.intElapsed = setInterval( function() {
						G.status.elapsed++;
						elapsedhms = second2HMS( G.status.elapsed );
					$( '#progress' ).html( '<i class="fa fa-play"></i><w>'+ elapsedhms +'</w>' );
					}, 1000 );
				}
			}
		}
		setRadioAlbum();
		return
	}
	
	// others ////////////////////////////////////////
	if ( G.status.Artist !== previousartist
		|| G.status.Album !== previousalbum
		|| G.status.player === 'airplay' ) renderPlaybackCoverart( G.status.coverart );
	// time
	time = 'Time' in G.status ? G.status.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	// stop ////////////////////
	if ( G.status.state === 'stop' ) {
		$( '#song' ).removeClass( 'gr' );
		if ( displaytime ) {
			$( '#time' ).roundSlider( 'setValue', 0 );
			$( '#elapsed' )
				.text( timehms )
				.addClass( 'gr' );
			$( '#total' ).empty();
		} else {
			$( '#time-bar' ).css( 'width', 0 );
			$( '#progress' ).html( '<i class="fa fa-stop"></i><w>'+ timehms +'</w>' );
		}
		return
	}
	
	$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
	$( '#song' ).toggleClass( 'gr', G.status.state === 'pause' );
	if ( !( 'elapsed' in G.status ) || G.status.elapsed > G.status.Time ) {
		$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
		return
	}
	
	var elapsedhms = second2HMS( G.status.elapsed );
	var position = Math.round( G.status.elapsed / time * 1000 );
	// pause ////////////////////
	if ( G.status.state === 'pause' ) {
		if ( displaytime ) {
			$( '#time' ).roundSlider( 'setValue', position );
			$( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
			$( '#total' ).addClass( 'wh' );
		} else {
			$( '#time-bar' ).css( 'width', position / 10 +'%' );
			$( '#progress' ).html( '<i class="fa fa-pause"></i><bl>'+ elapsedhms +'</bl> / <w>'+ timehms +'</w>' );
		}
		return
	}
	
	// play ////////////////////
	if ( !$( '#vu' ).hasClass( 'hide' ) ) vu();
	if ( G.status.elapsed === false ) {
		$( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).css( 'width', 0 );
		return
	}
	
	if ( 'autoplaycd' in G ) return // wait for cd cache on start
	
	if ( displaytime ) {
		if ( G.status.player === 'mpd' && G.status.elapsed ) $( '#elapsed' ).text( second2HMS( G.status.elapsed ) );
		G.intElapsed = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === G.status.Time ) {
				G.status.elapsed = 0;
				clearIntervalAll();
				$( '#elapsed' ).empty();
				$( '#time' ).roundSlider( 'setValue', 0 );
			} else {
				elapsedhms = second2HMS( G.status.elapsed );
				$( '#elapsed' ).text( elapsedhms );
			}
		}, 1000 );
		if ( G.localhost ) { // fix: high cpu - interval each 1 sec
			G.intKnob = setInterval( function() {
				position = Math.round( G.status.elapsed / time * 1000 );
				$( '#time' ).roundSlider( 'setValue', position );
			}, 1000 );
		} else {
			G.intKnob = setInterval( function() {
				position++;
				$( '#time' ).roundSlider( 'setValue', position );
			}, time );
		}
	} else {
		G.intElapsed = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === G.status.Time ) {
				G.status.elapsed = 0;
				clearIntervalAll();
				$( '#time-bar' ).css( 'width', 0 );
				$( '#progress' ).html( '<i class="fa fa-play"></i>' );
			} else {
				elapsedhms = second2HMS( G.status.elapsed );
				$( '#progress' ).html( '<i class="fa fa-play"></i><w>'+ elapsedhms +'</w> / '+ timehms );
			}
		}, 1000 );
		G.intKnob = setInterval( function() {
			position++;
			$( '#time-bar' ).css( 'width', position / 10 +'%' );
		}, time );
	}
}
function renderPlaybackBlank() {
	$( '#page-playback .emptyadd' ).toggleClass( 'hide', G.status.player !== 'mpd' );
	$( '#playback-controls, #infoicon i, #vu' ).addClass( 'hide' );
	$( '#divartist, #divsong, #divalbum' ).removeClass( 'scroll-left' );
	$( '#artist, #song, #album, #progress, #elapsed, #total' ).empty();
	if ( G.display.time ) $( '#time' ).roundSlider( 'setValue', 0 );
	$( '#time-bar' ).css( 'width', 0 );
	$( '#divcover .coveredit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
	bash( "ifconfig | grep inet.*broadcast | head -1 | awk '{print $2}'", function( ip ) {
		if ( ip ) {
			var ips = ip.split( '\n' );
			var htmlip = '';
			ips.forEach( function( each ) {
				if ( each ) htmlip += '<br><gr>http://</gr>'+ each
			} );
			$( '#qrip' ).html( htmlip );
			var qr = new QRCode( {
				  msg : 'http://'+ ips[ 0 ]
				, dim : 230
				, pad : 10
			} );
			$( '#qrwebui' ).html( qr );
			$( '#coverTR' ).toggleClass( 'empty', !G.bars );
			$( '#coverart' )
				.attr( 'src', G.coverdefault )
				.addClass( 'hide' );
			$( '#sampling' ).empty();
		} else {
			$( '#coverart' )
				.attr( 'src', G.coverdefault )
				.removeClass( 'hide' );
			$( '#page-playback .emptyadd' ).empty();
			$( '#sampling' )
				.css( 'display', 'block' )
				.html( 'Network not connected:&emsp; <i class="fa fa-networks fa-lg wh"></i>&ensp;Setup' )
				.on( 'click', '.fa-networks', function() {
					location.href = 'settings.php?p=networks';
				} );
		}
	} );
}
function renderPlaybackCoverart( coverart ) {
	if ( coverart || G.display.novu ) {
		$( '#vu' ).addClass( 'hide' );
		$( '#coverart' )
			.attr( 'src', coverart || G.coverdefault )
			.removeClass( 'hide' );
	} else {
		$( '#coverart' ).addClass( 'hide' );
		$( '#vu' ).removeClass( 'hide' );
		if ( !$( '#vu' ).hasClass( 'hide' ) ) G.status.state === 'play' ? vu() : vuStop();
		loader( 'hide' );
	}
}
renderPlaylist = function( data ) {
	G.savedlist = 0;
	G.status.playlistlength = data.playlistlength;
	$( '#pl-search-input' ).val( '' );
	$( '#button-pl-back, #pl-savedlist, #pl-index, #pl-search' ).addClass( 'hide' );
	$( '#lib-path>span, #button-pl-search' ).removeClass( 'hide' );
	$( '#button-pl-open' ).toggleClass( 'disable', G.status.playlists === 0 );
	if ( data == -1 ) {
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disable' );
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		return
	}
	
	$( '.playlist' ).removeClass( 'hide' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '#button-pl-save, #button-pl-clear, #button-pl-search' ).removeClass( 'disable' );
	$( '#button-pl-shuffle' ).toggleClass( 'disable', G.status.playlistlength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-librandom' ).toggleClass( 'bl', G.status.librandom );
	$( '#pl-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		imgLoadError( 'pl-list' );
		$( '.list p' ).toggleClass( 'bars-on', G.bars );
		$( '#pl-list li .name' ).removeClass( 'hide' );
		$( '#pl-list li .song' ).css( 'max-width', '' );
		setPlaylistScroll();
	} );
}
function renderPlaylistList() {
	list( { cmd: 'list' }, function( data ) {
		$( '.playlist, #button-pl-search, #menu-plaction' ).addClass( 'hide' );
		$( '#menu-plaction' ).addClass( 'hide' );
		
		$( '#pl-path' ).html( data.counthtml );
		$( '#button-pl-back, #pl-savedlist, #pl-index' ).removeClass( 'hide' );
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '' );
			$( '#pl-index' ).html( data.index[ 0 ] );
			$( '#pl-index1' ).html( data.index[ 1 ] );
			$( 'html, body' ).scrollTop( 0 );
		} );
	}, 'json' );
}
function renderSavedPlaylist( name ) {
	$( '.menu' ).addClass( 'hide' );
	list( { cmd: 'get', name: name }, function( data ) {
		$( '#pl-path' ).html( data.counthtml );
		$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
		$( '#button-pl-back, #pl-savedlist' ).removeClass( 'hide' );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			imgLoadError( 'pl-savedlist' );
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '100%' );
			$( '#pl-index, #pl-index1' ).addClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
		} );
	}, 'json' );
}
function resetOrientation( file, ori, callback ) {
	var reader = new FileReader();
	reader.onload = function( e ) {
		var img = new Image();
		img.src = e.target.result;
		img.onload = function() {
			var imgW = img.width,
				imgH = img.height,
				canvas = document.createElement( 'canvas' ),
				ctx = canvas.getContext( '2d' );
			// set proper canvas dimensions before transform
			if ( 4 < ori && ori < 9 ) {
				canvas.width = imgH;
				canvas.height = imgW;
			} else {
				canvas.width = imgW;
				canvas.height = imgH;
			}
			// transform context before drawing image
			switch ( ori ) {
				// transform( Hscale, Hskew, Vscale, Vskew, Hmove, Vmove )
				case 2: ctx.transform( -1,  0,  0,  1, imgW,    0 ); break; // mirror up
				case 3: ctx.transform( -1,  0,  0, -1, imgW, imgH ); break; // down
				case 4: ctx.transform(  1,  0,  0, -1,    0, imgH ); break; // mirror down
				case 5: ctx.transform(  0,  1,  1,  0,    0,    0 ); break; // mirror on left side
				case 6: ctx.transform(  0,  1, -1,  0, imgH,    0 ); break; // on left side
				case 7: ctx.transform(  0, -1, -1,  0, imgH, imgW ); break; // mirror on right side
				case 8: ctx.transform(  0, -1,  1,  0,    0, imgW ); break; // on right side
				default: break;
			}
			ctx.drawImage( img, 0, 0 );
			callback( canvas, imgW, imgH );
		}
	}
	reader.readAsDataURL( file );
}
function scrollLongText() {
	var $el = $( '#artist, #song, #album' );
	var wW = document.body.clientWidth;
	var tWmax = 0;
	$( '#song' ).removeClass( 'gr' );
	$el.removeClass( 'scrollellipse' )
		.each( function() {
		var $this = $( this );
		var tW = $this.width() * G.scale;
		if ( tW > wW * 0.98 ) {
			if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
			$this.addClass( 'scrollleft' );
		} else {
			$this
				.removeClass( 'scrollleft' )
				.removeAttr( 'style' ); // fix - iOS needs whole style removed
		}
	} );
	$el.css( 'visibility', 'visible' ); // from initial hidden
	if ( !$( '.scrollleft' ).length ) return
	
	// varied width only when scaled
	var cssanimate = ( wW + tWmax ) / G.scrollspeed +'s infinite scrollleft linear'; // calculate to same speed
	$( '.scrollleft' ).css( {
		  'width '            : tWmax +'px'
		, 'animation'         : cssanimate
		, '-moz-animation'    : cssanimate
		, '-webkit-animation' : cssanimate
	} );
	if ( !G.localhost ) return
	
	$( '.scrollleft' )
		.css( 'animation-iteration-count', 1 )
		.on( 'animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function() {
		$( this ).css( {
			  width               : ''
			, animation           : ''
			, '-moz-animation'    : ''
			, '-webkit-animation' : ''
		} ).removeClass( 'scrollleft' ).addClass( 'scrollellipse' );
			
	} );
}
function second2HMS( second ) {
	if ( second <= 0 ) return 0;
	
	var second = Math.round( second );
	var hh = Math.floor( second / 3600 );
	var mm = Math.floor( ( second % 3600 ) / 60 );
	var ss = second % 60;
	
	hh = hh ? hh +':' : '';
	mm = hh ? ( mm > 9 ? mm +':' : '0'+ mm +':' ) : ( mm ? mm +':' : '' );
	ss = mm ? ( ss > 9 ? ss : '0'+ ss ) : ss;
	return hh + mm + ss;
}
function setButtonControl() {
	if ( G.bars ) {
		var mpd_upnp = [ 'mpd', 'upnp' ].indexOf( G.status.player ) !== -1;
		$( '#playback-controls' ).toggleClass( 'hide', G.status.playlistlength === 0 && mpd_upnp );
		$( '#previous, #next' ).toggleClass( 'hide', G.status.playlistlength < 2 || !mpd_upnp );
		$( '#play, #pause' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
		$( '#pause' ).toggleClass( 'hide', G.status.webradio || G.status.player === 'airplay' );
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ G.status.state ).addClass( 'active' );
	}
	if ( G.playback ) setTimeout( setButtonOptions, 0 );
}
function setButtonOptions() {
	$( '#relays' ).toggleClass( 'on', G.status.relayson );
	$( '#snapclient' ).toggleClass( 'on', G.status.player === 'snapclient' );
	$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
	var displaytime = $( '#time-knob' ).is( ':visible' );
	var prefix = displaytime ? 'ti' : 'i';
	$( '#'+ prefix +'-btclient' ).toggleClass( 'hide', !G.status.btclient );
	$( '#'+ prefix +'-relays' ).toggleClass( 'hide', !G.status.relayson );
	if ( G.status.player !== 'mpd' ) return
	
	if ( G.display.buttons && displaytime ) {
		$( '#random' ).toggleClass( 'active', G.status.random );
		$( '#repeat' ).toggleClass( 'active', G.status.repeat );
		$( '#single' ).toggleClass( 'active', G.status.single );
	} else {
		$( '#'+ prefix +'-random' ).toggleClass( 'hide', !G.status.random );
		$( '#'+ prefix +'-repeat' ).toggleClass( 'hide', !G.status.repeat || G.status.single );
		$( '#'+ prefix +'-repeat1' ).toggleClass( 'hide', !( G.status.repeat && G.status.single ) );
	}
	[ 'consume', 'librandom' ].forEach( function( option ) {
		$( '#button-pl-'+ option ).toggleClass( 'bl', G.status[ option ] );
		if ( G.display.time ) {
			$( '#i-'+ option ).addClass( 'hide' );
			$( '#ti-'+ option ).toggleClass( 'hide', !G.status[ option ] );
		} else {
			$( '#ti-'+ option ).addClass( 'hide' );
			$( '#i-'+ option ).toggleClass( 'hide', !G.status[ option ] );
		}
	} );
	setButtonUpdateAddons();
	setButtonUpdating();
	if ( !G.display.volume && G.status.volumemute ) $( '#'+ prefix +'-mute' ).removeClass( 'hide' );
}
function setButtonUpdateAddons( updateaddons ) {
	if ( G.status.updateaddons ) {
		$( '#button-settings, #addons i' ).addClass( 'bl' );
		if ( !G.display.bars ) {
			var prefix = $( '#time-knob' ).is( ':visible' ) ? 'ti' : 'i';
			$( '#'+ prefix +'-addons' ).addClass( 'hide' );
			$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
		}
	} else {
		$( '#button-settings, #addons i' ).removeClass( 'bl' );
		$( '#i-addons, #ti-addons' ).addClass( 'hide' );
	}
}
function setButtonUpdating() {
	if ( G.status.updating_db ) {
		if ( G.bars ) {
			if ( !G.localhost ) {
				$( '#tab-library, #button-library' ).addClass( 'blink' );
			} else {
				$( '#tab-library, #button-library' )
					.removeClass( 'fa-library' )
					.addClass( 'fa-refresh-library' );
			}
		} else {
			$( '#'+ ( G.display.time ? 'ti' : 'i' ) +'-update' ).removeClass( 'hide' )
		}
	} else {
		$( '#tab-library, #button-library, .lib-icon.blink' ).removeClass( 'blink' );
		$( '#i-update, #ti-update' ).addClass( 'hide' );
		if ( G.localhost ) $( '#tab-library, #button-library' )
							.removeClass( 'fa-refresh-library' )
							.addClass( 'fa-library' );
	}
}
function setPlaylistScroll() {
	if ( !G.playlist
		|| G.plremove
		|| [ 'mpd', 'upnp' ].indexOf( G.status.player ) === -1
		|| !$( '#pl-savedlist' ).hasClass( 'hide' )
		|| !G.status.playlistlength
		|| G.sortable ) return // skip if empty or Sortable
	
	var wW = document.body.clientWidth;
	$.each( $( '#pl-list .name' ), function() {
		var $name = $( this );
		var $dur =  $name.next();
		// pl-icon + margin + duration + margin
		var iWdW = 40 + 20 + $dur.width();
		if ( iWdW + $name[ 0 ].scrollWidth < wW ) {
			$dur.removeClass( 'duration-right' );
			$name.css( 'max-width', '' );
		} else {
			$dur.addClass( 'duration-right' );
			$name.css( 'max-width', wW - iWdW +'px' );
		}
	} );
	if ( G.status.state !== 'stop' ) setTitleWidth();
	$( '#pl-list li' ).removeClass( 'active updn' );
	if ( $( '#pl-list li' ).length < G.status.song + 1 ) return // on eject cd G.status.song not yet refreshed
	
	$liactive = $( '#pl-list li' ).eq( G.status.song || 0 );
	$liactive.addClass( 'active' );
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	G.titleW = $title[ 0 ].scrollWidth;
	$( '#menu-plaction' ).addClass( 'hide' );
	if ( G.status.playlistlength < 5 || !$( '#infoOverlay' ).hasClass( 'hide' ) ) {
		$( 'html, body' ).scrollTop( 0 );
	} else {
		var scrollpos = $liactive.offset().top - ( G.bars ? 80 : 40 ) - ( 49 * 3 );
		$( 'html, body' ).scrollTop( scrollpos );
	}
	if ( G.status.state !== 'stop' ) playlistProgress();
}
function setRadioAlbum() {
	var playing = G.status.state === 'play';
	var radioalbum = false;
	if ( 'file' in G.status ) radioalbum = [ 'radioparadise', 'radiofrance' ].indexOf( G.status.file.split( '.' )[ 1 ] ) !== -1;
	$( '#artist, #song' ).toggleClass( 'capitalize', playing );
	$( '#album' )
		.toggleClass( 'albumgray', !playing || !radioalbum ) // gray text
		.toggleClass( 'capitalize', playing && G.status.Album.slice( 0, 4 ) !== 'http' );
}
function setTitleWidth() {
	// pl-icon + margin + duration + margin
	var $liactive = $( '#pl-list li.active' );
	var $duration = $liactive.find( '.duration' );
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	var iWdW = 40 + 10 + $duration.width() + 10;
	var wW = document.body.clientWidth;
	if ( iWdW + G.titleW < wW ) {
		$title.css(  'max-width', '' );
		$duration.removeClass( 'duration-right' );
	} else {
		$title.css( 'max-width', wW - iWdW +'px' );
		$duration.addClass( 'duration-right' );
	}
	$( '.duration-right' ).css( 'right', '' );
}
function setTrackCoverart() {
	if ( G.display.hidecover || !$( '#liimg' ).length ) return
	
	$( '#liimg' ).off( 'load' ).on( 'load', function() { // not exist on initial page load
		$( 'html, body' ).scrollTop( 0 );
		$( '.liinfo' ).css( 'width', ( document.body.clientWidth - $( this ).width() - 50 ) +'px' );
		if ( $( '#liimg' ).attr( 'src' ).slice( 0, 9 ) === '/data/shm' ) {
			$( '#liimg' ).after( '<i class="coveredit fa fa-save cover-save"></i>' );
		}
	} ).off( 'error' ).on( 'error', function() {
		$( this ).attr( 'src', G.coverdefault );
	} );
	if ( !G.display.fixedcover ) {
		$( '.licover' ).addClass( 'nofixed' );
		$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
	}
}
function stopAirplay() {
	info( {
		  icon    : 'airplay'
		, title   : 'AirPlay'
		, message : 'AirPlay is playing.'
				   +'<br>Stop AirPlay?'
		, ok      : function() {
			$( '#stop' ).click();
		}
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
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) G.plscrolltop = $( window ).scrollTop();
	}
	$( '.page, .menu' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
	$( '#pl-search-close, #pl-search-close' ).addClass( 'hide' );
	G.library = G.playback = G.playlist = G.plremove = 0;
	G[ page ] = 1;
	G.page = page;
	displayBottom();
	// restore page scroll
	if ( G.playback ) {
		$timeRS.setValue( 0 );
		$( 'html, body' ).scrollTop( 0 );
		if ( G.status.state === 'play' && !G.status.webradio ) $( '#elapsed' ).empty(); // hide flashing
	} else if ( G.library ) {
		if ( G.librarylist ) {
			$( 'html, body' ).scrollTop( G.liscrolltop );
		} else {
			renderLibrary();
		}
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) $( 'html, body' ).scrollTop( G.plscrolltop );
	}
}
function thumbUpdate( path ) {
	var form = '<form id="formtemp" action="/settings/addons-progress.php" method="post">'
					+'<input type="hidden" name="sh[]" value="cove">'
					+'<input type="hidden" name="sh[]" value="Update">'
					+'<input type="hidden" name="sh[]" value="main">'
					+'<input type="hidden" name="sh[]" value="'+ ( path || '' ) +'">'
			  +'</form>';
	$( 'body' ).append( form );
	$( '#formtemp' ).submit();
}
function volColorMute() {
	$volumetooltip
		.text( G.status.volumemute )
		.addClass( 'bl' );
	$volumehandle.addClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'fa-volume' )
		.addClass( 'fa-mute active' );
	var prefix = G.display.time ? 'ti' : 'i';
	if ( !G.display.volume ) $( '#'+ prefix +'-mute' ).removeClass( 'hide' );
}
function volColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'fa-mute active' )
		.addClass( 'fa-volume' );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
}
function volumeBarSet( pageX ) {
	var $volumeband = $( '#volume-band' );
	var posX = pageX - $volumeband.offset().left;
	var bandW = $volumeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var vol = Math.round( posX / bandW * 100 );
	if ( G.drag ) {
		$( '#volume-bar' ).css( 'width', vol +'%' );
		volumeDrag( vol );
	} else {
		var ms = Math.ceil( Math.abs( vol - G.status.volume ) / 5 ) * 0.2 * 1000;
		$( '#volume-bar' ).animate(
			  { width: vol +'%' }
			, { duration: ms, easing: 'linear' }
		);
		$( '.volumeband' ).addClass( 'disabled' );
		bash( [ 'volume', G.status.volume, vol, G.status.control ], function() {
			$( '.volumeband' ).removeClass( 'disabled' );
		} );
	}
	$( '#volume-text' ).text( vol );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
	G.status.volume = vol;
}
function volumeBarTimeout() {
	G.volumebar = setTimeout( function() {
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		$( '#page-playback' ).css( { height: '', 'margin-top': '' } );
		$( '.volumeband' ).addClass( 'transparent' );
	}, 3000 );
}
function volumeDrag( vol ) {
	if ( G.status.control ) {
		bash( 'amixer -Mq sset "'+ G.status.control +'" '+ vol +'%' );
	} else {
		bash( 'mpc volume '+ vol );
	}
}
function volumeKnobSet( vol ) {
	$( '#volume-knob, #vol-group i' ).addClass( 'disable' );
	bash( [ 'volume', G.status.volume, vol, G.status.control ] );
}
function volumePushstream() {
	bash( [ 'volumepushstream' ] );
}
function vu() {
	var range = 12; // -/+
	var deg = 0;
	var inc;
	clearInterval( G.intVu );
	$( '#vuneedle' ).css( 'transform', 'rotate( '+ Math.random() * range +'deg )' );
	G.intVu = setInterval( function() {
		inc = Math.random() * range * 2;
		deg += inc;
		if ( deg < -range ) {
			deg = -range + inc;
		} else if ( deg > range ) {
			deg = range - inc;
		}
		$( '#vuneedle' ).css( 'transform', 'rotate( '+ deg +'deg )' );
	}, 500 );
}
function vuStop() {
	clearIntervalAll();
	$( '#vuneedle' ).css( 'transform', '' );
}
