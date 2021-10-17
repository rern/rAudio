<div id="divinterface"> <!-- ---------------------------------------------------- -->
<div id="divbt" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'button' => [ 'btscan', 'search wh' ]
] );
?>
	<ul id="listbt" class="entries"></ul>
	<div class="help-block hide">As sender (to another device)
 • Pairing - Turn on discovery mode on receiver device.
 • Search the device on RPi and connect.
 • Power on/off paired devices connect/disconnect automatically.
As receiver (from another device)
 • Pairing - If discoverable turned off on RPi, turn it on.
 • Pairing / Connecting from sender device - No authorization required.
 • Connection from sender start Playback in renderer mode automatically.
 • Turn off discoverable to hide from unpaired senders.
</div>
</div>
<div id="divwl" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'   => 'Wi-Fi'
	, 'status'  => 'wlan'
	, 'button'  => [ 'wladd', 'plus-circle wh' ]
	, 'button1' => [ 'wlscan', 'search wh' ]
] );
?>
	<ul id="listwl" class="entries"></ul>
	<div class="help-block hide">Access points with less than -66dBm should not be used.
</div>
</div>
<div id="divlan" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'LAN'
	, 'status' => 'lan'
	, 'button' => [ 'lanadd', 'plus-circle wh' ]
	, 'nohelp'  => true
] );
?>
	<ul id="listlan" class="entries"></ul>
</div>
</div>
<div id="divwebui" class="section hide"> <!-- ------------------------------------------------------------ -->
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Web User Interface'
	, 'status' => 'avahi'
] );
?>
	<gr>http://</gr><span id="ipwebui"></span>
	<div id="qrwebui" class="qr"></div>
	<div class="help-block hide">
Scan QR code or use IP address to connect with web user interface.
</div>
</div>
<div id="divaccesspoint" class="section hide">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Access Point'
	, 'button' => [ 'setting-accesspoint', 'gear' ]
] );
?>
	<div id="boxqr" class="hide">
		<div class="col-l">
			<span id="ipwebuiap" class="gr"></span>
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
	<div class="help-block hide">
• Scan QR code or find the SSID and use the password to connect remote devices with RPi access point.
• Scan QR code or use the IP address to connect with web user interface with any browsers from remote devices.
</div>
</div>
<div id="divbluetooth" class="section hide"> <!-- -------------------------------------------------------------- -->
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'button' => [ 'scanning-bt', 'bluetooth blink' ]
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listbtscan" class="entries"></ul>
</div>
<div id="divwifi" class="section hide">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Wi-Fi'
	, 'button' => [ 'scanning-wifi', 'wifi blink' ]
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listwlscan" class="entries"></ul>
</div>

<div id="menu" class="menu hide">
<a class="connect"><i class="fa fa-check"></i>Connect</a>
<a class="disconnect"><i class="fa fa-times"></i>Disconnect</a>
<a class="edit"><i class="fa fa-edit-circle"></i>Edit</a>
<a class="forget"><i class="fa fa-minus-circle"></i>Forget</a>
</div>