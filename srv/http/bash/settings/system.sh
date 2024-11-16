#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

configTxt() { # each $CMD removes each own lines > reappends if enable or changed
	local chip filemodule i2clcdchar i2cmpdoled list module name spimpdoled tft
	filemodule=/etc/modules-load.d/raspberrypi.conf
	if [[ ! -e /tmp/config.txt ]]; then # files at boot for comparison: cmdline.txt, config.txt, raspberrypi.conf
		for f in /boot/cmdline.txt /boot/config.txt $filemodule; do
			[[ -s $f ]] && grep -Ev '^#|^\s*$' $f | sort -u > /tmp/$( basename $f )
		done
	fi
	[[ ! $config ]] && config=$( < /boot/config.txt )
	config=$( grep -Ev '^#|^\s*$' <<< $config )
	if [[ $i2cset ]]; then
		grep -E -q 'dtoverlay=.*:rotate=' <<< $config && tft=1
		[[ -e $dirsystem/lcdchar ]] && i2clcdchar=1
		if [[ -e $dirsystem/mpdoled ]]; then
			chip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
			[[ $chip == 1 || $chip == 7 ]] && spimpdoled=1 || i2cmpdoled=1
		fi
		config=$( grep -Ev '^dtparam=i2c_arm=on|^dtparam=spi=on|^dtparam=i2c_arm_baudrate' <<< $config )
		[[ $tft || $i2clcdchar || $i2cmpdoled ]] && config+='
dtparam=i2c_arm=on'
		[[ $i2cmpdoled ]] && config+="
dtparam=i2c_arm_baudrate=$BAUD" # $baud from mpdoled )
		[[ $tft || $spimpdoled ]] && config+='
dtparam=spi=on'
		
		[[ -e $filemodule ]] && module=$( grep -Ev 'i2c-bcm2708|i2c-dev|snd-soc-wm8960|^#|^\s*$' $filemodule )
		[[ $tft || $i2clcdchar ]] && module+='
i2c-bcm2708'
		if [[ $tft || $i2clcdchar || $i2cmpdoled ]]; then
			module+='
i2c-dev'
			! ls /dev/i2c* &> /dev/null && reboot=1
		elif grep -q wm8960-soundcard <<< $config; then
			module+='
i2c-dev
snd-soc-wm8960'
		fi
		[[ -e $module ]] && sort -u <<< $module > $filemodule || rm -f $filemodule
	fi
	if [[ $poweraudiophonic ]]; then
		config+="
dtoverlay=gpio-poweroff,gpiopin=22
dtoverlay=gpio-shutdown,gpio_pin=17,active_low=0,gpio_pull=down"
	else
		config=$( grep -Ev 'gpio-poweroff|gpio-shutdown' <<< $config )
	fi
	awk NF <<< $config | sort -u > /boot/config.txt
	pushRefresh
	if [[ ! $reboot ]]; then
		if ! cmp -s /tmp/config.txt /boot/config.txt || ! cmp -s /tmp/cmdline.txt /boot/cmdline.txt; then
			reboot=1
		else
			count=$( ls $filemodule /tmp/raspberrypi.conf | wc -l )
			[[ $count == 1 ]] || ( [[ $count == 2 ]] && ! cmp -s /tmp/raspberrypi.conf $filemodule ) && reboot=1
		fi
	fi
	if [[ $reboot ]]; then
		label=$( sed -E -n "/$CMD.*=>/ {s/.*'label' => '|',.*//g; p}" /srv/http/settings/system.php )
		notify $CMD "$label" 'Reboot required.' 5000
		appendSortUnique $CMD $dirshm/reboot
	else
		sed -i "/$CMD/ d" $dirshm/reboot
	fi
}
soundProfile() {
	local lan mtu swappiness txqueuelen
	if [[ $1 == reset ]]; then
		swappiness=60
		mtu=1500
		txqueuelen=1000
		rm -f $dirsystem/soundprofile
	else
		. $dirsystem/soundprofile.conf
		touch $dirsystem/soundprofile
	fi
	sysctl vm.swappiness=$swappiness
	lan=$( ip -br link | awk '/^e/ {print $1; exit}' )
	if [[ $lan ]]; then
		ip link set $lan mtu $mtu
		ip link set $lan txqueuelen $txqueuelen
	fi
}

case $CMD in

audio )
	enableFlagSet
	if [[ $ON ]] ; then
		config="$( < /boot/config.txt )
dtparam=audio=on"
	else
		config=$( grep -v ^dtparam=audio=on /boot/config.txt )
	fi
	configTxt
	;;
bluetooth )
	inOutputConf device.*bluealsa && bluealsa=1
	if [[ $ON ]]; then
		config=$( grep -E -v 'disable-bt' /boot/config.txt )
		if [[ $DISCOVERABLE ]]; then
			yesno=yes
			touch $dirsystem/btdiscoverable
		else
			yesno=no
			rm $dirsystem/btdiscoverable
		fi
		if ls -l /sys/class/bluetooth 2> /dev/null | grep -q -m1 serial; then
			systemctl start bluetooth
			bluetoothctl discoverable $yesno &> /dev/null
			[[ ! $bluealsa ]] && $dirsettings/player-conf.sh
			rfkill | grep -q -m1 bluetooth && pushData refresh '{ "page": "networks", "activebt": true }'
		fi
		[[ -e $dirsystem/btformat  ]] && prevbtformat=true
		[[ $FORMAT ]] && touch $dirsystem/btformat || rm -f $dirsystem/btformat
		[[ $FORMAT != $prevbtformat ]] && $dirsettings/player-conf.sh
	else
		config="$( < /boot/config.txt )
dtoverlay=disable-bt"
		if rfkill | grep -q -m1 bluetooth; then
			systemctl stop bluetooth
			rm -f $dirshm/{btdevice,btreceiver,btsender}
			[[ $bluealsa ]] && $dirsettings/player-conf.sh
		fi
	fi
	configTxt
	;;
bluetoothstart )
	sleep 3
	[[ -e $dirsystem/btdiscoverable ]] && yesno=yes || yesno=no
	bluetoothctl discoverable $yesno &> /dev/null
	bluetoothctl discoverable-timeout 0 &> /dev/null
	bluetoothctl pairable yes &> /dev/null
	;;
gpiopintoggle )
	[[ $( gpioget -a -c0 --numeric $PIN ) == 0 ]] && onoff=1 || onoff=0
	gpioset -t0 -c0 $PIN=$onoff
	echo $onoff
	;;
hddsleep )
	hdparm -q -B $LEVEL $DEV
	hdparm -q -S $LEVEL $DEV
	pushRefresh
	;;
hostname )
	nameprev=$( hostname )
	hostnamectl hostname $NAME
	sed -i -E 's/(name = ").*/\1'$NAME'"/' /etc/shairport-sync.conf
	sed -i -E 's/^(friendlyname = ).*/\1'$NAME'/' /etc/upmpdcli.conf
	systemctl try-restart avahi-daemon bluetooth localbrowser mpd smb shairport-sync shairport spotifyd upmpdcli
	mv /var/lib/iwd/ap/{$nameprev,$NAME}.ap
	[[ -e $dirsystem/ap ]] && $dirsettings/features.sh iwctlap
	pushData refresh '{ "page": "system", "hostname": "'$NAME'" }'
	;;
i2seeprom )
	if [[ $ON ]]; then
		config="$( < /boot/config.txt )
force_eeprom_read=0"
	else
		config=$( grep -v ^force_eeprom_read /boot/config.txt )
	fi
	configTxt
	;;
i2smodule )
	prevaplayname=$( getContent $dirsystem/audio-aplayname )
	config=$( grep -Ev "^dtparam=i2s=on|^dtoverlay=$prevaplayname|gpio=25=op,dh|^dtparam=audio=on" /boot/config.txt )
	rm -f /boot/cirrus /etc/modprobe.d/cirrus.conf
	if [[ $APLAYNAME != none ]]; then
		config+="
dtparam=i2s=on
dtoverlay=$APLAYNAME"
		[[ $OUTPUT == 'Pimoroni Audio DAC SHIM' ]] && config+="
gpio=25=op,dh"
		! grep -q gpio-shutdown /boot/config.txt && systemctl disable --now powerbutton
		echo $APLAYNAME > $dirsystem/audio-aplayname
		echo $OUTPUT > $dirsystem/audio-output
		if [[ $APLAYNAME == cirrus-wm5102 ]]; then
			echo softdep arizona-spi pre: arizona-ldo1 > /etc/modprobe.d/cirrus.conf
			echo $OUTPUTTYPE > $dirsystem/audio-wm5102
			$dirsettings/player-wm5102.sh "$OUTPUTTYPE"
		elif [[ $APLAYNAME == wm8960-soundcard ]]; then
			i2cset=1
		fi
	else
		config+="
dtparam=audio=on"
	rm -f $dirsystem/audio-{aplayname,output}
	fi
	configTxt
	;;
lcdchar )
	enableFlagSet
	i2cset=1
	configTxt
	;;
lcdcharset )
	systemctl stop lcdchar
	$dirbash/lcdchar.py $ACTION
	;;
mirror )
	file=/etc/pacman.d/mirrorlist
	[[ $MIRROR ]] && MIRROR+=.
	server='Server = http://'$MIRROR'mirror.archlinuxarm.org/$arch/$repo'
	[[ $server != $( grep -m1 ^Server $file ) ]] && echo $server > $file
	pushRefresh
	;;
mountforget )
	umount -l "$MOUNTPOINT"
	rmdir "$MOUNTPOINT" &> /dev/null
	fstab=$( grep -v ${MOUNTPOINT// /\\\\040} /etc/fstab )
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	$dirbash/cmd.sh "mpcupdate
update
NAS
CMD ACTION PATHMPD"
	pushRefresh
	;;
mountremount )
	if [[ ${MOUNTPOINT:9:3} == NAS ]]; then
		mount "$MOUNTPOINT"
	else
		udevil mount $SOURCE
	fi
	pushRefresh
	;;
mountunmount )
	if [[ ${MOUNTPOINT:9:3} == NAS ]]; then
		umount -l "$MOUNTPOINT"
	else
		udevil umount -l "$MOUNTPOINT"
	fi
	pushRefresh
	;;
mpdoledlogo )
	systemctl stop mpd_oled
	type=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
	mpd_oled -o $type -L
	;;
mpdoled )
	enableFlagSet
	if [[ $ON ]]; then
		if [[ $( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 ) != $CHIP ]]; then
			sed -i 's/-o ./-o '$CHIP'/' /etc/systemd/system/mpd_oled.service
			systemctl daemon-reload
		fi
	else
		$dirsettings/player-conf.sh
	fi
	i2cset=1
	configTxt
	[[ -e $dirsystem/mpdoled && ! -e $dirshm/reboot && ! -e $dirmpdconf/fifo.conf ]] && $dirsettings/player-conf.sh
	;;
ntp )
	file=/etc/systemd/timesyncd.conf
	echo "\
[Time]
NTP=$NTP" > $file
	timedatectl set-ntp true
	pushRefresh
	;;
powerbutton )
	enableFlagSet
	if [[ $ON ]]; then
		if [[ $SW ]]; then
			serviceRestartEnable
		else
			poweraudiophonic=1
		fi
	else
		if systemctl -q is-active powerbutton; then
			systemctl disable --now powerbutton
			led=$( getVar led $dirsystem/powerbutton.conf )
			gpioset -t0 -c0 $led=0
		fi
	fi
	configTxt
	;;
regdomlist )
	cat /srv/http/assets/data/regdomcodes.json
	;;
relays )
	enableFlagSet
	pushRefresh
	pushData display '{ "submenu": "relays", "value": '$TF' }'
	[[ ! -e $dirshm/relayson ]] && exit
# --------------------------------------------------------------------
	if grep -q timeron=true $dirsystem/relays.conf; then
		$dirbash/relays-timer.sh
	else
		killProcess relaystimer
	fi
	;;
relaysstatus ) 
	for p in $PINS; do
		[[ $( gpioget -a -c0 --numeric $p ) == 0 ]] && tf=false || tf=true
		on+=", $tf"
	done
	echo '[ '${on:1}' ]'
	;;
rotaryencoder )
	if [[ $ON ]]; then
		serviceRestartEnable
	else
		systemctl disable --now rotaryencoder
		dtoverlay -r gpio-key
		dtoverlay -r rotary-encoder
	fi
	pushRefresh
	;;
shareddatadisable )  # server rAudio / other server
	sed -i "/$( ipAddress )/ d" $filesharedip
	mv /mnt/{SD,USB} /mnt/MPD
	sed -i 's|/mnt/USB|/mnt/MPD/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
	if grep -q $dirshareddata /etc/fstab; then # other server
		fstab=$( grep -v $dirshareddata /etc/fstab )
		readarray -t source <<< $( awk '{print $2}' $dirshareddata/source )
		for s in "${source[@]}"; do
			mp=${s//\040/ }
			umount -l "$mp"
			rmdir "$mp" &> /dev/null
			fstab=$( grep -v ${mp// /\\\\040} <<< $fstab )
		done
		umount -l $dirshareddata &> /dev/null
		rm -rf $dirshareddata $dirnas/.mpdignore
	else                                       # server rAudio
		umount -l $dirnas &> /dev/null
		fstab=$( grep -v $dirnas /etc/fstab )
	fi
	sharedDataReset
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	systemctl restart mpd
	pushRefresh
	pushData refresh '{ "page": "features", "shareddata": false }'
	;;
soundprofileset )
	soundProfile
	;;
soundprofile )
	if [[ $ON ]]; then
		if [[ "$SWAPPINESS $MTU $TXQUEUELEN" == '60 1500 1000' ]]; then
			rm -f $dirsystem/soundprofile.conf
			soundProfile reset
			notify soundprofile 'Sound Profile' 'Default setting.'
		else
			soundProfile
		fi
	else
		soundProfile reset
	fi
	pushRefresh
	;;
tft )
	config=$( grep -Ev '^hdmi_force_hotplug|:rotate=' /boot/config.txt )
	sed -i 's/ fbcon=map:10 fbcon=font:ProFont6x11//' /boot/cmdline.txt
	if [[ $ON ]]; then
		sed -i '1 s/$/ fbcon=map:10 fbcon=font:ProFont6x11/' /boot/cmdline.txt
		rotate=$( getVar rotate $dirsystem/localbrowser.conf )
		config+="
hdmi_force_hotplug=1
dtoverlay=$MODEL:rotate=$rotate"
		calibrationconf=/etc/X11/xorg.conf.d/99-calibration.conf
		[[ ! -e $calibrationconf ]] && cp /etc/X11/lcd0 $calibrationconf
		sed -i 's/fb0/fb1/' /etc/X11/xorg.conf.d/99-fbturbo.conf
		systemctl enable localbrowser
	else
		sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf
	fi
	i2cset=1
	configTxt
	;;
tftcalibrate )
	rotate=$( grep rotate /boot/config.txt | cut -d= -f3 )
	cp -f /etc/X11/{lcd$rotate,xorg.conf.d/99-calibration.conf}
	systemctl stop localbrowser
	value=$( DISPLAY=:0 xinput_calibrator | grep Calibration | cut -d'"' -f4 )
	if [[ $value ]]; then
		sed -i -E 's/(Calibration" +").*/\1'$value'"/' /etc/X11/xorg.conf.d/99-calibration.conf
		systemctl start localbrowser
	fi
	;;
timezone )
	if [[ $TIMEZONE == auto ]]; then
		! ipOnline 8.8.8.8 && notify timezone 'Timezone - Auto' 'No internet connection.' && exit
# --------------------------------------------------------------------
		tz=$( curl -s -m 2 https://worldtimeapi.org/api/ip | jq -r .timezone )
		[[ ! $tz ]] && tz=$( curl -s -m 2 http://ip-api.com | grep '"timezone"' | cut -d'"' -f4 )
		[[ ! $tz ]] && tz=$( curl -s -m 2 https://ipapi.co/timezone )
		[[ ! $tz ]] && tz=UTC
		timedatectl set-timezone $tz
	else
		timedatectl set-timezone $TIMEZONE
	fi
	pushRefresh
	;;
usbconnect | usbremove ) # for /etc/conf.d/devmon - devmon@http.service
	[[ ! -e $dirshm/startup || -e $dirshm/audiocd ]] && exit
# --------------------------------------------------------------------
	list=$( lsblk -no path,vendor,model | grep -v ' $' )
	if [[ $CMD == usbconnect ]]; then
		sdx=$( dmesg \
					| tail -15 \
					| grep ' sd.* GiB' \
					| tail -1 \
					| sed -E 's/.*\[|].*//g' )
		notify usbdrive "$( lsblk -no vendor,model /dev/$sdx )" Ready
	else
		name=$( diff $dirshm/lsblkusb <( echo "$list" ) \
					| grep '^<'\
					| tr -s ' ' \
					| cut -d' ' -f3- )
		notify usbdrive "$name" Removed
	fi
	echo "$list" > $dirshm/lsblkusb
	pushData storage '{ "list": '$( $dirsettings/system-storage.sh )' }'
	pushDirCounts usb
	;;
vuled )
	enableFlagSet
	pins=$( cut -d= -f2 $dirsystem/vuled.conf )
	if [[ $ON ]]; then
		[[ ! -e $dirmpdconf/fifo.conf ]] && $dirsettings/player-conf.sh
		grep -q 'state="*play' $dirshm/status && systemctl start cava
	else
		if [[ -e $dirsystem/vumeter ]]; then
			systemctl restart cava
		else
			systemctl stop cava
			$dirsettings/player-conf.sh
		fi
	fi
	pushRefresh
	;;
wlan )
	if [[ $ON ]]; then
		! lsmod | grep -q -m1 brcmfmac && modprobe brcmfmac
		ip link set wlan0 up
		echo wlan0 > $dirshm/wlan
		iw wlan0 set power_save off
		[[ $APAUTO ]] && rm -f $dirsystem/wlannoap || touch $dirsystem/wlannoap
		if [[ $REGDOM ]] && ! grep -q $REGDOM /etc/conf.d/wireless-regdom; then
			sed -i 's/".*"/"'$REGDOM'"/' /etc/conf.d/wireless-regdom
			iw reg set $REGDOM
		fi
	else
		rmmod brcmfmac_wcc brcmfmac &> /dev/null
	fi
	pushRefresh
	[[ $( cat /sys/class/net/wlan0/operstate ) == up ]] && active=true || active=false
	pushData refresh '{ "page": "networks", "activewlan": '$active' }'
	;;
	
esac
