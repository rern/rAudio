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
<tr><td style="width:130px">Rotation</td>
	<td><select>
		<option value="NORMAL">Normal</option>
		<option value="CW">90°&ensp;&#xf524;</option>
		<option value="CCW">90°&ensp;&#xf523;</option>
		<option value="UD">180°</option>
		</select>
	</td><td></td></tr>
<tr><td>Zoom</td>
	<td><input id="zoom" type="text" disabled></td>
	<td>&nbsp;<gr>%</gr><i class="dn fa fa-minus-circle btnicon"></i><i class="up fa fa-plus-circle btnicon"></i></td></tr>
<tr><td></td>
	<td colspan="2"><label><input type="checkbox">Mouse pointer</td></label></tr>
<tr style="height: 10px"></tr>
<tr><td>Screen off</td>
	<td><select id="screenoff">
		<option value="0">Disable</option>
		<option value="1">1</option>
		<option value="2">2</option>
		<option value="5">5</option>
		<option value="10">10</option>
		<option value="15">15</option>
		</select>
	</td><td>&nbsp;<gr>minutes</gr></td></tr>
<tr><td></td>
	<td colspan="2"><label><input type="checkbox" id="onwhileplay">On while playing</label></td></tr>
<tr style="height: 10px"></tr>
</table>
<div id="btnicon">&nbsp;<gr>Reload<i class="refresh fa fa-redo btnicon wh"></i><i class="screenoff fa fa-screenoff btnicon wh"></i>On/Off</gr></div>`;
$( '#setting-localbrowser' ).click( function() {
	var v = G.localbrowserconf;
	info( {
		  icon         : G.browser
		, title        : 'Browser Display'
		, content      : content
		, boxwidth     : 100
		, values       : [ v.rotate, v.zoom, v.cursor, v.screenoff, v.onwhileplay ]
		, checkchanged : ( G.localbrowser ? 1 : 0 )
		, beforeshow   : function() {
			$( '#onwhileplay' ).prop( 'disabled', v.screenoff === 0 );
			$( '#btnicon' ).toggleClass( 'hide', !G.localbrowser );
			$( '#infoContent' ).on( 'click', '.up, .dn', function() {
				var up = $( this ).hasClass( 'up' );
				var zoom = +$( '#zoom' ).val();
				if ( ( up && zoom < 300 ) || ( !up && zoom > 50 ) ) $( '#zoom' ).val( up ? zoom += 10 : zoom -= 10 );
				checkChanged();
			} );
			$( '#screenoff' ).change( function() {
				if ( $( this ).val() != 0 ) {
					$( '#onwhileplay' ).prop( 'disabled', 0 );
				} else {
					$( '#onwhileplay' )
						.prop( 'checked', 0 )
						.prop( 'disabled', 1 );
				}
			} );
			$( '.refresh' ).click( function() {
				bash( 'curl -s -X POST http://127.0.0.1/pub?id=reload -d 1' );
			} );
			$( '.screenoff' ).click( function() {
				bash( [ 'screenofftoggle' ] );
			} );
		}
		, cancel       : function() {
			$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		}
		, ok           : function() {
			bash( [ 'localbrowserset', ...infoVal() ] );
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
	$( '#snapclient' )
		.prop( 'checked', G.snapclient )
		.prop( 'checked', G.snapserver );
	$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
	$( '#upmpdcli' ).prop( 'checked', G.upmpdcli );
	$( '#streaming' ).prop( 'checked', G.streaming );
	$( '#snapserver' )
		.prop( 'checked', G.snapserver )
		.prop( 'disabled', G.snapclient );
	$( '#hostapd' )
		.prop( 'checked', G.hostapd )
		.prop( 'disabled', G.wlanconnect );
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
