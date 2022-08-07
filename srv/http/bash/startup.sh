#!/bin/bash

. /srv/http/bash/common.sh

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
	mv /boot/backup.gz $dirdata/tmp
	$dirbash/settings/system.sh datarestore
	reboot=1
fi

# wifi - on-board or usb
wlandev=$( $dirbash/settings/networks.sh wlandevice )

if [[ -e /boot/wifi && $wlandev != false ]]; then
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
mkdir $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
touch $dirshm/status

# ( no profile && no hostapd ) || usb wifi > disable onboard
lsmod | grep -q brcmfmac && touch $dirshm/onboardwlan
[[ $( ip -br link | grep -c ^w ) > 1 ]] && usbwifi=1
systemctl -q is-enabled hostapd && hostapd=1
readarray -t profiles <<< $( ls -1pt /etc/netctl | grep -v /$ )
[[ $usbwifi || ( ! $hostapd && ! $profiles ) ]] && rmmod brcmfmac &> /dev/null

# wait 5s max for lan connection
connectedCheck 5 1
# if lan not connected, wait 30s max for wi-fi connection
if [[ ! $connected && ! $hostapd && $profiles ]]; then
	! ip -br link | grep -q ^w && [[ -e $dirshm/onboardwlan ]] && modprobe brcmfmac
	if ip -br link | grep -q ^w; then
		for profile in "${profiles[@]}"; do
			[[ $( netctl is-enabled "$profile" ) == enabled ]] && enabledprofile=1 && break
		done
		[[ ! $enabledprofile ]] && $dirbash/settings/networks.sh profileconnect$'\n'"${profiles[0]}"
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

if [[ $connected ]]; then
	: >/dev/tcp/8.8.8.8/53 && $dirbash/cmd.sh addonsupdates
elif [[ ! -e $dirsystem/wlannoap ]]; then
	modprobe brcmfmac &> /dev/null 
	systemctl -q is-enabled hostapd || $dirbash/settings/features.sh hostapdset
	systemctl -q disable hostapd
fi

iw $wlandev set power_save off &> /dev/null

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

file=/sys/class/backlight/rpi_backlight/brightness
if [[ -e $file ]]; then
	chmod 666 $file
	[[ -e $dirsystem/brightness ]] && cat $dirsystem/brightness > $file
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

