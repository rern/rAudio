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

dirbash=/srv/http/bash
dirdata=/srv/http/data
diraddons=$dirdata/addons
dirmpd=$dirdata/mpd
dirsystem=$dirdata/system

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
	# no on-board wireless - remove bluetooth
	revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
	[[ -e /boot/kernel8.img || ${revision: -3:2} =~ ^(08|0c|0d|0e|11)$ ]] || sed -i '/dtparam=krnbt=on/ d' /boot/config.txt
fi

if [[ -e /boot/backup.gz ]]; then
	mv /boot/backup.gz $dirdata/tmp
	$dirbash/system.sh datarestore
	reboot=1
fi
if [[ -e /boot/lcd ]]; then
	rm /boot/lcd
	if [[ ! -e $dirsystem/lcd ]]; then
		$dirbash/system.sh lcd$'\n'true
		reboot=1
	fi
fi
[[ -n $reboot ]] && shutdown -r now

if [[ -e /boot/wifi ]]; then
	ssid=$( grep '^ESSID' /boot/wifi | cut -d'"' -f2 )
	sed -i -e '/^#\|^$/ d' -e 's/\r//' /boot/wifi
	mv /boot/wifi "/etc/netctl/$ssid"
	netctl start "$ssid"
	systemctl enable netctl-auto@wlan0
fi
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py

touch $dirdata/shm/player-mpd

# onboard + usb wifi >> disable onboard
(( $( rfkill | grep wlan | wc -l ) > 1 )) && rmmod brcmfmac
# no enabled profile >> disable onboard
! systemctl -q is-enabled netctl-auto@wlan0 && ! systemctl -q is-enabled hostapd && rmmod brcmfmac &> /dev/null

[[ -e $dirsystem/soundprofile ]] && $dirbash/system soundprofile

$dirbash/mpd-conf.sh # mpd start by this script

sleep 10 # wait for network interfaces

notifyFailed() {
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"NAS", "text":"'"$1"'", "icon":"nas", "delay":-1}'
}

readarray -t mountpoints <<< $( grep /mnt/MPD/NAS /etc/fstab | awk '{print $2}' | sed 's/\\040/ /g' )
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
# after all sources connected
if [[ ! -e $dirmpd/mpd.db || $( mpc stats | awk '/Songs/ {print $NF}' ) -eq 0 ]]; then
	echo rescan > $dirsystem/updating
	mpc rescan
elif [[ -e $dirsystem/updating ]]; then
	path=$( cat $dirsystem/updating )
	[[ $path == rescan ]] && mpc rescan || mpc update "$path"
elif [[ -e $dirsystem/listing || ! -e $dirmpd/counts ]]; then
	$dirbash/cmd-list.sh &> dev/null &
fi

[[ -e $dirsystem/autoplay ]] && mpc play

if ! ifconfig | grep -q 'inet.*broadcast'; then
	systemctl -q is-enabled hostapd || $dirbash/features.sh hostapdset
	systemctl -q disable hostapd 
	exit
fi

rfkill | grep -q wlan && iw wlan0 set power_save off

wget https://github.com/rern/rAudio-addons/raw/main/addons-list.json -qO $diraddons/addons-list.json
if [[ $? == 0 ]]; then
	installed=$( ls "$diraddons" | grep -v addons-list )
	for addon in $installed; do
		verinstalled=$( cat $diraddons/$addon )
		if (( ${#verinstalled} > 1 )); then
			verlist=$( jq -r .$addon.version $diraddons/addons-list.json )
			[[ $verinstalled != $verlist ]] && count=1 && break
		fi
	done
	[[ -n $count ]] && touch $diraddons/update || rm -f $diraddons/update
fi

[[ -e /boot/startup.sh ]] && /boot/startup.sh
