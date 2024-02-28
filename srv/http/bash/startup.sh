#!/bin/bash

. /srv/http/bash/common.sh

# wifi - on-board or usb
wlandev=$( $dirsettings/networks.sh wlandevice )
[[ $wlandev ]] && wlanprofile=$( ls -1p /etc/netctl | grep -v /$ )

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	id0=$( < /etc/machine-id )
	rm /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv /var/log/journal/{$id0,$id1}
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ ${partition:0:7} == /dev/sd ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
if [[ -e $backupfile ]]; then
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
fi

bootwifi=/boot/wifi
if [[ $wlandev && -e $bootwifi ]]; then
	data=$( sed -E -e '/^#|^\s*$/ d
' -e "s/\r//; s/^(Interface=).*/\1$wlandev/
" $bootwifi )
	ssid=$( getVar ESSID <<< $data )
	echo "$data" > "/etc/netctl/$ssid"
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

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo 'state="stop"' > $dirshm/status
echo mpd > $dirshm/player

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan # initial status

if [[ -e /boot/accesspoint ]]; then
	ap=1
else
	[[ $wlanprofile ]] && sec=30 || sec=5 # wlan || lan
	for (( i=0; i < $sec; i++ )); do # wait for connection
		ipaddress=$( ipAddress )
		[[ ! $ipaddress ]] && sleep 1 || break
	done
	[[ -e $dirsystem/ap ]] && ap=1
	if [[ $ipaddress ]]; then
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
			appendSortUnique $ipaddress $filesharedip
		fi
		[[ -e $bootwifi ]] && rm -f $bootwifi
	else
		if [[ $wlandev && ! $ap ]]; then
			if [[ $wlanprofile ]]; then
				[[ ! -e $dirsystem/wlannoap ]] && ap=1
			else
				ap=1
			fi
			[[ $ap ]] && touch $dirshm/apstartup
			[[ -e $bootwifi ]] && mv $bootwifi{,X}
		fi
	fi
fi

[[ $ap ]] && $dirsettings/features.sh iwctlap

if [[ -e $dirsystem/btreceiver ]]; then
	mac=$( < $dirsystem/btreceiver )
	rm $dirsystem/btreceiver
	$dirsettings/networks-bluetooth.sh connect $mac
fi

if [[ -e $dirshm/btreceiver && -e $dirsystem/camilladsp ]]; then
	$dirsettings/camilla-bluetooth.sh btreceiver
else # start mpd.service if not started by networks-bluetooth.sh
	$dirsettings/player-conf.sh
fi
if [[ -e $dirsystem/volumeboot ]]; then
	. $dirsystem/volumeboot.conf
	if [[ -e $dirshm/btreceiver ]]; then
		control=$( < $dirshm/btmixer )
		amixer -MqD bluealsa sset "$control" $volume
	elif [[ -e $dirshm/amixercontrol ]]; then
		card=$( < $dirsystem/asoundcard )
		control=$( < $dirshm/amixercontrol )
		amixer -c $card -Mq sset "$control" ${volume}%
	else
		mpc -q volume $volume
	fi
fi

# after all sources connected ........................................................
if [[ ! -e $dirmpd/mpd.db ]]; then
	echo rescan > $dirmpd/updating
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi
# usb wlan || no wlan || not ap + not connected
if (( $( rfkill | grep -c wlan ) > 1 )) || [[ ! $wlanprofile && ! $ap ]]; then
	rmmod brcmfmac_wcc brcmfmac &> /dev/null
fi

touch $dirshm/startup

if [[ -e $dirsystem/autoplay ]] && grep -q startup=true $dirsystem/autoplay.conf; then
	$dirbash/cmd.sh 'mpcplayback
play
CMD ACTION'
fi

if [[ -e /boot/startup.sh ]]; then
	/boot/startup.sh
fi

if [[ -e $dirsystem/hddsleep && -e $dirsystem/apm ]]; then
	$dirsettings/system.sh "hddsleep
$( < $dirsystem/apm )
CMD APM"
fi
