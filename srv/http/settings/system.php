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
	$selecttimezone.= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>\n';
}
$selecttimezone.= '</select>';
?>
<heading data-status="journalctl" class="status">System<?=$istatus?></heading>
<div id="systemlabel" class="col-l text gr">
		Version
	<br>Kernel
	<br>Hardware
	<br>SoC
	<br>CPU
</div>
<div id="systemvalue" class="col-r text"></div> 
<div style="clear:both"></div>
<pre id="codejournalctl" class="hide"></pre>

<div>
<heading>Status<i id="refresh" class="fa fa-refresh"></i><?=$ihelp?></heading>
<div id="statuslabel" class="col-l text gr">
		CPU Load
	<span id="cputemp"><br>CPU Temperatue</span>
	<br>Time
	<br>Up Time
	<br>Boot Duration
</div>
<div id="status" class="col-r text"></div>

<div class="col-l"></div>
<div class="col-r">
	<span <?=$classhelp?>>
		<br><gr><i class="fa fa-refresh"></i>&emsp;Toggle refresh every 10 seconds.</gr>
		<br>
		<br>CPU Load:
		<p>
			&bull; Average number of processes which are being executed and in waiting.
		<br>&bull; calculated over 1, 5 and 15 minutes.
		<br>&bull; Each one should not be constantly over 0.75 x CPU cores.
		</p>
		<br>CPU temperature:
		<p>
			&bull; 80-84°C: ARM cores throttled.
		<br>&bull; 85°C: ARM cores and GPU throttled.
		<br>&bull; RPi 3B+: 60°C soft limit (optimized throttling)
		</p>
		<div id="throttled">
			<br><i class="fa fa-warning"></i> Under-voltage warning: <code>vcgencmd get_throttled</code>
			<p>
				&bull; "occurred" - Events happenned.
			<br>&bull; "currently detected" - Currently under minimum limit. System unstable is very likely.
			<br>&bull; More info - <a href="https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md">vcgencmd</a>
		</p>
		</div>
	</span>
</div>
<div style="clear:both"></div>
<pre id="codeundervoltage" class="hide"></pre>
</div>

<div>
<heading data-status="mount" class="noline status">Storage<?=$istatus?><i id="addnas" class="fa fa-plus-circle wh"></i><?=$ihelp?></heading>
<ul id="list" class="entries"></ul>
<div <?=$classhelp?>>
	Available sources, local USB and NAS mounts, for Library.
	<br>USB drive will be found and mounted automatically. Network shares must be manually configured.
	<br>
	<br><i class="fa fa-plus-circle"></i>&ensp; Add network share commands:
	<br> &emsp; <gr>(If mount failed, try in SSH terminal.)</gr>
	<br>#1:
	<pre>mkdir -p "/mnt/MPD/NAS/<bll>NAME</bll>"</pre>
	#2:
	<br>CIFS:
	<pre>mount -t cifs "//<bll>IP</bll>/<bll>SHARENAME</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" -o noauto,username=<bll>USER</bll>,password=<bll>PASSWORD</bll>,uid=UID,gid=GID,iocharset=utf8</pre>
	NFS:
	<pre>mount -t nfs "<bll>IP</bll>:<bll>/SHARE/PATH</bll>" "/mnt/MPD/NAS/<bll>NAME</bll>" -o defaults,noauto,bg,soft,timeo=5</pre>
	(Append more options if required.)
</div>
<pre id="codemount" class="hide"></pre>
</div>

	<?php $rev = substr( exec( "awk '/Revision/ {print \$NF}' /proc/cpuinfo" ), -3, 2 );
		  if ( in_array( $rev, [ '08', '0c', '0d', '0e', '11' ] ) ) { ?>
<div>
<heading data-status="rfkill" class="status">Wireless<?=$istatus?><?=$ihelp?></heading>
<pre id="coderfkill" class="hide"></pre>
<div id="bt" data-status="bluetoothctl"></div>
<div class="col-r">
	<input id="bluetooth" <?=$chkenable?>>
	<div class="switchlabel" for="bluetooth"></div>
	<i id="setting-bluetooth" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
			As a sender:
		<br> &emsp; &bull; Power on Bluetooth speakers/headphones > enable pairing
		<br> &emsp; &bull; Networks > Bluetooth > search > pair
		<br>As a receiver:
		<br> &emsp; &bull; Sender device > search > pair
	</span>
</div>
<pre id="codebluetoothctl" class="hide"></pre>
<div id="wl" data-status="iw"></div>
<div class="col-r">
	<input id="wlan" <?=$chkenable?>>
	<div class="switchlabel" for="onboardwlan"></div>
	<i id="setting-wlan" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
			Auto start Access Point - On failed connection or no router
		<br>Wi-Fi regulatory domain:
		<p>
			&bull; 00 = Least common denominator settings, channels and transmit power are permitted in all countries.
		<br>&bull; <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements">ISO 3166-1 alpha-2 country code</a>
		<br>&bull; Active regulatory domian may be reassigned by connected router.
		</p>
	</span>
</div>
<pre id="codeiw" class="hide"></pre>
</div>
	<?php } ?>

<div>
<heading data-status="configtxt" class="status">GPIO Devices<?=$istatus?><?=$ihelp?></heading>
<pre id="codeconfigtxt" class="hide"></pre>
<div class="col-l single">Audio - I²S<i class="fa fa-i2saudio"></i></div>
<div class="col-r i2s">
	<div id="divi2smodulesw">
		<input id="i2smodulesw" type="checkbox">
		<div class="switchlabel" for="i2smodulesw"></div>
	</div>
	<div id="divi2smodule">
		<?=$selecti2s?>
	</div>
	<span <?=$classhelp?>>I²S audio modules are not plug-and-play capable. Select a driver for installed device.</span>
</div>
<div class="col-l double">
	<a>Character LCD
	<br><gr>HD44780</gr></a><i class="fa fa-lcdchar"></i>
</div>
<div class="col-r">
	<input id="lcdchar" <?=$chkenable?>>
	<div class="switchlabel" for="lcdchar"></div>
	<i id="setting-lcdchar" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
			<a class="img" data-name="lcdchar">Module</a> with Hitachi HD44780 controller.
		<br>&bull; Support 16x2 and 20x4 LCD modules.
		<br>&bull; <a href="https://rplcd.readthedocs.io/en/latest/getting_started.html#wiring">Wiring</a>
		<br><i class="fa fa-warning"></i> LCD with I²C backpack must be modified: <a class="img" data-name="i2cbackpack">5V to 3.3V I²C and 5V LCD</a>
		<br>&bull; I²C mode cannot be enabled if Power Button is enabled.
	</span>
</div>
<div class="col-l double">
	<a>Power Button
	<br>Power LED</a><i class="fa fa-power"></i>
</div>
<div class="col-r">
	<input id="powerbutton" <?=$chkenable?>>
	<div class="switchlabel" for="powerbutton"></div>
	<i id="setting-powerbutton" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		Power button and LED for on/off rAudio.
		<br>&bull; <a class="img" data-name="powerbutton">Wiring</a>
		<br>&bull; On pin is fixed.
		<br>&bull; Cannot be enabled if Character LCD is enabled in I²C mode.
	</span>
</div>
<pre id="codepowerbutton" class="hide"></pre>
<div class="col-l double">
	<a>Relay Module<br><gr>WiringPi</gr></a><i class="fa fa-relays"></i>
</div>
<div class="col-r">
	<input id="relays" <?=$chknoset?>>
	<div class="switchlabel" for="relays"></div>
	<i id="setting-relays" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a class="img" data-name="relays">Module</a> for power on / off equipments.
		<br>More info: <a href="https://github.com/rern/R_GPIO/blob/master/README.md">+R GPIO</a>
		<br>(This can be enabled and run as a test without a connected relay module.)
	</span>
</div>
	<?php if ( file_exists( '/usr/bin/chromium' ) ) { ?>
<div class="col-l double">
	<a>TFT 3.5" LCD
	<br><gr>420x320</gr></a><i class="fa fa-lcd"></i>
</div>
<div class="col-r">
	<input id="lcd" <?=$chkenable?>>
	<div class="switchlabel" for="lcd"></div>
	<i id="setting-lcd" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		<a class="img" data-name="lcd">Module</a> with resistive touchscreen.
	</span>
</div>
	<?php } ?>
<div class="col-l single">VU LED<i class="fa fa-led"></i></div>
<div class="col-r">
	<input id="vuled" <?=$chkenable?>>
	<div class="switchlabel" for="vuled"></div>
	<i id="setting-vuled" <?=$classsetting?>></i>
	<span <?=$classhelp?>>
		7 LEDs, with current limiting resisters
		<br>&bull; <a class="img" data-name="vuled">Wiring</a>
		<br>&bull; <bl id="ledcalc">LED resister calculator</bl>
	</span>
</div>
</div>

<div>
<heading>Environment<?=$ihelp?></heading>
<div class="col-l double">
	<a>Name
	<br><gr>hostname</gr></a><i class="fa fa-plus-r"></i>
</div>
<div class="col-r">
	<input type="text" id="hostname" readonly>
	<span <?=$classhelp?>>Name for Renderers, Streamers, Access point, Bluetooth and system Hostname.</span>
</div>
<div class="col-l single">Timezone<i class="fa fa-globe"></i></div>
<div class="col-r">
	<?=$selecttimezone?><i id="setting-timezone" class="settingedit fa fa-gear"></i>
</div>

<div id="divsoundprofile">
<div data-status="soundprofile" class="col-l icon double status">
	<a>Sound Profile
	<br><gr>kernel <?=$istatus?></gr></a><i class="fa fa-soundprofile"></i>
</div>
<div class="col-r">
	<input id="soundprofile" <?=$chkenable?>>
	<div class="switchlabel" for="soundprofile"></div>
	<i id="setting-soundprofile" <?=$classsetting?>></i>
	<span <?=$classhelp?>>Tweak kernel parameters for <a href="https://www.runeaudio.com/forum/sound-signatures-t2849.html">sound profiles</a>.</span>
</div>
<pre id="codesoundprofile" class="hide"></pre>
</div>
</div>

<div>
<heading id="backuprestore">Settings and Data<?=$ihelp?></heading>
<div data-status="backup" class="col-l single">Backup<i class="fa fa-sd"></i></div>
<div class="col-r">
	<input id="backup" type="checkbox">
	<div class="switchlabel" for="backup"></div>
	<span <?=$classhelp?>>
			Backup all settings and Library database:
		<p>&bull; Settings
		<br>&bull; Library database
		<br>&bull; Saved playlists
		<br>&bull; Bookmarks
		<br>&bull; Lyrics
		<br>&bull; WebRadios
		</p>
	</span>
</div>

<div data-status="restore" class="col-l single">Restore<i class="fa fa-restore"></i></div>
<div class="col-r">
	<input id="restore" type="checkbox">
	<div class="switchlabel" for="restore"></div>
	<span <?=$classhelp?>>Restore all settings and Library database from a backup file. The system will reboot after finished.</span>
</div>
</div>
<?php
$listui = [
	  'jQuery'              => 'https://jquery.com/'
	, 'HTML5-Color-Picker'  => 'https://github.com/NC22/HTML5-Color-Picker'
	, 'Inconsolata font'    => 'https://github.com/google/fonts/tree/main/ofl/inconsolata'
	, 'jQuery Selectric'    => 'https://github.com/lcdsantos/jQuery-Selectric'
	, 'Lato-Fonts'          => 'http://www.latofonts.com/lato-free-fonts'
	, 'LazyLoad'            => 'https://github.com/verlok/lazyload'
	, 'pica'                => 'https://github.com/nodeca/pica'
	, 'QR Code generator'   => 'https://github.com/datalog/qrcode-svg'
	, 'roundSlider'         => 'https://github.com/soundar24/roundSlider'
	, 'simple-keyboard'     => 'https://github.com/hodgef/simple-keyboard/'
	, 'Sortable'            => 'https://github.com/SortableJS/Sortable'
	, 'Tocca'               => 'https://github.com/GianlucaGuarini/Tocca.js'
];
$uihtml = '';
foreach( $listui as $name => $link ) {
	if ( $localhost ) {
		$uihtml.= $name.'<br>';
	} else {
		$uihtml.= '<a href="'.$link.'" target="_blank">'.$name.'</a><br>';
	}
}
$version = file_get_contents( '/srv/http/data/system/version' );
?>
<br>
<heading>About</heading>
<i class="fa fa-plus-r fa-lg gr"></i>&ensp;<a href="https://github.com/rern/rAudio-<?=$version?>/discussions">r A u d i o&emsp;<?=$version?></a>
<br><gr>by</gr>&emsp;r e r n
<br>&nbsp;

<heading class="sub">Back End</heading>
<a href="https://www.archlinuxarm.org" target="_blank">ArchLinuxArm</a>
<br><a class="listtitle">Packages&ensp;<i class="fa fa-chevron-down"></i></a>
<div class="list hide"></div><br>&nbsp;

<heading class="sub">Front End</heading>
<br><a href="https://whatwg.org" target="_blank">HTML</a>
<br><a href="https://www.w3.org/TR/CSS" target="_blank">CSS</a>
<br><a href="https://www.php.net" target="_blank">PHP</a>
<br><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">JavaScript</a>
<br><a class="listtitle">JS libraries and plugins&ensp;<i class="fa fa-chevron-down"></i></a>
<div class="list hide"><?=$uihtml?></div><br>&nbsp;

<heading class="sub">Data</heading>
<dev class="gr">
<a href="https://www.last.fm">last.fm</a> - Coverarts and artist biographies<br>
<a href="https://webservice.fanart.tv">fanart.tv</a> - Artist images and fallback coverarts<br>
<a href="https://radioparadise.com">Radio Paradise</a>, <a href="https://www.fip.fr/">Fip</a>, <a href="https://www.francemusique.fr/">France Musique</a> - Coverarts for each stations<br>
<a href="http://gnudb.gnudb.org">GnuDB</a> - Audio CD data
</div>

<div style="clear: both"></div>
