<div id="divinterface"> <!-- ---------------------------------------------------- -->
<?php
commonVariables( [
	  'buttons' => [ 'add',   'ap',   'eye',      'bluetooth', 'btsender', 'eye',   'lan',   'next'
				   , 'pause', 'play', 'previous', 'search',    'stop',     'volume', 'wifi', 'wifi1' ]
	, 'labels'  => [ 
		  'Access Point' => 'ap'
		, 'Bluetooth'    => 'bluetooth'
	]
	, 'menus'   => []
	, 'tabs'    => [ 'features', 'playback' ]
] );
$hostname = '<c class="hostname">'.gethostname().'</c>';
// ----------------------------------------------------------------------------------
foreach( [ 'chevron-down', 'chevron-up', 'raudio', 'btreceiver', 'btsender' ] as $i ) ${'i_'.str_replace( '-', '', $i)} = icon( $i );
$updn     = '<c>'.$i_chevronup.'</c> <c>'.$i_chevrondown.'</c>';
$head     = [
	  'title'  => 'Bluetooth'
	, 'status' => 'bluez'
	, 'button' => [ 'search', 'eye' ]
	, 'list'   => true
	, 'help'   => <<< EOF
$B->search Available devices
$B->eye Discoverable
	
$i_btsender <a class="textdropdown wh">rAudio as sender:</a>
<div class="drop hide">
	 • Unpaired receiver:
		· On receiver: Turn on Discovery / Pairing mode
		· On rAudio: $B->search Scan &raquo; Select - Pair and connect
	 • Paired receiver:
		· On receiver: Turn on / off
		· On rAudio: Connect / Disconnect
</div><!--
-->$i_btreceiver <a class="textdropdown wh">rAudio as receiver:</a>
<div class="drop hide">
	 • Unpaired sender:
		· On rAudio: $B->eye &raquo; Enable Discoverable
		· On sender: Search &raquo; Select $hostname - Pair and connect
	 • Paired sender:
		· On sender: Select $hostname - Connect / Disconnect
		· On rAudio: Connect / Disconnect
</div>
$T->playback
$i_raudio rAudio:
	· $B->stop Stop - Disconnect
	· $B->volume Volume
$i_btreceiver Receiver buttons:
	· <c>&#x25C9;</c> » {$B->play}Play / {$B->pause}Pause
	· $updn » {$B->volume}Volume
	· $updn (long-press) » {$B->previous}Previous {$B->next}Next
$i_btsender Sender:
	· App controls

Note:
 · $i_btreceiver Non-audio devices can be connected as well.
 · $i_btsender Sender device:
	· Forget - Both must forget each oher before reconnect.
	· Volume displays <c>100</c> until an app is active.

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
