$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#setting-spotifyd' ).click( function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	if ( !G.spotifyd && G.spotifytoken ) {
		bash( [ 'spotifyd', true ] );
		notify( 'Spotify', 'Enable ...', 'spotify' );
	} else if ( G.spotifytoken ) {
		info( {
			  icon    : 'spotify'
			, title   : 'Spotify Client'
			, message : 'Reset client keys?'
			, oklabel : '<i class="help fa fa-minus-circle"></i>Reset'
			, okcolor : red
			, ok      : function() {
				bash( [ 'spotifytokenreset' ] );
			}
		} );
	} else {
		if ( navigator.userAgent.includes( 'Firefox' ) ) {
			info( {
				  icon    : 'spotify'
				, title   : 'Spotify Client'
				, message : '<i class="fa fa-warning"></i> Authorization cannot run on <wh>Firefox</wh>.'
			} );
			$( '#spotifyd' ).prop( 'checked', false );
			return
		}
		
		info( {
			  icon         : 'spotify'
			, title        : 'Spotify Client'
			, textlabel    : [ 'ID', 'Secret' ]
			, focus        : 0
			, footer       : 'Keys from private app: <i class="help fa fa-help"></i>'
			, boxwidth     : 320
			, checklength  : { 0: 32, 1: 32 }
			, beforeshow   : function() {
				$( '#infoContent .help' ).click( function() {
					$( '.container .help' ).eq( 0 ).click();
					$( '#infoX' ).click();
				} );
			}
			, cancel       : function() {
				$( '#spotifyd' ).prop( 'checked', G.spotifyd );
			}
			, ok         : function() {
				var values = infoVal();
				var id = values[ 0 ];
				var secret = values[ 1 ];
				bash( 'echo "base64client='+ btoa( id +':'+ secret ) +'" > /srv/http/data/system/spotify' );
				var data = {
					  response_type : 'code'
					, client_id     : id
					, scope         : 'user-read-currently-playing user-read-playback-position'
					, redirect_uri  : G.spotifyredirect
					, state         : window.location.hostname
				}
				window.location = 'https://accounts.spotify.com/authorize?'+ $.param( data );
			}
		} );
	}
} );
$( '.screenshot' ).click( function() {
	info( {
		  icon        : 'spotify'
		, title       : 'Spotify for Developers'
		, message     : '<img src="/assets/img/spotify.gif" style="width: 100%; height: auto; margin-bottom: 0;">'
		, okno        : 1
	} );
} );
$( '#setting-snapclient' ).click( function() {
	info( {
		  icon         : 'snapcast'
		, title        : 'SnapClient'
		, message      : 'Sync SnapClient with SnapServer:'
		, textlabel    : 'Latency <gr>(ms)</gr>'
		, focus        : 0
		, checkblank   : 1
		, values       : G.snapcastconf
		, boxwidth     : 100
		, checkchanged : ( G.snapclient ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent input' ).eq( 0 ).on( 'keyup paste cut', function() {
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
$( '#setting-upmpdcli' ).click( function() {
	info( {
		  icon         : 'upnp'
		, title        : 'UPnP'
		, checkbox     : [ 'Clear Playlist on start' ]
		, values       : [ G.upmpdcliownqueue ]
		, checkchanged : ( G.upmpdcli ? 1 : 0 )
		, cancel       : function() {
			$( '#upmpdcli' ).prop( 'checked', G.upmpdcli );
		}
		, ok           : function() {
			bash( [ 'upmpdcliset', infoVal() ] );
			notify( 'UPnP', G.upmpdcli ? 'Change ...' : 'Enable ...', 'upnp' );
		}
	} );
} );
$( '#setting-camilladsp' ).click( function() {
	info( {
		  icon         : 'camilladsp'
		, title        : 'CamillaGUI'
		, textlabel    : 'Status: Refresh <gr>(ms)</gr>'
		, checkbox     : [ 'Apply automatically' ]
		, focus        : 0
		, checkblank   : 1
		, boxwidth     : 100
		, values       : G.camillaguiconf
		, boxwidth     : 100
		, checkchanged : ( G.camilladsp ? 1 : 0 )
		, beforeshow   : function() {
			$( '#infoContent tr:eq( 1 ) td:eq( 0 )' ).text( 'Configurations:' )
		}
		, cancel       : function() {
			$( '#camilladsp' ).prop( 'checked', G.camilladsp );
		}
		, ok           : function() {
			bash( [ 'camillaguiset', ...infoVal() ] );
			notify( 'CamillaDSP', G.camilladsp ? 'Change ...' : 'Enable ...', 'camilladsp' );
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
$( '#setting-autoplay' ).click( function() {
	info( {
		  icon         : 'play'
		, title        : 'AutoPlay'
		, checkbox     : [ 'Bluetooth connected', 'Audio CD inserted', 'Power on <gr>/ Reboot</gr>' ]
		, values       : G.autoplayconf
		, checkchanged : ( G.autoplay ? 1 : 0 )
		, cancel       : function() {
			$( '#autoplay' ).prop( 'checked', G.autoplay );
		}
		, ok           : function() {
			bash( [ 'autoplayset', ...infoVal() ] );
			notify( 'AutoPlay', G.autoplay ? 'Change ...' : 'Enable ...', 'play' );
		}
	} );
} );
$( '#setting-localbrowser' ).click( function() {
	var v = G.localbrowserconf;
	var brightness =  v.brightness ? '<div id="infoRange"><input type="range" min="0" max="255"><div>Brightness</div></div><br>' : '';
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
${ brightness }
<div class="btnbottom">
	&nbsp;<span class="reload">Reload<i class="fa fa-redo"></i></span>
	<span class="screenoff"><i class="fa fa-screenoff"></i>On/Off</span>
</div>`;
	info( {
		  icon         : 'chromium'
		, title        : 'Browser Display'
		, content      : content
		, boxwidth     : 100
		, values       : [ v.rotate, v.zoom, v.cursor, v.screenoff, v.onwhileplay, v.brightness ]
		, checkchanged : ( G.localbrowser ? 1 : 0 )
		, beforeshow   : function() {
			$( '#onwhileplay' ).prop( 'disabled', v.screenoff === 0 );
			$( '.btnbottom' ).toggleClass( 'hide', !G.localbrowser );
			$( '#infoContent' ).on( 'click', '.up, .dn', function() {
				var up = $( this ).hasClass( 'up' );
				var zoom = +$( '#zoom' ).val();
				if ( ( up && zoom < 300 ) || ( !up && zoom > 50 ) ) $( '#zoom' ).val( up ? zoom += 10 : zoom -= 10 );
				$( '#infoOk' ).toggleClass( 'disabled', O.values.join( '' ) === infoVal().join( '' ) );
			} );
			$( '#infoContent' ).on( 'change', '#screenoff', function() {
				if ( $( this ).val() != 0 ) {
					$( '#onwhileplay' ).prop( 'disabled', 0 );
				} else {
					$( '#onwhileplay' )
						.prop( 'checked', 0 )
						.prop( 'disabled', 1 );
				}
			} );
			$( '.reload' ).click( function() {
				bash( 'curl -s -X POST http://127.0.0.1/pub?id=reload -d 1' );
			} );
			$( '.screenoff' ).click( function() {
				bash( [ 'screenofftoggle' ] );
			} );
			if ( v.brightness ) {
				$( '#infoRange input' ).on( 'click input keyup', function() {
					bash( 'echo '+ $( this ).val() +' > /sys/class/backlight/rpi_backlight/brightness' );
				} ).on( 'touchend mouseup keyup', function() {
					bash( 'echo '+ $( this ).val() +' > /srv/http/data/system/brightness' );
				} );
			}
		}
		, cancel       : function() {
			$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		}
		, ok           : function() {
			bash( [ 'localbrowserset', ...infoVal() ] );
			notify( 'Browser on RPi', G.localbrowser ? 'Change ...' : 'Enable ...',  'chromium' );
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
$( '#setting-multiraudio' ).click( function() {
	if ( location.host.slice( -5 ) !== 'local' ) {
		var ipsub = location.host.substring( 0, location.host.lastIndexOf( '.' ) ) +'.';
	} else {
		var ipsub = location.host;
	}
	var trhtml = '<tr><td><input type="text" spellcheck="false"></td><td><input type="text" value="'+ ipsub +'" spellcheck="false"></td>'
			+'<td>&nbsp;<i class="fa fa-minus-circle fa-lg pointer ipremove"></i></td></tr>';
	var content = '<tr class="gr"><td>&ensp;Name</td><td>&ensp;IP / URL</td><td>&nbsp;<i id="ipadd" class="fa fa-plus-circle fa-lg wh pointer"></i></td></tr>'
				 + trhtml.replace( 'NUM', 1 );
	var dataL = G.multiraudioconf.length;
	if ( dataL ) {
		var iL = dataL / 2 - 1;
		for ( i = 0; i < iL; i++ ) content += trhtml;
	} else {
		G.multiraudioconf = [ "rAudio", location.host ];
	}
	info( {
		  icon         : 'raudiobox'
		, title        : 'Multiple rAudios'
		, content      : '<table>'+ content +'</table>'
		, values       : G.multiraudioconf
		, checkchanged : ( G.multiraudio ? 1 : 0 )
		, beforeshow   : function() {
			if ( $( '#infoContent input' ).length === 2 ) {
				setTimeout( function() {
					$( '.ipremove' ).addClass( 'hide' );
					$( '#infoOk' ).addClass( 'disabled' );
				}, 0 );
			}
			$( '#infoContent td' ).css( 'padding', 0 );
			$( '#infoContent tr' ).find( 'td:eq( 0 )' ).css( 'width', '180px' );
			$( '#infoContent tr' ).find( 'td:eq( 1 )' ).css( 'width', '130px' );
			$( '#ipadd' ).click( function() {
				$( '#infoContent tr:last' ).after( trhtml.replace( 'NUM', $( '#infoContent input' ).length + 1 ) );
				$( '.ipremove' ).removeClass( 'hide' );
				$( '#infoOk' ).removeClass( 'disabled' );
			} );
			$( '#infoContent' ).on( 'click', '.ipremove', function() {
				$( this ).parents( 'tr' ).remove();
				O.inputs = $( '#infoContent input' );
				var values = infoVal();
				if ( typeof values === 'string' ) values = [ values ];
				$( '#infoOk' ).toggleClass( 'disabled', values.join( ',' ) === G.multiraudioconf.join( ',' ) );
				$( '.ipremove' ).toggleClass( 'hide', O.inputs.length === 2 );
			} );
		}
		, cancel       : function() {
			$( '#multiraudio' ).prop( 'checked', G.multiraudio );
		}
		, ok           : function() {
			O.inputs = $( '#infoContent input' );
			bash( [ 'multiraudioset', ...infoVal() ] );
			notify( 'Multiple rAudios', G.multiraudio ? 'Change ...' : 'Enable ...', 'raudiobox' );
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
			, focus         : 0
			, pwdrequired   : 1
			, ok            : function() {
				notify( 'Password Login', 'Disable ...', 'lock' );
				$.post( 'cmd.php', {
					  cmd      : 'login'
					, disable  : 1
					, password : infoVal()
				}, function( std ) {
					if ( std == -1 ) passwordWrong();
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
		, focus         : 0
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
$( '#setting-scrobble' ).click( function() {
	var content = `\
<table>
<tr><td></td><td><label><input type="checkbox"><i class="fa fa-airplay"></i> AirPlay</label></td></tr>
<tr><td></td><td><label><input type="checkbox"><i class="fa fa-bluetooth"></i> Bluetooth</label></td></tr>
<tr><td></td><td><label><input type="checkbox"><i class="fa fa-spotify"></i> Spotify</label></td></tr>
<tr><td></td><td><label><input type="checkbox"> <i class="fa fa-upnp"></i>UPnP</label></td></tr>
<tr><td></td><td><label><input type="checkbox">Notify on scrobble</label></td></tr>
<tr><td>User</td><td><input type="text"></td><td>&ensp;<i class="scrobbleuser fa fa-minus-circle fa-lg pointer"></i></td></tr>
<tr><td>Password</td><td><input type="password"></td><td><i class="fa fa-eye fa-lg"></i></td></tr>
</table>`;
	info( {
		  icon          : 'lastfm'
		, title         : 'Scrobble'
		, content       : content
		, boxwidth      : 170
		, values        : G.scrobbleconf
		, checkblank    : G.scrobblekey ? '' : [ 0, 1 ]
		, checkchanged  : G.scrobble ? 1 : 0
		, beforeshow    : function() {
			var $user = $( '#infoContent input[type=text]' );
			var $pwd = $( '#infoContent input[type=password]' ).parents( 'tr' )
			$user.prop( 'disabled', G.scrobblekey );
			$pwd.toggleClass( 'hide', G.scrobblekey );
			$( '.scrobbleuser' ).toggleClass( 'hide', !G.scrobblekey )
			$( '.scrobbleuser' ).click( function() {
				$( this ).remove();
				$user.prop( 'disabled', false );
				$pwd.toggleClass( 'hide', false );
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoContent input' ).off( 'keyup paste cut' );
				O.checkblank = [ 0, 1 ];
				infoCheckSet();
			} );
		}
		, cancel        : function() {
			$( '#scrobble' ).prop( 'checked', G.scrobble );
		}
		, ok            : function() {
			bash( [ 'scrobbleset', ...infoVal() ], function( response ) {
				if ( 'error' in response ) {
					info( {
						  icon    : 'lastfm'
						, title   : 'Scrobble'
						, message : response.message
					} );
					$( '#scrobble' ).prop( 'checked', 0 );
				}
			}, 'json' );
			notify( 'Scrobble', G.scrobble ? 'Change ...' : 'Enable ...', 'lastfm' );
		}
	} );
} );
$( '#setting-stoptimer' ).click( function() {
	info( {
		  icon         : 'stopwatch'
		, title        : 'Stop Timer'
		, radio        : { Disable: 'false', '15 minutes': 15, '30 minutes': 30, '60 minutes': 60 }
		, checkbox     : [ 'Power off on stop' ]
		, values       : G.stoptimerconf
		, checkchanged : 1
		, beforeshow   : function() {
			var $poweroff = $( '#infoContent input:checkbox' );
			$poweroff.prop( 'disabled', !G.stoptimerconf[ 1 ] );
			$( '#infoContent tr:last' ).css( 'height', '60px' );
			$( '#infoContent input:radio' ).change( function() {
				var valfalse = $( this ).val() === 'false';
				if ( valfalse ) $poweroff.prop( 'checked', false );
				$poweroff.prop( 'disabled', valfalse );
			} );
		}
		, ok           : function() {
			bash( [ 'stoptimerset', ...infoVal() ] );
			notify( 'Scrobble', G.stoptimer ? 'Change ...' : 'Enable ...', 'stopwatch' );
		}
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
function renderPage() {
	$( '#shairport-sync' ).toggleClass( 'disabled', G.shairportactive );
	$( '#snapclient' ).parent().prev().toggleClass( 'single', !G.snapclientactive );
	$( '#snapclient' ).toggleClass( 'disabled', G.snapclientactive );
	$( '#snapserver' ).toggleClass( 'disabled', G.snapserveractive );
	$( '#spotifyd' ).toggleClass( 'disabled', G.spotifydactive );
	$( '#redirecturi' ).text( G.spotifyredirect );
	$( '#upmpdcli' ).toggleClass( 'disabled', G.upmpdcliactive );
	$( '#hostapd' ).toggleClass( 'disabled', G.wlanconnected );
	if ( G.nosound ) {
		$( '#divdsp' ).addClass( 'hide' );
	} else {
		$( '#divdsp' ).removeClass( 'hide' );
		$( '#camilladsp' ).toggleClass( 'disabled', G.bluetoothsink || G.equalizer );
		$( '#equalizer' ).toggleClass( 'disabled', G.camilladsp );
	}
	if ( ! /code|error/.test( window.location.href ) ) {
		showContent();
		return
	}
	
	// spotify code
	var url = new URL( window.location.href );
	var code = url.searchParams.get( 'code' );
	var error = url.searchParams.get( 'error' );
	if ( code ) {
		bash( [ 'spotifytoken', code ], function() {
			showContent();
		} );
		window.history.replaceState( '', '', window.location.origin +'/settings.php?p=features' );
		return
		
	} else if ( error ) {
		info( {
			  icon    : 'spotify'
			, title   : 'Spotify'
			, message : '<i class="fa fa-warning"></i> Authorization failed:'
						+'<br>'+ error
		} );
	}
}
