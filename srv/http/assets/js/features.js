/*
switch - setting icon: ID in CONFIG
	- hide        : S.ID === false
	- always show : S.ID !== false                    (configuration mixer timezone)
ID in CONFIG   : info() >> enable          >> disable
! ID in CONFIG :        >> enable          >> disable
_prompt        : info() >> enable          >> disable (backup i2s novolume restore shareddata)
_disable       :        >> enable - info() >> disable (login mixertype novolume shareddata)
*/
var CONFIG       = {
	  _disable     : {
		login : () => {
			INFO( {
				  ...SW
				, message    : 'Disable:'
				, list       : [ 'Password', 'password' ]
				, checkblank : true
				, cancel     : SWITCH.cancel
				, ok         : () => {
					NOTIFY_COMMON( false );
					$.post( 'cmd.php', {
						  cmd     : 'login'
						, disable : true
						, pwd     : _INFO.val()
					}, verified => {
						if ( verified == -1 ) UTIL.passwordWrong();
					} );
				}
			} );
		}
	}
	, _prompt      : {}
	, ap           : values => {
		INFO( {
			  ...SW
			, message      : '<wh>Wi-Fi</wh> is currently connected to:'
							+'<br>'+ ICON( 'wifi gr' ) +' <wh>'+ S.ssid +'</wh>'
							+'<br><br>Enable and disconnect?'
			, list         : [
				  [ 'SSID',     'text' ]
				, [ 'IP',       'text' ]
				, [ 'Password', 'text' ]
			]
			, footer       : '(8 characters or more)'
			, values       : values
			, beforeshow : () => {
				$( '.infomessage' ).addClass( 'hide' );
				$( '#infoList input' ).eq( 0 ).addClass( 'disabled' );
			}
			, checkchanged : S.ap
			, checkblank   : true
			, checkip      : [ 1 ]
			, checklength  : { 2: [ 8, 'min' ] }
			, cancel       : SWITCH.cancel
			, ok           : () => {
				if ( S.ssid && $( '.infomessage' ).hasClass( 'hide' ) ) {
					I.oknoreset = true;
					$( '#infoList' ).children().toggleClass( 'hide' );
					$( '.infomessage' ).removeClass( 'hide' );
				} else {
					I.oknoreset = false;
					SWITCH.enable();
				}
			}
		} );
	}
	, autoplay     : values => {
		INFO( {
			  ...SW
			, list         : [
				  [ 'Bluetooth connected',        'checkbox' ]
				, [ 'Power on <gr>/ Reboot</gr>', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.autoplay
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
			, fileconf     : true
		} );
	}
	, dabradio     : () => {
		if ( S.dabradio ) {
			COMMON.dabScan();
		} else {
			NOTIFY_COMMON( true );
			BASH( [ SW.id ] );
		}
	}
	, localbrowser : data => {
		var rotate = { Normal: 0, '90° CW': 90, '90° CCW': 270, '180°': 180 }
		INFO( {
			  ...SW
			, list         : [
				  [ 'Rotation',                  'select', { kv: rotate, nosort : true, colspan : 2, width : 120 } ]
				, [ 'Zoom <gr>(%)</gr>',         'number', { updn: { step: 5, min: 50, max: 300 } } ]
				, [ 'Screen off <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 60 } } ]
				, [ 'On while play',             'checkbox', { colspan: 2 } ]
				, [ 'Mouse pointer',             'checkbox', { colspan: 2 } ]
				, [ '',                          'checkbox' ]
				, [ '',                          'checkbox' ]
			]
			, footer       : _INFO.footerIcon( {
				  Reload     : 'reload'
				, Screenoff  : 'screenoff'
				, Brightness : 'brightness'
			} )
			, boxwidth     : 70
			, values       : { ...data.values, R_CHANGED: false, RESTART: false }
			, checkchanged : S.localbrowser
			, beforeshow   : () => {
				$( '#infoList tr' ).last().addClass( 'hide' ).prev().addClass( 'hide' )
				var $onwhileplay = $( '#infoList input:checkbox' ).eq( 0 );
				$onwhileplay.prop( 'disabled', data.values.SCREENOFF === 0 );
				$( '#infoList tr' ).eq( 2 ).on( 'click', '.updn', function() {
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
						WS.send( '{ "channel": "reload", "data": 1 }' );
						BANNER( SW.icon, SW.title, 'Reloaded.' );
					} else if ( i === 1 ) {
						BASH( [ 'screentoggle' ], onoff => BANNER( SW.icon, SW.title, onoff ) );
					} else {
						INFO( {
							  ...SW
							, list        : [ 'Brightness', 'range' ]
							, values      : data.brightness
							, beforeshow  : () => {
								$( '#infoList input' ).on( 'input', function() {
									BASH( [ 'brightness', +this.value, 'CMD VAL' ] )
								} );
							}
							, okno        : true
						} );
						SWITCH.cancel();
					}
				} );
			}
			, cancel       : SWITCH.cancel
			, ok           : () => {
				var v          = _INFO.val();
				var values     = data.values;
				var $r_changed = $( '#infoList input' ).eq( 4 );
				var $restart   = $( '#infoList input' ).eq( 5 );
				if ( v.ROTATE !== values.ROTATE ) $r_changed.prop( 'checked', true );
				if ( ! S.localbrowser || v.ROTATE !== values.ROTATE ) {
					$restart.prop( 'checked', true );
				} else {
					if ( v.ZOOM !== values.ZOOM || v.CURSOR !== values.CURSOR ) $restart.prop( 'checked', true );
				}
				SWITCH.enable();
			}
			, fileconf     : true
		} );
	}
	, login        : () => {
		INFO( {
			  ...SW
			, list       : [
				  [ S.login ? 'Existing' : 'Password', 'password' ]
				, [ 'New',                             S.login ? 'password' : 'hidden' ]
				, [ 'Setting pages only',              'checkbox' ]
			]
			, footer     : S.login ? '(<wh>New</wh> = (blank) - No password change)' : ''
			, checkblank : [ 0 ]
			, values     : { pwd: '', pwdnew: '', loginsetting: S.loginsetting }
			, cancel     : SWITCH.cancel
			, ok         : () => {
				NOTIFY_COMMON();
				$.post( 'cmd.php', { cmd: 'login', ..._INFO.val() }, verified => {
					if ( verified == -1 ) UTIL.passwordWrong();
				} );
			}
		} );
	}
	, lyrics       : values => {
		INFO( {
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
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
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
			values     = [ S.hostname, S.ip, '', COMMON.ipSub( S.ip ) ];
		}
		function checkIpList( ar ) {
			return [ ...Array( ar.length ).keys() ].filter( ( i, el ) => el % 2 )
		}
		INFO( {
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
				_INFO.addRemove( add => {
					if ( add ) {
						var $last = $( '#infoList input' ).slice( -2 );
						$last.eq( 0 ).val( '' );
						$last.eq( 1 ).val( COMMON.ipSub( S.ip ) );
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
			, cancel       : SWITCH.cancel
			, ok           : () => {
				var infoval = _INFO.val();
				if ( infoval.length < 3 ) {
					if ( S.multiraudio ) {
						NOTIFY_COMMON( 'Disable ...' );
						BASH( [ 'multiraudioreset' ] );
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
				NOTIFY_COMMON();
				COMMON.json.save( 'multiraudio', data );
				BASH( [ 'multiraudio' ] );
			}
		} );
	}
	, scrobble     : data => {
		data.key ? UTIL.scrobble.player( data.values ) : UTIL.scrobble.key();
	}
	, smb          : values => {
		INFO( {
			  ...SW
			, message      : '<wh>Write</wh> permission:'
			, list         : [
				  [ '<gr>/mnt/MPD/</gr>SD',  'checkbox' ]
				, [ '<gr>/mnt/MPD/</gr>USB', 'checkbox' ]
			]
			, values       : values
			, checkchanged : S.smb
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
		} );
	}
	, snapclient   : () => {
		if ( S.snapclient ) {
			if ( S.snapclientserver ) {
				window.open( 'http://'+ S.ip +':1780', '_blank' );
			} else {
				SETTING( 'snapclient', values => {
					if ( values.length ) {
						if ( values.length > 1 ) {
							INFO( {
								  ...SW
								, message : 'Select server:'
								, list    : [ '', 'radio', { kv: values } ]
								, ok      : () => {
									window.open( _INFO.val().replace( /.* /, 'http://' ) +':1780', '_blank' );
								}
							} );
						} else {
							window.open( values[ 0 ].replace( /.* /, 'http://' ) +':1780', '_blank' );
						}
					} else {
						INFO( {
							  ...SW
							, message : '<a class="helpmenu label">SnapServer<i class="i-snapcast"></i></a> not available.'
						} );
					}
				} );
			}
		} else {
			NOTIFY_COMMON( true );
			BASH( [ SW.id ] );
		}
	}
	, snapserver   : () => {
		if ( S.snapserver ) {
			window.open( 'http://'+ S.ip +':1780', '_blank' );
		} else {
			NOTIFY_COMMON( true );
			BASH( [ SW.id ] );
		}
	}
	, spotifyd     : spotifykey => {
		if ( ! S.spotifyd && spotifykey ) {
			BASH( [ 'spotifyd' ] );
			NOTIFY_COMMON( 'Enable ...' );
		} else if ( spotifykey ) {
			S.camilladsp ? UTIL.spotify.keys() : UTIL.spotify.output();
		} else {
			if ( navigator.userAgent.includes( 'Firefox' ) ) {
				_INFO.warning( SW.icon, SW.title, 'Authorization cannot run on <wh>Firefox</wh>.' );
				$( '#spotifyd' ).prop( 'checked', false );
				return
			}
			
			INFO( {
				  ...SW
				, list        : [
					  [ 'ID',     'text' ]
					, [ 'Secret', 'text' ]
				]
				, footer      : '<wh>ID</wh> and <wh>Secret</wh> from Spotify private app '+ ICON( 'help help' )
				, footeralign : 'right'
				, boxwidth    : 320
				, checklength : { 0: 32, 1: 32 }
				, beforeshow  : () => {
					$( '#infoList .help' ).on( 'click', function() {
						$( '.container .help' ).eq( 0 ).trigger( 'click' );
						$( '#infoX' ).trigger( 'click' );
					} );
				}
				, cancel      : SWITCH.cancel
				, ok          : () => {
					var infoval = _INFO.val();
					var id      = infoval[ 0 ];
					var secret  = infoval[ 1 ];
					BASH( [ 'spotifykey', btoa( id +':'+ secret ), 'CMD BTOA' ] );
					var data    = {
						  response_type : 'code'
						, client_id     : id
						, scope         : 'user-read-currently-playing user-read-playback-position'
						, redirect_uri  : UTIL.spotify.redirect
						, state         : window.location.hostname
					}
					window.location = 'https://accounts.spotify.com/authorize?'+ $.param( data );
				}
			} );
		}
	}
	, stoptimer    : data => {
		INFO( {
			  ...SW
			, list         : [
				  [ 'Minutes',           'number',   { updn: { step: 5, min: 5, max: 120 } } ]
				, [ 'Power off on stop', 'checkbox', { colspan: 2 } ]
			]
			, boxwidth     : 70
			, values       : data.values
			, checkchanged : data.active
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
			, fileconf     : true
		} );
	}
	, volumelimit  : values => {
		var param = { updn: { step: 1, min: 0, max: 100, enable: true, link: true } }
		INFO( {
			  ...SW
			, list         : [
				  [ 'Startup default', 'number', param ]
				, [ 'Maximum limit',   'number', param ]
			]
			, boxwidth     : 70
			, values       : values
			, checkchanged : S.volumelimit
			, cancel       : SWITCH.cancel
			, ok           : SWITCH.enable
			, fileconf     : true
		} );
	}
}
var UTIL        = {
	  passwordWrong : () => {
		BANNER_HIDE();
		INFO( {
			  ...SW
			, message : 'Wrong existing password.'
		} );
		$( '#login' ).prop( 'checked', S.login );
	}
	, redirect : () => { // authorization: spotify, scrobble - from settings.js -  REFRESHDATA()
		var url   = new URL( window.location.href );
		window.history.replaceState( '', '', '/settings.php?p=features' );
		var token = url.searchParams.get( 'token' );
		var code  = url.searchParams.get( 'code' );
		var error = url.searchParams.get( 'error' );
		if ( token ) {
			BASH( [ 'scrobblekey', token, 'CMD TOKEN' ], function( error ) {
				if ( error ) _INFO.warning( 'scrobble', 'Scrobbler', 'Authorization failed:<br>'+ error );
			} );
		} else if ( code ) {
			BASH( [ 'spotifytoken', code, UTIL.spotify.redirect, 'CMD CODE REDIRECT' ] );
		} else if ( error ) {
			_INFO.warning( 'spotify', 'Spotify', 'Authorization failed:<br>'+ error );
		}
	}
	, scrobble : {
		  key    : () => {
			INFO( {
				  ...SW
				, message : 'Open <wh>Last.fm</wh> for authorization?'
				, cancel  : SWITCH.cancel
				, ok      : () => { // api account page: https://www.last.fm/api/accounts
					BASH( [ 'lastfmkey' ], function( apikey ) {
						location.href =  'http://www.last.fm/api/auth/?api_key='+ apikey +'&cb=https://rern.github.io/raudio/scrobbler?ip='+ location.host;
					} );
				}
			} );
		}
		, player : values => {
			INFO( {
				  ...SW
				, list         : [
					  [ ICON( 'airplay' ) +'AirPlay',        'checkbox' ]
					, [ ICON( 'bluetooth' ) +'Bluetooth',    'checkbox' ]
					, [ ICON( 'spotify' ) +'Spotify',        'checkbox' ]
					, [ ' '+ ICON( 'upnp' ) +' UPnP / DLNA', 'checkbox' ]
				]
				, boxwidth     : 170
				, values       : values
				, checkchanged : S.scrobble
				, buttonlabel  : ICON( 'remove' ) +'Keys'
				, buttoncolor  : V.red
				, button       : () => {
					SWITCH.cancel();
					INFO( {
						  icon    : 'scrobble'
						, title   : 'Scrobbler'
						, message : 'Remove authorization?'
						, ok      : () => BASH( [ 'scrobblekeyremove' ] )
					} );
				}
				, cancel       : SWITCH.cancel
				, ok           : SWITCH.enable
				, fileconf     : true
			} );
		}
	}
	, spotify  : {
		  keys     : () => {
			INFO( {
				  ...SW
				, tablabel : [ 'Output', 'Client Keys' ]
				, tab      : [ UTIL.spotify.output, '' ]
				, message  : 'Remove client <wh>ID</wh> and <wh>Secret</wh> ?'
				, oklabel  : ICON( 'remove' ) +'Remove'
				, okcolor  : V.red
				, ok       : () => {
					BASH( [ 'spotifykeyremove' ] );
					NOTIFY_COMMON( 'Remove keys ...' );
				}
			} );
		}
		, output   : () => {
			if ( S.camilladsp ) {
				INFO( {
					  ...SW
					, message  : LABEL_ICON( 'DSP', 'camilladsp' ) +' is currently set as output device'
				} );
				return
			}
			SETTING( 'spotifyoutput', data => {
				INFO( {
					  ...SW
					, tablabel     : [ 'Output', 'Client Keys' ]
					, tab          : [ '', UTIL.spotify.keys ]
					, list         : [
						  [ 'Device', 'select', data.devices ]
						, [ 'Volume', 'radio',  { kv: { Default: 'alsa', Linear: 'alsa_linear', None: 'none' } } ]
					]
					, boxwidth     : 300
					, values       : data.values
					, checkchanged : true
					, ok           : SWITCH.enable
				} );
			} );
			
		}
		, redirect : 'https://rern.github.io/raudio/spotify'
	}
}
function renderPage() {
	$( '#smb' ).toggleClass( 'disabled', S.nfsserver );
	if ( S.nfsconnected || S.shareddata || S.smb ) {
		var nfsdisabled = LABEL_ICON( 'Shared Data', 'networks' ) +' is currently enabled.';
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
	$( '#localbrowser' ).toggleClass( 'inactive', S.localbrowser === -1 );
	CONTENT();
}
