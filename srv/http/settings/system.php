<?php
$i2slist = json_decode( file_get_contents( '/srv/http/settings/system-i2s.json' ) );
$selecti2s = '<select id="i2smodule">';
foreach( $i2slist as $name => $sysname ) {
	$selecti2s.= '<option value="'.$sysname.'">'.$name.'</option>';
}
$selecti2s.= '</select>';
$timezonelist = timezone_identifiers_list();
$selecttimezone = '<select id="timezone">';
foreach( $timezonelist as $key => $zone ) {
	$datetime = new DateTime( 'now', new DateTimeZone( $zone ) );
	$offset = $datetime->format( 'P' );
	$zonename = preg_replace( [ '/_/', '/\//' ], [ ' ', ' <gr>&middot;</gr> ' ], $zone );
	$selecttimezone.= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>';
}
$selecttimezone.= '</select>';

echo '
<div id="gpiosvg" class="hide">';
include 'assets/img/gpio.svg';
echo '
</div>
<div class="section">';
htmlHead( [ //////////////////////////////////
	  'title'  => 'System'
	, 'status' => 'system'
	, 'button' => [ 'power' => 'power' ]
	, 'nohelp' => true
] );
?>
	<div id="systemlabel" class="col-l text gr">
			Version
		<br>Kernel
		<br>Hardware
		<br>SoC
		<br>CPU
	</div>
	<div id="systemvalue" class="col-r text"></div> 
	<div style="clear:both"></div>
	<pre id="codesystem" class="hide"></pre>
</div>
<div class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Status'
	, 'status' => 'journalctl'
	, 'button' => [ 'refresh' => 'refresh' ]
] );
?>
	<div id="statuslabel" class="col-l text gr">
			CPU Load
		<br>CPU Temp<wide>erature</wide></span>
		<br>Time
		<br>Up Time
		<br>Boot Duration
	</div>
	<div id="status" class="col-r text"></div>
	<div style="clear:both"></div>
	<div class="help-block hide">
<i class="fa fa-refresh"></i> <gr>Toggle refresh every 10 seconds.</gr>

CPU Load:
 • Average number of processes which are being executed and in waiting.
 • calculated over 1, 5 and 15 minutes.
 • Each one should not be constantly over 0.75 x CPU cores.
CPU temperature:
 • 80-84°C: ARM cores throttled.
 • 85°C: ARM cores and GPU throttled.
 • RPi 3B+: 60°C soft limit (optimized throttling)
<i class="fa fa-warning"></i> Under-voltage warning (if any):
 • occurred - Happenned.
 • currently detected - Currently under minimum limit - system is unstable.
</div>
</div>
<div class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Storage'
	, 'status' => 'mount'
	, 'button' => [ 'addnas' => 'plus-circle' ]
] );
?>
	<ul id="list" class="entries" data-ip="<?=$_SERVER['SERVER_ADDR']?>"></ul>
	<div class="help-block hide">Context menu: Unmount / Re-mount / Forget / Info / Spindown

Available sources, local USB and NAS mounts, for Library.
 • USB drives will be found and mounted automatically.
 • Network shares must be manually configured.
 • If mount failed, try in SSH terminal:
<pre>
mkdir -p "/mnt/MPD/NAS/<bll>NAME</bll>"
<gr># CIFS:</gr>
mount -t cifs "//<bll>IP</bll>/<bll>SHARENAME</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" \
      -o noauto,username=<bll>USER</bll>,password=<bll>PASSWORD</bll>,uid=<?=( exec( 'id -u mpd' ) )?>,gid=<?=( exec( 'id -g mpd' ) )?>,iocharset=utf8
<gr># NFS:</gr>
mount -t nfs "<bll>IP</bll>:<bll>/SHARE/PATH</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" \
      -o defaults,noauto,bg,soft,timeo=5
</pre></div>
<pre id="codehddinfo" class="hide"></pre>
<?php
htmlSetting( [
		  'label'    => 'Auto Update'
		, 'id'       => 'usbautoupdate'
		, 'sublabel' => 'USB Drives'
		, 'icon'     => 'refresh-library'
		, 'help'     => <<< HTML
Auto update Library database on insert / remove USB drives.
HTML
	] );
echo '</div>';
$rev = substr( exec( "awk '/Revision/ {print \$NF}' /proc/cpuinfo" ), -3, 2 );
if ( in_array( $rev, [ '08', '0c', '0d', '0e', '11', '12' ] ) ) {
// ----------------------------------------------------------------------------------
$head = [ //////////////////////////////////
	  'title'  => 'On-board Wireless'
	, 'status' => 'rfkill'
];
$body = [
	[
		  'label'    => 'Bluetooth'
		, 'id'       => 'bluetooth'
		, 'sublabel' => 'bluetoothctl'
		, 'icon'     => 'bluetooth'
		, 'status'   => 'bluetoothctl'
		, 'setting'  => true
		, 'disabled' => ( file_exists( '/srv/http/data/system/camilladsp' ) ? 'DSP is currently active.' : 'Bluetooth is currently connected.' )
		, 'help'     => <<< HTML
<i class="fa fa-gear"></i><code>Sampling 16bit</code> - Only for Bluetooth receivers with fixed sampling
 • Pairing:&emsp;<i class="fa fa-networks"></i>Networks > Bluetooth&ensp;<i class="fa fa-search wh"></i>
 • Button on device can be used for play/pause
HTML
	]
	, [
		  'label'    => 'Wi-Fi'
		, 'id'       => 'wlan'
		, 'sublabel' => 'iw'
		, 'icon'     => 'wifi'
		, 'status'   => 'iw'
		, 'setting'  => true
		, 'disabled' => 'Wi-Fi is currently connected.'
		, 'help'     => <<< HTML
Auto start Access Point - On failed connection or no router
Country of Wi-Fi regulatory domain:
 • 00 = Least common denominator settings, channels and transmit power are permitted in all countries.
 • The connected router may override it to a certain country.
HTML
	]
];
htmlSection( $head, $body );
// ----------------------------------------------------------------------------------
}
$head = [ //////////////////////////////////
	  'title'  => 'GPIO Devices'
];
$body = [
	[
		  'label'    => 'Audio - I²S'
		, 'icon'     => 'i2saudio'
		, 'input'    => <<< HTML
<div id="divi2smodulesw">
	<input id="i2smodulesw" type="checkbox">
	<div class="switchlabel" for="i2smodulesw"></div>
</div>
<div id="divi2smodule">$selecti2s</div>
HTML
	, 'help'     => <<< HTML
I²S DAC for better quality of audio output.
HTML
	]
	, [
		  'label'    => 'Character LCD'
		, 'id'       => 'lcdchar'
		, 'sublabel' => 'HD44780'
		, 'icon'     => 'lcdchar'
		, 'setting'  => true
		, 'help'     => <<< HTML
<a class="img" data-name="lcdchar">LCD module</a> - display playback data
 • Support 16x2 and 20x4 LCD modules.
<i class="fa fa-warning"></i> LCD with I²C backpack must be modified: <a class="img" data-name="i2cbackpack">5V to 3.3V I²C and 5V LCD</a>
HTML
	]
	, [
		  'label'    => 'Power Button'
		, 'id'       => 'powerbutton'
		, 'sublabel' => 'Power LED'
		, 'icon'     => 'power'
		, 'setting'  => true
		, 'help'     => <<< HTML
<a class="img" data-name="powerbutton">Power button and LED</a> - power on/off rAudio
 • On - Fixed to pin 5
 • Off - Default to pin 5 (single pin on+off)
If pin 5 is used by DAC or LCD - Set 2 unused pins for:
 • Off (default: 7)
 • Reserved (default: 29)
HTML
	]
	, [
		  'label'   => 'Relay Module'
		, 'id'      => 'relays'
		, 'icon'    => 'relays'
		, 'setting' => true
		, 'help'    => <<< HTML
<a class="img" data-name="relays">Relay module</a> - power on/off peripheral equipments
On/Off: &ensp;<i class="fa fa-plus-r"></i>System <gr>|</gr>&ensp;<i class="fa fa-relays wh"></i>
 • More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
 • Can be enabled and run as a test without a connected relay module.
HTML
	],
	[
		  'label'    => 'Rotary Encoder'
		, 'id'       => 'rotaryencoder'
		, 'icon'     => 'volume'
		, 'setting'  => true
		, 'help'     => <<< HTML
<a class="img" data-name="rotaryencoder">Rotary encoder</a> for:
 • Turn volume up/down
 • Push to play/pause
HTML
	]
	,[
		  'label'    => 'Spectrum OLED'
		, 'id'       => 'mpdoled'
		, 'icon'     => 'mpdoled'
		, 'setting'  => true
		, 'help'     => <<< HTML
<a class="img" data-name="mpdoled">OLED module</a> - display audio level spectrum
HTML
	]
	, [
		  'label'    => 'TFT 3.5" LCD'
		, 'id'       => 'lcd'
		, 'icon'     => 'lcd'
		, 'setting'  => true
		, 'help'     => <<< HTML
<a class="img" data-name="lcd">TFT LCD module</a> with resistive touchscreen - local display
HTML
		, 'exist'    => file_exists( '/etc/systemd/system/localbrowser.service' )
	]
	, [
		  'label'   => 'VU LED'
		, 'id'      => 'vuled'
		, 'icon'    => 'led'
		, 'setting' => true
		, 'help'    => <<< HTML
<a class="img" data-name="vuled">7 LEDs</a> - display audio level
 • <bl id="ledcalc">LED resister calculator</bl>
HTML
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Environment' ]; //////////////////////////////////
$body = [
	[
		  'label' => 'Host Name'
		, 'id'    => 'hostname'
		, 'icon'  => 'plus-r'
		, 'input' => '<input type="text" id="hostname" readonly>'
		, 'help'  => <<< HTML
For:
 • Access point, AirPlay, Bluetooth, SnapCast, Spotify, UPnP
 • Web Interface URL: <code id="avahiurl"></code>
 • System hostname
HTML
	]
	, [
		  'label'    => 'Time Zone'
		, 'id'       => 'timezone'
		, 'sublabel' => 'timedatectl'
		, 'icon'     => 'globe'
		, 'status'   => 'timedatectl'
		, 'input'    => $selecttimezone
		, 'setting'  => 'self'
		, 'help'     => <<< HTML
<i class="fa fa-gear"></i>Servers:
 • NTP: For time sync
 • Package mirror: For system upgrade <code>pacman -Syu</code>
HTML
	]
	, [
		  'label'    => 'Sound Profile'
		, 'id'       => 'soundprofile'
		, 'sublabel' => 'sysctl'
		, 'icon'     => 'soundprofile'
		, 'status'   => 'soundprofile'
		, 'setting'  => true
		, 'help'     => <<< HTML
Tweak kernel parameters for sound profiles.
HTML
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Settings and Data' ]; //////////////////////////////////
$body = [
	[
		  'label'    => 'Shared Data'
		, 'id'       => 'shareddata'
		, 'setting'  => 'none'
		, 'help'     => <<< HTML
Share data for multiple rAudios: audio CD, bookmarks, lyrics, Library database, saved playlists and WebRadios stations. 
 • SSH passwords must be default.
 • Music files should be on NAS only.
 • On file server, setup a network share with all permissions
 &emsp; • NFS: <code>777</code> / <code>a+rwx</code>
 &emsp; • Samba: <code>read only = no</code>
 &emsp; • Windows: <code>Everyone - Full Control</code>
 • On each rAudio
  &emsp; • Storage > <i class="fa fa-plus-circle"></i> Add to connect shared music on the server
  &emsp; • Shared Data - Enable to connect the share.
 • <code>Use data from this rAudio</code>:
 &emsp; • Check only on rAudio with data to be used or to overwrite existing.
 &emsp; • Leave unchecked to use existing data on the server.
HTML
	]
	, [
		  'label'   => 'Backup'
		, 'id'      => 'backup'
		, 'icon'    => 'sd'
		, 'setting' => 'none'
		, 'help'    => <<< HTML
Backup all settings and Library database:
 • Settings
 • Library database
 • Saved playlists
 • Bookmarks
 • Lyrics
 • WebRadios
HTML
	]
	, [
		  'label'   => 'Restore'
		, 'id'      => 'restore'
		, 'icon'    => 'restore'
		, 'setting' => 'none'
		, 'help'    => <<< HTML
Restore all settings and Library database from a backup file. The system will reboot after finished.
HTML
	]
];
htmlSection( $head, $body );
$listui = [
	[
	    'HTML5-Color-Picker'
	  , 'A scaleable color picker implemented using HTML5'
	  , 'https://github.com/NC22/HTML5-Color-Picker'
	],[
	    'Inconsolata font'
	  , 'A monospace font designed for printed code listings and the like'
	  , 'https://fonts.google.com/specimen/Inconsolata'
	],[
	    'jQuery Selectric'
	  , 'A plugin for easy manipulation and customization of HTML selects'
	  , 'https://github.com/lcdsantos/jQuery-Selectric'
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
	  , 'https://github.com/hodgef/simple-keyboard/'
	],[
	    'Sortable'
	  , 'Reorderable drag-and-drop lists'
	  , 'https://github.com/SortableJS/Sortable'
	]
];
$uihtml = '';
foreach( $listui as $ui ) {
	$uihtml.= '<code>'.$ui[ 0 ].'</code>';
	$uihtml.= '<br> &emsp; '.$ui[ 1 ];
	$uihtml.= $localhost ? '' : '<br> &emsp; <a href="'.$ui[ 2 ].'" target="_blank">'.$ui[ 2 ].'</a><br>';
}
$version = file_get_contents( '/srv/http/data/system/version' );
$hdparmhide = !file_exists( '/usr/bin/hdparm' ) ? ' style="display: none"' : '';
$indexhtml = '';
for( $i = 'A'; $i !== 'AA'; $i++ ) $indexhtml.= '<a>'.$i.'</a>';
?>
<div id="about" class="section">
	<heading>About</heading>
	<i class="fa fa-plus-r fa-lg"></i>&ensp;<a href="https://github.com/rern/rAudio-<?=$version?>/discussions">r A u d i o&emsp;<?=$version?></a>
	<br>by&emsp;r e r n
	
	
	<heading class="sub">Back End</heading>
		• <a href="https://www.archlinuxarm.org" target="_blank">Arch Linux Arm</a>
	<br>• <span class="listtitle backend">Packages:&ensp;<i class="fa fa-chevron-up bl hide"></i>
	<br><?=$indexhtml?></span>
	<div class="list gr hide"></div>
	
	<heading class="sub">Front End</heading>
		• <a href="https://whatwg.org" target="_blank">HTML</a>
	<br>• <a href="https://www.w3.org/TR/CSS" target="_blank">CSS</a>
	<br>• <a href="https://www.php.net" target="_blank">PHP</a>
	<br>• <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">JavaScript</a>
	<br>• <a href="https://jquery.com/" target="_blank">jQuery</a>
	<br>• <span class="listtitle">Plugins:&ensp;<i class="fa fa-chevron-down bl"></i></span>
	<div class="list gr hide"><?=$uihtml?></div>
	
	<heading class="sub">Data</heading>
		• <a href="https://www.last.fm">last.fm</a> - Coverarts and artist biographies
	<br>• <a href="https://webservice.fanart.tv">fanart.tv</a> - Artist images and fallback coverarts
	<br>• <a href="https://radioparadise.com">Radio Paradise</a>, <a href="https://www.fip.fr/">Fip</a>, <a href="https://www.francemusique.fr/">France Musique</a> - Coverarts for their own stations
	<br>• <a href="http://gnudb.gnudb.org">GnuDB</a> - Audio CD data
</div>

<div id="menu" class="menu hide">
<a class="unmount"><i class="fa fa-times"></i>Unmount</a>
<a class="remount"><i class="fa fa-check"></i>Re-mount</a>
<a class="forget"><i class="fa fa-minus-circle"></i>Forget</a>
<a class="info"<?=$hdparmhide?>><i class="fa fa-info-circle"></i>Info</a>
<a class="spindown"<?=$hdparmhide?>><i class="fa fa-screenoff"></i>Spindown</a>
</div>
