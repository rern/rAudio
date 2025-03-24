/*
switch - setting icon: ID in config
	- hide        : S.ID === false
	- always show : S.ID !== false                    (configuration mixer timezone)
ID in config   : info() >> enable          >> disable
! ID in config :        >> enable          >> disable
_prompt        : info() >> enable          >> disable (backup i2s novolume restore shareddata)
_disable       :        >> enable - info() >> disable (login mixertype novolume shareddata)
*/
var config       = {
	  _disable     : {
		login : () => {
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
						if ( verified == -1 ) util.passwordWrong();
					} );
				}
			} );
		}
	}
	, _prompt      : {}
	, ap           : values => {
		info( {
			  ...SW
			, footer       : '(8 characters or more)'
			, list         : [
				  [ 'SSID',     'text' ]
				, [ 'IP',       'text' ]
				, [ 'Password', 'text' ]
			]
			, values       : values
			, beforeshow : () => $( '#infoList input' ).eq( 0 ).addClass( 'disabled' )
			, checkchanged : S.ap
			, checkblank   : true
			, checkip      : [ 1 ]
			, checklength  : { 2: [ 8, 'min' ] }
			, cancel       : switchCancel
			, ok           : switchEnable
		} );
	}
	, autoplay     : values => {
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
	}
	, dabradio     : () => {
		if ( S.dabradio ) {
			infoDabScan();
		} else {
			notifyCommon( true );
			bash( [ SW.id ] );
		}
	}
	, localbrowser : data => {
		info( {
			  ...SW
			, list         : [
				  [ 'Rotation',                  'select', { kv: { Normal: 0, '90° CW': 90, '90° CCW': 270, '180°': 180 }, nosort: true } ]
				, [ 'Zoom <gr>(%)</gr>',         'number', { updn: { step: 5, min: 50, max: 300 } } ]
				, [ 'Screen off <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 60 } } ]
				, [ 'On while play',             'checkbox' ]
				, [ 'Mouse pointer',             'checkbox' ]
			]
			, footer       : infoFooterIcon( {
				  Reload     : 'reload'
				, Screenoff  : 'screenoff'
				, Brightness : 'brightness'
			} )
			, boxwidth     : 110
			, values       : data.values
			, checkchanged : S.localbrowser
			, beforeshow   : () => {
				var $onwhileplay = $( '#infoList input:checkbox' ).eq( 0 );
				$onwhileplay.prop( 'disabled', data.values.SCREENOFF === 0 );
				$( '#infoList tr:eq( 2 )' ).on( 'click', '.updn', function() {
					if ( $( this ).parents( 'td' ).prev().find( 'input' ).val() != 0 ) {
						$onwhileplay.prop( 'disabled', false );
					} else {
						$onwhileplay
							.prop( 'disabled', true )
							.prop( 'checked', false );
					}
				} );
				$( '.infofooter' ).toggleClass( 'disabled', ! S.localbrowser );
				var $span = $( '.infofooter span' );
				$span.eq( 2 ).toggleClass( 'hide', ! data.brightness );
				$span.on( 'click', function() {
					var i = $( this ).index();
					if ( i === 0 ) {
						bash( [ 'localbrowserreload' ], () => banner( SW.icon, SW.title, 'Reloaded.' ) );
					} else if ( i === 1 ) {
						bash( [ 'screentoggle' ], onoff => banner( SW.icon, SW.title, onoff ) );
					} else {
						info( {
							  ...SW
							, list        : [ 'Brightness', 'range' ]
							, values      : data.brightness
							, beforeshow  : () => {
								$( '#infoList input' ).on( 'input', function() {
									bash( [ 'brightness', +this.value, 'CMD VAL' ] )
								} );
							}
							, okno        : true
						} );
						switchCancel();
					}
				} );
			}
			, cancel       : switchCancel
			, ok           : switchEnable
			, fileconf     : true
		} );
	}
	, login        : () => {
		info( {
			  ...SW
			, list       : [
				  [ S.login ? 'Existing' : 'Password', 'password' ]
				, [ 'New',                             S.login ? 'password' : 'hidden' ]
				, [ 'Setting pages only',              'checkbox' ]
			]
			, footer     : S.login ? '(<wh>New</wh> = (blank) - No password change)' : ''
			, checkblank : [ 0 ]
			, values     : { pwd: '', pwdnew: '', loginsetting: S.loginsetting }
			, cancel     : switchCancel
			, ok         : () => {
				notifyCommon();
				$.post( 'cmd.php', { cmd: 'login', ...infoVal() }, verified => {
					if ( verified == -1 ) util.passwordWrong();
				} );
			}
		} );
	}
	, lyrics       : values => {
		info( {
			  ...SW
			, list         : [
				  [ 'URL',             'text' ]
				, [ 'Start tag',       'text' ]
				, [ '',                '<gr>Lyrics content ...</gr>' ]
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
	}
	, multiraudio  : data => {
		var list = [
			  [ '', 'Name', { sameline: true } ]
			, [ '', 'IP' ]
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
			values     = [ S.hostname, S.ip, '', ipSub( S.ip ) ];
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
						$last.eq( 1 ).val( ipSub( S.ip ) );
						$last.removeClass( 'disabled' );
						$( '.edit' ).last().removeClass( 'hide' );
					}
					I.checkip = checkIpList( $( '#infoList input' ) );
				} );
				$( '#infoList input' ).filter( ( i, el ) => {
					if ( $( el ).val() === S.ip ) {
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
	}
	, scrobble     : data => {
		data.key ? util.scrobble.player( data.values ) : util.scrobble.key();
	}
	, smb          : values => {
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
	}
	, snapclient   : () => {
		if ( S.snapclient ) {
			if ( S.snapclientserver ) {
				window.open( 'http://'+ S.ip +':1780', '_blank' );
			} else {
				infoSetting( 'snapclient', values => {
					if ( values.length ) {
						if ( values.length > 1 ) {
							info( {
								  ...SW
								, message : 'Select server:'
								, list    : [ '', 'radio', { kv: values } ]
								, ok      : () => {
									window.open( infoVal().replace( /.* /, 'http://' ) +':1780', '_blank' );
								}
							} );
						} else {
							window.open( values[ 0 ].replace( /.* /, 'http://' ) +':1780', '_blank' );
						}
					} else {
						info( {
							  ...SW
							, message : '<a class="helpmenu label">SnapServer<i class="i-snapcast"></i></a> not available.'
						} );
					}
				} );
			}
		} else {
			notifyCommon( true );
			bash( [ SW.id ] );
		}
	}
	, snapserver   : () => {
		if ( S.snapserver ) {
			window.open( 'http://'+ S.ip +':1780', '_blank' );
		} else {
			notifyCommon( true );
			bash( [ SW.id ] );
		}
	}
	, spotifyd     : spotifykey => {
		if ( ! S.spotifyd && spotifykey ) {
			bash( [ 'spotifyd' ] );
			notifyCommon( 'Enable ...' );
		} else if ( spotifykey ) {
			S.camilladsp ? util.spotify.keys() : util.spotify.output();
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
						, redirect_uri  : util.spotify.redirect
						, state         : window.location.hostname
					}
					window.location = 'https://accounts.spotify.com/authorize?'+ $.param( data );
				}
			} );
		}
	}
	, stoptimer    : values => {
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
	}
	, volumelimit  : values => {
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
	}
}
var util        = {
	  passwordWrong : () => {
		bannerHide();
		info( {
			  ...SW
			, message : 'Wrong existing password.'
		} );
		$( '#login' ).prop( 'checked', S.login );
	}
	, redirect : () => { // authorization: spotify, scrobble - from settings.js -  refreshData()
		var url   = new URL( window.location.href );
		window.history.replaceState( '', '', '/settings.php?p=features' );
		var token = url.searchParams.get( 'token' );
		var code  = url.searchParams.get( 'code' );
		var error = url.searchParams.get( 'error' );
		if ( token ) {
			bash( [ 'scrobblekey', token, 'CMD TOKEN' ], function( error ) {
				if ( error ) infoWarning( 'scrobble', 'Scrobbler', 'Authorization failed:<br>'+ error );
			} );
		} else if ( code ) {
			bash( [ 'spotifytoken', code, util.spotify.redirect, 'CMD CODE REDIRECT' ] );
		} else if ( error ) {
			infoWarning( 'spotify', 'Spotify', 'Authorization failed:<br>'+ error );
		}
	}
	, scrobble : {
		  key    : () => {
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
		, player : values => {
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
		}
	}
	, spotify  : {
		  keys     : () => {
			info( {
				  ...SW
				, tablabel : [ 'Output', 'Client Keys' ]
				, tab      : [ util.spotify.output, '' ]
				, message  : 'Remove client <wh>ID</wh> and <wh>Secret</wh> ?'
				, oklabel  : ico( 'remove' ) +'Remove'
				, okcolor  : red
				, ok       : () => {
					bash( [ 'spotifykeyremove' ] );
					notifyCommon( 'Remove keys ...' );
				}
			} );
		}
		, output   : () => {
			if ( S.camilladsp ) {
				info( {
					  ...SW
					, message  : icoLabel( 'DSP', 'camilladsp' ) +' is currently set as output device'
				} );
				return
			}
			infoSetting( 'spotifyoutput', data => {
				info( {
					  ...SW
					, tablabel     : [ 'Output', 'Client Keys' ]
					, tab          : [ '', util.spotify.keys ]
					, list         : [
						  [ 'Device', 'select', data.devices ]
						, [ 'Volume', 'radio',  { kv: { Default: 'alsa', Linear: 'alsa_linear', None: 'none' } } ]
					]
					, boxwidth     : 300
					, values       : data.values
					, checkchanged : true
					, ok           : switchEnable
				} );
			} );
			
		}
		, redirect : 'https://rern.github.io/raudio/spotify'
	}
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
	showContent();
}
