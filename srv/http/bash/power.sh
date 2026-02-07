#!/bin/bash

. /srv/http/bash/common.sh

if pgrep mkfs &> /dev/null; then
	name=$( getContent $dirshm/formatting 'Local Storage' )
	echo "Currently formatting <wh>$name</wh>"
	exit
# --------------------------------------------------------------------
fi

args2var "$1"

logoLcdOled
touch $dirshm/power # maintain lcdchar/oled logo
[[ $CMD == reboot ]] && reboot=1
ipaddress=$( ipAddress )
if systemctl -q is-active nfs-server; then # server rAudio
	ipclients=$( grep -v $ipaddress $filesharedip )
	if [[ $ipclients ]]; then
		[[ ! $CONFIRM ]] && echo nfs && exit
# --------------------------------------------------------------------
		if [[ $reboot ]]; then
			msg=Reboot
		else
			msg='Power off'
			blink=' blink'
		fi
		for ip in $ipclients; do
			notify -ip $ip "nfsserver$blink" 'Server rAudio' "$msg ..." -1
		done
	fi
fi
[[ -e $filesharedip ]] && sed -i "/$ipaddress/ d" $filesharedip
$dirbash/cmd.sh playerstop
snapclientIP playerstop
cdda=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
[[ $cdda ]] && mpc -q del $cdda
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

[[ -e /bin/ply-image ]] && ply-image /srv/http/assets/img/splash.png &> /dev/null
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
file=/boot/shutdown.sh
[[ -e $file ]] && $file
[[ $reboot ]] && reboot || poweroff
