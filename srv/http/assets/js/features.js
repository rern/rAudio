var default_v      = {
	  autoplay  : { bluetooth: true, cd: true, startup: true }
	, scrobble  : { airplay: true, bluetooth: true, spotify: true, upnp: true, notify: true }
	, stoptimer : { min: '', poweroff: false }
}

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '.screenshot' ).click( function() {
	info( {
		  icon        : 'spotify'
		, title       : 'Spotify for Developers'
		, message     : '<img src="/assets/img/spotify.gif" style="width: 100%; height: auto; margin-bottom: 0;">'
		, okno        : true
	} );
} );
$( '#setting-snapclient' ).click( function() {
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
$( '#setting-spotifyd' ).click( function() {
	var active = infoPlayerActive( $( this ) );
	if ( active ) return
	
	if ( ! S.spotifyd && S.spotifytoken ) {
		bash( [ 'spotifyd' ] );
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
			infoWarning( SW.icon, SW.title, 'Authorization cannot run on <wh>Firefox</wh>.' );
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
				bash( [ 'spotifykey', 'KEY', 'btoa', btoa( id +':'+ secret ) ] );
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
$( '#setting-upmpdcli' ).click( function() {
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, checkbox     : [ 'Clear Playlist on start' ]
		, values       : S.upmpdcliconf
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
		, checkblank   : true
		, boxwidth     : 100
		, values       : S.camilladspconf
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
		, checkblank   : true
		, checkip      : [ 0 ]
		, checklength  : { 1: [ 8, 'min' ] }
		, cancel       : switchCancel
		, ok           : switchEnable
	} );
} );
$( '#setting-autoplay' ).click( function() {
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
$( '#setting-localbrowser' ).click( function() {
	var htmlbrightness = S.localbrowserconf.brightness ? '<div id="infoRange"><input type="range" min="0" max="255"><div>Brightness</div></div><br>' : '';
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
	<td>&nbsp;<gr>%</gr>${ ico( 'minus-circle btnicon dn' ) + ico( 'plus-circle btnicon up' ) }</td></tr>
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
<tr><td></td><td colspan="2"><label><input type="checkbox" id="onwhileplay">On while play</label></td></tr>
<tr><td></td><td colspan="2"><label><input type="checkbox">HDMI Hotplug</label></td></tr>
<tr style="height: 10px"></tr>
</table>
<div id="infoRange"><input type="range" min="0" max="255" value="${ S.brightness }"><div>Brightness</div></div><br>
<div class="btnbottom">
	&nbsp;<span class="reload">Reload${ ico( 'redo' ) }</span>
	<span class="screenoff">${ ico( 'screenoff' ) }On/Off</span>
</div>`;
	info( {
		  icon         : SW.icon
		, title        : SW.title
		, content      : content
		, boxwidth     : 110
		, values       : S.localbrowserconf
		, checkchanged : S.localbrowser
		, beforeshow   : () => {
			selectText2Html( { '90° CW': '90°&emsp;'+ ico( 'redo' ), '90° CCW': '90°&emsp;'+ ico( 'undo' ) } );
			$( '#onwhileplay' ).prop( 'disabled', S.localbrowserconf.screenoff === 0 );
			$( '.btnbottom' ).toggleClass( 'hide', ! S.localbrowser );
			$( '#infoContent .btnicon' ).click( function() {
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
				bash( [ 'localbrowserreload' ] );
			} );
			$( '.screenoff' ).click( function() {
				bash( [ 'screenofftoggle' ] );
			} );
			if ( S.brightness ) {
				var $range = $( '#infoRange input' );
				$range.on( 'click input keyup', function() {
					bash( [ 'brightness', $range.val() ] );
				} ).on( 'touchend mouseup keyup', function() {
					bash( [ 'brightness', $range.val() ] );
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
	var ipsub = S.hostip.replace( /^(.*\.)[^.]*$/, '$1' );
	var trhtml  = '<tr><td style="width: 180px"><input type="text" spellcheck="false"></td>'
					 +'<td style="width: 130px"><input type="text" class="ip" value="'+ ipsub +'" spellcheck="false"></td>'
					 +'<td>&nbsp;'+ ico( 'minus-circle i-lg pointer ipremove' ) +'</td></tr>';
	var content = '<tr class="gr"><td>&ensp;Name</td><td>&ensp;IP / URL</td><td>&nbsp;'+ ico( 'plus-circle i-lg wh pointer ipadd' ) +'</td></tr>'+ trhtml;
	
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
		, values       : values
		, checkchanged : S.multiraudio && values.length > 2
		, checkblank   : I.checkblank
		, checkip      : I.checkip
		, beforeshow   : () => {
			$( '#infoContent input' ).each( ( i, el ) => {
				if ( $( el ).val() === S.hostip ) $( el ).addClass( 'disabled' );
			} );
			$( '#infoContent td' ).css( 'padding', 0 );
			$( '#infoContent' ).on( 'click', 'i', function() {
				var $this = $( this );
				var add   = $this.hasClass( 'ipadd' );
				if ( add ) {
					$( '#infoContent table' ).append( trhtml );
				} else {
					$this.parents( 'tr' ).remove();
				}
				$inputbox    = $( '#infoContent input' );
				$input       = $inputbox;
				infoCheckEvenOdd( $input.length );
				infoCheckSet();
				$( '#infoOk' ).text( S.multiraudio && $inputbox.length < 3 ? 'Disable' : 'OK' );
				if ( ! add ) $( '#infoOk' ).toggleClass( 'disabled', I.values.join( '' ) === infoVal().join( '' ) );
			} );
		}
		, cancel       : switchCancel
		, ok           : () => {
			var v = infoVal();
			if ( v.length < 3 ) {
				notify( SW.icon, SW.title, false );
				bash( [ 'multiraudio', 'disable' ] );
				return
			}
			
			var val = {}
			v.forEach( ( el, i ) => {
				i % 2 ? val[ name ] = el : name = el;
			} );
			keys = Object.keys( val ).sort();
			data = {}
			keys.forEach( k => data[ k ] = val[ k ] );
			$.post( 'cmd.php', { cmd: 'jsontemp', json: JSON.stringify( data ) }, () => bash( [ 'multiraudio' ] ) );
			notify( SW.icon, SW.title, S.multiraudio ? 'Change ...' : 'Enable ...' );
			S[ SW.id ] = true;
		}
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
			, checkblank    : true
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
		, checkblank    : true
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
	if ( ! S.scrobblekey ) { // api account page: https://www.last.fm/api/accounts
		info( {
			  icon    : SW.icon
			, title   : SW.title
			, message : 'Open <wh>Last.fm</wh> for authorization?'
			, cancel  : switchCancel
			, ok      : () => {
				bash( [ 'lastfmkey' ], function( apikey ) {
					var ip = location.host;
					location.href = 'http://www.last.fm/api/auth/?api_key='+ apikey +'&cb=https://rern.github.io/raudio/scrobbler/?ip='+ ip
				} );
			}
		} );
		return
	}
	
	info( {
		  icon         : SW.icon
		, title        : SW.title
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
				bash( [ 'nfsserver', S.nfsserver ? 'disable' : '' ] ); // enable if not active
				notify( SW.icon, SW.title, S.nfsserver ? 'Disable ...' : 'Enable ...' );
			}
		} );
	} );
} );
$( '#setting-stoptimer' ).click( function() {
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
	
	// scrobble token
	var url   = new URL( window.location.href );
	window.history.replaceState( '', '', '/settings.php?p=features' );
	var token = url.searchParams.get( 'token' );
	var code  = url.searchParams.get( 'code' );
	var error = url.searchParams.get( 'error' );
	if ( token ) {
		bash( [ 'scrobblekeyget', 'KEY', 'token', token ], function( error ) {
			if ( error ) {
				info( {
					  icon    : 'scrobble'
					, title   : 'Scrobbler'
					, message : error
				} );
			} else {
				S.scrobblekey = true;
				showContent();
				$( '#setting-scrobble' ).click();
			}
		} );
	} else if ( code ) {
		bash( [ 'spotifytoken', 'KEY', 'code', code ], () => showContent );
	} else if ( error ) {
		infoWarning( 'spotify', 'Spotify', 'Authorization failed:<br>'+ error );
	}
}
