<?php
$hostname       = getHostName();
$ip             = getHostByName( $hostname );

$i2slist        = json_decode( file_get_contents( '/srv/http/assets/data/system-i2s.json' ) );
$selecti2s      = '<select id="i2smodule">'
				 .'<option value="none">None / Auto detect</option>';
foreach( $i2slist as $name => $sysname ) {
	$selecti2s .= '<option value="'.$sysname.'">'.$name.'</option>';
}
$selecti2s     .= '</select>';
$timezonelist   = timezone_identifiers_list();
$selecttimezone = '<select id="timezone">';
foreach( $timezonelist as $key => $zone ) {
	$datetime       = new DateTime( 'now', new DateTimeZone( $zone ) );
	$offset         = $datetime->format( 'P' );
	$zonename       = preg_replace( [ '/_/', '/\//' ], [ ' ', ' <gr>&middot;</gr> ' ], $zone );
	$selecttimezone.= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>';
}
$selecttimezone.= '</select>';
?>
<div id="gpiosvg" class="hide">
<?php include 'assets/img/gpio.svg';?>
</div>
<div id="divsystem" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'System'
	, 'status' => 'system'
	, 'button' => [ 'power' => 'power' ]
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
	<div class="helpblock hide"><?=i( 'power btn' )?> Power</div>
	<pre id="codesystem" class="hide"></pre>
</div>
<div id="divstatus" class="section">
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
	</div>
	<div id="status" class="col-r text"></div>
	<div style="clear:both"></div>
	<div class="helpblock hide">
<?=i( 'refresh btn' )?> Refresh every 10 seconds

<wh>• CPU Load:</wh>
 · Average number of processes which are being executed and in waiting.
 · calculated over 1, 5 and 15 minutes.
 · Each one should not be constantly over 0.75 x CPU cores.
 
<wh>• CPU temperature:</wh>
 · 80-84°C: ARM cores throttled.
 · 85°C: ARM cores and GPU throttled.
 · RPi 3B+: 60°C soft limit (optimized throttling)
</div>
</div>
<div id="divstorage" class="section">
<?php
htmlHead( [ //////////////////////////////////
	  'title'  => 'Storage'
	, 'status' => 'mount'
	, 'button' => [ 'addnas' => 'plus-circle' ]
] );
?>
	<ul id="list" class="entries" data-ip="<?=$_SERVER['SERVER_ADDR']?>"></ul>
	<div class="helpblock hide">
<?=( i( 'usbdrive btn' ).' '.i( 'networks btn' ).' Context menu
'.i( 'plus-circle btn' ).' Add network storage')?>
<wh>USB drives:</wh> Will be found and mounted automatically.

<wh>Network shares:</wh> If <?=i( 'plus-circle btn' )?> Add network storage failed, try SSH terminal: (replace <cy>YELLOW</cy> with actual values)
<wh>• CIFS:</wh>
<pre>
mkdir -p "/mnt/MPD/NAS/<yl>NAME</yl>"
mount -t cifs "//<yl>SERVER_IP</yl>/<yl>SHARENAME</yl>" "/mnt/MPD/NAS/<yl>NAME</yl>" \
      -o noauto,username=<yl>USER</yl>,password=<yl>PASSWORD</yl>,uid=<?=( exec( 'id -u mpd' ) )?>,gid=<?=( exec( 'id -g mpd' ) )?>,iocharset=utf8
<gr>#	 (no user - username=guest, no password - password="")</gr>
</pre><!--
--><wh>• NFS:</wh>
<pre>
mkdir -p "/mnt/MPD/NAS/<yl>NAME</yl>"
mount -t nfs "<yl>SERVER_IP</yl>:<yl>/SHARE/PATH</yl>" "/mnt/MPD/NAS/<yl>NAME</yl>" \
      -o defaults,noauto,bg,soft,timeo=5
</pre></div>
<pre id="codehddinfo" class="hide"></pre>
<?php
htmlSetting( [
	  'label'    => 'Hard Drive Sleep'
	, 'id'       => 'hddsleep'
	, 'disabled' => 'HDD not support sleep'
	, 'help'     => 'Sleep timer for USB hard drives.'
] );
htmlSetting( [
	  'label'    => 'Hotplug Update'
	, 'sublabel' => 'data on USB'
	, 'id'       => 'usbautoupdate'
	, 'setting'  => false
	, 'disabled' => 'js'
	, 'help'     => 'Auto update Library database on insert/remove USB drives.'
] );
echo '</div>';
if ( file_exists( '/srv/http/data/shm/onboardwlan' ) ) {
// ----------------------------------------------------------------------------------
$head = [ //////////////////////////////////
	  'title'  => 'On-board Devices'
	, 'status' => 'rfkill'
];
$body = [
	[
		  'label'    => 'Audio'
		, 'id'       => 'audio'
		, 'setting'  => false
		, 'disabled' => 'No other audio devices available.'
		, 'help'     => <<< EOF
 · For 3.5mm jack and HDMI audio output
 · Should not be disabled if there's no other DAC permanently installed.
EOF
	]
	, [
		  'label'    => 'Bluetooth'
		, 'sublabel' => 'bluetoothctl'
		, 'id'       => 'bluetooth'
		, 'status'   => true
		, 'help'     => i( 'gear btn' ).' ■ Sampling 16bit - Only for Bluetooth receivers with fixed sampling'
	]
	, [
		  'label'    => 'HDMI Hotplug'
		, 'id'       => 'hdmi'
		, 'setting'  => false
		, 'help'     => 'Force enable HDMI without connecting before boot'
	]
	, [
		  'label'    => 'Wi-Fi'
		, 'sublabel' => 'iw'
		, 'id'       => 'wlan'
		, 'status'   => true
		, 'disabled' => 'js'
		, 'help'     => <<< EOF
{$Fi( 'gear btn' )}
Country of Wi-Fi regulatory domain:
	· <code>00</code> Least common denominator settings, channels and transmit power are permitted in all countries.
	· The connected router may override it to a certain country.
■ Auto start Access Point - On failed connection or no router
EOF
	]
];
htmlSection( $head, $body, 'onboard' );
// ----------------------------------------------------------------------------------
}
$head = [ //////////////////////////////////
	  'title'  => 'GPIO Devices'
];
$body = [
	[
		  'html'    => <<< EOF
<div id="divi2s">
	<div class="col-l single">Audio - I²S<i class="fa fa-i2smodule"></i></div>
	<div class="col-r">
	<div id="divi2smodulesw">
		<input id="i2smodulesw" type="checkbox">
		<div class="switchlabel" for="i2smodulesw"></div>
	</div>
	<div id="divi2smodule">
		$selecti2s
	</div>
	<i id="setting-i2smodule" class="fa fa-gear setting"></i>
	<span class="helpblock hide">{$Fi( 'gear btn' )} Option to disable I²S EEPROM read for HAT with obsolete EEPROM

	I²S DAC/audio HAT(Hardware Attached on Top) for audio output.
	 · HAT with EEPROM could be automatically detected.
	 · See  if it's already set: {$Fmenu( 'player', 'Player' )}<lbl>Output</lbl> <lbl>Device</lbl>
	</span>
</div>
EOF
	]
	, [
		  'label'    => 'Character LCD'
		, 'sublabel' => 'HD44780'
		, 'id'       => 'lcdchar'
		, 'help'     => <<< EOF
<a class="img" data-name="lcdchar">LCD module</a> - display playback data
 · Support 16x2 and 20x4 LCD modules.
 · {$Fi( 'warning yl' )} LCD with I²C backpack must be modified: <a class="img" data-name="i2cbackpack">5V to 3.3V I²C and 5V LCD</a>
EOF
	]
	, [
		  'label'    => 'Power Button'
		, 'sublabel' => 'Power LED'
		, 'id'       => 'powerbutton'
		, 'help'     => <<< EOF
<a class="img" data-name="powerbutton">Power button and LED</a> - power on/off rAudio
 · On - Fixed to pin <code>5</code>
 · Off - Default: pin <code>5</code> (single pin on+off)
 
If pin <code>5</code> is used by DAC or LCD, set 2 unused pins for:
 · Off - Default: pin <code>7</code>
 · Reserved - Default: pin <code>29</code>
EOF
	]
	, [
		  'label'   => 'Relay Module'
		, 'id'      => 'relays'
		, 'help'    => <<< EOF
<a class="img" data-name="relays">Relay module</a> - power on/off peripheral equipments
On/Off: {$Fmenu( 'raudio', 'System', 'relays' )}
 · More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
 · Can be enabled and run as a test without a connected relay module.
EOF
	],
	[
		  'label'    => 'Rotary Encoder'
		, 'id'       => 'rotaryencoder'
		, 'help'     => <<< EOF
<a class="img" data-name="rotaryencoder">Rotary encoder</a> for:
 · Turn volume up/down
 · Push to play/pause
EOF
	]
	,[
		  'label'    => 'Spectrum OLED'
		, 'id'       => 'mpdoled'
		, 'help'     => '<a class="img" data-name="mpdoled">OLED module</a> - display audio level spectrum'
	]
	, [
		  'label'    => 'TFT 3.5" LCD'
		, 'id'       => 'lcd'
		, 'help'     => '<a class="img" data-name="lcd">TFT LCD module</a> with resistive touchscreen - local display'
		, 'exist'    => file_exists( '/etc/systemd/system/localbrowser.service' )
	]
	, [
		  'label'   => 'VU LED'
		, 'id'      => 'vuled'
		, 'help'    => <<< EOF
<a class="img" data-name="vuled">7 LEDs</a> - display audio level
 · <bl id="ledcalc">LED resister calculator</bl>
EOF
	]
];
htmlSection( $head, $body, 'gpio' );
$head = [ 'title' => 'Environment' ]; //////////////////////////////////
$body = [
	[
		  'label'   => 'Player Name'
		, 'id'      => 'hostname'
		, 'input'   => '<input type="text" id="hostname" readonly>'
		, 'setting' => false
		, 'help'    => <<< EOF
For:
 · Access point, AirPlay, Bluetooth, SnapCast, Spotify, UPnP
 · Web Interface URL: <c id="avahiurl"></c>
 · System hostname
EOF
	]
	, [
		  'label'    => 'Time Zone'
		, 'sublabel' => 'timedatectl'
		, 'id'       => 'timezone'
		, 'status'   => true
		, 'input'    => $selecttimezone
		, 'setting'  => 'custom'
		, 'help'     => i( 'gear btn' ).' Servers for time sync and package mirror'
	]
	, [
		  'label'    => 'Sound Profile'
		, 'sublabel' => 'sysctl'
		, 'id'       => 'soundprofile'
		, 'status'   => true
		, 'help'     => 'Tweak kernel parameters for sound profiles.'
	]
];
htmlSection( $head, $body, 'environment' );
$head = [ 'title' => 'Data and Settings' ]; //////////////////////////////////
$body = [
	[
		  'label'   => 'Backup'
		, 'id'      => 'backup'
		, 'setting' => 'nobanner'
		, 'help'    => <<< EOF
Backup all data and settings:
 · Library: Database, Bookmarks, DAB Radio, Web Radio
 · Playback: Lyrics
 · Playlist: Audio CD, Saved playlists
 · Settings
EOF
	]
	, [
		  'label'   => 'Restore'
		, 'id'      => 'restore'
		, 'setting' => 'nobanner'
		, 'help'    => <<< EOF
 · Restore all data and settings from a backup file.
 · Reset to default - Reset everything except Wi-Fi connection and custom LAN
EOF
	]
	, [
		  'label'    => 'Shared Data'
		, 'sublabel' => 'client'
		, 'id'       => 'shareddata'
		, 'setting'  => 'custom'
		, 'disabled' => nameIcon( 'Server rAudio', 'rserver' ).' is currently active.'
		, 'help'     => <<< EOF
Connect shared data as client for:
	· Library database
	· Data - Audio CD, bookmarks, lyrics, saved playlists and Web Radio
	· Display order of Library home
	
Note:
 · SSH password must be default.
 · {$Fi( 'microsd btn' )} SD and {$Fi( 'usbdrive btn' )} USB will be hidden in Library home

 • <wh>rAudio as server:</wh> (Alternative 1)
	Server: {$Fmenu( 'features', 'Features' )}{$FnameIcon( 'Server rAudio', 'rserver' )}
	Clients: {$FnameIcon( 'Shared Data', 'networks' )} ● rAudio
	
 • <wh>Other servers:</wh> (Alternative 2)
	Server: Create a share for data with full permissions
		· Linux:
			NFS: <c>777</c>
			CIFS/SMB: <c>read only = no</c>
		· Windows:
			Right-click Folder &#9656; Properties &#9656; 
				<btn>Sharing</btn> &#9656; <btn>Advanced Sharing...</btn> &#9656; <btn>Permissions</btn>
					Everyone - Full Control
				<btn>Security</btn>
					Everyone - Full Control
	Clients:
		· {$FnameIcon( 'Shared Data', 'networks' )} Add the created share
		· Data on 1st connected client will be used as initial shared.
EOF
	]
];
htmlSection( $head, $body, 'dataandsettings' );
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
$uihtml = '';
foreach( $listui as $ui ) {
	$uihtml.= '<a href="'.$ui[ 2 ].'">'.$ui[ 0 ].'</a>';
	$uihtml.= '<p>'.$ui[ 1 ].'</p>';
}
$hdparmhide = ! file_exists( '/usr/bin/hdparm' ) ? ' style="display: none"' : '';
$indexhtml = '';
for( $i = 'A'; $i !== 'AA'; $i++ ) {
	$indexhtml.= '<a>'.$i.'</a>';
	if ( $i === 'M' ) $indexhtml.= '<br class="brindex">';
}
?>
<div id="divabout" class="section">
	<a href="https://github.com/rern/rAudio-1/discussions"><img src="/assets/img/icon.svg" style="width: 40px"></a>
	<div id="logotext">rAudio
	<br><gr>by&emsp;r e r n</gr></div>
	
	<heading class="subhead">Back End</heading>
	<div class="list">
		<a href="https://www.archlinuxarm.org">Arch Linux Arm</a>
		<p>Arch Linux for ARM processors which aims for simplicity and full control to the end user.</p>
	</div>
	<div class="listtitle backend">Packages:</i>
	<br><?=$indexhtml?></div>
	<div class="list"></div>
	
	<heading class="subhead">Front End</heading>
	<div class="list">
		<a href="https://www.php.net">PHP</a>
		<p>PHP: Hypertext Preprocessor - A scripting language for web server side</p>
		<a href="https://whatwg.org">HTML</a>
		<p>Hypertext Markup Language for displaying documents in web browsers</p>
		<a href="https://www.w3.org/TR/CSS">CSS</a>
		<p>Cascading Style Sheets for describing the presentation of HTMLs</p>
		<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">JavaScript</a>
		<p>A scripting language for working with HTML Document Object Model(DOM) on client side</p>
		<a href="https://jquery.com/">jQuery</a>
		<p>A JavaScript library for simplifying HTML DOM tree traversal and manipulation</p>
	</div>
	<div class="listtitle">Javascript Plugins: <?=i( 'chevron-down bl' )?></div>
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
<a class="info"<?=$hdparmhide?>><?=i( 'info-circle' )?>Info</a>
<a class="forget"><?=i( 'minus-circle' )?>Forget</a>
<a class="remount"><?=i( 'check' )?>Re-mount</a>
<a class="unmount"><?=i( 'close' )?>Unmount</a>
</div>
