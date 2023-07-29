#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 == reboot ]] && reboot=1
if systemctl -q is-active nfs-server; then # server rAudio
	ipserver=$( ipAddress )
	ipclients=$( grep -v $ipserver $filesharedip )
	if [[ $ipclients ]]; then
		[[ ! $2 ]] && echo -1 && exit # $2 confirm proceed
		
		for ip in $ipclients; do
			if [[ $reboot ]]; then
				notify -blink $ip networks 'Server rAudio' 'Reboot ...'
			else
				notify $ip 'networks' 'Server rAudio' 'Power off' -1
			fi
		done
	fi
	sed -i "/$ipserver/ d" $filesharedip
elif [[ -e $filesharedip ]]; then
	sed -i "/$( ipAddress )/ d" $filesharedip
fi
[[ $reboot ]] && notify -blink reboot Power 'Reboot ...' || notify -blink power Power 'Off ...'
touch $dirshm/power
mpc -q stop
if [[ -e $dirsystem/lcdchar ]]; then
	systemctl stop lcdchar
	$dirbash/lcdchar.py logo
fi
alsactl store
if [[ -e $dirshm/clientip ]]; then
	clientip=$( < $dirshm/clientip )
	for ip in $clientip; do
		sshCommand $ip $dirbash/cmd.sh playerstop
	done
fi
cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
[[ $cdda ]] && mpc -q del $cdda
[[ -e $dirshm/relayson ]] && $dirbash/relays.sh off && sleep 2
ply-image /srv/http/assets/img/splash.png &> /dev/null
if mount | grep -q -m1 $dirnas; then
	umount -l $dirnas/* &> /dev/null
	sleep 3
fi
[[ -e /boot/shutdown.sh ]] && . /boot/shutdown.sh
[[ $reboot ]] && reboot || poweroff
