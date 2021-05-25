function addReplace( command, title ) {
	bash( command, function() {
		if ( G.playbackswitch ) $( '#tab-playback' ).click();
		G.playbackswitch = 0;
	} );
	if ( G.list.li.hasClass( 'licover' ) ) {
		var msg = G.list.li.find( '.lialbum' ).text()
				+'<a class="li2">'+ G.list.li.find( '.liartist' ).text() +'</a>';
	} else if ( G.list.li.find( '.li1' ).length ) {
		var msg = G.list.li.find( '.li1' )[ 0 ].outerHTML
				+ G.list.li.find( '.li2' )[ 0 ].outerHTML;
		msg = msg.replace( '<bl>', '' ).replace( '</bl>', '' );
	} else {
		var msg = G.list.li.find( '.lipath' ).text() || G.list.li.find( '.liname' ).text();
	}
	banner( title, msg, 'list-ul' );
}
function bookmarkNew() {
	// #1 - track list - show image from licover
	// #2 - dir list   - show image from server
	// #3 - no cover   - icon + directory name
	var path = G.list.path;
	if ( path.slice( -4 ) === '.cue' ) path = path.substring( 0, path.lastIndexOf( '/' ) );
	var $el = $( '.mode-bookmark' );
	if ( $el.length ) {
		var $exist = $el.filter( function() {
			return $( this ).find( '.lipath' ).text() === path;
		} );
		if ( $exist.length ) {
			if ( $exist.find( '.fa-bookmark' ).length ) {
				var msghtml = '<i class="fa fa-bookmark bookmark"></i>'
							  +'<br><a class="bklabel">'+ $exist.find( '.bklabel' ).text() +'</a>'
							  +'<br>'+ path;
			} else {
				var msghtml = '<img src="'+ $exist.find( 'img' ).attr( 'src' ) +'">'
							  +'<br><w>'+ path +'</w>';
			}
			info( {
				  icon    : 'bookmark'
				, title   : 'Add Bookmark'
				, message : msghtml
							+'<br><br>Already exists.'
			} );
			return
		}
	}
	
	if ( G.list.licover ) {
		if ( $( '.licover img' ).attr( 'src' ).slice( -3 ) !== 'svg' ) {
			bookmarkThumb( path, $( '.licover img' ).attr( 'src' ) );
		} else {
			bookmarkIcon( path );
		}
	} else if ( G.list.li.find( '.iconthumb' ).length ) {
		var ext = G.list.li.find( '.iconthumb' ).attr( 'src' ).slice( -3 );
		bookmarkThumb( path, '/mnt/MPD/'+ encodeURI( path ) +'/coverart.'+ ext );
	} else {
		bash( [ 'bookmarkthumb', path ], function( ext ) {
			if ( ext ) {
				bookmarkThumb( path, '/mnt/MPD/'+ encodeURI( path ) +'/coverart.'+ ext );
			} else {
				bookmarkIcon( path );
			}
		} );
	}
}
function bookmarkIcon( path ) {
	info( {
		  icon         : 'bookmark'
		, title        : 'Add Bookmark'
		, width        : 500
		, message      : '<i class="fa fa-bookmark bookmark"></i>'
						+'<br>'
						+'<br><w>'+ path +'</w>'
						+'<br>As:'
		, values       : path.split( '/' ).pop()
		, textrequired : [ 0 ]
		, boxwidth     : 'max'
		, ok           : function() {
			$.post( cmdphp, {
				  cmd  : 'bookmark'
				, path : path
				, name : infoVal()
			} );
			banner( 'Bookmark Added', path, 'bookmark' );
		}
	} );
}
function bookmarkThumb( path, coverart ) {
	info( {
		  icon    : 'bookmark'
		, title   : 'Add Bookmark'
		, message : '<img src="'+ coverart +'">'
				   +'<br><w>'+ path +'</w>'
		, ok      : function() {
			$.post( cmdphp, {
				  cmd  : 'bookmark'
				, path : path
			} );
			banner( 'Bookmark Added', path, 'bookmark' );
		}
	} );
}
function infoReplace( callback ) {
	info( {
		  icon    : 'list-ul'
		, title   : 'Playlist Replace'
		, message : 'Replace current playlist?'
		, ok      : callback
	} );
}
function playlistSave( name, oldname ) {
	if ( oldname ) {
		bash( [ 'plrename', oldname, name ] );
	} else {
		list( { cmd: 'save', name: name }, function( data ) {
			if ( data == -1 ) {
				info( {
					  icon        : 'list-ul'
					, title       : oldname ? 'Rename Playlist' : 'Save Playlist'
					, message     : '<i class="fa fa-warning fa-lg"></i> <w>'+ name +'</w>'
								   +'<br>Already exists.'
					, buttonlabel : '<i class="fa fa-arrow-left"></i>Back'
					, button      : playlistNew
					, oklabel     : '<i class="fa fa-flash"></i>Replace'
					, ok          : function() {
						oldname ? playlistSave( name, oldname ) : playlistSave( name );
					}
				} );
			} else {
				G.status.playlists++;
				banner( 'Playlist Saved', name, 'list-ul' );
				$( '#button-pl-open' ).removeClass( 'disable' );
			}
		} );
	}
}
function playlistDelete() {
	info( {
		  icon    : 'list-ul'
		, title   : 'Delete Playlist'
		, message : 'Delete?'
				   +'<br><w>'+ G.list.name +'</w>'
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : red
		, ok      : function() {
			G.status.playlists--;
			if ( G.status.playlists ) {
				G.list.li.remove();
				$( '#pl-savedlist-count' ).text( G.status.playlists );
			} else {
				$( '#tab-playlist' ).click();
			}
			list( { cmd: 'delete', name: G.list.name } );
		}
	} );
}
function playlistLoad( path, play, replace ) {
	G.local = 1;
	banner( 'Saved Playlist', 'Load ...', 'list-ul blink', -1 );
	list( {
		  cmd     : 'load'
		, name    : path
		, play    : play
		, replace : replace
	}, function( data ) {
		G.local = 0;
		G.status.playlistlength = +data;
		G.savedlist = 0;
		banner( ( replace ? 'Playlist Replaced' : 'Playlist Added' ), 'Done', 'list-ul' );
	} );
}
function playlistNew() {
	info( {
		  icon         : 'list-ul'
		, title        : 'Save Playlist'
		, message      : 'Save current playlist as:'
		, textlabel    : 'Name'
		, textrequired : [ 0 ]
		, boxwidth     : 'max'
		, ok           : function() {
			playlistSave( infoVal() );
		}
	} );
}
function playlistRename() {
	var name = G.list.name;
	info( {
		  icon         : 'list-ul'
		, title        : 'Rename Playlist'
		, message      : 'Rename:'
						+'<br><w>'+ name +'</w>'
						+'<br>To:'
		, boxwidth     : 'max'
		, values       : name
		, checkchanged : 1
		, textrequired : [ 0 ]
		, oklabel      : '<i class="fa fa-flash"></i>Rename'
		, ok           : function() {
			var newname = infoVal();
			playlistSave( newname, name );
			G.list.li.find( '.plname' ).text( newname );
		}
	} );
}
function tagEditor() {
	var file = G.list.path;
	var cue = file.slice( -4 ) === '.cue';
	var format = [ 'album', 'albumartist', 'artist', 'composer', 'conductor', 'genre', 'date' ];
	var name = [ 'Album', 'AlbumArtist', 'Artist', 'Composer', 'Conductor', 'Genre', 'Date', 'Title', 'Track' ];
	var fL = format.length;
	if ( !G.list.licover ) {
		if ( !cue ) {
			format.push( 'title', 'track' );
		} else {
			format = [ 'artist', 'title', 'track' ];
		}
	}
	var query = {
		  query  : 'track'
		, file   : file
		, format : format
	}
	if ( cue ) query.track = G.list.track || 'cover';
	if ( G.playlist ) query.coverart = 1;
	list( query, function( values ) {
		if ( G.playlist ) {
			values.forEach( function( v, i ) {
				if ( v === '' ) {
					format.splice( i, 1 );
					name.splice( i, 1 );
					values.splice( i, 1 );
				}
			} );
		}
		var mode, tagtextW, label = [];
		format.forEach( function( el, i ) {
			mode = el
			label.push( '<span class="tagname gr hide">'+ name[ i ] +'</span> <i class="tagicon fa fa-'+ el +' wh" data-mode="'+ el +'"></i>' );
		} );
		var filepath = '<span class="tagpath"><ib>'+ file.replace( /\//g, '</ib>/<ib>' ) +'</ib></span>';
		var fileicon = cue ? 'file-playlist' : ( G.list.licover ? 'folder' : 'file-music' );
		if ( G.library ) {
			var $img = $( '.licover' ).length ? $( '.licoverimg img' ) : G.list.li.find( 'img' );
		} else {
			var $img =  G.list.li.find( 'img' );
		}
		var message = '<img src="'+ ( $img.length ? $img.attr( 'src' ) : G.coverdefault ) +'"><br>'
					 +'<i class="fa fa-'+ fileicon +' wh"></i> '+ filepath;
		var footer = '';
		if ( G.list.licover ) footer += '<code>*</code>&ensp;Various values<br>';
		footer += 'Tap icons: Browse by that mode - value';
		footer += '<br><span id="tagname"><i class="fa fa-question-circle fa-lg wh"></i>&ensp;Tag names</span>';
		info( {
			  icon         : G.playlist ? 'info-circle' : 'tag'
			, title        : G.playlist ? 'Track Info' : 'Tag Editor'
			, width        : 500
			, message      : message
			, msgalign     : 'left'
			, footer       : footer
			, textlabel    : label
			, boxwidth     : 'max'
			, preshow      : function() {
				$( '#infoOverlay' ).css( 'visiblity', 'hidden' );
				$( '#infoOverlay, .tagname' ).removeClass( 'hide' );
				tagtextW = $( '#infoContent td:eq( 0 )' ).width() - 30;
				$( '#infoOverlay' ).css( 'visiblity', '' );
				$( '#infoOverlay, .tagname' ).addClass( 'hide' );
			}
			, values       : values
			, checkchanged : 1
			, postshow      : function() {
				var $text = $( '#infoContent input' );
				$( '.infomessage' )
					.css( 'width', 'calc( 100% - 40px )' )
					.find( 'img' ).css( 'margin', 0 );
				$( '.infomessage' ).click( function() {
					if ( G.library ) return
					
					G.mode = 'file';
					var path = $( '.tagpath' ).text();
					path = path.substr( 0, path.lastIndexOf( '/' ) );
					var query = {
						  query  : 'ls'
						, string : path
						, format : [ 'file' ]
					}
					list( query, function( data ) {
						data.path = path;
						data.modetitle = path;
						$( '#infoX' ).click();
						$( '#tab-library' ).click();
						renderLibraryList( data );
					}, 'json' );
				} );
				setTimeout( function() {
					var boxW = parseInt( $text.css( 'width' ) );
					var boxS = boxW - tagtextW;
					$( '.infofooter' ).on( 'click', '#tagname', function() {
						if ( $( '.tagname' ).hasClass( 'hide' ) ) {
							$( '.tagname' ).removeClass( 'hide' );
							$text.css( 'width', boxS );
						} else {
							$( '.tagname' ).addClass( 'hide' );
							$text.css( 'width', boxW );
						}
					} );
				}, 600 );
				var $td = $( '#infoContent td:first-child' );
				$td.click( function() {
					var mode = $( this ).find( 'i' ).data( 'mode' );
					if ( [ 'title', 'track' ].indexOf( mode ) !== -1 ) {
						if ( G.library ) {
							banner( 'Browse Mode', 'Already here', 'library' );
							$( '#infoX' ).click();
						} else {
							$td.find( '.fa-album' ).click();
						}
						return
					}
					
					var path = $text.eq( $( this ).parents( 'tr' ).index() ).val();
					if ( !path || ( G.library && mode === 'album' ) ) {
						banner( 'Browse Mode', 'Already here', 'library' );
						$( '#infoX' ).click();
						return
					}
					
					if ( mode !== 'album' ) {
						var query = {
							  query  : 'find'
							, mode   : mode
							, string : path
							, format : [ 'genre', 'composer', 'conductor', 'date' ].indexOf( mode ) !== -1 ? [ 'album', 'artist' ] : [ 'album' ]
						}
					} else {
						if ( G.library ) {
							$( '#infoX' ).click();
							return
						}
						
						var albumartist = $text.eq( 1 ).val();
						var artist = $text.eq( 2 ).val();
						var query = {
							  query  : 'find'
							, mode   : [ 'album', albumartist ? 'albumartist' : 'artist' ]
							, string : [ path, albumartist || artist ]
						}
					}
					G.mode = mode;
					query.path = path;
					query.modetitle = mode.toUpperCase() +'<gr> • </gr><wh>'+ path +'</wh>';
					if ( G.library ) {
						G.query.push( query );
					} else {
						$( '#tab-library' ).click();
						G.query = [ 'playlist', 'playlist', query ];
					}
					list( query, function( data ) {
						data.path = path;
						data.modetitle = mode.toUpperCase();
						if ( mode !== 'album' ) {
							data.modetitle += '<gr> • </gr><wh>'+ path +'</wh>';
						} else { // fix - no title from playlist
							$( '#lib-breadcrumbs' ).html( '<i class="fa fa-album"></i> <span id="mode-title">ALBUM</span>' );
						}
						$( '#infoX' ).click();
						renderLibraryList( data );
					}, 'json' );
				} );
			}
			, nobutton     : G.playlist
			, nofocus      : 1
			, ok           : function() {
				var tag = [ 'cmd-tageditor.sh', file, G.list.licover, cue ];
				var values = infoVal();
				var val;
				values.forEach( function( v, i ) {
					val = v === value[ i ] ? '' : ( v || -1 );
					tag.push( val );
				} );
				banner( 'Tag Editor', 'Change tags ...', 'tag blink', -1 );
				setTimeout( function() {
					banner( 'Tag Editor', 'Update Library ...', 'tag blink' );
				}, 3000 );
				$.post( 'cmd.php', { cmd: 'sh', sh: tag } );
			}
		} );
		loader( 'hide' );
	}, 'json' );
}
function webRadioCoverart() {
	var path = G.library ? G.list.path : G.status.file;
	var radiopath = '/data/webradiosimg/'+ path.replace( /\//g, '|' );
	var imagefile = '/srv/http'+ radiopath; //no ext
	var infojson = {
		  icon        : 'coverart'
		, title       : 'WebRadio CoverArt'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, ok          : function() {
			imageReplace( imagefile, 'webradio' );
		}
	}
	if ( ( G.playback && $( '#vu' ).hasClass( 'hide' ) )
		|| ( G.library && !G.list.li.find( '.lib-icon' ).hasClass( 'fa' ) )
	) {
		infojson.buttonlabel = '<i class="fa fa-webradio"></i>Default';
		infojson.buttoncolor = orange;
		infojson.button      = function() {
			bash( [ 'coverartradioreset', imagefile ] );
		}
	}
	var coverart = G.playback
					? G.status.coverartradio || G.coverdefault
					: G.list.li.find( '.lib-icon' ).attr( 'src' ) || G.coverdefault;
	infojson.message = '<img class="imgold" src="'+ coverart +'" >';
	infojson.message += '<p class="imgname"><w>'+ name +'</w></p>';
	info( infojson );
}
function webRadioDelete() {
	var name = G.list.name;
	var img = G.list.li.find( 'img' ).attr( 'src' ) || G.coverdefault;
	var url = G.list.path;
	var urlname = url.toString().replace( /\//g, '|' );
	info( {
		  icon    : 'webradio'
		, title   : 'Delete WebRadio'
		, width   : 500
		, message : '<br><img src="'+ img +'">'
				   +'<br><w>'+ name +'</w>'
				   +'<br>'+ url
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : red
		, ok      : function() {
			G.list.li.remove();
			if ( !$( '#lib-list li' ).length ) $( '#button-library' ).click();
			bash( ['webradiodelete', url ] );
		}
	} );
}
function webRadioEdit() {
	var name = G.list.name;
	var img = G.list.li.find( 'img' ).attr( 'src' ) || G.coverdefault;
	var url = G.list.path;
	var urlname = url.toString().replace( /\//g, '|' );
	info( {
		  icon         : 'webradio'
		, title        : 'Edit WebRadio'
		, width        : 500
		, message      : '<img src="'+ img +'">'
		, textlabel    : [ 'Name', 'URL' ]
		, values       : [ name, url ]
		, checkchanged : 1
		, textrequired : [ 0, 1 ]
		, boxwidth     : 'max'
		, oklabel      : '<i class="fa fa-save"></i>Save'
		, ok           : function() {
			var values = infoVal();
			var newname = values[ 0 ];
			var newurl = values[ 1 ].toString().replace( /\/\s*$/, '' ); // omit trailling / and space
			bash( [ 'webradioedit', url, newname, newurl ], function( data ) {
				data ? webRadioExists( data, url ) : $( '#mode-webradio' ).click();
			} );
		}
	} );
}
function webRadioExists( data, url ) {
	var nameimg = data.split( "\n" );
	var newname = nameimg[ 0 ].split( '^^' )[ 0 ];
	info( {
		  icon    : 'webradio'
		, title   : 'Add WebRadio'
		, message : ( nameimg[ 2 ] ? '<img src="'+ nameimg[ 2 ] +'">' : '<i class="fa fa-webradio bookmark"></i>' )
				   +'<br>'+ newname
				   +'<br><br>URL: <w>'+ url +'</w>'
				   +'<br>Already exists.'
		, ok      : function() {
			webRadioNew( newname, url );
		}
	} );
}
function webRadioNew( name, url ) {
	info( {
		  icon         : 'webradio'
		, title        : 'Add WebRadio'
		, width        : 500
		, message      : 'Add new WebRadio:'
		, textlabel    : [ 'Name', 'URL' ]
		, values       : [ ( name || '' ), ( url || '' ) ]
		, textrequired : [ 0, 1 ]
		, footer       : '( Some <code>*.m3u</code> or <code>*.pls</code> might be applicable )'
		, boxwidth     : 'max'
		, ok           : function() {
			var values = infoVal();
			var newname = values[ 0 ].toString().replace( /\/\s*$/, '' ); // omit trailling / and space
			var url = values[ 1 ];
			bash( [ 'webradioadd', newname, url ], function( data ) {
				if ( data == -1 ) {
					info( {
						  icon    : 'webradio'
						, title   : 'Add WebRadio'
						, message : '<wh>'+ url +'</wh><br>contains no valid URL.'
						, ok      : function() {
							webRadioNew( newname, url );
						}
					} );
				} else if ( data ) {
					webRadioExists( data, url );
				}
				bannerHide();
			} );
			if ( [ 'm3u', 'pls' ].indexOf( url.slice( -3 ) ) ) banner( 'WebRadio', 'Add ...', 'webradio blink',  -1 );
		}
	} );
}
function webRadioSave( url ) {
	info( {
		  icon         : 'webradio'
		, title        : 'Save WebRadio'
		, message      : url
		, textlabel    : 'Name'
		, textrequired : [ 0 ]
		, ok           : function() {
			G.local = 1;
			var newname = infoVal().toString().replace( /\/\s*$/, '' ); // omit trailling / and space
			bash( [ 'webradioadd', newname, url ], function() {
				G.list.li.find( '.liname, .radioname' ).text( newname );
				G.list.li.find( '.li2 .radioname' ).append( ' • ' );
				G.list.li.find( '.savewr' ).remove();
				G.list.li.removeClass( 'notsaved' );
				G.local = 0;
			} );
		}
	} );
}
//----------------------------------------------------------------------------------------------
$( '.contextmenu a, .contextmenu .submenu' ).click( function() {
	var $this = $( this );
	var cmd = $this.data( 'cmd' );
	$( '.menu' ).addClass( 'hide' );
	$( 'li.updn' ).removeClass( 'updn' );
	// playback //////////////////////////////////////////////////////////////
	if ( [ 'play', 'pause', 'stop' ].indexOf( cmd ) !== -1 ) {
		if ( cmd === 'play' ) {
			if ( G.status.player !== 'mpd' ) {
				$( '#stop' ).click();
				G.status.player = 'mpd';
			}
			$( '#pl-list li' ).eq( G.list.li.index() ).click();
		} else {
			$( '#'+ cmd ).click();
		}
		return
	}
	
	switch ( cmd ) {
		case 'current':
			bash( [ 'plcurrent', G.list.index + 1 ] );
			return
		case 'exclude':
			info( {
				  icon    : 'folder-forbid'
				, title   : 'Exclude Directory'
				, message : 'Exclude from Library:'
							+'<br><i class="fa fa-folder"></i>&ensp;<wh>'+ G.list.path +'</wh>'
				, ok      : function() {
					bash( [ 'ignoredir', G.list.path ], function() {
						G.list.li.remove();
					} );
					var dir = G.list.path.split( '/' ).pop();
				}
			} );
			return
		case 'remove':
			G.contextmenu = 1;
			setTimeout( function() { G.contextmenu = 0 }, 500 );
			plRemove( G.list.li );
			return
		case 'savedpladd':
			info( {
				  icon    : 'list-ul'
				, title   : 'Add to playlist'
				, message : 'Open target playlist to add:'
						   +'<br><w>'+ G.list.name +'</w>'
				, ok      : function() {
					G.pladd.index = G.list.li.index();
					G.pladd.name = G.list.name;
					$( '#button-pl-open' ).click();
				}
			} );
			return
		case 'savedplremove':
			var plname = $( '#pl-path .lipath' ).text();
			list( {
				  cmd    : 'edit'
				, name   : plname
				, remove : G.list.li.index()
			} );
			G.list.li.remove();
			return
		case 'similar':
			banner( 'Playlist - Add Similar', 'Fetch similar list ...', 'lastfm blink', -1 );
			var url = 'http://ws.audioscrobbler.com/2.0/?method=track.getsimilar'
					+'&artist='+ encodeURI( G.list.artist )
					+'&track='+ encodeURI( G.list.name )
					+'&api_key='+ G.apikeylastfm
					+'&format=json'
					+'&autocorrect=1';
			$.post( url, function( data ) {
				var title = 'Playlist - Add Similar';
				var addplay = $this.hasClass( 'submenu' ) ? 1 : 0;
				if ( 'error' in data || !data.similartracks.track.length ) {
					banner( title, 'Track not found.', 'lastfm' );
				} else {
					var val = data.similartracks.track;
					var iL = val.length;
					var similar = addplay ? 'addplay\n0\n' : '';
					for ( i = 0; i < iL; i++ ) {
						similar += val[ i ].artist.name +'\n'+ val[ i ].name +'\n';
					}
					banner( title, 'Find similar tracks from Library ...', 'library blink',  -1 );
					bash( [ 'plsimilar', similar ], function( count ) {
						getPlaylist();
						setButtonControl();
						banner( title, count +' tracks added.', 'library' );
						if ( addplay && G.display.playbackswitch ) $( '#tab-playback' ).click();
					} );
				}
			}, 'json' );
			return
		case 'tag':
			tagEditor();
			return
		case 'tagcd':
			var discid = G.list.li.data( 'discid' );
			var artist = G.list.li.find( '.artist' ).text();
			var album = G.list.li.find( '.album' ).text();
			var title = G.list.li.find( '.name' ).text();
			var time = G.list.li.find( '.time' ).data( 'time' );
			var track = G.list.li.find( '.track' ).text() ;
			var src = G.list.li.find( 'img' ).attr( 'src' ) || G.coverdefault;
			var values = [ artist, album, title ];
			info( {
				  icon         : 'audiocd'
				, title        : 'Audio CD Tag Editor'
				, message      : '<img src="'+ src +'">'
								+'<br># '+ track +' &bull; '+ second2HMS( time )
				, msgalign     : 'left'
				, textlabel    : [ '<i class="fa fa-artist"></i>', '<i class="fa fa-album"></i>', '<i class="fa fa-music"></i>' ]
				, boxwidth     : 'max'
				, values       : values
				, checkchanged : 1
				, ok           : function() {
					var values = infoVal();
					var data = values.join( '^' ) +'^'+ time;
					data = data.replace( /'/g, "\\'" );
					bash( [ 'audiocdtag', track, data, discid ] );
					banner( 'Audio CD', 'Tag Changed', 'audiocd' );
				}
			} );
			return
		case 'thumb':
			info( {
				  icon    : 'coverart'
				, title   : 'Album Thumbnails'
				, message : 'Update album thumbnails in:'
							+'<br><i class="fa fa-folder"></i> <wh>'+ G.list.path +'</wh>'
				, ok      : function() {
					thumbUpdate( G.list.path );
				}
			} );
			return
		case 'update':
			if ( G.list.path.slice( -3 ) === 'cue' ) G.list.path = G.list.path.substr( 0, G.list.path.lastIndexOf( '/' ) )
			infoUpdate( G.list.path );
			return
		case 'wrsave':
			webRadioSave( G.list.li.find( '.lipath' ).text() );
			return
	}
	
	// functions with dialogue box ////////////////////////////////////////////
	var contextFunction = {
		  bookmark   : bookmarkNew
		, plrename   : playlistRename
		, pldelete   : playlistDelete
		, wrcoverart : webRadioCoverart
		, wrdelete   : webRadioDelete
		, wredit     : webRadioEdit
	}
	if ( cmd in contextFunction ) {
		contextFunction[ cmd ]();
		return
	}
	
	// replaceplay|replace|addplay|add //////////////////////////////////////////
	var webradio = G.list.path.slice( 0, 4 ) === 'http';
	var path = G.list.path;
	var mpccmd;
	// must keep order otherwise replaceplay -> play, addplay -> play
	var mode = cmd.replace( /replaceplay|replace|addplay|add/, '' );
	switch( mode ) {
		case '':
			if ( path.slice( -4 ) === '.cue' ) {
				if ( G.list.track ) { // only cue has data-track
					// individual with 'mpc --range=N load file.cue'
					mpccmd = [ 'plloadrange', ( G.list.track - 1 ), path ];
				} else {
					mpccmd = [ 'plload', path ];
				}
			} else if ( G.list.singletrack || webradio ) { // single track
				mpccmd = [ 'pladd', path ];
			} else if ( $( '.licover' ).length && !$( '.licover .lipath' ).length ) {
				mpccmd = [ 'plfindadd', 'multi', G.mode, path, 'album', G.list.album ];
			} else { // directory or album
				mpccmd = [ 'plls', path ];
			}
			break;
		case 'wr':
			cmd = cmd.slice( 2 );
			mpccmd = [ 'pladd', path ];
			break;
		case 'pl':
			cmd = cmd.slice( 2 );
			if ( G.library ) {
				mpccmd = [ 'plload', path ];
			} else { // saved playlist
				var play = cmd.slice( -1 ) === 'y' ? 1 : 0;
				var replace = cmd.slice( 0, 1 ) === 'r' ? 1 : 0;
				if ( replace && G.display.plclear && G.status.playlistlength ) {
					infoReplace( function() {
						playlistLoad( path, play, replace );
					} );
				} else {
					playlistLoad( path, play, replace );
				}
				return
			}
			break;
		default:
			if ( !G.list.name ) {
				mpccmd = [ 'plfindadd', mode, path ];
				if ( G.list.artist ) mpccmd.push( 'artist', G.list.artist );
			} else {
				mpccmd = [ 'plfindadd', 'multi', G.mode, $( '#mode-title' ).text(), 'album', G.list.name ];
			}
	}
	if ( !mpccmd ) mpccmd = [];
	var sleep = webradio ? 1 : 0.2;
	var contextCommand = {
		  add         : mpccmd
		, addplay     : mpccmd.concat( [ 'addplay', sleep ] )
		, replace     : mpccmd.concat(  'replace' )
		, replaceplay : mpccmd.concat( [ 'replaceplay', sleep ] )
	}
	cmd = cmd.replace( /albumartist|album|artist|composer|conductor|genre|date/, '' );
	var command = contextCommand[ cmd ];
	var addreplaceplay = cmd === 'addplay' || cmd === 'replaceplay';
	if ( G.status.player !== 'mpd' && addreplaceplay ) {
		$( '#stop' ).click();
		G.status.player = 'mpd';
	}
	if ( G.display.playbackswitch && addreplaceplay ) G.playbackswitch = 1;
	if ( [ 'add', 'addplay' ].indexOf( cmd ) !== -1 ) {
		var title = 'Add to Playlist'+ ( cmd === 'add' ? '' : ' and play' )
		addReplace( command, title );
	} else {
		var title = 'Replace playlist'+ ( cmd === 'replace' ? '' : ' and play' );
		if ( G.display.plclear && G.status.playlistlength ) {
			infoReplace( function() {
				addReplace( command, title );
			} );
		} else {
			addReplace( command, title );
		}
	}
} );
