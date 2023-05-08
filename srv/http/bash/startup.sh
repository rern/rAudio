#!/bin/bash

. /srv/http/bash/common.sh

cpuInfo
# wifi - on-board or usb
wlandev=$( $dirsettings/networks.sh wlandevice )

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
	! grep -q onboardwireless=true $dirshm/cpuinfo && sed -i '/dtparam=krnbt=on/ d' /boot/config.txt
fi

if [[ -e /boot/backup.gz ]]; then
	if bsdtar tf backup.gz | grep -q -m1 ^data/system/$; then
		mv /boot/backup.gz $dirdata/tmp
		$dirsettings/system.sh datarestore
	else
		restorefailed='Restore Settings' '<code>/boot/backup.gz</code> is not rAudio backup.'
	fi
fi

if [[ -e /boot/wifi && $wlandev ]]; then
	wifi=$( sed 's/\r//' /boot/wifi ) # remove windows return chars
	ssid=$( sed -E -n '/^ESSID/ {s/^.*="*|"$//g; p}' <<< $wifi )
	key=$( sed -E -n '/^Key/ {s/^.*="*|"$//g; p}' <<< $wifi )
	filebootwifi="/etc/netctl/$ssid"
	cat << EOF > "$filebootwifi"
Interface=$wlandev
$( grep -E -v '^#|^\s*$|^Interface|^ESSID|^Key' <<< $wifi )
ESSID="$( stringEscape $ssid )"
Key="$( stringEscape $key )"
EOF
	$dirsettings/networks.sh "profileconnect
$ssid
CMD SSID"
fi
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py logo

[[ -e $dirsystem/mpdoled ]] && $dirsettings/system.sh mpdoledlogo

[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset

filebrightness=/sys/class/backlight/rpi_backlight/brightness
if [[ -e $filebrightness ]]; then
	chmod 666 $filebrightness
	[[ -e $dirsystem/brightness ]] && cat $dirsystem/brightness > $filebrightness
fi

connectedCheck() {
	for (( i=0; i < $1; i++ )); do
		ifconfig | grep -q -m1 inet.*broadcast && connected=1 && break

		sleep $2
	done
}

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo 'state="stop"' > $dirshm/status
echo mpd > $dirshm/player

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan # initial status

# wait 5s max for lan connection
connectedCheck 5 1
# if lan not connected, wait 30s max for wi-fi connection
[[ ! $connected ]] && connectedCheck 30 3
# if wlan not connected, try connect with saved profile
if [[ ! $connected && $wlandev ]] && ! systemctl -q is-enabled hostapd; then
	fileprofile=$( grep -rl $wlandev /etc/netctl | head -1 )
	if [[ $fileprofile ]]; then
		$dirsettings/networks.sh "profileconnect
$( basename "$fileprofile" )
CMD SSID"
		connectedCheck 30 3
	fi
fi

if [[ $connected  ]]; then
	[[ -e $filebootwifi ]] && rm -f /boot/wifi
	readarray -t nas <<< $( grep -v ^PARTUUID /etc/fstab | awk '{print $2}' )
	if [[ $nas ]]; then
		for mountpoint in "${nas[@]}"; do # ping target before mount
			mp=$( space2ascii $mountpoint )
			ip=$( grep $mp /etc/fstab \
					| cut -d' ' -f1 \
					| sed 's|^//||; s|:*/.*$||' )
			[[ ! $ip ]] && continue
			
			for i in {1..10}; do
				if ipOnline $ip; then
					mount "$mountpoint" && break
				else
					(( i == 10 )) && nasfailed=1
					sleep 2
				fi
			done
		done
	fi
	if [[ -e $filesharedip ]]; then
		if [[ -s /etc/exports && -s $filesharedip ]]; then
			sharedip=$( < $filesharedip )
			for ip in $sharedip; do
				curl -s -X POST http://$ip/pub?id=notify -d '{ "icon": "networks", "title": "Server rAudio", "message": "Online" }'
			done
		fi
		appendSortUnique $( ipAddress ) $filesharedip
	fi
else
	[[ -e $filebootwifi ]] && rm -f "$filebootwifi"
fi

$dirsettings/player-conf.sh # mpd.service started by this script

# after all sources connected ........................................................
if [[ $connected ]]; then
	if internetConnected; then
		$dirsettings/addons-data.sh &> /dev/null &
	fi
elif [[ ! -e $dirsystem/wlannoap && $wlandev ]] && ! systemctl -q is-enabled hostapd; then
	$dirsettings/features.sh hostapdset
	systemctl -q disable hostapd
fi

if [[ -e $dirsystem/hddsleep && -e $dirsystem/apm ]]; then
	$dirsettings/system.sh "hddsleep
$( < $dirsystem/apm )
CMD APM"
fi

if [[ ! -e $dirmpd/mpd.db ]]; then
	echo rescan > $dirmpd/updating
	mpc -q rescan
	pushstream mpdupdate '{ "type": "mpd" }'
elif [[ -e $dirmpd/updating ]]; then
	path=$( < $dirmpd/updating )
	[[ $path == rescan ]] && mpc -q rescan || mpc -q update "$path"
elif [[ -e $dirmpd/listing || ! -e $dirmpd/counts ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi
# if no wlan // usb wlan // no hostapd and no connected wlan, disable wlan
if (( $( rfkill | grep -c wlan ) > 1 )) \
	|| ! rfkill | grep -q wlan \
	|| ( ! systemctl -q is-active hostapd && ! netctl list | grep -q -m1 '^\*' ); then
	rmmod brcmfmac &> /dev/null
	onboardwlan=false
else
	onboardwlan=true
fi
pushstream refresh '{ "page": "system", "wlan": '$onboardwlan' }'
pushstream refresh '{ "page": "networks", "activewl": '$onboardwlan' }'

if [[ $restorefailed ]]; then
	notify restore "$restorefailed" 10000
elif [[ $nasfailed ]]; then
	notify nas NAS "NAS @$ip cannot be reached." -1
fi

touch $dirshm/startup
if [[ -e $dirsystem/autoplay ]] && grep -q startup=true $dirsystem/autoplay.conf; then
	$dirbash/cmd.sh mpcplayback$'\n'play$'\nCMD ACTION'
fi

if [[ -e /boot/startup.sh ]]; then # no shorthand for last if else - startup.service failed
	/boot/startup.sh
fi
