<div id="divinterface"> <!-- ---------------------------------------------------- -->
<div id="divbt" class="section">
<?php
commonVariables( [
	  'buttons' => [ 'add', 'bluetooth', 'btsender', 'lan', 'search', 'wifi' ]
	, 'labels'  => [ 
		  [ 'Access Point', 'ap' ]
		, [ 'Bluetooth',    'bluetooth' ]
	]
	, 'tabs'    => [ 'features', 'system' ]
] );
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Bluetooth'
	, 'status' => 'bluez'
	, 'button' => 'search btscan'
	, 'help'   => $B_search.' Available devices'
] );
$html = <<< EOF
	<ul id="listbt" class="entries"></ul>
	<pre id="codebtinfo" class="status hide"></pre>
	<div class="helpblock hide">$B_bluetooth $B_btsender Context menu
	
<wh>rAudio as sender:</wh> (or pairing non-audio devices)
 • Pair:
	· On receiver: Turn on Discovery / Pairing mode
	· On rAudio: $B_search Scan to connect &raquo; Select to pair
 • Connect / Disconnect:
	· On receiver: Turn on / off
 • Playback controls with buttons:
	· Main - Play / Pause
	· Up / Down (long-press) - Previous / Next

<wh>rAudio as receiver:</wh>
 • Pair:
	· On rAudio: $T_system$L_bluetooth ■ Discoverable by senders
	· On sender: Search &raquo; Select <wh>rAudio</wh> to pair
	· Forget / remove should be done on both rAudio and sender
 • Connect / Disconnect:
	· On sender
</div>
EOF;
echo $html;
?>
</div>
<div id="divwl" class="section">
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Wi-Fi'
	, 'status' => 'wl'
	, 'button' => [ 'add wladd', 'search wlscan' ]
] );
?>
	<ul id="listwl" class="entries"></ul>
	<div class="helpblock hide"><?=$B_add?> Manual connect
<?=$B_search?> Available networks
<?=$B_wifi?> Context menu

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
	<ul id="listlan" class="entries"></ul>
	<div class="helpblock hide"><?=$B_add?> Manual connect
<?=$B_lan?> Context menu</div>
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
 • Access point setting: '.$T_features.$L_accesspoint.'

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
<div id="divbluetooth" class="section hide"> <!-- -------------------------------------------------------------- -->
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Bluetooth'
	, 'button' => 'bluetooth blink scanning-bt'
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listbtscan" class="entries scan"></ul>
</div>
<div id="divwifi" class="section hide">
<?php
// ----------------------------------------------------------------------------------
htmlHead( [
	  'title'  => 'Wi-Fi'
	, 'button' => 'wifi blink scanning-wifi'
	, 'back'   => true
	, 'nohelp' => true
] );
?>
<ul id="listwlscan" class="entries scan"></ul>
</div>

<?php
$menu = [
	  'connect'    => 'connect'
	, 'disconnect' => 'close'
	, 'edit'       => 'edit'
	, 'forget'     => 'remove'
	, 'rename'     => 'edit'
	, 'info'       => 'info'
];
$menuhtml = '';
foreach( $menu as $class => $icon ) $menuhtml.= '<a class="'.$class.'" tabindex="0">'.i( $icon ).ucfirst( $class ).'</a>';
?>
<div id="menu" class="menu hide"><?=$menuhtml?></div>
