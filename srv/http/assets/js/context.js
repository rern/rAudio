var CONTEXT  = {
	  bookmark      : () => {
		// #1 - track list - show image from licover
		// #2 - dir list   - show image from path + coverart.jpg
		// #3 - no cover   - icon + directory name
		var path = V.list.path;
		if ( [ 'http', 'rtsp' ].includes( path.slice( 0, 4 ) ) ) {
			var $img = $LI.find( '.iconthumb' );
			var src = $img.length ? $img.attr( 'src' ).replace( /-thumb.jpg\?v=.*$/, '.jpg' ) : '';
			var name    = V.list.name;
			var msgpath = name;
		} else {
			if ( MODE.radio() ) {
				var name    = V.list.name;
				var path    = $( '#lib-path' ).text() +'/'+ name;
				var src     = path.slice( 9 ) +'/coverart.jpg';
				var msgpath = path.slice( 24 );
			} else {
				if ( path.slice( -4 ) === '.cue' ) path = UTIL.dirName( path );
				var src     = '/mnt/MPD/'+ path +'/cover.jpg';
				var msgpath = path;
				var name    = path.split( '/' ).pop();
			}
		}
		INFO( {
			  icon       : 'bookmark'
			, title      : 'Add Bookmark'
			, message    : '<img src="'+ src + UTIL.versionHash() +'">'
						  +'<br><wh>'+ msgpath +'</wh>'
			, list       : [ 'As:', 'text' ]
			, values     : name
			, checkblank : true
			, beforeshow : () => $( '#infoList input' ).parents( 'tr' ).addClass( 'hide' )
			, ok         : () => {
				var name = _INFO.val();
				BANNER( 'bookmark', 'Bookmark', 'Add ...' );
				BASH( [ 'bookmarkadd', name, path, 'CMD NAME DIR' ], std => {
					if ( std == -1 ) {
						BANNER_HIDE();
						INFO( {
							  icon    : 'bookmark'
							, title   : 'Add Bookmark'
							, message : 'Bookmark <wh>'+ name +'</wh> already exists.'
						} );
					}
				} );
			}
		} );
	}
	, crop          : () => {
		var $img = $LI.find( 'img' );
		var src  = $img.length ? $img.attr( 'src' ).replace( /-thumb.jpg\?v=.*$/, '.jpg' ) : '';
		INFO( {
			  icon    : 'crop'
			, title   : 'Crop Playlist'
			, message : '<img src="'+ src + UTIL.versionHash() +'">'
						+'<br><wh>'+ $LI.find( '.name' ).text() +'</wh>'
						+'<br><br>Remove all other tracks?'
			, oklabel : ICON( 'crop' ) +'Crop'
			, ok      : () => {
				delete V.html.playlist;
				if ( $LI.hasClass( 'active' ) ) {
					BASH( [ 'mpccrop' ] );
				} else {
					BASH( [ 'mpccrop', $LI.index() + 1, 'CMD POS' ] );
					$LI.addClass( 'active' );
				}
				$( '#pl-list li' ).not( $LI ).remove();
			}
		} );
	}
	, current       : () => {
		S.song = V.list.index;
		PLAYLIST.render.scroll();
		LOCAL();
		BASH( [ 'mpcskip', V.list.index + 1, 'stop', 'CMD POS ACTION' ] );
	}
	, directory     : () => {
		var path      = V.list.path;
		var modetitle = path;
		var mode      = path.split( '/' )[ 0 ].toLowerCase();
		var query     = {
			  library : 'ls'
			, string  : path
			, gmode   : mode
		}
		LIST( query, function( html ) {
			var data = {
				  html      : html
				, modetitle : modetitle
				, path      : path
			}
			V.html.librarylist = '';
			var mode0          = V.mode;
			V.mode             = mode;
			LIBRARY.list( data );
			setTimeout( () => V.mode = mode0, 300 );
		} );
	}
	, exclude       : () => {
		INFO( {
			  icon    : 'folder-forbid'
			, title   : 'Exclude Directory'
			, message : 'Exclude from Library:'
						+'<br>'+ ICON( 'folder' ) +'&ensp;<wh>'+ V.list.path +'</wh>'
			, ok      : () => {
				BASH( [ 'mpdignore', V.list.path, 'CMD DIR' ], () => $LI.remove() );
				var dir = V.list.path.split( '/' ).pop();
			}
		} );
	}
	, plrename      : () => {
		var name = V.list.name;
		INFO( {
			  icon         : 'playlists'
			, title        : 'Rename Playlist'
			, message      : 'From: <wh>'+ name +'</wh>'
			, list         : [ 'To', 'text' ]
			, values       : name
			, checkchanged : true
			, checkblank   : true
			, oklabel      : ICON( 'flash' ) +'Rename'
			, ok           : () => PLAYLIST.playlists.save( _INFO.val(), name )
		} );
	}
	, pldelete      : () => {
		INFO( {
			  icon    : 'playlists'
			, title   : 'Delete Playlist'
			, message : 'Delete?'
					   +'<br><wh>'+ V.list.name +'</wh>'
			, oklabel : ICON( 'remove' ) +'Delete'
			, okcolor : V.red
			, ok      : () => {
				BASH( [ 'savedpldelete', V.list.name, 'CMD NAME' ] );
				$LI.remove();
			}
		} );
	}
	, remove        : () => {
		V.contextmenu = true;
		setTimeout( () => V.contextmenu = false, 500 );
		PLAYLIST.remove( $LI );
	}
	, removerange   : () => PLAYLIST.removeRange( [ $LI.index() + 1, S.pllength ] )
	, savedpladd    : () => {
		if ( V.playlist ) {
			var album = $LI.find( '.album' ).text();
			var file  = V.list.path;
		} else {
			var album = $( '.licover .lialbum' ).text();
			var file  = $LI.find( '.lipath' ).text();
		}
		
		var $img     = V.library && V.librarytrack ? $( '#liimg' ) : $LI.find( 'img' );
		var message  = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : '';
		if ( file.slice( 0, 4 ) === 'http' ) { // webradio
			message += '<div>'+ ICON( 'webradio' ) +' <wh>'+ V.list.name +'</wh>'
					  +'<br>'+ ICON( 'file' ) +' '+ file +'</div>';
		} else {
			message += '<div>'+ ICON( 'folder' ) +' '+ UTIL.dirName( file )
					  +'<br>'+ ICON( 'file' ) +' '+ file.split( '/' ).pop() +'</div>';
		}
		V.pladd      = {
			  icon    : 'playlists'
			, title   : 'Add to a playlist'
			, album   : album
			, path    : file
			, width   : 500
			, message : message
		}
		INFO( {
			  ...V.pladd
			, beforeshow : () => {
				$( '.infofooter' ).css( { width: '100%', 'padding-top': 0 } );
				PLAYLIST.insert.set();
			}
			, oklabel    : ICON( 'cursor' ) +'Target'
			, ok         : () => {
				if ( ! V.playlist ) PLAYLIST.get();
				setTimeout( () => $( '#button-pl-playlists' ).trigger( 'click' ), 100 );
				BANNER( 'cursor blink', V.pladd.title, 'Choose target playlist', -1 );
				$( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).addClass( 'disabled' );
			}
		} );
	}
	, savedplremove : () => {
		LOCAL();
		var plname = $( '#pl-title .lipath' ).text();
		BASH( [ 'savedpledit', plname, 'remove', $LI.index() + 1, 'CMD NAME ACTION POS' ] );
		$LI.remove();
	}
	, similar       : () => {
		if ( D.plsimilar ) {
			INFO( {
				  icon    : 'lastfm'
				, title   : 'Add Similar'
				, message : 'Search and add similar tracks from Library?'
				, ok      : PLAYLIST.addSimilar
			} );
		} else {
			PLAYLIST.addSimilar();
		}
	}
	, tag           : () => {
		var name   = [ 'Album', 'AlbumArtist', 'Artist', 'Composer', 'Conductor', 'Genre', 'Date', 'Title', 'Track' ];
		var format = name.map( el => el.toLowerCase() );
		var file   = V.list.path;
		var dir    = V.list.licover ? file : UTIL.dirName( file );
		var cue    = file.slice( -4 ) === '.cue';
		if ( V.list.licover ) format = format.slice( 0, -2 );
		var query = {
			  library : 'track'
			, file    : file
			, format  : format
		}
		LIST( query, function( values ) {
			name[ 1 ]    = 'Album Artist';
			var listinfo = [];
			format.forEach( ( el, i ) => {
				listinfo.push( [ '<span class="taglabel gr hide">'+ name[ i ] +'</span> <i class="i-'+ el +'"></i>', 'text' ] );
			} );
			if ( V.library ) {
				var $img = V.librarytrack ? $( '.licoverimg img' ) : $LI.find( 'img' );
				var src  = $img.length ? $img.attr( 'src' ) : V.coverdefault;
			} else {
				var $img =  $LI.find( 'img' );
				var src  = $img.length ? $img.attr( 'src' ).replace( '/thumb.', '/coverart.' ) : V.coverdefault;
			}
			var fileicon = cue ? 'file-music' : 'playlists';
			var message  = '<img src="'+ src +'"><a class="tagpath hide">'+ file +'</a>'
						  +'<div>'+ ICON( 'folder' ) +' <a class="path">'+ dir +'</a>';
			message += V.list.licover ? '</div>' : '<br>'+ ICON( fileicon ) +' '+ file.split( '/' ).pop() +'</div>';
			var footer   = '<span>'+ ICON( 'help', '', 'tabindex' ) +'Label</span>';
			if ( V.list.licover ) footer += '<gr style="float: right"><c>*</c> Various values in tracks</gr>';
			INFO( {
				  icon         : V.playlist ? 'info' : 'tag'
				, title        : V.playlist ? 'Track Info' : 'Tag Editor'
				, message      : message
				, messagealign : 'left'
				, list         : listinfo
				, footer       : footer
				, footeralign  : 'left'
				, boxwidth     : 'max'
				, values       : values
				, checkchanged : true
				, beforeshow   : () => {
					$( '#infoList .infomessage' ).addClass( 'tagmessage' );
					$( '#infoList .infofooter' ).addClass( 'tagfooter' );
					$( '#infoList td i:not( .i-track, .i-title )' ).css( 'cursor', 'pointer' );
					if ( V.playlist ) $( '#infoList input' ).prop( 'disabled', 1 );
					var inputW = parseInt( $( '#infoList input' ).css( 'width' ) );
					$( '.infofooter span' ).on( 'click', function( e ) {
						if ( $( '.taglabel' ).hasClass( 'hide' ) ) {
							$( '#infoList input' ).css( 'width', ( inputW - 92 ) +'px' );
							$( '.taglabel' ).removeClass( 'hide' );
						} else {
							$( '#infoList input' ).css( 'width', inputW +'px' );
							$( '.taglabel' ).addClass( 'hide' );
						}
					} );
					$( '#infoList' ).on( 'click', '.infomessage, table i', function() {
						var $this  = $( this );
						if ( $this.hasClass( 'i-album' ) ) $this = $( '.infomessage' );
						if ( $this.is( 'i' ) ) {
							var mode   = $this.prop( 'class' ).replace( 'i-', '' );
							if ( [ 'track', 'title' ].includes( mode ) ) return
							
							var string = $this.parent().next().find( 'input' ).val();
							if ( ! string ) return
							
							var query  = {
								  library : 'findmode'
								, mode    : mode
								, string  : string
								, format  : [ 'album', 'artist' ]
							}
						} else {
							var string = $this.find( '.path' ).text();
							var mode   = string.split( '/' )[ 0 ].toLowerCase();
							var query  = {
								  library : 'ls'
								, string  : string
								, gmode   : mode
							}
						}
						LIST( query, function( html ) {
							var data = {
								  html      : html
								, modetitle : string
								, path      : string
							}
							V.mode = mode;
							LIBRARY.list( data );
							if ( V.playlist ) {
								UTIL.switchPage( 'library' );
								V.query.push( 'trackinfo' );
							} else {
								V.query.push( 'tageditor' );
							}
							$( '#infoX' ).trigger( 'click' );
						} );
					} );
				}
				, okno         : V.playlist
				, ok           : V.playlist ? '' : () => {
					var val  = _INFO.val();
					$.each( val, ( k, v ) => {
						if ( values[ k ] === v ) delete val[ k ];
					} );
					val.FILE = file;
					BANNER( 'tag blink', 'Tag Editor', 'Change ...', -1 );
					BASH( COMMON.cmd_json2args( 'tageditor.sh', val ) );
				}
			} );
		}, 'json' );
	}
	, thumbnail     : () => {
		if ( V.playback ) { // radio only
			var coverart  = $( '#coverart' ).attr( 'src' );
			var mode      = S.icon === 'dabradio' ? 'dabradio' : 'webradio';
			var name      = S.station;
			var dir       = '';
		} else {
			var $liicon   = $LI.find( '.li-icon' );
			var coverart  = $liicon.is( 'img' ) ? $liicon.attr( 'src' ).replace( '-thumb', '' ) : V.coverdefault;
			var mode      = V.mode;
			var name      = V.list.name;
			var dir       = $LI.hasClass( 'dir' );
		}
		if ( dir ) {
			mode               = 'folder';
			var path           = MODE.radio() ? $( '#lib-path' ).text() : '/mnt/MPD';
			path              += '/'+ V.list.path;
			var imagefilenoext = path + '/coverart';
		} else { // radio only
			var path           = V.playback ? S.file : V.list.path;
			var imagefilenoext = '/srv/http/data/'+ V.mode +'/img/'+ path.replace( /\//g, '|' );
		}
		INFO( {
			  icon        : V.icoverart
			, title       : dir ? 'Folder Thumbnail' : 'Station Art'
			, message     : '<img class="imgold" src="'+ coverart +'" >'
						   +'<p class="infoimgname">'+ name +'</p>'
			, file        : { oklabel: ICON( 'flash' ) +'Replace', type: 'image/*' }
			, beforeshow  : () => {
				$( '.extrabtn' ).toggleClass( 'hide', coverart.replace( /\?v=.*/, '' ) === V.coverdefault );
			}
			, buttonlabel : V.library ? ICON( mode ) +' Icon' : ICON( 'remove' ) +' Remove'
			, buttoncolor : V.orange
			, button      : () => {
				if ( dir ) {
					BASH( [ 'cmd-coverart.sh', 'reset', 'folderthumb', path, 'CMD TYPE DIR' ] );
				} else {
					BASH( [ 'cmd-coverart.sh', 'reset', 'stationart', imagefilenoext, V.playback, 'CMD TYPE FILENOEXT CURRENT' ] );
				}
			}
			, ok          : () => UTIL.imageReplace( mode, imagefilenoext )
		} );
	}
	, thumbupdate   : modealbum => {
		if ( modealbum ) {
			var src  = $( '#mode-title img' ).attr( 'src' );
			var msg  = ''
			var path = '';
		} else {
			var $img = $LI.find( 'img' );
			var src  = $img.length ? $img.attr( 'src' ) : V.coverart;
			var path = V.list.path;
			var msg  = ICON( 'folder gr' ) +' '+ path
		}
		var icon = '<img src="'+ src +'"><i class="i-refresh-overlay"></i>';
		INFO( {
			  icon    : icon
			, title   : 'Update Thumbnails'
			, message : msg
			, list    : [ '', 'radio', { kv: { 'Only added or removed': false, 'Rebuild all': true }, sameline: false } ]
			, ok      : () => {
				COMMON.formSubmit( {
					  alias      : 'thumbnail'
					, title      : 'Album Thumbnails'
					, label      : 'Update'
					, installurl : "albumthumbnail.sh '"+ path +"' "+ _INFO.val()
					, backhref   : '/'
				} );
			}
		} );
	}
	, update        : () => {
		if ( V.list.path.slice( -3 ) === 'cue' ) V.list.path = UTIL.dirName( V.list.path );
		INFO( {
			  icon       : 'refresh-library'
			, title      : 'Library Database'
			, message    : ICON( 'folder' ) +' /mnt/MPD/<wh>'+ V.list.path +'</wh>'
			, list       : [ '', 'radio', { kv: { 'Update changed files': 'update', 'Update all files': 'rescan' }, sameline: false } ]
			, values     : 'update'
			, ok         : () => BASH( [ 'mpcupdate', _INFO.val(), V.list.path, 'CMD ACTION PATHMPD' ] )
		} );
	}
	, wrdelete      : () => {
		var name = V.list.name;
		var img  = $LI.find( 'img' ).attr( 'src' ) || V.coverdefault;
		var url  = $LI.find( '.li2' ).text();
		INFO( {
			  icon    : V.mode
			, title   : 'Delete '+ ( V.mode === 'webradio' ? 'Web Radio' : 'DAB Radio' )
			, width   : 500
			, message : '<br><img src="'+ img +'">'
					   +'<br><wh>'+ name +'</wh>'
					   +'<br>'+ url
			, oklabel : ICON( 'remove' ) +'Delete'
			, okcolor : V.red
			, ok      : () => {
				$LI.remove();
				BASH( ['webradiodelete', $( '#lib-path' ).text(), url, V.mode, 'CMD DIR URL MODE' ] );
			}
		} );
	}
	, wrdirdelete   : () => {
		var icon  = 'webradio';
		var title = 'Delete Directory';
		var msg   = ICON( 'folder gr' ) +' <wh>'+ V.list.name +'</wh>';
		INFO( {
			  icon    : icon
			, title   : title
			, message : msg
			, oklabel : ICON( 'remove' ) +'Delete'
			, okcolor : V.red
			, ok      : () => {
				var cmd = [ 'dirdelete', $( '#lib-path' ).text(), V.list.name, 'CMD DIR NAME' ]
				BASH( cmd, std => {
					if ( std == -1 ) {
						cmd[ 3 ] += ' CONFIRM';
						cmd.splice( 3, 0, true );
						INFO( {
							  icon    : icon
							, title   : title
							, message : msg +'&nbsp; not empty.'
										+'<br><br>Continue?'
							, oklabel : ICON( 'remove' ) +'Delete'
							, okcolor : V.red
							, ok      : () => BASH( cmd )
						} );
					}
				} );
			}
		} );
	}
	, wrdirrename   : () => {
		var icon  = 'webradio';
		var title = 'Rename Directory';
		INFO( {
			  icon         : icon
			, title        : title
			, list         : [ 'Name', 'text' ]
			, values       : V.list.name
			, checkblank   : true
			, checkchanged : true
			, oklabel      : 'Rename'
			, ok           : () => {
				var newname = _INFO.val();
				BASH( [ 'dirrename', $( '#lib-path' ).text(), V.list.name, newname, 'CMD DIR NAME NEWNAME' ], std => {
					if ( std == -1 ) {
						INFO( {
							  icon    : icon
							, title   : title
							, message : 'Exists: '+ ICON( 'folder gr' ) +'<wh> '+ newname +'</wh>'
							, ok      : CONTEXT.wrdirrename
						} );
					}
				} );
			}
		} );
	}
	, wredit        : () => {
		INFO( {
			  icon         : 'webradio'
			, title        : 'Edit Web Radio'
			, message      : '<img src="'+ ( $LI.find( 'img' ).attr( 'src' ) || V.coverdefault ) +'">'
			, list         : WEBRADIO.list
			, values       : {
				  NAME    : V.list.name
				, URL     : V.list.path
				, CHARSET : $LI.data( 'charset' ) || 'UTF-8'
				, DIR     : $( '#lib-path' ).text()
				, OLDURL  : V.list.path
			}
			, checkchanged : true
			, checkblank   : [ 0, 1 ]
			, boxwidth     : 'max'
			, beforeshow   : () => {
				$( '#infoList tr:eq( 2 ) td' ).last().addClass( 'hide' );
				if ( /stream.radioparadise.com|icecast.radiofrance.fr/.test( V.list.path ) ) {
					$( '#infoList input' ).eq( 1 ).addClass( 'disabled' );
					$( '#infoList tr' ).eq( 2 ).addClass( 'hide' );
				}
			}
			, oklabel      : ICON( 'save' ) +'Save'
			, ok           : () => {
				var val = _INFO.val();
				BASH( COMMON.cmd_json2args( 'webradioedit', val ), error => {
					if ( error ) WEBRADIO.exists( error, '', val.URL );
				} );
			}
		} );
	}
	, wrsave        : () => WEBRADIO.new( '', $LI.find( '.lipath' ).text() )
}

$( '.contextmenu a, .contextmenu .submenu' ).on( 'click', function() {
	var $this = $( this );
	var cmd   = $this.data( 'cmd' );
	MENU.hide();
	$( 'li.updn' ).removeClass( 'updn' );
	if ( [ 'play', 'pause', 'stop' ].includes( cmd ) ) {
		$( '#'+ cmd ).trigger( 'click' );
		return
	}
	
	if ( cmd in CONTEXT ) {
		CONTEXT[ cmd ]();
		return
	}
	
	/* '' album albumartist artist composer conductor date genre pl wr
	_add
	_addplay
	playnext
	_replace
	_replaceplay
	*/
	if ( [ 'add', 'replace' ].includes( cmd.replace( 'play', '' ) ) ) V.html.playlist = '';
	var path = V.list.path;
	// mpccmd:
	// [ 'mpcadd', path ]
	// [ 'mpcaddplaynext', path ]
	// [ 'mpcaddfind', 'multi', V.mode, path, 'album', V.list.album ]
	// [ 'mpcaddfind', 'multi', V.mode, $( '#mode-title' ).text(), 'album', V.list.name ]
	// [ 'mpcaddfind',  mode,   path ];
	// [ 'mpcaddload', path ]
	// [ 'mpcaddls', path ]
	var mode = cmd.replace( /replaceplay|replace|addplay|add/, '' ); // must keep order otherwise replaceplay -> play, addplay -> play
	switch ( mode ) {
		case '':
			if ( V.list.singletrack || MODE.radio() ) { // single track
				V.mpccmd = [ 'mpcadd', path ];
			} else if ( V.librarytrack && ! $( '.licover .lipath' ).length ) {
				V.mpccmd = [ 'mpcaddfind', V.mode, path, 'album', V.list.album ];
			} else { // directory / album / saved playlist track
				V.mpccmd = V.playlisttrack ? [ 'mpcadd', path ] : [ 'mpcaddls', path ];
			}
			break;
		case 'pl':
			cmd = cmd.slice( 2 );
			if ( V.library ) {
				V.mpccmd = [ 'mpcaddload', path ];
			} else { // saved playlist
				var play = cmd.slice( -1 ) === 'y';
				var replace = cmd.slice( 0, 1 ) === 'r';
				if ( replace ) {
					PLAYLIST.replace( () => PLAYLIST.load( V.list.path, play, replace ) );
				} else {
					PLAYLIST.load( V.list.path, play, replace );
				}
				return
			}
			break;
		case 'playnext':
			V.mpccmd = [ 'mpcaddplaynext', path ];
			break
		case 'wr':
			cmd = cmd.slice( 2 );
			var charset = $LI.data( 'charset' );
			if ( charset ) path += '#charset='+ charset
			V.mpccmd = [ 'mpcadd', path ];
			break;
		default: // MODE
			var datamode = $LI.data( 'mode' );
			if ( datamode === 'album' ) {          // 1st level
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#lib-path' ).text() ];
				if ( [ 'date', 'genre' ].includes( V.mode ) ) V.mpccmd.push( 'artist', $LI.find( '.name' ).text() );
				V.mpccmd.push( 'album', $LI.find( '.liname' ).text() );
			} else if ( datamode !== 'lsmode' ) { // intermediat level
				V.mpccmd = [ 'mpcaddfind', V.mode, V.list.path ];
			} else {                              // last list before track: mode + album || date/genre: mode + artist + album
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#lib-path' ).text(), 'lsmode', V.list.path ];
			}
		break
	}
	V.action = cmd.replace( /album|artist|composer|conductor|date|genre/g, '' ); // add addplay playnext replace replaceplay
	PLAYLIST.add();
} );
