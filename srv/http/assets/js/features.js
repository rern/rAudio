var redirect_uri   = 'https://rern.github.io/raudio/spotify';
var default_v      = {
	  autoplay     : {
		  BLUETOOTH : true
		, STARTUP   : true
	  }
	, lyrics       : {
		  URL      : 'https://'
		, START    : '<'
		, END      : '</div>'
		, EMBEDDED : false
	}
	, scrobble     : {
		  AIRPLAY   : true
		, BLUETOOTH : true
		, SPOTIFY   : true
		, UPNP      : true
	}
	, stoptimer    : {
		  MIN      : 30
		, POWEROFF : false
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
$( '#setting-snapclient' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : 'Sync SnapClient with SnapServer:'
		, list         : [ 'Latency <gr>(ms)</gr>', 'number' ]
		, focus        : 0
		, checkblank   : true
		, values       : S.snapclientconf
		, boxwidth     : 100
		, checkchanged : S.snapclient
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-spotifyd' ).on( 'click', function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	if ( ! S.spotifyd && S.spotifytoken ) {
		bash( [ 'spotifyd' ] );
		notifyCommon( 'Enable ...' );
	} else if ( S.spotifytoken ) {
		if ( S.camilladsp ) {
			info( {
				  icon     : SW.icon
				, title    : SW.title
				, tablabel : [ 'Output', 'Keys' ]
				, tab      : [ '', infoSpotifyKeys ]
				, message  : '<br>Loopback is currently set for '+ icoLabel( 'DSP', 'camilladsp' ) +'<br>&nbsp;'
			} );
			return
		}
		
		bash( [ 'spotifyoutput' ], ( list ) => {
			info( {
				  icon         : SW.icon
				, title        : SW.title
				, list         : [ 'Device', 'select', list.devices ]
				, boxwidth     : 300
				, values       : list.current
				, checkchanged : true
				, buttonlabel  : ico( 'remove' ) +'Keys'
				, buttoncolor  : red
				, button       : () => {
					info( {
						  icon    : SW.icon
						, title   : SW.title
						, message : 'Remove client <wh>ID</wh> and <wh>Secret</wh>?'
						, oklabel : ico( 'remove' ) +'Remove'
						, okcolor : red
						, ok      : () => {
							bash( [ 'spotifykeyremove' ] );
							notifyCommon( 'Remove keys ...' );
						}
					} );
				}
				, ok           : () => {
					bash( [ 'spotifyoutputset', infoVal(), 'CMD OUTPUT' ] );
					notifyCommon();
				}
			} );
		}, 'json' );
	} else {
		if ( navigator.userAgent.includes( 'Firefox' ) ) {
			infoWarning( SW.icon, SW.title, 'Authorization cannot run on <wh>Firefox</wh>.' );
			$( '#spotifyd' ).prop( 'checked', false );
			return
		}
		
		info( {
			  icon        : SW.icon
			, title       : SW.title
			, list        : [
				  [ 'ID',     'text' ]
				, [ 'Secret', 'text' ]
			]
			, focus       : 0
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
					, redirect_uri  : redirect_uri
					, state         : window.location.hostname
				}
				window.location = 'https://accounts.spotify.com/authorize?'+ $.param( data );
			}
		} );
	}
} );
$( '#setting-ap' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, footer       : '(8 characters or more)'
		, list         : [
			  [ 'IP',       'text' ]
			, [ 'Password', 'text' ]
		]
		, values       : S.apconf
		, checkchanged : S.ap
		, checkblank   : true
		, checkip      : [ 0 ]
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-autoplay' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Bluetooth connected',        'checkbox' ]
			, [ 'Power on <gr>/ Reboot</gr>', 'checkbox' ]
		]
		, values       : S.autoplayconf || default_v.autoplay
		, checkchanged : S.autoplay
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-localbrowser' ).on( 'click', function() {
	var brightness = S.brightness ? '<span class="brightness">'+ ico( 'gear' ) +' Brightness</span>&emsp;' : '';
	var button	   = '<span class="reload">'+ ico( 'redo' ) +' Reload</span>&emsp;<span class="screenoff">'+ ico( 'screenoff' ) +' On/Off</span>';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Rotation',                  'select', { Normal: 0, '90° CW': 90, '90° CCW': 270, '180°': 180 } ]
			, [ 'Zoom <gr>(%)</gr>',         'number', { updn: { step: 5, min: 50, max: 300 } } ]
			, [ 'Screen off <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 60 } } ]
			, [ 'On while play',             'checkbox' ]
			, [ 'Mouse pointer',             'checkbox' ]
			, [ 'run <c>xinitrc.d</c>',      'checkbox' ]
		]
		, footer       : '<br>'+ brightness + button
		, boxwidth     : 110
		, values       : S.localbrowserconf
		, checkchanged : S.localbrowser
		, beforeshow   : () => {
			var $onwhileplay = $( '#infoList input:checkbox' ).eq( 0 );
			$onwhileplay.prop( 'disabled', S.localbrowserconf.SCREENOFF === 0 );
			$( '.infofooter' ).toggleClass( 'hide', ! S.localbrowser );
			$( '#infoList tr:eq( 2 )' ).on( 'click', '.updn', function() {
				if ( $( this ).parents( 'td' ).prev().find( 'input' ).val() != 0 ) {
					$onwhileplay.prop( 'disabled', false );
				} else {
					$onwhileplay
						.prop( 'disabled', true )
						.prop( 'checked', false );
				}
			} );
			$( '#infoList' ).on( 'click', '.brightness', function() {
				switchCancel();
				info( {
					  icon        : 'localbrowser'
					, title       : 'Browser on RPi'
					, list        : [ 'Brightness', 'range' ]
					, values      : S.brightness
					, beforeshow  : () => {
						$( '#infoList input' ).on( 'input', function() {
							bash( [ 'brightness', val, 'CMD VAL' ] )
						} );
					}
					, okno        : true
				} );
			} ).on( 'click', '.reload', function() {
				bash( [ 'localbrowserreload' ] );
			} ).on( 'click', '.screenoff', function() {
				bash( [ 'screenofftoggle' ] );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-smb' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : '<wh>Write</wh> permission:'
		, list         : [
			  [ '<gr>/mnt/MPD/</gr>SD',  'checkbox' ]
			, [ '<gr>/mnt/MPD/</gr>USB', 'checkbox' ]
		]
		, values       : S.smbconf
		, checkchanged : S.smb
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-lyrics' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'URL',             'text' ]
			, [ 'Start tag',       'text' ]
			, [ '',                '', { suffix: '<gr>Lyrics content ...</gr>' } ]
			, [ 'End tag',         'text' ]
			, [ 'Embedded lyrics', 'checkbox' ]
		]
		, boxwidth     : 300
		, values       : S.lyricsconf || default_v.lyrics
		, checkchanged : S.lyrics
		, checkblank   : true
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-multiraudio' ).on( 'click', function() {
	if ( S.multiraudioconf ) {
		var keys = Object.keys( S.multiraudioconf ).sort();
		var values = [];
		keys.forEach( k => values.push( k, S.multiraudioconf[ k ] ) );
		var iL     = values.length / 2 - 1;
	} else {
		values = [ S.hostname, S.hostip ];
	}
	var check = infoCheckEvenOdd( values.length );
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ '', '',     { suffix: 'Name', sameline: true } ]
			, [ '', '',     { suffix: 'IP / URL' } ]
			, [ '', 'text', { sameline: true } ]
			, [ '', 'text', { suffix: ico( 'remove' ) } ]
		]
		, boxwidth     : 130
		, values       : values
		, checkchanged : S.multiraudio && values.length > 2
		, checkblank   : I.checkblank
		, checkip      : I.checkip
		, checkunique  : true
		, beforeshow   : () => {
			$( '#infoList td:first-child' ).remove();
			$( '#infoList td' ).css( { width: '180px', 'padding-right': 0, 'text-align': 'left' } );
			$( '#infoList td:last-child' ).css( 'width', '40px' );
			$( '#infoList tr' ).first().append( '<td>'+ ico( 'plus' ) +'</td>' );
			$( '#infoList tr:first-child td' ).css( 'padding-left', '5px' );
			var htmltr = $( '#infoList tr' ).last()[ 0 ].outerHTML;
			$( '#infoList input' ).each( ( i, el ) => {
				if ( $( el ).val() === S.hostip ) {
					var $tr = $( el ).parents( 'tr' );
					$tr.find( 'input' ).addClass( 'disabled' );
					$tr.find( 'i' ).remove();
				}
			} );
			$( '#infoOk' ).toggleClass( 'disabled', I.values.length < 3 );
			$( '#infoList' ).on( 'click', 'i', function() {
				var $this = $( this );
				var add   = $this.hasClass( 'i-plus' );
				if ( add ) {
					$( '#infoList table' ).append( htmltr );
					$( '#infoList input' ).last().val( S.ipsub );
				} else {
					$this.parents( 'tr' ).remove();
				}
				$inputbox = $( '#infoList input' );
				$input    = $inputbox;
				infoCheckEvenOdd( $input.length );
				infoCheckSet();
				if ( S.multiraudio ) {
					$( '#infoOk' ).text( $inputbox.length < 3 ? 'Disable' : 'OK' );
				} else {
					$( '#infoOk' ).toggleClass( 'disabled', I.values.length < 3 );
				}
			} );
		}
		, cancel       : switchCancel
		, ok           : () => {
			var infoval = infoVal();
			if ( infoval.length < 3 ) {
				notifyCommon( 'Disable ...' );
				bash( [ 'multiraudioreset' ] );
				return
			}
			
			var val = {}
			infoval.forEach( ( el, i ) => i % 2 ? val[ name ] = el : name = el );
			keys = Object.keys( val ).sort();
			data = {}
			keys.forEach( k => data[ k ] = val[ k ] );
			notifyCommon();
			bash( { cmd: [ 'multiraudio' ], json: data } );
		}
	} );
} );
$( '#login' ).on( 'click', function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-login' ).trigger( 'click' );
	} else {
		info( {
			  icon       : SW.icon
			, title      : SW.title
			, message    : 'Disable:'
			, list       : [ 'Password', 'password' ]
			, focus      : 0
			, checkblank : true
			, cancel     : switchCancel
			, ok         : () => {
				notifyCommon();
				$.post( 'cmd.php', {
					  cmd      : 'login'
					, disable  : 1
					, password : infoVal()
				}, function( verified ) {
					if ( verified == -1 ) passwordWrong();
				}, 'json' );
			}
		} );
	}
} );
$( '#setting-login' ).on( 'click', function() {
	var list = [
		  [ 'Existing', 'password' ]
		, [ 'New',      'password' ]
		, [ 'Password', 'password' ]
	]
	info( {
		  icon       : SW.icon
		, title      : SW.title
		, message    : ( S.login ? 'Change password:' : 'New setup:' )
		, list       : S.login ? list.slice( 0, 2 ) : list.slice( -1 )
		, focus      : 0
		, checkblank : true
		, cancel     : switchCancel
		, ok         : () => {
			var infoval = infoVal();
			notifyCommon();
			$.post( 'cmd.php', {
				  cmd      : 'login'
				, password : infoval[ 0 ]
				, pwdnew   : S.login ? infoval[ 1 ] : infoval
			}, function( verified ) {
				if ( verified == -1 ) passwordWrong();
			}, 'json' );
		}
	} );
} );
$( '#setting-scrobble' ).on( 'click', function() {
	if ( S.scrobblekey ) {
		info( {
			  icon         : SW.icon
			, title        : SW.title
			, list         : [
				  [ ico( 'airplay' ) +'AirPlay',        'checkbox' ]
				, [ ico( 'bluetooth' ) +'Bluetooth',    'checkbox' ]
				, [ ico( 'spotify' ) +'Spotify',        'checkbox' ]
				, [ ' '+ ico( 'upnp' ) +' UPnP / DLNA', 'checkbox' ]
			]
			, boxwidth     : 170
			, values       : S.scrobbleconf || default_v.scrobble
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
	} else {
		info( {
			  icon    : SW.icon
			, title   : SW.title
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
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Minutes',           'number', { updn: { step: 5, min: 5, max: 120 } } ]
			, [ 'Power off on stop', 'checkbox' ]
		]
		, boxwidth     : 70
		, values       : S.stoptimerconf || default_v.stoptimer
		, checkchanged : S.stoptimer
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );

} );

function infoCheckEvenOdd( length ) {
	I.checkblank = [];
	I.checkip    = [];
	for ( i = 0; i < length; i++ ) i % 2 ? I.checkip.push( i ) : I.checkblank.push( i );
}
function passwordWrong() {
	bannerHide();
	info( {
		  icon    : SW.icon
		, title   : SW.title
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', S.login );
}
function renderPage() {
	$( '#dabradio' ).toggleClass( 'disabled', ! S.dabdevice );
	$( '#snapclient' ).parent().prev().toggleClass( 'single', ! S.snapclientactive );
	$( '#snapserver' ).toggleClass( 'disabled', S.snapserveractive );
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
