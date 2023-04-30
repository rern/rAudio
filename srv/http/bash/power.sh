#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 == reboot ]] && reboot=1
if [[ -s /etc/exports ]]; then # server rAudio
	[[ ! $2 && (( $( wc -l < $filesharedip ) > 1 )) ]] && echo -1 && exit
	
	ips=$( grep -v $( ipAddress ) $filesharedip )
	if [[ $ips ]]; then
		for ip in $ips; do
			sshCommand $ip $dirsettings/system.sh shareddatadisconnect
		done
	fi
elif [[ -e $filesharedip ]]; then # shareddata client
	sed -i "/$( ipAddress )/ d" $filesharedip
fi
[[ $reboot ]] && notify -blink reboot System 'Reboot ...' || notify -blink power System 'Off ...'
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
