<div id="gpiosvg" class="hide"><?php include 'assets/img/gpio.svg';?></div>
<?php
$onboardwlan = file_exists( '/srv/http/data/shm/onboardwlan' ) ? 'true' : 'x';
$id_data     = [
	  'audio'         => [ 'label' => 'Audio',             'sub' => 'aplay',       'setting' => false,    'status' => true ]
	, 'backup'        => [ 'label' => 'Backup',                                    'setting' => 'none' ]
	, 'bluetooth'     => [ 'label' => 'Bluetooth',         'sub' => 'bluetoothctl',                       'status' => true, 'exist' => $onboardwlan ]
	, 'hostname'      => [ 'label' => 'Player Name',                               'setting' => 'none' ]
	, 'i2smodule'     => [ 'label' => 'Audio - I²S',       'sub' => 'HAT' ]
	, 'i2s'           => [ 'label' => 'Audio - I²S',       'sub' => 'HAT',         'setting' => 'custom' ]
	, 'lcdchar'       => [ 'label' => 'Character LCD',     'sub' => 'RPLCD' ]
	, 'mpdoled'       => [ 'label' => 'Spectrum OLED',     'sub' => 'mpd_oled' ]
	, 'powerbutton'   => [ 'label' => 'Power Button',      'sub' => 'Wiring Pi' ]
	, 'relays'        => [ 'label' => 'Relay Module',      'sub' => 'Wiring Pi' ]
	, 'restore'       => [ 'label' => 'Restore',                                   'setting' => 'none' ]
	, 'rotaryencoder' => [ 'label' => 'Rotary Encoder',    'sub' => 'evtest' ]
	, 'shareddata'    => [ 'label' => 'Shared Data',       'sub' => 'Client',      'setting' => 'custom' ]
	, 'soundprofile'  => [ 'label' => 'Sound Profile' ]
	, 'tft'           => [ 'label' => 'TFT 3.5" LCD',      'sub' => 'Xorg',                                                 'exist' => 'firefox' ]
	, 'timezone'      => [ 'label' => 'Time Zone',         'sub' => 'timedatectl', 'setting' => 'custom', 'status' => true ]
	, 'vuled'         => [ 'label' => 'VU LED',            'sub' => 'cava' ]
	, 'wlan'          => [ 'label' => 'Wi-Fi',             'sub' => 'iw',                                 'status' => true, 'exist' => $onboardwlan ]
];
commonVariables( [
	  'buttons' => [ 'add', 'gear', 'microsd', 'networks', 'power', 'refresh', 'usbdrive' ]
	, 'labels'  => [
		  [ 'Bluetooth',     'bluetooth' ]
		, [ 'Device' ]
		, [ 'Output' ]
		, [ 'Server rAudio', 'rserver' ]
		, [ 'Shared Data',   'networks' ]
		, [ 'Storage' ]
	]
	, 'menus'   => [
		  [ 'library', 'Library', 'refresh-library' ]
		, [ 'raudio',  'System',  'relays' ]
	]
	, 'tabs'    => [ 'features', 'player' ]
] );
// ----------------------------------------------------------------------------------
$head        = [
	  'title'  => 'System'
	, 'status' => 'system'
	, 'button' => 'power power'
	, 'help'   => $B_power.' Power'
];
$labels      = 'Version
	<br>Kernel
	<br>Hardware
	<br>SoC
	<br>CPU';
$body        = [ htmlSectionStatus( 'system', $labels ) ];
htmlSection( $head, $body, 'system' );

$head        = [
	  'title'  => 'Status'
	, 'status' => 'status'
	, 'button' => 'refresh refresh'
	, 'help'   => $B_refresh.' Refresh every 10 seconds'
];
$labels      = 'CPU Load
	<br>CPU Temp<wide>erature</wide></span>
	<br>Available Memory
	<br>Time
	<br>Up Time';
$help        = '<wh>• CPU Load:</wh>
 · Average number of processes which are being executed and in waiting.
 · calculated over 1, 5 and 15 minutes.
 · Each one should not be constantly over 0.75 x CPU cores.';
$body        = [ htmlSectionStatus( 'status', $labels, '', $help ) ];
htmlSection( $head, $body, 'status' );
// ----------------------------------------------------------------------------------
$uid         = exec( 'id -u mpd' );
$gid         = exec( 'id -g mpd' );
$head        = [
	  'title'  => 'Storage'
	, 'status' => 'storage'
	, 'button' => 'add addnas'
	, 'help'   => <<< EOF
$B_add Add network storage

 · USB drives  Will be found and mounted automatically.
 · Commands used by $B_add Add network storage:
<pre class="gr">
mkdir -p "/mnt/MPD/NAS/<wh>NAME</wh>" <g># NAME "data": reserved for Shared Data</g>

<g># CIFS: no user - username=guest, no password - password=""</g>
mount -t cifs "//<wh>SERVER_IP</wh>/<wh>SHARENAME</wh>" "/mnt/MPD/NAS/<wh>NAME</wh>" \
      -o noauto,username=<wh>USER</wh>,password=<wh>PASSWORD</wh>,uid=$uid,gid=$gid,iocharset=utf8

<g># NFS:</g>
mount -t nfs "<wh>SERVER_IP</wh>:<wh>/SHARE/PATH</wh>" "/mnt/MPD/NAS/<wh>NAME</wh>" \
      -o defaults,noauto,bg,soft,timeo=5
</pre> · Windows shares without password: <c>net user guest /active:yes</c>
EOF
];
$body        = [ <<< EOF
<ul id="list" class="entries"></ul>
<div class="helpblock hide">Path: <c>/mnt/MPD/...</c>
$B_microsd $B_usbdrive $B_networks Context menu</div>
<pre id="codestorageinfo" class="norefresh status hide"></pre>
EOF ];
htmlSection( $head, $body, 'storage' );
// ----------------------------------------------------------------------------------
$head        = [ 'title'  => 'On-board Devices' ];
$body        = [
	[
		  'id'       => 'audio'
		, 'disabled' => 'No other audio devices available.'
		, 'help'     => <<< EOF
 · For 3.5mm jack and HDMI audio output
 · Should not be disabled if there's no other DAC permanently installed.
EOF
	]
	, [
		  'id'       => 'bluetooth'
		, 'disabled' => $L_bluetooth.' is currently connected.'
		, 'help'     => <<< EOF
$B_gear
■ Sampling 16bit - Bluetooth receivers with fixed sampling
EOF
	]
	, [
		  'id'       => 'wlan'
		, 'disabled' => 'js'
		, 'help'     => <<< EOF
$B_gear
Country of Wi-Fi regulatory domain:
	· <c>00</c> Least common denominator settings, channels and transmit power are permitted in all countries.
	· The connected router may override it to a certain country.
■ Auto start Access Point - On failed connection or no router
EOF
	]
];
htmlSection( $head, $body, 'onboard' );
// ----------------------------------------------------------------------------------
$helpi2s     = <<< EOF
I²S DAC/audio HAT(Hardware Attached on Top) for audio output.
 · HAT with EEPROM could be automatically detected.
 · See  if it's already set: $T_player$L_device
$B_gear
Option to disable I²S EEPROM read for HAT with obsolete EEPROM
EOF;
$head        = [ 'title' => 'GPIO Devices' ];
$body        = [
	  [
		  'id'       => 'i2s'
		, 'help'     => $helpi2s
	]
	, [
		  'id'       => 'i2smodule'
		, 'input'    => '<select id="i2smodule"></select>'
		, 'help'     => $helpi2s
	]
	, [
		  'id'       => 'lcdchar'
		, 'help'     => <<< EOF
<a class="img" data-name="lcdchar">LCD module</a> - display playback data on 16x2 / 20x4 LCD modules.
EOF
	]
	, [
		  'id'       => 'powerbutton'
		, 'help'     => <<< EOF
<a class="img" data-name="powerbutton">Power button and LED</a> - power on/off rAudio
$B_gear
 · On - Fixed to pin <c>5</c>
 · Off - Default: pin <c>5</c> (single pin on+off)
EOF
	]
	, [
		  'id'       => 'relays'
		, 'help'     => <<< EOF
<a class="img" data-name="relays">Relay module</a> - power on/off peripheral equipments
 · Module with jumper <c>High/Low Level Trigger</c> (set to <c>High</c>)
 · Can be enabled and run as a test without a connected relay module.
 · More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
On/Off:
 · $M_relays
 · $B_gear <btn>Sequence</btn> $B_power On / $B_power Off &emsp;<btn>Pin - Name</btn> $B_power
EOF
	],
	[
		  'id'       => 'rotaryencoder'
		, 'help'     => <<< EOF
<a class="img" data-name="rotaryencoder">Rotary encoder</a> for:
 · Turn volume up/down
 · Push to play/pause
EOF
	]
	,[
		  'id'       => 'mpdoled'
		, 'help'     => '<a class="img" data-name="mpdoled">OLED module</a> - display audio level spectrum'
	]
	, [
		  'id'       => 'tft'
		, 'help'     => '<a class="img" data-name="lcd">TFT LCD module</a> with resistive touchscreen - local display'
	]
	, [
		  'id'       => 'vuled'
		, 'help'     => <<< EOF
<a class="img" data-name="vuled">LEDs</a> - display audio level
 · <bl id="ledcalc">LED resister calculator</bl>
 · $B_gear $B_power On / Off
EOF
	]
];
htmlSection( $head, $body, 'gpio' );
// ----------------------------------------------------------------------------------
$head        = [ 'title' => 'Environment' ];
$body        = [
	[
		  'id'       => 'hostname'
		, 'input'    => '<input type="text" id="hostname" readonly>'
		, 'help'     => <<< EOF
For:
 · Access point, AirPlay, Bluetooth, SnapCast, Spotify, UPnP
 · Web Interface URL: <c id="avahiurl"></c>
 · System hostname
EOF
	]
	, [
		  'id'       => 'timezone'
		, 'input'    => 'timezone'
		, 'help'     => <<< EOF
$B_gear
Servers for time sync and package mirror
EOF
	]
	, [
		  'id'       => 'soundprofile'
		, 'help'     => <<< EOF
Tweak kernel parameters to improve sound quality.
$B_gear
Swapiness (default: <c>60</c>)
	· Balance between swap disk vs system memory cache
	· Low - less swap
Maximum Transmission Unit (default: <c>1500</c> bytes)
	· Maximum size of one packet that can be transmitted in a network
	· High - less overhead more efficiency
	· Low - less delay
Transmit Queue Length (default: <c>1000</c>)
	· Number of packets allowed per kernel transmit queue in a network
	· High - improve performance under high load
EOF
	]
];
htmlSection( $head, $body, 'environment' );
// ----------------------------------------------------------------------------------
$head        = [ 'title' => 'Data and Settings' ];
$body        = [
	[
		  'id'       => 'backup'
		, 'help'     => <<< EOF
Backup all data and settings:
 · Library: Database, Bookmarks, DAB Radio, Web Radio
 · Playback: Lyrics
 · Playlist: Audio CD, Saved playlists
 · Settings
EOF
	]
	, [
		  'id'       => 'restore'
		, 'help'     => <<< EOF
 · Restore all data and settings from a backup file.
 · Reset to default - Reset everything except Wi-Fi connection and custom LAN
EOF
	]
	, [
		  'id'       => 'shareddata'
		, 'disabled' => $L_serverraudio.' is currently active.'
		, 'help'     => <<< EOF
Connect shared data as client for:
 · Library database
 · Data: Audio CD, bookmarks, lyrics, saved playlists and Web Radio
 · Display: Item toggles and order of Library home

Note:
 • Enabled - $B_microsd SD and $B_usbdrive USB:
	 · Moved to <c>/mnt/SD</c> and <c>/mnt/USB</c>
	 · Not availble in Library home

 • <wh>rAudio as server:</wh> (Alternative 1)
	Server: $T_features$L_serverraudio
	Clients: $L_shareddata <btn>{$I( 'rserver' )} rAudio</btn>
	
 • <wh>Other servers:</wh> (Alternative 2)
	Server: Create shares for music <c>source</c> and <c>data</c>
	 · Linux permissions:
		NFS: <c>777</c>
		CIFS (SMB): <c>read only = no</c>
	 · Windows:
		Right-click Folder &raquo; Properties &raquo; 
		- <btn>Sharing</btn> &raquo; <btn>Advanced Sharing...</btn> &raquo; <btn>Permissions</btn> <c>Everyone</c> - <c>Full Control</c>
		- <btn>Security</btn> <c>Everyone</c> - <c>Full Control</c>
	Clients:
	 · 1st client:
		- $L_storage $B_add Add <c>source</c>
		- $M_refreshlibrary Update database
		- $L_shareddata Connect <c>data</c>
		- Local data will be transfered to <c>data</c>
	 · Other clients:
		- $L_shareddata Connect <c>data</c>
		- <c>source</c> will be connected accordingly
EOF
	]
];
htmlSection( $head, $body, 'datasetting' );
// ----------------------------------------------------------------------------------
$listui      = [
	[
	    'D3'
	  , 'Library for bespoke data visualization'
	  , 'https://d3js.org/'
	],[
	    'HTML5-Color-Picker'
	  , 'A scaleable color picker implemented using HTML5'
	  , 'https://github.com/NC22/HTML5-Color-Picker'
	],[
	    'Inconsolata font'
	  , 'A monospace font designed for printed code listings and the like'
	  , 'https://fonts.google.com/specimen/Inconsolata'
	],[
	    'Lato-Fonts'
	  , 'A san-serif typeface family'
	  , 'http://www.latofonts.com/lato-free-fonts'
	],[
	    'lazysizes'
	  , 'Lazy loader for images'
	  , 'https://github.com/aFarkas/lazysizes'
	],[
	    'pica'
	  , 'Resize image in browser with high quality and high speed'
	  , 'https://github.com/nodeca/pica'
	],[
	    'Plotly'
	  , 'Graphing Library'
	  , 'https://plotly.com/javascript/'
	],[
	    'QR Code generator'
	  , 'QR Code generator'
	  , 'https://github.com/datalog/qrcode-svg'
	],[
	    'roundSlider'
	  , 'A plugin that allows the user to select a value or range of values.'
	  , 'https://github.com/soundar24/roundSlider'
	],[
	    'simple-keyboard'
	  , 'Virtual Keyboard'
	  , 'https://github.com/hodgef/simple-keyboard'
	],[
	    'Select2'
	  , 'A replacement for select boxes'
	  , 'https://github.com/select2/select2'
	],[
	    'Sortable'
	  , 'Reorderable drag-and-drop lists'
	  , 'https://github.com/SortableJS/Sortable'
	]
];
$uihtml      = '';
foreach( $listui as $ui ) {
	$uihtml.= '<a href="'.$ui[ 2 ].'">'.$ui[ 0 ].'</a> · '.$ui[ 1 ].'<br>';
}
$indexhtml   = '';
for( $i = 'A'; $i !== 'AA'; $i++ ) $indexhtml.= '<a>'.$i.'</a>';
$menu        = [
	  'info'    => 'info'
	, 'forget'  => 'remove'
	, 'remount' => 'connect'
	, 'sleep'   => 'screenoff'
	, 'unmount' => 'close'
];
$menuhtml    = '';
foreach( $menu as $class => $icon ) $menuhtml.= '<a class="'.$class.'" tabindex="0">'.i( $icon ).ucfirst( $class ).'</a>';
?>
<div id="divabout" class="section">
	<a href="https://github.com/rern/rAudio/discussions" tabindex="-1"><img src="/assets/img/icon.svg<?=$hash?>" style="width: 40px"></a>
	<div id="logotext">rAudio
	<br><gr>b y&emsp;r e r n</gr></div>
	
	<heading class="subhead">Back End</heading>
	<div class="list">
		<a href="https://www.archlinuxarm.org">Arch Linux Arm</a> · Arch Linux for ARM processors
	</div>
	<div class="listtitle backend">Packages: <?=$indexhtml?></div>
	<div class="list"></div>
	
	<heading class="subhead">Front End</heading>
	<div class="list">
		<a href="https://www.w3.org/TR/CSS">CSS</a> · Cascading Style Sheets for describing the presentation of HTMLs<br>
		<a href="https://whatwg.org">HTML</a> · Hypertext Markup Language for displaying documents in web browsers<br>
		<a href="https://nginx.org/en/">nginx</a> · HTTP and reverse proxy, a mail proxy, and a generic TCP/UDP proxy server<br>
		<a href="https://www.php.net">PHP</a> · PHP: Hypertext Preprocessor - A scripting language for web server side<br>
		<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">JavaScript</a> · A scripting language for working with HTML Document Object Model on client side<br>
		<a href="https://jquery.com/">jQuery</a> · A JavaScript library for simplifying HTML DOM tree traversal and manipulation
	</div>
	<div class="listtitle jsplugins">Javascript Plugins:</div>
	<div class="list hide"><?=$uihtml?></div>
	
	<heading class="subhead">Data</heading>
	<div class="list">
		<a href="https://www.last.fm">last.fm</a> · Coverarts and artist biographies<br>
		<a href="https://webservice.fanart.tv">fanart.tv</a> · Artist images and fallback coverarts<br>
		<a href="https://radioparadise.com">Radio Paradise</a> <a href="https://www.fip.fr/">Fip</a> <a href="https://www.francemusique.fr/">France Musique</a> · Coverarts for their own stations<br>
		<a href="http://gnudb.gnudb.org">GnuDB</a> · Audio CD track list<br>
	</div>
</div>

<div id="menu" class="menu hide"><?=$menuhtml?></div>
