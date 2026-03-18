#!/bin/bash

. /srv/http/bash/common.sh

wlanDevice

# pre-configure >>>-----------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	id0=$( < /etc/machine-id )
	rm /boot/expand /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv /var/log/journal/{$id0,$id1}
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ $partition == /dev/sd* ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if [[ -e /boot/swap ]]; then
		start_end=$( parted /dev/mmcblk0 unit GB print \
					| awk '/^Disk \// {
							size = $NF
							sub( "GB", "", size )
							print size - 5 "GB " size "GB"
						}'
		)
		parted -s $dev mkpart primary linux-swap $start_end
		part_swap=${partition/2/3}
		mkswap $part_swap
		swapon $part_swap
		echo "$part_swap  none   swap  sw  0  0" >> /etc/fstab
	fi
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		parted -s $dev resizepart 2 100%
		partprobe $dev
		sleep 1
		resize2fs $partition
	fi
	revision=$( grep ^Revision /proc/cpuinfo )
	[[ ${revision: -3:2} == 12 ]] && localBrowserOff
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

[[ ! -e $dirsystem/btdisable ]] && modprobe -a bluetooth bnep btbcm hci_uart
logoLcdOled

[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset

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

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan

netctllist=$( netctl list )
if [[ -e $dirsystem/ap ]]; then
	ap=1
else # if no connections, start accesspoint
	[[ $netctllist ]] && sec=30 || sec=5
	for (( i=0; i < $sec; i++ )); do # wait for connection
		ipaddress=$( ipAddress )
		[[ $ipaddress ]] && break || sleep 1
	done
	if [[ $ipaddress ]]; then
		grep -q /mnt/MPD/NAS /etc/fstab && mount -a &> /dev/null
		[[ -e $filesharedip ]] && appendSortUnique $filesharedip $ipaddress
	else
		if [[ -e $dirshm/wlan ]]; then
			if [[ $netctllist ]]; then
				[[ ! -e $dirsystem/wlannoap ]] && ap=1
			else
				ap=1
			fi
			[[ $ap ]] && touch $dirshm/apstartup
		fi
	fi
fi
[[ $ap ]] && $dirsettings/features.sh iwctlap
landevice=$( lanDevice )
if [[ $landevice && $( ifconfig $landevice | grep inet ) ]] \
		|| (( $( rfkill | grep -c wlan ) > 1 )); then # lan ip || wlan > 1
	wlanOnboardDisable
	pushData refresh '{ "page": "system", "wlan": false, "wlanconnected": false }'
fi
if [[ -e $dirsystem/btreceiver ]]; then
	mac=$( < $dirsystem/btreceiver )
	rm $dirsystem/btreceiver
	$dirsettings/networks-bluetooth.sh "cmd
connect
$mac
CMD ACTION MAC"
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh btreceiver
fi
! systemctl -q is-active mpd && $dirsettings/player-conf.sh
[[ -e $dirsystem/volumelimit ]] && volumeLimit startup

# after all sources connected -----------------------------------------------------
if [[ ! -e $dirmpd/mpd.db || -e $dirsystem/mpcupdate.conf ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
else
	touch $dirshm/updatedone
fi

touch $dirshm/startup

grep -qs startup=true $dirsystem/autoplay.conf && mpcPlayback play
[[ -e /boot/startup.sh ]] && /boot/startup.sh

udevil clean
lsblk -no path,vendor,model | grep -v ' $' > $dirshm/lsblkusb
if [[ ! -e $diraddons/update ]] && ipOnline 8.8.8.8; then
	[[ $partition ]] && timezoneAuto # run once
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
