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
				  icon    : SW.icon
				, title   : SW.title
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
		if ( S.camilladsp ) {
			infoSpotifyKeys();
			return
		}
		
		bash( [ 'spotifyoutput' ], list => {
			V.listspotify = list;
			infoSpotify();
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
$( '#setting-snapserver' ).on( 'click', function() {
	window.open( 'http://'+ S.hostip +':1780', '_blank' );
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
	var footer = S.brightness ? ico( 'gear', 'brightness', 'tabindex' ) +'Brightness&emsp;' : '';
	footer    += ico( 'redo', 'reload', 'tabindex' ) +'Reload&emsp;'+ ico( 'screenoff', 'screenoff', 'tabindex' ) +'On/Off';
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Rotation',                  'select', { kv: { Normal: 0, '90° CW': 90, '90° CCW': 270, '180°': 180 }, nosort: true } ]
			, [ 'Zoom <gr>(%)</gr>',         'number', { updn: { step: 5, min: 50, max: 300 } } ]
			, [ 'Screen off <gr>(min)</gr>', 'number', { updn: { step: 1, min: 0, max: 60 } } ]
			, [ 'On while play',             'checkbox' ]
			, [ 'Mouse pointer',             'checkbox' ]
		]
		, footer       : footer
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
			$( '#infoList' ).on( 'click', '#brightness', function() {
				switchCancel();
				info( {
					  icon         : SW.icon
					, title        : SW.title
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
	var list = [
		  [ '', '',     { suffix: 'Name', sameline: true } ]
		, [ '', '',     { suffix: 'IP / URL' } ]
	];
	var listname = [ '', 'text', { sameline: true } ];
	var listip   = [ '', 'text', { suffix: ico( 'remove' ) } ];
	if ( S.multiraudioconf ) {
		var keys   = Object.keys( S.multiraudioconf ).sort();
		var values = [];
		keys.forEach( k => {
			list.push( listname, listip );
			values.push( k, S.multiraudioconf[ k ] );
		} );
		var iL     = values.length / 2 - 1;
	} else {
		list.push( listname, listip );
		values    = [ S.hostname, S.hostip ];
	}
	function checkIpList( length ) {
		var list = [];
		for ( i = 0; i < length; i++ ) {
			if ( i % 2 ) list.push( i );
		}
		return list
	}
	var checkip = checkIpList( values.length );
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : list
		, boxwidth     : 160
		, values       : values
		, checkchanged : S.multiraudio
		, checkblank   : true
		, checkip      : checkip
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
			var okToggle = () => $( '#infoOk' ).toggleClass( 'disabled', $( '#infoList input' ).length < 3 );
			okToggle();
			$( '#infoList' ).on( 'click', 'i', function() {
				var $this = $( this );
				if ( $this.hasClass( 'i-plus' ) ) {
					$( '#infoList tbody' ).append( htmltr );
					$( '#infoList input' ).last().val( S.ipsub );
				} else {
					$this.parents( 'tr' ).remove();
					if ( ! S.multiraudio ) setTimeout( okToggle, 150 );
				}
				I.checkip = checkIpList( $( '#infoList input' ).length );
				infoListChange();
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
			jsonSave( 'multiraudio', data );
			bash( [ 'multiraudio' ] );
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
		  icon       : SW.icon
		, title      : SW.title
		, list       : [
			  [ S.login ? 'Existing' : 'Password', 'password' ]
			, [ 'New',                             S.login ? 'password' : 'hidden' ]
			, [ 'Setting pages only',              'checkbox' ]
		]
		, footer     : '(Blank <wh>New</wh> - No password change)'
		, focus      : 0
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
$( '#setting-volumelimit' ).on( 'click', function() {
	var updn = { updn: { step: 1, min: 0, max: 100 } }
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, list         : [
			  [ 'Startup default', 'number', updn ]
			, [ 'Maximum limit',   'number', updn ]
		]
		, boxwidth     : 70
		, values       : S.volumelimitconf
		, checkchanged : S.volumelimit
		, beforeshow   : () => {
			var $input      = $( '#infoList input' );
			var $startup    = $input.eq( 0 );
			var $max        = $input.eq( 1 );
			var $up_startup = $( '#infoList .up' ).eq( 0 );
			var $dn_max     = $( '#infoList .dn' ).eq( 1 );
			$up_startup.on( 'click', function() {
				var startup = +$startup.val();
				if ( startup > +$max.val() ) $max.val( startup );
			} );
			$dn_max.on( 'click', function() {
				var max     = +$max.val();
				if ( +$startup.val() > max ) $startup.val( max );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );

} );

function infoSpotify() {
	if ( S.camilladsp ) {
		info( {
			  icon     : SW.icon
			, title    : SW.title
			, message  : icoLabel( 'DSP', 'camilladsp' ) +' is currently set as output device'
		} );
		return
	}
	
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Output', 'Client Keys' ]
		, tab          : [ '', infoSpotifyKeys ]
		, list         : [ 'Device', 'select', V.listspotify.devices ]
		, boxwidth     : 300
		, values       : V.listspotify.current
		, checkchanged : true
		, ok           : () => {
			bash( [ 'spotifyoutputset', infoVal(), 'CMD OUTPUT' ] );
			notifyCommon();
		}
	} );
}
function infoSpotifyKeys() {
	info( {
		  icon     : SW.icon
		, title    : SW.title
		, tablabel : [ 'Output', 'Client Keys' ]
		, tab      : [ infoSpotify, '' ]
		, message  : 'Remove client <wh>ID</wh> and <wh>Secret</wh> ?'
		, oklabel  : ico( 'remove' ) +'Remove'
		, okcolor  : red
		, ok       : () => {
			bash( [ 'spotifykeyremove' ] );
			notifyCommon( 'Remove keys ...' );
		}
	} );
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
