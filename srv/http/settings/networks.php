<div id="divinterface">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'id'     => 'divbt'
	, 'status' => 'bluetooth'
	, 'button' => [ 'btscan', 'search wh' ]
] );
?>
	<ul id="listbt" class="entries"></ul>
	<pre id="codebluetooth" class="hide"></pre>
	<div class="help-block hide">
		As sender (to another device)
		<p>
			&bull; Pairing - Turn on discovery mode on receiver device.
		<br>&bull; Search the device on RPi and connect.
		<br>&bull; Power on/off paired devices connect/disconnect automatically.
		</p>
		As receiver (from another device)
		<p>
			&bull; Pairing - If discoverable turned off on RPi, turn it on.
		<br>&bull; Make pairing/connecting from sender device. No authorization required.
		<br>&bull; Connection from sender start renderer mode automatically.
		<br>&bull; Turn off discoverable to hide from unpaired senders.
		</p>
	</div>
<?php
htmlHead( [ //////////////////////////////////
	  'title'   => 'Wi-Fi'
	, 'id'      => 'divwl'
	, 'status'  => 'wlan'
	, 'button'  => [ 'wladd', 'plus-circle wh' ]
	, 'button1' => [ 'wlscan', 'search wh' ]
	, 'nohelp'  => true
] );
?>
	<ul id="listwl" class="entries"></ul>
	<pre id="codewlan" class="hide"></pre>
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'LAN'
	, 'id'     => 'divlan'
	, 'status' => 'lan'
	, 'button' => [ 'lanadd', 'plus-circle wh' ]
	, 'nohelp'  => true
] );
?>
	<ul id="listlan" class="entries"></ul>
	<pre id="codelan" class="hide"></pre>
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Web User Interface'
	, 'status' => 'avahi'
] );
?>
	<div id="divwebui" class="hide">
		<gr>http://</gr><span id="ipwebui"></span><br>
		<div id="qrwebui" class="qr"></div>
		<div class="help-block hide">Scan QR code or use IP address to connect with web user interface.</div>
	</div>
	<pre id="codeavahi" class="hide"></pre>
	</div>
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'id'     => 'divbluetooth'
	, 'hide'   => true
	, 'button' => [ 'scanning-bt', 'bluetooth blink' ]
	, 'back'   => true
	, 'nohelp' => true
] );
echo '
<ul id="listbtscan" class="entries"></ul>';
htmlHead( [ //////////////////////////////////
	  'title'  => 'Wi-Fi'
	, 'id'     => 'divwifi'
	, 'hide'   => true
	, 'button' => [ 'scanning-wifi', 'wifi blink' ]
	, 'back'   => true
	, 'help'   => <<<html
<div class="help-block hide">Access points with less than -66dBm should not be used.</div>
html
] );
echo '
<ul id="listwlscan" class="entries"></ul>';
htmlHead( [ //////////////////////////////////
	  'title'  => 'Access Point'
	, 'id'     => 'divaccesspoint'
	, 'hide'   => true
	, 'button' => [ 'setting-accesspoint', 'gear' ]
] );
?>
	<div id="boxqr" class="hide">
		<div class="col-l">
			<span id="ipwebuiap"></span>
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
			&bull; Scan QR code or find the SSID and use the password to connect remote devices with RPi access point.
		<br>&bull; Scan QR code or use the IP address to connect with web user interface with any browsers from remote devices.
	</div>
</div> <!-- last closing for no following htmlHead() -->

<div id="menu" class="menu hide">
<a class="connect"><i class="fa fa-check"></i>Connect</a>
<a class="disconnect"><i class="fa fa-times"></i>Disconnect</a>
<a class="edit"><i class="fa fa-edit-circle"></i>Edit</a>
<a class="forget"><i class="fa fa-minus-circle"></i>Forget</a>
</div>