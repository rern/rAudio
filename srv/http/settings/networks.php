<div id="divinterface"> <!-- ---------------------------------------------------- -->
<div id="divbt" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'status' => 'btcontroller'
	, 'button' => [ 'btscan' => 'search' ]
] );
?>
	<ul id="listbt" class="entries"></ul>
	<pre id="codebluetooth" class="status hide"></pre>
	<div class="help-block hide"><wh>rAudio as sender:</wh>&ensp;<i>(or pairing non-audio devices)</i>
 • Pair:
	- On receiver - Turn on <code>discovery</code> / <code>pairing</code> mode
	- On rAudio - Bluetooth &nbsp;<?=( i( 'search wh' ) )?>Search > Select to pair
 • Connect:
	- On receiver - <code>power on</code> / <code>power off</code> > <code>connect</code> / <code>disconnect</code>
	- Receiver buttons can be used to control playback

<wh>rAudio as receiver:</wh>
 • Pair:
	- On rAudio - System > Bluetooth setting - enable <code>Discoverable by senders</code>
	- On sender - Search > Select rAudio to pair
	- <code>Forget</code> / <code>Remove</code> should be done on both rAudio and sender
 • Connect:
	- On sender - Select rAudio > <code>connect</code> / <code>disconnect</code>
</div>
</div>
<div id="divwl" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'   => 'Wi-Fi'
	, 'status'  => 'wlan'
	, 'button'  => [ 'wladd' => 'plus-circle', 'wlscan' => 'search' ]
] );
?>
	<ul id="listwl" class="entries"></ul>
	<div class="help-block hide">
 • Connect: Wi-Fi &nbsp;<?=( i( 'search wh' ) )?>Search > Select to connect
 • Avoid connecting to access points which signal is less than 2 bars.
</div>
</div>
<div id="divlan" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'LAN'
	, 'status' => 'lan'
	, 'button' => [ 'lanadd' => 'plus-circle wh' ]
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
	<div class="help-block hide">Use IP address or scan QR code to connect with web user interface.</div>
</div>
<div id="divaccesspoint" class="section hide">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Access Point'
	, 'button' => [ 'setting-accesspoint' => 'gear' ]
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
<div style="clear:both"></div>
</div>
<div id="divbluetooth" class="section hide"> <!-- -------------------------------------------------------------- -->
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'button' => [ 'scanning-bt' => 'bluetooth blink' ]
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
	, 'button' => [ 'scanning-wifi' => 'wifi blink' ]
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listwlscan" class="entries"></ul>
</div>

<div id="menu" class="menu hide">
<a class="connect"><?=( i( 'check' ) )?>Connect</a>
<a class="disconnect"><?=( i( 'times' ) )?>Disconnect</a>
<a class="edit"><?=( i( 'edit-circle' ) )?>Edit</a>
<a class="forget"><?=( i( 'minus-circle' ) )?>Forget</a>
<a class="info"><?=( i( 'info-circle' ) )?>Info</a>
</div>