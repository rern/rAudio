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
function addonsdl( exit ) {
	switch( exit ) {
		case 1:
			info( {
				  icon    : 'info-circle'
				, message : 'Download from Addons server failed.'
						   +'<br>Please try again later.'
				, ok      : function() {
					loader( 'hide' );
				}
			} );
			break;
		case 2:
			info( {
				  icon    : 'info-circle'
				, message : 'Addons Menu cannot be updated.'
						   +'<br>Root partition has <wh>less than 1 MB free space</wh>.'
				, ok      : function() {
					location.href = '/settings/addons.php';
				}
			} );
			break;
		default:
			location.href = '/settings/addons.php';
	}
}
function bookmarkThumbReplace( $this, newimg ) {
	var $img = $this.find( 'img' );
	if ( $img.length ) {
		$img.attr( 'src', newimg  );
	} else {
		$this.find( '.fa-bookmark' ).remove();
		$this.find( '.divbklabel' ).remove();
		$this.find( '.lipath' ).after( '<img class="bkcoverart" src="'+ newimg +'">' );
		$( '.mode-bookmark img' ).css( 'opacity', '' );
	}
}
function clearIntervalAll() {
	clearInterval( G.intKnob );
	clearInterval( G.intElapsed );
	clearInterval( G.intElapsedPl );
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
	G.list.singletrack = !G.list.licover && $li.find( '.lib-icon' ).hasClass( 'fa-music' );
	G.list.path = $li.find( '.lipath' ).text() || '';
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
	$( '.tag' ).addClass( 'hide' );
	if ( $( '.licover' ).length ) $( '.tag' ).removeClass( 'hide' );
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
	var imagefile = '/mnt/MPD/'+ path +'/cover'; // no ext
	var jsoninfo = {
		  icon        : 'coverart'
		, title       : 'Change Album CoverArt'
		, message     : '<img class="imgold">'
					   +'<p class="imgname"><w>'+ album +'</w>'
					   +'<br>'+ artist +'</p>'
		, filelabel   : '<i class="fa fa-folder-open"></i>Browse'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, preshow     : function() { // fix direct replace src
			$( '.imgold' ).attr( 'src', src );
		}
		, ok          : function() {
			imageReplace( imagefile, 'coverart' );
		}
	}
	if ( G.playback ) {
		var pbembedded = $( '#coverart' ).attr( 'src' ).split( '/' )[ 2 ] === 'embedded';
		var pbonlinefetched = $( '#divcover .cover-save' ).length;
		var pbcoverdefault = $( '#coverart' ).attr( 'src' ).slice( -3 ) === 'svg';
	} else {
		var liembedded = $( '.licoverimg img' ).attr( 'src' ).split( '/' )[ 2 ] === 'embedded';
		var lionlinefetched = $( '.liedit.cover-save' ).length;
		var licoverdefault = $( '.licoverimg img' ).attr( 'src' ).slice( -3 ) === 'svg';
	}
	if ( ( G.playback && !pbembedded && !pbonlinefetched && !pbcoverdefault )
		|| ( G.library && !liembedded && !lionlinefetched && !licoverdefault )
	) {
		jsoninfo.buttonlabel = '<i class="fa fa-minus-circle"></i>Remove';
		jsoninfo.buttoncolor = red;
		jsoninfo.buttonwidth = 1;
		jsoninfo.button      = function() {
			var ext = $( '#infoMessage .imgold' ).attr( 'src' ).slice( -3 );
			bash( [ 'coverartreset', imagefile +'.'+ ext, path, artist, album ], function( url ) {
				$( '.edit' ).remove();
				$( '#coverart, .licoverimg img' ).css( 'opacity', '' );
				if ( G.playback ) {
					$( '#coverart' ).attr( 'src', url || ( G.status.webradio ? vustop : coverdefault ) );
				} else {
					$( '.licoverimg img' ).attr( 'src', url || coverdefault );
				}
			} );
		}
	}
	if ( ( G.playback && pbembedded ) || ( G.library && liembedded ) ) jsoninfo.footer = '<i class="fa fa-coverart"></i>&ensp;embedded';
	info( jsoninfo );
}
function coverartSave() {
	if ( G.playback ) {
		var src = $( '#coverart' ).attr( 'src' );
		var tmppath = '/srv/http/data/shm/';
		var file = G.status.file;
		var path = '/mnt/MPD/'+ file.substr( 0, file.lastIndexOf( '/' ) );
		var artist = G.status.Artist;
		var album = G.status.Album;
	} else {
		var src = $( '.licover img' ).attr( 'src' );
		var tmppath = '/srv/http/data/tmp/';
		var path = '/mnt/MPD/'+ $( '.licover .lipath' ).text();
		if ( path.slice( -4 ) === '.cue' ) path = path.substr( 0, path.lastIndexOf( '/' ) );
		var artist = $( '.licover .liartist' ).text();
		var album = $( '.licover .lialbum' ).text();
	}
	info( {
		  icon    : 'coverart'
		, title   : 'Save Album CoverArt'
		, message : '<img src="'+ src +'">'
					   +'<p class="imgname"><w>'+ album +'</w>'
					   +'<br>'+ artist +'</p>'
		, ok      : function() {
			var ext = src.slice( -4 );
			var tmpfile = '/srv/http'+ src.slice( 0, -15 ) + ext;
			bash( [ 'coversave', tmpfile, path ], function( std ) {
				$( '.cover-save' ).remove();
			} );
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
	var wW = window.innerWidth;
	var smallscreen = wH < 590 ||wW < 500;
	var lcd = ( wH <= 320 && wW <= 480 ) || ( wH <= 480 && wW <= 320 );
	if ( !G.display.bars || ( smallscreen && !G.display.barsalways ) || lcd ) {
		G.bars = false;
		$( '#bar-top' ).addClass( 'hide' );
		$( '#bar-bottom' ).addClass( 'transparent' );
		$( '#page-playback' ).addClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).removeClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).addClass( 'bars-off' );
		$( '.content-top' ).css( 'top', 0 );
		$( '.emptyadd' ).css( 'top', '90px' );
	} else {
		G.bars = true;
		$( '#bar-top' ).removeClass( 'hide' );
		$( '#bar-bottom' ).removeClass( 'hide transparent' );
		$( '#page-playback' ).removeClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).addClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).removeClass( 'bars-off' );
		$( '.content-top' ).css( 'top', '40px' );
		$( '.emptyadd' ).css( 'top', '' );
		displayBottom();
	}
	$( '.menu' ).addClass( 'hide' );
}
function displayBottom() {
	$( '#tab-playback' )
		.removeAttr( 'class' )
		.addClass( 'fa fa-'+ G.status.player );
	$( '#bar-bottom i' ).removeClass( 'active' );
	$( '#tab-'+ G.page ).addClass( 'active' );
}
function displayCheckbox( checkboxes ) {
	var html = '';
	var col,br;
	$.each( checkboxes, function( key, val ) {
		if ( val[ 0 ] === '_' ) {
			col = ' class="infocol"';
			br = '';
			val = val.slice( 1 );
		} else if ( key === 'hr' ) {
			html += val;
			return
		} else {
			col = '';
			br = '<br>';
		}
		html += '<label'+ col +'><input name="'+ key +'" type="checkbox" '+ ( G.display[ key ] ? 'checked' : '' ) +'>&ensp;'+ val +'</label>'+ br;
	} );
	return html;
}
function displayCheckboxSet( name, enable, check ) {
	$( 'input[name="'+ name +'"]' )
		.prop( 'disabled', !enable )
		.prop( 'checked', check )
		.parent().toggleClass( 'gr', !enable );
}
function displayGet( callback ) {
	G.albumbyartist = G.display.albumbyartist;
	bash( [ 'displayget' ], function( data ) {
		callback( data );
	}, 'json' );
}
function displayPlayback() {
	var wide = window.innerWidth > 613;
	var player = G.status.webradio ? 'webradio' : G.status.player;
	$( '#infoicon i.wh:not( #i-'+ player +' )' ).addClass( 'hide' );
	$( '#i-'+ player ).removeClass( 'hide' );
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
	if ( G.display.time && wide ) {
		$( '#time' ).roundSlider( G.status.webradio || G.status.player !== 'mpd' || !G.status.playlistlength ? 'disable' : 'enable' );
		$( '#progress' ).empty();
	}
	$( '#time-bar, #time-band' ).toggleClass( 'hide', $( '#time-knob' ).is( ':visible' ) );
	$( '#time-band' ).toggleClass( 'disabled', !G.status.playlistlength || G.status.player !== 'mpd' || G.status.webradio );
	$( '#time, .timemap, .covermap' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
	$( '.volumeband' )
		.toggleClass( 'hide', G.display.volume )
		.toggleClass( 'disabled', G.status.volume == -1 );
	$( '.covermap.r1, #coverB' ).removeClass( 'disabled' );
	$( '#timemap' ).toggleClass( 'hide', G.display.cover );
	displayBars();
}
function displaySave( page ) {
	$( '#infoCheckBox input' ).each( function() {
		G.display[ this.name ] = $( this ).prop( 'checked' );
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
	
	setTimeout( function() { // suppress hide by info
		loader( 'show' );
	}, 0 );
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
		var html = '<p class="artist">'+ artist +'<i class="closebio fa fa-times close-root"></i></p>'
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
			$( '#biobanner, #bioimg' ).hide();
			loader( 'hide' );
			
			$.get( 'https://webservice.fanart.tv/v3/music/'+ data.mbid +'?api_key='+ G.apikeyfanart, function( data ) {
				if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) $( '#biobanner' ).attr( 'src', data.musicbanner[ 0 ].url ).show();
				if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
					var thumbs = data.artistthumb;
					var images = '';
					thumbs.forEach( function( el ) {
						images += '<a href="'+ el.url +'" target="_blank"><img src="'+ el.url.replace( '/fanart/', '/preview/' )  +'"></a>';
					} );
					$( '#bioimg' ).html( images ).show();
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
	local();
	bash( '/srv/http/bash/status.sh', function( status ) {
		if ( !status ) return
		
		$.each( status, function( key, value ) {
			G.status[ key ] = value;
		} );
		displayBottom();
		if ( G.status.player === 'snapclient' ) {
			bash( 'sshpass -p '+ status.snapserverpw +' ssh -q root@'+ status.snapserverip +' /srv/http/bash/status.sh', function( status ) {
				$.each( status, function( key, value ) {
					G.status[ key ] = value;
				} );
				G.status.sampling = '16 bit 48 kHz 1.54 Mbit/s &bull; Snapcast';
				displayPlayback();
				setButtonControl();
				renderPlayback();
			}, 'json' );
		} else if ( G.playback || render ) { // 'render' - add to blank playlist
			G.plreplace = 0;
			displayPlayback();
			setButtonControl();
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
			if ( !G.savedlist && !G.savedplaylist && !G.sortable && !$( '#pl-search-close' ).text() ) getPlaylist();
		}
		setButtonUpdating();
	}, 'json' );
}
function getPlaylist() {
	list( { cmd: 'current' }, renderPlaylist, 'json' );
}
function getTitleWidth() {
	var $liactive = $( '#pl-list li.active' ); 
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	plwW = $( window ).width();
	$title.css( {
		  'max-width' : 'none'
		, visibility  : 'hidden'
	} );
	pltW = $title.width();
	$title.removeAttr( 'style' );
}
function hideGuide() {
	G.guide = false;
	$( '#coverTR' ).toggleClass( 'empty', !G.status.playlistlength && !G.bars );
	$( '.map' ).removeClass( 'mapshow' );
	$( '#button-playback, #bar-bottom' ).removeClass( 'translucent' );
	if ( !G.bars ) $( '#bar-bottom' ).addClass( 'transparent' );
	if ( !G.display.progressbar ) $( '#timebar' ).addClass( 'hide' );
	$( '.band, #volbar' ).addClass( 'transparent' );
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.cover-save' ).css( 'z-index', '' );
}
function HMS2Second( HMS ) {
	var hhmmss = HMS.split( ':' ).reverse();
	if ( !hhmmss[ 1 ] ) return +hhmmss[ 0 ];
	if ( !hhmmss[ 2 ] ) return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60;
	return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60 + hhmmss[ 2 ] * 3600;
}
function imageReplace( imagefile, type, callback ) {
	var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
	var ext = '.'+ file.name.split( '.' ).pop();
	var formData = new FormData();
	formData.append( 'cmd', 'imagereplace' );
	if ( ext !== '.gif' ) {
		ext = '.jpg';
		var base64 = $( '#imgnew' )
						.attr( 'src' )
						.split( ',' )
						.pop();
		formData.append( 'base64', base64 );
	} else { // gif - upload file
		formData.append( 'file', file );
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
			if ( callback ) callback( ext );
			$( '.edit' ).remove();
			$( '#coverart, .licoverimg img' ).css( 'opacity', '' );
		}
	} );
}
function infoNoData() {
	loader( 'hide' );
	var keyword = $( '#lib-search-input' ).val();
	var message = !keyword
					? ( G.librarylist ? 'No data in this location.' : 'No <wh>'+ G.mode +'s</wh> in database.' )
						 +'<br>Update for changes then try again:'
						 +'<br>Settings > MPD | <i class="fa fa-refresh-library wh"></i>'
					: 'Nothing found for <wh>'+ keyword +'</wh>';
	info( {
		  icon      : 'library'
		, title     : 'Library Database'
		, message   : message
		, autoclose : 10000
	} );
}
function infoUpdate( path ) {
	if ( G.status.updating_db ) {
		info( {
			  icon     : 'refresh-library'
			, title    : 'Update Library Database'
			, message  : 'Updating in progress ...'
		} );
		return
	}
	
	info( {
		  icon     : 'refresh-library'
		, title    : 'Update Library Database'
		, radio    : { 'Only changed files' : 1, 'Rebuild entire database': 2 }
		, checkbox : { 'Include changed <code>*.wav</code> album artists': 1 }
		, radiohr  : 1
		, preshow  : function() {
			if ( path ) {
				$( '#infoRadio' ).hide();
				$( '#infoMessage' )
					.html( '<i class="fa fa-folder"></i> <wh>'+ path +'</wh>' )
					.removeClass( 'hide' );
			}
			if ( !$( '#mode-nas grl' ).text() ) {
				$( '#infoCheckBox input' ).prop( 'checked', 1 );
				$( '#infoCheckBox' ).hide()
				$( '#infoContent hr' ).remove();
			}
		}
		, ok       : function() {
			var wav = $( '#infoCheckBox input' ).prop( 'checked' );
			if ( path || $( '#infoRadio input:checked' ).val() == 1 ) {
				if ( path && !G.localhost ) G.list.li.find( '.lib-icon' ).addClass( 'blink' );
				bash( [ 'mpcupdate', wav, path ] );
			} else {
				bash( [ 'mpcupdate', wav, 'rescan' ] );
			}
		}
	} );
}
function loader( toggle ) {
	$( '#loader' ).toggleClass( 'hide', toggle === 'hide' );
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
function mpcSeekBar( pageX, set ) {
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
	if ( set ) mpcSeek( position );
}
function orderLibrary() {
	if ( G.display.order ) {
		$.each( G.display.order, function( i, name ) {
			var $libmode = $( '.lib-mode' ).filter( function() {
				return $( this ).find( '.lipath' ).text() === name;
			} );
			$libmode.detach();
			$( '#lib-mode-list' ).append( $libmode );
		} );
	}
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
		  icon        : 'list-ul'
		, title       : 'Add to playlist'
		, message     : 'Insert'
				   +'<br><w>'+ G.pladd.name +'</w>'
				   +'<br>before'
				   +'<br><w>'+ $this.find( '.name' ).text() +'</w>'
		, buttonlabel : 'i class="fa fa-undo"></i>Reselect'
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
		  icon    : 'list-ul'
		, title   : 'Add to playlist'
		, message : 'Select where to add:'
				   +'<br><w>'+ G.list.name +'</w>'
		, radio   : { First : 'first', Select: 'select', Last: 'last' }
		, cancel  : function() {
			G.pladd = {};
		}
		, ok      : function() {
			var target = $( '#infoRadio input:checked' ).val();
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
	if ( G.status.state === 'pause' ) {
		elapsedtxt = second2HMS( G.status.elapsed );
		$elapsed.html( '<i class="fa fa-pause"></i>'+ elapsedtxt + slash );
		getTitleWidth();
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
			$( '.elapsed' ).empty();
		}
		getTitleWidth();
		var time = $this.find( '.time' ).data( 'time' );
		G.intElapsedPl = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === time ) {
				clearInterval( G.intElapsedPl );
				$elapsed.empty();
				G.status.elapsed = 0;
				if ( G.status.state === 'play' ) {
					$( '#pl-list li .elapsed' ).empty();
					setPlaylistScroll();
				}
				return
			}
			
			elapsedtxt = second2HMS( G.status.elapsed );
			$elapsed.html( '<i class="fa fa-play"></i>'+ elapsedtxt + slash );
			setTitleWidth();
		}, 1000 );
	} else { // stop
		$song
			.empty()
			.css( 'max-width', '' );
		$elapsed.empty();
	}
}
function renderLibrary() {
	G.query = [];
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#button-coverart' ).addClass( 'hidden' );
	$( '#lib-breadcrumbs, #lib-path>i, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path .lipath' ).empty()
	$( '#button-lib-back' ).toggleClass( 'back-left', G.display.backonleft );
	$( '#lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	if ( G.librarylist ) {
		$( 'html, body' ).scrollTop( G.liscrolltop );
		return
	}
	
	$( '#page-library .content-top, #lib-list' ).addClass( 'hide' );
	var breadcrumbhtml = '<span class="title">LIBRARY</span>';
	if ( $( '#lib-mode-list' ).data( 'count' ) ) breadcrumbhtml += '<span id="li-count">'+ $( '#lib-mode-list' ).data( 'count' ).toLocaleString() +' <i class="fa fa-music gr"></i></span>';
	$( '#lib-breadcrumbs' ).html( breadcrumbhtml );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '.mode:not( .mode-bookmark )' ).each( function() {
		var name = this.id.replace( 'mode-', '' );
		$( this ).parent().toggleClass( 'hide', !G.display[ name ] );
	} );
	$( '#li-count, .mode grl' ).toggleClass( 'hide', !G.display.count );
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
	$( '.edit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
	orderLibrary();
//	displayBars();
	$( 'html, body' ).scrollTop( G.modescrolltop );
}
function renderLibraryList( data ) {
	if ( data == -1 ) {
		infoNoData();
		return
	}
	
	G.librarylist = 1;
	loader( 'show' );
	$( '#lib-mode-list, .menu' ).addClass( 'hide' );
	$( '#button-lib-back' ).toggleClass( 'hide', data.modetitle === 'search' );
	$( '#lib-path .lipath' ).text( data.path );
	if ( 'count' in data ) {
		$( '#lib-path' ).css( 'max-width', '40px' );
		$( '#lib-list' ).css( 'width', '100%' );
		$( '#lib-search-close' ).html( '<i class="fa fa-times"></i><span>' + data.count + ' <grl>of</grl></span>&ensp;' );
		var htmlpath = '';
	} else if ( [ 'file', 'sd', 'nas', 'usb' ].indexOf( G.mode ) === -1 ) {
		// track view - keep previous title
		var htmlpath = '<i class="fa fa-'+ G.mode +'"></i> <span id="mode-title">'+ data.modetitle +'</span>';
		if ( G.mode === 'webradio' ) htmlpath += '<i class="button-webradio-new fa fa-plus-circle"></i>';
		$( '#button-lib-search' ).addClass( 'hide' );
	} else { // dir breadcrumbs
		var dir = data.modetitle.split( '/' );
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
	if ( htmlpath ) $( '#lib-breadcrumbs' ).html( htmlpath );
	$( '#lib-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		$( '.liinfopath' ).toggleClass( 'hide', G.mode === 'file' );
		if ( G.mode === 'album' && $( '#lib-list .coverart' ).length ) {
			var src = $( '#lib-list img[data-src$=".jpg"]:eq( 0 )').data( 'src' );
			$( '#lib-breadcrumbs' ).append( '<span id="button-coverart"><i class="fa fa-search albumrefresh"></i><img src="'+ src +'" class="albumimg"></span>' );
			var defaultcover = 0;
			$( '#button-coverart img' ).on( 'error', function() {
				if ( !defaultcover ) $( this ).replaceWith( '<i class="fa fa-coverart albumcoverart"></i>' );
				defaultcover = 1;
			} );
		}
		$( '#liimg' ).on( 'load', function() {
			$( 'html, body' ).scrollTop( 0 );
		} ).on( 'error', function() {
			$( this ).attr( 'src', coverdefault );
		} );
		$( '#lib-list .lazy' ).on( 'error', function() {
			$( this )
				.attr( 'src', $( this ).attr( 'src' ).slice( 0, -3 ) +'gif' )
				.on( 'error', function() {
					if ( G.mode === 'album' ) {
						$( this ).attr( 'src', coverdefault );
					} else {
						$( this ).replaceWith( '<i class="fa fa-folder lib-icon" data-target="#menu-folder"></i>' );
					}
				} );
		} );
		if ( $( '#lib-list img.lazy' ).length ) {
			G.lazyload.update();
		} else if ( $( '.licover' ).length ) {
			setTrackCoverart();
		}
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
		if ( $( '#liimg' ).length ) {
			$( '#liimg' ).on( 'load', function() {
				loader( 'hide' );
			} );
		} else {
			loader( 'hide' );
		}
		$( '#lib-list' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( G.scrolltop[ data.path ] || 0 );
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
}
function renderPlayback() {
	clearIntervalAll();
	// song and album before update for song/album change detection
	var previousartist = $( '#artist' ).text();
	var prevtitle = $( '#song' ).text();
	var previousalbum = $( '#album' ).text();
	// volume
	if ( !G.display.volumenone && G.display.volume ) {
		$volumeRS.setValue( G.status.volume );
		$volumehandle.rsRotate( - $volumeRS._handle1.angle );
		G.status.volumemute != 0 ? volColorMute( G.status.volumemute ) : volColorUnmute();
		$( '#volume-text' ).text( G.status.volume );
		$( '#volume-bar' ).css( 'width', G.status.volume +'%' );
	}
	// empty queue
	if ( !G.status.playlistlength && G.status.player === 'mpd' && G.status.state === 'stop' ) {
		renderPlaybackBlank();
		return
	}
	
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#coverTR' ).removeClass( 'empty' );
	$( '#qrwebui, #qrip' ).empty();
	$( '#coverart' ).removeClass( 'hide' );
	$( '.playback-controls' ).css( 'visibility', 'visible' );
	$( '#artist, #song, #album' ).css( 'width', '' );
	$( '#artist' ).html( G.status.Artist );
	$( '#song' )
		.html( G.status.Title )
		.toggleClass( 'gr', G.status.state === 'pause' );
	$( '#album' )
		.toggleClass( 'albumradio', G.status.webradio )
		.html( G.status.Album ).promise().done( function() {
		scrollLongText();
	} );
	var sampling = G.status.sampling;
	if ( G.status.webradio ) sampling += sampling ? ' &bull; Radio' : 'Radio';
	$( '#sampling' ).html( sampling );
	if ( !G.coversave ) $( '.cover-save' ).remove();
	var displaytime = $( '#time-knob' ).is( ':visible' );
	// webradio ////////////////////////////////////////
	if ( G.status.webradio ) {
		G.coversave = 0;
		$( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).css( 'width', 0 );
		$( '#progress, #elapsed, #total' ).empty();
		$( '.cover-save' ).remove();
		if ( !G.status.Title || G.status.Title !== prevtitle ) {
			if ( G.status.coverart ) {
				var coverart = G.status.coverart;
			} else {
				var coverart = G.status.coverartradio || ( G.status.state === 'stop' ? vustop : vu );
			}
			$( '#coverart' ).attr( 'src', coverart );
		}
		if ( G.status.state !== 'play' ) {
			$( '#song' ).html( '·&ensp;·&ensp;·' );
		} else {
			if ( !G.status.Title ) $( '#song' ).html( blinkdot );
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
		return
	}
	
	// others ////////////////////////////////////////
	if ( G.status.Artist !== previousartist || G.status.Album !== previousalbum || G.status.player === 'airplay' ) {
		G.coversave = 0;
		$( '#coverart' ).attr( 'src', G.status.coverart || coverdefault );
	}
	// time
	time = 'Time' in G.status ? G.status.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	// stop ////////////////////
	if ( G.status.state === 'stop' ) {
		if ( G.status.player === 'upnp' ) $( '#sampling' ).empty();
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
	if ( G.status.elapsed === false ) {
		$( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).css( 'width', 0 );
		return
	}
	
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
	$( '#playback-controls, #infoicon i' ).addClass( 'hide' );
	$( '#divartist, #divsong, #divalbum' ).removeClass( 'scroll-left' );
	$( '#artist, #song, #album, #progress, #elapsed, #total' ).empty();
	if ( G.display.time ) $( '#time' ).roundSlider( 'setValue', 0 );
	$( '#time-bar' ).css( 'width', 0 );
	$( '.cover-save' ).remove();
	bash( "ip r | awk '/default/ {print $9}' | head -c -1", function( ip ) {
		if ( ip ) {
			var ips = ip.split( '\n' );
			var htmlip = '';
			ips.forEach( function( each ) {
				htmlip += '<br><gr>http://</gr>'+ each
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
				.attr( 'src', coverdefault )
				.addClass( 'hide' );
			$( '#sampling' ).empty();
		} else {
			$( '#coverart' ).attr( 'src', coverdefault );
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
renderPlaylist = function( data ) {
	G.savedlist = 0;
	G.status.playlistlength = data.playlistlength;
	$( '#pl-search-input' ).val( '' );
	$( '#pl-path, #button-pl-back, #pl-savedlist, #pl-index, #pl-search' ).addClass( 'hide' );
	$( '#lib-path>span, #button-pl-search' ).removeClass( 'hide' );
	$( '#button-pl-open' ).toggleClass( 'disable', G.status.playlists === 0 );
	if ( data == -1 ) {
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-count' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disable' );
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		loader( 'hide' );
		return
	}
	
	$( '.playlist' ).removeClass( 'hide' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#pl-count' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '#button-pl-save, #button-pl-clear, #button-pl-search' ).removeClass( 'disable' );
	$( '#button-pl-crop, #button-pl-shuffle' ).toggleClass( 'disable', G.status.playlistlength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-librandom' ).toggleClass( 'bl', G.status.librandom );
	var plremove = $( '#pl-list .pl-remove' ).length;
	$( '#pl-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		if ( $( '#pl-list img.lazy' ).length ) G.lazyload.update();
		$( '.list p' ).toggleClass( 'bars-on', G.bars );
		$( '#pl-list li' )
			.removeClass( 'active activeplay' )
			.find( '.elapsed, .song' )
			.empty();
		$( '#pl-list li .name' ).removeClass( 'hide' );
		$( '#pl-list li .song' ).css( 'max-width', '' );
		loader( 'hide' );
		setPlaylistScroll();
		if ( plremove ) $( '#pl-list .li1' ).before( '<i class="fa fa-minus-circle pl-remove"></i>' );
		$( '#pl-list .lazy' ).on( 'error', function() {
			$( this )
				.attr( 'src', $( this ).attr( 'src' ).slice( 0, -3 ) +'gif' )
				.on( 'error', function() {
					$( this ).replaceWith( '<i class="fa fa-music pl-icon" data-target="#menu-filesavedpl"></i>' );
				} );
		} );
	} );
}
function renderPlaylistList() {
	list( { cmd: 'list' }, function( data ) {
		$( '.playlist, #button-pl-search, #menu-plaction' ).addClass( 'hide' );
		$( '#menu-plaction' ).addClass( 'hide' );
		
		$( '#pl-path' ).html( data.counthtml );
		$( '#pl-path, #button-pl-back, #pl-savedlist, #pl-index' ).removeClass( 'hide' );
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '' );
			$( '#pl-index' ).html( data.index[ 0 ] );
			$( '#pl-index1' ).html( data.index[ 1 ] );
			$( 'html, body' ).scrollTop( 0 );
			loader( 'hide' );
			$( 'body' ).on( 'DOMSubtreeModified', '#pl-savedlist', function() {
				if ( $( '#pl-savedlist img.lazy' ).length ) G.lazyload.update();
			} );
		} );
	}, 'json' );
}
function renderSavedPlaylist( name ) {
	$( '.menu' ).addClass( 'hide' );
	$( '#pl-count' ).empty();
	list( { cmd: 'get', name: name }, function( data ) {
		$( '#pl-path' ).html( data.counthtml );
		$( '#button-pl-back' ).toggleClass( 'back-left', G.display.backonleft );
		$( '#pl-path, #button-pl-back, #pl-savedlist' ).removeClass( 'hide' );
		$( '#pl-path bl' ).removeClass( 'title' );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '100%' );
			$( '#pl-index, #pl-index1' ).addClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
			loader( 'hide' );
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
	var wW = window.innerWidth;
	var tWmax = 0;
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
		$( '#playback-controls' ).toggleClass( 'hide', G.status.playlistlength === 0 );
		$( '#previous, #next' ).toggleClass( 'hide', G.status.playlistlength < 2 || G.status.player !== 'mpd' );
		$( '#play, #pause' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
		$( '#pause' ).toggleClass( 'hide', G.status.webradio || G.status.player === 'airplay' );
		$( '#playback-controls .btn' ).removeClass( 'active' );
		$( '#'+ G.status.state ).addClass( 'active' );
	}
	setTimeout( setButtonOptions, 0 );
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
	
	if ( G.display.buttons && $( '#time-knob' ).is( ':visible' ) ) {
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
			$( '#'+ prefix +'-addons' ).addClass( 'hide' );
			$( '#'+ prefix +'-addons' ).removeClass( 'hide' );
		}
	} else {
		$( '#button-settings, #addons i' ).removeClass( 'bl' );
		$( '#i-addons, #ti-addons' ).addClass( 'hide' );
	}
}
function setButtonUpdating() {
	var $elupdate = $( '#tab-library, #button-library, #i-update, #ti-update' );
	$( '#i-update, #ti-update' ).addClass( 'hide' );
	if ( G.status.updating_db ) {
		if ( G.bars ) {
			if ( !G.localhost ) $( '#tab-library, #button-library' ).addClass( 'blink' );
		} else {
			$( '#'+ ( G.display.time ? 'ti' : 'i' ) +'-update' ).removeClass( 'hide' );
		}
		if ( G.status.updating_db === 2 ) {
			$elupdate.removeClass( 'fa-library' ).addClass( 'fa-file-wave' );
		} else if ( G.status.updating_db === 3 ) {
			$elupdate.removeClass( 'fa-library fa-file-wave' ).addClass( 'fa-file-playlist' );
		}
	} else {
		$elupdate.removeClass( 'fa-file-playlist fa-file-wave' ).addClass( 'fa-library' );
		$( '#tab-library, #button-library, .lib-icon.blink' ).removeClass( 'blink' );
	}
}
function setNameWidth() {
	var wW = window.innerWidth;
	$.each( $( '#pl-list .name' ), function() {
		var $name = $( this );
		var $dur =  $name.next();
		// pl-icon + margin + duration + margin
		var iWdW = 40 + 10 + $dur.width();
		if ( iWdW + $name.width() < wW ) {
			$dur.removeClass( 'duration-right' );
			$name.css( 'max-width', '' );
		} else {
			$dur.addClass( 'duration-right' );
			$name.css( 'max-width', wW - iWdW +'px' );
		}
	} );
}
function setPlaylistScroll() {
	if ( !G.playlist
		|| G.status.player !== 'mpd'
		|| G.status.player !== 'mpd'
		|| !$( '#pl-savedlist' ).hasClass( 'hide' )
		|| !G.status.playlistlength
		|| G.sortable ) return // skip if empty or Sortable
	
	playlistProgress();
	setNameWidth();
//	displayBars();
	$( '#pl-list li' ).removeClass( 'active updn' );
	$liactive = $( '#pl-list li' ).eq( G.status.song || 0 );
	$liactive.addClass( 'active' );
	$( '#menu-plaction' ).addClass( 'hide' );
	if ( G.status.playlistlength < 5 || !$( '#infoOverlay' ).hasClass( 'hide' ) ) {
		$( 'html, body' ).scrollTop( 0 );
	} else {
		var scrollpos = $liactive.offset().top - ( G.bars ? 80 : 40 ) - ( 49 * 3 );
		$( 'html, body' ).scrollTop( scrollpos );
	}
}
function setTitleWidth() {
	// pl-icon + margin + duration + margin
	var $liactive = $( '#pl-list li.active' ); 
	var $duration = $liactive.find( '.duration' );
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	var iWdW = 40 + 10 + $duration.width() + 10;
	if ( iWdW + pltW < plwW ) {
		$title.css(  'max-width', '' );
		$duration.removeClass( 'duration-right' );
	} else {
		$title.css( 'max-width', plwW - iWdW +'px' );
		$duration.addClass( 'duration-right' );
	}
	$( '.duration-right' ).css( 'right', '' );
}
function setTrackCoverart() {
	$( '#liimg' ).on( 'load', function() {
		$( '.liinfo' ).css( 'width', ( window.innerWidth - $( this ).width() - 50 ) +'px' );
	} );
	if ( !G.display.fixedcover ) {
		$( '.licover' ).addClass( 'nofixed' );
		$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
	}
	if ( $( '.licoverimg' ).hasClass( 'nocover' ) ) {
		var artist = $( '.liartist' ).text();
		var album = $( '.lialbum' ).text();
		$.post(
			  cmdphp
			, { cmd: 'sh', sh: [ 'status-coverartonline.sh', artist, album, 'licover' ] }
			, function( url ) {
				if ( url ) {
					$( '#liimg' )
						.attr( 'src', url )
						.after( '<div class="liedit cover-save"><i class="fa fa-save"></i></div>' )
						.on( 'load', function() {
							$( '.liinfo' ).css( 'width', ( window.innerWidth - $( this ).width() - 50 ) +'px' );
						} );
				}
			}
		);
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
	G.library = G.playback = G.playlist = 0;
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
					+'<input type="hidden" name="sh[]" value="'+ path +'">'
			  +'</form>';
	$( 'body' ).append( form );
	$( '#formtemp' ).submit();
}
function volColorMute( volumemute ) {
	$volumetooltip
		.text( volumemute )
		.addClass( 'bl' );
	$volumehandle.addClass( 'bgr60' );
	$( '#volmute' ).addClass( 'active' )
		.find( 'i' ).removeClass( 'fa-volume' ).addClass( 'fa-mute' );
	var prefix = G.display.time && window.innerWidth > 613 ? 'ti' : 'i';
	if ( !G.display.volume ) $( '#'+ prefix +'-mute' ).removeClass( 'hide' );
}
function volColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' ).removeClass( 'active' )
		.find( 'i' ).removeClass( 'fa-mute' ).addClass( 'fa-volume' );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
}
function volumebarTimeout() {
	G.volumebar = setTimeout( function() {
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		$( '#page-playback' ).css( { height: '', 'margin-top': '' } );
		$( '.volumeband' ).addClass( 'transparent' );
	}, 3000 );
}
function volumeSet( pageX ) {
	var $volumeband = $( '#volume-band' );
	var posX = pageX - $volumeband.offset().left;
	var bandW = $volumeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var vol = Math.round( posX / bandW * 100 );
	if ( G.drag ) {
		$( '#volume-bar' ).css( 'width', vol +'%' );
		bash( 'mpc volume '+ vol );
	} else {
		$( '#volume-bar' ).animate( { width: vol +'%' }, 600 );
		$( '.volumeband' ).addClass( 'disabled' );
		bash( [ 'volume', G.status.volume, vol ], function() {
			$( '.volumeband' ).removeClass( 'disabled' );
		} );
	}
	$( '#volume-text' ).text( vol );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
}
