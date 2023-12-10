#!/bin/bash

. /srv/http/bash/common.sh

revision=$( grep ^Revision /proc/cpuinfo )
echo "\
BB=${revision: -3:2}
C=${revision: -4:1}" > $dirshm/cpuinfo

# wifi - on-board or usb
wlandev=$( $dirsettings/networks.sh wlandevice )

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	rm /etc/machine-id
	systemd-machine-id-setup
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ ${partition:0:7} == /dev/sd ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
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
	readarray -t lines <<< $( grep $dirnas /etc/fstab )
	if [[ $lines ]]; then
		for line in "${lines[@]}"; do # ping target before mount
			[[ ${line:0:2} == // ]] && ip=$( cut -d/ -f3 <<< $line ) || ip=$( cut -d: -f1 <<< $line )
			for i in {1..10}; do
				if ipOnline $ip; then
					mountpoint=$( awk '{print $2}' <<< $line )
					mount "${mountpoint//\\040/ }" && nasonline=1 && break
					sleep 2
				fi
			done
		done
	fi
	if systemctl -q is-active nfs-server; then
		if [[ -s $filesharedip ]]; then
			sharedip=$( < $filesharedip )
			for ip in $sharedip; do
				notify -ip $ip networks 'Server rAudio' Online
			done
		fi
		appendSortUnique $( ipAddress ) $filesharedip
	fi
else
	[[ -e $filebootwifi ]] && rm -f "$filebootwifi"
fi

if [[ -e $dirsystem/btconnected ]]; then
	readarray -t devices < $dirsystem/btconnected
	rm $dirsystem/btconnected
	for dev in "${devices[@]}"; do
		mac=$( cut -d' ' -f1 <<< $dev )
		$dirbash/bluetoothcommand.sh connect $mac
	done
fi

if [[ -e $dirshm/btreceiver ]]; then
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh receiver
else # start mpd.service if not started by bluetoothcommand.sh
	$dirsettings/player-conf.sh
fi
if [[ -e $dirsystem/volumeboot ]]; then
	. $dirsystem/volumeboot.conf
	if [[ -e $dirshm/btreceiver ]]; then
		control=$( < $dirshm/btreceiver )
		amixer -MqD bluealsa sset "$control" $volume
	elif [[ -e $dirshm/amixercontrol ]]; then
		card=$( < $dirsystem/asoundcard )
		control=$( < $dirshm/amixercontrol )
		amixer -c $card -M sset "$control" ${volume}%
	else
		mpc -q volume $volume
	fi
	volumeGet push
fi

# after all sources connected ........................................................
if [[ $connected ]]; then
	$dirsettings/addons-data.sh &> /dev/null &
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
	pushData mpdupdate '{ "type": "mpd" }'
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
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
pushData refresh '{ "page": "system", "wlan": '$onboardwlan' }'
pushData refresh '{ "page": "networks", "activewl": '$onboardwlan' }'

if [[ $restorefailed ]]; then
	notify restore "$restorefailed" 10000
elif [[ $nas && ! $nasonline ]]; then
	notify nas NAS "NAS @$ip cannot be reached." -1
fi

touch $dirshm/startup
if [[ -e $dirsystem/autoplay ]] && grep -q startup=true $dirsystem/autoplay.conf; then
	$dirbash/cmd.sh mpcplayback$'\n'play$'\nCMD ACTION'
fi

if [[ -e /boot/startup.sh ]]; then # no shorthand for last if else - startup.service failed
	/boot/startup.sh
fi
