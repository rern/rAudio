<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );
$fileexplorer = 'File Explorer > Address bar - <c>\\\\'.$ip.'</c> or <c>\\\\'.$hostname.'</c>';
if ( exec( 'systemctl is-active bluetooth' ) === 'active' ) {
	$disableddsp = '<wh>Bluetooth I^bluetooth^I</wh> is currently enabled.';
} else {
	$disableddsp = '<wh>Equalizer I^equalizer^I</wh> is currently enabled.';
}
if ( is_link( '/srv/http/data/mpd' ) ) {
	$disablednfs = '<wh>Shared Data I^networks^I</wh> is currently enabled.';
} else if ( exec( 'systemctl is-active smb' ) == 'active' ) {
	$disablednfs = '<wh>File Sharing I^networks^I</wh> is currently active.';
} else {
	$disablednfs = 'Currently connected by clients';
}

if ( !file_exists( '/srv/http/data/shm/nosound' ) || file_exists( '/srv/http/data/shm/btreceiver' ) ) {
// ----------------------------------------------------------------------------------
$head = ['title' => 'Renderers' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'AirPlay'
		, 'id'       => 'shairport-sync'
		, 'sublabel' => 'shairport-sync'
		, 'icon'     => 'airplay'
		, 'setting'  => false
		, 'status'   => 'shairport-sync'
		, 'disabled' => '<wh>AirPlay I^airplay^I</wh> is currently active.'
		, 'help'     => '<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.'
		, 'exist'    => file_exists( '/usr/bin/shairport-sync' )
	]
	, [
		  'label'    => 'DAB Radio'
		, 'id'       => 'dabradio'
		, 'sublabel' => 'rtsp-server'
		, 'icon'     => 'dabradio'
		, 'setting'  => false
		, 'status'   => 'rtsp-simple-server'
		, 'disabled' => 'No DAB devices found.'
		, 'help'     => 'Digital Audio Broadcasting radio for USB RTL-SDR devices.'
		, 'exist'    => file_exists( '/usr/bin/rtsp-simple-server' )
	]
	, [
		  'label'    => 'SnapClient'
		, 'sublabel' => 'snapclient'
		, 'id'       => 'snapclient'
		, 'icon'     => 'snapcast'
		, 'status'   => 'snapclient'
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • SnapClient and SnapServer can be enabled on the same device.
 • Connect: A^I^networks^I Networks^AI^snapcast sub^I
EOF
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
	, [
		  'label'    => 'Spotify'
		, 'id'       => 'spotifyd'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'status'   => 'spotifyd'
		, 'disabled' => '<wh>Spotify I^spotify^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.
 • Require Premium account. (No Spotify password saved on rAudio.)
 • Get credential from <wh>Spotify private app</wh>: ( <bll class="screenshot pointer">Screenshots</bll> )
	<a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a> (Replace <cy>YELLOW</cy> with actual values)
	| LOG IN |
		- with normal Spotify account
	| CREATE AN APP |
		- App name: <cy>Name</cy>
		- App description: <cy>Description</cy>
	| EDIT SETTINGS |
		- Redirect URIs: <c id="redirecturi"></c>
	| USERS AND ACCESS | ADD NEW USER |
		- Name: <cy>user</cy>
		- Spotify Account: <cy>email</cy>
• | <wh>Spotify I^spotify^I</wh> &#9704; |
	- Paste <cy>Client ID</cy> and <cy>Client Secret</cy> from the created app
EOF
		, 'exist'    => file_exists( '/usr/bin/spotifyd' )
	]
	, [
		  'label'    => 'UPnP'
		, 'id'       => 'upmpdcli'
		, 'sublabel' => 'upmpdcli'
		, 'icon'     => 'upnp'
		, 'status'   => 'upmpdcli'
		, 'disabled' => '<wh>UPnP I^upnp^I</wh> is currently active.'
		, 'help'     => '<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.'
		, 'exist'    => file_exists( '/usr/bin/upmpdcli' )
	]
];
htmlSection( $head, $body, 'renderers' );
// ----------------------------------------------------------------------------------
}
$head = [ 'title' => 'Streamers' ]; //////////////////////////////////
$body = [
	[
	  'label'    => 'For browsers'
	, 'id'       => 'httpd'
	, 'sublabel' => 'MPD httpd'
	, 'icon'     => 'webradio'
	, 'setting'  => false
	, 'help'     => <<< EOF
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <c>http://$ip:8000</c> (Latency - several seconds)
EOF
	]
	, [
		  'label'    => 'SnapServer'
		, 'id'       => 'snapserver'
		, 'sublabel' => 'snapserver'
		, 'icon'     => 'snapcast'
		, 'setting'  => false
		, 'status'   => 'snapserver'
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently connected.'
		, 'help'     => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • Set SnapServer as a client to sync:
	- Enable | SnapClient I^snapcast^I &#9704; |
	- Connect: A^I^networks^I Networks^AI^snapcast sub^I
 • Snapcast control client and player:
	- <a href="https://github.com/badaix/snapweb">Snapweb</a>
	- <a href="https://github.com/badaix/snapdroid">Snapdroid</a>
EOF
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Signal Processors' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'DSP'
		, 'id'       => 'camilladsp'
		, 'sublabel' => 'camilladsp'
		, 'icon'     => 'camilladsp'
		, 'status'   => 'camilladsp'
		, 'disabled' => $disableddsp
		, 'help'     => <<< EOF
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings: A^I^features^I Features^AI^camilladsp sub^I
EOF
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
	]
	, [
		  'label'    => 'Equalizer'
		, 'sublabel' => 'alsaequal'
		, 'id'       => 'equalizer'
		, 'icon'     => 'equalizer'
		, 'setting'  => false
		, 'disabled' => '<wh>DSP I^camilladsp^I</wh> is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control: A^I^features^I Features^AI^equalizer sub^I
Presets:
 • <c>Flat</c>: All bands at 0dB
 • New: Adjust | I^plus-circle^I Add | I^save^I Save |
 • Existing: Adjust | I^save^I Save |
 • Adjusted values will be listed as <c>(unnamed)</c> until saved.
 • If distortions occurred, lower all bands collectively and increase volume
EOF
	]
];
htmlSection( $head, $body, 'dsp' );
$head = [ 'title' => 'Others' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'Access Point'
		, 'id'       => 'hostapd'
		, 'sublabel' => 'hostapd'
		, 'icon'     => 'accesspoint'
		, 'status'   => 'hostapd'
		, 'disabled' => 'Wi-Fi is currently connected.'
		, 'help'     => <<< EOF
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
This should be used only when necessary.
EOF
		, 'exist'    => file_exists( '/usr/bin/hostapd' )
	]
	, [
		  'label'   => 'AutoPlay'
		, 'id'      => 'autoplay'
		, 'icon'    => 'play'
		, 'help'    => <<< EOF
Start playing automatically on:
 • Bluetooth connected
 • Audio CD inserting
 • Power on / Reboot
EOF
	]
	, [
		  'label'    => 'Browser on RPi'
		, 'id'       => 'localbrowser'
		, 'sublabel' => 'chromium'
		, 'icon'     => 'chromium'
		, 'status'   => 'localbrowser'
		, 'help'     => <<< EOF
<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
 • TFT 3.5" LCD: Rotate needs reboot.
 • Screen off: A^I^power^I Power^AI^screenoff sub^I
	- Also by timer in | I^gear^I |
	- Backlight still on - no energy saved
 • HDMI display: Must be connected before boot.
EOF
		, 'exist'    => file_exists( '/usr/bin/chromium' )
	]
	, [
		  'label'    => 'File Sharing'
		, 'id'       => 'smb'
		, 'sublabel' => 'smb'
		, 'icon'     => 'networks'
		, 'status'   => 'smb'
		, 'disabled' => '<wh>Server rAudio I^rserver^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://www.samba.org">Samba</a> - Share files on network for Windows clients.
 • Much faster than SCP / WinSCP when transfer large or a lot of files
 • Set sources permissions for read + write - directory: <c>0777</c> file: <c>0555</c>
 • Windows: $fileexplorer
 
(For even better performance: | Server rAudio I^rserver^I | )
EOF
		, 'exist'    => file_exists( '/usr/bin/smbd' )
	]
	, [
		  'label' => 'Lyrics in File'
		, 'id'    => 'lyricsembedded'
		, 'icon'  => 'lyrics'
		, 'setting'  => false
		, 'help'  => <<< EOF
 • Get embedded lyrics from local files.
 • Search online if not available.
 • Should be disable if most lyrics are not embedded.
 • Online fetched lyrics are saved as separate files, not embedded.
EOF
	]
	, [
		  'label'   => 'Multiple rAudios'
		, 'id'      => 'multiraudio'
		, 'icon'    => 'raudiobox'
		, 'help'    => <<< EOF
Switch between multiple rAudio devices.
Switch: A^I^playlist^I Playlist^AI^raudiobox sub^I

(SSH password must be default.)
EOF
	]
	, [
		  'label'    => 'Password Login'
		, 'id'       => 'login'
		, 'sublabel' => 'password_hash'
		, 'icon'     => 'lock'
		, 'setting'  => 'custom'
		, 'help'     => <<< EOF
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <c>PASSWORD_BCRYPT</c>.
Lock: A^I^player^I Player^AI^lock sub^I
EOF
	]
	, [
		  'label'    => 'Scrobbler'
		, 'id'       => 'scrobble'
		, 'sublabel' => 'Last.fm'
		, 'icon'     => 'lastfm'
		, 'help'     => <<< EOF
 • Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 • Require Last.fm account.
 • No Last.fm password saved on rAudio.
 • Option to include renderers - Exclude if already scrobbleed by sender devices.
 • SnapClient already scrobbled by SnapServer.
 • Web Radio must be manually scrobbled: | Playing title | I^lastfm wh^I Scrobble |
EOF
	]
	, [
		  'label'       => 'Server rAudio'
		, 'id'          => 'nfsserver'
		, 'sublabel'    => 'nfs-server'
		, 'icon'        => 'rserver'
		, 'setting'     => 'custom'
		, 'settingicon' => false
		, 'status'      => 'nfs-server'
		, 'disabled'    => $disablednfs
		, 'help'        => <<< EOF
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for files and | Shared Data I^networks^I |
 • <wh>rAudio Shared Data server:</wh>
	- Must be set to <wh>static IP address</wh> which should be set on router.
	- In | I^library^I | Library:
		- | I^microsd^I SD | and | I^usbdrive^I USB | will be hidden.
		- | I^usb^I USB | items will be displayed in | I^networks^I NAS | instead.
	- On reboot / power off:
		- Shared Data on clients will be temporarily disabled
		- Re-enabled by itself once the server is back online.
	
 • <wh>rAudio Shared Data clients:</wh>
	- | I^system^I System | <wh>Shared Data I^networks^I</wh> &#9704; | • rAudio |
	- Automatically setup: discover, connect shared files and data
	
 • <wh>Windows NFS clients:</wh>
	- Windows Features > Services for NFS > Client for NFS - Enable
	- $fileexplorer
	
(SSH password must be default.)
EOF
	]
	, [
		  'label'    => 'Stop Timer'
		, 'id'       => 'stoptimer'
		, 'icon'     => 'stopwatch'
		, 'disabled' => 'Nothing is playing.'
		, 'help'     => <<< EOF
Stop timer:
 • Mute
 • Stop player
 • Set volume back as before mute
 • If set, power off.
EOF
	]
];
htmlSection( $head, $body );
