#!/bin/bash

. /srv/http/bash/common.sh

revision=$( grep ^Revision /proc/cpuinfo )
echo "\
BB=${revision: -3:2}
C=${revision: -4:1}" > $dirshm/cpuinfo

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan
wlandev=$( $dirsettings/networks.sh wlandevice )

# pre-configure --------------------------------------------------------------
[[ -e /boot/expand ]] && $dirbash/startup-setting.sh expandpartition

backupfile=$( ls /boot/*.gz 2> /dev/null )
if [[ $backupfile ]] && bsdtar tf "$backupfile" 2> /dev/null | grep -q -m1 ^data/system/display.json$; then
	$dirbash/startup-setting.sh restoredata
fi

[[ $wlandev && -e /boot/wifi ]] && $dirbash/startup-setting.sh wificonnect
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py logo

[[ -e $dirsystem/mpdoled ]] && $dirsettings/system.sh mpdoledlogo

[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset

filebrightness=/sys/class/backlight/rpi_backlight/brightness
if [[ -e $filebrightness && -e $dirsystem/brightness ]]; then
	chmod 666 $filebrightness
	cat $dirsystem/brightness > $filebrightness
fi

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo 'state="stop"' > $dirshm/status
echo mpd > $dirshm/player

for i in {0..5}; do
	ipaddress=$( ipAddress )
	[[ $ipaddress ]] && break || sleep 1
done

iwdprofile=$( ls -1p /var/lib/iwd | grep -v /$ )
[[ -e $dirsystem/ap ]] && ap=1

if [[ $ipaddress ]]; then
	readarray -t lines <<< $( grep $dirnas /etc/fstab )
	if [[ $lines ]]; then
		for line in "${lines[@]}"; do # ping target before mount
			[[ ${line:0:2} == // ]] && ip=$( cut -d/ -f3 <<< $line ) || ip=$( cut -d: -f1 <<< $line )
			for i in {0..9}; do
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
		appendSortUnique $ipaddress $filesharedip
	fi
	avahi-resolve -a4 $ipaddress | awk '{print $NF}' > $dirshm/avahihostname
	$dirsettings/addons-data.sh &> /dev/null &
	[[ -e $bootwifi ]] && rm "$bootwifi"
else
	if [[ $wlandev && ! $ap ]]; then
		if [[ $iwdprofile ]]; then
			[[ ! -e $dirsystem/wlannoap ]] && ap=1
		else
			ap=1
		fi
		[[ $ap ]] && touch $dirshm/apstartup
	fi
fi
[[ $ap ]] && $dirsettings/features.sh iwctlap
if (( $( rfkill | grep -c wlan ) > 1 )) || [[ ! $iwdprofile && ! $ap ]]; then
	rmmod brcmfmac_wcc brcmfmac &> /dev/null # usb wlan || no wifi || not ap
fi
! rfkill | grep -q wlan && systemctl stop iwd

if [[ -e $dirsystem/btconnected ]]; then
	readarray -t devices < $dirsystem/btconnected
	rm $dirsystem/btconnected
	for dev in "${devices[@]}"; do
		mac=$( cut -d' ' -f1 <<< $dev )
		$dirbash/bluetoothcommand.sh connect $mac
	done
fi

if [[ -e $dirshm/btreceiver && -e $dirsystem/camilladsp ]]; then
	$dirsettings/camilla-bluetooth.sh receiver
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
		amixer -c $card -Mq sset "$control" ${volume}%
	else
		mpc -q volume $volume
	fi
fi

if [[ ! -e $dirmpd/mpd.db ]]; then
	echo rescan > $dirmpd/updating
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi

touch $dirshm/startup
# ready ------------------------------------------------------------------------------
if [[ -e $dirsystem/autoplay ]] && grep -q startup=true $dirsystem/autoplay.conf; then
	$dirbash/cmd.sh mpcplayback$'\n'play$'\nCMD ACTION'
fi

if [[ -e /boot/startup.sh ]]; then # no shorthand for last if else - startup.service failed
	/boot/startup.sh
fi

if [[ -e $dirsystem/hddsleep && -e $dirsystem/apm ]]; then
	$dirsettings/system.sh "hddsleep
$( < $dirsystem/apm )
CMD APM"
fi
