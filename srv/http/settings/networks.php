<div id="divinterface">
<?php if ( exec( 'systemctl -q is-active bluetooth && echo 1 || echo 0' ) ) { ?>
	<div>
	<heading id="headbt" class="status noline" data-status="bt"><i class="fa fa-bluetooth"></i>Bluetooth<i class="fa fa-code"></i><i id="btscan" class="fa fa-search"></i><?=$help?></heading>
	<ul id="listbt" class="entries"></ul>
	<span class="help-block hide">
			&bull; As sender / source - Send signal to another device.
		<br>&ensp; - Pairing - Turn on discovery mode on receiver device.
		<br>&ensp; - Search the device on RPi and connect.
		<br>&ensp; - Power on/off paired devices connect/disconnect automatically.
		<br>&bull; As receiver / sink - Receive signal from another device.
		<br>&emsp; - Pairing - If discoverable turned off on RPi, turn it on.
		<br>&emsp; - Make pairing/connecting from sender device. No authorization required.
		<br>&emsp; - Connection from sender start renderer mode automatically.
		<br>&emsp; - Turn off discoverable to hide from unpaired senders.
	</span>
	<pre id="codebt" class="hide"></pre>
	</div>
<?php }
	  if ( exec ( 'ifconfig | grep ^eth' ) ) { ?>
	 <div>
	<heading id="headlan" class="status noline" data-status="lan"><i class="fa fa-networks"></i>LAN<i id="lanadd" class="fa fa-plus-circle"></i><i class="fa fa-code"></i></heading>
	<ul id="listlan" class="entries"></ul>
	<pre id="codelan" class="hide"></pre>
	</div>
<?php }
	  if ( exec( 'ifconfig | grep ^wlan' ) ) { ?>
	<div>
	<heading id="headwl" class="status noline" data-status="wlan"><i class="fa fa-wifi"></i>Wi-Fi<i class="fa fa-code"></i><i id="wladd" class="fa fa-plus-circle"></i><i id="wlscan" class="fa fa-search"></i></heading>
	<ul id="listwl" class="entries"></ul>
	<pre id="codewlan" class="hide"></pre>
	</div>
	<div>
	<heading data-status="netctl" class="status noline">Saved Connections<i class="fa fa-code"></i></heading>
	<span class="help-block hide"><code>cat /etc/netctl/SSID</code></span>
	<ul id="listprofile" class="entries"></ul>
	<pre id="codenetctl" class="hide"></pre>
	</div>
<?php } ?>
	
	<div>
	<heading>Web User Interface<?=$help?></heading>
	<div id="divwebui" class="hide">
		<div class="col-l">URL</div>
		<div class="col-r">
			<gr>http://</gr><span id="ipwebui"></span><br>
			<div id="qrwebui" class="qr"></div>
			<span class="help-block hide">Scan QR code or use IP address to connect with web user interface.</span>
		</div>
	</div>
	</div>
</div>

<div id="divwifi" class="hide">
	<div>
	<heading class="noline">Wi-Fi
		<i id="add" class="fa fa-plus-circle"></i><i id="scanning-wifi" class="fa fa-wifi blink"></i>
		<?=$help?><i class="fa fa-arrow-left back"></i>
	</heading>
	<ul id="listwlscan" class="entries"></ul>
	<span class="help-block hide">Access points with less than -66dBm should not be used.</span>
	</div>
</div>

<div id="divbluetooth" class="hide">
	<heading class="noline">Bluetooth
		<i id="scanning-bt" class="fa fa-bluetooth blink"></i>
		<i class="fa fa-arrow-left back"></i>
	</heading>
	<ul id="listbtscan" class="entries"></ul>
</div>

	<?php if ( exec( 'systemctl -q is-active hostapd && echo 1 || echo 0' ) ) { ?>
<div id="divaccesspoint">
	<heading>RPi Access Point<i id="setting-accesspoint" class="fa fa-gear"></i><?=$help?></heading>
	<div id="boxqr" class="hide">
		<div class="col-l">Credential</div>
		<div class="col-r">
			<gr>SSID:</gr> <span id="ssid"></span><br>
			<gr>Password:</gr> <span id="passphrase"></span>
			<div id="qraccesspoint" class="qr"></div>
			<span class="help-block hide">Scan QR code or find the SSID and use the password to connect remote devices with RPi access point.</span>
		</div>
		<div class="col-l">Web UI</div>
		<div class="col-r">
			<gr>http://</gr><span id="ipwebuiap"></span>
			<div class="divqr">
				<div id="qrwebuiap" class="qr"></div>
			</div>
			<span class="help-block hide">Scan QR code or use the IP address to connect with web user interface with any browsers from remote devices.</span>
		</div>
	</div>
</div>
	<?php } ?>

<div style="clear: both"></div>
