<?php $code = '<i class="fa fa-code"></i>'; ?>
<div>
<script>
	var set = <?=( '"'.$_GET[ 'set' ].'"' ?: 'false' )?>;
</script>
<heading>Renderers<?=$help?></heading>
	<?php if ( file_exists( '/usr/bin/shairport-sync' ) ) { ?>
<div data-status="shairport-sync" class="col-l double status">
	<a>AirPlay
	<br><gr>shairport-sync<?=$code?></gr></a><i class="fa fa-airplay fa-lg"></i>
</div>
<div class="col-r">
	<input id="shairport-sync" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="shairport-sync"></div>
	<span class="help-block hide">
		<a href="https://github.com/mikebrady/shairport-sync">Shairport-sync</a> - AirPlay rendering device.
	</span>
</div>
<pre id="codeshairport-sync" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div data-status="snapclient" class="col-l double status">
	<a>SnapClient
	<br><gr>snapclient<?=$code?></gr></a><i class="fa fa-snapcast fa-lg"></i>
</div>
<div class="col-r">
	<input id="snapclient" class="enable" type="checkbox">
	<div class="switchlabel" for="snapclient"></div>
	<i id="setting-snapclient" class="setting fa fa-gear hide"></i>
	<span class="help-block hide">
		<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
		<br>SnapClient - Connect: Menu >&ensp;<i class="fa fa-folder-cascade"></i>&ensp;Sources |&ensp;<i class="fa fa-snapcast"></i>
		<br>(Note: Not available while Snapcast server enabled.)
	</span>
</div>
<pre id="codesnapclient" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/spotifyd' ) ) { ?>
<div data-status="spotifyd" class="col-l double status">
	<a>Spotify
	<br><gr>spotifyd<?=$code?></gr></a><i class="fa fa-spotify fa-lg"></i>
</div>
<div class="col-r">
	<input id="spotifyd" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="spotifyd"></div>
	<span class="help-block hide">
		<a href="https://github.com/Spotifyd/spotifyd">Spotifyd</a> - Spotify Connect device.(For Premium account only)
	</span>
</div>
<pre id="codespotifyd" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/upmpdcli' ) ) { ?>
<div data-status="upmpdcli" class="col-l double status">
	<a>UPnP
	<br><gr>upmpdcli<?=$code?></gr></a><i class="fa fa-upnp fa-lg"></i>
</div>
<div class="col-r">
	<input id="upmpdcli" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="upmpdcli"></div>
	<!--<i id="setting-upnp" class="setting fa fa-gear hide"></i>-->
	<span class="help-block hide">
		<a href="https://www.lesbonscomptes.com/upmpdcli/">upmpdcli</a> - UPnP / DLNA rendering device.
	</span>
</div>
<pre id="codeupmpdcli" class="hide"></pre>
	<?php } ?>
</div>

<div>
<heading>Streamers<?=$help?></heading>
<div class="col-l double">
	<a>For browsers
	<br><gr>MPD http</gr></a><i class="fa fa-webradio fa-lg"></i>
</div>
<div class="col-r">
	<input id="streaming" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="streaming"></div>
	<span class="help-block hide">Asynchronous streaming for browsers via <code id="ip"></code> (Latency - several seconds)</span>
</div>
	<?php if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div data-status="snapserver" class="col-l double status">
	<a>SnapServer
	<br><gr>snapserver<?=$code?></gr></a><i class="fa fa-snapcast fa-lg"></i>
</div>
<div class="col-r">
	<input id="snapserver" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="snapserver"></div>
	<span class="help-block hide">
		<a href="https://github.com/badaix/snapcast">Snapcast</a> - Multiroom client-server audio player
		<br>SnapServer - Clients can be either between RPis or with Snapcast capable devices.
		<br>(Note: Enable Snapcast will disable SnapClient.)
	</span>
</div>
<pre id="codesnapserver" class="hide"></pre>
	<?php } ?>
</div>

<div>
<heading>Others<?=$help?></heading>
	<?php if ( file_exists( '/usr/bin/transmission-cli' ) ) { ?>
<div data-status="transmission" class="col-l double status">
	<a>BitTorrent
	<br><gr>transmission<?=$code?></gr></a><i class="fa fa-transmission fa-lg"></i>
</div>
<div class="col-r">
	<input id="transmission" class="enable" type="checkbox">
	<div class="switchlabel" for="transmission"></div>
	<span class="help-block hide">
		<a href="https://transmissionbt.com/">Transmission</a> - BitTorrent client
		<br>URL: <span id="urltran"></span>
	</span>
</div>
<pre id="codetransmission" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/chromium' ) ) { ?>
<div data-status="localbrowser" class="col-l double status">
	<a>Browser on RPi
	<br><gr>localbrowser<?=$code?></gr></a><i class="fa fa-chromium fa-lg"></i>
</div>
<div class="col-r">
	<input id="localbrowser" class="enable" type="checkbox">
	<div class="switchlabel" for="localbrowser"></div>
	<i id="setting-localbrowser" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		<a href="https://github.com/chromium/chromium">Chromium</a> - Browser on RPi connected screen. (Overscan change needs reboot.)
	</span>
</div>
<pre id="codelocalbrowser" class="hide"></pre>
	<?php } 
		  if ( file_exists( '/usr/bin/aria2' ) ) { ?>
<div data-status="aria2" class="col-l double status">
	<a>Downloader
	<br><gr>aria2<?=$code?></gr></a><i class="fa fa-download fa-lg"></i>
</div>
<div class="col-r">
	<input id="aria2" class="enable" type="checkbox">
	<div class="switchlabel" for="aria2"></div>
	<span class="help-block hide">
		<a href="https://aria2.github.io/">Aria2</a> - Multi-protocol & multi-source command-line download utility.
		<br>URL: <span id="urlaria"></span>
	</span>
</div>
<pre id="codearia2" class="hide"></pre>
	<?php }
		  if ( file_exists( '/usr/bin/smbd' ) ) { ?>
<div data-status="smb" class="col-l double status">
	<a>File Sharing
	<br><gr>smb<?=$code?></gr></a><i class="fa fa-networks fa-lg"></i>
</div>
<div class="col-r">
	<input id="smb" class="enable" type="checkbox">
	<div class="switchlabel" for="smb"></div>
	<i id="setting-smb" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		<a href="https://www.samba.org">Samba</a> - Share files on networks.
		<br>Set sources permissions for read+write - directory: <code>0777</code> file: <code>0555</code>
	</span>
</div>
<pre id="codesmb" class="hide"></pre>
	<?php } ?>
<div data-status="mpdscribble" class="col-l double status">
	<a>Last.fm Scrobbler
	<br><gr>mpdscribble<?=$code?></gr></a><i class="fa fa-lastfm fa-lg"></i>
</div>
<div class="col-r">
	<input id="mpdscribble" class="enable" type="checkbox">
	<div class="switchlabel" for="mpdscribble"></div>
	<i id="setting-mpdscribble" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		<a href="https://github.com/MusicPlayerDaemon/mpdscribble">mpdscribble</a> - Automatically send listened music data to Last.fm for tracking.
	</span>
</div>
<pre id="codempdscribble" class="hide"></pre>
<div class="col-l double">
	<a>Password Login
	<br><gr>PHP Blowfish</gr></a><i class="fa fa-lock-circle fa-lg"></i>
</div>
<div class="col-r">
	<input id="login" class="enable" type="checkbox">
	<div class="switchlabel" for="password"></div>
	<i id="setting-login" class="setting fa fa-gear"></i>
	<span class="help-block hide">Force browser interface login with set password.</span>
</div>
<div class="col-l double">
	<a>Play on Startup
	<br><gr>System</gr></a><i class="fa fa-refresh-play fa-lg"></i>
</div>
<div class="col-r">
	<input id="autoplay" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="autoplay"></div>
	<span class="help-block hide">Start playing automatically after boot.</span>
</div>
<div data-status="hostapd" class="col-l double status">
	<a>RPi Access Point
	<br><gr>hostapd<?=$code?></gr></a><i class="fa fa-wifi fa-lg"></i>
</div>
<div class="col-r">
	<input id="hostapd" class="enable hidden" type="checkbox">
	<input id="hostapdchk" type="checkbox">
	<div class="switchlabel" for="hostapd"></div>
	<i id="setting-hostapd" class="setting fa fa-gear"></i>
	<span class="help-block hide">Connect with RPi Wi-Fi directly when no routers available.
		<br>RPi access point should be used only when necessary.</span>
</div>
<pre id="codehostapd" class="hide"></pre>

</div>

<div style="clear: both"></div>
