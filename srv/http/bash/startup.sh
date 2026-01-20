#!/bin/bash

. /srv/http/bash/common.sh

wlanDevice

# pre-configure >>>-----------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	id0=$( < /etc/machine-id )
	rm /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv /var/log/journal/{$id0,$id1}
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	if [[ ${partition:0:7} == /dev/sd ]]; then
		dev=${partition:0:-1}
	else
		dev=${partition:0:-2}
	fi
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
	revision=$( grep ^Revision /proc/cpuinfo )
	if [[ ${revision: -3:2} == 12 ]]; then # zero 2
		localBrowserOff
	fi
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
if [[ -e $backupfile ]]; then
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
fi

if [[ -e /boot/nolocalbrowser ]]; then
	rm /boot/nolocalbrowser
	localBrowserOff
fi

if [[ -e $dirshm/wlan ]]; then
	if [[ -e /boot/wifi ]]; then
		wlandev=$( < $dirshm/wlan )
		ssid=$( getVar ESSID /boot/wifi )
		sed -E -e '/^#|^\s*$/ d
' -e "s/\r//; s/^(Interface=).*/\1$wlandev/
" /boot/wifi > "/etc/netctl/$ssid"
		rm -f /boot/{accesspoint,wifi} $dirsystem/ap
		$dirsettings/networks.sh "profileconnect
$ssid
CMD ESSID"
	elif [[ -e /boot/accesspoint ]]; then
		mv -f /boot/accesspoint $dirsystem/ap
	fi
fi
# pre-configure <<<-----------------------------------------------------------

logoLcdOled

if [[ -e $dirsystem/soundprofile ]]; then
	$dirsettings/system.sh soundprofileset
fi

dirbacklight=/sys/class/backlight/rpi_backlight
if [[ -d $dirbacklight ]]; then
	chmod 666 $dirbacklight/{brightness,bl_power}
	if [[ -e $dirsystem/brightness ]]; then
		cat $dirsystem/brightness > $dirbacklight/brightness
	fi
fi

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo mpd > $dirshm/player

if lsmod | grep -q -m1 brcmfmac; then
	touch $dirshm/onboardwlan # initial status
fi

netctllist=$( netctl list )
if [[ -e $dirsystem/ap ]]; then
	ap=1
else # if no connections, start accesspoint
	if [[ $netctllist ]]; then
		sec=30
	else
		sec=5
	fi
	for (( i=0; i < $sec; i++ )); do # wait for connection
		ipaddress=$( ipAddress )
		if [[ $ipaddress ]]; then
			break
		else
			sleep 1
		fi
	done
	if [[ $ipaddress ]]; then
		if grep -q /mnt/MPD/NAS /etc/fstab; then
			mount -a &> /dev/null
		fi
		if systemctl -q is-active nfs-server; then
			if [[ -s $filesharedip ]]; then
				sharedip=$( < $filesharedip )
				for ip in $sharedip; do
					notify -ip $ip networks 'Server rAudio' Online
				done
			fi
		fi
		[[ -e $filesharedip ]] && appendSortUnique $filesharedip $ipaddress
		if [[ $partition ]] && ipOnline 8.8.8.8; then
			$dirsettings/system.sh 'timezone
auto
CMD TIMEZONE'
		fi
	else
		if [[ -e $dirshm/wlan && ! $ap ]]; then
			if [[ $netctllist ]]; then
				if [[ ! -e $dirsystem/wlannoap ]]; then
					ap=1
				fi
			else
				ap=1
			fi
			if [[ $ap ]]; then
				touch $dirshm/apstartup
			fi
		fi
	fi
fi
if [[ $ap ]]; then
	$dirsettings/features.sh iwctlap
fi
landevice=$( lanDevice )
if [[ $landevice && $( ifconfig $landevice | grep inet ) ]] || (( $( rfkill | grep -c wlan ) > 1 )); then # lan ip || usb wifi
	wlanOnboardDisable
	pushData refresh '{ "page": "system", "wlan": false, "wlanconnected": false }'
fi
if [[ ! -e $dirsystem/btdisable ]]; then
	modprobe -a bluetooth bnep btbcm hci_uart
	if [[ -e $dirsystem/btreceiver ]]; then
		mac=$( < $dirsystem/btreceiver )
		rm $dirsystem/btreceiver
		$dirsettings/networks-bluetooth.sh connect $mac
		if [[ -e $dirsystem/camilladsp ]]; then
			$dirsettings/camilla-bluetooth.sh btreceiver
		fi
	fi
fi
if ! systemctl -q is-active mpd; then
	$dirsettings/player-conf.sh
fi
if [[ -e $dirsystem/volumelimit ]]; then
	volumeLimit startup
fi

# after all sources connected ........................................................
if [[ ! -e $dirmpd/mpd.db || -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi

touch $dirshm/startup

if grep -qs startup=true $dirsystem/autoplay.conf; then
	mpcPlayback play
fi
if [[ -e /boot/startup.sh ]]; then
	/boot/startup.sh
fi

udevil clean
lsblk -no path,vendor,model | grep -v ' $' > $dirshm/lsblkusb
if [[ ! -e $diraddons/update ]]; then
	data=$( curl -sfL https://github.com/rern/rAudio-addons/raw/main/addonslist.json )
	if [[ $? == 0 ]]; then
		echo "$data" > $diraddons/addonslist.json
		rversion=$( sed -n '/"r1"/,/"version"/ {/version/!d; s/"//g; s/.*: //; p}' <<< $data )
		if [[ $rversion != $( < $diraddons/r1 ) ]]; then
			touch $diraddons/update
			pushData option '{ "addons": true }'
		fi
	fi
fi
