<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );
$head = [ 'title' => 'Renderers' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'AirPlay'
		, 'id'       => 'shairport-sync'
		, 'sublabel' => 'shairport-sync'
		, 'icon'     => 'airplay'
		, 'status'   => 'shairport-sync'
		, 'help'     => <<<html
<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.
html
		, 'exist'    => file_exists( '/usr/bin/shairport-sync' )
	]
	, [
		  'label'    => 'SnapClient'
		, 'id'       => 'snapclient'
		, 'icon'     => 'snapcast'
		, 'setting'  => true
		, 'help'     => <<<html
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
Connect: &ensp;<i class="fa fa-networks"></i>Networks |&ensp;<i class="fa fa-snapcast"></i>
html
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
	, [
		  'label'    => 'Spotify'
		, 'id'       => 'spotifyd'
		, 'sublabel' => 'spotifyd'
		, 'icon'     => 'spotify'
		, 'status'   => 'spotifyd'
		, 'help'     => <<<html
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.(For Premium account only)
html
		, 'exist'    => file_exists( '/usr/bin/spotifyd' )
	]
	, [
		  'label'    => 'UPnP'
		, 'id'       => 'upmpdcli'
		, 'sublabel' => 'upmpdcli'
		, 'icon'     => 'upnp'
		, 'status'   => 'upmpdcli'
		, 'help'     => <<<html
<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.
html
		, 'exist'    => file_exists( '/usr/bin/upmpdcli' )
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Streamers' ]; //////////////////////////////////
$body = [
	[
	  'label'    => 'For browsers'
	, 'id'       => 'streaming'
	, 'sublabel' => 'MPD httpd'
	, 'icon'     => 'webradio'
	, 'help'     => <<<html
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <code>http://$ip:8000</code> (Latency - several seconds)
html
	]
	, [
		  'label'    => 'SnapServer'
		, 'id'       => 'snapserver'
		, 'sublabel' => 'snapserver'
		, 'icon'     => 'snapcast'
		, 'status'   => 'snapserver'
		, 'help'     => <<<html
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
SnapServer - Clients can be either between RPis or with Snapcast capable devices.
html
		, 'exist'    => file_exists( '/usr/bin/snapserver' )
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Others' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'Access Point'
		, 'id'       => 'hostapd'
		, 'sublabel' => 'hostapd'
		, 'icon'     => 'accesspoint'
		, 'status'   => 'hostapd'
		, 'setting'  => 'self'
		, 'help'     => <<<html
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
This should be used only when necessary.
html
		, 'exist'    => file_exists( '/usr/bin/hostapd' )
	], [
		  'label'    => 'Browser on RPi'
		, 'id'       => 'localbrowser'
		, 'sublabel' => 'localbrowser'
		, 'icon'     => 'chromium'
		, 'status'   => 'localbrowser'
		, 'setting'  => true
		, 'help'     => <<<html
<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
 • HDMI/LCD display must be connected before boot.
 • TFT 3.5" LCD - rotate needs reboot.
html
		, 'exist'    => file_exists( '/usr/bin/chromium' )
	]
	, [
		  'label'    => 'File Sharing'
		, 'id'       => 'smb'
		, 'sublabel' => 'smb'
		, 'icon'     => 'networks'
		, 'status'   => 'smb'
		, 'setting'  => true
		, 'help'     => <<<html
<a href="https://www.samba.org">Samba</a> - Share files on network.
 • Set sources permissions for read+write - directory: <code>0777</code> file: <code>0555</code>
 • At address bar of Windows File Explorer: <code>$ip</code> or <code>$hostname</code>
html
		, 'exist'    => file_exists( '/usr/bin/smbd' )
	]
	, [
		  'label'    => 'Last.fm Scrobbler'
		, 'id'       => 'mpdscribble'
		, 'sublabel' => 'mpdscribble'
		, 'icon'     => 'lastfm'
		, 'status'   => 'mpdscribble'
		, 'setting'  => true
		, 'help'     => <<<html
<a href="https://github.com/MusicPlayerDaemon/mpdscribble">mpdscribble</a> - Automatically send listened music data to Last.fm for tracking.
html
	]
	, [
		  'label'    => 'Password Login'
		, 'id'       => 'login'
		, 'sublabel' => 'password_hash'
		, 'icon'     => 'lock'
		, 'setting'  => 'self'
		, 'help'     => <<<html
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with password using <code>PASSWORD_BCRYPT</code>.
Lock: &ensp;<i class="fa fa-features"></i>Features |&ensp;<i class="fa fa-lock"></i>
html
	]
	, [
		  'label' => 'Play on Insert CD'
		, 'id'    => 'autoplaycd'
		, 'icon'  => 'play-cd'
		, 'help'  => <<<html
Start playing automatically on audio CD inserting or power on with CD inserted.
html
	]
	, [
		  'label' => 'Play on Startup'
		, 'id'    => 'autoplay'
		, 'icon'  => 'play-power'
		, 'help'  => <<<html
Start playing automatically after boot.
html
	]
];
htmlSection( $head, $body );
