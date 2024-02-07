#!/bin/bash

. /srv/http/bash/common.sh

case $1 in

expandpartition )
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
	;;
restoredata )
	backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
	if [[ $? != 0 ]]; then
		notbackupfile=1
		mv $dirshm/backup.gz "${backupfile}X"
	fi
	;;
wificonnect )
	sed -i 's/^ESSID=/SSID=/; s/^Key=/Passphrase=/; s/^Hidden=yes/Hidden=true/' /boot/wifi # up to 20240127 release
	ssid=$( sed -n '/^SSID/ {s/^SSID=//; p}' /boot/wifi )
	if [[ $ssid ]]; then
		data=connect
		cmd=CMD
		readarray -t lines <<< $( grep -E '^SSID=|^Passphrase=|^Address=|^Gateway=|^Hidden=' /boot/wifi )
		for l in "${lines[@]}"; do
			data+="
$( cut -d= -f2- <<< $l | sed 's/^"\|"$//g' )"
			var=${l/=*}
			cmd+=" ${var^^}"
		done
		data+="
$cmd"
		$dirsettings/networks.sh "$data"
	fi
	[[ $ssid == $( iwgetid -r $( < $dirshm/wlan ) ) ]] && rm /boot/wifi || mv /boot/wifi{,X}
	;;
	
esac
