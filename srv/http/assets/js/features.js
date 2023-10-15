var redirect_uri   = 'https://rern.github.io/raudio/spotify';
var default_v      = {
	  autoplay     : {
		  BLUETOOTH : true
		, CD        : true
		, STARTUP   : true
	  }
	, localbrowser : {
		  ROTATE      : 0
		, ZOOM        : 100
		, SCREENOFF   : 0
		, ONWHILEPLAY : false
		, HDMI        : false
		, CURSOR      : false
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
		, NOTIFY    : true
	}
	, stoptimer    : {
		  MIN      : ''
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
		, numberlabel  : 'Latency <gr>(ms)</gr>'
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
				, message  : '<br>Loopback is currently set for <a class="helpmenu label">DSP<i class="i-camilladsp"></i></a><br>&nbsp;'
			} );
			return
		}
		
		bash( [ 'spotifyoutput' ], ( list ) => {
			info( {
				  icon         : SW.icon
				, title        : SW.title
				, selectlabel  : 'Device'
				, select       : list.devices
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
			, textlabel   : [ 'ID', 'Secret' ]
			, focus       : 0
			, footer      : '<br><wh>ID</wh> and <wh>Secret</wh> from Spotify private app '+ ico( 'help help' )
			, footeralign : 'right'
			, boxwidth    : 320
			, checklength : { 0: 32, 1: 32 }
			, beforeshow  : () => {
				$( '#infoContent .help' ).on( 'click', function() {
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
$( '#setting-hostapd' ).on( 'click', function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, footer       : '(8 characters or more)'
		, textlabel    : [ 'IP', 'Password' ]
		, values       : S.hostapd
		, checkchanged : S.hostapd
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
		, checkbox     : [ 'Bluetooth connected', 'Audio CD inserted', 'Power on <gr>/ Reboot</gr>' ]
		, values       : S.autoplayconf || default_v.autoplay
		, checkchanged : S.autoplay
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-localbrowser' ).on( 'click', function() {
	var htmlbrightness = S.brightness ? '<div id="infoRange"><input type="range" min="0" max="255"><div>Brightness</div></div><br>' : '';
	var content        = `
<table>
<tr><td style="width:110px">Rotation</td>
	<td><select>
		<option value="0">Normal</option>
		<option value="90">90° CW</option>
		<option value="270">90° CCW</option>
		<option value="180">180°</option>
		</select>
	</td><td></td></tr>
<tr><td>Zoom</td>
	<td><input id="zoom" type="text" disabled></td>
	<td>&nbsp;<gr>%</gr>&emsp;${ ico( 'remove btnicon dn' ) }&emsp;${ ico( 'plus-circle btnicon up' ) }</td></tr>
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
<tr><td></td><td colspan="2"><label><input type="checkbox" id="onwhileplay">On while play</label></td></tr>
<tr><td></td><td colspan="2"><label><input type="checkbox">HDMI Hotplug</label></td></tr>
<tr><td></td>
	<td colspan="2"><label><input type="checkbox">Mouse pointer</td></label></tr>
</table>
<div id="infoRange"><input type="range" min="0" max="255" value="${ S.brightness }"><div>Brightness</div></div><br>
<div class="btnbottom">
	&nbsp;<span class="reload">Reload ${ ico( 'redo' ) }</span>&emsp;
	<span class="screenoff">${ ico( 'screenoff' ) } On/Off</span><br>&nbsp;
</div>`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : content
		, boxwidth     : 110
		, values       : S.localbrowserconf || default_v.localbrowser
		, checkchanged : S.localbrowser
		, beforeshow   : () => {
			selectText2Html( { '90° CW': '90°&emsp;'+ ico( 'redo' ), '90° CCW': '90°&emsp;'+ ico( 'undo' ) } );
			$( '#onwhileplay' ).prop( 'disabled', S.localbrowserconf.SCREENOFF === 0 );
			$( '.btnbottom' ).toggleClass( 'hide', ! S.localbrowser );
			$( '#infoContent .btnicon' ).on( 'click', function() {
				var up   = $( this ).hasClass( 'up' );
				var zoom = +$( '#zoom' ).val();
				if ( ( up && zoom < 300 ) || ( ! up && zoom > 50 ) ) $( '#zoom' ).val( up ? zoom += 10 : zoom -= 10 );
				$( '#infoOk' ).toggleClass( 'disabled', I.values.join( '' ) === infoVal( 'array' ).join( '' ) );
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
			$( '.reload' ).on( 'click', function() {
				bash( [ 'localbrowserreload' ] );
			} );
			$( '.screenoff' ).on( 'click', function() {
				bash( [ 'screenofftoggle' ] );
			} );
			if ( S.brightness ) {
				var $range = $( '#infoRange input' );
				$range.on( 'input', function() {
					bash( [ 'brightness', $range.val(), 'CMD VAL' ] );
				} );
			} else {
				$( '#infoRange' ).remove();
			}
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
		, checkbox     : [ '<gr>/mnt/MPD/</gr>SD', '<gr>/mnt/MPD/</gr>USB' ]
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
		, textlabel    : [ 'URL', 'Start tag', 'End tag' ]
		, checkbox     : 'Embedded lyrics'
		, boxwidth     : 300
		, values       : S.lyricsconf || default_v.lyrics
		, checkchanged : S.lyrics
		, checkblank   : true
		, beforeshow   : () => $( '#infoContent tr' ).eq( 1 ).after( '<tr><td></td><td><gr>Lyrics content ...</gr></td></tr>' )
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
} );
$( '#setting-multiraudio' ).on( 'click', function() {
	var trhtml  = '<tr><td style="width: 180px"><input type="text" spellcheck="false"></td>'
					 +'<td style="width: 130px"><input type="text" class="ip" value="'+ S.ipsub +'" spellcheck="false"></td>'
					 +'<td>&nbsp;'+ ico( 'remove i-lg pointer ipremove' ) +'</td></tr>';
	var content = '<tr class="gr"><td>&ensp;Name</td><td>&ensp;IP / URL</td><td>&nbsp;'+ ico( 'add i-lg wh pointer ipadd' ) +'</td></tr>'+ trhtml;
	
	if ( S.multiraudioconf ) {
		var keys = Object.keys( S.multiraudioconf ).sort();
		var values = [];
		keys.forEach( k => values.push( k, S.multiraudioconf[ k ] ) );
		var iL     = values.length / 2 - 1;
		for ( i = 0; i < iL; i++ ) content += trhtml;
	} else {
		values = [ S.hostname, S.hostip ];
	}
	var check = infoCheckEvenOdd( values.length );
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : '<table>'+ content +'</table>'
		, contentcssno : true
		, values       : values
		, checkchanged : S.multiraudio && values.length > 2
		, checkblank   : I.checkblank
		, checkip      : I.checkip
		, checkunique  : true
		, beforeshow   : () => {
			setTimeout( () => $( '#infoOk' ).toggleClass( 'disabled', I.values.length < 3 ), 0 );
			$( '#infoContent input' ).each( ( i, el ) => {
				if ( $( el ).val() === S.hostip ) $( el ).addClass( 'disabled' );
			} );
			$( '#infoContent' ).on( 'click', 'i', function() {
				var $this = $( this );
				var add   = $this.hasClass( 'ipadd' );
				if ( add ) {
					$( '#infoContent table' ).append( trhtml );
					$( '#infoContent input' ).last().val( S.ipsub );
				} else {
					$this.parents( 'tr' ).remove();
				}
				$inputbox = $( '#infoContent input' );
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
			  icon          : SW.icon
			, title         : SW.title
			, message       : 'Disable:'
			, passwordlabel : 'Password'
			, focus         : 0
			, checkblank    : true
			, cancel        : switchCancel
			, ok            : () => {
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
	info( {
		  icon          : SW.icon
		, title         : SW.title
		, message       : ( S.login ? 'Change password:' : 'New setup:' )
		, passwordlabel : ( S.login ? [ 'Existing', 'New' ] : 'Password' )
		, focus         : 0
		, checkblank    : true
		, cancel        : switchCancel
		, ok            : () => {
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
		infoScrobble();
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
		, radio        : { '5 minutes': 5, '15 minutes': 15, '30 minutes': 30, '60 minutes': 60 }
		, checkbox     : [ 'Power off on stop' ]
		, values       : S.stoptimerconf || default_v.stoptimer
		, checkchanged : S.stoptimer
		, beforeshow   : () => {
			$( '#infoContent tr:last' ).css( 'height', '60px' );
		}
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
function infoScrobble() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Players', 'Authorization' ]
		, tab          : [ '', infoScrobbleAuth ]
		, checkbox     : [
			  ico( 'airplay' ) +'AirPlay'
			, ico( 'bluetooth' ) +'Bluetooth'
			, ico( 'spotify' ) +'Spotify'
			, ico( 'upnp' ) +'UPnP'
		]
		, footer       : '<br><label><input type="checkbox">Notify on scrobbling</label>'
		, boxwidth     : 170
		, values       : S.scrobbleconf || default_v.scrobble
		, checkchanged : S.scrobble
		, cancel       : switchCancel
		, ok           : switchEnable
		, fileconf     : true
	} );
}
function infoScrobbleAuth() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, tablabel     : [ 'Players', 'Authorization' ]
		, tab          : [ infoScrobble, '' ]
		, checkbox     : 'Remove authorization'
		, values       : false
		, checkchanged : true
		, cancel       : switchCancel
		, ok           : () => bash( [ 'scrobblekeyremove' ] )
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
	$( '#snapclient' ).parent().prev().toggleClass( 'single', ! S.snapclientactive );
	$( '#snapserver' ).toggleClass( 'disabled', S.snapserveractive );
	$( '#hostapd' ).toggleClass( 'disabled', S.wlanconnected );
	$( '#smb' ).toggleClass( 'disabled', S.nfsserver );
	if ( S.nfsconnected || S.shareddata || S.smb ) {
		var nfsdisabled = '<a class="helpmenu label">Shared Data'+ ico( 'networks' ) +'</a> is currently enabled.';
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
	$( '#stoptimer' ).toggleClass( 'disabled', ! S.stoptimer && S.state !== 'play' );
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
