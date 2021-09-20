$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function passwordWrong() {
	info( {
		  icon    : 'lock'
		, title   : 'Password Login'
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', G.login );
}

renderPage = function( list ) {
	if ( typeof list === 'string' ) { // on load, try catching any errors
		var list2G = list2JSON( list );
		if ( !list2G ) return
	} else {
		G = list;
	}
	$( '#shairport-sync' ).prop( 'checked', G[ 'shairport-sync' ] );
	$( '#spotifyd' ).prop( 'checked', G.spotifyd );
	$( '#snapclient' ).prop( 'checked', G.snapclient );
	disableSwitch( '#snapclient', G.snapserver );
	$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
	$( '#upmpdcli' ).prop( 'checked', G.upmpdcli );
	$( '#streaming' ).prop( 'checked', G.streaming );
	$( '#snapserver' ).prop( 'checked', G.snapserver );
	disableSwitch( '#snapserver', G.snapclient );
	$( '#hostapd' ).prop( 'checked', G.hostapd );
	$( '#setting-hostapd' ).toggleClass( 'hide', !G.hostapd );
	$( '#localbrowser' ).prop( 'checked', G.localbrowser );
	$( '#setting-localbrowser' ).toggleClass( 'hide', !G.localbrowser );
	$( '#smb' ).prop( 'checked', G.smb );
	$( '#setting-smb' ).toggleClass( 'hide', !G.smb );
	$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
	$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
	$( '#login' ).prop( 'checked', G.login );
	$( '#setting-login' ).toggleClass( 'hide', !G.login );
	$( '#autoplaycd' ).prop( 'checked', G.autoplaycd );
	$( '#autoplay' ).prop( 'checked', G.autoplay );
	[ 'hostapd', 'localbrowser', 'mpdscribble', 'shairport-sync', 'smb', 'snapserver', 'spotifyd', 'upmpdcli' ].forEach( function( id ) {
		codeToggle( id, 'status' );
	} );
	resetLocal();
	showContent();
}

// hostapd
if ( set ) setTimeout( function() { $( '#'+ set ).click() }, 900 );

$( '#ip' ).html( 'http://'+ location.host +':8000' );
//---------------------------------------------------------------------------------------
$( '.enable' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( $( this ).hasClass( 'disabled' ) ) {
		$( this ).prop( 'checked', !checked );
		return
	}
	
	var idname = {
		  localbrowser : [ 'Browser on RPi',       'chromium' ]
		, login        : [ 'Password Login',       'lock' ]
		, mpdscribble  : [ 'Last.fm Scrobbler',    'lastfm' ]
		, smb          : [ 'Samba - File Sharing', 'networks' ]
		, snapclient   : [ 'SnapClient Renderer',  'snapcast' ]
	}
	var id = this.id;
	if ( checked ) {
		$( '#setting-'+ id ).click();
	} else {
		if ( id !== 'login' ) {
			var nameicon = idname[ id ];
			notify( nameicon[ 0 ], 'Disable ...', nameicon[ 1 ] );
			bash( [ id +'disable' ] );
		} else {
			$( '#login' ).prop( 'checked', G.login );
			info( {
				  icon          : 'lock'
				, title         : 'Password Login'
				, message       : 'Disable:'
				, passwordlabel : 'Password'
				, pwdrequired   : 1
				, ok            : function() {
					$.post( 'cmd.php', {
						  cmd      : 'login'
						, password : infoVal()
					}, function( std ) {
						if ( std ) {
							notify( 'Password Login', 'Disable ...', 'lock' );
							bash( [ id +'disable' ] );
						} else {
							passwordWrong();
						}
					} );
				}
			} );
		}
	}
} );
$( '.enablenoset' ).click( function() {
	var idname = {
		  autoplay         : [ 'Play on Startup',                  'play-power' ]
		, autoplaycd       : [ 'Play on Insert CD',                'play-cd' ]
		, localbrowser     : [ 'Chromium - Browser on RPi',        'chromium' ]
		, 'shairport-sync' : [ 'AirPlay Renderer',                 'airplay' ]
		, snapserver       : [ 'Snapcast - Sync Streaming Server', 'snapcast' ]
		, spotifyd         : [ 'Spotify Connect',                  'spotify' ]
		, streaming        : [ 'HTTP Streaming',                   'mpd' ]
		, upmpdcli         : [ 'UPnP Renderer',                    'upnp' ]
	}
	var id = this.id;
	var checked = $( this ).prop( 'checked' );
	var nameicon = idname[ id ];
	notify( nameicon[ 0 ], checked, nameicon[ 1 ] );
	bash( [ id, checked ] );
} );

$( '#setting-snapclient' ).click( function() {
	info( {
		  icon         : 'snapcast'
		, title        : 'SnapClient'
		, message      : 'Sync SnapClient with SnapServer:'
		, textlabel    : 'Latency <gr>(ms)</gr>'
		, checkblank   : 1
		, values       : G.snapcastconf || 800
		, boxwidth     : 100
		, checkchange  : ( G.snapclient ? 1 : 0 )
		, cancel       : function() {
			$( '#snapclient' ).prop( 'checked', G.snapclient );
		}
		, ok           : function() {
			bash( [ 'snapclientset', Math.abs( infoVal() ) ] );
			notify( 'Snapclient', G.snapclient ? 'Change ...' : 'Enable ...', 'snapcast' );
		}
	} );
} );
$( '#hostapd' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( !G.hostapd && G.wlanconnect && checked ) {
		info( {
			  icon    : 'networks'
			, title   : 'RPi Access Point'
			, message : '<wh>Wi-Fi is currently connected.</wh>'
						 +'<br>Disconnect and continue?'
			, cancel  : function() {
				if ( set ) {
					loader();
					location.href = '/settings.php?p=networks';
				} else {
					$( '#hostapd' ).prop( 'checked', 0 );
				}
			}
			, ok      : function() {
				$( '#hostapd' ).click();
			}
		} );
	} else {
		if ( checked ) {
			$( '#setting-hostapd' ).click();
		} else {
			notify( 'Access Point', 'Disable ...', 'accesspoint' );
			bash( [ 'hostapddisable' ] );
		}
	}
} );
$( '#setting-hostapd' ).click( function() {
	info( {
		  icon         : 'accesspoint'
		, title        : 'Access Point Settings'
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : G.hostapdconf
		, checkchanged : ( G.hostapd ? 1 : 0 )
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : function() {
			if ( set ) {
				loader();
				location.href = '/settings.php?p=networks';
			} else {
				$( '#hostapd' ).prop( 'checked', G.hostapd );
			}
		}
		, ok           : function() {
			var values = infoVal();
			var ip = values[ 0 ];
			var pwd = values[ 1 ];
			var ips = ip.split( '.' );
			var ip3 = ips.pop();
			var ip012 = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			bash( [ 'hostapdset', iprange, ip, pwd ] );
			notify( 'RPi Access Point', G.hostapd ? 'Change ...' : 'Enable ...', 'wifi' );
		}
	} );
} );
$( '#setting-localbrowser' ).click( function() {
	info( {
		  icon         : 'chromium'
		, title        : 'Browser on RPi'
		, textlabel    : [ 'Screen off <gr>(min)</gr>', 'Zoom <gr>(0.5-2.0)</gr>' ]
		, selectlabel  : 'Screen rotation'
		, boxwidth     : 80
		, select       : { 'Normal': 'NORMAL', '90°&ensp;&#xf524;': 'CW', '90°&ensp;&#xf523;': 'CCW', '180°': 'UD' } 
		, checkbox     : [ 'Mouse pointer' ]
		, order        : [ 'text', 'select', 'checkbox' ]
		, values       : G.localbrowserconf
		, checkchanged : ( G.localbrowser ? 1 : 0 )
		, checkblank   : 1
		, buttonlabel  : '<i class="fa fa-redo"></i>Refresh'
		, buttoncolor  : orange
		, button       : function() {
			bash( 'curl -s -X POST http://127.0.0.1/pub?id=reload -d 1' );
		}
		, beforeshow   : function() {
			$( '#infoButtons .extrabtn' ).toggleClass( 'disabled', !G.localbrowser );
			$( '#infoContent input:eq( 0 )' ).on( 'keyup paste cut', function() {
				$( this ).val( $( this ).val().replace( /[^0-9]/, '' ) );
			} );
			$( '#infoContent input:eq( 1 )' ).on( 'keyup paste cut', function() {
				$( this ).val( $( this ).val().replace( /[^0-9.]/, '' ) );
			} );
		}
		, cancel       : function() {
			$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		}
		, ok           : function() {
			var $input = $( '#infoContent input' );
			if ( $input.eq( 0 ).val() === '' ) $input.eq( 0 ).val( 0 );
			var zoom = $input.eq( 1 ).val();
			if ( zoom < 0.5 ) {
				$input.eq( 1 ).val( 0.5 );
			} else if ( zoom > 2 ) {
				$input.eq( 1 ).val( 2 );
			}
			bash( [ 'localbrowserset', ...infoVal() ] );
			notify( 'Chromium - Browser on RPi', G.localbrowser ? 'Change ...' : 'Enable ...', 'chromium' );
		}
	} );
} );
$( '#setting-smb' ).click( function() {
	info( {
		  icon         : 'networks'
		, title        : 'Samba File Sharing'
		, message      : '<wh>Write</wh> permission:</gr>'
		, checkbox     : [ '<gr>/mnt/MPD/</gr>SD', '<gr>/mnt/MPD/</gr>USB' ]
		, values       : G.smbconf
		, checkchanged : ( G.smb ? 1 : 0 )
		, cancel       : function() {
			$( '#smb' ).prop( 'checked', G.smb );
		}
		, ok           : function() {
			bash( [ 'smbset', ...infoVal() ] );
			notify( 'Samba - File Sharing', G.smb ? 'Change ...' : 'Enable ...', 'networks' );
		}
	} );
} );
$( '#setting-mpdscribble' ).click( function() {
	info( {
		  icon          : 'lastfm'
		, title         : 'Last.fm Scrobbler'
		, textlabel     : 'User'
		, passwordlabel : 'Password'
		, values        : G.mpdscribbleconf
		, checkchanged  : ( G.mpdscribble ? 1 : 0 )
		, checkblank    : 1
		, cancel        : function() {
			$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		}
		, ok            : function() {
			var values = infoVal();
			bash( [ 'mpdscribbleset', escapeUsrPwd( values[ 0 ] ), escapeUsrPwd( values[ 1 ] ) ], function( std ) {
				if ( std == -1 ) {
					info( {
						  icon    : 'lastfm'
						, title   : 'Last.fm Scrobbler'
						, message : 'Last.fm Login failed.'
					} );
					$( '#mpdscribble' ).prop( 'checked', 0 );
				}
			} );
			notify( 'Scrobbler', G.mpdscribble ? 'Change ...' : 'Enable ...', 'lastfm' );
		}
	} );
} );
$( '#setting-login' ).click( function() {
	info( {
		  icon          : 'lock'
		, title         : 'Password Login'
		, message       : ( G.login ? 'Change password:' : 'New setup:' )
		, passwordlabel : ( G.login ? [ 'Existing', 'New' ] : 'Password' )
		, checkblank    : 1
		, cancel        : function() {
			$( '#login' ).prop( 'checked', G.login );
		}
		, ok            : function() {
			var values = infoVal();
			notify( 'Password Login', G.login ? 'Change ...' : 'Enable...', 'lock' );
			$.post( 'cmd.php', {
				  cmd      : 'login'
				, password : escapeUsrPwd( values[ 0 ] )
				, pwdnew   : escapeUsrPwd( G.login ? values[ 1 ] : values )
			}, function( std ) {
				if ( !std ) passwordWrong();
				bannerHide();
			} );
		}
	} );
} );

} );
