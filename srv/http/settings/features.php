<?php
$hostname     = getHostName();
$ip           = getHostByName( $hostname );
$fileexplorer = 'File Explorer > Address bar - <c>\\\\'.$ip.'</c> or <c>\\\\'.$hostname.'</c>';

// ----------------------------------------------------------------------------------
$head = ['title' => 'Renderers' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'AirPlay'
		, 'sublabel' => 'shairport-sync'
		, 'icon'     => 'airplay'
		, 'id'       => 'shairport-sync'
		, 'setting'  => false
		, 'status'   => 'shairport-sync'
		, 'disabled' => '<wh>AirPlay I^airplay^I</wh> is currently active.'
		, 'help'     => '<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.'
		, 'exist'    => file_exists( '/usr/bin/shairport-sync' )
	]
	, [
		  'label'    => 'DAB Radio'
		, 'sublabel' => 'rtsp-server'
		, 'icon'     => 'dabradio'
		, 'id'       => 'dabradio'
		, 'setting'  => false
		, 'status'   => 'rtsp-simple-server'
		, 'disabled' => 'No DAB devices found.'
		, 'help'     => 'Digital Audio Broadcasting radio for USB RTL-SDR devices.'
		, 'exist'    => file_exists( '/usr/bin/rtsp-simple-server' )
	]
	, [
		  'label'    => 'SnapClient'
		, 'sublabel' => 'snapclient'
		, 'icon'     => 'snapcast'
		, 'id'       => 'snapclient'
		, 'status'   => 'snapclient'
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 · SSH passwords must be default.
 · Connect: A^I^networks^I Networks^AI^snapcast sub^I
 · SnapClient and SnapServer can be enabled on the same device.
	· Enable | SnapServer | before | SnapClient |
	· SnapClient auto connect/disconnect on play/stop
EOF
		, 'exist'    => file_exists( '/usr/bin/snapclient' )
	]
	, [
		  'label'    => 'Spotify'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'id'       => 'spotifyd'
		, 'status'   => 'spotifyd'
		, 'disabled' => '<wh>Spotify I^spotify^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.
 · Require Premium account. (No Spotify password saved on rAudio.)
 · Get credential from <wh>Spotify private app</wh>: ( <bll class="screenshot pointer">Screenshots</bll> )
	<a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a> (Replace <code class="yl">YELLOW</code> with actual values)
	| LOG IN |
		· with normal Spotify account
	| CREATE AN APP |
		· App name: <code class="yl">Name</code>
		· App description: <code class="yl">Description</code>
	| EDIT SETTINGS |
		· Redirect URIs: <c id="redirecturi"></c>
	| USERS AND ACCESS | ADD NEW USER |
		· Name: <code class="yl">user</code>
		· Spotify Account: <code class="yl">email</code>
· | <wh>Spotify I^spotify^I</wh> | Enable
	· Paste <code>Client ID</code> and <code>Client Secret</code> from the created app
EOF
		, 'exist'    => file_exists( '/usr/bin/spotifyd' )
	]
	, [
		  'label'    => 'UPnP'
		, 'sublabel' => 'upmpdcli'
		, 'icon'     => 'upnp'
		, 'id'       => 'upmpdcli'
		, 'status'   => 'upmpdcli'
		, 'disabled' => '<wh>UPnP I^upnp^I</wh> is currently active.'
		, 'help'     => '<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.'
		, 'exist'    => file_exists( '/usr/bin/upmpdcli' )
	]
];
htmlSection( $head, $body, 'renderers' );
// ----------------------------------------------------------------------------------

$head = [ 'title' => 'Streamers' ]; //////////////////////////////////
$body = [
	[
	  'label'    => 'For browsers'
	, 'sublabel' => 'MPD httpd'
	, 'icon'     => 'webradio'
	, 'id'       => 'httpd'
	, 'setting'  => false
	, 'help'     => <<< EOF
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <c>http://$ip:8000</c> (Latency - several seconds)
EOF
	]
	, [
		  'label'    => 'SnapServer'
		, 'sublabel' => 'MPD snapcast'
		, 'icon'     => 'snapcast'
		, 'id'       => 'snapserver'
		, 'setting'  => false
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently connected.'
		, 'help'     => <<< EOF
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 · SSH passwords must be default. (For metadata update)
 · Snapcast control client and player:
	· <a href="https://github.com/badaix/snapweb">Snapweb</a>
	· <a href="https://github.com/badaix/snapdroid">Snapdroid</a>
EOF
		, 'exist'    => file_exists( '/usr/bin/snapclient' )
	]
];
htmlSection( $head, $body, 'streamers' );
$head = [ 'title' => 'Signal Processors' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'DSP'
		, 'sublabel' => 'camilladsp'
		, 'icon'     => 'camilladsp'
		, 'id'       => 'camilladsp'
		, 'status'   => 'camilladsp'
		, 'disabled' => 'js'
		, 'help'     => <<< EOF
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings: A^I^features^I Features^AI^camilladsp sub^I
EOF
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
	]
	, [
		  'label'    => 'Equalizer'
		, 'sublabel' => 'alsaequal'
		, 'icon'     => 'equalizer'
		, 'id'       => 'equalizer'
		, 'setting'  => false
		, 'disabled' => '<wh>DSP I^camilladsp^I</wh> is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control: A^I^features^I Features^AI^equalizer sub^I
Presets:
 · <c>Flat</c>: All bands at 0dB
 · New: Adjust | I^plus-circle btn^I Add | I^save btn^I Save |
 · Existing: Adjust | I^save btn^I Save |
 · Adjusted values will be listed as <c>(unnamed)</c> until saved.
 · If distortions occurred, lower all bands collectively and increase volume
EOF
	]
];
htmlSection( $head, $body, 'dsp' );
$head = [ 'title' => 'Others' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'Access Point'
		, 'sublabel' => 'hostapd'
		, 'icon'     => 'accesspoint'
		, 'id'       => 'hostapd'
		, 'status'   => 'hostapd'
		, 'disabled' => '<wh>Wi-Fi I^wifi^I</wh> is currently connected.'
		, 'help'     => <<< EOF
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
 · This should be used only when necessary.
 · Avoid double quotes <code>"</code> in password.
EOF
		, 'exist'    => file_exists( '/usr/bin/hostapd' )
	]
	, [
		  'label'   => 'AutoPlay'
		, 'icon'    => 'play'
		, 'id'      => 'autoplay'
		, 'help'    => <<< EOF
Start playing automatically on:
 · Bluetooth connected
 · Audio CD inserting
 · Power on / Reboot
EOF
	]
	, [
		  'label'    => 'Browser on RPi'
		, 'sublabel' => 'chromium'
		, 'icon'     => 'chromium'
		, 'id'       => 'localbrowser'
		, 'status'   => 'localbrowser'
		, 'help'     => <<< EOF
<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
 · TFT 3.5" LCD: Rotate needs reboot.
 · Screen off: A^I^power^I Power^AI^screenoff sub^I
	· Also by timer in I^gear btn^I
	· Backlight still on - no energy saved
 · HDMI display must be connected before boot.
EOF
		, 'exist'    => file_exists( '/usr/bin/chromium' )
	]
	, [
		  'label'    => 'File Sharing'
		, 'sublabel' => 'smb'
		, 'icon'     => 'networks'
		, 'id'       => 'smb'
		, 'status'   => 'smb'
		, 'disabled' => '<wh>Server rAudio I^rserver^I</wh> is currently active.'
		, 'help'     => <<< EOF
<a href="https://www.samba.org">Samba</a> - Share files on network for Windows clients.
 · Much faster than SCP / WinSCP when transfer large or a lot of files
 · Set sources permissions for read + write - directory: <c>0777</c> file: <c>0555</c>
 · Windows: $fileexplorer
 
(For even better performance: | Server rAudio I^rserver^I | )
EOF
		, 'exist'    => file_exists( '/usr/bin/smbd' )
	]
	, [
		  'label'    => 'Lyrics in File'
		, 'sublabel' => 'embedded ID3'
		, 'icon'     => 'lyrics'
		, 'id'       => 'lyricsembedded'
		, 'setting'  => false
		, 'help'     => <<< EOF
 · Get embedded lyrics from local files.
 · Search online if not available.
 · Should be disable if most lyrics are not embedded.
 · Online fetched lyrics are saved as separate files, not embedded.
EOF
	]
	, [
		  'label'   => 'Multiple rAudios'
		, 'icon'    => 'raudiobox'
		, 'id'      => 'multiraudio'
		, 'help'    => <<< EOF
Switch between multiple rAudio devices.
Switch: A^I^playlist^I Playlist^AI^raudiobox sub^I

(SSH password must be default.)
EOF
	]
	, [
		  'label'    => 'Password Login'
		, 'sublabel' => 'password_hash'
		, 'icon'     => 'lock'
		, 'id'       => 'login'
		, 'setting'  => 'custom'
		, 'help'     => <<< EOF
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <c>PASSWORD_BCRYPT</c>.
Lock: A^I^player^I Player^AI^lock sub^I
EOF
	]
	, [
		  'label'    => 'Scrobbler'
		, 'sublabel' => 'Last.fm'
		, 'icon'     => 'lastfm'
		, 'id'       => 'scrobble'
		, 'help'     => <<< EOF
 · Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 · Require Last.fm account.
 · No Last.fm password saved on rAudio.
 · Option to include renderers - Exclude if already scrobbleed by sender devices.
 · SnapClient already scrobbled by SnapServer.
 · Web Radio must be manually scrobbled: | Playing title | I^lastfm btn^I Scrobble |
EOF
	]
	, [
		  'label'       => 'Server rAudio'
		, 'sublabel'    => 'nfs-server'
		, 'icon'        => 'rserver'
		, 'id'          => 'nfsserver'
		, 'setting'     => 'custom'
		, 'settingicon' => false
		, 'status'      => 'nfs-server'
		, 'disabled'    => 'js'
		, 'help'        => <<< EOF
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for files and | Shared Data I^networks^I |
 • <wh>rAudio Shared Data server:</wh>
	· Must be set to <wh>static IP address</wh> which should be set on router.
	· In A^I^library^I Library^A
		· I^microsd btn^I SD and I^usbdrive btn^I USB will be hidden.
		· I^usb btn^I USB items will be displayed in I^networks btn^I NAS instead.
	· On reboot / power off:
		· Shared Data on clients will be temporarily disabled
		· Re-enabled by itself once the server is back online.
	
 • <wh>rAudio Shared Data clients:</wh>
	· A^I^system^I System^A <wh>Shared Data I^networks^I</wh> | • rAudio |
	· Automatically setup: discover, connect shared files and data
	
 • <wh>Windows NFS clients:</wh>
	· Windows Features > Services for NFS > Client for NFS - Enable
	· $fileexplorer
	
(SSH password must be default.)
EOF
	]
	, [
		  'label'    => 'Stop Timer'
		, 'icon'     => 'stopwatch'
		, 'id'       => 'stoptimer'
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
