<div id="divinterface">
<?php if ( exec( 'systemctl -q is-active bluetooth && echo 1 || echo 0' ) ) { ?>
	<div>
	<heading id="headbt" class="status noline" data-status="bt">Bluetooth<?=$code?><i id="btscan" class="fa fa-search"></i><?=$help?></heading>
	<pre id="codebt" class="hide"></pre>
	<ul id="listbt" class="entries"></ul>
	<span <?=$classhelp?>>
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
	</div>
<?php }
	  if ( exec ( 'ifconfig | grep ^eth' ) ) { ?>
	<heading id="headlan" class="status noline" data-status="lan">LAN<i id="lanadd" class="fa fa-plus-circle"></i><?=$code?></heading>
	<pre id="codelan" class="hide"></pre>
	<ul id="listlan" class="entries"></ul>
<?php }
	  if ( exec( 'ifconfig | grep ^wlan' ) ) { ?>
	<heading id="headwl" class="status noline" data-status="wlan">Wi-Fi<?=$code?><i id="wladd" class="fa fa-plus-circle"></i><i id="wlscan" class="fa fa-search"></i></heading>
	<pre id="codewlan" class="hide"></pre>
	<ul id="listwl" class="entries"></ul>
<?php } ?>
	
	<div>
	<heading class="status" data-status="avahi">Web User Interface<?=$code?><?=$help?></heading>
	<pre id="codeavahi" class="hide"></pre>
	<div id="divwebui" class="hide">
		<gr>http://</gr><span id="ipwebui"></span><br>
		<div id="qrwebui" class="qr"></div>
		<span <?=$classhelp?>>Scan QR code or use IP address to connect with web user interface.</span>
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
	<span <?=$classhelp?>>Access points with less than -66dBm should not be used.</span>
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
	<heading>rAudio Access Point<i id="setting-accesspoint" class="fa fa-gear"></i><?=$help?></heading>
	<div id="boxqr" class="hide">
		<div class="col-l">
			<br>
			<gr>http://</gr><span id="ipwebuiap"></span>
			<div class="divqr">
				<div id="qrwebuiap" class="qr"></div>
			</div>
		</div>
		<div class="col-r">
			<gr>SSID:</gr> <span id="ssid"></span><br>
			<gr>Password:</gr> <span id="passphrase"></span>
			<div id="qraccesspoint" class="qr"></div>
		</div>
	</div>
	<span <?=$classhelp?>>
			&bull; Scan QR code or find the SSID and use the password to connect remote devices with RPi access point.
		<br>&bull; Scan QR code or use the IP address to connect with web user interface with any browsers from remote devices.
	</span>
</div>
	<?php } ?>
