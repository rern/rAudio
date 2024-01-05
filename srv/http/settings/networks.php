<div id="divinterface"> <!-- ---------------------------------------------------- -->
<div id="divbt" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'status' => 'bluez'
	, 'button' => [ 'search btscan' ]
	, 'help'   => i( 'search btn' ).' Available devices'
] );
$html = <<< EOF
	<ul id="listbt" class="entries"></ul>
	<pre id="codebluetoothlist" class="status hide"></pre>
	<div class="helpblock hide">{$Fi( 'bluetooth btn' )} {$Fi( 'btsender btn' )} Context menu
	
<wh>rAudio as sender:</wh> (or pairing non-audio devices)
 • Pair:
	· On receiver: Turn on Discovery / Pairing mode
	· On rAudio: {$Fi( 'search btn' )} Scan to connect &raquo; Select to pair
 • Connect:
	· On receiver: Power on / Power off &raquo; Connect / Disconnect
	· Receiver buttons can be used to control playback

<wh>rAudio as receiver:</wh>
 • Pair:
	· On rAudio: {$Ftab( 'system' )}{$FlabelIcon( 'Bluetooth', 'bluetooth' )} ■ Discoverable by senders
	· On sender: Search &raquo; Select <wh>rAudio</wh> to pair
	· Forget / remove should be done on both rAudio and sender
 • Connect:
	· On sender: Select rAudio &raquo; Connect / Disconnect
</div>
EOF;
echo $html;
?>
</div>
<div id="divwl" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Wi-Fi'
	, 'status' => 'wl'
	, 'button' => [ 'add wladd', 'search wlscan' ]
] );
?>
	<ul id="listwl" class="entries"></ul>
	<div class="helpblock hide"><?=i( 'add btn' )?> Manual connect
<?=i( 'search btn' )?> Available networks
<?=i( 'wifi btn' )?> Context menu

Note:
 · Avoid double quotes <c>"</c> in Wi-Fi name and password.
 · Access points with 1 bar icon <?=i( 'wifi1' )?> might be unstable.</div>
</div>
<div id="divlan" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'LAN'
	, 'status' => 'lan'
	, 'button' => [ 'add wh lanadd' ]
] );
?>
	<ul id="listlan" class="entries"></ul>
	<div class="helpblock hide"><?=i( 'lan btn' )?> Context menu</div>
</div>
</div>
<div id="divwebui" class="section hide"> <!-- ------------------------------------------------------------ -->
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Web <a class="hideN">User </a>Interface'
	, 'status' => 'webui'
] );
?>
	<gr>http://</gr><span id="ipwebui"></span>
	<div id="qrwebui" class="qr"></div>
	<div class="helpblock hide">Use IP address / URL or scan QR code to connect with web user interface.</div>
</div>
<div id="divaccesspoint" class="section hide">
<?php
htmlHead( [ //////////////////////////////////
	  'title' => 'Access Point'
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
	<div class="helpblock hide">
• Scan QR code or find the SSID and use the password to connect remote devices with RPi access point.
• Scan QR code or use the IP address to connect with web user interface with any browsers from remote devices.
• Access point setting: <?=( tab( 'features', 'Features' ).labelIcon( 'Access Point', 'hostapd' ) )?>
</div>
<div style="clear:both"></div>
</div>
<div id="divbluetooth" class="section hide"> <!-- -------------------------------------------------------------- -->
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Bluetooth'
	, 'button' => [ 'bluetooth blink scanning-bt' ]
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listbtscan" class="entries scan"></ul>
</div>
<div id="divwifi" class="section hide">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Wi-Fi'
	, 'button' => [ 'wifi blink scanning-wifi' ]
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listwlscan" class="entries scan"></ul>
</div>

<div id="menu" class="menu hide">
<a class="connect"><?=i( 'connect' )?>Connect</a>
<a class="disconnect"><?=i( 'close' )?>Disconnect</a>
<a class="edit"><?=i( 'edit' )?>Edit</a>
<a class="forget"><?=i( 'remove' )?>Forget</a>
<a class="info"><?=i( 'info' )?>Info</a>
</div>