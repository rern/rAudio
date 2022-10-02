<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );

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
		, 'disabled' => 'AirPlay is currently active.'
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
		, 'disabled' => 'SnapClient is currently active.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • SnapClient and SnapServer can be enabled on the same device.
 • Connect: &ensp;<i class="fa fa-networks"></i>Networks <gr>|</gr>&ensp;<i class="fa fa-snapcast wh"></i>
HTML
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
	, [
		  'label'    => 'Spotify'
		, 'id'       => 'spotifyd'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'status'   => 'spotifyd'
		, 'disabled' => 'Spotify is currently active.'
		, 'help'     => <<< HTML
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.
 • Require Premium account. (No Spotify password saved on rAudio.)
 • Get <code>ID</code> and <code>Secret</code> from private app : <bll class="screenshot pointer">(Screenshots)</bll>
	• <a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a> > <code>LOGIN</code> with normal Spotify account
	• <code>CREATE AN APP</code>
		- <wh>App name:</wh> <gr>(any)</gr>
		- <wh>App description:</wh> <gr>(any)</gr>
	• <code>EDIT SETTINGS</code>
		- <WH>Redirect URIs:</WH> <span id="redirecturi"></span>
	• <code>USERS AND ACCESS</code> > <code>ADD NEW USER</code>
		- <wh>Name:</wh> <gr>(any)</gr>
		- <wh>Spotify Account:</wh> (login email)
	• rAudio <code>Spotify</code>
		- Paste <wh>Client ID</wh> and <wh>Client Secret</wh> from the app
HTML
		, 'exist'    => file_exists( '/usr/bin/spotifyd' )
	]
	, [
		  'label'    => 'UPnP'
		, 'id'       => 'upmpdcli'
		, 'sublabel' => 'upmpdcli'
		, 'icon'     => 'upnp'
		, 'status'   => 'upmpdcli'
		, 'disabled' => 'UPnP is currently active.'
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
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <code>http://$ip:8000</code> (Latency - several seconds)
HTML
	]
	, [
		  'label'    => 'SnapServer'
		, 'id'       => 'snapserver'
		, 'sublabel' => 'snapserver'
		, 'icon'     => 'snapcast'
		, 'setting'  => false
		, 'status'   => 'snapserver'
		, 'disabled' => 'SnapClient is currently connected.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • Set SnapServer as a client to sync:
	- Enable SnapClient
	- Connect: &ensp;<i class="fa fa-networks"></i>Networks <gr>|</gr>&ensp;<i class="fa fa-snapcast wh"></i>
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
		, 'disabled' =>  ( exec( 'systemctl -q is-active bluetooth && echo true' ) ? 'Bluetooth' : 'Equalizer' ).' is currently enabled.'
		, 'help'     => <<< HTML
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings:&emsp;<i class="fa fa-features"></i>Features <gr>|</gr>&ensp;<i class="fa fa-camilladsp wh"></i>
HTML
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
	]
	, [
		  'label'    => 'Equalizer'
		, 'sublabel' => 'alsaequal'
		, 'id'       => 'equalizer'
		, 'icon'     => 'equalizer'
		, 'setting'  => false
		, 'disabled' => 'DSP is currently enabled.'
		, 'help'     => <<< HTML
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control:&emsp;<i class="fa fa-features"></i>Features <gr>|</gr>&ensp;<i class="fa fa-equalizer wh"></i>
Presets:
 • <code>Flat</code>: All bands at <code>0dB</code>
 • New: Adjust > <i class="fa fa-plus-circle"></i>Add > <code>NAME</code> > <i class="fa fa-save"></i>Save
 • Existing: Adjust > <i class="fa fa-save"></i>Save
 • Adjust without <i class="fa fa-save"></i>Save will be listed as <code>(unnamed)</code>
 • Save <code>(unnamed)</code>: <i class="fa fa-plus-circle"></i>Add > <code>NAME</code> > <i class="fa fa-save"></i>Save
 • If distortions occurred, lower all bands collectively and increase volume to fix distortions
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
 • Screen off: Blank screen - backlight still on (no energy saved)
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
		, 'disabled' => 'NFS Server is currently active.'
		, 'help'     => <<< HTML
<a href="https://www.samba.org">Samba</a> - Share files on network.
 • Set sources permissions for read + write - directory: <code>0777</code> file: <code>0555</code>
 • Windows: File Explorer > Address bar - <code>\\\\$ip</code> or <code>\\\\$hostname</code>
 • NFS share should yeild better performance. (System > Storage - Context menu)
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
Switch: &ensp;<i class="fa fa-playlist"></i>Playlist <gr>|</gr>&ensp;<i class="fa fa-raudiobox wh"></i>
 • SSH passwords must be default.
HTML
	]
	, [
		  'label'       => 'NFS Server'
		, 'id'          => 'nfsserver'
		, 'sublabel'    => 'nfs-server'
		, 'icon'        => 'networks'
		, 'setting'     => 'custom'
		, 'settingicon' => false
		, 'status'      => 'nfs-server'
		, 'disabled'    => is_link( '/srv/http/data/mpd' ) ? 'Shared Data is currently enabled.' : 'File Sharing is currently active.'
		, 'help'        => <<< HTML
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for music files and Shared Data.
 • rAudio server:
	- Library - Existing list in&ensp;<wh><i class="fa fa-usb"></i>USB</wh> displays in&ensp;<wh><i class="fa fa-networks"></i>NAS</wh> once update finished
 • rAudio Shared Data clients:
	- <i class="fa fa-system"></i>System > Settings and Data > Shared Data <i class="fa fa-networks"></i>
	- With only IP address of the server, discover and connect all available file and data shares automatically.
HTML
	]
	, [
		  'label'    => 'Password Login'
		, 'id'       => 'login'
		, 'sublabel' => 'password_hash'
		, 'icon'     => 'lock'
		, 'setting'  => 'custom'
		, 'help'     => <<< HTML
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <code>PASSWORD_BCRYPT</code>.
Lock: &ensp;<i class="fa fa-player"></i>Player <gr>|</gr>&ensp;<i class="fa fa-lock wh"></i>
HTML
	]
	, [
		  'label'    => 'Scrobble'
		, 'id'       => 'scrobble'
		, 'sublabel' => 'Last.fm'
		, 'icon'     => 'lastfm'
		, 'help'     => <<< HTML
 • Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 • Require Last.fm account.
 • No Last.fm password saved on rAudio.
 • Option to include renderers - Exclude if already scrobbleed by sender devices.
 • SnapClient already scrobbled by SnapServer.
 • Web Radio must be manually scrobbled: Title > <i class="fa fa-lastfm"></i>Scrobble
HTML
	]
	, [
		  'label'    => 'Stop Timer'
		, 'id'       => 'stoptimer'
		, 'icon'     => 'stopwatch'
		, 'disabled' => 'Player is not playing.'
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
