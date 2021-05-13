<script>
	var set = '<?=( $_GET[ 'set' ] ?? '' )?>';
</script>
<div>
<heading>Renderers<?=$ihelp?></heading>
	<?php if ( file_exists( '/usr/bin/shairport-sync' ) ) { ?>
<div data-status="shairport-sync" <?=$classstatus?>>
	<!-- iOS 14.5 fix - keep <br> in the same line to prevent last character stripped -->
	<a>AirPlay<br><gr>shairport-sync<?=$istatus?></gr></a><i class="fa fa-airplay"></i>
</div>
<div class="col-r">
	<input id="shairport-sync" <?=$chknoset?>>
	<div class="switchlabel" for="shairport-sync"></div>
	<span <?=$classhelp?>>
		<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.
	</span>
</div>
<pre id="codeshairport-sync" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div class="col-l single">SnapClient<i class="fa fa-snapcast"></i></div>
<div class="col-r">
	<input id="snapclient" <?=$chkenable?>>
	<div class="switchlabel" for="snapclient"></div>
	<i id="setting-snapclient" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
		<br>SnapClient - Connect: Menu >&ensp;<i class="fa fa-folder-cascade"></i>&ensp;Sources |&ensp;<i class="fa fa-snapcast"></i>
	</span>
</div>
	<?php }
		  if ( file_exists( '/usr/bin/spotifyd' ) ) { ?>
<div data-status="spotifyd" <?=$classstatus?>>
	<a>Spotify<br><gr>spotifyd<?=$istatus?></gr></a><i class="fa fa-spotify"></i>
</div>
<div class="col-r">
	<input id="spotifyd" <?=$chknoset?>>
	<div class="switchlabel" for="spotifyd"></div>
	<span <?=$classhelp?>>
		<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.(For Premium account only)
	</span>
</div>
<pre id="codespotifyd" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/upmpdcli' ) ) { ?>
<div data-status="upmpdcli" <?=$classstatus?>>
	<a>UPnP<br><gr>upmpdcli<?=$istatus?></gr></a><i class="fa fa-upnp"></i>
</div>
<div class="col-r">
	<input id="upmpdcli" <?=$chknoset?>>
	<div class="switchlabel" for="upmpdcli"></div>
	<!--<i id="setting-upnp" <?=$classsetting?>></i>-->
	<span <?=$classhelp?>>
		<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.
	</span>
</div>
<pre id="codeupmpdcli" class="hide"></pre>
	<?php } ?>
</div>

<div>
<heading>Streamers<?=$ihelp?></heading>
<div class="col-l double">
	<a>For browsers<br><gr>MPD httpd</gr></a><i class="fa fa-webradio"></i>
</div>
<div class="col-r">
	<input id="streaming" <?=$chknoset?>>
	<div class="switchlabel" for="streaming"></div>
	<span <?=$classhelp?>><a href="https://wiki.archlinux.org/index.php/Music_Player_Daemon/Tips_and_tricks#HTTP_streaming">HTTP streaming</a> - Asynchronous streaming for browsers via <code id="ip"></code> (Latency - several seconds)</span>
</div>
	<?php if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div data-status="snapserver" <?=$classstatus?>>
	<a>SnapServer<br><gr>snapserver<?=$istatus?></gr></a><i class="fa fa-snapcast"></i>
</div>
<div class="col-r">
	<input id="snapserver" <?=$chknoset?>>
	<div class="switchlabel" for="snapserver"></div>
	<span <?=$classhelp?>>
		<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
		<br>SnapServer - Clients can be either between RPis or with Snapcast capable devices.
	</span>
</div>
<pre id="codesnapserver" class="hide"></pre>
	<?php } ?>
</div>

<div>
<heading>Others<?=$ihelp?></heading>
	<?php if ( file_exists( '/usr/bin/hostapd' ) ) { ?>
<div data-status="hostapd" <?=$classstatus?>>
	<a>Access Point<br><gr>hostapd<?=$istatus?></gr></a><i class="fa fa-accesspoint"></i>
</div>
<div class="col-r">
	<input id="hostapd" class="enable hidden" type="checkbox">
	<input id="hostapdchk" type="checkbox">
	<div class="switchlabel" for="hostapd"></div>
	<i id="setting-hostapd" <?=$classsetting?>></i>
	<span <?=$classhelp?>><a href="https://w1.fi/hostapd/">hostapd</a> - Connect with rAudio hotspot directly when no routers available.
		<br>This should be used only when necessary.</span>
</div>
<pre id="codehostapd" class="hide"></pre>
	<?php } ?>
	<?php if ( file_exists( '/usr/bin/transmission-cli' ) ) { ?>
<div data-status="transmission" <?=$classstatus?>>
	<a>BitTorrent<br><gr>transmission<?=$istatus?></gr></a><i class="fa fa-transmission"></i>
</div>
<div class="col-r">
	<input id="transmission" <?=$chkenable?>>
	<div class="switchlabel" for="transmission"></div>
	<span <?=$classhelp?>>
		<a href="https://transmissionbt.com/">Transmission</a> - BitTorrent client
		<br>URL: <span id="urltran"></span>
	</span>
</div>
<pre id="codetransmission" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/chromium' ) ) { ?>
<div data-status="localbrowser" <?=$classstatus?>>
	<a>Browser on RPi<br><gr>localbrowser<?=$istatus?></gr></a><i class="fa fa-chromium"></i>
</div>
<div class="col-r">
	<input id="localbrowser" <?=$chkenable?>>
	<div class="switchlabel" for="localbrowser"></div>
	<i id="setting-localbrowser" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen.
		<br> &bull; HDMI/LCD display must be connected before boot.
		<br> &bull; Overscan change needs reboot.
	</span>
</div>
<pre id="codelocalbrowser" class="hide"></pre>
	<?php } 
		  if ( file_exists( '/usr/bin/aria2' ) ) { ?>
<div data-status="aria2" <?=$classstatus?>>
	<a>Downloader<br><gr>aria2<?=$istatus?></gr></a><i class="fa fa-download"></i>
</div>
<div class="col-r">
	<input id="aria2" <?=$chkenable?>>
	<div class="switchlabel" for="aria2"></div>
	<span <?=$classhelp?>>
		<a href="https://aria2.github.io/">Aria2</a> - Multi-protocol & multi-source command-line download utility.
		<br>URL: <span id="urlaria"></span>
	</span>
</div>
<pre id="codearia2" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/smbd' ) ) { 
			$hostname = getHostName();
			$ip = getHostByName( $hostname );
	?>
<div data-status="smb" <?=$classstatus?>>
	<a>File Sharing<br><gr>smb<?=$istatus?></gr></a><i class="fa fa-networks"></i>
</div>
<div class="col-r">
	<input id="smb" <?=$chkenable?>>
	<div class="switchlabel" for="smb"></div>
	<i id="setting-smb" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a href="https://www.samba.org">Samba</a> - Share files on network.
		<br> &bull; Set sources permissions for read+write - directory: <code>0777</code> file: <code>0555</code>
		<br> &bull; At address bar of Windows File Explorer: <code>\\<?=$ip?></code> or <code>\\<?=$hostname?></code>
	</span>
</div>
<pre id="codesmb" class="hide"></pre>
	<?php } ?>
<div data-status="mpdscribble" <?=$classstatus?>>
	<a>Last.fm Scrobbler<br><gr>mpdscribble<?=$istatus?></gr></a><i class="fa fa-lastfm"></i>
</div>
<div class="col-r">
	<input id="mpdscribble" <?=$chkenable?>>
	<div class="switchlabel" for="mpdscribble"></div>
	<i id="setting-mpdscribble" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a href="https://github.com/MusicPlayerDaemon/mpdscribble">mpdscribble</a> - Automatically send listened music data to Last.fm for tracking.
	</span>
</div>
<pre id="codempdscribble" class="hide"></pre>
<div class="col-l double">
	<a>Password Login<br><gr>password_hash</gr></a><i class="fa fa-lock-circle"></i>
</div>
<div class="col-r">
	<input id="login" <?=$chkenable?>>
	<div class="switchlabel" for="password"></div>
	<i id="setting-login" <?=$classsetting?>></i>
	<span <?=$classhelp?>><a href="https://www.php.net/manual/en/function.password-hash.php">password_hash</a> - Force browser interface login with set password using <code>PASSWORD_BCRYPT</code>.</span>
</div>
<div class="col-l single">
	Play on Insert CD<i class="fa fa-audiocd"></i>
</div>
<div class="col-r">
	<input id="autoplaycd" <?=$chknoset?>>
	<div class="switchlabel" for="autoplaycd"></div>
	<span <?=$classhelp?>>Start playing automatically on audio CD inserting or power on with CD inserted.</span>
</div>
<div class="col-l single">
	Play on Startup<i class="fa fa-refresh-play"></i>
</div>
<div class="col-r">
	<input id="autoplay" <?=$chknoset?>>
	<div class="switchlabel" for="autoplay"></div>
	<span <?=$classhelp?>>Start playing automatically after boot.</span>
</div>
</div>

<div style="clear: both"></div>
