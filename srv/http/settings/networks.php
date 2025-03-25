<div id="divinterface"> <!-- ---------------------------------------------------- -->
<div id="divbluetooth" class="section">
<?php
commonVariables( [
	  'buttons' => [ 'add', 'bluetooth', 'btsender', 'lan', 'search', 'wifi' ]
	, 'labels'  => [ 
		  'Access Point' => 'ap'
		, 'Bluetooth'    => 'bluetooth'
	]
	, 'menus'   => []
	, 'tabs'    => [ 'features', 'system' ]
] );
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Bluetooth'
	, 'status' => 'bluez'
	, 'button' => 'search btscan'
	, 'help'   => $B->search.' Available devices'
] );
$html = <<< EOF
	<ul id="bluetooth" class="entries"></ul>
	<div class="helpblock hide">$B->bluetooth$B->btsender Context menu
	
<wh>rAudio as sender:</wh> (or pairing non-audio devices)
 • Pair:
	· On receiver: Turn on Discovery / Pairing mode
	· On rAudio: $B->search Scan to connect &raquo; Select to pair
 • Connect / Disconnect:
	· On receiver: Turn on / off
 • Playback controls with buttons:
	· Main - Play / Pause
	· Up / Down (long-press) - Previous / Next

<wh>rAudio as receiver:</wh>
 • Pair:
	· On rAudio: $T->system$L->bluetooth ■ Discoverable by senders
	· On sender: Search &raquo; Select <wh>rAudio</wh> to pair
	· Forget / remove should be done on both rAudio and sender
 • Connect / Disconnect:
	· On sender
</div>
EOF;
echo $html;
?>
</div>
<div id="divwlan" class="section">
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Wi-Fi'
	, 'status' => 'wl'
	, 'button' => [ 'add wladd', 'search wlscan' ]
] );
?>
	<ul id="wlan" class="entries"></ul>
	<div class="helpblock hide"><?=$B->add?> Manual connect
<?=$B->search?> Available networks
<?=$B->wifi?> Context menu

Note:
 · Avoid double quotes <c>"</c> in Wi-Fi name and password.
 · Access points with 1 bar icon <?=i( 'wifi1' )?> might be unstable.</div>
</div>
<div id="divlan" class="section">
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Wired LAN'
	, 'status' => 'lan'
	, 'button' => 'add lanadd'
] );
?>
	<ul id="lan" class="entries"></ul>
	<div class="helpblock hide"><?=$B->add?> Manual connect
<?=$B->lan?> Context menu</div>
</div>
</div>
<?php
$head = [ 'title'  => 'Web <a class="hideN">User </a>Interface' ];
$body = [
	  htmlSectionStatus(
		  'ap'
		, 'Access Point<br>Password'
		, '<div id="qrap"></div>
		   <div class="helpblock hide">Access rAudio directly without Wi-Fi router:
 • Connect <wh>Access Point</wh> with the password or scan QR code
 • Access point setting: '.$T->features.$L->accesspoint.'

Note: No internet connection.</div>'
	)
	, htmlSectionStatus(
		  'url'
		, 'Browser URL'
		, '<div id="qrurl"></div>
		   <div class="helpblock hide"> • Open <wh>URL</wh> with any web browsers or scan QR code</div>'
	)
];
htmlSection( $head, $body, 'webui' );
?>
<div id="divscanbluetooth" class="section hide"> <!-- -------------------------------------------------------------- -->
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Bluetooth'
	, 'button' => 'bluetooth blink scanning-bt'
	, 'back'   => true
] );
?>
<ul id="scanbluetooth" class="entries scan"></ul>
</div>
<div id="divscanwlan" class="section hide">
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Wi-Fi'
	, 'button' => 'wifi blink scanning-wifi'
	, 'back'   => true
] );
?>
<ul id="scanwlan" class="entries scan"></ul>
</div>

<?php
htmlMenu( [
	  'connect'    => 'connect'
	, 'disconnect' => 'close'
	, 'edit'       => 'edit'
	, 'forget'     => 'remove'
	, 'rename'     => 'edit'
	, 'info'       => 'info'
] );
