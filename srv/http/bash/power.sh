#!/bin/bash

. /srv/http/bash/common.sh

$dirbash/cmd.sh playerstop
logoLcdOled
[[ -e $dirshm/relayson ]] && $dirbash/relays.sh off
if [[ $1 == reboot ]]; then
	reboot=1
	audioCDplClear && $dirbash/status-push.sh
	startup=$( systemd-analyze | sed -n '/^Startup/ {s/.*= //; s/[^0-9]//g; p}' )
	pushData power '{ "type": "reboot", "startup": '$startup' }'
else
	audioCDplClear
	pushData power '{ "type": "off" }'
fi
ipserver=$( ipAddress )
if systemctl -q is-active nfs-server; then # server rAudio
	ipclients=$( grep -v $ipserver $filesharedip )
	if [[ $ipclients ]]; then
		[[ ! $2 ]] && echo -1 && exit # $2 confirm proceed
# --------------------------------------------------------------------
		[[ $reboot ]] && msg='Reboot ...' || msg='Power off ...'
		for ip in $ipclients; do
			notify -ip $ip 'networks blink' 'Server rAudio' "$msg"
		done
	fi
fi
[[ -e $filesharedip ]] && sed -i "/$ipserver/ d" $filesharedip
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
	DISPLAY=:0 xset dpms force off
fi
[[ -e /boot/shutdown.sh ]] && /boot/shutdown.sh
[[ $reboot ]] && reboot || poweroff
