#!/bin/bash

configReboot() {
	[[ $ON ]] && pushData reboot '{ "id": "'$CMD'" }'
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
			! compgen -G /dev/i2c* &> /dev/null && reboot=1
		elif grep -q wm8960-soundcard <<< $config; then
			module+='
i2c-dev
snd-soc-wm8960'
		fi
		[[ $module ]] && sort -u <<< $module | awk NF > $file_module || rm -f $file_module
	fi
	if [[ $poweraudiophonic ]]; then
		config+='
dtoverlay=gpio-poweroff,gpiopin=22
dtoverlay=gpio-shutdown,gpio_pin=17,active_low=0,gpio_pull=down'
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
dmesgDev() {
	dmesg \
		| tail \
		| awk -F '[][]' '/ sd .* \[sd.] / {print $4}' \
		| tail -1
}
pushStorage() {
	pushData storage '{ "page": "system", "storage"  : '$( $dirsettings/system-storage.sh )' }'
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
	lan=$( netDevice e )
	if [[ $lan ]]; then
		ip link set $lan mtu $mtu
		ip link set $lan txqueuelen $txqueuelen
	fi
}
usbVendorModel() {
	lsblk -no PATH,VENDOR,MODEL | grep -v '\s$'
}
