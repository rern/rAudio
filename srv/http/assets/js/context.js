var CONTEXT  = {
	  bookmark     : () => {
		// #1 - track list - show image from licover
		// #2 - dir list   - show image from path + coverart.jpg
		// #3 - no cover   - icon + directory name
		var path    = V.list.path;
		if ( MODE.radio() ) {
			var name    = V.list.name;
			var src     = $LI.find( 'img' ).attr( 'src' );
			var msgpath = name;
		} else {
			if ( path.endsWith( '.cue' ) ) path = COMMON.dirName( path );
			var src     = '/mnt/MPD/'+ path +'/cover.jpg'+ COMMON.versionHash();
			var msgpath = path;
			var name    = COMMON.baseName( path );
		}
		INFO( {
			  icon       : 'bookmark'
			, title      : 'Add Bookmark'
			, message    : '<img src="'+ src +'">'
						  +'<br><wh>'+ msgpath +'</wh>'
			, list       : [ 'As:', 'text' ]
			, values     : name
			, checkblank : true
			, ok         : () => {
				CONTEXT.bookmarkEdit( _INFO.val(), path, 'CMD NAME DIR', CONTEXT.bookmark );
			}
		} );
	}
	, bookmarkEdit : ( name, arg, cmd, callback ) => {
		var exist = '';
		$( '#lib-mode-list .name' ).each( ( i, el ) => {
			var $el = $( el );
			if ( $el.text() === name ) {
				if ( $el.parent().hasClass( 'bookmark' ) ) {
					exist = 'Bookmark name already exists:<br>'+ name;
				} else {
					exist = 'Reserved name for mode list:<br>'+ name;
				}
				INFO( {
					  icon    : I.icon
					, title   : I.title
					, message : exist
					, ok      : callback
				} );
				return false
			}
		} );
		if ( exist ) return
		
		BASH( [ 'bookmark', name, arg, cmd ] );
		if ( cmd === 'CMD NAME DIR' ) BANNER( 'bookmark', 'Bookmark', 'Added' );
	}
	, crop         : () => {
		var $img = $LI.find( 'img' );
		var src  = $img.length ? $img.attr( 'src' ) : '';
		INFO( {
			  icon    : 'crop'
			, title   : 'Crop Playlist'
			, message : '<img src="'+ src +'">'
						+'<br><wh>'+ $LI.find( '.name' ).text() +'</wh>'
						+'<br><br>Remove all other tracks?'
			, oklabel : ICON( 'crop' ) +'Crop'
			, ok      : () => {
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
	, current      : action => {
		BASH( [ 'mpcskip', V.list.index + 1, action || 'stop', 'CMD POS ACTION' ] );
	}
	, directory    : () => {
		var path      = V.list.path;
		var modetitle = path;
		var mode      = COMMON.path2mode( path );
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
			var mode0          = V.mode;
			V.mode             = mode;
			LIBRARY.list( data );
			setTimeout( () => V.mode = mode0, 300 );
		} );
	}
	, exclude      : () => {
		INFO( {
			  icon    : 'folder-forbid'
			, title   : 'Exclude Directory'
			, message : 'Exclude from Library:'
						+'<br>'+ ICON( 'folder' ) +'&ensp;<wh>'+ V.list.path +'</wh>'
			, ok      : () => {
				BASH( [ 'mpdignore', V.list.path, 'CMD DIR' ], () => $LI.remove() );
				var dir = COMMON.baseName( V.list );
			}
		} );
	}
	, plAdd        : () => {
		if ( V.playlist ) {
			var album = $LI.find( '.album' ).text();
			var file  = V.list.path;
		} else {
			var album = $( '.licover .lialbum' ).text();
			var file  = $LI.find( '.lipath' ).text();
		}

		var $img     = V.library && V.librarytrack ? $( '#liimg' ) : $LI.find( 'img' );
		var message  = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : '';
		if ( file.startsWith( 'http' ) ) { // webradio
			message += '<div>'+ ICON( 'webradio' ) +' <wh>'+ V.list.name +'</wh>'
					  +'<br>'+ ICON( 'file' ) +' '+ file +'</div>';
		} else {
			message += '<div>'+ ICON( 'folder' ) +' '+ COMMON.dirName( file )
					  +'<br>'+ ICON( 'file' ) +' '+ COMMON.baseName( file ) +'</div>';
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
				setTimeout( () => {
					$( '#button-pl-playlists' ).trigger( 'click' );
					NOTIFY( 'cursor', V.pladd.title, 'Choose target playlist' );
				}, V.playlist ? 100 : 300 );
				$( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).addClass( 'disabled' );
			}
		} );
	}
	, plRemove     : () => {
		LOCAL();
		var plname = $( '#pl-title .lipath' ).text();
		BASH( [ 'savedpledit', plname, 'remove', $LI.index() + 1, 'CMD NAME ACTION POS' ] );
		$LI.remove();
	}
	, plRename     : () => {
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
			, ok           : () => {
				var newname = _INFO.val();
				var exist   = false;
				$( '#pl-savedlist .single' ).each( ( i, el ) => {
					if ( $( el ).text() === newname ) {
						exist = true;
						INFO( {
							  icon    : I.icon
							, title   : I.title
							, message : 'Name already exists: <wh> '+ name +'</wh>'
							, ok      : CONTEXT.plRename
						} );
						return false
					}
				} );
				if ( exist ) return
				
				PLAYLIST.playlists.save( newname, name );
			}
		} );
	}
	, plDelete     : () => {
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
	, remove       : () => {
		V.contextmenu = true;
		setTimeout( () => V.contextmenu = false, 500 );
		PLAYLIST.remove( $LI );
	}
	, removeRange  : () => PLAYLIST.removeRange( [ $LI.index() + 1, S.pllength ] )
	, similar      : () => {
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
	, tag          : () => {
		var name   = [ 'Track', 'Title', 'Album', 'AlbumArtist', 'Artist', 'Composer', 'Conductor', 'Genre', 'Date' ];
		if ( V.list.licover ) name.splice( 0, 2 );
		var format = name.map( el => el.toLowerCase() );
		name[ 3 ]  = 'Album Artist';
		var list   = [];
		format.forEach( ( el, i ) => {
			list.push( [ '<span class="taglabel gr hide">'+ name[ i ] +'</span> <i class="i-'+ el +'"></i>', 'text' ] );
		} );
		var file   = V.list.path;
		var cmd    = [ 'tageditor.sh', 'get', file, format.join( ' ' ) ];
		var CMD    = 'CMD FILE TAGS';
		if ( 'track' in V.list ) {
			file         = file.replace( /\.cue\/track.*$/, '.cue' );
			var fileicon = 'playlists';
			cmd.push( V.list.track );
			CMD += ' TRACK';
		} else {
			var fileicon = 'music';
		}
		cmd.push( CMD );
		BASH( cmd, values => {
			if ( V.library ) {
				var $img = V.librarytrack ? $( '.licoverimg img' ) : $LI.find( 'img' );
				var src  = $img.length ? $img.attr( 'src' ) : V.coverdefault;
			} else {
				var $img =  $LI.find( 'img' );
				var src  = $img.length ? $img.attr( 'src' ).replace( '/thumb.', '/coverart.' ) : V.coverdefault;
			}
			var dir     = V.list.licover ? file : COMMON.dirName( file );
			var message = '<img src="'+ src +'"><a class="tagpath hide">'+ file +'</a>'
						  +'<div>'+ ICON( 'folder' ) +' <a class="path">'+ dir +'</a>';
			message    += V.list.licover ? '</div>' : '<br>'+ ICON( fileicon ) +' '+ COMMON.baseName( file ) +'</div>';
			var footer  = '<span>'+ ICON( 'help', '', 'tabindex' ) +'Label</span>';
			if ( V.list.licover ) footer += '<gr style="float: right"><c>*</c> Various values in tracks</gr>';
			INFO( {
				  icon         : V.playlist ? 'info' : 'tag'
				, title        : V.playlist ? 'Track Info' : 'Tag Editor'
				, message      : message
				, messagealign : 'left'
				, list         : list
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
							var mode   = COMMON.path2mode( string );
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
					NOTIFY( 'tag', 'Tag Editor', 'Change ...' );
					BASH( COMMON.cmd_json2args( 'tageditor.sh', val ) );
				}
			} );
		}, 'json' );
	}
	, thumbnail    : () => {
		var $liicon = $LI.find( '.li-icon' );
		var src     = $liicon.is( 'img' ) ? $liicon.attr( 'src' ) : V.coverdefault;
		var radio   = MODE.radio();
		var path    = radio ? $( '#lib-path' ).text() +'/'+ V.list.name : V.list.path;
		INFO( {
			  icon        : V.icoverart
			, title       : radio ? 'Station Art' : 'Folder Thumbnail'
			, message     : '<img class="imgold" src="'+ src +'" >'
						   +'<p class="infoimgname">'+ V.list.name +'</p>'
			, file        : { oklabel: ICON( 'flash' ) +'Replace', type: 'image/*' }
			, beforeshow  : () => {
				$( '.extrabtn' ).toggleClass( 'hide', src.replace( /\?v=.*/, '' ) === V.coverdefault );
			}
			, buttonlabel : ICON( 'folder' ) +' Icon'
			, buttoncolor : V.orange
			, button      : () => {
				BASH( [ 'thumbnailreset', path, 'CMD DIR' ] );
			}
			, ok          : () => UTIL.imageReplace( path, 'coverart' )
		} );
	}
	, thumbUpdate  : modealbum => {
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
				var overwrite = _INFO.val();
				COMMON.formSubmit( {
					  alias      : 'thumbnail'
					, title      : 'Album Thumbnails'
					, label      : overwrite ? 'Rebuild' : 'Update'
					, installurl : 'albumthumbnail.sh'
					, backhref   : '/'
					, path       : path
					, overwrite  : overwrite
				} );
			}
		} );
	}
	, update       : () => {
		if ( V.list.path.endsWith( '.cue' ) ) V.list.path = COMMON.dirName( V.list.path );
		INFO( {
			  icon       : 'refresh-library'
			, title      : 'Library Database'
			, message    : ICON( 'folder' ) +' '+ V.list.path
			, ok         : () => BASH( [ 'mpcupdate', 'update', V.list.path, 'CMD ACTION PATHMPD' ] )
		} );
	}
	, wrAdd        : val => {
		if ( ! val ) val = { NAME: '', URL: '', CHARSET: 'UTF-8' }
		INFO( {
			  icon       : 'webradio'
			, title      : ( V.library ? 'Add' : 'Save' ) +' Web Radio'
			, boxwidth   : 'max'
			, list       : CONTEXT.wrList
			, values     : CONTEXT.wrEditValues( val )
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
							, ok         : () => {
								BASH( [ 'dirnew', $( '#lib-path' ).text() +'/'+ _INFO.val(), 'CMD DIR' ] );
							}
						} );
					} );
			}
			, ok         : () => CONTEXT.wrCommand( I )
		} );
	}
	, wrCommand    : ( I ) => {
		var type     = I.title.split( ' ' )[ 0 ];
		var val      = _INFO.val();
		var callback = () => CONTEXT[ 'wr'+ type ]( val );
		if ( CONTEXT.wrExists( val.NAME, callback ) ) return
		
		val.DIR      = $( '#lib-path' ).text();
		if ( type === 'Edit' ) val.OLDNAME = V.list.name;
		val.TEST     = val.URL !== I.values[ 1 ];
		if ( val.TEST ) BANNER( I.icon +' blink', I.title, 'Stream test ...', -1 );
		BASH( COMMON.cmd_json2args( 'webradioedit', val ), std => {
			BANNER_HIDE();
			if ( std ) _INFO.warning( I.icon, I.title, std, callback );
		} );
	}
	, wrDelete     : () => {
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
				BASH( [ 'webradiodelete', $( '#lib-path' ).text() +'/'+ name, 'CMD DIR' ] );
			}
		} );
	}
	, wrDirDelete  : () => {
		var msg   = ICON( 'folder gr' ) +' <wh>'+ V.list.name +'</wh>';
		INFO( {
			  icon    : 'webradio'
			, title   : 'Delete Directory'
			, message : msg
			, oklabel : ICON( 'remove' ) +'Delete'
			, okcolor : V.red
			, ok      : () => {
				var cmd = [ 'dirdelete', $( '#lib-path' ).text(), 'CMD DIR' ]
				BASH( cmd, std => {
					if ( std == -1 ) {
						cmd[ 3 ] += ' CONFIRM';
						cmd.splice( 3, 0, true );
						INFO( {
							  icon    : I.icon
							, title   : I.title
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
	, wrDirRename  : () => {
		INFO( {
			  icon         : 'webradio'
			, title        : 'Rename Directory'
			, list         : [ 'Name', 'text' ]
			, values       : V.list.name
			, checkblank   : true
			, checkchanged : true
			, oklabel      : 'Rename'
			, ok           : () => {
				var newname = _INFO.val();
				if ( CONTEXT.wrExists( newname, CONTEXT.wrDirRename ) ) return
				
				BASH( [ 'dirrename', $( '#lib-path' ).text(), V.list.name, newname, 'CMD DIR NAME NEWNAME' ] );
			}
		} );
	}
	, wrEdit       : val => {
		if ( ! val ) val = { NAME: V.list.name, URL: V.list.path, CHARSET: 'UTF-8' }
		var $img = $LI.find( 'img' );
		if ( $img.length ) {
			var icon = '<img src="'+ $img.attr( 'src' ) +'">';
		} else {
			var icon = ICON( V.mode +' msgicon' );;
		}
		INFO( {
			  icon         : 'webradio'
			, title        : 'Edit Web Radio'
			, message      : icon
			, list         : CONTEXT.wrList
			, values       : CONTEXT.wrEditValues( val )
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
			, ok           : () => CONTEXT.wrCommand( I )
		} );
	}
	, wrEditValues : val => {
		return {
			  NAME    : val.NAME
			, URL     : val.URL
			, CHARSET : val.CHARSET
		}
	}
	, wrExists     : ( name, callback ) => {
		if ( name === V.list.name ) return false
		
		var exists = false;
		$( '#lib-list li .name' ).each( ( i, el ) => {
			if ( $( el ).text() === name ) {
				exists = true;
				INFO( {
					  icon    : I.icon
					, title   : I.title
					, message : 'Name already exists: <wh> '+ name +'</wh>'
					, ok      : callback
				} );
				return false
			}
		} );
		return exists
	}
	, wrList       : [
		  [ 'Name',    'text', { colspan: 3 } ]
		, [ 'URL',     'text', { colspan: 3 } ]
		, [ 'Charset', 'text', { sameline: true, width: 190 } ]
		, [ '',        '<a href="https://www.iana.org/assignments/character-sets/character-sets.xhtml" target="_blank">'+ ICON( 'help gr' ), { sameline: true } ]
		, [ '',        '<gr>New folder</gr> <i class="i-folder-plus" tabindex="0"></i>' ]
		, [ '',        'hidden' ] // DIR
		, [ '',        'hidden' ] // OLDURL
	]
	, wrSave       : () => WEBRADIO.new( '', $LI.find( '.lipath' ).text() )
}

$( '.contextmenu a, .contextmenu .submenu' ).on( 'click', function() {
	var $this = $( this );
	var cmd   = $this.data( 'cmd' );
	MENU.hide();
	$( 'li.updn' ).removeClass( 'updn' );
	if ( [ 'play', 'pause', 'stop' ].includes( cmd ) ) {
		cmd === 'play' ? CONTEXT.current( cmd ) : $( '#'+ cmd ).trigger( 'click' );
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
				V.mpccmd    = [ 'mpcaddload', path ];
			} else { // saved playlist
				var play    = cmd.endsWith( 'play' );
				var replace = cmd.startsWith( 'replace' );
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
			var mode = $LI.data( 'mode' );
			if ( mode === 'album' ) {          // 1st level
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#lib-path' ).text() ];
				if ( [ 'date', 'genre' ].includes( V.mode ) ) V.mpccmd.push( 'artist', $LI.find( '.name' ).text() );
				V.mpccmd.push( 'album', $LI.find( '.liname' ).text() );
			} else if ( mode !== 'lsmode' ) { // intermediat level
				V.mpccmd = [ 'mpcaddfind', V.mode, V.list.path ];
			} else {                              // last list before track: mode + album || date/genre: mode + artist + album
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#lib-path' ).text(), 'lsmode', V.list.path ];
			}
		break
	}
	V.action = cmd.replace( /album|artist|composer|conductor|date|genre/g, '' ); // add addplay playnext replace replaceplay
	PLAYLIST.add();
} );
