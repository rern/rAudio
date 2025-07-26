#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

[[ $CMD = reboot ]] && reboot=1
ipaddress=$( ipAddress )
if systemctl -q is-active nfs-server; then # server rAudio
	ipclients=$( grep -v $ipaddress $filesharedip )
	if [[ $ipclients ]]; then
		[[ ! $CONFIRM ]] && echo -1 && exit # $2 confirm proceed
# --------------------------------------------------------------------
		[[ $reboot ]] && msg='Reboot ...' || msg='Power off ...'
		for ip in $ipclients; do
			notify -ip $ip 'nfsserver blink' 'Server rAudio' "$msg"
		done
	fi
fi
[[ -e $filesharedip ]] && sed -i "/$ipaddress/ d" $filesharedip
$dirbash/cmd.sh playerstop
logoLcdOled
[[ -e $dirshm/relayson ]] && $dirbash/relays.sh off
if [[ $reboot ]]; then
	audioCDplClear && $dirbash/status-push.sh
	startup=$( systemd-analyze | sed -n '/^Startup/ {s/.*= //; s/[^0-9]//g; p}' )
	pushData power '{ "type": "reboot", "startup": '$startup' }'
else
	audioCDplClear
	pushData power '{ "type": "off" }'
fi
[[ -e $dirshm/btreceiver ]] && cp $dirshm/btreceiver $dirsystem
touch $dirshm/power

snapclientIP playerstop
cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
[[ $cdda ]] && mpc -q del $cdda
ply-image /srv/http/assets/img/splash.png &> /dev/null
if mount | grep -q -m1 $dirnas; then
	umount -l $dirnas/* &> /dev/null
	sleep 3
fi
if [[ -d /sys/class/backlight/rpi_backlight ]]; then
	echo 1 > /sys/class/backlight/rpi_backlight/bl_power
elif [[ -e $dirsystem/localbrowser ]]; then
	DISPLAY=:0 sudo xset dpms force off
fi
[[ -e /boot/shutdown.sh ]] && /boot/shutdown.sh
[[ $reboot ]] && reboot || poweroff
