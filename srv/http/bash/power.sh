#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 == reboot ]] && reboot=1
[[ -e $filesharedip ]] && sed -i "/$( ipAddress )/ d" $filesharedip
if [[ -s /etc/exports ]]; then # server rAudio
	ipclients=$( < $filesharedip )
	if [[ $ipclients ]]; then
		[[ ! $2 ]] && echo -1 && exit # $2 confirm proceed
		
		msg='{"icon":"networks blink","title":"Server rAudio","message":"Offline ...","delay":-1}'
		[[ ! $reboot ]] && msg=${msg/ blink} && msg=${msg/line ...}
		for ip in $ipclients; do
			curl -s -X POST http://$ip/pub?id=notify -d "$msg"
		done
	fi
fi
[[ $reboot ]] && notify -blink reboot Power 'Reboot ...' || notify -blink power Power 'Off ...'
touch $dirshm/power
mpc -q stop
if [[ -e $dirsystem/lcdchar ]]; then
	systemctl stop lcdchar
	$dirbash/lcdchar.py logo
fi
alsactl store
pushstream btreceiver false
if [[ -e $dirshm/clientip ]]; then
	clientip=$( < $dirshm/clientip )
	for ip in $clientip; do
		sshCommand $ip $dirbash/cmd.sh playerstop
	done
fi
cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
[[ $cdda ]] && mpc -q del $cdda
[[ -e $dirshm/relayson ]] && $dirbash/relays.sh off && sleep 2
systemctl -q is-active camilladsp && camilladsp-gain.py
ply-image /srv/http/assets/img/splash.png &> /dev/null
if mount | grep -q -m1 $dirnas; then
	umount -l $dirnas/* &> /dev/null
	sleep 3
fi
[[ -e /boot/shutdown.sh ]] && . /boot/shutdown.sh
[[ $reboot ]] && reboot || poweroff
