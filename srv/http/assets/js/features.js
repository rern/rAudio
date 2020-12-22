$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function passwordWrong() {
	info( {
		  icon    : 'lock'
		, title   : 'Password Login'
		, nox     : 1
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', G.login );
}

refreshData = function() { // system page: use resetLocal() to aviod delay
	bash( '/srv/http/bash/features-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		$( '#shairport-sync' ).prop( 'checked', G[ 'shairport-sync' ] );
		$( '#spotifyd' ).prop( 'checked', G.spotifyd );
		$( '#snapclient' ).next().addBack().toggleClass( 'disabled', G.snapserver );
		$( '#snapclient' ).prop( 'checked', G.snapclient )
		$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
		$( '#upmpdcli' ).prop( 'checked', G.upmpdcli );
		$( '#streaming' ).prop( 'checked', G.streaming );
		$( '#snapserver' ).prop( 'checked', G.snapserver );
		$( '#transmission' ).prop( 'checked', G.transmission );
		$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		$( '#setting-localbrowser' ).toggleClass( 'hide', !G.localbrowser );
		$( '#aria2' ).prop( 'checked', G.aria2 );
		$( '#smb' ).prop( 'checked', G.smb );
		$( '#setting-smb' ).toggleClass( 'hide', !G.smb );
		$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
		$( '#login' ).prop( 'checked', G.login );
		$( '#setting-login' ).toggleClass( 'hide', !G.login );
		$( '#autoplay' ).prop( 'checked', G.autoplay );
		$( '#hostapd, #hostapdchk' ).prop( 'checked', G.hostapd );
		$( '#setting-hostapd' ).toggleClass( 'hide', !G.hostapd );
		services.forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		resetLocal();
		showContent();
	} );
}
refreshData();
// hostapd
if ( set ) setTimeout( function() { $( '#'+ set ).click() }, 900 );

$( '#ip' ).html( 'http://'+ location.host +':8000' );
if ( $( '#transmission' ).length ) {
	var url = location.host +':9091';
	$( '#urltran' ).html( '<a href="http://'+ url +'">'+ url +'</a>' );
}
if ( $( '#aria2' ).length ) {
	var url = location.host +'/aria2/index.html';
	$( '#urlaria' ).html( '<a href="http://'+ url +'">'+ url +'</a>' );
}
//---------------------------------------------------------------------------------------
$( '.enable' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( $( this ).hasClass( 'disabled' ) ) {
		$( this ).prop( 'checked', !checked );
		return
	}
	
	var idname = {
		  hostapd      : [ 'RPi Access Point',     'wifi' ]
		, localbrowser : [ 'Browser on RPi',       'chromium' ]
		, login        : [ 'Password Login',       'key' ]
		, mpdscribble  : [ 'Last.fm Scrobbler',    'lastfm' ]
		, smb          : [ 'Samba - File Sharing', 'network' ]
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
					var password = $( '#infoPasswordBox' ).val();
					$.post( 'cmd.php', {
						  cmd      : 'login'
						, password : password
					}, function( std ) {
						if ( std ) {
							notify( 'Password Login', 'Disable ...', 'key' );
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
		  autoplay         : [ 'Play on Startup',                  'refresh-play' ]
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
		  icon          : 'snapcast'
		, title         : 'SnapClient'
		, message       : 'Sync SnapClient with SnapServer:'
		, textlabel     : 'Latency <gr>(ms)</gr>'
		, textvalue     : G.snaplatency || 800
		, passwordlabel : 'Password'
		, checkbox      : { 'SnapServer different SSH password' : 1 }
		, preshow       : function() {
			if ( G.snapspassword ) {
				$( '#infoPasswordBox' ).val( G.snapspassword );
			} else {
				$( '.infolabel:eq( 1 ), .infoinput:eq( 1 ), #infotextsuffix' ).hide();
			}
			$( '#infoCheckBox input' ).change( function() {
				var checked = $( this ).prop( 'checked' );
				$( '.infolabel:eq( 1 ), .infoinput:eq( 1 ), #infotextsuffix' ).toggleClass( 'hide', checked );
				$( '#infoPasswordBox' ).val( checked ? G.snapspassword : '' );
			} );
			// verify changes
			if ( G.snapclient ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox, #infoPasswordBox' ).keyup( function() {
					var changed = $( '#infoTextBox' ).val() !== G.snaplatency;
					if ( !$( '#infotextsuffix' ).hasClass( 'hide' ) ) changed = changed && $( '#infoPasswordBox' ).val !== G.snapspassword;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, cancel        : function() {
			$( '#snapclient' ).prop( 'checked', G.snapclient );
		}
		, ok            : function() {
			var snaplatency = Math.abs( $( '#infoTextBox' ).val() );
			var snapspassword = $( '#infoPasswordBox' ).val();
			bash( [ 'snapclientset', snaplatency, snapspassword ] );
			notify( 'Snapclient', G.snapclient ? 'Change ...' : 'Enable ...', 'snapcast' );
		}
	} );
} );
$( '#setting-spotifyd' ).click( function() {
	bash( [ 'aplaydevices' ], function( devices ) {
		var devices = devices.split( '\n' );
		var radio = {}
		devices.forEach( function( val ) {
			radio[ val ] = val;
		} );
		info( {
			  icon    : 'spotify'
			, title   : 'Spotify Renderer'
			, message : 'Audio output:'
			, radio   : radio
			, checked : G.spotifyddevice
			, footer  : '<br>(Only if default one not working)'
			, preshow       : function() {
				// verify changes
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoOk' ).toggleClass( 'disabled', $( '#infoSelectBox option:selected' ).text() !== G.spotifyddevice );
			}
			, ok      : function() {
				bash( 'echo '+ $( '#infoSelectBox option:selected' ).text() +' > /srv/http/data/system/spotifydset' );
				notify( 'Spotify Renderer', 'Change ...', 'spotify' );
			}
		} );
	} );
} );
var localbrowserinfo = heredoc( function() { /*
	<div id="infoText" class="infocontent">
		<div id="infotextlabel">
			<a class="infolabel">
				Screen off <gr>(min)</gr><br>
				Zoom <gr>(0.5-2.0)</gr>
			</a>
		</div>
		<div id="infotextbox">
			<input type="text" class="infoinput input" id="infoTextBox" spellcheck="false" style="width: 60px; text-align: center">
			<input type="text" class="infoinput input" id="infoTextBox1" spellcheck="false" style="width: 60px; text-align: center">
		</div>
	</div>
	<hr>
	Screen rotation<br>
	<div id="infoRadio" class="infocontent infohtml" style="text-align: center">
		&ensp;0°<br>
		<label><input type="radio" name="inforadio" value="NORMAL"></label><br>
		&nbsp;<label>90°&ensp;<i class="fa fa-undo"></i>&ensp;<input type="radio" name="inforadio" value="CCW"></label><px30/>
		<label><input type="radio" name="inforadio" value="CW"> <i class="fa fa-redo"></i>&ensp;90°&nbsp;</label><br>
		<label><input type="radio" name="inforadio" value="UD"></label><br>
		&nbsp;180°
	</div>
	<hr>
	<div id="infoCheckBox" class="infocontent infohtml">
		<label><input type="checkbox">&ensp;Mouse pointer</label><br>
	</div>
*/ } );
$( '#setting-localbrowser' ).click( function() {
	var data = {}
	function verify() {
		var localzoom = +$( '#infoTextBox1' ).val();
		var changed = +$( '#infoTextBox' ).val() !== G.localscreenoff / 60
						|| ( localzoom !== G.localzoom && localzoom >= 0.5 && localzoom <= 2 )
						|| $( '#infoRadio input:checked' ).val() !== G.localrotate
						|| $( '#infoCheckBox input' ).prop( 'checked' ) !== G.localcursor;
		$( '#infoOk' ).toggleClass( 'disabled', !changed );
	}
	info( {
		  icon        : 'chromium'
		, title       : 'Browser on RPi'
		, content     : localbrowserinfo
		, preshow     : function() {
			$( '#infoTextBox1' ).val( G.localzoom );
			$( '#infoTextBox' ).val( G.localscreenoff / 60 );
			$( '#infoRadio input' ).val( [ G.localrotate || 'NORMAL' ] );
			$( '#infoCheckBox input' ).prop( 'checked', G.localcursor );
			if ( G.lcd ) $( '#infoRadio' ).after( '<gr>(Rotate TFT LCD: Reboot required.)</gr>' );
			// verify changes + values
			if ( G.localbrowser ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox, #infoTextBox1' ).keyup( verify );
				$( '#infoRadio, #infoCheckBox' ).change( verify );
			} else { // verify values
				$( '#infoTextBox' ).keyup( function() {
					var localzoom = +$( '#infoTextBox1' ).val();
					$( '#infoOk' ).toggleClass( 'disabled', localzoom < 0.5 || localzoom > 2 );
				} );
			}
		}
		, buttonlabel : '<i class="fa fa-refresh"></i>Refresh'
		, buttoncolor : '#de810e'
		, button      : function() {
			bash( 'curl -s -X POST http://127.0.0.1/pub?id=reload -d 1' );
		}
		, buttonwidth : 1
		, cancel      : function() {
			$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		}
		, ok          : function() {
			var localcursor    = $( '#infoCheckBox input' ).prop( 'checked' );
			var localrotate    = $( 'input[name=inforadio]:checked' ).val();
			var localscreenoff = $( '#infoTextBox' ).val() * 60;
			var localzoom = parseFloat( $( '#infoTextBox1' ).val() ) || 1;
			bash( [ 'localbrowserset', localrotate, localscreenoff, localcursor, localzoom ] );
			notify( 'Chromium - Browser on RPi', G.localbrowser ? 'Change ...' : 'Enable ...', 'chromium' );
		}
	} );
} );
$( '#setting-smb' ).click( function() {
	info( {
		  icon     : 'network'
		, title    : 'Samba File Sharing'
		, message  : '<wh>Write</wh> permission:</gr>'
		, checkbox : { '<gr>/mnt/MPD/</gr>SD': 1, '<gr>/mnt/MPD/</gr>USB': 1 }
		, preshow  : function() {
			$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', G.smbwritesd );
			$( '#infoCheckBox input:eq( 1 )' ).prop( 'checked', G.smbwriteusb );
			// verify changes
			if ( G.smb ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoCheckBox' ).change( function() {
					var changed = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' ) !== G.smbwritesd || $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' ) !== G.smbwriteusb;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, cancel   : function() {
			$( '#smb' ).prop( 'checked', G.smb );
		}
		, ok       : function() {
			var smbwritesd = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' );
			var smbwriteusb = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
			bash( [ 'smbset', smbwritesd, smbwriteusb ] );
			notify( 'Samba - File Sharing', G.smb ? 'Change ...' : 'Enable ...', 'network' );
		}
	} );
} );
$( '#setting-mpdscribble' ).click( function() {
	var data = G.mpdscribbleval ? G.mpdscribbleval.split( '\n' ) : [ '', '' ];
	var user = data[ 0 ];
	var pwd = data[ 1 ];
	info( {
		  icon          : 'lastfm'
		, title         : 'Last.fm Scrobbler'
		, textlabel     : 'User'
		, textvalue     : user
		, passwordlabel : 'Password'
		, preshow       : function() {
			$( '#infoPasswordBox' ).val( pwd );
			// verify changes
			if ( G.mpdscribble ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox, #infoPasswordBox' ).keyup( function() {
					var changed = $( '#infoTextBox' ).val() !== user || $( '#infoPasswordBox' ).val() !== pwd;
					$( '#infoOk' ).toggleClass( 'disabled', !changed );
				} );
			}
		}
		, cancel        : function() {
			$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		}
		, ok            : function() {
			var user = $( '#infoTextBox' ).val().replace( /(["&()\\])/g, '\$1' );
			var password = $( '#infoPasswordBox' ).val().replace( /(["&()\\])/g, '\$1' );
			bash( [ 'mpdscribbleset', user, password ], function( std ) {
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
		, pwdrequired   : 1
		, cancel        : function() {
			$( '#login' ).prop( 'checked', G.login );
		}
		, ok            : function() {
			var password = $( '#infoPasswordBox' ).val();
			var pwdnew = $( '#infoPasswordBox1' ).length ? $( '#infoPasswordBox1' ).val() : password;
			var type = G.login ? 'changed.' : 'enabled.';
			notify( 'Password Login', G.login ? 'Change ...' : 'Enable...', 'key' );
			$.post( 'cmd.php', {
				  cmd      : 'login'
				, password : password
				, pwdnew   : pwdnew
			}, function( std ) {
				if ( !std ) passwordWrong();
				bannerHide();
			} );
		}
	} );
} );
$( '#hostapdchk' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( !G.hostapd && G.wlanconnect && checked ) {
		info( {
			  icon      : 'network'
			, title     : 'RPi Access Point'
			, message   : '<wh>Wi-Fi is currently connected.</wh>'
						 +'<br>Disconnect and continue?'
			, cancel    : function() {
				if ( set ) {
					loader();
					location.href = '/settings.php?p=networks';
				} else {
					$( '#hostapd, #hostapdchk' ).prop( 'checked', 0 );
				}
			}
			, ok        : function() {
				$( '#hostapd' ).click();
			}
		} );
	} else {
		$( '#hostapd' ).click();
	}
} );
$( '#setting-hostapd' ).click( function() {
	info( {
		  icon         : 'network'
		, title        : 'RPi Access Point Settings'
		, message      : 'Password - 8 characters or more'
		, textlabel    : [ 'Password', 'IP' ]
		, textvalue    : [ G.hostapdpwd, G.hostapdip ]
		, textrequired : [ 0, 1 ]
		, preshow       : function() {
			// verify changes + values
			if ( G.hostapd || $( '#infoTextBox' ).val().length < 8 ) {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoTextBox, #infoTextBox1' ).keyup( function() {
					var pwd = $( '#infoTextBox' ).val();
					var ip = $( '#infoTextBox1' ).val();
					var changed = pwd.length > 7 && ( pwd !== G.hostapdpwd || ip !== G.hostapdip );
					var validip = validateIP( ip );
					$( '#infoOk' ).toggleClass( 'disabled', !changed || !validip );
				} );
			} else { // verify values
				$( '#infoTextBox' ).keyup( function() {
					var pwd = $( '#infoTextBox' ).val();
					var ip = $( '#infoTextBox1' ).val();
					$( '#infoOk' ).toggleClass( 'disabled', pwd < 8 || !validateIP( ip ) );
				} );
			}
		}
		, cancel       : function() {
			if ( set ) {
				loader();
				location.href = '/settings.php?p=networks';
			} else {
				$( '#hostapd, #hostapdchk' ).prop( 'checked', G.hostapd );
			}
		}
		, ok           : function() {
			var pwd = $( '#infoTextBox' ).val();
			var ip = $( '#infoTextBox1' ).val();
			var ips = ip.split( '.' );
			var ip3 = ips.pop();
			var ip012 = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			bash( [ 'hostapdset', iprange, ip, pwd ] );
			notify( 'RPi Access Point', G.hostapd ? 'Change ...' : 'Enable ...', 'wifi' );
		}
	} );
} );

} );
