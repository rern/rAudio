<?php
$hostname = getHostName();
$ip = getHostByName( $hostname );

$i2slist = json_decode( file_get_contents( '/srv/http/settings/system-i2s.json' ) );
$selecti2s = '<select id="i2smodule">
				<option value="none">None / Auto detect</option>';
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
if ( file_exists( '/srv/http/data/system/camilladsp' ) ) {
	$disabledbt = '<wh>DSP'.i( 'camilladsp' ).'</wh> is currently active.';
} else {
	$disabledbt = 'Bluetooth is currently connected.';
}

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
<?=( i( 'refresh' ) )?> <gr>Toggle refresh every 10 seconds.</gr>

CPU Load:
 • Average number of processes which are being executed and in waiting.
 • calculated over 1, 5 and 15 minutes.
 • Each one should not be constantly over 0.75 x CPU cores.
CPU temperature:
 • 80-84°C: ARM cores throttled.
 • 85°C: ARM cores and GPU throttled.
 • RPi 3B+: 60°C soft limit (optimized throttling)
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
	<div class="help-block hide">Icon context menu: Unmount / Re-mount / Forget / Info / Share

USB drives:
 • Will be found and mounted automatically.

Network shares:
 • Must be manually configured.
 • If mount failed, try in SSH terminal:
<pre>
mkdir -p "/mnt/MPD/NAS/<bll>NAME</bll>"
<gr># CIFS: (no user - username=guest, no password - password="")</gr>
mount -t cifs "//<bll>SERVER_IP</bll>/<bll>SHARENAME</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" \
      -o noauto,username=<bll>USER</bll>,password=<bll>PASSWORD</bll>,uid=<?=( exec( 'id -u mpd' ) )?>,gid=<?=( exec( 'id -g mpd' ) )?>,iocharset=utf8
<gr># NFS:</gr>
mount -t nfs "<bll>SERVER_IP</bll>:<bll>/SHARE/PATH</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" \
      -o defaults,noauto,bg,soft,timeo=5
</pre></div>
<pre id="codehddinfo" class="hide"></pre>
<?php
htmlSetting( [
	  'label'    => 'HDD Sleep'
	, 'id'       => 'hddsleep'
	, 'icon'     => 'screenoff'
	, 'disabled' => 'HDD not support sleep'
	, 'help'     => <<< HTML
Sleep timer for hard drives.
HTML
] );
htmlSetting( [
	  'label'    => 'Hotplug Update'
	, 'id'       => 'usbautoupdate'
	, 'sublabel' => 'USB drives data'
	, 'icon'     => 'refresh-library'
	, 'setting'  => false
	, 'help'     => <<< HTML
Auto update Library database on insert/remove USB drives.
HTML
] );
echo '</div>';
if ( file_exists( '/srv/http/data/shm/onboardwlan' ) ) {
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
		, 'status'   => 'bluetooth'
		, 'disabled' => $disabledbt
		, 'help'     => <<< HTML
I-gear-I <code>Sampling 16bit</code> - Only for Bluetooth receivers with fixed sampling
HTML
	]
	, [
		  'label'    => 'Wi-Fi'
		, 'id'       => 'wlan'
		, 'sublabel' => 'iw'
		, 'icon'     => 'wifi'
		, 'status'   => 'iw'
		, 'disabled' => 'Wi-Fi is currently connected.'
		, 'help'     => <<< HTML
I-gear-I Settings
 • Auto start Access Point - On failed connection or no router
 • Country of Wi-Fi regulatory domain:
	- 00 = Least common denominator settings, channels and transmit power are permitted in all countries.
	- The connected router may override it to a certain country.
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
<div id="divi2smodule">
	$selecti2s
	I-gear-I
</div>
HTML
	, 'help'     => <<< HTML
I²S DAC/audio HAT(Hardware Attached on Top) for high quality audio output.
 • HAT with EEPROM could be automatically detected.
	(See | I-player-I Player | Output | if it's already set as Output device.)
 • HAT with obsolete EEPROM - After select the HAT, disable I²S EEPROM read with I-gear-I next to it.
HTML
	]
	, [
		  'label'    => 'Character LCD'
		, 'id'       => 'lcdchar'
		, 'sublabel' => 'HD44780'
		, 'icon'     => 'lcdchar'
		, 'help'     => <<< HTML
<a class="img" data-name="lcdchar">LCD module</a> - display playback data
 • Support 16x2 and 20x4 LCD modules.
I-warning-I LCD with I²C backpack must be modified: <a class="img" data-name="i2cbackpack">5V to 3.3V I²C and 5V LCD</a>
HTML
	]
	, [
		  'label'    => 'Power Button'
		, 'id'       => 'powerbutton'
		, 'sublabel' => 'Power LED'
		, 'icon'     => 'power'
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
		, 'help'    => <<< HTML
<a class="img" data-name="relays">Relay module</a> - power on/off peripheral equipments
On/Off: <a class="menu-sub">I-plus-r-I System</a>I-relays sub-I
 • More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
 • Can be enabled and run as a test without a connected relay module.
HTML
	],
	[
		  'label'    => 'Rotary Encoder'
		, 'id'       => 'rotaryencoder'
		, 'icon'     => 'volume'
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
		, 'help'     => <<< HTML
<a class="img" data-name="mpdoled">OLED module</a> - display audio level spectrum
HTML
	]
	, [
		  'label'    => 'TFT 3.5" LCD'
		, 'id'       => 'lcd'
		, 'icon'     => 'lcd'
		, 'help'     => <<< HTML
<a class="img" data-name="lcd">TFT LCD module</a> with resistive touchscreen - local display
HTML
		, 'exist'    => file_exists( '/etc/systemd/system/localbrowser.service' )
	]
	, [
		  'label'   => 'VU LED'
		, 'id'      => 'vuled'
		, 'icon'    => 'led'
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
		  'label'   => 'Host Name'
		, 'id'      => 'hostname'
		, 'icon'    => 'plus-r'
		, 'input'   => '<input type="text" id="hostname" readonly>'
		, 'setting' => false
		, 'help'    => <<< HTML
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
		, 'setting'  => 'custom'
		, 'help'     => <<< HTML
I-gear-I Servers:
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
		, 'help'     => <<< HTML
Tweak kernel parameters for sound profiles.
HTML
	]
];
htmlSection( $head, $body );
$head = [ 'title' => 'Settings and Data' ]; //////////////////////////////////
$body = [
	[
		  'label'   => 'Backup'
		, 'id'      => 'backup'
		, 'icon'    => 'sd'
		, 'setting' => false
		, 'help'    => <<< HTML
Backup all settings and Library database:
 • Settings
 • Library database
 • Saved playlists
 • Bookmarks
 • Lyrics
 • Web Radio
HTML
	]
	, [
		  'label'   => 'Restore'
		, 'id'      => 'restore'
		, 'icon'    => 'restore'
		, 'setting' => 'custom'
		, 'help'    => <<< HTML
Restore all settings and Library database from a backup file. The system will reboot after finished.
HTML
	]
	, [
		  'label'    => 'Shared Data'
		, 'id'       => 'shareddata'
		, 'sublabel' => 'client'
		, 'icon'     => 'networks'
		, 'setting'  => 'custom'
		, 'disabled' => '<wh>Server rAudio'.i( 'rserver' ).'</wh> is currently active.'
		, 'help'     => <<< HTML
Connect share data as client for Library database, audio CD, bookmarks, lyrics, saved playlists and Web Radio.
 • <wh>rAudio as server:</wh>
	Server: | <wh>I-features-I Features</wh> | <wh>Server rAudio I-rserver-I</wh> | Enable
	Clients: | <wh>Shared Data I-networks-I</wh> | • rAudio > Server IP address
 • <wh>Other servers:</wh> 
	Server: Create a share for data with full permissions
		- Linux: NFS <code>777</code>, CIFS <code>read only = no</code>
		- Windows: <code>Everyone - Full Control</code> (Sharing + Security)
	Clients:
		- | <wh>Storage I-plus-circle-I</wh> | Add with the same name, share path/share name
		- | <wh>Shared Data I-networks-I</wh> | Add the created share on server
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
	$uihtml.= '<a href="'.$ui[ 2 ].'">'.$ui[ 0 ].'</a>';
	$uihtml.= '<p>'.$ui[ 1 ].'</p>';
}
$hdparmhide = !file_exists( '/usr/bin/hdparm' ) ? ' style="display: none"' : '';
$indexhtml = '';
for( $i = 'A'; $i !== 'AA'; $i++ ) {
	$indexhtml.= '<a>'.$i.'</a>';
	if ( $i === 'M' ) $indexhtml.= '<br class="brindex">';
}
?>
<div id="about" class="section">
	<a href="https://github.com/rern/rAudio-1/discussions"><img src="/assets/img/icon.svg" style="width: 40px"></a>
	<div id="logotext">rAudio
	<br><gr>by&emsp;r e r n</gr></div>
	
	<heading class="subhead">Back End</heading>
	<div class="list">
		<a href="https://www.archlinuxarm.org">Arch Linux Arm</a>
		<p>Arch Linux for ARM processors which aims for simplicity and full control to the end user.</p>
	</div>
	<div class="listtitle backend">P a c k a g e s :</i>
	<br><?=$indexhtml?></div>
	<div class="list"></div>
	
	<heading class="subhead">Front End</heading>
	<div class="list">
		<a href="https://whatwg.org">HTML</a>
		<p>Hypertext Markup Language for displaying documents in web browsers</p>
		<a href="https://www.w3.org/TR/CSS">CSS</a>
		<p>Cascading Style Sheets for describing the presentation of HTMLs</p>
		<a href="https://www.php.net">PHP</a>
		<p>PHP: Hypertext Preprocessor - A scripting language for web server side</p>
		<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">JavaScript</a>
		<p>A scripting language for working with HTML Document Object Model(DOM) on client side</p>
		<a href="https://jquery.com/">jQuery</a>
		<p>A JavaScript library for simplifying HTML DOM tree traversal and manipulation</p>
	</div>
	<div class="listtitle">P l u g i n s : <?=( i( 'chevron-down bl' ) )?></div>
	<div class="list hide"><?=$uihtml?></div>
	
	<heading class="subhead">Data</heading>
	<div class="list">
		<a href="https://www.last.fm">last.fm</a>
		<p>Coverarts and artist biographies</p>
		<a href="https://webservice.fanart.tv">fanart.tv</a>
		<p>Artist images and fallback coverarts</p>
		<a href="https://radioparadise.com">Radio Paradise</a> <a href="https://www.fip.fr/">Fip</a> <a href="https://www.francemusique.fr/">France Musique</a>
		<p>Coverarts for their own stations</p>
		<a href="http://gnudb.gnudb.org">GnuDB</a>
		<p>Audio CD</p>
	</div>
</div>

<div id="menu" class="menu hide">
<a class="info"<?=$hdparmhide?>><?=( i( 'info-circle' ) )?>Info</a>
<a class="forget"><?=( i( 'minus-circle' ) )?>Forget</a>
<a class="remount"><?=( i( 'check' ) )?>Re-mount</a>
<a class="unmount"><?=( i( 'times' ) )?>Unmount</a>
</div>
