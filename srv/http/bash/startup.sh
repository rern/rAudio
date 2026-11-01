#!/bin/bash

. /srv/http/bash/common.sh
. /srv/http/bash/settings/common.sh

# pre-configure >>>-----------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	EXPAND=1
	partition=$( lsblk -no path,mountpoint | awk '/\/$/ {print $1}' )
	[[ $partition == /dev/sd* ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	parted -s $dev resizepart 2 100%
	partprobe $dev
	resize2fs -f $partition &> /dev/null
	rm /boot/expand
	id0=$( < /etc/machine-id )
	rm /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv -f /var/log/journal/{$id0,$id1}
	usbMaxCurrent
	if [[ -e /bin/firefox ]]; then
		grep -q '^Revision.*12.$' /proc/cpuinfo && localBrowserOff # zero 2
	fi
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -n 1 )
if [[ -e $backupfile ]]; then
	mv -f "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
fi

if [[ -e /boot/localbrowseroff ]]; then
	rm /boot/localbrowseroff
	localBrowserOff
fi

if [[ -e /boot/wifi ]]; then
	wlandev=$( netDevice w )
	. <( grep ^ESSID /boot/wifi )
	sed -E -e '/^#|^\s*$/ d
' -e "s/\r//; s/^(Interface=).*/\1$wlandev/
" /boot/wifi > "/etc/netctl/$ESSID"
	rm -f /boot/{accesspoint,wifi} $dirsystem/ap
	$dirsettings/networks.sh "profileconnect
$ESSID
CMD ESSID"
elif [[ -e /boot/accesspoint ]]; then
	mv -f /boot/accesspoint $dirsystem/ap
fi
# pre-configure <<<-----------------------------------------------------------
mv /var/lib/alsa $dirshm/alsa # move to ram
ln -s $dirshm/alsa /var/lib
logoLcdOled
if [[ -e $dirsystem/bluetooth ]]; then
	modprobe hci_uart
	systemctl start bluetooth
else
	rmmod hci_uart &> /dev/null
fi
[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset
dirbacklight=/sys/class/backlight/rpi_backlight
if [[ -d $dirbacklight ]]; then
	chmod 666 $dirbacklight/{brightness,bl_power}
	if [[ -e $dirsystem/brightness ]]; then
		cat $dirsystem/brightness > $dirbacklight/brightness
	fi
fi

mkdirRW $dirshm/online
echo mpd > $dirshm/player
lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan

netctllist=$( netctl list )
if [[ -e $dirsystem/ap ]]; then
	AP=1
else # if no connections, start accesspoint
	[[ $netctllist ]] && sec=30 || sec=5
	for (( i=0; i < $sec; i++ )); do # wait for connection
		ipaddress=$( ipAddress )
		[[ $ipaddress ]] && break || sleep 1
	done
	if [[ $ipaddress ]]; then
		while read dev; do
			[[ $dev == /* ]] && ip=$( cut -d/ -f3 <<< $dev ) || ip=${dev/:*}
			for i in 1 2 3; do
				sleep 1
				ipOnline $ip && mount "${dev//\040/ }" && break
			done
		done < <( awk '/.mnt.MPD.NAS/ {print $1}' /etc/fstab )
		if [[ -e $filesharedip ]]; then
			nfsServerActive && pushNfsServer true
			appendSortUnique $filesharedip $ipaddress
		fi
	else
		if [[ -e $dirshm/wlan ]]; then
			if [[ $netctllist ]]; then
				[[ ! -e $dirsystem/wlannoap ]] && AP=1
			else
				AP=1
			fi
			[[ $AP ]] && touch $dirshm/apstartup
		fi
	fi
fi
[[ $AP ]] && iwctlAP
if [[ $( ipAddress e ) ]] || (( $( rfkill | grep -c wlan ) > 1 )); then # lan ip || wlan > 1
	wlanOnboardDisable
	pushData refresh '{ "page": "system", "wlan": false, "wlanconnected": false }'
fi
[[ $( ipAddress w ) ]] && iw $( netDevice w ) set power_save off
file_btconnected=$dirsystem/btconnected
if [[ -e $file_btconnected ]]; then
	while read mac; do
		$dirsettings/networks-bluetooth.sh "cmd
connect
$mac
CMD ACTION MAC"
	done < $file_btconnected
	rm $file_btconnected
fi

$dirsettings/player-conf.sh &> /dev/null
touch $dirshm/{startup,status.json}

[[ $( < $dirshm/fn_volume ) == volumeMpd ]] && volumeMpdRestore
[[ -e $dirsystem/volumelimit ]] && volume.set $( getVar startup $dirsystem/volumelimit.conf )

if [[ ! -e $dirmpd/mpd.db || -e $dirsystem/mpcupdate.conf ]]; then
	mpcUpdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
else
	touch $dirshm/updatedone
fi

pushStatus
$dirbash/status -B '{ "channel": "startup" }'

if [[ -e $dirsystem/autoplay ]]; then
	grep -q startup $dirsystem/autoplay.conf && playback play
fi
[[ -e /boot/startup.sh ]] && /boot/startup.sh

udevil clean
lsblk -no path,vendor,model | grep -v ' $' > $dirshm/lsblkusb
if [[ ! -e $diraddons/update ]] && ipOnline 8.8.8.8; then
	[[ $EXPAND ]] && timezoneAuto
	data=$( curl -sL $https_addonslist )
	if [[ $? == 0 ]]; then
		echo "$data" > $diraddons/addonslist.json
		latest=$( jq -r .r1.version <<< $data )
		if [[ $latest > $( < $diraddons/r1 ) ]]; then
			touch $diraddons/update
			pushData option '{ "addons": true }'
		fi
	fi
fi
