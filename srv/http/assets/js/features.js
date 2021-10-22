$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#setting-snapclient' ).click( function() {
	info( {
		  icon         : 'snapcast'
		, title        : 'SnapClient'
		, message      : 'Sync SnapClient with SnapServer:'
		, textlabel    : 'Latency <gr>(ms)</gr>'
		, checkblank   : 1
		, values       : G.snapcastconf
		, boxwidth     : 100
		, checkchanged : ( G.snapclient ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent input:eq( 0 )' ).on( 'keyup paste cut', function() {
				$( this ).val( $( this ).val().replace( /[^0-9]/, '' ) );
			} );
		}
		, cancel       : function() {
			$( '#snapclient' ).prop( 'checked', G.snapclient );
		}
		, ok           : function() {
			bash( [ 'snapclientset', infoVal() ] );
			notify( 'Snapclient', G.snapclient ? 'Change ...' : 'Enable ...', 'snapcast' );
		}
	} );
} );
$( '#hostapd' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( !G.hostapd && G.wlanconnect && checked ) {
		info( {
			  icon    : 'networks'
			, title   : 'Access Point'
			, message : '<wh>Wi-Fi is currently connected.</wh>'
						 +'<br>Disconnect and continue?'
			, cancel  : function() {
				$( '#hostapd' ).prop( 'checked', 0 );
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
		, title        : 'Access Point'
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : G.hostapdconf
		, checkchanged : ( G.hostapd ? 1 : 0 )
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : function() {
			$( '#hostapd' ).prop( 'checked', G.hostapd );
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
var content = `
<table>
<tr><td>Rotation</td>
	<td><select>
		<option value="NORMAL">Normal</option>
		<option value="CW">90°&ensp;&#xf524;</option>
		<option value="CCW">90°&ensp;&#xf523;</option>
		<option value="UD">180°</option>
		</select>
	</td><td style="width: 50px"></td></tr>
<tr><td>Zoom</td>
	<td><input type="text"></td><td>&nbsp;<gr>(%)</gr></td></tr>
<tr><td>Sleep</td>
	<td><input id="screenoff"type="text"></td><td>&nbsp;<gr>(min)</gr></td></tr>
<tr id="playnooff"><td></td>
	<td colspan="2"><input type="checkbox">On while playing</td></tr>
<tr><td></td>
	<td colspan="2"><input type="checkbox">Mouse pointer</td></tr>
</table>`;
$( '#setting-localbrowser' ).click( function() {
	var v = G.localbrowserconf;
	info( {
		  icon         : G.browser
		, title        : 'Browser Screen'
		, content      : content
		, boxwidth     : 100
		, values       : [ v.rotate, v.zoom * 100, v.screenoff / 60, v.playnooff, v.cursor ]
		, checkchanged : ( G.localbrowser ? 1 : 0 )
		, checkblank   : 1
		, buttonlabel  : '<i class="fa fa-redo"></i>Refresh'
		, buttoncolor  : orange
		, button       : function() {
			bash( 'curl -s -X POST http://127.0.0.1/pub?id=reload -d 1' );
		}
		, beforeshow   : function() {
			$( '#playnooff' ).toggleClass( 'hide', v.screenoff === 0 );
			$( '#infoButtons .extrabtn' ).toggleClass( 'disabled', !G.localbrowser );
			$( '#infoContent input[type=text]' ).on( 'keyup paste cut', function() {
				var $this = $( this );
				$this.val( $this.val().replace( /[^0-9]/, '' ) );
				if ( +$( '#screenoff' ).val() ) {
					$( '#playnooff' ).removeClass( 'hide' );
				} else {
					$( '#playnooff' )
						.addClass( 'hide' )
						.find( 'input' ).prop( 'checked', 0 );
				}
			} );
		}
		, cancel       : function() {
			$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		}
		, ok           : function() {
			bash( [ 'localbrowserset', ...infoVal() ], function( std ) {
				if ( std === 'reboot' ) {
					info( {
						  icon    :  G.browser
						, title   : 'Browser on RPi'
						, message : 'Reboot required for rotate'
						, okcolor : orange
						, oklabel : '<i class="fa fa-reboot"></i>Reboot'
						, ok      : function() {
							bash( [ 'cmd', 'power', 'reboot' ] );
						}
					} );
				}
			} );
			notify( 'Browser on RPi', G.localbrowser ? 'Change ...' : 'Enable ...',  G.browser );
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
			bash( [ 'mpdscribbleset', ...infoVal() ], function( std ) {
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
$( '#login' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-login' ).click();
	} else {
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
				, password : values[ 0 ]
				, pwdnew   : G.login ? values[ 1 ] : values
			}, function( std ) {
				if ( !std ) passwordWrong();
				bannerHide();
			} );
		}
	} );
} );

} );

function passwordWrong() {
	info( {
		  icon    : 'lock'
		, title   : 'Password Login'
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', G.login );
}
function renderPage( list ) {
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
	showContent();
}
