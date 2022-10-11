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
		, 'help'     => <<< HTML
<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.
HTML
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
		, 'help'     => <<< HTML
Digital Audio Broadcasting radio for USB RTL-SDR devices.
HTML
		, 'exist'    => file_exists( '/usr/bin/rtsp-simple-server' )
	]
	, [
		  'label'    => 'SnapClient'
		, 'sublabel' => 'snapclient'
		, 'id'       => 'snapclient'
		, 'icon'     => 'snapcast'
		, 'status'   => 'snapclient'
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • SnapClient and SnapServer can be enabled on the same device.
 • Connect: <a class="menu-sub">I^networks^I Networks</a>I^snapcast sub^I
HTML
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
	, [
		  'label'    => 'Spotify'
		, 'id'       => 'spotifyd'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'status'   => 'spotifyd'
		, 'disabled' => '<wh>Spotify I^spotify^I</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.
 • Require Premium account. (No Spotify password saved on rAudio.)
 • Get credential from <wh>Spotify private app</wh>: ( <bll class="screenshot pointer">Screenshots</bll> )
	• <a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a> | LOGIN | with normal Spotify account
		(Replace <cy>YELLOW</cy> with actual values)
	• | CREATE AN APP |
		- App name: <cy>NAME</cy>
		- App description: <cy>DESCRIPTION</cy>
	• | EDIT SETTINGS |
		- Redirect URIs: <span id="redirecturi"></span>
	• | USERS AND ACCESS | ADD NEW USER |
		- Name: <cy>USER</cy>
		- Spotify Account: <cy>EMAIL</cy>
• | <wh>Spotify I^spotify^I</wh> | Enable
	- Paste <cy>CLIENT_ID</cy> and <cy>CLIENT_SECRET</cy> from the app
HTML
		, 'exist'    => file_exists( '/usr/bin/spotifyd' )
	]
	, [
		  'label'    => 'UPnP'
		, 'id'       => 'upmpdcli'
		, 'sublabel' => 'upmpdcli'
		, 'icon'     => 'upnp'
		, 'status'   => 'upmpdcli'
		, 'disabled' => '<wh>UPnP I^upnp^I</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.
HTML
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
	, 'id'       => 'streaming'
	, 'sublabel' => 'MPD httpd'
	, 'icon'     => 'webradio'
	, 'setting'  => false
	, 'help'     => <<< HTML
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <c>http://$ip:8000</c> (Latency - several seconds)
HTML
	]
	, [
		  'label'    => 'SnapServer'
		, 'id'       => 'snapserver'
		, 'sublabel' => 'snapserver'
		, 'icon'     => 'snapcast'
		, 'setting'  => false
		, 'status'   => 'snapserver'
		, 'disabled' => '<wh>SnapClient I^snapcast^I</wh> is currently connected.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • Set SnapServer as a client to sync:
	- Enable SnapClient
	- Connect: <a class="menu-sub">I^networks^I Networks</a>I^snapcast sub^I
 • Snapcast control client and player:
	- <a href="https://github.com/badaix/snapweb">Snapweb</a>
	- <a href="https://github.com/badaix/snapdroid">Snapdroid</a>
HTML
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
		, 'help'     => <<< HTML
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings: <a class="menu-sub">I^features^I Features</a>I^camilladsp sub^I
HTML
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
	]
	, [
		  'label'    => 'Equalizer'
		, 'sublabel' => 'alsaequal'
		, 'id'       => 'equalizer'
		, 'icon'     => 'equalizer'
		, 'setting'  => false
		, 'disabled' => '<wh>DSP I^camilladsp^I</wh> is currently enabled.'
		, 'help'     => <<< HTML
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control: <a class="menu-sub">I^features^I Features</a>I^equalizer sub^I
Presets:
 • <c>Flat</c>: All bands at 0dB
 • New: | Adjust | I^plus-circle^I Add | <c>&lt;Name&gt;</c> | I^save^I Save |
 • Existing: | Adjust | I^save^I Save |
 • Adjusted values will be listed as <c>(unnamed)</c> until saved.
 • If distortions occurred, lower all bands collectively and increase volume
HTML
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
		, 'help'     => <<< HTML
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
This should be used only when necessary.
HTML
		, 'exist'    => file_exists( '/usr/bin/hostapd' )
	]
	, [
		  'label'   => 'AutoPlay'
		, 'id'      => 'autoplay'
		, 'icon'    => 'play'
		, 'help'    => <<< HTML
Start playing automatically on:
 • Bluetooth connected
 • Audio CD inserting
 • Power on / Reboot
HTML
	]
	, [
		  'label'    => 'Browser on RPi'
		, 'id'       => 'localbrowser'
		, 'sublabel' => 'chromium'
		, 'icon'     => 'chromium'
		, 'status'   => 'localbrowser'
		, 'help'     => <<< HTML
<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
 • TFT 3.5" LCD: Rotate needs reboot.
 • Screen off: <a class="menu-sub">I^power^I Power</a>I^screenoff sub^I&emsp;or timer
	(Backlight still on - no energy saved)
 • HDMI display: Must be connected before boot.
HTML
		, 'exist'    => file_exists( '/usr/bin/chromium' )
	]
	, [
		  'label'    => 'File Sharing'
		, 'id'       => 'smb'
		, 'sublabel' => 'smb'
		, 'icon'     => 'networks'
		, 'status'   => 'smb'
		, 'disabled' => '<wh>Server rAudio I^rserver^I</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://www.samba.org">Samba</a> - Share files on network.
 • Set sources permissions for read + write - directory: <c>0777</c> file: <c>0555</c>
 • Windows: $fileexplorer
 • | Server rAudio I^rserver^I | NFS share should yeild better performance.
HTML
		, 'exist'    => file_exists( '/usr/bin/smbd' )
	]
	, [
		  'label' => 'Lyrics in File'
		, 'id'    => 'lyricsembedded'
		, 'icon'  => 'lyrics'
		, 'setting'  => false
		, 'help'  => <<< HTML
 • Get embedded lyrics from local files.
 • Search online if not available.
 • Should be disable if most lyrics are not embedded.
 • Online fetched lyrics are saved as separate files, not embedded.
HTML
	]
	, [
		  'label'   => 'Multiple rAudios'
		, 'id'      => 'multiraudio'
		, 'icon'    => 'raudiobox'
		, 'help'    => <<< HTML
Switch between multiple rAudio devices.
Switch: <a class="menu-sub">I^playlist^I Playlist</a>I^raudiobox sub^I
 • SSH passwords must be default.
HTML
	]
	, [
		  'label'    => 'Password Login'
		, 'id'       => 'login'
		, 'sublabel' => 'password_hash'
		, 'icon'     => 'lock'
		, 'setting'  => 'custom'
		, 'help'     => <<< HTML
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <c>PASSWORD_BCRYPT</c>.
Lock: <a class="menu-sub">I^player^I Player</a>I^lock sub^I
HTML
	]
	, [
		  'label'    => 'Scrobbler'
		, 'id'       => 'scrobble'
		, 'sublabel' => 'Last.fm'
		, 'icon'     => 'lastfm'
		, 'help'     => <<< HTML
 • Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 • Require Last.fm account.
 • No Last.fm password saved on rAudio.
 • Option to include renderers - Exclude if already scrobbleed by sender devices.
 • SnapClient already scrobbled by SnapServer.
 • Web Radio must be manually scrobbled: | Playing title | I^lastfm wh^I Scrobble |
HTML
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
		, 'help'        => <<< HTML
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for music files and | <wh>Shared Data I^networks^I</wh> |
 • <wh>rAudio Shared Data server:</wh>
	- Must be set to <wh>static IP address</wh> which should be set on router.
	- Existing list in | I^library^I | <wh>I^usb^I USB</wh> | will display in | <wh>I^networks^I NAS</wh> | once update finished.
	- On reboot / power off, Shared Data on clients will be temporarily disabled > re-enabled once the server is back online.
	
 • <wh>rAudio Shared Data clients:</wh>
	- | I^system^I System | Settings and Data | <wh>Shared Data I^networks^I</wh> | <wh>• rAudio</wh>
	- Automatically setup: discover, connect shared files and data
	
 • <wh>Windows NFS clients:</wh>
	- Windows Features > Services for NFS > Client for NFS - Enable
	- $fileexplorer
	
<wh>Note:</wh> SSH passwords must be default.
HTML
	]
	, [
		  'label'    => 'Stop Timer'
		, 'id'       => 'stoptimer'
		, 'icon'     => 'stopwatch'
		, 'disabled' => 'Nothing is playing.'
		, 'help'     => <<< HTML
Stop timer:
 • Lower volume to 0 (Mute).
 • Stop player.
 • Restore volume to previous level.
 • If set, power off.
HTML
	]
];
htmlSection( $head, $body );
