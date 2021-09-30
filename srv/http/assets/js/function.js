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
	if ( std ) {
		info( {
			  icon    : 'jigsaw'
			, title   : 'Addons'
			, message : std == -1 ? 'Download from Addons server failed.' : 'No internet connection.'
					   +'<br>Please try again later.'
			, ok      : function() {
				loaderHide();
			}
		} );
	} else {
		location.href = '/settings/addons.php';
	}
}
function bookmarkeditClear() {
	G.bookmarkedit = 0;
	$( '.bkedit' ).remove();
	$( '.mode-bookmark' )
		.css( 'background', '' )
		.find( '.fa-bookmark, .bklabel, img' )
		.css( 'opacity', '' );
}
function clearIntervalAll() {
	// .btn-cmd[!play], #time[start change], #time-band[touchstart mousedown], #pl-list li, 
	// psNotify, pushstream[disconnect], renderPlayback, setProgressElapsed, setPlaylistScroll, switchPage
	[ G.intElapsedPl, G.intElapsed, G.intRelaysTimer, G.intVu ].forEach( function( el ) {
		clearInterval( el );
	} );
	if ( G.status.state === 'play' && !G.status.stream ) setProgress(); // stop progress animation
	$( '#vuneedle' ).css( 'transform', '' );
}
function colorSet() {
	var rgb0 = $( '#colorcancel' ).css( 'color' ).replace( /rgb\(|,|\)/g, '' ); // rgb(aaa, bb, cc) > aaa bb cc
	$( '#lib-list li:eq( 0 )' ).trigger( 'tap' );
	$( '.licover' ).toggleClass( 'hide', window.innerHeight < 590 );
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
				$( '#bar-top, #playback-controls i, #playlist, .menu a, .submenu' ).css( 'background-color', hsg +'30%)' );
				$( '.content-top, #playback, #colorcancel' ).css( 'background', hsg +'20%)' );
				$( '.lib-icon, gr' ).css( 'cssText', 'color: '+ hsg +'60%) !important;' );
				$( '#lib-list li.active i, #lib-list li.active .time, #lib-list li.active .li2' ).css( 'color', hsg +'30%)' );
				$( '.menu a' ).css( 'border-top', '1px solid '+ hsg +'20%)' );
				$( '#lib-list li' ).css( 'border-bottom', '1px solid '+ hsg +'20%)' );
				$( '#playback-controls .active, #library, #button-library, #lib-list li.active, #colorok' ).css( 'background-color', hex );
				$( '#button-lib-back, .lialbum, #colorcancel' ).css( 'color', hex );
				$( '#colorok' ).toggleClass( 'disabled', rgb === rgb0 );
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
	
	var modes = [ 'file', 'nas', 'sd', 'usb' ];
	var filemode = modes.indexOf( G.mode ) !== -1;
	$( '.replace' ).next().addBack().toggleClass( 'hide', !G.status.playlistlength );
	$( '.refresh-library' ).toggleClass( 'hide', !( 'updating_db' in G.status ) );
	$( '#menu-folder a:not(.sub)' ).toggleClass( 'hide', G.list.licover && [ 'album', ...modes ].indexOf( G.mode ) === -1 );
	$menu.find( '.bookmark, .exclude, .update, .thumb' ).toggleClass( 'hide', !filemode );
	$menu.find( '.directory' ).toggleClass( 'hide', filemode );
	$menu.find( '.tag' ).toggleClass( 'hide', !$( '.licover' ).length || G.mode !== 'file' );
	$li.addClass( 'active' );
	var barsvisible = $( '#bar-top' ).is( ':visible' );
	if ( G.list.licover ) {
		var menutop = barsvisible ? '310px' : '270px';
	} else {
		var menutop = ( $li.offset().top + 48 ) +'px';
	}
	contextmenuScroll( $menu, menutop );
	G.color = 0; // reset to 0 once show
}
function contextmenuScroll( $menu, menutop ) {
	var fixedmenu = G.library && G.list.licover && G.display.fixedcover ? true : false;
	$menu
		.css( 'top',  menutop )
		.toggleClass( 'fixed', fixedmenu )
		.removeClass( 'hide' );
	var targetB = $menu.offset().top + $menu.height();
	var wH = window.innerHeight;
	var topH = $( '#bar-top' ).is( ':visible' ) ? 80 : 40;
	var wT = $( window ).scrollTop();
	if ( targetB > ( wH - topH + wT ) ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
}
function coverartChange() {
	if ( G.playback ) {
		var src = $( '#coverart' ).attr( 'src' );
		var path = G.status.file.substr( 0, G.status.file.lastIndexOf( '/' ) );
		var album = G.status.Album;
		var artist = G.status.Artist;
	} else {
		var src = $( '#liimg' ).attr( 'src' );
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
						|| ( G.library && !liembedded && !lionlinefetched && !licoverdefault )
						&& $( '#liimg' ).attr( 'src' ).slice( 0, 7 ) !== '/assets';
	var footer = ( G.playback && pbembedded ) || ( G.library && liembedded ) ? '(Embedded)' : '';
	var covername = ( artist + album ).replace( /[ '"`?/#&]/g, '' );
	info( {
		  icon        : '<i class="iconcover"></i>'
		, title       : 'Change Album CoverArt'
		, message     : '<img class="imgold">'
					   +'<p class="infoimgname"><i class="fa fa-album wh"></i> '+ album
					   +'<br><i class="fa fa-artist wh"></i> '+ artist +'</p>'
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
			bash( [ 'coverartreset', imagefile +'.'+ ext, path, artist, album ] );
		}
		, ok          : function() {
			imageReplace( imagefile, type, covername );
		}
	} );
}
function coverartDefault() {
	if ( G.display.vumeter ) return
	
	if ( G.display.novu ) {
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
	var covername = ( artist + album ).replace( /[ '"`?/#&]/g, '' );
	info( {
		  icon    : '<i class="iconcover"></i>'
		, title   : 'Save Album CoverArt'
		, message : '<img src="'+ src +'">'
					+'<p class="infoimgname">'+ album
					+'<br>'+ artist +'</p>'
		, ok      : function() {
			bash( [ 'coversave', '/srv/http'+ src.slice( 0, -15 ) + src.slice( -4 ), path, covername ] );
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
	if ( !$( '#bio' ).hasClass( 'hide' ) || 'coverTL' in G ) return
	
	var wH = window.innerHeight;
	var wW = document.body.clientWidth;
	var smallscreen = wH < 590 ||wW < 500;
	var lcd = ( wH <= 320 && wW <= 480 ) || ( wH <= 480 && wW <= 320 );
	if ( !G.display.bars || ( smallscreen && !G.display.barsalways ) || lcd ) {
		$( '#bar-top' ).addClass( 'hide' );
		$( '#bar-bottom' ).addClass( 'transparent' );
		$( '.page' ).addClass ( 'barshidden' );
		$( '#page-playback, .emptyadd' ).removeClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).addClass( 'bars-off' );
		$( '.content-top' ).css( 'top', '' );
		$( '.emptyadd' ).css( 'top', '90px' );
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
function displayCheckboxSet( i, enable, check ) {
	$( '#infoContent input' ).eq( i )
		.prop( 'disabled', !enable )
		.prop( 'checked', check )
		.parent().toggleClass( 'gr', !enable );
}
function displayPlayback() {
	var $time = $( '#time-knob' );
	var $cover = $( '#coverart-block' );
	var $volume = $( '#volume-knob' );
	$time.toggleClass( 'hide', !G.display.time );
	$volume.toggleClass( 'hide', !G.display.volume || G.display.volumenone );
	var time = $time.is( ':visible' );
	var cover = G.display.cover;
	var volume = $volume.is( ':visible' );
	$cover
		.toggleClass( 'hide', !cover )
		.toggleClass( 'coversmall', G.display.coversmall );
	$( '#coverart' ).css( 'width', G.display.coversmall ? '230px' : '' );
	if ( ( !time || !volume ) && window.innerWidth > 500 ) {
		$( '#time-knob, #volume-knob' ).css( 'width', '38%' );
		if ( !time && !volume ) {
			$cover.css( { width: '100%', 'max-width': '100%' } );
		} else if ( !time || !volume ) {
			$cover.css( { width: 'fit-content', 'max-width': '55vw' } );
		}
	} else {
		$( '#time-knob, #volume-knob' ).css( 'width', '' );
		$cover.css( { width: '', 'max-width': '' } );
	}
	$( '#play-group, #vol-group' ).toggleClass( 'hide', G.status.player !== 'mpd' || !G.display.buttons );
	if ( time ) $( '#time' ).roundSlider( G.status.stream || G.status.player !== 'mpd' || !G.status.playlistlength ? 'disable' : 'enable' );
	$( '#progress, #time-bar, #time-band' ).toggleClass( 'hide', time );
	$( '#time-band' ).toggleClass( 'disabled', !G.status.playlistlength || G.status.player !== 'mpd' || G.status.stream );
	$( '#time, .timemap, .covermap' ).toggleClass( 'disabled', [ 'mpd', 'upnp' ].indexOf( G.status.player ) === -1 );
	$( '.volumeband' ).toggleClass( 'hide', G.display.volumenone || volume );
	$( '.covermap.r1, #coverB' ).removeClass( 'disabled' );
	$( '#timemap' ).toggleClass( 'hide', G.display.cover );
	var wW = window.innerWidth;
	if ( G.display.vumeter ) {
		var aligntop = 'stretch';
	} else if ( $( '.btn-group' ).is( ':hidden' ) ) {
		var align = 'center';
	} else if ( time && volume && ( wW < 900 && wW > 750 ) || wW < 600 ) {
		var align = 'stretch';
	} else {
		var align = 'center';
	}
	$( '#playback-row' ).css( 'align-items', align );
}
function displaySave( keys ) {
	var values = infoVal();
	var display = JSON.parse( JSON.stringify( G.display ) );
	keys.forEach( function( k, i ) {
		display[ k ] = values[ i ];
	} );
	[ 'color', 'order', 'update', 'updating_db', 'volumenone' ].forEach( function( item ) {
		delete display[ item ];
	} );
	bash( [ 'displaysave', JSON.stringify( display ) ] );
}
function equalizer() {
	bash( [ 'equalizer' ], function( data ) {
		G.eqcurrent = data.current;
		var vcurrent = data.values.join( '' );
		data.values.push( data.current );
		var options = '';
		data.presets.forEach( function( name ) {
			options += '<option value="'+ name +'">'+ name +'</option>';
		} );
		var content = `
<div id="eq">
<div id="eqflatline"></div>
<div class="infomessage">Hz
<div class="hz"><a>31</a><a>63</a><a>125</a><a>250</a><a>500</a><a>1000</a><a>2000</a><a>4000</a><a>8000</a><a>16000</a></div></div>
<div id="infoRange" class="vertical">${ '<input type="range">'.repeat( 10 ) }</div>
<br>
<i id="eqdelete" class="ibtn fa fa-minus-circle hide"></i>
<i id="eqrename" class="ibtn fa fa-edit-circle"></i>
<i id="eqsave" class="ibtn fa fa-save"></i>
<select id="eqpreset">${ options }</select><input id="eqname" type="text" class="hide">
<i id="eqnew" class="ibtn fa fa-plus-circle"></i><i id="eqcancel" class="ibtn fa fa-times bl hide"></i>
<i id="eqflat" class="ibtn fa fa-set0"></i>
</div>`;
		info( {
			  icon       : 'equalizer'
			, title      : 'Equalizer'
			, content    : content
			, boxwidth   : 145
			, values     : data.values
			, beforeshow : function() {
				var eqnew = 0;
				var eqrename = 0;
				var vflat = '66'.repeat( 10 );
				var freq = [ 31, 63, 125, 250, 500, 1, 2, 4, 8, 16 ];
				var notpreset = G.eqcurrent === '(unnamed)' || G.eqcurrent === 'Flat';
				$( '#infoBox' ).css( 'width', '550px' );
				equalizerButtonSet();
				$( '#infoRange input' ).on( 'click input keyup', function() {
					var $this = $( this );
					var i = $this.index( 'input' );
					var unit = i < 5 ? ' Hz' : ' kHz';
					var band = '0'+ i +'. '+ freq[ i ] + unit;
					bash( [ 'equalizerupdn', band, $this.val() ] );
					var vnew = infoVal().slice( 0, -2 ).join( '' );
					var changed = vnew !== vcurrent;
					var flat = vnew === vflat;
					$( '#eqsave' ).toggleClass( 'disabled', !changed || G.eqcurrent === 'Flat' );
					$( '#eqnew' ).toggleClass( 'disabled', !changed || flat )
					$( '#eqflat' ).toggleClass( 'disabled', flat )
				} );
				$( '#eqpreset' ).change( function() {
					equalizerPreset( $( this ).val() );
				} );
				$( '#eqname' ).on( 'keyup paste cut', function( e ) {
					var val = $( this ).val().trim();
					var exists = data.presets.indexOf( val ) !== -1;
					if ( eqnew ) {
						var changed = val !== '' && !exists;
					} else { // rename
						var changed = val !== G.eqcurrent && !exists;
					}
					if ( e.key === 'Enter' && changed ) $( '#eqsave' ).click();
					$( '#eqsave' ).toggleClass( 'disabled', !changed );
				} );
				$( '#eqdelete' ).click( function() {
					G.eqcurrent = 'Flat';
					bash( [ 'equalizer', 'delete', $( '#eqpreset' ).val() ] );
					$( '#eqcancel' ).click();
				} );
				$( '#eqrename' ).click( function() {
					eqrename = 1;
					$( '#eqrename, #eqdelete' ).toggleClass( 'hide' );
					$( '#eqname' ).val( G.eqcurrent );
					$( '#eqnew' ).click();
					eqnew = 0;
				} );
				$( '#eqsave' ).click( function() {
					var cmd = '';
					var eqname = $( '#eqname' ).val();
					if ( eqrename ) {
						bash( [ 'equalizer', 'rename', G.eqcurrent, eqname ] );
						G.eqcurrent = eqname;
					} else if ( eqnew ) {
						G.eqcurrent = eqname;
						bash( [ 'equalizer', 'new', eqname ] );
					} else {
						bash( [ 'equalizer', 'save', G.eqcurrent ] );
					}
					$( '#eqcancel' ).click();
				} );
				$( '#eqnew' ).click( function() {
					eqnew = 1;
					$( '#eqnew, #eq .selectric-wrapper' ).addClass( 'hide' );
					$( '#eqname, #eqcancel' ).removeClass( 'hide' );
					$( '#eqrename' ).addClass( 'disabled' );
					$( '#eqsave' ).addClass( 'disabled' );
				} );
				$( '#eqcancel' ).click( function() {
					$( '#eqrename, #eqnew, #eq .selectric-wrapper' ).removeClass( 'hide' );
					$( '#eqname, #eqcancel, #eqdelete' ).addClass( 'hide' );
					$( '#eqname' ).val( '' );
					equalizerButtonSet();
					$( '#eqsave' ).toggleClass( 'disabled', notpreset || infoVal().slice( 0, -2 ).join( '' ) === vcurrent )
					eqnew = eqrename = 0;
				} );
				$( '#eqflat' ).click( function() {
					equalizerPreset( 'Flat' );
				} );
			}
			, buttonnoreset : 1
			, okno          : 1
		} );
	}, 'json' );
}
function equalizerButtonSet() {
	var notpreset = G.eqcurrent === '(unnamed)' || G.eqcurrent === 'Flat';
	$( '#eqrename' ).toggleClass( 'disabled', notpreset );
	$( '#eqsave' ).addClass( 'disabled' );
	$( '#eqnew' ).toggleClass( 'disabled', G.eqcurrent !== '(unnamed)' || G.eqcurrent === 'Flat' );
	$( '#eqflat' ).toggleClass( 'disabled', G.eqcurrent === 'Flat' );
}
function equalizerPreset( name ) {
	G.eqcurrent = name;
	bash( [ 'equalizer', 'preset', name ] );
	$( '#eqsave, #eqnew' ).addClass( 'disabled' )
	$( '#eqrename, #eqflat' ).toggleClass( 'disabled', name === 'Flat' );
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
			+'&artist='+ encodeURI( artist.replace( '&', 'and' ) );
	$.post( url, function( data ) {
		if ( 'error' in data || ( !data.artist.bio.content ) ) {
			info( {
				  icon    : 'bio'
				, title   : 'Bio'
				, message : 'No data available.'
			} );
			loaderHide();
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
			loaderHide();
			
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
function getPlaybackStatus() {
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
		displayBars();
		if ( G.playback ) {
			setButtonControl();
			displayPlayback();
			renderPlayback();
		} else if ( G.library ) {
			if ( !$( '#lib-search-close' ).text() && !G.librarylist ) renderLibrary();
			if ( !G.librarylist && G.status.counts ) {
				$( '#li-count' ).html( G.status.counts.song.toLocaleString() +'<i class="fa fa-music gr"></i>' );
				$.each( G.status.counts, function( key, val ) {
					$( '#mode-'+ key ).find( 'gr' ).text( val ? val.toLocaleString() : '' );
				} );
			}
		} else if ( G.playlist && !G.savedlist && !G.savedplaylist ) {
			$( '#pl-list .elapsed' ).empty();
			$( '#pl-list .li1' ).find( '.name' ).css( 'max-width', '' );
			getPlaylist();
		}
		setButtonUpdating();
	} );
}
function getPlaylist() {
	if ( G.local ) return
			
	local( 1000 );
	list( { cmd: 'current' }, renderPlaylist, 'json' );
}
function hideGuide() {
	if ( G.guide ) {
		G.guide = 0;
		var barsvisible = $( '#bar-top' ).is( ':visible' );
		$( '#coverTR' ).toggleClass( 'empty', !G.status.playlistlength && !barsvisible );
		$( '.map' ).removeClass( 'mapshow' );
		$( '#bar-bottom' ).removeClass( 'translucent' );
		if ( !barsvisible ) $( '#bar-bottom' ).addClass( 'transparent' );
		$( '.band, #volbar' ).addClass( 'transparent' );
		$( '.guide, #volume-bar, #volume-text' ).addClass( 'hide' );
		$( '.coveredit' ).css( 'z-index', '' );
	}
}
function HMS2Second( HMS ) {
	var hhmmss = HMS.split( ':' ).reverse();
	if ( !hhmmss[ 1 ] ) return +hhmmss[ 0 ];
	if ( !hhmmss[ 2 ] ) return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60;
	return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60 + hhmmss[ 2 ] * 3600;
}
function imageReplace( imagefile, type, covername ) {
	var ext = G.infofile.name.split( '.' ).pop() === 'gif' ? 'gif' : 'jpg';;
	var data = {
		  cmd       : 'imagereplace'
		, type      : type
		, imagefile : imagefile +'.'+ ext
		, covername : covername || ''
	}
	if ( ext === 'gif' ) {
		data.file = G.infofile;
	} else {
		data.base64 = $( '.infoimgnew' )
						.attr( 'src' )
						.split( ',' )
						.pop();
	}
	$.post( cmdphp, data );
}
function imageLoad( list ) {
	var $lazyload = $( '#'+ list +' .lazyload' );
	if ( !$lazyload.length ) return
	
	if ( list === 'lib-list' ) {
		if ( G.mode === 'album' ) {
			$lazyload.off( 'error' ).on( 'error', function() {
				var $this = $( this );
				var src = $this.attr( 'src' );
				var src = src.slice( -3 ) === 'jpg' ? src.slice( 0, -3 ) + 'gif' : '/assets/img/coverart.svg';
				$this.attr( 'src', src );
			} );
		} else {
			var mode = G.mode === 'webradio' ? 'webradio' : 'folder';
			$lazyload.off( 'error' ).on( 'error', function() {
				$( this ).replaceWith( '<i class="fa fa-'+ mode +' lib-icon" data-target="#menu-'+ mode +'"></i>' );
			} );
		}
	} else {
		$lazyload.off( 'error' ).on( 'error', function() {
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
	  albumbyartist  : '<i class="fa fa-album wh"></i>Sort Album by artists'
	, backonleft     : '<i class="fa fa-arrow-left wh"></i>Back button on left side'
	, tapaddplay     : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-plus wh"></i><gr>Add + Play</gr>'
	, tapreplaceplay : 'Select track&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-replace wh"></i><gr>Replace + Play</gr>'
	, playbackswitch : 'Switch to Playback <gr>on <i class="fa fa-play-plus wh"></i>or <i class="fa fa-play-replace wh"></i>'
	, plclear        : 'Confirm <gr>on replace Playlist</gr>'
	, hidecover      : 'Hide coverart band <gr>in tracks view</gr>'
	, fixedcover     : 'Fix coverart band <gr>on large screen</gr>'
}
function infoLibrary( page2 ) {
	var page1 = !page2;
	var checkbox = Object.values( page1 ? chklibrary : chklibrary2 );
	var keys = Object.keys( page1 ? chklibrary : chklibrary2 );
	keys = keys.filter( function( k ) {
		return k[ 0 ] !== '-'
	} );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	info( {
		  icon         : 'library'
		, title        : page1 ? 'Library Home Display' : 'Library/Playlist Options'
		, message      : page1 ? '1/2 - Show selected items:' : '2/2 - Options:'
		, messagealign : 'left'
		, arrowright   : page1 ? function() { infoLibrary( 2 ) } : ''
		, arrowleft    : page1 ? '' : infoLibrary
		, checkbox     : checkbox
		, checkcolumn  : page1 ? 1 : ''
		, values       : values
		, checkchanged : 1
		, beforeshow   : function() {
			$( '#infoContent' ).css( 'height', '340px' );
			if ( page1 ) {
				$( '#infoContent tr' ).last().before( '<tr><td colspan="2"><hr></td></tr>' );
			} else {
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
						displayCheckboxSet( fixedcover, 0, 0 );
					} else {
						displayCheckboxSet( fixedcover, 1 );
					}
				} );
				$fixedcover.prop( 'disabled', G.display.hidecover );
			}
		}
		, ok           : function () {
			displaySave( keys );
		}
	} );
}
var chkplayback = {
	  bars         : 'Top-Bottom bars'
	, barsalways   : 'Bars always on'
	, time         : 'Time'
	, radioelapsed : 'WebRadio time'
	, cover        : 'Coverart'
	, vumeter      : 'VU meter'
	, volume       : 'Volume'
	, coversmall   : 'Small coverart'
	, buttons      : 'Buttons'
	, noswipe      : 'Disable swipe'
}
function infoPlayback() {
	if ( 'coverTL' in G ) $( '#coverTL' ).trigger( 'tap' );
	var keys = Object.keys( chkplayback );
	var values = [];
	keys.forEach( function( k, i ) {
		values.push( G.display[ k ] );
	} );
	keys.push( 'novu' );
	values.push( G.display.novu )
	info( {
		  icon         : 'playback'
		, title        : 'Playback Display'
		, message      : 'Show selected items:'
		, messagealign : 'left'
		, checkbox     : Object.values( chkplayback )
		, checkcolumn  : 1
		, radio        : {
			  '<i class="imgicon iconcover"></i>'              : true
			, '<img class="imgicon" src="/assets/img/vu.svg">' : false
		}
		, radiocolumn  : 1
		, order        : [ 'checkbox', 'radio' ]
		, values       : values
		, checkchanged : 1
		, beforeshow   : function() {
			$( '#infoContent tr:last' ).before( '<tr><td colspan="2" class="gr">Default if no coverart found:</td></tr>' );
			var $coverdefault = $( '#infoContent tr' ).slice( -2 );
			$coverdefault.toggleClass( 'hide', !G.display.cover || G.display.vumeter );
			var $chk = $( '#infoContent input' );
			keys.forEach( function( k, i ) {
				window[ '$'+ k ] = $chk.eq( i );
				window[ k ] = i;
			} );
			function toggleBars( t, c ) {
				if ( !t && !c ) {
					displayCheckboxSet( bars, 0, 1 );
					displayCheckboxSet( barsalways, 0, 1 );
				} else {
					displayCheckboxSet( bars, 1 );
					displayCheckboxSet( barsalways, 1, 0 );
				}
			}
			if ( !G.display.bars ) displayCheckboxSet( barsalways );
			if ( !G.display.cover ) displayCheckboxSet( vumeter );
			if ( G.display.volumenone ) displayCheckboxSet( volume, 0, 0 );
			if ( !G.display.time && !G.display.volume ) {
				displayCheckboxSet( cover );
				displayCheckboxSet( buttons );
			}
			if ( !G.display.time && !G.display.cover ) displayCheckboxSet( bars, 0, 1 );
			if ( G.status.player !== 'mpd' ) displayCheckboxSet( buttons );
			$time.add( $volume ).change( function() {
				var t = $time.prop( 'checked' );
				var c = $cover.prop( 'checked' );
				var v = $volume.prop( 'checked' );
				if ( t || v ) {
					displayCheckboxSet( cover, 1 );
					displayCheckboxSet( buttons, 1 );
				} else {
					displayCheckboxSet( cover, 0, 1 );
					displayCheckboxSet( buttons, 0, 0 );
				}
				if ( !t && ( !v || G.display.volumenone ) ) displayCheckboxSet( cover, 1, 1 );
				toggleBars( t, c );
			} );
			$bars.change( function() {
				if ( $( this ).prop( 'checked' ) ) {
					displayCheckboxSet( barsalways, 1 );
				} else {
					displayCheckboxSet( barsalways, 0, 0 );
				}
			} );
			$cover.change( function() {
				var t = $time.prop( 'checked' );
				var c = $cover.prop( 'checked' );
				var v = $volume.prop( 'checked' );
				if ( c ) {
					displayCheckboxSet( coversmall, 1 );
					displayCheckboxSet( vumeter, 1, 0 );
					$vumeter.prop( 'disabled', 0 );
					$coverdefault.toggleClass( 'hide', 0 );
				} else {
					displayCheckboxSet( coversmall, 0, 0 );
					displayCheckboxSet( vumeter, 0, 0 );
					if ( !t && ( !v || G.display.volumenone ) ) displayCheckboxSet( time, 1, 1 );
					$coverdefault.toggleClass( 'hide', true );
				}
				toggleBars( t, c );
			} );
			$vumeter.change( function() {
				var checked = $( this ).prop( 'checked' );
				$coverdefault.toggleClass( 'hide', checked );
				$( 'input[name=inforadio]' ).val( [ true ] )
			} );
		}
		, ok           : function () {
			displaySave( keys );
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
function loader() {
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	$( '#loader' ).addClass( 'hide' );
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
function lyricsShow( data ) {
	if ( data !== 'current' ) {
		G.lyrics = data;
		var lyricshtml = data ? data.replace( /\n/g, '<br>' ) +'<br><br><br>·&emsp;·&emsp;·' : '<gr>(Lyrics not available.)</gr>';
		$( '#divlyricstitle img' ).attr( 'src', $( '#coverart' ).attr( 'src' )  );
		$( '#lyricstitle' ).text( G.lyricsTitle );
		$( '#lyricsartist' ).text( G.lyricsArtist );
		$( '#lyricstext' ).html( lyricshtml );
	}
	if ( $( '#bar-top' ).is( ':visible' ) ) {
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
		G.lyrics = '';
		G.lyricsArtist = '';
		G.lyricsTitle = '';
		$( '#lyricstext' ).empty();
		$( '#lyricstextarea' ).val( '' );
	}
	$( '#lyricsedit, #lyricstext' ).removeClass( 'hide' );
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyrics' ).addClass( 'hide' );
	$( '#bar-bottom' ).removeClass( 'lyrics-bar-bottom' );
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
	if ( G.status.state === 'stop' && $( '#bar-top' ).is( ':visible' ) ) {
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#pause' ).addClass( 'active' );
		$( '#title' ).addClass( 'gr' );
	}
	bash( [ 'mpcseek', elapsed, G.status.state ] );
}
function mpcSeekBar( pageX ) {
	var $timeband = $( '#time-band' );
	var posX = pageX - $timeband.offset().left;
	var bandW = $timeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var pos = posX / bandW;
	var elapsed = Math.round( pos * G.status.Time );
	var elapsedhms = second2HMS( elapsed );
	if ( G.status.elapsed ) {
		$( '#progress span' ).html( elapsedhms );
	} else {
		$( '#progress' ).html( '<i class="fa fa-pause"></i><span>'+ elapsedhms +'</span> / '+ second2HMS( G.status.Time ) );
	}
	$( '#time-bar' ).css( 'width', ( pos * 100 ) +'%' );
	if ( !G.drag ) mpcSeek( elapsed );
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
				   +'<br><wh>'+ G.pladd.name +'</wh>'
				   +'<br>before'
				   +'<br><wh># '+ ( $this.index() + 1 ) +' - '+ $this.find( '.name' ).text() +'</wh>'
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
				   +'<br><wh>'+ G.list.name +'</wh>'
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
		var match = ( $this.text().search( regex ) !== -1 ) ? true : false;
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
		$( '#pl-search-close' ).html( '<i class="fa fa-times"></i><span>'+ count +' <gr>of</gr> </span>' );
	} else {
		$( '#pl-search-close' ).empty();
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
	$( '#lib-title, #lib-path>i, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path .lipath' ).empty()
	$( '#button-lib-back' ).toggleClass( 'back-left', G.display.backonleft );
	$( '#lib-breadcrumbs, #lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	$( '#page-library .content-top, #lib-list' ).addClass( 'hide' );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '.mode:not( .mode-bookmark )' ).each( function() {
		var name = this.id.replace( 'mode-', '' );
		$( this ).parent().toggleClass( 'hide', !G.display[ name ] );
	} );
	$( '.mode gr' ).toggleClass( 'hide', !G.display.count );
	if ( G.display.label ) {
		$( '#lib-mode-list a.label' ).show();
		$( '.mode' ).removeClass( 'nolabel' );
	} else {
		$( '#lib-mode-list a.label' ).hide();
		$( '.mode:not( .mode-bookmark )' ).addClass( 'nolabel' );
	}
	$( '#lib-list' ).empty().addClass( 'hide' );
	$( '#lib-mode-list' )
		.css( 'padding-top', $( '#bar-top' ).is( ':visible' ) ? '' : '50px' )
		.removeClass( 'hide' );
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
		$( '#lib-search-close' ).html( '<i class="fa fa-times"></i><span>' + data.count + ' <gr>of</gr></span>' );
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
	} else if ( data.path ) { // dir breadcrumbs
		var dir = data.path.split( '/' );
		var dir0 = dir[ 0 ];
		var htmlpath = '<i class="fa fa-'+ dir0.toLowerCase() +'"></i>';
		htmlpath += '<a>'+ dir0 +'<bll>/</bll><span class="lidir">'+ dir0 +'</span></a>';
		var lidir = dir0;
		var iL = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +'<bll>/</bll><span class="lidir">'+ lidir +'</span></a>';
		}
	}
	if ( htmlpath ) $( '#lib-breadcrumbs' )
						.html( htmlpath )
						.removeClass( 'hide' );
	$( '#lib-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		imageLoad( 'lib-list' );
		if ( data.modetitle ) $( '#mode-title' ).toggleClass( 'spaced', data.modetitle.toLowerCase() === G.mode );
		$( '.liinfopath' ).toggleClass( 'hide', G.mode === 'file' );
		if ( G.mode === 'album' && $( '#lib-list .coverart' ).length ) {
			G.albumlist = 1;
			$img0 = $( '#lib-list img[data-src$=".jpg"]:eq( 0 )');
			$( '#lib-breadcrumbs' ).append( '<span id="button-coverart"><img src="'+ $img0.data( 'src' ) +'"><i class="fa fa-refresh-l"></i></span>' );
			if ( G.iactive ) $( '#lib-list .coverart' ).eq( G.iactive ).addClass( 'active' );
			$( '#lib-list' ).removeClass( 'hide' );
		} else {
			G.albumlist = 0;
			$( '#lib-list p' )
				.toggleClass( 'fixedcover', G.display.fixedcover )
				.toggleClass( 'bars-on', $( '#bar-top' ).is( ':visible' ) );
			$( '#lib-list' ).removeClass( 'hide' );
			G.color ? colorSet() : setTrackCoverart();
		}
		if ( 'index' in data ) {
			$( '#lib-list' ).css( 'width', '' );
			$( '#lib-index' ).html( data.index[ 0 ] )
			$( '#lib-index1' ).html( data.index[ 1 ] )
			$( '#lib-index, #lib-index1' ).removeClass( 'hide' );
		} else {
			$( '#lib-list' ).css( 'width', '100%' );
			$( '#lib-index, #lib-index1' ).addClass( 'hide' );
		}
		var pH = window.innerHeight - 80;
		pH -= G.albumlist ? $( '.coverart' ).height() : 49;
		if ( $( '#bar-top' ).is( ':hidden' ) ) pH += 40;
		$( '#lib-list p' )
			.removeClass( 'bars-on' )
			.toggleClass( 'fixedcover', G.display.fixedcover && $( '.licover' ).length === 1 )
			.css( 'height', pH +'px' );
		$( 'html, body' ).scrollTop( G.scrolltop[ data.path ] || 0 );
	} );
}
function renderPlayback() {
	local();
	$volumeRS.setValue( G.status.volume );
	G.status.volumemute != 0 ? volColorMute( G.status.volumemute ) : volColorUnmute();
	$( '#volume-bar' ).css( 'width', G.status.volume +'%' );
	if ( !G.status.playlistlength && G.status.player === 'mpd' && G.status.state === 'stop' ) { // empty queue
		setPlaybackBlank();
		return
	}
	
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#coverart' ).css( 'opacity', '' );
	$( '#divcover .coveredit.cover' ).remove();
	$( '#coverTR' ).removeClass( 'empty' );
	$( '#qrwebui, #qrip' ).empty();
	setInfo();
	setCoverart();
	var istate = '<i class="fa fa-'+ G.status.state +'"></i>';
	if ( G.status.stream ) {
		setProgress( 0 );
		$( '#elapsed, #total, #progress' ).empty();
		if ( G.status.state === 'play' ) {
			$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
			if ( G.display.radioelapsed ) {
				$( '#progress' ).html( istate +'<span></span>' );
				setProgressElapsed();
			}
		}
		return
	}
	
	var time = 'Time' in G.status ? G.status.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	$timeRS.option( 'max', time || 100 );
	if ( G.status.state === 'stop' ) {
		setProgress( 0 );
		$( '#title' ).removeClass( 'gr' );
		$( '#elapsed' )
			.text( timehms )
			.addClass( 'gr' );
		$( '#total' ).empty();
		$( '#progress' ).html( istate +'<span></span>'+ timehms );
		return
	}
	
	$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
	if ( !( 'elapsed' in G.status ) || G.status.elapsed > time ) {
		$( '#elapsed' ).html( G.status.state === 'play' ? blinkdot : '' );
		return
	}
	
	if ( G.status.elapsed ) {
		var elapsedhms = second2HMS( G.status.elapsed );
		$( '#progress' ).html( istate +'<span>'+ elapsedhms +'</span> / '+ timehms );
	} else {
		$( '#progress' ).html( istate +'<span></span>'+ timehms );
		setTimeout( function() {
			$( '#progress span' ).after( ' / ' );
		}, 1000 );
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
	G.savedlist = 0;
	G.status.playlistlength = data.playlistlength;
	$( '#pl-search-close' ).click();
	$( '#button-pl-back, #pl-savedlist, #pl-index' ).addClass( 'hide' );
	$( '#button-pl-open' ).toggleClass( 'disable', G.status.playlists === 0 );
	if ( data == -1 ) {
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-path' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disable' );
		$( '#pl-search-close' ).click();
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
		imageLoad( 'pl-list' );
		setPlaylistScroll();
		$( '.list p' ).toggleClass( 'bars-on', $( '#bar-top' ).is( ':visible' ) );
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
			$( '.list p' ).toggleClass( 'bars-on', $( '#bar-top' ).is( ':visible' ) );
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
			imageLoad( 'pl-savedlist' );
			$( '.list p' ).toggleClass( 'bars-on', $( '#bar-top' ).is( ':visible' ) );
			$( '#pl-savedlist' ).css( 'width', '100%' );
			$( '#pl-index, #pl-index1' ).addClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
		} );
	}, 'json' );
}
function second2HMS( second ) {
	if ( !second || second < 1 ) return 0
	
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
function setButtonControl() {
	if ( $( '#bar-top' ).is( ':visible' ) ) {
		var mpd_upnp = [ 'mpd', 'upnp' ].indexOf( G.status.player ) !== -1;
		var noprevnext = G.status.playlistlength < 2 || !mpd_upnp;
		$( '#playback-controls' ).toggleClass( 'hide', G.status.playlistlength === 0 && mpd_upnp );
		$( '#previous, #next' ).toggleClass( 'hide', noprevnext );
		$( '#coverL, #coverR' ).toggleClass( 'disabled', noprevnext );
		$( '#play, #pause' ).toggleClass( 'disabled', G.status.player !== 'mpd' );
		$( '#pause' ).toggleClass( 'hide', G.status.stream || G.status.player === 'airplay' );
		$( '#playback-controls i' ).removeClass( 'active' );
		$( '#'+ G.status.state ).addClass( 'active' );
	}
	if ( G.playback ) setTimeout( setButtonOptions, 0 );
}
function setButtonOptions() {
	$( '#relays' ).toggleClass( 'on', G.status.relayson );
	$( '#snapclient' ).toggleClass( 'on', G.status.player === 'snapclient' );
	$( '#modeicon i, #timeicon i' ).addClass( 'hide' );
	var timevisible = $( '#time-knob' ).is( ':visible' );
	var prefix = timevisible ? 'ti' : 'i';
	$( '#'+ prefix +'-btclient' ).toggleClass( 'hide', !G.status.btclient );
	$( '#'+ prefix +'-relays' ).toggleClass( 'hide', !G.status.relayson );
	if ( G.status.player !== 'mpd' ) return
	
	if ( !G.status.stream ) {
		if ( $( '#play-group' ).is( ':visible' ) ) {
			$( '#random' ).toggleClass( 'active', G.status.random );
			$( '#repeat' ).toggleClass( 'active', G.status.repeat );
			$( '#single' ).toggleClass( 'active', G.status.single );
		} else {
			$( '#'+ prefix +'-random' ).toggleClass( 'hide', !G.status.random );
			$( '#'+ prefix +'-repeat' ).toggleClass( 'hide', !G.status.repeat || G.status.single );
			$( '#'+ prefix +'-repeat1' ).toggleClass( 'hide', !( G.status.repeat && G.status.single ) );
			$( '#'+ prefix +'-single' ).toggleClass( 'hide', !G.status.single || ( G.status.repeat && G.status.single ) );
		}
		[ 'consume', 'librandom' ].forEach( function( option ) {
			if ( timevisible ) {
				$( '#i-'+ option ).addClass( 'hide' );
				$( '#ti-'+ option ).toggleClass( 'hide', !G.status[ option ] );
			} else {
				$( '#ti-'+ option ).addClass( 'hide' );
				$( '#i-'+ option ).toggleClass( 'hide', !G.status[ option ] );
			}
			$( '#button-pl-'+ option ).toggleClass( 'bl', G.status[ option ] );
		} );
	}
	setButtonUpdateAddons();
	setButtonUpdating();
	if ( $( '#volume-knob' ).is( ':hidden' ) && G.status.volumemute ) $( '#'+ prefix +'-mute' ).removeClass( 'hide' );
	$( '#time, #play-group .btn, #coverBL, #coverBR' ).toggleClass( 'disabled', G.status.stream || G.status.player !== 'mpd' );
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
		if ( $( '#bar-bottom' ).is( ':visible' ) ) {
			if ( !G.localhost ) {
				$( '#library, #button-library' ).addClass( 'blink' );
			} else {
				$( '#library, #button-library' )
					.removeClass( 'fa-library' )
					.addClass( 'fa-refresh-library' );
			}
		} else {
			$( '#i-update, #ti-update' ).removeClass( 'blink' );
			var prefix = $( '#time-knob' ).is( ':visible' ) ? 'ti' : 'i';
			$( '#'+ prefix +'-update' ).removeClass( 'hide' )
		}
	} else {
		$( '#library, #button-library, .lib-icon.blink' ).removeClass( 'blink' );
		$( '#i-update, #ti-update' ).addClass( 'hide' );
		if ( G.localhost ) $( '#library, #button-library' )
							.removeClass( 'fa-refresh-library' )
							.addClass( 'fa-library' );
	}
}
function setCoverart() {
	if ( !G.display.cover ) {
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
	G.prevtitle = $( '#title' ).text();
	G.prevalbum = $( '#album' ).text();
	if ( !G.status.stream ) {
		$( '#artist' ).text( G.status.Artist );
		$( '#title' )
			.text( G.status.Title )
			.toggleClass( 'gr', G.status.state === 'pause' );
		$( '#album' ).text( G.status.Album || G.status.file );
	} else { // webradio
		if ( G.status.state !== 'play' ) {
			$( '#artist' ).text( G.status.station );
			$( '#title' ).html( '·&ensp;·&ensp;·' );
			$( '#album' ).text( G.status.file );
		} else {
			$( '#artist' ).text( G.status.Artist || ( !G.status.Artist && !G.status.Title ? G.status.station : '' ) );
			$( '#title' ).html( G.status.Title || blinkdot );
			$( '#album' ).text( G.status.Album || G.status.file );
		}
	}
	$( '#artist' ).toggleClass( 'disabled', G.status.Artist === '' );
	$( '#title' ).toggleClass( 'disabled', G.status.Title === '' );
	$( '#album' ).toggleClass( 'disabled', G.status.Album === '' );
	setInfoScroll();
	var sampling = G.status.sampling;
	if ( G.status.stream ) sampling += ' &bull; '+ ( G.status.Album && G.status.station ? G.status.station : G.status.ext );
	$( '#sampling' ).html( sampling );
	if ( G.status.icon !== $( '#playericon' ).prop( 'class' ).replace( 'fa fa-', '' ) ) {
		$( '#playericon' ).removeAttr( 'class' );
		if ( G.status.icon ) $( '#playericon' ).addClass( 'fa fa-'+ G.status.icon );
	}
	if ( $( '#time-knob' ).is( ':hidden' ) ) setProgressElapsed();
}
function setInfoScroll() {
	var wW = document.body.clientWidth;
	if ( wW === G.wW
		&& $( '#artist' ).text() === G.prevartist
		&& $( '#title' ).text() === G.prevtitle
		&& $( '#album' ).text() === G.prevalbum
	) return // suppress multiple fires, skip if same width and same data
	
	G.wW = wW;
	var tWmax = 0;
	var $el = $( '#artist, #title, #album' );
	$el
		.removeClass( 'scrollleft scrollellipse' )
		.removeAttr( 'style' );
	$el.each( function() {
		var tW = Math.ceil( this.getBoundingClientRect().width );
		if ( tW > G.wW - 20 ) {
			if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
			$( this ).addClass( 'scrollleft' );
		}
	} );
	if ( !tWmax ) return
	
	$( '.scrollleft' ).css( { // same width and speed
		  width     : tWmax +'px'
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
			, pad : 10
		} );
		$( '#qrwebui' ).html( qr );
		$( '.qr' ).removeClass( 'hide' );
		$( '#coverTR' ).toggleClass( 'empty', $( '#bar-top' ).is( ':hidden' ) );
		$( '#coverart' ).addClass( 'hide' );
		$( '#sampling' ).empty();
	} else {
		$( '#coverart' ).removeClass( 'hide' );
		$( '#page-playback .emptyadd' ).empty();
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
	var $title = $liactive.find( '.name' );
	var titleW = $title.scrollWidth;
	var iWdW = 40 + 10 + $duration.width() + 9;
	var wW = document.body.clientWidth;
	$title.css(  'max-width', iWdW + titleW < wW ? '' : wW - iWdW +'px' );
}
function setPlaylistScroll() {
	clearIntervalAll();
	if ( !G.playlist
		|| !G.status.playlistlength
		|| G.plremove
		|| G.sortable
		|| [ 'mpd', 'upnp' ].indexOf( G.status.player ) === -1
		|| !$( '#pl-savedlist' ).hasClass( 'hide' )
		|| $( '#pl-list li' ).length < G.status.song + 1 // on eject cd G.status.song not yet refreshed
	) return
	
	var litop = $( '#bar-top' ).is( ':visible' ) ? 80 : 40;
	if ( !G.status.elapsed ) $( '#pl-list li .elapsed' ).empty();
	$( '#menu-plaction' ).addClass( 'hide' );
	var prevscrolltop = $( '#pl-list li.active' ).length ? $( '#pl-list li.active' ).offset().top : litop;
	$( '#pl-list li' ).removeClass( 'active updn' );
	$liactive = $( '#pl-list li' ).eq( G.status.song || 0 );
	$liactive.addClass( 'active' );
	var scrolltop = $liactive.offset().top;
	if ( scrolltop !== prevscrolltop ) {
		if ( G.status.playlistlength < 5 || !$( '#infoOverlay' ).hasClass( 'hide' ) ) {
			$( 'html, body' ).scrollTop( 0 );
		} else {
			$( 'html, body' ).scrollTop( scrolltop - litop - ( 49 * 3 ) );
		}
	}
	var $this = $( '#pl-list li' ).eq( G.status.song );
	var $elapsed = $this.find( '.elapsed' );
	var $name = $this.find( '.name' );
	var $stationname = $this.find( '.li2 .stationname' );
	$stationname.addClass( 'hide' );
	if ( G.status.state === 'stop' ) {
		if ( G.status.webradio ) $name.text( $this.find( '.liname' ).text() );
		$stationname.addClass( 'hide' );
	} else {
		var time = $this.find( '.time' ).data( 'time' );
		var slash = time ? ' <gr>/</gr>' : '';
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
			var elapsedL = 0;
			if ( G.status.elapsed ) $elapsed.html( '<i class="fa fa-play"></i>'+ second2HMS( G.status.elapsed ) + slash );
			G.intElapsedPl = setInterval( function() {
				G.status.elapsed++;
				if ( G.status.elapsed === time ) {
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
	if ( G.status.state !== 'play' || G.status.stream ) clearInterval( G.intElapsed );
	if ( position !== 0 ) position = G.status.elapsed;
	$timeprogress.css( 'transition-duration', '0s' );
	$timeRS.setValue( position );
	var w = position && G.status.Time ? position / G.status.Time * 100 : 0;
	$( '#time-bar' ).css( 'width', w +'%' );
}
function setProgressAnimate() {
	if ( !G.display.time && !G.display.cover ) return
	
	$timeprogress.css( 'transition-duration', G.status.Time - G.status.elapsed +'s' );
	$timeRS.setValue( G.status.Time );
	$( '#time-bar' ).css( 'width', '100%' );
}
function setProgressElapsed() {
	if ( G.status.elapsed === false || G.status.state !== 'play' || 'autoplaycd' in G ) return // wait for cd cache on start
	
	clearInterval( G.intElapsed );
	var elapsedhms;
	var $elapsed = G.status.stream ? $( '#total, #progress span' ) : $( '#elapsed, #progress span' );
	if ( G.status.elapsed ) $elapsed.text( second2HMS( G.status.elapsed ) );
	if ( G.status.Time ) {
		var time = G.status.Time;
		$timeRS.option( 'max', time );
		setProgress();
		if ( !G.localhost ) {
			setTimeout( setProgressAnimate, 0 ); // delay to after setvalue on load
		} else {
			$timeprogress.css( 'transition-duration', '0s' );
		}
		G.intElapsed = setInterval( function() {
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
		G.intElapsed = setInterval( function() {
			G.status.elapsed++;
			elapsedhms = second2HMS( G.status.elapsed );
			$elapsed.text( elapsedhms );
			if ( G.status.state !== 'play' ) clearInterval( G.intElapsed );
		}, 1000 );
	}
}
function setTrackCoverart() {
	if ( G.display.hidecover || !$( '#liimg' ).length ) return
	
	$( '#liimg' ).off( 'load' ).on( 'load', function() { // not exist on initial page load
		$( 'html, body' ).scrollTop( 0 );
		if ( $( '#liimg' ).attr( 'src' ).slice( 0, 9 ) === '/data/shm' ) $( '#liimg' ).after( icoversave );
	} ).off( 'error' ).on( 'error', function() {
		$( this ).attr( 'src', G.coverdefault );
	} );
	if ( G.mode === 'album' ) {
		$( '#mode-title' ).html( $( '.liinfo .lialbum' ).text() );
		$( '.liinfo .lialbum' ).addClass( 'hide' );
	} else {
		$( '.liinfo .lialbum' ).removeClass( 'hide' );
	}
	if ( !G.display.fixedcover ) {
		$( '.licover' ).addClass( 'nofixed' );
		$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
	}
}
function statusRefresh() {
	bash( [ 'displayget' ], data => {
		delete G.coverTL;
		G.display = data;
		G.display.screenoff = G.localhost;
		G.coverdefault = G.display.novu && !G.display.vumeter ? G.coverart : G.covervu;
		var submenu = {
			  relays     : 'features'
			, equalizer  : 'player'
			, snapclient : 'networks'
			, lock       : 'system'
			, screenoff  : 'power'
		};
		var subkeys = Object.keys( submenu );
		subkeys.forEach( sub => {
			if ( G.display[ sub ] && !$( '#'+ sub ).length ) {
				$( '#'+ submenu[ sub ] )
					.addClass( 'sub' )
					.after( '<i id="'+ sub +'" class="fa fa-'+ sub +' submenu"></i>' );
			}
		} );
	}, 'json' );
	getPlaybackStatus();
	bannerHide();
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
		if ( G.color ) $( '#colorcancel' ).click();
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) G.plscrolltop = $( window ).scrollTop();
	}
	$( '.page, .menu' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
	G.library = G.playback = G.playlist = G.plremove = 0;
	G[ page ] = 1;
	G.page = page;
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
	if ( $( '#volume-knob' ).is( ':hidden' ) ) {
		var prefix = $( '#time-knob' ).is( ':visible' ) ? 'ti' : 'i';
		$( '#'+ prefix +'-mute' ).removeClass( 'hide' );
	}
}
function volColorUnmute() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr60' );
	$( '#volmute' )
		.removeClass( 'fa-mute active' )
		.addClass( 'fa-volume' );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
}
function volumeBarHide() {
	$( '#info' ).removeClass( 'hide' ); // 320 x 480
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.volumeband' ).addClass( 'transparent' );
}
function volumeBarSet( pageX ) {
	clearTimeout( G.volumebar );
	var posX = pageX - $( '#volume-band' ).offset().left;
	var bandW = $( '#volume-band' ).width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var vol = Math.round( posX / bandW * 100 );
	if ( G.drag ) {
		$( '#volume-bar' ).css( 'width', vol +'%' );
		volumeDrag( vol );
	} else {
		var ms = Math.ceil( Math.abs( vol - G.status.volume ) / 5 ) * 0.2 * 1000;
		$( '#volume-bar' ).animate(
			  { width: vol +'%' }
			, {
				  duration: ms
				, easing: 'linear'
				, complete: volumeBarTimeout
			}
		);
		$( '.volumeband' ).addClass( 'disabled' );
		bash( [ 'volume', G.status.volume, vol, G.status.control ], function() {
			$( '.volumeband' ).removeClass( 'disabled' );
		} );
	}
	$( '#volume-text' ).text( G.status.volumemute || vol );
	$( '#i-mute, #ti-mute' ).addClass( 'hide' );
	G.status.volume = vol;
}
function volumeBarTimeout() {
	G.volumebar = setTimeout( volumeBarHide, 3000 );
}
function volumeDrag( vol ) {
	if ( G.status.control ) {
		bash( 'amixer -Mq sset "'+ G.status.control +'" '+ vol +'%' );
	} else {
		bash( 'mpc volume '+ vol );
	}
}
function volumePushstream() {
	bash( [ 'volumepushstream' ] );
}
function vu() {
	if ( G.status.state !== 'play' || G.display.vumeter || $( '#vu' ).is( ':hidden' ) ) {
		clearInterval( G.intVu );
		$( '#vuneedle' ).css( 'transform', '' );
		return
	}
	
	setTimeout( function() {
		var range = 8; // -/+
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
			$( '#vuneedle' ).css( 'transform', 'rotate( '+ ( deg + 31 ) +'deg )' );
		}, 300 );
	}, 300 );
}
