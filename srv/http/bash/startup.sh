#!/bin/bash

# reset player, tmp files
# set and connect wi-fi if pre-configured (once)
# expand root partition (once)
# enable/disable wlan
# set sound profile if enabled
# set mpd-conf.sh
#   - list sound devices
#   - populate mpd.conf
#   - start mpd, mpdidle
# mount fstab
#   - verify ip
#   - verify source ip
# start hostapd if enable
# autoplay if enabled
# check addons updates
# continue mpd update if pending

dirdata=/srv/http/data
dirmpd=$dirdata/mpd
dirsystem=$dirdata/system

# 1st boot only --------------------------------------------------------------
if [[ -e /boot/expand ]]; then
	rm /boot/expand
	if (( $( sfdisk -F /dev/mmcblk0 | head -n1 | awk '{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk /dev/mmcblk0 &>/dev/null
		partprobe /dev/mmcblk0
		resize2fs /dev/mmcblk0p2
	fi
fi

if [[ -e /boot/backup.gz ]]; then
	mv /boot/backup.gz $dirdata/tmp
	/srv/http/bash/system.sh datarestore
	reboot=1
fi
if [[ -e /boot/lcd ]]; then
	rm /boot/lcd
	if [[ ! -e $dirsystem/lcd ]]; then
		/srv/http/bash/system.sh lcd$'\n'true
		reboot=1
	fi
fi
[[ -n $reboot ]] && shutdown -r now

[[ -e /boot/startup ]] && . /boot/startup && rm /boot/startup

if [[ -e /boot/wifi ]]; then
	ssid=$( grep '^ESSID' /boot/wifi | cut -d'"' -f2 )
	sed -i -e '/^#\|^$/ d' -e 's/\r//' /boot/wifi
	cp /boot/wifi "$dirsystem/netctl-$ssid"
	mv /boot/wifi "/etc/netctl/$ssid"
	chown http:http "$dirsystem/netctl-$ssid" "/etc/netctl/$ssid"
	netctl start "$ssid"
	systemctl enable netctl-auto@wlan0
fi
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && /srv/http/bash/lcdchar.py rr

touch $dirdata/shm/player-mpd

systemctl -q is-enabled netctl-auto@wlan0 && ifconfig wlan0 up || rmmod brcmfmac

[[ -e $dirsystem/soundprofile ]] && /srv/http/bash/system soundprofile

if grep -q rpi-cirrus-wm5102 /boot/config.txt; then
	card=$( aplay -l | grep snd_rpi_wsp | cut -c 6 )
	output=$( cat $dirsystem/hwmixer-wsp 2> /dev/null || echo HPOUT2 Digital )
	/srv/http/bash/mpd-wm5102.sh $card $output
fi

/srv/http/bash/mpd-conf.sh # mpd start by this script

sleep 10 # wait for network interfaces

notifyFailed() {
	echo "$1<br><br><gr>Try reboot again.</gr>" >> $dirdata/shm/reboot
	curl -s -X POST http://127.0.0.1/pub?id=reload -d 1
}

readarray -t mountpoints <<< $( grep /mnt/MPD/NAS /etc/fstab | awk '{print $2}' )
if [[ -n "$mountpoints" ]]; then
	lanip=$( ifconfig eth0 | awk '/inet / {print $2}' )
	[[ -z $lanip ]] && wlanip=$( ifconfig wlan0 | awk '/inet / {print $2}' )
	if [[ -z $lanip && -z wlanip ]]; then # wait for connection
		for (( i=0; i <= 20; i++ )); do
			wlanip=$( ifconfig | grep -A1 ^wlan0 | awk '/inet/ {print $2}' )
			[[ -n $wlanip ]] && break
			
			sleep 1
			(( i == 20 )) && notifyFailed 'Network not connected.'
		done
	fi
	for mountpoint in "${mountpoints[@]}"; do # ping target before mount
		ip=$( grep "$mountpoint" /etc/fstab | cut -d' ' -f1 | sed 's|^//||; s|:*/.*$||' )
		for (( i=0; i <= 20; i++ )); do
			ping -4 -c 1 -w 1 $ip &> /dev/null && break
			
			sleep 1
			(( i == 20 )) && notifyFailed "NAS @$ip cannot be reached."
		done
		mount "$mountpoint"
	done
fi

if [[ -n $wlanip ]] && systemctl -q is-enabled hostapd; then
	ifconfig wlan0 $( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	systemctl start dnsmasq hostapd
fi

/srv/http/bash/cmd.sh addonsupdate

# after all sources connected
if [[ ! -e $dirmpd/mpd.db || $( mpc stats | awk '/Songs/ {print $NF}' ) -eq 0 ]]; then
	/srv/http/bash/cmd.sh mpcupdate$'\n'true
elif [[ -e $dirsystem/updating ]]; then
	path=$( cat $dirsystem/updating )
	[[ $path == rescan ]] && mpc rescan || mpc update "$path"
elif [[ -e $dirsystem/listing || ! -e $dirmpd/counts ]]; then
	/srv/http/bash/cmd-list.sh &> dev/null &
elif [[ -e $dirsystem/autoplay ]]; then
	mpc play
fi
