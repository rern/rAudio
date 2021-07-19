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

connectedCheck() {
	for (( i=0; i < $1; i++ )); do
		ifconfig | grep -q 'inet.*broadcast' && connected=1 && break
		sleep $2
	done
}
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
lcd=$( ls /boot/lcd* 2> /dev/null )
if [[ -n $lcd ]]; then
	model=${lcd/*lcd}
	[[ -z $model ]] && model=tft35a
	rm /boot/lcd*
	$dirbash/system.sh lcdset$'\n'$model
	systemctl enable localbrowser
	reboot=1
fi

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

[[ -e $dirsystem/soundprofile ]] && $dirbash/system soundprofile

$dirbash/mpd-conf.sh # mpd.service started by this script

if [[ -e $dirsystem/lcdchar ]]; then
	$dirbash/lcdcharinit.py
	$dirbash/cmd-pushstatus.sh
fi
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

# wait 5s max for lan connection
connectedCheck 5 1
# if lan not connected, wait 30s max for wi-fi connection
[[ -z $connected && -n $profiles && -z $hostapd ]] && connectedCheck 30 3

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

[[ -e /boot/startup.sh ]] && /boot/startup.sh

# after all sources connected
if [[ ! -e $dirmpd/mpd.db || $( mpc stats | awk '/Songs/ {print $NF}' ) -eq 0 ]]; then
	echo rescan > $dirsystem/updating
	mpc -q rescan
elif [[ -e $dirsystem/updating ]]; then
	path=$( cat $dirsystem/updating )
	[[ $path == rescan ]] && mpc -q rescan || mpc -q update "$path"
elif [[ -e $dirsystem/listing || ! -e $dirmpd/counts ]]; then
	$dirbash/cmd-list.sh &> dev/null &
fi

[[ -e $dirsystem/autoplay ]] && mpc play

if [[ -z $connected ]]; then
	if [[ ! -e $dirsystem/wlannoap ]]; then
		modprobe brcmfmac &> /dev/null 
		systemctl -q is-enabled hostapd || $dirbash/features.sh hostapdset
		systemctl -q disable hostapd
	fi
	exit
fi

rfkill | grep -q wlan && iw wlan0 set power_save off

$dirbash/cmd.sh addonsupdates
