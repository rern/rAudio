<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );
$fileexplorer = 'File Explorer > Address bar - <code>\\\\'.$ip.'</code> or <code>\\\\'.$hostname.'</code>';
if ( exec( 'systemctl is-active bluetooth' ) === 'active' ) {
	$disableddsp = '<wh>Bluetooth'.i( 'bluetooth' ).'</wh> is currently enabled.';
} else {
	$disableddsp = '<wh>Equalizer'.i( 'equalizer' ).'</wh> is currently enabled.';
}
if ( is_link( '/srv/http/data/mpd' ) ) {
	$disablednfs = '<wh>Shared Data'.i( 'networks' ).'</wh> is currently enabled.';
} else if ( exec( 'systemctl is-active smb' ) == 'active' ) {
	$disablednfs = '<wh>File Sharing'.i( 'networks' ).'</wh> is currently active.';
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
		, 'disabled' => '<wh>AirPlay'.i( 'airplay' ).'</wh> is currently active.'
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
		, 'disabled' => '<wh>SnapClient'.i( 'snapcast' ).'</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • SnapClient and SnapServer can be enabled on the same device.
 • Connect: {$hd( i( 'networks' ) )}Networks <gr>|</gr>{$hd( i( 'snapcast wh' ) )}
HTML
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
	, [
		  'label'    => 'Spotify'
		, 'id'       => 'spotifyd'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'status'   => 'spotifyd'
		, 'disabled' => '<wh>Spotify'.i( 'spotify' ).'</wh> is currently active.'
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
		, 'disabled' => '<wh>UPnP'.i( 'upnp' ).'</wh> is currently active.'
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
		, 'disabled' => '<wh>SnapClient'.i( 'snapcast' ).'</wh> is currently connected.'
		, 'help'     => <<< HTML
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player.
 • SSH passwords must be default.
 • Set SnapServer as a client to sync:
	- Enable SnapClient
	- Connect: {$hd( i( 'networks' ) )}Networks <gr>|</gr>{$hd( i( 'snapcast wh' ) )} 
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
Settings: {$hd( i( 'features' ) )}Features <gr>|</gr>{$hd( i( 'camilladsp wh' ) )}
HTML
		, 'exist'    => file_exists( '/usr/bin/camilladsp' )
	]
	, [
		  'label'    => 'Equalizer'
		, 'sublabel' => 'alsaequal'
		, 'id'       => 'equalizer'
		, 'icon'     => 'equalizer'
		, 'setting'  => false
		, 'disabled' => '<wh>DSP'.i( 'camilladsp' ).'</wh> is currently enabled.'
		, 'help'     => <<< HTML
<a href="https://github.com/raedwulf/alsaequal">Alsaequal</a> - 10 band graphic equalizer with user presets.
Control: {$hd( i( 'features' ) )}Features <gr>|</gr>{$hd( i( 'equalizer wh' ) )}
Presets:
 • <code>Flat</code>: All bands at <code>0dB</code>
 • New: Adjust >{$hd( i( 'plus-circle' ) )} Add > <code>NAME</code> >{$hd( i( 'save' ) )} Save
 • Existing: Adjust >{$hd( i( 'save' ) )}Save
 • Adjust without{$hd( i( 'save' ) )}Save will be listed as <code>(unnamed)</code>
 • Save <code>(unnamed)</code>: {$hd( i( 'plus-circle' ) )} Add > <code>NAME</code> >{$hd( i( 'save' ) )}Save
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
		, 'disabled' => '<wh>Server rAudio'.i( 'rserver' ).'</wh> is currently active.'
		, 'help'     => <<< HTML
<a href="https://www.samba.org">Samba</a> - Share files on network.
 • Set sources permissions for read + write - directory: <code>0777</code> file: <code>0555</code>
 • Windows: $fileexplorer
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
Switch: {$hd( i( 'playlist' ) )}Playlist <gr>|</gr>{$hd( i( 'raudiobox wh' ) )}
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
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <code>PASSWORD_BCRYPT</code>.
Lock: {$hd( i( 'player' ) )}Player <gr>|</gr>{$hd( i( 'lock wh' ) )}
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
 • Web Radio must be manually scrobbled: Title >{$hd( i( 'lastfm wh' ) )}Scrobble
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
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for music files and <wh>Shared Data{$hd( i( 'networks' ) )}</wh>
 • <wh>rAudio Shared Data server</wh>:
	- Existing list in&ensp;<wh>{$hd( i( 'usb' ) )}USB</wh> displays in&ensp;<wh>{$hd( i( 'networks' ) )}NAS</wh> once update finished
	- Like all servers, Server rAudio must be up and running:
		- While still connected by clients
		- Before clients power on
 • <wh>rAudio Shared Data clients</wh>:
	-<wh>{$hd( i( 'system' ) )}System</wh> > Settings and Data > <wh>Shared Data{$hd( i( 'networks' ) )}</wh> - Server IP address
	- Automatically discover, connect and setup for shared files and data.
 • <wh>Windows NFS clients</wh>:
	- Windows Features > Services for NFS > Client for NFS - Enable
	- $fileexplorer
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
