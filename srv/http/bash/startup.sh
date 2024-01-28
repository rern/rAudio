#!/bin/bash

. /srv/http/bash/common.sh

revision=$( grep ^Revision /proc/cpuinfo )
echo "\
BB=${revision: -3:2}
C=${revision: -4:1}" > $dirshm/cpuinfo

# wifi - on-board or usb
wlandev=$( $dirsettings/networks.sh wlandevice )
[[ $wlandev ]] && wlanprofile=$( ls -1p /var/lib/iwd | grep -v /$ | head -1 )

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

if [[ -e /boot/backup.gz ]]; then
	if bsdtar tf backup.gz | grep -q -m1 ^data/system/$; then
		mv /boot/backup.gz $dirdata/tmp
		$dirsettings/system.sh datarestore
	else
		restorefailed='Restore Settings' '<code>/boot/backup.gz</code> is not rAudio backup.'
	fi
fi

filewifi=$( ls -1 /boot/*.{psk,open} 2> /dev/null | head -1 )
if [[ $filewifi && $wlandev ]]; then
	filename=${filewifi/*\/}
	ssid=${filename%.*}
	hidden=$( getVar Hidden "$filewifi" )
	if (( $( grep -Ec '^Passphrase|^PreSharedKey' $filewifi ) < 2 )); then
		passphrase=$( getVar Passphrase "$filewifi" )
		presharedkey=$( wpa_passphrase "$ssid" "$passphrase" | grep '\spsk=' | cut -d= -f2 )
		sed -i "/^Passphrase/ i\PreSharedKey=$presharedkey" "$filewifi"
	fi
	cp "$filewifi" /var/lib/iwd
	$dirsettings/networks.sh "iwctlconnect
$ssid
$hidden
CMD SSID HIDDEN"
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

# wait for connection
if [[ $wlanprofile ]]; then
	sec=30
	iwctl station $wlandev connect "$wlanprofile"
else
	sec=5
fi
for (( i=0; i < $sec; i++ )); do
	ipaddress=$( ipAddress )
	[[ $ipaddress ]] && break || sleep 1
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
	avahi-resolve -a4 $ipaddress | awk '{print $NF}' > $dirshm/avahihostname
	$dirsettings/addons-data.sh &> /dev/null &
	rm -f "$filewifi"
else
	[[ -e $filewifi ]] && mv "$filewifi"{,X}
	if [[ $wlandev && ! $ap ]]; then
		if [[ $wlanprofile ]]; then
			[[ ! -e $dirsystem/wlannoap ]] && ap=1
		else
			ap=1
		fi
		[[ $ap ]] && touch $dirshm/apstartup
	fi
fi
[[ $ap ]] && $dirsettings/features.sh iwctlap

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

# after all sources connected ........................................................
if [[ -e $dirsystem/hddsleep && -e $dirsystem/apm ]]; then
	$dirsettings/system.sh "hddsleep
$( < $dirsystem/apm )
CMD APM"
fi

if [[ ! -e $dirmpd/mpd.db ]]; then
	echo rescan > $dirmpd/updating
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi

if (( $( rfkill | grep -c wlan ) > 1 )) || [[ ! $wlanprofile && ! $ap ]]; then
	systemctl stop iwd
	rmmod brcmfmac_wcc brcmfmac &> /dev/null
fi
! rfkill | grep -q wlan && systemctl stop iwd

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
