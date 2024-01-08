function addSimilar() {
	var icon  = 'lastfm';
	var title = 'Add Similar';
	banner( icon +' blink', title, 'Get similar tracks ...', -1 );
	bash( [ 'mpcsimilar', V.list.artist, V.list.name, V.apikeylastfm, 'CMD ARTIST TITLE APIKEY' ], error => {
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
		addToPlaylistCommand();
	}
}
function addToPlaylistCommand() {
	var varaction = '';
	if ( [ 'addplay', 'replace', 'replaceplay' ].includes( V.action ) ) {
		varaction = ' ACTION';
		V.mpccmd.push( V.action );
	}
	var mpccmd0   = V.mpccmd[ 0 ];
	if ( mpccmd0 === 'mpcaddls' ) {
		V.mpccmd.push( 'CMD DIR'+ varaction );
	} else if ( [ 'mpcadd', 'mpcaddload' ].includes( mpccmd0 ) ) {
		V.mpccmd.push( 'CMD FILE'+ varaction );
	} else if ( mpccmd0 === 'mpcaddfind' ) {
		var varlist = 'CMD MODE STRING';
		if ( V.mpccmd.length > 3 ) varlist += ' MODE2 STRING2';
		if ( V.mpccmd.length > 5 ) varlist += ' MODE3 STRING3';
		V.mpccmd.push( varlist + varaction );
	} else if ( mpccmd0 === 'mpcaddplaynext' ) {
		V.mpccmd.push( 'CMD FILE' );
	}
	var cmd_title = {
		  add         : 'Add to Playlist'
		, playnext    : 'Add to Playlist to play next'
		, addplay     : 'Add to Playlist and play'
		, replace     : 'Replace Playlist'
		, replaceplay : 'Replace Playlist and play'
	}
	V.title  = cmd_title[ V.action ];
	V.msg =  '<a class="li1">'+ V.list.name +'</a>';
	if ( V.list.li.find( '.li2' ).length ) V.msg += '<a class="li2">'+ V.list.li.find( '.li2' ).text() +'</a>';
	setTimeout( () => {
		bash( V.mpccmd, () => {
			if ( D.playbackswitch && V.action.slice( -4 ) === 'play' ) $( '#playback' ).trigger( 'click' );
		} );
	}, S.webradio ? 1000 : 0 );
	banner( 'playlist', V.title, V.msg );
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
		, focus      : 0
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
	bash( [ 'mpcskip', V.list.index + 1, 'stop', 'CMD POS ACTION' ] );
}
function directoryList() {
	if ( [ 'album', 'latest' ].includes( V.mode ) ) {
		var path      = V.list.path;
		var query     = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
		var modetitle = path;
		query.gmode   = V.mode;
		V.mode        = path.split( '/' )[ 0 ].toLowerCase();
		list( query, function( html ) {
			var data = {
				  html      : html
				, modetitle : modetitle
				, path      : path
			}
			renderLibraryList( data );
		} );
		query.path      = path;
		query.modetitle = modetitle;
		V.query.push( query );
	} else {
		$( '#lib-list .liinfopath' ).trigger( 'click' );
	}
}
function excludeDirectory() {
	info( {
		  icon    : 'folder-forbid'
		, title   : 'Exclude Directory'
		, message : 'Exclude from Library:'
					+'<br>'+ ico( 'folder' ) +'&ensp;<wh>'+ V.list.path +'</wh>'
		, ok      : () => {
			bash( [ 'ignoredir', V.list.path, 'CMD DIR' ], () => V.list.li.remove() );
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
		  icon    : 'file-playlist'
		, title   : 'Delete Playlist'
		, message : 'Delete?'
				   +'<br><wh>'+ V.list.name +'</wh>'
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => bash( [ 'savedpldelete', V.list.name, 'CMD NAME' ] )
	} );
}
function playlistLoad( name, play, replace ) {
	V.local = true;
	banner( 'file-playlist', name, 'Load ...' );
	bash( [ 'playlist', name, play, replace, 'CMD NAME PLAY REPLACE' ], function() {
		if ( ! S.pllength ) $( '#playback-controls, #playback-controls i' ).removeClass( 'hide' );
	} );
}
function playlistNew( name ) {
	info( {
		  icon         : 'file-playlist'
		, title        : 'Save Playlist'
		, message      : 'Save current playlist as:'
		, list         : [ 'Name', 'text' ]
		, focus        : 0
		, values       : name
		, checkblank   : true
		, ok           : () => playlistSave( infoVal() )
	} );
}
function playlistRename() {
	var name = V.list.name;
	info( {
		  icon         : 'file-playlist'
		, title        : 'Rename Playlist'
		, message      : 'From: <wh>'+ name +'</wh>'
		, list         : [ 'To', 'text' ]
		, focus        : 0
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
		  icon        : 'file-playlist'
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
	saveToPlaylist( V.list.name, album, file );
}
function savedPlaylistRemove() {
	local();
	var plname = $( '#savedpl-path .lipath' ).text();
	bash( [ 'savedpledit', plname, 'remove', V.list.li.index() + 1, 'CMD NAME TYPE POS' ] );
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
	if ( S.updating_db ) {
		infoUpdating();
		return
	}
	
	var name   = [ 'Album', 'AlbumArtist', 'Artist', 'Composer', 'Conductor', 'Genre', 'Date', 'Title', 'Track' ];
	var format = name.map( el => el.toLowerCase() );
	var file   = V.list.path;
	var dir    = dirName( file );
	var cue    = file.slice( -4 ) === '.cue';
	if ( V.list.licover ) format = format.slice( 0, -2 );
	var query = {
		  query  : 'track'
		, file   : file
		, format : format
	}
	list( query, function( values ) {
		name[ 1 ]    = 'Album Artist';
		var list     = [];
		format.forEach( ( el, i ) => {
			list.push( [ '<span class="taglabel gr hide">'+ name[ i ] +'</span> <i class="i-'+ el +' wh" data-mode="'+ el +'"></i>', 'text' ] );
		} );
		if ( V.library ) {
			var $img = V.librarytrack ? $( '.licoverimg img' ) : V.list.li.find( 'img' );
			var src  = $img.length ? $img.attr( 'src' ) : V.coverdefault;
		} else {
			var $img =  V.list.li.find( 'img' );
			var src  = $img.length ? $img.attr( 'src' ).replace( '/thumb.', '/coverart.' ) : V.coverdefault;
		}
		var fileicon = cue ? 'file-music' : 'file-playlist';
		var message  = '<img src="'+ src +'"><a class="tagpath hide">'+ file +'</a>'
					  +'<div>'+ ico( 'folder' ) + file;
		if ( ! V.list.licover ) message += '<br>'+ ico( fileicon ) + file.split( '/' ).pop();
		message     += '</div>';
		var footer   = '<div id="taglabel">'+ ico( 'help i-lg gr' ) +'&emsp;Label</div>';
		if ( V.list.licover ) footer += '<div><c> * </c>&ensp;Various values in tracks</div>';
		info( {
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
				$( '#infoList img' ).on( 'error', function() {
					imageOnError( this );
				} );
				$( '#infoList .infomessage' ).addClass( 'tagmessage' );
				$( '#infoList .infofooter' ).addClass( 'tagfooter' );
				$( '#infoList td i' ).css( 'cursor', 'pointer' );
				if ( V.playlist ) $( '#infoList input' ).prop( 'disabled', 1 );
				var tableW = $( '#infoList table' ).width();
				$( '#infoList' ).on( 'click', '#taglabel', function() {
					if ( $( '.taglabel' ).hasClass( 'hide' ) ) {
						$( '.taglabel' ).removeClass( 'hide' );
						$( '#infoList table' ).width( tableW );
					} else {
						$( '.taglabel' ).addClass( 'hide' );
					}
				} ).on( 'click', 'table i', function() {
					var $this  = $( this );
					var mode   = $this.data( 'mode' );
					if ( [ 'title', 'track' ].includes( mode ) ) return
					
					var string = $this.parent().next().find( 'input' ).val();
					if ( ! string ) return
					
					var query  = {
						  query  : 'find'
						, mode   : mode
						, string : string
						, format : [ 'album', 'artist' ]
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
					
					var query = {
						  query  : 'ls'
						, string : V.library ? file : dir
						, format : [ 'file' ]
					}
					list( query, function( html ) {
						var data = {
							  html      : html
							, modetitle : dir
							, path      : dir
						}
						V.mode = file.split( '/' )[ 0 ].toLowerCase();
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
				bash( [ 'tageditor', ...Object.values( infoval ), 'CMD '+ Object.keys( infoval ).join( ' ' ) ] );
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
function thumbnailUpdate() {
	info( {
		  icon    : 'coverart'
		, title   : 'Album Thumbnails'
		, message : 'Update album thumbnails in:'
					+'<br>'+ ico( 'folder' ) +' <wh>'+ V.list.path +'</wh>'
		, ok      : () => thumbUpdate( V.list.path )
	} );
}
function updateDirectory() {
	if ( V.list.path.slice( -3 ) === 'cue' ) V.list.path = dirName( V.list.path );
	infoUpdate( V.list.path );
}
function webRadioCoverart() {
	if ( V.playback ) {
		var coverart  = S.stationcover || V.coverdefault;
		var mode      = S.icon === 'dabradio' ? 'dabradio' : 'webradio';
		var url       = S.file;
		var name      = S.station;
	} else {
		var $liicon   = V.list.li.find( '.li-icon' );
		var coverart  = $liicon.is( 'img' ) ? $liicon.attr( 'src' ).replace( '-thumb', '' ) : V.coverdefault;
		var mode      = V.mode;
		var pathsplit = V.list.li.find( '.lipath' ).text().split( '//' );
		var url       = pathsplit[ 0 ].replace( /.*\//, '' ) +'//'+ pathsplit[ 1 ];
		var name      = V.list.name;
	}
	var imagefilenoext = '/srv/http/data/'+ mode +'/img/'+ url.replace( /\//g, '|' );
	info( {
		  icon        : 'coverart'
		, title       : ( mode === 'webradio' ? 'Web' : 'DAB' ) +' Radio Cover Art'
		, message     : '<img class="imgold" src="'+ coverart +'" >'
					  + '<p class="infoimgname">'+ name +'</p>'
		, file        : { oklabel: ico( 'flash' ) +'Replace', type: 'image/*' }
		, beforeshow  : () => {
			$( '.imgold' ).on( 'error', function() {
				imageOnError( this );
			} );
			$( '.extrabtn' ).toggleClass( 'hide', coverart === V.coverdefault );
		}
		, buttonlabel : ico( mode ) +'Default'
		, buttoncolor : orange
		, button      : () => bash( [ 'webradiocoverreset', imagefilenoext, 'CMD FILENOEXT' ] )
		, ok          : () => imageReplace( mode, imagefilenoext )
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
			var dir = $( '#lib-path .lipath' ).text();
			bash( ['webradiodelete', dir, url, V.mode, 'CMD DIR URL MODE' ] );
		}
	} );
}
function webRadioSave() {
	webRadioNew( '', V.list.li.find( '.lipath' ).text() );
}
function wrDirectoryDelete() {
	var path = V.list.li.find( '.lipath' ).text();
	info( {
		  icon    : V.mode
		, title   : 'Delete Folder'
		, message : 'Folder:'
					+'<br><wh>'+ path +'</wh>'
		, oklabel : ico( 'remove' ) +'Delete'
		, okcolor : red
		, ok      : () => {
			bash( [ 'wrdirdelete', path, V.mode, 'CMD NAME MODE' ], std => {
				if ( std == -1 ) {
					info( {
						  icon    : 'webradio'
						, title   : 'Web Radio Delete'
						, message : 'Folder not empty:'
									+'<br><wh>'+ path +'</wh>'
									+'<br>Confirm delete?'
						, oklabel : ico( 'remove' ) +'Delete'
						, okcolor : red
						, ok      : () => bash( [ 'wrdirdelete', path, V.mode, true, 'CMD NAME MODE CONFIRM' ] )
					} );
				}
			} );
		}
	} );
}
function wrDirectoryRename() {
	var path = V.list.li.find( '.lipath' ).text().split( '/' );
	var name = path.pop();
	var path = path.join( '/' );
	info( {
		  icon         : V.mode
		, title        : 'Rename Folder'
		, list         : [ 'Name', 'text' ]
		, focus        : 0
		, values       : name
		, checkblank   : true
		, checkchanged : true
		, oklabel      : 'Rename'
		, ok           : () => bash( [ 'wrdirrename', V.mode +'/'+ path, name, infoVal(), 'CMD MODE NAME NEWNAME' ] )
	} );
}
var listwebradio = {
	  list : [
		  [ 'Name',    'text' ]
		, [ 'URL',     'text' ]
		, [ 'Charset', 'text' ]
		, [ '',        '', '<a id="addwebradiodir">'+ ico( 'folder-plus i-lg' ) +'&ensp;New folder&ensp;</a>' ]
	]
	, help : '&emsp;<a href="https://www.iana.org/assignments/character-sets/character-sets.xhtml" target="_blank">'+ ico( 'help i-lg gr' ) +'</a>'
	, fn   : () => {
		$( '#infoList input' ).last()
			.css( 'width', '230px' )
			.after( listwebradio.help );
	}
}
function webRadioEdit() {
	var url  = V.list.path;
	var rprf = url.includes( 'stream.radioparadise.com' ) || url.includes( 'icecast.radiofrance.fr' );
	info( {
		  icon         : 'webradio'
		, title        : 'Edit Web Radio'
		, message      : '<img src="'+ ( V.list.li.find( 'img' ).attr( 'src' ) || V.coverdefault ) +'">'
		, list         : rprf ? listwebradio.list.slice( 0, 2 ) : listwebradio.list.slice( 0, -1 )
		, values       : [ V.list.name, url, V.list.li.data( 'charset' ) || 'UTF-8' ]
		, checkchanged : true
		, checkblank   : [ 0, 1 ]
		, boxwidth     : 'max'
		, beforeshow   : rprf ? '' : listwebradio.fn
		, oklabel      : ico( 'save' ) +'Save'
		, ok           : () => {
			var dir     = $( '#lib-path .lipath' ).text();
			var values  = infoVal();
			var name    = values[ 0 ];
			var newurl  = values[ 1 ];
			var charset = values[ 2 ].replace( /UTF-8|iso *-*/, '' );
			bash( [ 'webradioedit', dir, name, newurl, charset, url, 'CMD DIR NAME NEWURL CHARSET URL' ], error => {
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
			listwebradio.fn()
			if ( $( '#lib-path .lipath' ).text() ) {
				$( '#addwebradiodir' ).remove();
			} else {
				$( '#addwebradiodir' ).on( 'click', function() {
					info( {
						  icon       : 'webradio'
						, title      : 'Add New Folder'
						, list       : [ 'Name', 'text' ]
						, checkblank : true
						, cancel     : () => $( '.button-webradio-new' ).trigger( 'click' )
						, ok         : () => bash( [ 'wrdirnew', $( '#lib-path .lipath' ).text(), infoVal(), 'CMD DIR SUB' ] )
					} );
				} );
			}
			if ( V.playlist ) $( '#infoList input' ).eq( 1 ).prop( 'disabled', true );
		}
		, ok         : () => {
			var values  = infoVal();
			var name    = values[ 0 ];
			var url     = values[ 1 ];
			var charset = values[ 2 ].replace( /UTF-8|iso *-*/, '' );
			var dir     = $( '#lib-path .lipath' ).text();
			if ( [ 'm3u', 'pls' ].includes( url.slice( -3 ) ) ) banner( 'webradio blink', 'Web Radio', 'Add ...', -1 );
			bash( [ 'webradioadd', dir, name, url, charset, 'CMD DIR NAME URL CHARSET' ], error => {
				if ( error ) webRadioExists( error, name, url, charset );
				bannerHide();
			} );
		}
	} );
}
//----------------------------------------------------------------------------------------------
$( '.contextmenu a, .contextmenu .submenu' ).on( 'click', function() {
	var $this = $( this );
	var cmd   = $this.data( 'cmd' );
	menuHide();
	$( 'li.updn' ).removeClass( 'updn' );
	
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
		, thumb         : thumbnailUpdate
		, update        : updateDirectory
		, wrcoverart    : webRadioCoverart
		, wrdelete      : webRadioDelete
		, wrdirdelete   : wrDirectoryDelete
		, wrdirrename   : wrDirectoryRename
		, wredit        : webRadioEdit
		, wrsave        : webRadioSave
	}
	if ( cmd in cmd_function ) {
		cmd_function[ cmd ]();
		return
	}
	if ( [ 'play', 'pause', 'stop' ].includes( cmd ) ) {
		$( '#pl-list li' ).eq( V.list.li.index() ).trigger( 'click' );
		$( '#'+ cmd ).trigger( 'click' );
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
	if ( V.mode.slice( -5 ) === 'radio' ) {
		var pathsplit = path.split( '//' );
		path = pathsplit[ 0 ].replace( /.*\//, '' ) +'//'+ pathsplit[ 1 ];
	}
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
				V.mpccmd = V.savedpltrack ? [ 'mpcadd', path ] : [ 'mpcaddls', path ];
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
					infoReplace( () => playlistLoad( path, play, replace ) );
				} else {
					playlistLoad( path, play, replace );
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
				V.mpccmd = [ 'mpcaddfind', V.mode, $( '#lib-path .lipath' ).text() ];
				if ( [ 'date', 'genre' ].includes( V.mode ) ) V.mpccmd.push( 'artist', V.list.li.find( '.name' ).text() );
				V.mpccmd.push( 'album', V.list.li.find( '.liname' ).text() );
			}
		break
	}
	V.action = cmd.replace( /album|artist|composer|conductor|date|genre/g, '' ); // add addplay playnext replace replaceplay
	addToPlaylist();
} );
