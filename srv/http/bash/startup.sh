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

pushNotify() {
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"NAS", "text":"'"$1"'", "icon":"nas", "delay":-1}'
}

revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
[[ ${revision: -3:2} =~ ^(08|0c|0d|0e|11)$ ]] && onboardwireless=1

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	dev=${partition:0:-2}
	[[ $dev == /dev/sd ]] && dev=${partition:0:-1}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
	# no on-board wireless - remove bluetooth
	[[ -z $onboardwireless ]] && sed -i '/dtparam=krnbt=on/ d' /boot/config.txt
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
[[ -n $reboot ]] && reboot

if [[ -e /boot/wifi ]]; then
	readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
	ssid=$( grep '^ESSID' /boot/wifi | cut -d'"' -f2 )
	sed -i -e '/^#\|^$/ d' -e 's/\r//' /boot/wifi
	mv /boot/wifi "/etc/netctl/$ssid"
	ifconfig wlan0 down
	netctl switch-to "$ssid"
	netctl enable "$ssid"
fi
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py

touch $dirdata/shm/player-mpd
chown http:http $dirdata/shm/player-mpd # allow upmpdcli to write
chmod 777 $dirdata/shm/player-mpd

[[ -e $dirsystem/soundprofile ]] && $dirbash/system soundprofile

$dirbash/mpd-conf.sh # mpd.service start by this script

# ( no profile && no hostapd ) || usb wifi > disable onboard
readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
systemctl -q is-enabled hostapd && hostapd=1
(( $( rfkill | grep wlan | wc -l ) > 1 )) && usbwifi=1
if [[ -z $profiles && -z $hostapd ]] || [[ -n $usbwifi ]]; then
	rmmod brcmfmac &> /dev/null
fi
if [[ -z $onboardwireless ]]; then # usb bluetooth
	rfkill | grep -q bluetooth && systemctl enable --now bluetooth || systemctl disable --now bluetooth
fi

if ifconfig | grep -q 'inet.*broadcast'; then
	connected=1
elif [[ -n $profiles && -z $hostapd ]]; then # wait for wi-fi connection
	for i in {1..30}; do
		sleep 3
		ifconfig | grep -q 'inet.*broadcast' && connected=1 && break
	done
fi

[[ -n $connected  ]] && readarray -t nas <<< $( ls -d1 /mnt/MPD/NAS/*/ 2> /dev/null | sed 's/.$//' )
if [[ -n $nas ]]; then
	for mountpoint in "${nas[@]}"; do # ping target before mount
		ip=$( grep "${mountpoint// /\\\\040}" /etc/fstab \
				| cut -d' ' -f1 \
				| sed 's|^//||; s|:*/.*$||' )
		for i in {1..10}; do
			if ping -4 -c 1 -w 1 $ip &> /dev/null; then
				mount "$mountpoint" && break
			else
				(( i == 10 )) && pushNotify "NAS @$ip cannot be reached."
				sleep 2
			fi
		done
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

if [[ -z $connected]]; then
	[[ -e $dirsystem/wlannoap ]] && exit
	
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

if [[ -e /boot/startup.sh ]]; then
	/boot/startup.sh
fi
