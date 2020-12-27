<?php
$i2slist = json_decode( file_get_contents( '/srv/http/settings/system-i2s.json' ) );
$selecti2s = '<select id="i2smodule">';
foreach( $i2slist as $name => $sysname ) {
	$selecti2s.= '<option value="'.$sysname.'">'.$name.'</option>';
}
$selecti2s.= '</select>';
$timezone = exec( "timedatectl • awk '/zone:/ {print $3}'" );
date_default_timezone_set( $timezone );
$timezonelist = timezone_identifiers_list();
$selecttimezone = '<select id="timezone">';
foreach( $timezonelist as $key => $zone ) {
	$datetime = new DateTime( 'now', new DateTimeZone( $zone ) );
	$offset = $datetime->format( 'P' );
	$zonename = preg_replace( [ '/_/', '/\//' ], [ ' ', ' <gr>&middot;</gr> ' ], $zone );
	$selecttimezone.= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>\n';
}
$selecttimezone.= '</select>';
$helpstatus = '<i class="fa fa-code w2x"></i>Tap label: <code>systemctl status SERVICE</code></span>';
?>
<heading data-status="journalctl" class="status">System<i class="fa fa-code"></i></heading>
<pre id="codejournalctl" class="hide"></pre>
<div id="systemlabel" class="col-l text gr">
		Version
	<br>Hardware
	<br>SoC
	<br>Output Device
	<br>Kernel
	<br>MPD
	<br>Networks
</div>
<div id="systemvalue" class="col-r text"></div> 

<div>
<heading>Status<i id="refresh" class="fa fa-refresh"></i><?=$help?></heading>
<div id="statuslabel" class="col-l text gr">
		CPU Load
	<br>CPU Temperatue
	<br>Time
	<br>Up Time
	<br>Startup
</div>
<div id="status" class="col-r text"></div>

<div class="col-l"></div>
<div class="col-r">
	<span class="help-block hide">
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
</div>

<div>
<heading>Wireless<?=$help?></heading>
	<?php $code = exec( "awk '/Revision/ {print \$NF}' /proc/cpuinfo" );
		$hwcode = substr( $code, -3, 2 );
		if ( in_array( $hwcode, [ '0c', '08', '0e', '0d', '11' ] ) ) { # rpi with wireless
			if ( file_exists( '/usr/bin/bluetoothctl' ) ) { ?>
<div data-status="bluetoothctl" class="col-l double status">
	<a>Bluetooth
	<br><gr>onboard <i class="fa fa-code"></i></gr></a><i class="fa fa-bluetooth"></i>
</div>
<div class="col-r">
	<input id="bluetooth" class="enable" type="checkbox">
	<div class="switchlabel" for="bluetooth"></div>
	<i id="setting-bluetooth" class="setting fa fa-gear"></i>
	<span class="help-block hide">
			Should be disabled if not used.
		<br>(Try reboot again if Bluetooth not working.)
	</span>
</div>
<pre id="codebluetoothctl" class="hide"></pre>
		<?php $bluetooth = ', Bluetooth';
			  } ?>
<div data-status="ifconfig" class="col-l double status">
	<a>Wi-Fi
	<br><gr>onboard <i class="fa fa-code"></i></gr></a><i class="fa fa-wifi"></i>
</div>
<div class="col-r">
	<input id="onboardwlan" type="checkbox">
	<div class="switchlabel" for="onboardwlan"></div>
	<span class="help-block hide">Should be disabled if not used.</span>
</div>
<pre id="codeifconfig" class="hide"></pre>
	<?php } ?>

</div>

<div>
<heading data-status="configtxt" class="status">GPIO Devices<i class="fa fa-code"></i><?=$help?></heading>
<pre id="codeconfigtxt" class="hide"></pre>
<div class="col-l double status">
	<a>Audio
	<br><gr>I²S</gr></a><i class="fa fa-i2saudio"></i>
</div>
<div class="col-r i2s">
	<div id="divi2smodulesw">
		<input id="i2smodulesw" type="checkbox">
		<div class="switchlabel" for="i2smodulesw"></div>
	</div>
	<div id="divi2smodule">
		<?=$selecti2s?>
	</div>
	<span class="help-block hide">I²S audio modules are not plug-and-play capable. Select a driver for installed device.</span>
</div>
<div class="col-l double status">
	<a>LCD - Character
	<br><gr>HD44780</gr></a><i class="fa fa-lcdchar"></i>
</div>
<div class="col-r">
	<input id="lcdchar" class="enable" type="checkbox">
	<div class="switchlabel" for="lcdchar"></div>
	<i id="setting-lcdchar" class="setting fa fa-gear"></i>
	<span class="help-block hide">
			<a href="https://github.com/dbrgn/RPLCD">RPLCD</a> - Python library for Hitachi HD44780 controller.
		<p>
			&bull; Support 16x2, 20x4 and 40x4 LCD modules.
		<br>&bull; <a href="https://rplcd.readthedocs.io/en/latest/getting_started.html#wiring">Wiring</a>
		</p>
		<br><i class="fa fa-warning"></i> Precaution for LCD with I²C backpack: <a href="https://www.instructables.com/Raspberry-Pi-Using-1-I2C-LCD-Backpacks-for-1602-Sc/">5V to 3.3V I²C + 5V LCD Mod</a>
	</span>
</div>
<div class="col-l double status">
	<a>LCD - TFT
	<br><gr>3.5" 420x320</gr></a><i class="fa fa-lcd"></i>
</div>
<div class="col-r">
	<input id="lcd" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="lcd"></div>
	<i id="setting-lcd" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		For 3.5" 420x320 pixels TFT LCD with resistive touchscreen.
	<br><i class="fa fa-gear"></i>&ensp;Calibrate touchscreen precision.
	</span>
</div>
<div class="col-l double status">
	<a>Relays
	<br><gr>RPI.GPIO</gr></a><i class="fa fa-relays"></i>
</div>
<div class="col-r">
	<input id="relays" class="enablenoset" type="checkbox">
	<div class="switchlabel" for="relays"></div>
	<i id="setting-relays" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		<a href="https://sourceforge.net/projects/raspberry-gpio-python/">RPi.GPIO</a> - Python module to control GPIO.
		<br><a href="https://github.com/rern/R_GPIO">+R - GPIO</a> - Control GPIO-connected relay module for power on / off equipments.
	</span>
</div>
</div>

<div>
<heading>Environment<?=$help?></heading>
<div class="col-l double">
	<a>Name
	<br><gr>hostname</gr></a><i class="fa fa-plus-r"></i>
</div>
<div class="col-r">
	<input type="text" id="hostname" readonly>
	<span class="help-block hide">Name for Renderers, Streamers, RPi access point<?=$bluetooth?> and system hostname.</span>
</div>
<div class="col-l double">
	<a>Timezone
	<br><gr>NTP, RegDom</gr></a><i class="fa fa-globe"></i>
</div>
<div class="col-r">
	<?=$selecttimezone?>
	<i id="setting-regional" class="settingedit fa fa-gear"></i>
	<span class="help-block hide">
		Wi-Fi regulatory domain:
		<p>
			&bull; 00 = Least common denominator settings, channels and transmit power are permitted in all countries.
		<br>&bull; Active regulatory domian may be reassigned by connected router.
		</p>
	</span>
</div>
<div data-status="soundprofile" class="col-l icon double status">
		<a>Sound Profile
	<br><gr>kernel <i class="fa fa-code"></i></gr></a><i class="fa fa-soundprofile"></i>
</div>
<div class="col-r">
	<input id="soundprofile" class="enable" type="checkbox">
	<div class="switchlabel" for="soundprofile"></div>
	<i id="setting-soundprofile" class="setting fa fa-gear"></i>
	<span class="help-block hide">Tweak kernel parameters for <a htef="https://www.runeaudio.com/forum/sound-signatures-t2849.html">sound profiles</a>.</span>
</div>
<pre id="codesoundprofile" class="hide"></pre>
</div>

<div>
<heading id="backuprestore">Settings and Data<?=$help?></heading>
<div data-status="backup" class="col-l single">Backup<i class="fa fa-sd"></i></div>
<div class="col-r">
	<input id="backup" type="checkbox">
	<div class="switchlabel" for="backup"></div>
	<span class="help-block hide">
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

<div data-status="restore" class="col-l single">Restore<i class="fa fa-sd-restore"></i></div>
<div class="col-r">
	<input id="restore" type="checkbox">
	<div class="switchlabel" for="restore"></div>
	<span class="help-block hide">Restore all settings and Library database from a backup file. The system will reboot after finished.</span>
</div>
</div>
<?php
$listos = [
	  'Avahi'                    => 'https://www.avahi.org/'
	, 'BlueZ'                    => 'http://www.bluez.org'
	, 'bluez-alsa'               => 'https://github.com/Arkq/bluez-alsa'
	, 'Chromium'                 => 'https://www.chromium.org/'
	, 'Cronie'                   => 'https://github.com/cronie-crond/cronie'
	, 'Dnsmasq'                  => 'http://www.thekelleys.org.uk/dnsmasq/doc.html'
	, 'dosfstools'               => 'https://github.com/dosfstools/dosfstools'
	, 'FFmpeg'                   => 'http://ffmpeg.org'
	, 'Gifsicle'                 => 'https://www.lcdf.org/gifsicle/'
	, 'hfsprogs'                 => 'https://aur.archlinux.org/packages/hfsprogs'
	, 'hostapd'                  => 'https://w1.fi/hostapd'
	, 'I2C Tools'                => 'https://i2c.wiki.kernel.org/index.php/I2C_Tools'
	, 'ifplugd'                  => 'http://0pointer.de/lennart/projects/ifplugd'
	, 'ImageMagick'              => 'https://imagemagick.org'
	, 'Inetutils'                => 'https://www.gnu.org/software/inetutils/'
	, 'jq'                       => 'https://stedolan.github.io/jq'
	, 'Kid3 - Audio Tagger'      => 'https://kid3.sourceforge.io'
	, 'Matchbox'                 => 'https://www.yoctoproject.org/software-item/matchbox/'
	, 'mpc'                      => 'https://www.musicpd.org/clients/mpc/'
	, 'MPD'                      => 'http://www.musicpd.org'
	, 'mpdscribble'              => 'https://github.com/MusicPlayerDaemon/mpdscribble'
	, 'nfs-utils'                => 'http://nfs.sourceforge.net'
	, 'NGINX'                    => 'http://nginx.org'
	, 'NGINX Push Stream Module' => 'https://github.com/wandenberg/nginx-push-stream-module'
	, 'nss-mdns'                 => 'http://0pointer.de/lennart/projects/nss-mdns'
	, 'NTFS-3G'                  => 'https://www.tuxera.com/community/open-source-ntfs-3g'
	, 'Parted'                   => 'https://www.gnu.org/software/parted/parted.html'
	, 'PHP'                      => 'http://php.net'
	, 'ply-image'                => 'https://chromium.googlesource.com/chromiumos/third_party/ply-image/+/refs/heads/master/README.chromium'
	, 'Python'                   => 'https://www.python.org'
	, 'python-dbus'              => 'https://www.freedesktop.org/wiki/Software/DBusBindings/'
	, 'PyGObject'                => 'https://wiki.gnome.org/Projects/PyGObject'
	, 'raspi-rotate'             => 'https://github.com/colinleroy/raspi-rotate'
	, 'Requests'                 => 'https://github.com/psf/requests'
	, 'RPi.GPIO'                 => 'https://sourceforge.net/projects/raspberry-gpio-python/'
	, 'RPLCD'                    => 'https://github.com/dbrgn/RPLCD'
	, 'Samba'                    => 'http://www.samba.org'
	, 'Shairport-sync'           => 'https://github.com/mikebrady/shairport-sync'
	, 'smbus2'                   => 'https://github.com/kplindegaard/smbus2'
	, 'Snapcast'                 => 'https://github.com/badaix/snapcast'
	, 'Spotifyd'                 => 'https://github.com/Spotifyd/spotifyd'
	, 'Sshpass'                  => 'https://sourceforge.net/projects/sshpass/'
	, 'Sudo'                     => 'https://www.sudo.ws/sudo'
	, 'udevil'                   => 'http://ignorantguru.github.io/udevil'
	, 'upmpdcli'                 => 'http://www.lesbonscomptes.com/upmpdcli'
	, 'UPower'                   => 'https://upower.freedesktop.org/'
	, 'Wget'                     => 'https://www.gnu.org/software/wget/wget.html'
	, 'Web Service Discovery'    => 'https://github.com/christgau/wsdd'
	, 'X'                        => 'https://xorg.freedesktop.org'
];
$oshtml = '';
foreach( $listos as $name => $link ) {
	$oshtml.= '<a href="'.$link.'">'.$name.'</a><br>';
}
$listui = [
	  'HTML5-Color-Picker'  => 'https://github.com/NC22/HTML5-Color-Picker'
	, 'Inconsolata font'    => 'https://www.levien.com/type/myfonts/inconsolata.html'
	, 'jQuery'              => 'https://jquery.com/'
	, 'jQuery Mobile'       => 'https://jquerymobile.com/'
	, 'jQuery Selectric'    => 'https://github.com/lcdsantos/jQuery-Selectric'
	, 'Lato-Fonts'          => 'http://www.latofonts.com/lato-free-fonts'
	, 'LazyLoad'            => 'https://github.com/verlok/lazyload'
	, 'pica'                => 'https://github.com/nodeca/pica'
	, 'QR Code generator'   => 'https://github.com/datalog/qrcode-svg'
	, 'roundSlider'         => 'https://github.com/soundar24/roundSlider'
	, 'simple-keyboard'     => 'https://github.com/hodgef/simple-keyboard/'
	, 'Sortable'            => 'https://github.com/SortableJS/Sortable'
];
$uihtml = '';
foreach( $listui as $name => $link ) {
	$uihtml.= '<a href="'.$link.'">'.$name.'</a><br>';
}
$version = file_get_contents( '/srv/http/data/system/version' );
?>
<br>
<heading>About</heading>
<i class="fa fa-plus-r fa-lg gr"></i>&ensp;<a href="https://github.com/rern/rAudio-<?=$version?>/discussions">r A u d i o&emsp;<?=$version?></a>
<br><gr>by</gr>&emsp;r e r n
<br>&nbsp;
<div>
<heading class="sub">Back End<?=$help?></heading>
<span class="help-block hide">
	<a href="https://www.archlinuxarm.org" style="font-size: 20px;">ArchLinuxArm</a> + default packages<br>
	<?=$oshtml?>
</span>
</div>
<div>
<heading class="sub">Front End<?=$help?></heading>
<span class="help-block hide">
	<?=$uihtml?>
</span>
</div>
<div>
<heading class="sub">Data<?=$help?></heading>
<span class="help-block hide">
	<a href="https://www.last.fm">last.fm</a><gr> - Coverarts and artist biographies</gr><br>
	<a href="https://webservice.fanart.tv">fanart.tv</a><gr> - Coverarts and artist images</gr><br>
	<a href="https://radioparadise.com">Radio Paradise</a><gr> - Coverarts of their own and default stations</gr>
</span>
</div>

<div style="clear: both"></div>
