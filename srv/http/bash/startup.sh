#!/bin/bash

. /srv/http/bash/common.sh

wlandev=$( $dirsettings/networks.sh wlandevice )

# pre-configure >>>-----------------------------------------------------------
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
	revision=$( grep ^Revision /proc/cpuinfo )
	if [[ ! -e /boot/kernel.img ]] && (( ${revision: -4:1} < 3 )); then # not legacy kernel && not RPi 4/5: SAE(WPA3), FWSUP
		echo 'options brcmfmac feature_disable=0x82000' > /etc/modprobe.d/brcmfmac.conf
	fi
	if [[ ${revision: -3:2} == 12 ]]; then # zero 2
		systemctl enable getty@tty1
		systemctl disable --now bootsplash localbrowser
		pacman -R --noconfirm firefox matchbox-window-manager plymouth-lite-rbp-git upower \
			xf86-video-fbturbo xf86-input-evdev xf86-video-fbdev xf86-video-vesa xinput_calibrator xorg-server xorg-xinit
		rm -f /etc/systemd/system/{bootsplash,localbrowser}
		rm -rf /etc/X11
		sed -i 's/tty3 .*/tty1/' /boot/cmdline.txt
	fi
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
if [[ -e $backupfile ]]; then
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
fi

if [[ $wlandev ]]; then
	if [[ -e /boot/wifi ]]; then
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

[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset

dirbacklight=/sys/class/backlight/rpi_backlight
if [[ -d $dirbacklight ]]; then
	chmod 666 $dirbacklight/{brightness,bl_power}
	[[ -e $dirsystem/brightness ]] && cat $dirsystem/brightness > $dirbacklight/brightness
fi

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo mpd > $dirshm/player

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan # initial status

netctllist=$( netctl list )
if [[ -e $dirsystem/ap ]]; then
	ap=1
else # if no connections, start accesspoint
	[[ $netctllist ]] && sec=30 || sec=5 # wlan || lan
	for (( i=0; i < $sec; i++ )); do # wait for connection
		ipaddress=$( ipAddress )
		[[ $ipaddress ]] && break || sleep 1
	done
	if [[ $ipaddress ]]; then
		readarray -t lines <<< $( grep $dirnas /etc/fstab )
		if [[ $lines ]]; then
			for line in "${lines[@]}"; do
				mp=$( awk '{print $2}' <<< $line )
				for i in {1..10}; do
					mount "${mp//\\040/ }" && break || sleep 2
				done
				! mountpoint -q "$mp" && notify networks NAS "Mount failed: <wh>$mp</wh>" 10000
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
		if [[ $partition ]] && ipOnline 8.8.8.8; then
			$dirsettings/system.sh 'timezone
auto
CMD TIMEZONE'
		fi
	else
		if [[ $wlandev && ! $ap ]]; then
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

if [[ -e $dirsystem/volumelimit ]]; then
	volumeLimit startup
fi

# after all sources connected ........................................................
if [[ ! -e $dirmpd/mpd.db || -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi
# usb wlan || no wlan || not ap + not connected
if (( $( rfkill | grep -c wlan ) > 1 )) || [[ ! $netctllist && ! $ap ]]; then
	rmmod brcmfmac_wcc brcmfmac &> /dev/null
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
			pushData option '{ "addons": 1 }'
		fi
	fi
fi
