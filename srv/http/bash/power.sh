#!/bin/bash

. /srv/http/bash/common.sh

if pgrep mkfs &> /dev/null; then
	name=$( getContent $dirshm/formatting 'Local Storage' )
	echo "Currently formatting <wh>$name</wh>"
	exit
# --------------------------------------------------------------------
fi

args2var "$1"

if [[ -e $filesharedip ]]; then
	if nfsServerActive; then # server rAudio
		if [[ $( ipSharedData ) ]]; then
			[[ ! $CONFIRM ]] && echo nfs && exit
# --------------------------------------------------------------------
			pushNfsServer false
		fi
	fi
	ipaddress=$( ipAddress )
	sed -i "/$ipaddress/ d" $filesharedip
fi
touch $dirshm/power # maintain lcdchar/oled logo
[[ $CMD == reboot ]] && reboot=1
if [[ -e $dirmpdconf/snapserver.conf ]]; then
	$dirbash/status -B '{ "filesh": [ "cmd.sh", "playerstop" ] }'
else
	$dirbash/cmd.sh playerstop
fi
[[ -e $dirshm/relayson ]] && $dirbash/relays.sh off
[[ -e $dirshm/audiocd ]] && audioCDplClear
[[ $( < $dirshm/player ) == upnp ]] && mpc -q clear
if [[ $reboot ]]; then
	startup=$( systemd-analyze | sed -n '/^Startup/ {s/.*= //; s/[^0-9]//g; p}' )
	pushData power '{ "type": "reboot", "startup": '$startup' }'
else
	pushData power '{ "type": "off" }'
fi

if mount | grep -q -m1 $dirnas; then
	umount -l $dirnas/* &> /dev/null
	sleep 3
fi
dir=/sys/class/backlight/rpi_backlight
if [[ -d $dir ]]; then
	sudo echo 1 > $dir/bl_power
elif [[ -e $dirsystem/localbrowser ]]; then
	DISPLAY=:0 sudo xset dpms force off
fi
logoLcdOled
[[ -e /boot/shutdown.sh ]] && /boot/shutdown.sh
[[ $reboot ]] && reboot || poweroff
