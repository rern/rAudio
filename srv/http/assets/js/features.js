var setting = {
	spotify : () => {
		if ( S.camilladsp ) {
			info( {
				  ...SW
				, message  : icoLabel( 'DSP', 'camilladsp' ) +' is currently set as output device'
			} );
			return
		}
		
		bash( [ 'confget', 'spotify' ], data => {
			info( {
				  ...SW
				, tablabel     : [ 'Output', 'Client Keys' ]
				, tab          : [ '', setting.spotifyKeys ]
				, list         : [ 'Device', 'select', data.devices ]
				, boxwidth     : 300
				, values       : data.current
				, checkchanged : true
				, ok           : () => {
					bash( [ 'spotifyoutputset', infoVal(), 'CMD OUTPUT' ] );
					notifyCommon();
				}
			} );
		}, 'json' );
		
	}
	, spotifyKeys : () => {
		info( {
			  ...SW
			, tablabel : [ 'Output', 'Client Keys' ]
			, tab      : [ setting.spotify, '' ]
			, message  : 'Remove client <wh>ID</wh> and <wh>Secret</wh> ?'
			, oklabel  : ico( 'remove' ) +'Remove'
			, okcolor  : red
			, ok       : () => {
				bash( [ 'spotifykeyremove' ] );
				notifyCommon( 'Remove keys ...' );
			}
		} );
	}
}
function passwordWrong() {
	bannerHide();
	info( {
		  ...SW
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', S.login );
}
function renderPage() {
	$( '#ap' ).toggleClass( 'disabled', S.wlanconnected );
	$( '#smb' ).toggleClass( 'disabled', S.nfsserver );
	if ( S.nfsconnected || S.shareddata || S.smb ) {
		var nfsdisabled = icoLabel( 'Shared Data', 'networks' ) +' is currently enabled.';
		$( '#nfsserver' ).addClass( 'disabled' );
		if ( S.smb ) {
			nfsdisabled = nfsdisabled.replace( 'Shared Data', 'File Sharing' );
		} else if ( S.nfsserver && S.nfsconnected ) {
			nfsdisabled = 'Currently connected by clients';
		}
		$( '#nfsserver' ).prev().html( nfsdisabled );
	} else {
		$( '#nfsserver' ).removeClass( 'disabled' );
	}
	if ( S.nosound ) {
		$( '#divdsp' ).addClass( 'hide' );
	} else {
		$( '#divdsp' ).removeClass( 'hide' );
		$( '#camilladsp' ).toggleClass( 'disabled', S.equalizer );
		$( '#equalizer' ).toggleClass( 'disabled', S.camilladsp );
	}
	if ( /features$/.test( window.location.href ) ) {
		showContent();
		return
	}
	
	// spotify / scrobble token
	var url   = new URL( window.location.href );
	window.history.replaceState( '', '', '/settings.php?p=features' );
	var token = url.searchParams.get( 'token' );
	var code  = url.searchParams.get( 'code' );
	var error = url.searchParams.get( 'error' );
	if ( token ) {
		bash( [ 'scrobblekey', token, 'CMD TOKEN' ], function( error ) {
			if ( error ) {
				info( {
					  icon    : 'scrobble'
					, title   : 'Scrobbler'
					, message : error
				} );
			} else {
				S.scrobblekey = true;
				showContent();
				$( '#setting-scrobble' ).trigger( 'click' );
			}
		} );
	} else if ( code ) {
		bash( [ 'spotifytoken', code, 'CMD CODE' ], showContent );
	} else if ( error ) {
		infoWarning( 'spotify', 'Spotify', 'Authorization failed:<br>'+ error );
	}
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.screenshot' ).on( 'click', function() {
	info( {
		  icon        : 'spotify'
		, title       : 'Spotify for Developers'
		, message     : '<img src="/assets/img/spotify.gif" style="width: 100%; height: auto; margin-bottom: 0;">'
		, okno        : true
	} );
} );
$( '#setting-dabradio' ).on( 'click', function() {
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : 'Scan DAB radio stations.'
		, ok      : () => {
			bash( [ 'dabscan.sh' ] );
			notify( SW.icon, SW.title, 'Scan ...', 3000 )
		}
	} );
} );
$( '#setting-snapclient' ).on( 'click', function() {
	if ( S.snapserver ) {
		$( '#setting-snapserver' ).trigger( 'click' );
		return
	}
	
	notify( SW.icon, SW.title, 'Search for SnapServer ...' );
	bash( [ 'snapserverip' ], ip => {
		if ( ip ) {
			window.open( 'http://'+ ip +':1780', '_blank' );
		} else {
			delete V.bannerdelay;
			info( {
				  ...SW
				, message : '<a class="helpmenu label">SnapServer<i class="i-snapcast"></i></a> not available.'
			} );
		}
	} );
} );
$( '#setting-spotifyd' ).on( 'click', function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	if ( ! S.spotifyd && S.spotifytoken ) {
		bash( [ 'spotifyd' ] );
		notifyCommon( 'Enable ...' );
	} else if ( S.spotifytoken ) {
		S.camilladsp ? setting.spotifyKeys() : setting.spotify();
	} else {
		if ( navigator.userAgent.includes( 'Firefox' ) ) {
			infoWarning( SW.icon, SW.title, 'Authorization cannot run on <wh>Firefox</wh>.' );
			$( '#spotifyd' ).prop( 'checked', false );
			return
		}
		
		info( {
			  ...SW
			, list        : [
				  [ 'ID',     'text' ]
				, [ 'Secret', 'text' ]
			]
			, footer      : '<wh>ID</wh> and <wh>Secret</wh> from Spotify private app '+ ico( 'help help' )
			, footeralign : 'right'
			, boxwidth    : 320
			, checklength : { 0: 32, 1: 32 }
			, beforeshow  : () => {
				$( '#infoList .help' ).on( 'click', function() {
					$( '.container .help' ).eq( 0 ).trigger( 'click' );
					$( '#infoX' ).trigger( 'click' );
				} );
			}
			, cancel      : switchCancel
			, ok          : () => {
				var infoval = infoVal();
				var id      = infoval[ 0 ];
				var secret  = infoval[ 1 ];
				bash( [ 'spotifykey', btoa( id +':'+ secret ), 'CMD BTOA' ] );
				var data    = {
					  response_type : 'code'
					, client_id     : id
					, scope         : 'user-read-currently-playing user-read-playback-position'
					, redirect_uri  : 'https://rern.github.io/raudio/spotify'
					, state         : window.location.hostname
				}
				window.location = 'https://accounts.spotify.com/authorize?'+ $.param( data );
			}
		} );
	}
} );
$( '#setting-snapserver' ).on( 'click', function() {
	window.open( 'http://'+ S.hostip +':1780', '_blank' );
} );
$( '#setting-ap' ).on( 'click', function() {
	bash( [ 'confget', 'ap', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, footer       : '(8 characters or more)'
			, list         : [
				  [ 'IP',       'text' ]
				, [ 'Password', 'text' ]
			]
			, values       : values
			, checkchanged : S.ap
			, checkblank   : true
			, checkip      : [ 0 ]
			, checklength  : { 1: [ 8, 'min' ] }
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#setting-autoplay' ).on( 'click', function() {
	bash( [ 'confget', 'autoplay', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, list         : [
				  [ 'Bluetooth connected',        'checkbox' ]
				, [ 'Power on <gr>/ Reboot</gr>', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.autoplay
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}, 'json' );
} );
$( '#setting-localbrowser' ).on( 'click', function() {
	bash( [ 'confget', 'localbrowser', 'CMD NAME' ], values => {
		var footer = values.BRIGHTNESS ? ico( 'gear', 'brightness', 'tabindex' ) +'Brightness&emsp;' : '';
		footer    += ico( 'redo', 'reload', 'tabindex' ) +'Reload&emsp;'+ ico( 'screenoff', 'screenoff', 'tabindex' ) +'On/Off';
		info( {
			  ...SW
			, list         : [
				  [ 'Rotation',                  'select', { kv: { Normal: 0, '90° CW': 90, '90° CCW': 270, '180°': 180 }, nosort: true } ]
				, [ 'Zoom <gr>(%)</gr>',         'number', { updn: { step: 5, min: 50, max: 300 } } ]
				, [ 'Screen off <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 60 } } ]
				, [ 'On while play',             'checkbox' ]
				, [ 'Mouse pointer',             'checkbox' ]
			]
			, footer       : footer
			, boxwidth     : 110
			, values       : values
			, checkchanged : S.localbrowser
			, beforeshow   : () => {
				var $onwhileplay = $( '#infoList input:checkbox' ).eq( 0 );
				$onwhileplay.prop( 'disabled', values.SCREENOFF === 0 );
				$( '.infofooter' ).toggleClass( 'hide', ! S.localbrowser || ! values.BRIGHTNESS );
				$( '#infoList tr:eq( 2 )' ).on( 'click', '.updn', function() {
					if ( $( this ).parents( 'td' ).prev().find( 'input' ).val() != 0 ) {
						$onwhileplay.prop( 'disabled', false );
					} else {
						$onwhileplay
							.prop( 'disabled', true )
							.prop( 'checked', false );
					}
				} );
				$( '.infofooter' ).on( 'click', 'input', function() {
					switchCancel();
					info( {
						  ...SW
						, list        : [ 'Brightness', 'range' ]
						, values      : S.brightness
						, beforeshow  : () => {
							$( '#infoList input' ).on( 'input', function() {
								bash( [ 'brightness', val, 'CMD VAL' ] )
							} );
						}
						, okno        : true
					} );
				} ).on( 'click', '#reload', function() {
					bash( [ 'localbrowserreload' ], () => banner( SW.icon, SW.title, 'Reloaded.' ) );
				} ).on( 'click', '#screenoff', function() {
					bash( [ 'screentoggle' ], onoff => banner( SW.icon, SW.title, onoff ) );
				} );
			}
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}, 'json' );
} );
$( '#setting-smb' ).on( 'click', function() {
	bash( [ 'confget', 'smb', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, message      : '<wh>Write</wh> permission:'
			, list         : [
				  [ '<gr>/mnt/MPD/</gr>SD',  'checkbox' ]
				, [ '<gr>/mnt/MPD/</gr>USB', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.smb
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}, 'json' );
} );
$( '#setting-lyrics' ).on( 'click', function() {
	bash( [ 'confget', 'lyrics', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, list         : [
				  [ 'URL',             'text' ]
				, [ 'Start tag',       'text' ]
				, [ '',                '', { suffix: '<gr>Lyrics content ...</gr>' } ]
				, [ 'End tag',         'text' ]
				, [ 'Embedded lyrics', 'checkbox' ]
			]
			, boxwidth     : 300
			, values       : values
			, checkchanged : S.lyrics
			, checkblank   : true
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}, 'json' );
} );
$( '#setting-multiraudio' ).on( 'click', function() {
	bash( [ 'confget', 'multiraudio', 'CMD NAME' ], data => {
		var list = [
			  [ '', '',     { suffix: 'Name', sameline: true } ]
			, [ '', '',     { suffix: 'IP' } ]
		];
		var listname = [ '', 'text', { sameline: true } ];
		var listip   = [ '', 'text' ];
		if ( data ) {
			var keys   = Object.keys( data ).sort();
			var values = [];
			keys.forEach( k => {
				list.push( listname, listip );
				values.push( k, data[ k ] );
			} );
			var iL     = values.length / 2 - 1;
		} else {
			list.push( listname, listip, listname, listip );
			values     = [ S.hostname, S.hostip, '', S.ipsub ];
		}
		function checkIpList( ar ) {
			return [ ...Array( ar.length ).keys() ].filter( ( i, el ) => el % 2 )
		}
		info( {
			  ...SW
			, list         : list
			, boxwidth     : 160
			, values       : values
			, checkblank   : true
			, checkip      : checkIpList( values )
			, checkunique  : true
			, beforeshow   : () => {
				$( '#infoList td:first-child' ).remove();
				$( '#infoList td' ).css( { width: '160px', 'text-align': 'left' } );
				$( '#infoList td:last-child' ).css( 'width', '40px' );
				$( '#infoList tr:first-child td' ).css( 'padding-left', '5px' );
				infoListAddRemove( add => {
					if ( add ) {
						var $last = $( '#infoList input' ).slice( -2 );
						$last.eq( 0 ).val( '' );
						$last.eq( 1 ).val( S.ipsub );
						$last.removeClass( 'disabled' );
						$( '.edit' ).last().removeClass( 'hide' );
					}
					I.checkip = checkIpList( $( '#infoList input' ) );
				} );
				$( '#infoList input' ).filter( ( i, el ) => {
					if ( $( el ).val() === S.hostip ) {
						var $tr = $( el ).parents( 'tr' );
						$tr.find( 'input' ).addClass( 'disabled' );
						$tr.find( 'i' ).addClass( 'hide' );
						$tr.insertAfter( $( '#infoList tr' ).first() );
						return false
					}
				} );
			}
			, cancel       : switchCancel
			, ok           : () => {
				var infoval = infoVal();
				if ( infoval.length < 3 ) {
					if ( S.multiraudio ) {
						notifyCommon( 'Disable ...' );
						bash( [ 'multiraudioreset' ] );
					} else {
						$( '#infoX' ).trigger( 'click' );
					}
					return
				}
				
				var val = {}
				infoval.forEach( ( el, i ) => i % 2 ? val[ name ] = el : name = el );
				keys = Object.keys( val ).sort();
				data = {}
				keys.forEach( k => data[ k ] = val[ k ] );
				notifyCommon();
				jsonSave( 'multiraudio', data );
				bash( [ 'multiraudio' ] );
			}
		} );
	}, 'json' );
} );
$( '#login' ).on( 'click', function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-login' ).trigger( 'click' );
	} else {
		info( {
			  ...SW
			, message    : 'Disable:'
			, list       : [ 'Password', 'password' ]
			, checkblank : true
			, cancel     : switchCancel
			, ok         : () => {
				notifyCommon( false );
				$.post( 'cmd.php', {
					  cmd     : 'login'
					, disable : true
					, pwd     : infoVal()
				}, verified => {
					if ( verified == -1 ) passwordWrong();
				} );
			}
		} );
	}
} );
$( '#setting-login' ).on( 'click', function() {
	info( {
		  ...SW
		, list       : [
			  [ S.login ? 'Existing' : 'Password', 'password' ]
			, [ 'New',                             S.login ? 'password' : 'hidden' ]
			, [ 'Setting pages only',              'checkbox' ]
		]
		, footer     : '(Blank <wh>New</wh> - No password change)'
		, checkblank : [ 0 ]
		, values     : { pwd: '', pwdnew: '', loginsetting: S.loginsetting }
		, cancel     : switchCancel
		, ok         : () => {
			notifyCommon();
			$.post( 'cmd.php', { cmd: 'login', ...infoVal() }, verified => {
				if ( verified == -1 ) passwordWrong();
			} );
		}
	} );
} );
$( '#setting-scrobble' ).on( 'click', function() {
	if ( S.scrobblekey ) {
		bash( [ 'confget', 'scrobble', 'CMD NAME' ], values => {
			info( {
				  ...SW
				, list         : [
					  [ ico( 'airplay' ) +'AirPlay',        'checkbox' ]
					, [ ico( 'bluetooth' ) +'Bluetooth',    'checkbox' ]
					, [ ico( 'spotify' ) +'Spotify',        'checkbox' ]
					, [ ' '+ ico( 'upnp' ) +' UPnP / DLNA', 'checkbox' ]
				]
				, boxwidth     : 170
				, values       : values
				, checkchanged : S.scrobble
				, buttonlabel  : ico( 'remove' ) +'Keys'
				, buttoncolor  : red
				, button       : () => {
					switchCancel();
					info( {
						  icon    : 'scrobble'
						, title   : 'Scrobbler'
						, message : 'Remove authorization?'
						, ok      : () => bash( [ 'scrobblekeyremove' ] )
					} );
				}
				, cancel       : switchCancel
				, ok           : switchEnable
				, fileconf     : true
			} );
		}, 'json' );
	} else {
		info( {
			  ...SW
			, message : 'Open <wh>Last.fm</wh> for authorization?'
			, cancel  : switchCancel
			, ok      : () => { // api account page: https://www.last.fm/api/accounts
				bash( [ 'lastfmkey' ], function( apikey ) {
					location.href =  'http://www.last.fm/api/auth/?api_key='+ apikey +'&cb=https://rern.github.io/raudio/scrobbler?ip='+ location.host;
				} );
			}
		} );
	}
} );
$( '#setting-stoptimer' ).on( 'click', function() {
	bash( [ 'confget', 'stoptimer', 'CMD NAME' ], values => {
		info( {
			  ...SW
			, list         : [
				  [ 'Minutes',           'number', { updn: { step: 5, min: 5, max: 120 } } ]
				, [ 'Power off on stop', 'checkbox' ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.stoptimer
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}, 'json' );
} );
$( '#setting-volumelimit' ).on( 'click', function() {
	bash( [ 'confget', 'volumelimit', 'CMD NAME' ], values => {
		var param = { updn: { step: 1, min: 0, max: 100, enable: true, link: true } }
		info( {
			  ...SW
			, list         : [
				  [ 'Startup default', 'number', param ]
				, [ 'Maximum limit',   'number', param ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.volumelimit
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}, 'json' );
} );

} );
