#!/bin/bash

. /srv/http/bash/common.sh

# pre-configure >>>-----------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	id0=$( < /etc/machine-id )
	rm /boot/expand /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv /var/log/journal/{$id0,$id1}
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ $partition == /dev/sd* ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $(NF-1)}' ) != 0 )); then
		parted -s $dev resizepart 2 100%
		partprobe $dev
		resize2fs $partition
	fi
	usbMaxCurrent
	[[ -e /bin/firefox ]] && grep -q '^Revision.*12.$' /proc/cpuinfo && localBrowserOff # zero 2
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
if [[ -e $backupfile ]]; then
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
fi

if [[ -e /boot/localbrowseroff || -e /boot/nolocalbrowser ]]; then
	rm /boot/*localbrowser*
	localBrowserOff
fi

if [[ -e /boot/wifi ]]; then
	wlandev=$( wlanDevice )
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
if [[ $( ipAddress e ) ]] || (( $( rfkill | grep -c wlan ) > 1 )); then # lan ip || wlan > 1
	wlanOnboardDisable
	pushData refresh '{ "page": "system", "wlan": false, "wlanconnected": false }'
fi
[[ $( ipAddress w ) ]] && iw $( wlanDevice )) set power_save off
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
	data=$( curl -sL $https_addonslist )
	if [[ $? == 0 ]]; then
		echo "$data" > $diraddons/addonslist.json
		if [[ $( jq -r .r1.version <<< $data ) > $( < $diraddons/r1 ) ]]; then
			touch $diraddons/update
			pushData option '{ "addons": true }'
		fi
	fi
fi
