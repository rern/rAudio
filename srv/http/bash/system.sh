#!/bin/bash

dirdata=/srv/http/data
dirsystem=$dirdata/system
dirtmp=$dirdata/shm
filebootlog=$dirtmp/bootlog
filereboot=$dirtmp/reboot
fileconfig=/boot/config.txt
filemodule=/etc/modules-load.d/raspberrypi.conf

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "system" }'
}

case ${args[0]} in

bluetoothdisable )
	sed -i '/dtparam=krnbt=on/ d' $fileconfig
	systemctl disable --now bluetooth
	pushRefresh
	;;
bluetoothset )
	if [[ ${args[1]} == true ]]; then
		yesno=yes
		touch $dirsystem/bluetoothdiscover
	else
		yesno=no
		rm $dirsystem/bluetoothdiscover
	fi
	if ! grep -q 'dtparam=krnbt=on' $fileconfig; then
		sed -i '$ a\dtparam=krnbt=on' $fileconfig
		echo "${args[2]}" > $filereboot
		systemctl enable bluetooth
	else
		systemctl enable --now bluetooth
		bluetoothctl discoverable $yesno
	fi
	sleep 3
	pushRefresh
	;;
databackup )
	netctl=${args[1]}
	dirconfig=$dirdata/config
	backupfile=$dirdata/tmp/backup.gz
	rm -f $backupfile
	files=(
/boot/cmdline.txt
/boot/config.txt
/etc/conf.d/wireless-regdom
/etc/default/snapclient
/etc/fstab
/etc/hostapd/hostapd.conf
/etc/lcdchar.conf
/etc/localbrowser.conf
/etc/mpd.conf
/etc/mpdscribble.conf
/etc/netctl/*
/etc/relays.conf
/etc/samba/smb.conf
/etc/soundprofile.conf
/etc/spotifyd.conf
/etc/systemd/network/eth0.network
/etc/systemd/timesyncd.conf
/etc/X11/xorg.conf.d/99-calibration.conf
/etc/X11/xorg.conf.d/99-raspi-rotate.conf
)
	for file in ${files[@]}; do
		mkdir -p $dirconfig/$( dirname $file )
		cp {,$dirconfig}$file 2> /dev/null
	done
	[[ -n $netctl ]] && cp "/etc/netctl/$netctl" $dirconfig/boot/wifi
	
	services='bluetooth hostapd localbrowser mpdscribble shairport-sync smb snapclient snapserver spotifyd upmpdcli'
	for service in $services; do
		systemctl -q is-active $service && enable+=" $service"
	done
	[[ -n $enable ]] && echo $enable > $dirsystem/enable
	
	bsdtar \
		--exclude './addons' \
		--exclude './embedded' \
		--exclude './shm' \
		--exclude './system/version' \
		--exclude './tmp' \
		-czf $backupfile \
		-C /srv/http \
		data \
		2> /dev/null && echo 1
	
	rm -rf $dirdata/{config,enable}
	;;
hostname )
	hostname=${args[1]}
	hostnamectl set-hostname $hostname
	sed -i "s/^\(ssid=\).*/\1${args[1]}/" /etc/hostapd/hostapd.conf
	sed -i '/^\tname =/ s/".*"/"'$hostname'"/' /etc/shairport-sync.conf
	sed -i "s/^\(friendlyname = \).*/\1${args[1]}/" /etc/upmpdcli.conf
	rm -f /root/.config/chromium/SingletonLock
	systemctl daemon-reload
	systemctl try-restart avahi-daemon hostapd mpd smb shairport-sync shairport-meta upmpdcli
	systemctl -q is-active bluetooth && bluetoothctl system-alias $hostname &> /dev/null
	echo $hostname > $dirsystem/hostname
	pushRefresh
	;;
i2smodule )
	aplayname=${args[1]}
	output=${args[2]}
	reboot=${args[3]}
	dtoverlay=$( grep 'dtparam=i2c_arm=on\|dtparam=krnbt=on\|dtparam=spi=on\|dtoverlay=gpio\|dtoverlay=sdtweak,poll_once\|dtoverlay=tft35a\|hdmi_force_hotplug=1' $fileconfig )
	sed -i '/dtparam=\|dtoverlay=\|^$/ d' $fileconfig
	[[ -n $dtoverlay ]] && sed -i '$ r /dev/stdin' $fileconfig <<< "$dtoverlay"
	if [[ ${aplayname:0:7} != bcm2835 ]]; then
		lines="\
dtparam=audio=off
dtparam=i2s=on
dtoverlay=${args[1]}"
		sed -i '$ r /dev/stdin' $fileconfig <<< "$lines"
	else
		sed -i '$ a\dtparam=audio=on' $fileconfig
	fi
	echo $aplayname > $dirsystem/audio-aplayname
	echo $output > $dirsystem/audio-output
	echo "$reboot" > $filereboot
	pushRefresh
	;;
lcd )
	enable=${args[1]}
	reboot=${args[2]}
	if [[ $enable == true ]]; then
		sed -i '1 s/$/ fbcon=map:10 fbcon=font:ProFont6x11/' /boot/cmdline.txt
		config="\
hdmi_force_hotplug=1
dtparam=spi=on
dtoverlay=tft35a:rotate=0"
		! grep -q 'dtparam=i2c_arm=on' $fileconfig && config+="
dtparam=i2c_arm=on"
		echo -n "$config" >> $fileconfig
		! grep -q 'i2c-bcm2708' $filemodule && echo -n "\
i2c-bcm2708
i2c-dev
" >> $filemodule
		cp -f /etc/X11/{lcd0,xorg.conf.d/99-calibration.conf}
		sed -i 's/fb0/fb1/' /etc/X11/xorg.conf.d/99-fbturbo.conf
	else
		sed -i '1 s/ fbcon=map:10 fbcon=font:ProFont6x11//' /boot/cmdline.txt
		sed -i '/hdmi_force_hotplug\|i2c_arm=on\|spi=on\|tft35a/ d' $fileconfig
		sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
		sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf
	fi
	echo "$reboot" > $filereboot
	pushRefresh
	;;
lcdcalibrate )
	degree=$( grep rotate $fileconfig | cut -d= -f3 )
	cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
	systemctl stop localbrowser
	value=$( DISPLAY=:0 xinput_calibrator | grep Calibration | cut -d'"' -f4 )
	if [[ -n $value ]]; then
		sed -i "s/\(Calibration\"  \"\).*/\1$value\"/" /etc/X11/xorg.conf.d/99-calibration.conf
		systemctl start localbrowser
	fi
	;;
lcdchardisable )
	if [[ ! -e $dirsystem/lcd ]]; then
		sed -i '/dtparam=i2c_arm=on/ d' $fileconfig
		sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
	fi
	pushRefresh
	;;
lcdcharset )
	val=( ${args[1]} )
	reboot=${args[2]}
	if (( ${#val[@]} > 2 )); then
		if ! grep -q 'dtparam=i2c_arm=on' $fileconfig; then
			sed -i '$ a\dtparam=i2c_arm=on' $fileconfig
			echo "\
i2c-bcm2708
i2c-dev" >> $filemodule
			echo "$reboot" > $filereboot
		fi
	else
		if ! grep -q tft35a $fileconfig; then
			sed -i '/dtparam=i2c_arm=on/ d' $fileconfig
			sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
		fi
	fi
	echo -n "\
[var]
cols=${val[0]}
charmap=${val[1]}
address=${val[2]}
chip=${val[3]}
" > /etc/lcdchar.conf
	pushRefresh
	;;
onboardaudio )
	[[ ${args[1]} == true ]] && onoff=on || onoff=off
	sed -i "s/\(dtparam=audio=\).*/\1$onoff/" $fileconfig
	echo "${args[2]}" > $filereboot
	pushRefresh
	;;
onboardwlan )
	if [[ ${args[1]} == true ]]; then
		modprobe brcmfmac
		systemctl enable --now netctl-auto@wlan0
	else
		systemctl disable --now netctl-auto@wlan0
		rmmod brcmfmac
	fi
	pushRefresh
	;;
regional )
	ntp=${args[1]}
	regom=${args[2]}
	sed -i "s/^\(NTP=\).*/\1$ntp/" /etc/systemd/timesyncd.conf
	sed -i 's/".*"/"'$regdom'"/' /etc/conf.d/wireless-regdom
	iw reg set $regdom
	pushRefresh
	;;
relays )
	[[ ${args[1]} == true ]] && touch $dirsystem/relays || rm -f $dirsystem/relays
	pushRefresh
	;;
soundprofiledisable )
	/srv/http/soundprofile.sh reset
	pushRefresh
	;;
soundprofileget )
	val+=$( sysctl kernel.sched_latency_ns )$'\n'
	val+=$( sysctl vm.swappiness )$'\n'
	if ifconfig | grep -q eth0; then
		val+=$( ifconfig eth0 | awk '/mtu/ {print "mtu = "$NF}' )$'\n'
		val+=$( ifconfig eth0 | awk '/txqueuelen/ {print "txqueuelen = "$4}' )$'\n'
	fi
	echo "${val:0:-1}"
	;;
soundprofileset )
	values=${args[1]}
	if [[ $values == '18000000 60 1500 1000' || $values == '18000000 60' ]]; then
		/srv/http/soundprofile.sh reset
	else
		val=( echo $values )
		echo -n "\
latency=${val[0]}
swappiness=${val[1]}
mtu=${val[2]}
txqueuelen=${val[3]}
" > /etc/soundprofile.conf
		/srv/http/soundprofile.sh
	fi
	pushRefresh
	;;
statusbootlog )
	if [[ -e $filebootlog ]]; then
		cat $filebootlog
	else
		journalctl -b | sed -n '1,/Startup finished.*kernel/ p' | tee $filebootlog
	fi
	;;
statusonboard )
	ifconfig
	if systemctl -q is-active bluetooth; then
		echo '<hr>'
		bluetoothctl show | sed 's/^\(Controller.*\)/bluetooth: \1/'
	fi
	;;
timezone )
	timezone=${args[1]}
	timedatectl set-timezone $timezone
	echo $timezone > $dirsystem/timezone
	pushRefresh
	;;
	
esac
