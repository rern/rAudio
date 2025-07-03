<div id="divinterface"> <!-- ---------------------------------------------------- -->
<?php
commonVariables( [
	  'buttons' => [ 'add', 'ap', 'bluetooth', 'btsender', 'lan', 'search', 'wifi', 'wifi1' ]
	, 'labels'  => [ 
		  'Access Point' => 'ap'
		, 'Bluetooth'    => 'bluetooth'
	]
	, 'menus'   => []
	, 'tabs'    => [ 'features', 'system' ]
] );
// ----------------------------------------------------------------------------------
$head = [
	  'title'  => 'Bluetooth'
	, 'status' => 'bluez'
	, 'button' => 'search'
	, 'list'   => true
	, 'help'   => <<< EOF
$B->search Available devices
	
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
 • Connect / Disconnect:
	· On sender
	
Note:
Forget / remove should be done on both rAudio and sender

$B->bluetooth$B->btsender Context menu
EOF
];
$body = [ '<ul id="bluetooth" class="entries"></ul>' ];
htmlSection( $head, $body, 'bluetooth' );
// ----------------------------------------------------------------------------------
$head = [
	  'title'  => 'Wi-Fi'
	, 'status' => 'wl'
	, 'button' => [ 'add wladd', 'search' ]
	, 'list'   => true
	, 'help'   => <<< EOF
$B->add Manual connect
$B->search Available networks

Note:
 · Avoid double quotes <c>"</c> in Wi-Fi name and password.
 · Access points with 1 bar $B->wifi1 might be unstable.

$B->wifi$B->ap Context menu
EOF
];
$body = [ '<ul id="wlan" class="entries"></ul>' ];
htmlSection( $head, $body, 'wlan' );
// ----------------------------------------------------------------------------------
$head = [
	  'title'  => 'Wired LAN'
	, 'status' => 'lan'
	, 'button' => 'add lanadd'
	, 'list'   => true
	, 'help'   => <<< EOF
$B->add Manual connect
$B->lan Context menu
EOF
];
$body = [ '<ul id="lan" class="entries"></ul>' ];
htmlSection( $head, $body, 'lan' );
// ----------------------------------------------------------------------------------
?>
</div>
<?php
// ----------------------------------------------------------------------------------
$head = [
	  'title'  => 'Bluetooth'
	, 'button' => 'bluetooth'
	, 'back'   => true
];
$body = [ '<ul id="scanbluetooth" class="entries scan"></ul>' ];
htmlSection( $head, $body, 'scanbluetooth', 'divscan hide' );
// ----------------------------------------------------------------------------------
$head = [
	  'title'  => 'Wi-Fi'
	, 'button' => 'wifi'
	, 'back'   => true
];
$body = [ '<ul id="scanwlan" class="entries scan"></ul>' ];
htmlSection( $head, $body, 'scanwlan', 'divscan hide' );
// ----------------------------------------------------------------------------------
$head = [ 'title'  => 'Web <a class="hideN">User </a>Interface' ];
$body = [
	  htmlSectionStatus(
		  'ap'
		, 'Access Point<br>Password'
		, '<div id="qrap" class="qr"></div>
		   <div class="helpblock hide">Access rAudio directly without Wi-Fi router:
 · Connect <wh>Access Point</wh> with the password or scan QR code
 · Access point setting: '.$T->features.$L->accesspoint.'

Note: No internet connection.</div>'
	)
	, htmlSectionStatus(
		  'url'
		, 'Browser URL'
		, '<div id="qrurl" class="qr"></div>
		   <div class="helpblock hide"> • Open <wh>URL</wh> with any web browsers or scan QR code</div>'
	)
];
htmlSection( $head, $body, 'webui' );
// ----------------------------------------------------------------------------------
htmlMenu( [ 'connect', 'disconnect', 'edit', 'forget', 'rename', 'info' ] );
