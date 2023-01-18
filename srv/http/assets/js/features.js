$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#setting-spotifyd' ).click( function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	if ( ! S.spotifyd && S.spotifytoken ) {
		bash( [ 'spotifyd', true ] );
		notify( SW.icon, SW.title, 'Enable ...' );
	} else if ( S.spotifytoken ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : 'Reset client keys?'
			, oklabel : ico( 'minus-circle help' ) +'Reset'
			, okcolor : red
			, ok      : () => bash( [ 'spotifytokenreset' ] )
		} );
	} else {
		if ( navigator.userAgent.includes( 'Firefox' ) ) {
			info( {
				  icon    : SW.icon
				, title   : SW.title
				, message : iconwarning +'Authorization cannot run on <wh>Firefox</wh>.'
			} );
			$( '#spotifyd' ).prop( 'checked', false );
			return
		}
		
		info( {
			  icon        : SW.icon
			, title       : SW.title
			, textlabel   : [ 'ID', 'Secret' ]
			, focus       : 0
			, footer      : 'Keys from private app: '+ ico( 'help help' )
			, boxwidth    : 320
			, checklength : { 0: 32, 1: 32 }
			, beforeshow  : () => {
				$( '#infoContent .help' ).click( function() {
					$( '.container .help' ).eq( 0 ).click();
					$( '#infoX' ).click();
				} );
			}
			, cancel      : switchCancel
			, ok          : () => {
				var values = infoVal();
				var id     = values[ 0 ];
				var secret = values[ 1 ];
				bash( 'echo "base64client='+ btoa( id +':'+ secret ) +'" > /srv/http/data/system/spotify' );
				var data   = {
					  response_type : 'code'
					, client_id     : id
					, scope         : 'user-read-currently-playing user-read-playback-position'
					, redirect_uri  : S.spotifyredirect
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
		  icon         : SW.icon
		, title        : SW.title
		, message      : 'Sync SnapClient with SnapServer:'
		, textlabel    : 'Latency <gr>(ms)</gr>'
		, focus        : 0
		, checkblank   : 1
		, values       : S.snapcastconf
		, boxwidth     : 100
		, checkchanged : S.snapclient
		, beforeshow   : () => {
			$( '#infoContent input' ).eq( 0 ).on( 'keyup paste cut', function() {
				$( this ).val( $( this ).val().replace( /[^0-9]/, '' ) );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-upmpdcli' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Clear Playlist on start' ]
		, values       : [ S.upmpdcliownqueue ]
		, checkchanged : S.upmpdcli
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-camilladsp' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, textlabel    : 'VU refresh rate <gr>(ms)</gr>'
		, focus        : 0
		, checkblank   : 1
		, boxwidth     : 100
		, values       : S.camillarefresh
		, checkchanged : S.camilladsp
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-hostapd' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : S.hostapdconf
		, checkchanged : S.hostapd
		, checkblank   : 1
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-autoplay' ).click( function() {
	var val  = S.autoplayconf[ 0 ] || S.autoplayconf[ 1 ] || S.autoplayconf[ 2 ];
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Bluetooth connected', 'Audio CD inserted', 'Power on <gr>/ Reboot</gr>' ]
		, values       : val ? S.autoplayconf : [ false, false, true ]
		, checkchanged : S.autoplay
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-localbrowser' ).click( function() {
	var val            = S.localbrowserconf;
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
	<td>&nbsp;<gr>%</gr>${ ico( 'minus-circle btnicon' ) + ico( 'plus-circle btnicon' ) }</td></tr>
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
	&nbsp;<span class="reload">Reload${ ico( 'redo' ) }</span>
	<span class="screenoff">${ ico( 'screenoff' ) }On/Off</span>
</div>`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : content
		, boxwidth     : 110
		, values       : [ val.rotate, val.zoom, val.cursor, val.screenoff, val.onwhileplay, val.brightness ]
		, checkchanged : S.localbrowser
		, beforeshow   : () => {
			selectText2Html( { '90° CW': '90°&emsp;'+ ico( 'redo' ), '90° CCW': '90°&emsp;'+ ico( 'undo' ) } );
			$( '#onwhileplay' ).prop( 'disabled', val.screenoff === 0 );
			$( '.btnbottom' ).toggleClass( 'hide', ! S.localbrowser );
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
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-smb' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, message      : '<wh>Write</wh> permission:'
		, checkbox     : [ '<gr>/mnt/MPD/</gr>SD', '<gr>/mnt/MPD/</gr>USB' ]
		, values       : S.smbconf
		, checkchanged : S.smb
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-multiraudio' ).click( function() {
	if ( location.host.slice( -5 ) !== 'local' ) {
		var ipsub = location.host.substring( 0, location.host.lastIndexOf( '.' ) ) +'.';
	} else {
		var ipsub = location.host;
	}
	var trhtml  = '<tr><td><input type="text" spellcheck="false"></td><td><input type="text" value="'+ ipsub +'" spellcheck="false"></td>'
			+'<td>&nbsp;'+ ico( 'minus-circle fa-lg pointer ipremove' ) +'</td></tr>';
	var content = '<tr class="gr"><td>&ensp;Name</td><td>&ensp;IP / URL</td><td>&nbsp;'+ ico( 'plus-circle fa-lg wh pointer ipadd' ) +'</td></tr>'
				 + trhtml.replace( 'NUM', 1 );
	var dataL = S.multiraudioconf.length;
	if ( dataL ) {
		var iL = dataL / 2 - 1;
		for ( i = 0; i < iL; i++ ) content += trhtml;
	} else {
		S.multiraudioconf = [ "rAudio", location.host ];
	}
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : '<table>'+ content +'</table>'
		, values       : S.multiraudioconf
		, checkchanged : S.multiraudio
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
			$( '.ipadd' ).click( function() {
				$( '#infoContent tr:last' ).after( trhtml.replace( 'NUM', $( '#infoContent input' ).length + 1 ) );
				$( '.ipremove' ).removeClass( 'hide' );
				$( '#infoOk' ).removeClass( 'disabled' );
			} );
			$( '#infoContent' ).on( 'click', '.ipremove', function() {
				$( this ).parents( 'tr' ).remove();
				I.inputs   = $( '#infoContent input' );
				var values = infoVal();
				if ( typeof values === 'string' ) values = [ values ];
				$( '#infoOk' ).toggleClass( 'disabled', values.join( ',' ) === S.multiraudioconf.join( ',' ) );
				$( '.ipremove' ).toggleClass( 'hide', I.inputs.length === 2 );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#login' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-login' ).click();
	} else {
		info( {
			  icon          : SW.icon
			, title         : SW.title
			, message       : 'Disable:'
			, passwordlabel : 'Password'
			, focus         : 0
			, checkblank    : 1
			, cancel        : switchCancel
			, ok            : () => {
				notify( SW.icon, SW.title, 'Disable ...' );
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
	info( {
		  icon          : SW.icon
		, title         : SW.title
		, message       : ( S.login ? 'Change password:' : 'New setup:' )
		, passwordlabel : ( S.login ? [ 'Existing', 'New' ] : 'Password' )
		, focus         : 0
		, checkblank    : 1
		, cancel        : switchCancel
		, ok            : () => {
			var values = infoVal();
			notify( SW.icon, SW.title, S.login ? 'Change ...' : 'Enable...' );
			$.post( 'cmd.php', {
				  cmd      : 'login'
				, password : values[ 0 ]
				, pwdnew   : S.login ? values[ 1 ] : values
			}, function( verified ) {
				if ( verified == -1 ) passwordWrong();
			}, 'json' );
		}
	} );
} );
$( '#setting-scrobble' ).click( function() {
	var content = `\
<table>
<tr><td></td><td><label><input type="checkbox">${ ico( 'airplay' ) } AirPlay</label></td></tr>
<tr><td></td><td><label><input type="checkbox">${ ico( 'bluetooth' ) } Bluetooth</label></td></tr>
<tr><td></td><td><label><input type="checkbox">${ ico( 'spotify' ) } Spotify</label></td></tr>
<tr><td></td><td><label><input type="checkbox"> ${ ico( 'upnp' ) }UPnP</label></td></tr>
<tr><td></td><td><label><input type="checkbox">Notify on scrobble</label></td></tr>
<tr><td>User</td><td><input type="text"></td><td>&ensp;${ ico( 'minus-circle fa-lg scrobbleuser pointer' ) }</td></tr>
<tr><td>Password</td><td><input type="password"></td><td>${ ico( 'eye' ) }</td></tr>
</table>`;
	info( {
		  icon          : SW.icon
		, title         : SW.title
		, content       : content
		, boxwidth      : 170
		, values        : S.scrobbleconf
		, checkblank    : S.scrobblekey ? '' : [ 0, 1 ]
		, checkchanged  : S.scrobble
		, beforeshow    : () => {
			var $user = $( '#infoContent input[type=text]' );
			var $pwd = $( '#infoContent input[type=password]' ).parents( 'tr' )
			$user.prop( 'disabled', S.scrobblekey );
			$pwd.toggleClass( 'hide', S.scrobblekey );
			$( '.scrobbleuser' ).toggleClass( 'hide', ! S.scrobblekey )
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
		, cancel        : switchCancel
		, ok            : () => {
			bash( [ 'scrobble', true, ...infoVal() ], response => {
				if ( 'error' in response ) {
					info( {
						  icon    : SW.icon
						, title   : SW.title
						, message : response.message
					} );
					$( '#scrobble' ).prop( 'checked', 0 );
				}
			}, 'json' );
			notify( SW.icon, SW.title, S.scrobble ? 'Change ...' : 'Enable ...' );
		}
	} );
} );
$( '#nfsserver' ).click( function() {
	var $this = $( this );
	if ( $this.hasClass( 'disabled' ) ) {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : $this.prev().html()
		} );
		$this.prop( 'checked', S.nfsserver );
		return
	}
	
	bash( [ 'nfssharelist' ], list => {
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : ( S.nfsserver ? 'Shared directories:' : 'Directories to share:' )
						+'<br><br><pre><wh>'+ list +'</wh></pre><br>'
						+ ( S.nfsserver ? 'Disable all shares?' : 'Continue?' )
			, cancel  : switchCancel
			, okcolor : S.nfsserver ? orange : ''
			, ok      : () => {
				bash( [ 'nfsserver', ! S.nfsserver ] );
				notify( SW.icon, SW.title, S.nfsserver ? 'Disable ...' : 'Enable ...' );
			}
		} );
	} );
} );
$( '#setting-stoptimer' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, radio        : { Disable: 'false', '15 minutes': 15, '30 minutes': 30, '60 minutes': 60 }
		, checkbox     : [ 'Power off on stop' ]
		, values       : S.stoptimerconf || [ false, false ]
		, checkchanged : S.stoptimer
		, beforeshow   : () => {
			var $poweroff = $( '#infoContent input:checkbox' );
			$poweroff.prop( 'disabled', ! S.stoptimerconf[ 1 ] );
			$( '#infoContent tr:last' ).css( 'height', '60px' );
			$( '#infoContent input:radio' ).change( function() {
				var valfalse = $( this ).val() === 'false';
				if ( valfalse ) $poweroff.prop( 'checked', false );
				$poweroff.prop( 'disabled', valfalse );
			} );
		}
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );

} );

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
	$( '#redirecturi' ).text( S.spotifyredirect );
	$( '#hostapd' ).toggleClass( 'disabled', S.wlanconnected );
	$( '#smb' ).toggleClass( 'disabled', S.nfsserver );
	var disablednfs = '<wh>Shared Data '+ ico( 'networks' ) +'</wh> is currently enabled.';
	if ( S.smb ) {
		disablednfs = disablednfs.replace( 'Shared Data', 'File Sharing' );
	} else if ( S.nfsconnected ) {
		disablednfs = 'Currently connected by clients';
	}
	$( '#nfsserver' )
		.toggleClass( 'disabled', S.nfsconnected || S.shareddata || S.smb )
		.prev().html( disablednfs );
	$( '#stoptimer' ).toggleClass( 'disabled', S.state !== 'play' );
	if ( S.nosound ) {
		$( '#divdsp' ).addClass( 'hide' );
	} else {
		$( '#divdsp' ).removeClass( 'hide' );
		$( '#camilladsp' ).toggleClass( 'disabled', S.equalizer );
		$( '#equalizer' ).toggleClass( 'disabled', S.camilladsp );
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
