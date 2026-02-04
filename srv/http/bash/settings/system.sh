#!/bin/bash

. /srv/http/bash/common.sh

file_cmdline=/boot/cmdline.txt
file_config=/boot/config.txt
file_module=/etc/modules-load.d/raspberrypi.conf

args2var "$1"

configReboot() {
	pushData reboot '{ "id": "'$CMD'" }'
	name=$( sed -n "/'id'.*'$CMD'/ {n; s/.* => *'//; s/'//; p}" /srv/http/settings/system.php )
	appendSortUnique $dirshm/reboot ', "'$CMD'": "'$name'"'
}
configTxt() { # each $CMD removes each own lines > reappends if enable or changed
	local chip i2clcdchar i2cmpdoled module spimpdoled tft
	tmp_cmdline=/tmp/cmdline.txt
	tmp_config=/tmp/config.txt
	tmp_module=/tmp/raspberrypi.conf
	if [[ ! -e $tmp_config ]]; then # files at boot for comparison
		for f in $file_cmdline $file_config $file_module; do
			[[ -s $f ]] && grep -Ev '^#|^\s*$' $f | sort -u > /tmp/$( basename $f )
		done
	fi
	[[ ! $config ]] && config=$( < $file_config )
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
		
		module=$( grep -Evs 'i2c-bcm2708|i2c-dev|snd-soc-wm8960|^#|^\s*$' $file_module )
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
		[[ $module ]] && sort -u <<< $module | awk NF > $file_module || rm -f $file_module
	fi
	if [[ $poweraudiophonic ]]; then
		config+="
dtoverlay=gpio-poweroff,gpiopin=22
dtoverlay=gpio-shutdown,gpio_pin=17,active_low=0,gpio_pull=down"
	else
		config=$( grep -Ev 'gpio-poweroff|gpio-shutdown' <<< $config )
	fi
	awk NF <<< $config | sort -u > $file_config
	pushRefresh
	if [[ ! $reboot ]]; then
		if ! cmp -s $tmp_config $file_config || ! cmp -s $tmp_cmdline $file_cmdline; then
			reboot=1
		else
			count=$( ls $tmp_module $file_module | wc -l )
			(( $count == 1 )) || ( (( $count == 2 )) && ! cmp -s $tmp_module $file_module ) && reboot=1
		fi
	fi
	if [[ $reboot ]]; then
		configReboot
	elif [[ -e $dirshm/reboot ]]; then
		sed -i '/^, "'$CMD'"/ d' $dirshm/reboot
		[[ ! $( awk NF $dirshm/reboot ) ]] && rm -f $dirshm/reboot
	fi
}
displayConfigClear() {
	fbcon='fbcon=map:10 fbcon=font:ProFont6x11'
	video='vt.global_cursor_default=0 video=DSI-1:720x1280@60,rotate=180'
	sed -i -E "s/ $fbcon| $video//g" $file_cmdline
	sed -i -E '/hdmi_.*_hotplug|:rotate=|display_auto_detect|dtoverlay=vc4-kms.*/ d' $file_config
	sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf
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
	lan=$( lanDevice )
	if [[ $lan ]]; then
		ip link set $lan mtu $mtu
		ip link set $lan txqueuelen $txqueuelen
	fi
}

case $CMD in

audio )
	enableFlagSet
	if [[ $ON ]] ; then
		config="$( < $file_config )
dtparam=audio=on"
	else
		config=$( grep -v ^dtparam=audio=on $file_config )
	fi
	configTxt
	;;
bluetooth )
	touch $dirshm/btonoff
	inOutputConf device.*bluealsa && bluealsa=1
	if [[ $ON ]]; then
		rm -f $dirsystem/btdisable
		btdiscoverable=$dirsystem/btdiscoverable
		if [[ $DISCOVERABLE ]]; then
			[[ ! -e $btdiscoverable ]] && discov=yes && touch $btdiscoverable
		else
			[[ -e $btdiscoverable ]] && discov=no && rm -f $btdiscoverable
		fi
		if systemctl -q is-active bluetooth; then
			[[ $discov ]] && bluetoothctl discoverable $discov &> /dev/null
		else
			[[ ! -e /boot/kernel8.img ]] && configReboot && exit # fix: not aarch64 - bluez not reinit hci0
# --------------------------------------------------------------------
			modprobe -a bluetooth bnep btbcm hci_uart
			sleep 1
			systemctl start bluetooth
		fi
		if [[ $bluealsa ]]; then
			btformat=$dirsystem/btformat
			if [[ $FORMAT ]]; then
				[[ ! -e $btformat ]] && touch $btformat && $dirsettings/player-conf.sh
			else
				[[ -e $btformat ]] && rm -f $btformat && $dirsettings/player-conf.sh
			fi
		fi
	else
		touch $dirsystem/btdisable
		systemctl stop bluetooth
		rmmod hci_uart btbcm bnep bluetooth 2> /dev/null
		rm -f $dirshm/{btdevice,btreceiver,btsender}
		[[ $bluealsa ]] && $dirsettings/player-conf.sh
	fi
	rfkill | grep -q -m1 bluetooth && tf=true || tf=false
	pushData refresh '{ "page": "networks", "activebt": '$tf' }'
	rm $dirshm/btonoff
	pushRefresh
	;;
bluetoothstart )
	sleep 3
	[[ -e $dirsystem/btdiscoverable ]] && discov=yes || discov=no
	bluetoothctl discoverable $discov &> /dev/null
	bluetoothctl discoverable-timeout 0 &> /dev/null
	bluetoothctl pairable yes &> /dev/null
	;;
forget | mount | unmount )
	[[ $CMD != mount ]] && systemctl restart mpd
	dir=${MOUNTPOINT:9:3}
	if [[ $CMD == mount ]]; then
		if [[ $dir == NAS ]]; then
			mount "$MOUNTPOINT"
		elif [[ $dir == USB ]]; then
			udevil mount $SOURCE
		else # nvme / sata
			mkdir -p $MOUNTPOINT
			fstab="\
$( < /etc/fstab )
$SOURCE  $MOUNTPOINT  ext4 defaults,noatime  0  0"
			column -t <<< $fstab > /etc/fstab
			systemctl daemon-reload
			mount -a
		fi
	else
		[[ $dir == USB ]] && udevil umount -l "$MOUNTPOINT" || umount -l "$MOUNTPOINT"
		[[ $dir == NVME || $dir == SATA ]] && rm -f $MOUNTPOINT
	fi
	if [[ $CMD == forget ]]; then
		rmdir "$MOUNTPOINT" &> /dev/null
		fstab=$( grep -v ${MOUNTPOINT// /\\\\040} /etc/fstab )
		column -t <<< $fstab > /etc/fstab
		systemctl daemon-reload
		$dirbash/cmd.sh "mpcupdate
update
NAS
CMD ACTION PATHMPD"
	fi
	pushRefresh
	;;
format )
	if [[ $UNPART ]]; then
		echo -e "g\nn\np\n1\n\n\nw" | fdisk $DEV &>/dev/null
		blk=$( blkid | grep ^$DEV )
		DEV=${blk/:*}
	fi
	echo $DEV > $dirshm/formatting
	umount -l $DEV
	mkfs.ext4 -F $DEV -L "$LABEL"
	rm -f $dirshm/formatting
	pushRefresh
	;;
gpiotoggle )
	gpioset -t0 -c0 $PIN
	;;
hddapm )
	hdparm -q -B $LEVEL $DEV
	hdparm -q -S $LEVEL $DEV
	pushRefresh
	;;
hostname )
	hostnamectl hostname $NAME
	sed -i -E 's/(name = ").*/\1'$NAME'"/' /etc/shairport-sync.conf
	sed -i -E 's/^(friendlyname = ).*/\1'$NAME'/' /etc/upmpdcli.conf
	systemctl try-restart avahi-daemon bluetooth localbrowser mpd smb shairport-sync shairport spotifyd upmpdcli
	nameprev=$( ls /var/lib/iwd/ap | head -1 )
	mv /var/lib/iwd/ap/{$nameprev,$NAME.ap}
	[[ -e $dirsystem/ap ]] && $dirsettings/features.sh iwctlap
	pushData refresh '{ "page": "system", "hostname": "'$NAME'" }'
	;;
i2seeprom )
	if [[ $ON ]]; then
		config="$( < $file_config )
force_eeprom_read=0"
	else
		config=$( grep -v ^force_eeprom_read $file_config )
	fi
	configTxt
	;;
i2smodule )
	prevaplayname=$( getContent $dirsystem/audio-aplayname )
	cirrusconf=/etc/modprobe.d/cirrus.conf
	config=$( grep -Ev "^dtparam=i2s=on|^dtoverlay=$prevaplayname|gpio=25=op,dh|^dtparam=audio=on" $file_config )
	if [[ $APLAYNAME ]]; then
		config+="
dtparam=i2s=on
dtoverlay=$APLAYNAME"
		[[ $OUTPUT == 'Pimoroni Audio DAC SHIM' ]] && config+="
gpio=25=op,dh"
		! grep -q gpio-shutdown $file_config && systemctl disable --now powerbutton
		echo $APLAYNAME > $dirsystem/audio-aplayname
		echo $OUTPUT > $dirsystem/audio-output
		if [[ $APLAYNAME == cirrus-wm5102 ]]; then
			[[ ! -e $cirrusconf ]] && echo softdep arizona-spi pre: arizona-ldo1 > $cirrusconf
			echo $OUTPUTTYPE > $dirsystem/audio-wm5102
			aplay -l | grep -q wm5102 && $dirsettings/player-wm5102.sh "$OUTPUTTYPE"
		else
			rm -f $cirrusconf
			[[ $APLAYNAME == wm8960-soundcard ]] && i2cset=1
		fi
	else
		config+="
dtparam=audio=on"
		rm -f $dirsystem/audio-{aplayname,output} $cirrusconf
	fi
	configTxt
	;;
lcdchar )
	if [[ ! $ACTION ]]; then
		enableFlagSet
		i2cset=1
		configTxt
		ACTION=logo
	fi
	systemctl stop lcdchar
	$dirbash/lcdchar.py $ACTION
	;;
mirror )
	[[ $MIRROR ]] && MIRROR+=.
	echo 'Server = http://'$MIRROR'mirror.archlinuxarm.org/$arch/$repo' > /etc/pacman.d/mirrorlist
	pushRefresh
	;;
monitor )
	displayConfigClear
	if [[ $MODEL == rpidisplay2 ]]; then
		if [[ $ON ]]; then
			sed -i "s/$/ $video/" $file_cmdline
			sed -i '/hdmi_force_hotplug/ d' $file_config
			echo "\
hdmi_ignore_hotplug=1
display_auto_detect=1
dtoverlay=vc4-kms-v3d
dtoverlay=vc4-kms-dsi-ili9881-5inch" >> $file_config
		systemctl enable localbrowser
		fi
		configTxt
		exit
# --------------------------------------------------------------------
	fi
	if [[ $ON ]]; then
		sed -i "1 s/$/ $fbcon/" $file_cmdline
		rotate=$( getVar rotate $dirsystem/localbrowser.conf )
		echo "\
hdmi_force_hotplug=1
dtoverlay=$MODEL:rotate=$rotate" >> $file_config
		calibrationconf=/etc/X11/xorg.conf.d/99-calibration.conf
		[[ ! -e $calibrationconf ]] && cp /etc/X11/lcd0 $calibrationconf
		sed -i 's/fb0/fb1/' /etc/X11/xorg.conf.d/99-fbturbo.conf
		systemctl enable localbrowser
	fi
	i2cset=1
	configTxt
	;;
mpdoled )
	enableFlagSet
	if [[ $ON ]]; then
		opt=$( sed 's/ -X//' /etc/default/mpd_oled )
		chip=$( cut -d' ' -f2 <<< $opt )
		baud=$( sed -n '/baudrate/ {s/.*=//; p}' /boot/config.txt )
		[[ $chip != $CHIP ]] && opt=$( sed 's/-o ./-o '$CHIP'/' <<< $opt )
		[[ $SPECTRUM ]] && opt=$( sed 's/"$/ -X"/' <<< $opt )
		[[ $baud != $BAUD ]] && sed -i -E 's/(baudrate=).*/\1'$BAUD'/' /boot/config.txt
		echo "$opt" > /etc/default/mpd_oled
	fi
	fifoToggle
	i2cset=1
	configTxt
	;;
ntp )
	echo "\
[Time]
NTP=$NTP" > /etc/systemd/timesyncd.conf
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
	if [[ ! -e $dirshm/relayson ]]; then
		if [[ $ON ]]; then
			pins="$( getVar on $dirsystem/relays.conf ) "
			gpioset -t0 -c0 ${pins// /=0 }
		fi
		exit
# --------------------------------------------------------------------
	fi
	if grep -q timeron=true $dirsystem/relays.conf; then
		$dirbash/relays-timer.sh &> /dev/null &
	else
		killProcess relaystimer
	fi
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
	$dirbash/cmd.sh mpcremove
	systemctl stop mpd
	sed -i "/$( ipAddress )/ d" $filesharedip
	mv /mnt/{SD,USB} /mnt/MPD
	sed -i 's|/mnt/USB|/mnt/MPD/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
	if ! grep -q "$dirnas " /etc/fstab; then # other server
		fstab=$( grep -v $dirshareddata /etc/fstab )
		readarray -t source <<< $( awk '{print $2}' $dirshareddata/source )
		while read s; do
			mp=${s//\040/ }
			umount -l "$mp"
			rmdir "$mp" &> /dev/null
			fstab=$( grep -v ${mp// /\\\\040} <<< $fstab )
		done <<< $source
		umount -l $dirshareddata &> /dev/null
		rm -rf $dirshareddata $dirnas/.mpdignore
	else                                       # server rAudio
		umount -l $dirnas &> /dev/null
		fstab=$( grep -v $dirnas /etc/fstab )
	fi
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	sharedDataReset
	systemctl start mpd
	pushRefresh
	pushData refresh '{ "page": "features", "shareddata": false }'
	pushDirCounts nas
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
templimit )
	config=$( grep -v ^temp_soft_limit $file_config )
	if [[ $ON ]]; then
		config+="
temp_soft_limit=$DEGREE"
	fi
	configTxt
	;;
tftcalibrate )
	rotate=$( grep rotate $file_config | cut -d= -f3 )
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
usbconnect | usbremove ) # for /etc/conf.d/devmon - devmon@http.service, /etc/udev/rules.d/ntfs.rules
	[[ ! -e $dirshm/startup || -e $dirshm/audiocd ]] && exit
# --------------------------------------------------------------------
	list=$( lsblk -no path,vendor,model | grep -v ' $' )
	if [[ $CMD == usbconnect ]]; then
		sdx=$( dmesg \
					| tail \
					| awk -F '[][]' '/ sd .* \[sd.] / {print $4}' \
					| tail -1 )
		notify usbdrive "$( lsblk -no vendor,model /dev/$sdx )" Ready
	else
		name=$( diff $dirshm/lsblkusb <( echo "$list" ) \
					| grep '^<'\
					| tr -s ' ' \
					| cut -d' ' -f3- )
		notify usbdrive "$name" Removed
	fi
	echo "$list" > $dirshm/lsblkusb
	pushStorage
	pushDirCounts usb
	;;
vuled )
	enableFlagSet
	[[ $PINS ]] && echo $PINS > $dirsystem/vuled.conf
	if [[ $ON ]]; then
		pins="$( < $dirsystem/vuled.conf ) "
		gpioset -t0 -c0 ${pins// /=0 }
	fi
	fifoToggle
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
			echo 'WIRELESS_REGDOM="'$REGDOM'"' > /etc/conf.d/wireless-regdom
			iw reg set $REGDOM
		fi
	else
		wlanOnboardDisable
	fi
	pushRefresh
	[[ $( cat /sys/class/net/wlan0/operstate ) == up ]] && active=true || active=false
	pushData refresh '{ "page": "networks", "activewlan": '$active' }'
	;;
	
esac
