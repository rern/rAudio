$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#setting-spotifyd' ).click( function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	var icon   = 'spotify';
	var title  = 'Spotify Client';
	if ( ! V.spotifyd && V.spotifytoken ) {
		bash( [ 'spotifyd', true ] );
		notify( icon, title, 'Enable ...' );
	} else if ( V.spotifytoken ) {
		info( {
			  icon    : icon
			, title   : title
			, message : 'Reset client keys?'
			, oklabel : '<i class="help fa fa-minus-circle"></i>Reset'
			, okcolor : red
			, ok      : () => bash( [ 'spotifytokenreset' ] )
		} );
	} else {
		if ( navigator.userAgent.includes( 'Firefox' ) ) {
			info( {
				  icon    : icon
				, title   : title
				, message : iconwarning +'Authorization cannot run on <wh>Firefox</wh>.'
			} );
			$( '#spotifyd' ).prop( 'checked', false );
			return
		}
		
		info( {
			  icon         : icon
			, title        : title
			, textlabel    : [ 'ID', 'Secret' ]
			, focus        : 0
			, footer       : 'Keys from private app: <i class="help fa fa-help"></i>'
			, boxwidth     : 320
			, checklength  : { 0: 32, 1: 32 }
			, beforeshow   : () => {
				$( '#infoContent .help' ).click( function() {
					$( '.container .help' ).eq( 0 ).click();
					$( '#infoX' ).click();
				} );
			}
			, cancel       : () => cancelSwitch( 'spotifyd' )
			, ok           : () => {
				var values = infoVal();
				var id     = values[ 0 ];
				var secret = values[ 1 ];
				bash( 'echo "base64client='+ btoa( id +':'+ secret ) +'" > /srv/http/data/system/spotify' );
				var data   = {
					  response_type : 'code'
					, client_id     : id
					, scope         : 'user-read-currently-playing user-read-playback-position'
					, redirect_uri  : V.spotifyredirect
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
	var icon = 'snapcast';
	var title = 'SnapClient';
	info( {
		  icon         : icon
		, title        : title
		, message      : 'Sync SnapClient with SnapServer:'
		, textlabel    : 'Latency <gr>(ms)</gr>'
		, focus        : 0
		, checkblank   : 1
		, values       : V.snapcastconf
		, boxwidth     : 100
		, checkchanged : V.snapclient
		, beforeshow   : () => {
			$( '#infoContent input' ).eq( 0 ).on( 'keyup paste cut', function() {
				$( this ).val( $( this ).val().replace( /[^0-9]/, '' ) );
			} );
		}
		, cancel       : () => cancelSwitch( 'snapclient' )
		, ok           : () => {
			bash( [ 'snapclient', true, infoVal() ] );
			notify( icon, title, V.snapclient ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-upmpdcli' ).click( function() {
	var icon  = 'upnp';
	var title = 'UPnP';
	info( {
		  icon         : icon
		, title        : title
		, checkbox     : [ 'Clear Playlist on start' ]
		, values       : [ V.upmpdcliownqueue ]
		, checkchanged : V.upmpdcli
		, cancel       : () => cancelSwitch( 'upmpdcli' )
		, ok           : () => {
			bash( [ 'upmpdcli', true, infoVal() ] );
			notify( icon, title, V.upmpdcli ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-camilladsp' ).click( function() {
	var icon  = 'camilladsp';
	var title = 'CamillaGUI';
	info( {
		  icon         : icon
		, title        : title
		, textlabel    : 'VU refresh rate <gr>(ms)</gr>'
		, focus        : 0
		, checkblank   : 1
		, boxwidth     : 100
		, values       : V.camillarefresh
		, checkchanged : V.camilladsp
		, cancel       : () => cancelSwitch( 'camilladsp' )
		, ok           : () => {
			bash( [ 'camilladsp', true, infoVal() ] );
			notify( icon, title, V.camilladsp ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-hostapd' ).click( function() {
	var icon  = 'accesspoint';
	var title = 'Access Point';
	info( {
		  icon         : icon
		, title        : title
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : V.hostapdconf
		, checkchanged : V.hostapd
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : () => cancelSwitch( 'hostapd' )
		, ok           : () => {
			var values  = infoVal();
			var ip      = values[ 0 ];
			var pwd     = values[ 1 ];
			var ips     = ip.split( '.' );
			var ip3     = ips.pop();
			var ip012   = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			bash( [ 'hostapd', true, iprange, ip, pwd ] );
			notify( icon, title, V.hostapd ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-autoplay' ).click( function() {
	var val   = V.autoplayconf[ 0 ] || V.autoplayconf[ 1 ] || V.autoplayconf[ 2 ];
	var icon  = 'play';
	var title = 'AutoPlay';
	info( {
		  icon         : icon
		, title        : title
		, checkbox     : [ 'Bluetooth connected', 'Audio CD inserted', 'Power on <gr>/ Reboot</gr>' ]
		, values       : val ? V.autoplayconf : [ false, false, true ]
		, checkchanged : V.autoplay
		, cancel       : () => cancelSwitch( 'autoplay' )
		, ok           : () => {
			bash( [ 'autoplay', true, ...infoVal() ] );
			notify( icon, title, V.autoplay ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-localbrowser' ).click( function() {
	var val            = V.localbrowserconf;
	var htmlbrightness = val.brightness ? '<div id="infoRange"><input type="range" min="0" max="255"><div>Brightness</div></div><br>' : '';
	var content        = `
<table>
<tr><td style="width:130px">Rotation</td>
	<td><select>
		<option value="NORMAL">Normal</option>
		<option value="CW">90° CW</option>
		<option value="CCW">90° CCW</option>
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
${ htmlbrightness }
<div class="btnbottom">
	&nbsp;<span class="reload">Reload<i class="fa fa-redo"></i></span>
	<span class="screenoff"><i class="fa fa-screenoff"></i>On/Off</span>
</div>`;
	var icon  = 'chromium';
	var title = 'Browser Display';
	info( {
		  icon         : icon
		, title        : title
		, content      : content
		, boxwidth     : 110
		, values       : [ val.rotate, val.zoom, val.cursor, val.screenoff, val.onwhileplay, val.brightness ]
		, checkchanged : V.localbrowser
		, beforeshow   : () => {
			$( '#onwhileplay' ).prop( 'disabled', val.screenoff === 0 );
			$( '.btnbottom' ).toggleClass( 'hide', ! V.localbrowser );
			$( '#infoContent' ).on( 'click', '.up, .dn', function() {
				var up   = $( this ).hasClass( 'up' );
				var zoom = +$( '#zoom' ).val();
				if ( ( up && zoom < 300 ) || ( ! up && zoom > 50 ) ) $( '#zoom' ).val( up ? zoom += 10 : zoom -= 10 );
				$( '#infoOk' ).toggleClass( 'disabled', I.values.join( '' ) === infoVal().join( '' ) );
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
			if ( val.brightness ) {
				$( '#infoRange input' ).on( 'click input keyup', function() {
					bash( 'echo '+ $( this ).val() +' > /sys/class/backlight/rpi_backlight/brightness' );
				} ).on( 'touchend mouseup keyup', function() {
					bash( 'echo '+ $( this ).val() +' > /srv/http/data/system/brightness' );
				} );
			}
		}
		, cancel       : () => cancelSwitch( 'localbrowser' )
		, ok           : () => {
			bash( [ 'localbrowser', true, ...infoVal() ] );
			notify( icon, title, V.localbrowser ? 'Change ...' : 'Enable ...', );
		}
	} );
} );
$( '#setting-smb' ).click( function() {
	var icon  = 'networks';
	var title = 'Samba File Sharing';
	info( {
		  icon         : icon
		, title        : title
		, message      : '<wh>Write</wh> permission:'
		, checkbox     : [ '<gr>/mnt/MPD/</gr>SD', '<gr>/mnt/MPD/</gr>USB' ]
		, values       : V.smbconf
		, checkchanged : V.smb
		, cancel       : () => cancelSwitch( 'smb' )
		, ok           : () => {
			bash( [ 'smb', true, ...infoVal() ] );
			notify( icon, title, V.smb ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#setting-multiraudio' ).click( function() {
	if ( location.host.slice( -5 ) !== 'local' ) {
		var ipsub = location.host.substring( 0, location.host.lastIndexOf( '.' ) ) +'.';
	} else {
		var ipsub = location.host;
	}
	var trhtml  = '<tr><td><input type="text" spellcheck="false"></td><td><input type="text" value="'+ ipsub +'" spellcheck="false"></td>'
			+'<td>&nbsp;<i class="fa fa-minus-circle fa-lg pointer ipremove"></i></td></tr>';
	var content = '<tr class="gr"><td>&ensp;Name</td><td>&ensp;IP / URL</td><td>&nbsp;<i id="ipadd" class="fa fa-plus-circle fa-lg wh pointer"></i></td></tr>'
				 + trhtml.replace( 'NUM', 1 );
	var dataL = V.multiraudioconf.length;
	if ( dataL ) {
		var iL = dataL / 2 - 1;
		for ( i = 0; i < iL; i++ ) content += trhtml;
	} else {
		V.multiraudioconf = [ "rAudio", location.host ];
	}
	var icon  = 'raudiobox';
	var title = 'Multiple rAudios';
	info( {
		  icon         : icon
		, title        : title
		, content      : '<table>'+ content +'</table>'
		, values       : V.multiraudioconf
		, checkchanged : V.multiraudio
		, beforeshow   : () => {
			if ( $( '#infoContent input' ).length === 2 ) {
				setTimeout( () => {
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
				I.inputs   = $( '#infoContent input' );
				var values = infoVal();
				if ( typeof values === 'string' ) values = [ values ];
				$( '#infoOk' ).toggleClass( 'disabled', values.join( ',' ) === V.multiraudioconf.join( ',' ) );
				$( '.ipremove' ).toggleClass( 'hide', I.inputs.length === 2 );
			} );
		}
		, cancel       : () => cancelSwitch( 'multiraudio' )
		, ok           : () => {
			I.inputs = $( '#infoContent input' );
			bash( [ 'multiraudio', true, ...infoVal() ] );
			notify( icon, title, V.multiraudio ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#login' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-login' ).click();
	} else {
		var icon  = 'lock';
		var title = 'Password Login';
		info( {
			  icon          : icon
			, title         : title
			, message       : 'Disable:'
			, passwordlabel : 'Password'
			, focus         : 0
			, checkblank    : 1
			, cancel        : () => cancelSwitch( 'login' )
			, ok            : () => {
				notify( icon, title, 'Disable ...' );
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
$( '#setting-login' ).click( function() {
	var icon  = 'lock';
	var title = 'Password Login';
	info( {
		  icon          : icon
		, title         : title
		, message       : ( V.login ? 'Change password:' : 'New setup:' )
		, passwordlabel : ( V.login ? [ 'Existing', 'New' ] : 'Password' )
		, focus         : 0
		, checkblank    : 1
		, cancel        : () => cancelSwitch( 'login' )
		, ok            : () => {
			var values = infoVal();
			notify( icon, title, V.login ? 'Change ...' : 'Enable...' );
			$.post( 'cmd.php', {
				  cmd      : 'login'
				, password : values[ 0 ]
				, pwdnew   : V.login ? values[ 1 ] : values
			}, function( verified ) {
				if ( verified == -1 ) passwordWrong();
			}, 'json' );
		}
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
	var icon  = 'lastfm';
	var title = 'Scrobbler';
	info( {
		  icon          : icon
		, title         : title
		, content       : content
		, boxwidth      : 170
		, values        : V.scrobbleconf
		, checkblank    : V.scrobblekey ? '' : [ 0, 1 ]
		, checkchanged  : V.scrobble
		, beforeshow    : () => {
			var $user = $( '#infoContent input[type=text]' );
			var $pwd = $( '#infoContent input[type=password]' ).parents( 'tr' )
			$user.prop( 'disabled', V.scrobblekey );
			$pwd.toggleClass( 'hide', V.scrobblekey );
			$( '.scrobbleuser' ).toggleClass( 'hide', ! V.scrobblekey )
			$( '.scrobbleuser' ).click( function() {
				$( this ).remove();
				$user.prop( 'disabled', false );
				$pwd.toggleClass( 'hide', false );
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoContent input' ).off( 'keyup paste cut' );
				I.checkblank = [ 0, 1 ];
				infoCheckSet();
			} );
		}
		, cancel        : () => cancelSwitch( 'scrobble' )
		, ok            : () => {
			bash( [ 'scrobble', true, ...infoVal() ], response => {
				if ( 'error' in response ) {
					info( {
						  icon    : icon
						, title   : title
						, message : response.message
					} );
					$( '#scrobble' ).prop( 'checked', 0 );
				}
			}, 'json' );
			notify( icon, title, V.scrobble ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#nfsserver' ).click( function() {
	var $this = $( this );
	var icon  = 'networks';
	var title = 'Server rAudio';
	if ( $this.hasClass( 'disabled' ) ) {
		info( {
			  icon    : icon
			, title   : title
			, message : $this.prev().html()
		} );
		$this.prop( 'checked', V.nfsserver );
		return
	}
	
	bash( [ 'nfssharelist' ], list => {
		info( {
			  icon    : icon
			, title   : title
			, message : ( V.nfsserver ? 'Shared directories:' : 'Directories to share:' )
						+'<br><br><pre><wh>'+ list +'</wh></pre><br>'
						+ ( V.nfsserver ? 'Disable all shares?' : 'Continue?' )
			, cancel  : () => cancelSwitch( 'nfsserver' )
			, okcolor : V.nfsserver ? orange : ''
			, ok      : () => {
				bash( [ 'nfsserver', ! V.nfsserver ] );
				notify( icon, title, V.nfsserver ? 'Disable ...' : 'Enable ...' );
			}
		} );
	} );
} );
$( '#setting-stoptimer' ).click( function() {
	var icon  = 'stopwatch';
	var title = 'Stop Timer';
	info( {
		  icon         : icon
		, title        : title
		, radio        : { Disable: 'false', '15 minutes': 15, '30 minutes': 30, '60 minutes': 60 }
		, checkbox     : [ 'Power off on stop' ]
		, values       : V.stoptimerconf || [ false, false ]
		, checkchanged : V.stoptimer
		, beforeshow   : () => {
			var $poweroff = $( '#infoContent input:checkbox' );
			$poweroff.prop( 'disabled', ! V.stoptimerconf[ 1 ] );
			$( '#infoContent tr:last' ).css( 'height', '60px' );
			$( '#infoContent input:radio' ).change( function() {
				var valfalse = $( this ).val() === 'false';
				if ( valfalse ) $poweroff.prop( 'checked', false );
				$poweroff.prop( 'disabled', valfalse );
			} );
		}
		, cancel  : () => cancelSwitch( 'stoptimer' )
		, ok           : () => {
			bash( [ 'stoptimer', true, ...infoVal() ] );
			notify( icon, title, V.stoptimer ? 'Change ...' : 'Enable ...' );
		}
	} );
} );

} );

function passwordWrong() {
	bannerHide();
	info( {
		  icon    : 'lock'
		, title   : 'Password Login'
		, message : 'Wrong existing password.'
	} );
	$( '#login' ).prop( 'checked', V.login );
}
function renderPage() {
	$( '#shairport-sync' ).toggleClass( 'disabled', V.shairportactive );
	$( '#dabradio' ).toggleClass( 'disabled', ! V.dabdevice );
	$( '#snapclient' ).parent().prev().toggleClass( 'single', ! V.snapclientactive );
	$( '#snapclient' ).toggleClass( 'disabled', V.snapclientactive );
	$( '#snapserver' ).toggleClass( 'disabled', V.snapserveractive );
	$( '#spotifyd' ).toggleClass( 'disabled', V.spotifydactive );
	$( '#redirecturi' ).text( V.spotifyredirect );
	$( '#upmpdcli' ).toggleClass( 'disabled', V.upmpdcliactive );
	$( '#hostapd' ).toggleClass( 'disabled', V.wlanconnected );
	$( '#smb' ).toggleClass( 'disabled', V.nfsserver );
	$( '#nfsserver' ).toggleClass( 'disabled', V.smb || V.shareddata || V.nfsconnected );
	$( '#stoptimer' ).toggleClass( 'disabled', V.state !== 'play' );
	if ( V.nosound ) {
		$( '#divdsp' ).addClass( 'hide' );
	} else {
		$( '#divdsp' ).removeClass( 'hide' );
		$( '#camilladsp' ).toggleClass( 'disabled', V.bluetoothsink || V.equalizer );
		$( '#equalizer' ).toggleClass( 'disabled', V.camilladsp );
	}
	if ( ! /code|error/.test( window.location.href ) ) {
		showContent();
		return
	}
	
	// spotify code
	var url   = new URL( window.location.href );
	var code  = url.searchParams.get( 'code' );
	var error = url.searchParams.get( 'error' );
	if ( code ) {
		bash( [ 'spotifytoken', code ], () => showContent );
		window.history.replaceState( '', '', window.location.origin +'/settings.php?p=features' );
		return
		
	} else if ( error ) {
		info( {
			  icon    : 'spotify'
			, title   : 'Spotify'
			, message : iconwarning +'Authorization failed:'
						+'<br>'+ error
		} );
	}
}
