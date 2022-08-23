#!/bin/bash

. /srv/http/bash/common.sh

# wifi - on-board or usb
wlandev=$( $dirbash/settings/networks.sh wlandevice )

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ ${partition:0:7} == /dev/sd ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
	# no on-board wireless - remove bluetooth
	hwrevision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
	[[ ${hwrevision: -3:2} =~ ^(00|01|02|03|04|09)$ ]] && sed -i '/dtparam=krnbt=on/ d' /boot/config.txt
fi

if [[ -e /boot/backup.gz ]]; then
	if bsdtar tf backup.gz | grep -q ^data/system/$; then
		mv /boot/backup.gz $dirdata/tmp
		$dirbash/settings/system.sh datarestore
	else
		restorefailed=1
	fi
fi

if [[ -e /boot/wifi && $wlandev ]]; then
	! grep -q $wlandev /boot/wifi && sed -i "s/^\(Interface=\).*/\1$wlandev/" /boot/wifi
	ssid=$( grep '^ESSID' /boot/wifi | cut -d'"' -f2 )
	sed -i -e '/^#\|^$/ d' -e 's/\r//' /boot/wifi
	mv -f /boot/wifi "/etc/netctl/$ssid"
	$dirbash/settings/networks.sh profileconnect$'\n'"$ssid"
fi
# ----------------------------------------------------------------------------

connectedCheck() {
	for (( i=0; i < $1; i++ )); do
		ifconfig | grep -q 'inet.*broadcast' && connected=1 && break
		sleep $2
	done
}

echo mpd > $dirshm/player
mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
touch $dirshm/status

# wait 5s max for lan connection
connectedCheck 5 1
# if lan not connected, wait 30s max for wi-fi connection
[[ ! $connected ]] && connectedCheck 30 3
# if wlan not connected, try connect with saved profile
if [[ ! $connected && $wlandev ]] && ! systemctl -q is-enabled hostapd; then
	devprofile=$( grep -rl $wlandev /etc/netctl | head -1 )
	if [[ $devprofile ]]; then
		$dirbash/settings/networks.sh "profileconnect
$( basename "$devprofile" )"
		connectedCheck 30 3
	fi
fi

[[ $connected  ]] && readarray -t nas <<< $( ls -d1 /mnt/MPD/NAS/*/ 2> /dev/null | sed 's/.$//' )
if [[ $nas ]]; then
	for mountpoint in "${nas[@]}"; do # ping target before mount
		ip=$( grep "${mountpoint// /\\\\040}" /etc/fstab \
				| cut -d' ' -f1 \
				| sed 's|^//||; s|:*/.*$||' )
		for i in {1..10}; do
			if ping -4 -c 1 -w 1 $ip &> /dev/null; then
				mount "$mountpoint" && break
			else
				(( i == 10 )) && pushstreamNotifyBlink NAS "NAS @$ip cannot be reached." nas
				sleep 2
			fi
		done
	done
fi
if grep -q /srv/http/shareddata /etc/fstab; then
	shareddata=1
	mount /srv/http/shareddata
	for i in {1..5}; do
		sleep 1
		[[ -d $dirmpd ]] && break
	done
fi

[[ -e /boot/startup.sh ]] && . /boot/startup.sh

$dirbash/settings/player-conf.sh # mpd.service started by this script

# after all sources connected

if [[ -e $dirsystem/lcdchar ]]; then
	$dirbash/lcdcharinit.py
	$dirbash/lcdchar.py logo
fi
[[ -e $dirsystem/mpdoled ]] && $dirbash/cmd.sh mpdoledlogo

[[ -e $dirsystem/soundprofile ]] && $dirbash/settings/system.sh soundprofile

[[ -e $dirsystem/autoplay ]] && mpc play || $dirbash/status-push.sh

file=/sys/class/backlight/rpi_backlight/brightness
if [[ -e $file ]]; then
	chmod 666 $file
	[[ -e $dirsystem/brightness ]] && cat $dirsystem/brightness > $file
fi

if [[ $connected ]]; then
	: >/dev/tcp/8.8.8.8/53 && $dirbash/cmd.sh addonsupdates
elif [[ ! -e $dirsystem/wlannoap && $wlandev ]] && ! systemctl -q is-enabled hostapd; then
	$dirbash/settings/features.sh hostapdset
	systemctl -q disable hostapd
fi

lsmod | grep -q brcmfmac && touch $dirshm/onboardwlan
[[ $( rfkill -no type | grep -c wlan ) > 1 ]] && usbwifi=1
profiles=$( netctl list )
systemctl -q is-active hostapd && hostapd=1
[[ $usbwifi || ( ! $profiles && ! $hostapd ) ]] && rmmod brcmfmac &> /dev/null

if [[ -e $dirsystem/hddspindown ]]; then
	usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
	if [[ $usb ]]; then
		duration=$( cat $dirsystem/hddspindown )
		readarray -t usb <<< "$usb"
		for dev in "${usb[@]}"; do
			grep -q 'APM.*not supported' <<< $( hdparm -B $dev ) && continue
			
			hdparm -q -B 127 $dev
			hdparm -q -S $duration $dev
		done
	fi
fi

if [[ ! $shareddata && ! -e $dirmpd/mpd.db ]]; then
	if [[ ! -z $( ls /mnt/MPD/NAS ) || ! -z $( ls /mnt/MPD/SD ) || ! -z $( ls /mnt/MPD/USB ) ]]; then
		$dirbash/cmd.sh$'\n'rescan
	fi
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh$'\n'"$( cat $dirmpd/updating )"
elif [[ -e $dirmpd/listing || ! -e $dirmpd/counts ]]; then
	$dirbash/cmd-list.sh &> dev/null &
fi

[[ $restorefailed ]] && pushstreamNotify 'Restore Settings' '<code>/boot/backup.gz</code> is not rAudio backup.' restore 10000
