<?php
$hostname     = getHostName();
$ip           = getHostByName( $hostname );
$fileexplorer = 'File Explorer &raquo; Address bar: <c>\\\\'.$ip.'</c> or <c>\\\\'.$hostname.'</c>';
$id_data = [
	  'autoplay'       => [ 'name' => 'AutoPlay' ]
	, 'camilladsp'     => [ 'name' => 'DSP',              'sub' => 'camilladsp',     'setting' => false,    'status' => true ]
	, 'dabradio'       => [ 'name' => 'DAB Radio',        'sub' => 'mediamtx',       'setting' => false,    'status' => true ]
	, 'equalizer'      => [ 'name' => 'Equalizer',        'sub' => 'alsaequal',      'setting' => false ]
	, 'hostapd'        => [ 'name' => 'Access Point',     'sub' => 'hostapd',                               'status' => true ]
	, 'httpd'          => [ 'name' => 'For browsers',     'sub' => 'MPD httpd',      'setting' => false ]
	, 'localbrowser'   => [ 'name' => 'Browser on RPi',   'sub' => 'localbrowser',                          'status' => true ]
	, 'login'          => [ 'name' => 'Password Login',   'sub' => 'password_hash',  'setting' => 'custom' ]
	, 'lyrics'         => [ 'name' => 'Lyrics' ]
	, 'multiraudio'    => [ 'name' => 'Multiple rAudios', 'sub' => 'multiraudio' ]
	, 'nfsserver'      => [ 'name' => 'Server rAudio',    'sub' => 'nfs-server',     'setting' => false,    'status' => true ]
	, 'scrobble'       => [ 'name' => 'Scrobbler',        'sub' => 'Last.fm' ]
	, 'shairport-sync' => [ 'name' => 'AirPlay',          'sub' => 'shairport-sync', 'setting' => false,    'status' => true ]
	, 'smb'            => [ 'name' => 'File Sharing',     'sub' => 'samba',                                 'status' => true ]
	, 'snapclient'     => [ 'name' => 'SnapClient',       'sub' => 'snapclient',                            'status' => true ]
	, 'snapserver'     => [ 'name' => 'SnapServer',       'sub' => 'snapserver',     'setting' => false,    'status' => true ]
	, 'spotifyd'       => [ 'name' => 'Spotify',          'sub' => 'spotifyd',                              'status' => true ]
	, 'stoptimer'      => [ 'name' => 'Stop Timer' ]
	, 'upmpdcli'       => [ 'name' => 'UPnP',             'sub' => 'upmpdcli',                              'status' => true ]
];
// ----------------------------------------------------------------------------------
$head = [ 'title' => 'Renderers' ]; //////////////////////////////////
$body = [
	[
		  'id'    => 'shairport-sync'
		, 'exist' => file_exists( '/usr/bin/shairport-sync' )
		, 'help'  => <<< EOF
<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device

Note:
 · If Camilla DSP is enabled, stop current track before start playing.
 · Playing files directly on rAudio yields better quality.
EOF
	]
	, [
		  'id'       => 'dabradio'
		, 'disabled' => 'No DAB devices found.'
		, 'exist'    => file_exists( '/usr/bin/mediamtx' )
		, 'help'     => 'Digital Audio Broadcasting radio for USB RTL-SDR devices.'
	]
	, [
		  'id'    => 'snapclient'
		, 'exist' => file_exists( '/usr/bin/snapclient' )
		, 'help'  => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 · SSH passwords must be default.
 · Connect: {$Fmenu( 'networks', 'Networks', 'snapcast' )}
 · SnapClient and SnapServer can be enabled on the same device.
	· Enable SnapServer before SnapClient
	· SnapClient auto connect/disconnect on play/stop (no connect icon)
EOF
	]
	, [
		  'id'    => 'spotifyd'
		, 'exist' => file_exists( '/usr/bin/spotifyd' )
		, 'help'  => <<< EOF
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device
Require:
 · Premium account
 · <code>Client ID</code> and <code>Client Secret</code> from your Spotify private app

To create Spotify private app: ( <bll class="screenshot pointer">Screenshots</bll> )
 · <btn>LOG IN</btn> <a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a>
	· with normal Spotify account
 · <btn>CREATE AN APP</btn>
	· App name: <code>rAudio</code>
	· App description: <code>(any)</code>
· <btn>EDIT SETTINGS</btn>
	· Redirect URIs: <c id="redirecturi"></c>
· <btn>USERS AND ACCESS</btn> &raquo; <btn>ADD NEW USER</btn>
	· Name: <code>(any)</code>
	· Spotify Account: <code>(email)</code>
	
Note: Select the app from Dashboard for <code>Client ID</code> and <code>Client Secret</code>
EOF
	]
	, [
		  'id'    => 'upmpdcli'
		, 'exist' => file_exists( '/usr/bin/upmpdcli' )
		, 'help'  => <<< EOF
<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device

Note: Playing files directly on rAudio yields better quality.
EOF
	]
];
htmlSection( $head, $body, 'renderers' );
// ----------------------------------------------------------------------------------

$head = [ 'title' => 'Streamers' ]; //////////////////////////////////
$body = [
	[
		  'id'   => 'httpd'
		, 'help' => <<< EOF
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <c>http://$ip:8000</c> (Latency - several seconds)
EOF
	]
	, [
		  'id'       => 'snapserver'
		, 'disabled' => labelIcon( 'SnapClient', 'snapcast' ).' is currently connected.'
		, 'exist'    => file_exists( '/usr/bin/snapclient' )
		, 'help'     => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.

Note: SSH passwords must be default. (For metadata update)
EOF
	]
];
htmlSection( $head, $body, 'streamers' );
$head = [ 'title' => 'Signal Processors' ]; //////////////////////////////////
$body = [
	[
		  'id'       => 'camilladsp'
		, 'disabled' => labelIcon( 'Equalizer', 'equalizer' ).' is currently enabled.'
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
		, 'help'     => <<< EOF
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings: {$Fmenu( 'features', 'Features', 'camilladsp' )}
EOF
	]
	, [
		  'id'       => 'equalizer'
		, 'disabled' => labelIcon( 'DSP', 'camilladsp' ).' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control: {$Fmenu( 'features', 'Features', 'equalizer' )}
Presets:
 · <c>Flat</c>: All bands at 0dB
 · If distortions occurred, lower all bands collectively and increase volume
EOF
	]
];
htmlSection( $head, $body, 'dsp' );
$head = [ 'title' => 'Others' ]; //////////////////////////////////
$browser = '';
if ( file_exists( '/usr/bin/firefox' ) ) {
	$browser = '<a href="https://www.mozilla.org/firefox/browsers/">Firefox</a>';
} else if ( file_exists( '/usr/bin/chromium' ) ) {
	$browser = '<a href="https://github.com/chromium/chromium">Chromium</a>';
}
$body = [
	[
		  'id'       => 'hostapd'
		, 'disabled' => labelIcon( 'Wi-Fi', 'wifi' ).' is currently connected.'
		, 'exist'    => file_exists( '/usr/bin/hostapd' )
		, 'help'     => <<< EOF
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
 · This should be used only when necessary.
 · Avoid double quotes <code>"</code> in password.
EOF
	]
	, [
		  'id'   => 'autoplay'
		, 'help' => <<< EOF
Start playing automatically on:
 · Bluetooth connected
 · Audio CD inserting
 · Power on / Reboot
EOF
	]
	, [
		  'id'    => 'localbrowser'
		, 'exist' => $browser
		, 'help'  => <<< EOF
$browser - Browser on RPi connected screen.
 · TFT 3.5" LCD: Rotate needs reboot.
 · Screen off: {$Fmenu( 'power', 'Power', 'screenoff' )}
	· Backlight still on - no energy saved
	· Sleep timer in {$Fi( 'gear btn' )}

Note: HDMI Hotplug
 · Disabled - Display must be connected before boot.
 · Enable - If connect before boot but not detected properly.
EOF
	]
	, [
		  'id'       => 'smb'
		, 'disabled' => labelIcon( 'Server rAudio', 'rserver' ).' is currently active.'
		, 'exist'    => file_exists( '/usr/bin/smbd' )
		, 'help'     => <<< EOF
<a href="https://www.samba.org">Samba</a> - Share files on network for Windows clients.
 · Much faster than SCP / WinSCP when transfer large or a lot of files
 · Set sources permissions for read + write - directory: <c>0777</c> file: <c>0555</c>
 · Windows: $fileexplorer
 
Note: {$FlabelIcon( 'Server rAudio', 'rserver' )} should yield better performance.
EOF
	]
	, [
		  'id'   => 'lyrics'
		, 'help' => <<< EOF
 · Search lyrics from user specified URL and tags.
 · Embedded lyrics:
	 · Get lyrics from local files.
	 · If not available, search online.
	 · Should be disabled if most lyrics are not embedded.
EOF
	]
	, [
		  'id'   => 'multiraudio'
		, 'help' => <<< EOF
Switch between multiple rAudio devices.
Switch: {$Fmenu( 'playlist', 'Playlist', 'multiraudio' )}

Note: SSH password must be default.
EOF
	]
	, [
		  'id'   => 'login'
		, 'help' => <<< EOF
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <c>PASSWORD_BCRYPT</c>.
Lock: {$Fmenu( 'player', 'Player', 'lock' )}
EOF
	]
	, [
		  'id'   => 'scrobble'
		, 'help' => <<< EOF
 · Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 · Require Last.fm account.
 · SnapClient already scrobbled by SnapServer.
 · Web Radio must be manually scrobbled: Playing title &raquo; {$Fi( 'lastfm btn' )} Scrobble
 · Scrobbled list: <a href="https://www.last.fm/">Last.fm</a> &raquo; User icon &raquo; View profile
EOF
	]
	, [
		  'id'          => 'nfsserver'
		, 'settingicon' => false
		, 'disabled'    => 'js'
		, 'help'        => <<< EOF
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for files and {$FlabelIcon( 'Shared Data', 'networks' )}
 • <wh>rAudio Shared Data server:</wh>
	· Must be set to <wh>static IP address</wh> which should be set on router.
	· In {$Ftab( 'library', '' )} Library
		· {$Fi( 'microsd btn' )} SD and {$Fi( 'usbdrive btn' )} USB will be hidden.
		· {$Fi( 'usb btn' )} USB items will be displayed in {$Fi( 'networks btn' )} NAS instead.
	· On reboot / power off:
		· Shared Data on clients will be temporarily disabled
		· Re-enabled by itself once the server is back online.
	
 • <wh>rAudio Shared Data clients:</wh>
	· {$Ftab( 'system', 'System' )}{$FlabelIcon( 'Shared Data', 'networks' )} Type ● rAudio
	· Automatically setup: discover, connect shared files and data
	
 • <wh>Windows NFS clients:</wh>
	· Windows Features &raquo; Services for NFS &raquo; Client for NFS · Enable
	· $fileexplorer
	
Note: SSH password must be default.
EOF
	]
	, [
		  'id'       => 'stoptimer'
		, 'disabled' => 'Player is currently not playing.'
		, 'help'     => <<< EOF
Stop timer:
 · Mute
 · Stop player
 · Set volume back as before mute
 · If set, power off.
EOF
	]
];
htmlSection( $head, $body, 'others' );
