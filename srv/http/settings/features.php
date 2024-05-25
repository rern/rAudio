<?php
$hostname     = getHostName();
$ip           = getHostByName( $hostname );
$fileexplorer = 'File Explorer &raquo; Address bar: <c>\\\\'.$ip.'</c> or <c>\\\\'.$hostname.'</c>';
$id_data      = [
	  'ap'             => [ 'label' => 'Access Point',     'sub' => 'iwd',                                   'status' => true, 'exist' => 'iwctl' ]
	, 'autoplay'       => [ 'label' => 'AutoPlay' ]
	, 'camilladsp'     => [ 'label' => 'DSP',              'sub' => 'camilladsp',     'setting' => false,    'status' => true, 'exist' => 'camilladsp' ]
	, 'dabradio'       => [ 'label' => 'DAB Radio',        'sub' => 'mediamtx',       'setting' => false,    'status' => true, 'exist' => 'mediamtx' ]
	, 'equalizer'      => [ 'label' => 'Equalizer',        'sub' => 'alsaequal',      'setting' => false ]
	, 'httpd'          => [ 'label' => 'For browsers',     'sub' => 'MPD httpd',      'setting' => false ]
	, 'localbrowser'   => [ 'label' => 'Browser on RPi',   'sub' => 'firefox',                               'status' => true, 'exist' => 'firefox' ]
	, 'login'          => [ 'label' => 'Password Login',   'sub' => 'password_hash',  'setting' => 'custom' ]
	, 'lyrics'         => [ 'label' => 'Lyrics' ]
	, 'multiraudio'    => [ 'label' => 'Multiple rAudios', 'sub' => 'multiraudio' ]
	, 'nfsserver'      => [ 'label' => 'Server rAudio',    'sub' => 'nfs-server',     'setting' => false,    'status' => true ]
	, 'scrobble'       => [ 'label' => 'Scrobbler',        'sub' => 'Last.fm' ]
	, 'shairport-sync' => [ 'label' => 'AirPlay',          'sub' => 'shairport-sync', 'setting' => false,    'status' => true, 'exist' => 'shairport-sync' ]
	, 'smb'            => [ 'label' => 'File Sharing',     'sub' => 'samba',                                 'status' => true, 'exist' => 'smbd' ]
	, 'snapclient'     => [ 'label' => 'SnapClient',       'sub' => 'snapclient',     'setting' => true,     'status' => true, 'exist' => 'snapclient' ]
	, 'snapserver'     => [ 'label' => 'SnapServer',       'sub' => 'snapserver',     'setting' => true,    'status' => true, 'exist' => 'snapclient' ]
	, 'spotifyd'       => [ 'label' => 'Spotify',          'sub' => 'spotifyd',                              'status' => true, 'exist' => 'spotifyd' ]
	, 'stoptimer'      => [ 'label' => 'Stop Timer' ]
	, 'upmpdcli'       => [ 'label' => 'UPnP / DLNA',      'sub' => 'upmpdcli',       'setting' => false,    'status' => true, 'exist' => 'spotifyd' ]
];
$snapweb = i( 'gear btn' ).'<a href="https://github.com/badaix/snapweb">Snapweb</a>: Manage clients with built-in streaming renderer'."\n";
// ----------------------------------------------------------------------------------
$head         = [ 'title' => 'Renderers' ]; //////////////////////////////////
$body         = [
	[
		  'id'       => 'shairport-sync'
		, 'help'     => <<< EOF
<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device
Note:
 · No sound: Increase volume on sender device (too low)
 · If Camilla DSP is enabled, stop current track before start playing.
 · Playing files directly on rAudio yields better quality.
EOF
	]
	, [
		  'id'       => 'dabradio'
		, 'disabled' => 'No DAB devices found.'
		, 'help'     => 'Digital Audio Broadcasting radio for USB RTL-SDR devices.'
	]
	, [
		  'id'       => 'snapclient'
		, 'help'     => <<< EOF
{$snapweb}
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Synchronous multiroom audio player.
 · Connect: {$Fmenu( 'networks', 'Networks', 'snapcast' )}
 · SnapClient and SnapServer can be enabled on the same device.
	· Enable SnapServer before SnapClient
	· SnapClient auto connect/disconnect on play/stop (no connect icon)
 · Web interface: <c>http://SNAPSERVER_IP:1780</c>
EOF
	]
	, [
		  'id'       => 'spotifyd'
		, 'help'     => <<< EOF
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device
Require:
 · Premium account
 · <c>Client ID</c> and <c>Client secret</c> from your Spotify private app

To create Spotify private app:
<btn>Log in</btn> <a href="https://developer.spotify.com/dashboard/applications">Spotify for Developers</a>
	· with normal Spotify account
	· Verify email if prompted
<btn>Create app</btn>
	· App name: <c>rAudio</c>
	· App description: <c>(any)</c>
	· Website: <c>(any)</c>
	· Redirect URI: <c>https://rern.github.io/raudio/spotify</c>
	· <c>Save</c>
<btn>Dashboard</btn> · <btn>rAudio</btn> · <btn>Settings</btn>
	· <btn>Basic Information</btn> · <btn>User Management</btn>
		· Fullname: <c>(any)</c>
		· Email: <c>(Spotify Account email)</c>
		· <c>Add user</c>
	· <btn>Basic Information</btn>
		· <c>Client ID</c>
		· <c>Client secret</c>
EOF
	]
	, [
		  'id'       => 'upmpdcli'
		, 'help'     => <<< EOF
<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device
 · Playlist - replaced by playlist of UPnP / DLNA on start
 · Playback stop button - Clear UPnP / DLNA playlist

Note: Playing files directly on rAudio yields better quality.
EOF
	]
];
htmlSection( $head, $body, 'renderers' );
// ----------------------------------------------------------------------------------

$head = [ 'title' => 'Streamers' ]; //////////////////////////////////
$body = [
	[
		  'id'       => 'httpd'
		, 'help'     => <<< EOF
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <c>http://$ip:8000</c> (Latency - several seconds)
EOF
	]
	, [
		  'id'       => 'snapserver'
		, 'help'     => <<< EOF
{$snapweb}
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Synchronous multiroom audio player
EOF
	]
];
htmlSection( $head, $body, 'streamers' );
$head = [ 'title' => 'Signal Processors' ]; //////////////////////////////////
$body = [
	[
		  'id'       => 'camilladsp'
		, 'disabled' => iLabel( 'Equalizer', 'equalizer' ).' is currently enabled.'
		, 'help'     => <<< EOF
<a href="https://github.com/HEnquist/camilladsp">CamillaDSP</a> - A flexible cross-platform IIR and FIR engine for crossovers, room correction etc.
Settings: {$Fmenu( 'features', 'Features', 'camilladsp' )}
EOF
	]
	, [
		  'id'       => 'equalizer'
		, 'disabled' => iLabel( 'DSP', 'camilladsp' ).' is currently enabled.'
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
$body = [
	[
		  'id'       => 'ap'
		, 'disabled' => iLabel( 'Wi-Fi', 'wifi' ).' is currently connected.'
		, 'help'     => <<< EOF
<a href="https://iwd.wiki.kernel.org/ap_mode">iNet Wireless Daemon</a> (iwd) - Connect with rAudio hotspot directly when no routers available.
 · This should be used only when necessary.
 · Avoid double quotes <c>"</c> in password.
EOF
	]
	, [
		  'id'       => 'autoplay'
		, 'help'     => <<< EOF
Start playing automatically on:
 · Bluetooth connected
 · Audio CD inserting
 · Power on / Reboot
EOF
	]
	, [
		  'id'       => 'localbrowser'
		, 'help'     => <<< EOF
<a href="https://www.mozilla.org/firefox/browsers/">Firefox</a> - Browser on RPi connected screen.
 · Rotate - TFT 3.5" LCD needs reboot.
 · Screen off: {$Fmenu( 'power', 'Power', 'screenoff' )} (Backlight still on - no energy saved)
 · run <c>xinitrc.d</c> - execute custom scripts in <c>/etc/X11/xinit/xinitrc.d</c>

Note: HDMI display - Connect before boot
EOF
	]
	, [
		  'id'       => 'smb'
		, 'disabled' => iLabel( 'Server rAudio', 'rserver' ).' is currently active.'
		, 'help'     => <<< EOF
<a href="https://www.samba.org">Samba</a> - Share files on network for Windows clients.
 · Much faster than SCP / WinSCP when transfer large or a lot of files
 · Set sources permissions for read + write - directory: <c>0777</c> file: <c>0555</c>
 · Windows: $fileexplorer
 
Note: {$FiLabel( 'Server rAudio', 'rserver' )} should yield better performance.
EOF
	]
	, [
		  'id'       => 'lyrics'
		, 'help'     => <<< EOF
 · Search lyrics from user specified URL and tags.
 · Embedded lyrics:
	 · Get lyrics from local files.
	 · If not available, search online.
	 · Should be disabled if most lyrics are not embedded.
EOF
	]
	, [
		  'id'       => 'multiraudio'
		, 'help'     => <<< EOF
Switch between multiple rAudio devices.
Switch: {$Fmenu( 'playlist', 'Playlist', 'multiraudio' )}
EOF
	]
	, [
		  'id'       => 'login'
		, 'help'     => <<< EOF
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <c>PASSWORD_BCRYPT</c>.
Lock: {$Fmenu( 'player', 'Player', 'lock' )}
EOF
	]
	, [
		  'id'       => 'scrobble'
		, 'help'     => <<< EOF
 · Send artist, title and album of played tracks to <a href="https://www.last.fm/">Last.fm</a> to save in user's database.
 · Require Last.fm account.
 · SnapClient already scrobbled by SnapServer.
 · Web Radio must be manually scrobbled: Playing title &raquo; {$Fi( 'lastfm btn' )} Scrobble
 · Scrobbled list: <a href="https://www.last.fm/">Last.fm</a> &raquo; User icon &raquo; Library &raquo; Scrobbles
EOF
	]
	, [
		  'id'          => 'nfsserver'
		, 'disabled'    => 'js'
		, 'help'        => <<< EOF
<a href="https://en.wikipedia.org/wiki/Network_File_System">NFS</a> - Network File System - Server for files and {$FiLabel( 'Shared Data', 'networks' )}
 • <wh>rAudio Shared Data server:</wh>
	· Must be set to <wh>static IP address</wh> which should be set on router.
	· In {$FiTab( 'Library' )} Library
		· {$Fi( 'microsd btn' )} SD and {$Fi( 'usbdrive btn' )} USB will be hidden.
		· {$Fi( 'usb btn' )} USB items will be displayed in {$Fi( 'networks btn' )} NAS instead.
	· On reboot / power off:
		· Shared Data on clients will be temporarily disabled
		· Re-enabled by itself once the server is back online.
	
 • <wh>rAudio Shared Data clients:</wh>
	· {$FiTab( 'System' )}{$FiLabel( 'Shared Data', 'networks' )} Type ● rAudio
	· Automatically setup: discover, connect shared files and data
	
 • <wh>Windows NFS clients:</wh>
	· Windows Features &raquo; Services for NFS &raquo; Client for NFS · Enable
	· $fileexplorer
	
Note: SSH password must be default.
EOF
	]
	, [
		  'id'       => 'stoptimer'
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
