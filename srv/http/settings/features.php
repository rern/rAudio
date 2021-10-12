<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );
echo '<div>';
htmlHead( [ 'title' => 'Renderers' ] );
htmlSetting( [
	  'label'    => 'AirPlay'
	, 'sublabel' => 'shairport-sync'
	, 'icon'     => 'airplay'
	, 'status'   => 'shairport-sync'
	, 'id'       => 'shairport-sync'
	, 'help'     => <<<html
<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.
html
	, 'exist'    => file_exists( '/usr/bin/shairport-sync' )
] );
htmlSetting( [
	  'label'    => 'SnapClient'
	, 'icon'     => 'snapcast'
	, 'id'       => 'snapclient'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
<br>Connect: &ensp;<i class="fa fa-networks"></i>Networks |&ensp;<i class="fa fa-snapcast"></i>
html
	, 'exist'    => file_exists( '/usr/bin/snapserver' )
] );
htmlSetting( [
	  'label'    => 'Spotify'
	, 'sublabel' => 'spotifyd'
	, 'icon'     => 'spotify'
	, 'status'   => 'spotifyd'
	, 'id'       => 'spotifyd'
	, 'help'     => <<<html
<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.(For Premium account only)
html
	, 'exist'    => file_exists( '/usr/bin/spotifyd' )
] );
htmlSetting( [
	  'label'    => 'UPnP'
	, 'sublabel' => 'upmpdcli'
	, 'icon'     => 'upnp'
	, 'status'   => 'upmpdcli'
	, 'id'       => 'upmpdcli'
	, 'help'     => <<<html
<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.
html
	, 'exist'    => file_exists( '/usr/bin/upmpdcli' )
] );
echo '</div><div>';
// -----------------------------------------------------------------------------------------
htmlHead( [ 'title' => 'Streamers' ] );
htmlSetting( [
	  'label'    => 'For browsers'
	, 'sublabel' => 'MPD httpd'
	, 'icon'     => 'webradio'
	, 'id'       => 'streaming'
	, 'help'     => <<<html
<a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <code>http://$ip:8000</code> (Latency - several seconds)
html
] );
htmlSetting( [
	  'label'    => 'SnapServer'
	, 'sublabel' => 'snapserver'
	, 'icon'     => 'snapcast'
	, 'status'   => 'snapserver'
	, 'id'       => 'snapserver'
	, 'help'     => <<<html
<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
<br>SnapServer - Clients can be either between RPis or with Snapcast capable devices.
html
	, 'exist'    => file_exists( '/usr/bin/snapserver' )
] );
echo '</div><div>';
// -----------------------------------------------------------------------------------------
htmlHead( [ 'title' => 'Others' ] );
htmlSetting( [
	  'label'    => 'Access Point'
	, 'sublabel' => 'hostapd'
	, 'icon'     => 'accesspoint'
	, 'status'   => 'hostapd'
	, 'id'       => 'hostapd'
	, 'setting'  => 'self'
	, 'help'     => <<<html
<a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
<br>This should be used only when necessary.
html
	, 'exist'    => file_exists( '/usr/bin/hostapd' )
] );
htmlSetting( [
	  'label'    => 'Browser on RPi'
	, 'sublabel' => 'localbrowser'
	, 'icon'     => 'chromium'
	, 'status'   => 'localbrowser'
	, 'id'       => 'localbrowser'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
<br> &bull; HDMI/LCD display must be connected before boot.
<br> &bull; TFT 3.5" LCD - rotate needs reboot.
html
	, 'exist'    => file_exists( '/usr/bin/chromium' )
] );
htmlSetting( [
	  'label'    => 'File Sharing'
	, 'sublabel' => 'smb'
	, 'icon'     => 'networks'
	, 'status'   => 'smb'
	, 'id'       => 'smb'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<a href="https://www.samba.org">Samba</a> - Share files on network.
<br> &bull; Set sources permissions for read+write - directory: <code>0777</code> file: <code>0555</code>
<br> &bull; At address bar of Windows File Explorer: <code>$ip</code> or <code>$hostname</code>
html
	, 'exist'    => file_exists( '/usr/bin/smbd' )
] );
htmlSetting( [
	  'label'    => 'Last.fm Scrobbler'
	, 'sublabel' => 'mpdscribble'
	, 'icon'     => 'lastfm'
	, 'status'   => 'mpdscribble'
	, 'id'       => 'mpdscribble'
	, 'setting'  => 'preenable'
	, 'help'     => <<<html
<a href="https://github.com/MusicPlayerDaemon/mpdscribble">mpdscribble</a> - Automatically send listened music data to Last.fm for tracking.
html
] );
htmlSetting( [
	  'label'    => 'Password Login'
	, 'sublabel' => 'password_hash'
	, 'icon'     => 'lock'
	, 'id'       => 'login'
	, 'setting'  => 'self'
	, 'help'     => <<<html
<a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with set password using <code>PASSWORD_BCRYPT</code>.
<br>Lock: &ensp;<i class="fa fa-plus-r"></i>System |&ensp;<i class="fa fa-lock"></i>
html
] );
htmlSetting( [
	  'label' => 'Play on Insert CD'
	, 'icon'  => 'play-cd'
	, 'id'    => 'autoplaycd'
	, 'help'  => <<<html
Start playing automatically on audio CD inserting or power on with CD inserted.
html
] );
htmlSetting( [
	  'label' => 'Play on Startup'
	, 'icon'  => 'play-power'
	, 'id'    => 'autoplay'
	, 'help'  => <<<html
Start playing automatically after boot.
html
] );
echo '</div>';
