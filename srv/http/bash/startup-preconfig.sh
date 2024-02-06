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
restoresettings )
	backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
	if [[ $? != 0 ]]; then
		notbackupfile=1
		mv $dirshm/backup.gz "${backupfile}X"
	fi
	;;
bootwificonnect )
	if grep ^ESSID /boot/wifi; then # previous release
		data="connect
$SSID
$Passphrase
CMD SSID PASSPHRASE"
	else
		data=$( sed -e '1 i\connect
' -e '$ a\CMD SSID PASSPHRASE ADDRESS GATEWAY HIDDEN
' -e '/^#\|^$/ d
' -e 's/[^=]*=//
' /boot/wifi )
	fi
	$dirsettings/networks.sh "$data"
	;;
	
esac
