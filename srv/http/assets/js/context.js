function addSimilar() {
	var icon  = 'lastfm';
	var title = 'Add Similar';
	banner( icon +' blink', title, 'Get similar tracks ...', -1 );
	bash( [ 'mpcsimilar', V.list.path, 'CMD FILE' ], error => {
		if ( error ) {
			bannerHide();
			info( {
				  icon    : icon
				, title   : title
				, message : error
			} );
		}
	} );
}
function addToPlaylist() {
	if ( D.plclear && V.action.slice( 0, 7 ) === 'replace' ) {
		infoReplace( addToPlaylistCommand );
	} else {
		$( '#infoX' ).trigger( 'click' );
		addToPlaylistCommand();
	}
}
function addToPlaylistCommand() {
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
	V.msg         =  '<a class="li1">'+ V.list.name +'</a>';
	if ( V.list.li && V.list.li.find( '.li2' ).length ) V.msg += '<a class="li2">'+ V.list.li.find( '.li2' ).text() +'</a>';
	banner( 'playlist', V.title, V.msg );
	bash( V.mpccmd );
	if ( D.playbackswitch && V.action.slice( -4 ) === 'play' ) switchPage( 'playback' );
}
function bookmarkNew() {
	// #1 - track list - show image from licover
	// #2 - dir list   - show image from path + coverart.jpg
	// #3 - no cover   - icon + directory name
	if ( [ 'http', 'rtsp' ].includes( V.list.path.slice( 0, 4 ) ) ) {
		var $img = V.list.li.find( '.iconthumb' );
		var src = $img.length ? $img.attr( 'src' ).replace( /-thumb.jpg\?v=.*$/, '.jpg' ) : '';
		var path    = V.list.path;
		var name    = V.list.name;
		var msgpath = name;
	} else {
		if ( V.mode.slice( -5 ) === 'radio' ) {
			var path = V.mode +'/'+ V.list.path;
			var src  = '/data/'+ path +'/coverart.jpg';
		} else {
			var path = V.list.path.slice( -4 ) === '.cue' ? dirName( path ) : V.list.path;
			var src  = '/mnt/MPD/'+ path +'/coverart.jpg';
		}
		var msgpath = path;
		var name    = path.split( '/' ).pop()
	}
	info( {
		  icon       : 'bookmark'
		, title      : 'Add Bookmark'
		, message    : '<img src="'+ src + versionHash() +'">'
					  +'<br><wh>'+ msgpath +'</wh>'
		, list       : [ 'As:', 'text' ]
		, values     : name
		, checkblank : true
		, beforeshow : () => {
			$( '#infoList input' ).parents( 'tr' ).addClass( 'hide' );
			$( '#infoList img' ).off( 'error' ).on( 'error', function() {
				imageOnError( this, 'bookmark' );
			} );
		}
		, ok         : () => {
			var name = infoVal();
			bash( [ 'bookmarkadd', name, path, 'CMD NAME DIR' ], std => {
				if ( std == -1 ) {
					bannerHide();
					info( {
						  icon    : 'bookmark'
						, title   : 'Add Bookmark'
						, message : 'Bookmark <wh>'+ name +'</wh> already exists.'
					} );
				} else {
					banner( 'bookmark', 'Bookmark Added', name );
				}
			} );
		}
	} );
}
function currentSet() {
	S.song = V.list.index;
	setPlaylistScroll();
	local();
	bash( [ 'mpcskippl', V.list.index + 1, 'stop', 'CMD POS ACTION' ] );
}
function directoryDelete() {
	var icon  = 'webradio';
	var title = 'Delete Directory';
	var dir   = ico( 'folder gr' ) +' <wh>'+ V.list.name +'</wh>';
	info( {
		  icon    : icon
		, title   : title
		, message : dir
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			var dir = directoryPath();
			bash( [ 'dirdelete', dir +'/'+ V.list.name, 'CMD DIR' ], std => {
				if ( std == -1 ) {
					info( {
						  icon    : icon
						, title   : title
						, message : dir +' not empty.'
									+'<br>Confirm delete?'
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => bash( [ 'dirdelete', dir, true, 'CMD DIR CONFIRM' ] )
					} );
				}
			} );
		}
	} );
}
function directoryList() {
	var path      = V.list.path;
	var modetitle = path;
	var mode      = path.split( '/' )[ 0 ].toLowerCase();
	var query     = {
		  library : 'ls'
		, string  : path
		, gmode   : mode
	}
	list( query, function( html ) {
		var data = {
			  html      : html
			, modetitle : modetitle
			, path      : path
		}
		V.librarylisthtml = '';
		var mode0         = V.mode;
		V.mode            = mode;
		renderLibraryList( data );
		setTimeout( () => V.mode = mode0, 300 );
	} );
}
function directoryPath() {
	return '/srv/http/data/webradio'+ $( '.lib-path' ).text()
}
function directoryRename() {
	var icon  = 'webradio';
	var title = 'Rename Directory';
	info( {
		  icon         : icon
		, title        : title
		, list         : [ 'Name', 'text' ]
		, values       : V.list.name
		, checkblank   : true
		, checkchanged : true
		, oklabel      : 'Rename'
		, ok           : () => {
			var newname = infoVal();
			bash( [ 'dirrename', directoryPath(), V.list.name, newname, 'CMD DIR NAME NEWNAME' ], std => {
				if ( std == -1 ) {
					info( {
						  icon    : icon
						, title   : title
						, message : 'Exists: '+ ico( 'folder gr' ) +'<wh> '+ newname +'</wh>'
						, ok      : directoryRename
					} );
				}
			} );
		}
	} );
}
function excludeDirectory() {
	info( {
		  icon    : 'folder-forbid'
		, title   : 'Exclude Directory'
		, message : 'Exclude from Library:'
					+'<br>'+ ico( 'folder' ) +'&ensp;<wh>'+ V.list.path +'</wh>'
		, ok      : () => {
			bash( [ 'mpdignore', V.list.path, 'CMD DIR' ], () => V.list.li.remove() );
			var dir = V.list.path.split( '/' ).pop();
		}
	} );
}
function infoReplace( callback ) {
	info( {
		  icon    : 'playlist'
		, title   : 'Playlist Replace'
		, message : 'Replace current playlist?'
		, ok      : callback
	} );
}
function playlistDelete() {
	info( {
		  icon    : 'playlists'
		, title   : 'Delete Playlist'
		, message : 'Delete?'
				   +'<br><wh>'+ V.list.name +'</wh>'
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			bash( [ 'savedpldelete', V.list.name, 'CMD NAME' ] );
			V.list.li.remove();
		}
	} );
}
function playlistLoad( name, play, replace ) {
	banner( 'playlists', name, 'Load ...' );
	bash( [ 'playlist', name, play, replace, 'CMD NAME PLAY REPLACE' ], () => {
		if ( ! S.pllength ) $( '#playback-controls, #playback-controls i' ).removeClass( 'hide' );
	} );
}
function playlistNew( name ) {
	info( {
		  icon         : 'playlists'
		, title        : 'Save Playlist'
		, message      : 'Save current playlist as:'
		, list         : [ 'Name', 'text' ]
		, values       : name
		, checkblank   : true
		, ok           : () => playlistSave( infoVal() )
	} );
}
function playlistRename() {
	var name = V.list.name;
	info( {
		  icon         : 'playlists'
		, title        : 'Rename Playlist'
		, message      : 'From: <wh>'+ name +'</wh>'
		, list         : [ 'To', 'text' ]
		, values       : name
		, checkchanged : true
		, checkblank   : true
		, oklabel      : ico( 'flash' ) +'Rename'
		, ok           : () => playlistSave( infoVal(), name )
	} );
}
function playlistSave( name, oldname, replace ) {
	if ( oldname ) {
		bash( [ 'savedplrename', oldname, name, replace, 'CMD NAME NEWNAME REPLACE' ], data => {
			if ( data == -1 ) playlistSaveExist( 'rename', name, oldname );
		} );
	} else {
		bash( [ 'savedplsave', name, replace, 'CMD NAME REPLACE' ], data => {
			if ( data == -1 ) {
				playlistSaveExist( 'save', name );
			} else {
				banner( 'playlist', 'Playlist Saved', name );
			}
		} );
	}
}
function playlistSaveExist( type, name, oldname ) {
	var rename = type === 'rename';
	info( {
		  icon        : 'playlists'
		, title       : rename ? 'Rename Playlist' : 'Save Playlist'
		, message     : 'Playlist: <wh>'+ name +'</wh>'
					   +'<br><br>Already exists.'
		, buttonlabel : ico( 'undo' ) +'Rename'
		, buttoncolor : orange
		, button      : () => rename ? playlistRename() : playlistNew( name )
		, oklabel     : ico( 'flash' ) +'Replace'
		, ok          : () => rename ? playlistSave( name, oldname, 'replace' ) : playlistSave( name, '' , 'replace' )
	} );
}
function removeFromPlaylist() {
	V.contextmenu = true;
	setTimeout( () => V.contextmenu = false, 500 );
	playlistRemove( V.list.li );
}
function savedPlaylistAdd() {
	if ( V.playlist ) {
		var album = V.list.li.find( '.album' ).text();
		var file  = V.list.path;
	} else {
		var album = $( '.licover .lialbum' ).text();
		var file  = V.list.li.find( '.lipath' ).text();
	}
	
	var $img     = V.library && V.librarytrack ? $( '#liimg' ) : V.list.li.find( 'img' );
	var message  = $img.length ? '<img src="'+ $img.attr( 'src' ) +'">' : '';
	if ( file.slice( 0, 4 ) === 'http' ) { // webradio
		message += '<div>'+ ico( 'webradio' ) +' <wh>'+ V.list.name +'</wh>'
				  +'<br>'+ ico( 'file' ) +' '+ file +'</div>';
	} else {
		message += '<div>'+ ico( 'folder' ) +' '+ dirName( file )
				  +'<br>'+ ico( 'file' ) +' '+ file.split( '/' ).pop() +'</div>';
	}
	V.pladd      = {
		  icon    : 'playlists'
		, title   : 'Add to a playlist'
		, album   : album
		, path    : file
		, width   : 500
		, message : message
	}
	info( {
		  ...V.pladd
		, beforeshow : () => {
			$( '.infofooter' ).css( { width: '100%', 'padding-top': 0 } );
			playlistInsertSet();
		}
		, oklabel    : ico( 'cursor' ) +'Target'
		, ok         : () => {
			if ( ! V.playlist ) playlistGet();
			setTimeout( () => $( '#button-pl-playlists' ).trigger( 'click' ), 100 );
			banner( 'cursor blink', V.pladd.title, 'Choose target playlist', -1 );
			$( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).addClass( 'disabled' );
		}
	} );
}
function savedPlaylistAddClear() {
	delete V.pladd;
	$( '#bar-top, #bar-bottom, .content-top, #page-playlist .index' ).removeClass( 'disabled' );
}
function savedPlaylistRemove() {
	local();
	var plname = $( '#pl-title .lipath' ).text();
	bash( [ 'savedpledit', plname, 'remove', V.list.li.index() + 1, 'CMD NAME ACTION POS' ] );
	V.list.li.remove();
}
function similarAdd() {
	if ( D.plsimilar ) {
		info( {
			  icon    : 'lastfm'
			, title   : 'Add Similar'
			, message : 'Search and add similar tracks from Library?'
			, ok      : addSimilar
		} );
	} else {
		addSimilar();
	}
}
function tagEditor() {
	var name   = [ 'Album', 'AlbumArtist', 'Artist', 'Composer', 'Conductor', 'Genre', 'Date', 'Title', 'Track' ];
	var format = name.map( el => el.toLowerCase() );
	var file   = V.list.path;
	var dir    = V.list.licover ? file : dirName( file );
	var cue    = file.slice( -4 ) === '.cue';
	if ( V.list.licover ) format = format.slice( 0, -2 );
	var query = {
		  library : 'track'
		, file    : file
		, format  : format
	}
	list( query, function( values ) {
		name[ 1 ]    = 'Album Artist';
		var listinfo = [];
		format.forEach( ( el, i ) => {
			listinfo.push( [ '<span class="taglabel gr hide">'+ name[ i ] +'</span> <i class="i-'+ el +'"></i>', 'text' ] );
		} );
		if ( V.library ) {
			var $img = V.librarytrack ? $( '.licoverimg img' ) : V.list.li.find( 'img' );
			var src  = $img.length ? $img.attr( 'src' ) : V.coverdefault;
		} else {
			var $img =  V.list.li.find( 'img' );
			var src  = $img.length ? $img.attr( 'src' ).replace( '/thumb.', '/coverart.' ) : V.coverdefault;
		}
		var fileicon = cue ? 'file-music' : 'playlists';
		var message  = '<img src="'+ src +'"><a class="tagpath hide">'+ file +'</a>'
					  +'<div>'+ ico( 'folder' ) +' '+ dir;
		message += V.list.licover ? '</div>' : '<br>'+ ico( fileicon ) +' '+ file.split( '/' ).pop() +'</div>';
		var footer   = '<span>'+ ico( 'help', '', 'tabindex' ) +'Label</span>';
		if ( V.list.licover ) footer += '<gr style="float: right"><c>*</c> Various values in tracks</gr>';
		info( {
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
				$( '#infoList img' ).on( 'error', function() {
					imageOnError( this );
				} );
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
				$( '#infoList' ).on( 'click', 'table i', function() {
					var $this  = $( this );
					var mode   = $this.prop( 'class' ).replace( 'i-', '' );
					if ( [ 'track', 'title' ].includes( mode ) ) return
					
					var string = $this.parent().next().find( 'input' ).val();
					if ( ! string ) return
					
					if ( V.playlist ) switchPage( 'library' );
					var query  = {
						  library : 'find'
						, mode    : mode
						, string  : string
						, format  : [ 'album', 'artist' ]
					}
					list( query, function( html ) {
						var data = {
							  html      : html
							, modetitle : string
							, path      : string
						}
						V.mode = mode;
						renderLibraryList( data );
						query.gmode = mode;
						query.modetitle = string;
						tagModeSwitch();
						V.query.push( query );
					} );
				} );
				$( '.infomessage' ).on( 'click', function() {
					if ( V.library ) return
					
					switchPage( 'library' );
					V.mode    = dir.split( '/' )[ 0 ].toLowerCase();
					var query = {
						  library : 'ls'
						, string  : dir
						, gmode   : V.mode
					}
					list( query, function( html ) {
						var data = {
							  html      : html
							, modetitle : dir
							, path      : dir
						}
						tagModeSwitch();
						renderLibraryList( data );
						switchPage( 'library' );
					} );
				} );
			}
			, okno         : V.playlist
			, ok           : V.playlist ? '' : () => {
				var infoval  = infoVal();
				$.each( infoval, ( k, v ) => {
					if ( values[ k ] === v ) delete infoval[ k ];
				} );
				infoval.FILE = file;
				banner( 'tag blink', 'Tag Editor', 'Change ...', -1 );
				bash( [ 'tageditor.sh', 'edit', ...Object.values( infoval ), 'CMD '+ Object.keys( infoval ).join( ' ' ) ] );
			}
		} );
	}, 'json' );
}
function tagModeSwitch() {
	$( '#infoX' ).trigger( 'click' );
	if ( V.playlist ) {
		$( '#page-playlist' ).addClass( 'hide' );
		$( '#page-library' ).removeClass( 'hide' );
		V.playlist = false;
		V.library  = true;
		V.page     = 'library';
	}
}
function thumbnail() { // station / folder
	if ( V.playback ) { // radio only
		var coverart  = $( '#coverart' ).attr( 'src' );
		var mode      = S.icon === 'dabradio' ? 'dabradio' : 'webradio';
		var name      = S.station;
		var dir       = '';
	} else {
		var $liicon   = V.list.li.find( '.li-icon' );
		var coverart  = $liicon.is( 'img' ) ? $liicon.attr( 'src' ).replace( '-thumb', '' ) : V.coverdefault;
		var mode      = V.mode;
		var name      = V.list.name;
		var dir       = V.list.li.hasClass( 'dir' );
	}
	if ( dir ) {
		mode               = 'folder';
		var path           = V.mode.slice( -5 ) === 'radio' ? directoryPath() : '/mnt/MPD';
		path              += '/'+ V.list.path;
		var imagefilenoext = path + '/coverart';
	} else { // radio only
		var path           = V.playback ? S.file : V.list.path;
		var imagefilenoext = directoryPath() +'/img/'+ path.replace( /\//g, '|' );
	}
	info( {
		  icon        : 'coverart'
		, title       : dir ? 'Folder Thumbnail' : 'Station Art'
		, message     : '<img class="imgold" src="'+ coverart +'" >'
					   +'<p class="infoimgname">'+ name +'</p>'
		, file        : { oklabel: ico( 'flash' ) +'Replace', type: 'image/*' }
		, beforeshow  : () => {
			$( '.imgold' ).on( 'error', function() {
				imageOnError( this );
			} );
			$( '.extrabtn' ).toggleClass( 'hide', coverart.replace( /\?v=.*/, '' ) === V.coverdefault );
		}
		, buttonlabel : V.library ? ico( mode ) +' Icon' : ico( 'remove' ) +' Remove'
		, buttoncolor : orange
		, button      : () => {
			if ( dir ) {
				bash( [ 'thumbreset', path, 'CMD DIR' ] );
			} else {
				bash( [ 'stationartreset', imagefilenoext, V.playback, 'CMD FILENOEXT CURRENT' ] );
			}
		}
		, ok          : () => {
			var src = $( '.infoimgnew' ).attr( 'src' );
			imageReplace( mode, imagefilenoext, V.playback );
		}
	} );
}
function thumbnailUpdate() {
	var $img = V.list.li.find( 'img' );
	var src  = $img.attr( 'src' );
	if ( $img.length ) {
		var icon    = '<span class="button-coverart"><img src="'+ src +'"></span>';
		var message = '<div class="thumbnail"><img src="'+ src +'" style="opacity: 0.5">'
					 +'<br>thumb.jpg</div>';
	} else {
		var icon    = 'coverart';
		var message = '';
	}
	bash( [ 'coverfileget', V.list.path, 'CMD DIR' ], data => {
		if ( data.src ) {
			message += '<div class="thumbnail"><img src="'+ data.src + versionHash() +'">'
					  +'<br>'+ data.src.replace( /.*\//, '' ) +'</div>';
		} else {
			message += '<br>With coverarts in each subfolder:';
		}
		message    += '<br>'+ ico( 'folder gr' ) +' <wh>'+ V.list.path +'</wh>';
		infoThumbnail( icon, message, V.list.path, data.subdir );
	}, 'json' );
}
function updateDirectory() {
	if ( V.list.path.slice( -3 ) === 'cue' ) V.list.path = dirName( V.list.path );
	info( {
		  icon       : 'refresh-library'
		, title      : 'Library Database'
		, message    : ico( 'folder' ) +' /mnt/MPD/<wh>'+ V.list.path +'</wh>'
		, list       : [ '', 'radio', { kv: { 'Update changed files': 'update', 'Update all files': 'rescan' }, sameline: false } ]
		, values     : 'update'
		, ok         : () => bash( [ 'mpcupdate', infoVal(), V.list.path, 'CMD ACTION PATHMPD' ] )
	} );
}
function webRadioDelete() {
	var name = V.list.name;
	var img  = V.list.li.find( 'img' ).attr( 'src' ) || V.coverdefault;
	var url  = V.list.li.find( '.li2' ).text();
	info( {
		  icon    : V.mode
		, title   : 'Delete '+ ( V.mode === 'webradio' ? 'Web Radio' : 'DAB Radio' )
		, width   : 500
		, message : '<br><img src="'+ img +'">'
				   +'<br><wh>'+ name +'</wh>'
				   +'<br>'+ url
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			V.list.li.remove();
			bash( ['webradiodelete', directoryPath(), url, V.mode, 'CMD DIR URL MODE' ] );
		}
	} );
}
var listwebradio = {
	  list   : [
		  [ 'Name',    'text', { colspan: 3 } ]
		, [ 'URL',     'text', { colspan: 3 } ]
		, [ 'Charset', 'text', { sameline: true } ]
		, [ '',        '<a href="https://www.iana.org/assignments/character-sets/character-sets.xhtml" target="_blank">'+ ico( 'help gr' ), { sameline: true } ]
		, [ '',        '<gr>New folder</gr> <i class="i-folder-plus" tabindex="0"></i>' ]
	]
	, button : () => {
		$( '#infoList tr' ).last().find( 'td' ).eq( 1 ).css( 'width', '190px' );
		$( '#infoList input' ).last().css( 'width', '' );
		$( '#infoList td' ).last()
			.css( { 'text-align': 'right', cursor: 'pointer' } )
			.on( 'click', function() {
				info( {
					  icon       : 'webradio'
					, title      : 'Add New Folder'
					, list       : [ 'Name', 'text' ]
					, checkblank : true
					, cancel     : () => $( '.button-webradio-new' ).trigger( 'click' )
					, ok         : () => bash( [ 'dirnew', '/srv/http/data/webradio/'+ $( '#page-library .lib-path' ).text() +'/'+ infoVal(), 'CMD DIR' ] )
				} );
			} );
	}
}
function webRadioEdit() {
	info( {
		  icon         : 'webradio'
		, title        : 'Edit Web Radio'
		, message      : '<img src="'+ ( V.list.li.find( 'img' ).attr( 'src' ) || V.coverdefault ) +'">'
		, list         : listwebradio.list
		, values       : [ V.list.name, V.list.path, V.list.li.data( 'charset' ) || 'UTF-8' ]
		, checkchanged : true
		, checkblank   : [ 0, 1 ]
		, boxwidth     : 'max'
		, beforeshow   : () => {
			if ( /stream.radioparadise.com|icecast.radiofrance.fr/.test( V.list.path ) ) {
				$( '#infoList tr' ).eq( 2 ).addClass( 'hide' );
			} else {
				listwebradio.button();
			}
		}
		, oklabel      : ico( 'save' ) +'Save'
		, ok           : () => {
			var values  = infoVal();
			var name    = values[ 0 ];
			var newurl  = values[ 1 ];
			var charset = values[ 2 ].replace( /UTF-*8|iso *-* */, '' );
			bash( [ 'webradioedit', directoryPath(), name, newurl, charset, V.list.path, 'CMD DIR NAME NEWURL CHARSET URL' ], error => {
				if ( error ) webRadioExists( error, '', newurl );
			} );
		}
	} );
}
function webRadioExists( error, name, url, charset ) {
	info( {
		  icon    : 'webradio'
		, title   : 'Add Web Radio'
		, message : iconwarning + error
					+'<br><br><wh>'+ url +'</wh>'
		, ok      : () => name ? webRadioNew( name, url, charset ) : webRadioEdit()
	} );
}
function webRadioNew( name, url, charset ) {
	info( {
		  icon       : 'webradio'
		, title      : ( V.library ? 'Add' : 'Save' ) +' Web Radio'
		, boxwidth   : 'max'
		, list       : listwebradio.list
		, values     : [ name, url, charset || 'UTF-8' ]
		, checkblank : [ 0, 1 ]
		, beforeshow : () => {
			listwebradio.button()
			if ( $( '#page-library .lib-path' ).text() ) $( '#infoList td' ).last().addClass( 'hide' );
			if ( V.playlist ) $( '#infoList input' ).eq( 1 ).prop( 'disabled', true );
		}
		, ok         : () => {
			var values  = infoVal();
			var name    = values[ 0 ];
			var url     = values[ 1 ];
			var charset = values[ 2 ].replace( /UTF-*8|iso *-* */, '' );
			if ( [ 'm3u', 'pls' ].includes( url.slice( -3 ) ) ) banner( 'webradio blink', 'Web Radio', 'Get URL ...', -1 );
			bash( [ 'webradioadd', $( '#page-library .lib-path' ).text(), name, url, charset, 'CMD DIR NAME URL CHARSET' ], error => {
				bannerHide();
				if ( error ) webRadioExists( error, name, url, charset );
			} );
		}
	} );
}
function webRadioSave() {
	webRadioNew( '', V.list.li.find( '.lipath' ).text() );
}
//----------------------------------------------------------------------------------------------
$( '.contextmenu a, .contextmenu .submenu' ).on( 'click', function() {
	var $this = $( this );
	var cmd   = $this.data( 'cmd' );
	menuHide();
	$( 'li.updn' ).removeClass( 'updn' );
	if ( [ 'play', 'pause', 'stop' ].includes( cmd ) ) {
		$( '#pl-list li' ).eq( V.list.li.index() ).trigger( 'click' );
		if ( S.player === 'mpd' || cmd !== 'play' ) {
			$( '#'+ cmd ).trigger( 'click' );
		} else {
			$( '#stop' ).trigger( 'click' );
			setTimeout( () => $( '#'+ cmd ).trigger( 'click' ), 2000 );
		}
		return
	}
	
	if ( cmd === 'removerange' ) {
		playlistRemoveRange( [ V.list.li.index() + 1, S.pllength ] );
		return
	}
	
	var cmd_function = {
		  bookmark      : bookmarkNew
		, current       : currentSet
		, directory     : directoryList
		, exclude       : excludeDirectory
		, plrename      : playlistRename
		, pldelete      : playlistDelete
		, remove        : removeFromPlaylist
		, savedpladd    : savedPlaylistAdd
		, savedplremove : savedPlaylistRemove
		, similar       : similarAdd
		, tag           : tagEditor
		, thumbnail     : thumbnail
		, thumbupdate   : thumbnailUpdate
		, update        : updateDirectory
		, wrdelete      : webRadioDelete
		, wrdirdelete   : directoryDelete
		, wrdirrename   : directoryRename
		, wredit        : webRadioEdit
		, wrsave        : webRadioSave
	}
	if ( cmd in cmd_function ) {
		cmd_function[ cmd ]();
		return
	}
	
	/* '' album albumartist artist composer conductor date genre pl wr
	_add
	_addplay
	playnext
	_replace
	_replaceplay
	*/
	if ( [ 'add', 'replace' ].includes( cmd.replace( 'play', '' ) ) ) V.playlisthtml = '';
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
			if ( V.list.singletrack || V.mode.slice( -5 ) === 'radio' ) { // single track
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
					infoReplace( () => playlistLoad( V.list.path, play, replace ) );
				} else {
					playlistLoad( V.list.path, play, replace );
				}
				return
			}
			break;
		case 'playnext':
			V.mpccmd = [ 'mpcaddplaynext', path ];
			break
		case 'wr':
			cmd = cmd.slice( 2 );
			var charset = V.list.li.data( 'charset' );
			if ( charset ) path += '#charset='+ charset
			V.mpccmd = [ 'mpcadd', path ];
			break;
		default: // MODE
			if ( V.list.li.data( 'mode' ) !== 'album' ) { // 1st level
				V.mpccmd = [ 'mpcaddfind', V.mode, V.list.path ];
			} else {                        // next level: mode + album || date/genre: mode + artist + album
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#page-library .lib-path' ).text() ];
				if ( [ 'date', 'genre' ].includes( V.mode ) ) V.mpccmd.push( 'artist', V.list.li.find( '.name' ).text() );
				V.mpccmd.push( 'album', V.list.li.find( '.liname' ).text() );
			}
		break
	}
	V.action = cmd.replace( /album|artist|composer|conductor|date|genre/g, '' ); // add addplay playnext replace replaceplay
	addToPlaylist();
} );
