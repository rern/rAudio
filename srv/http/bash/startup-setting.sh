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
	. /boot/wifi
	if grep ^ESSID /boot/wifi; then # previous release
		if [[ $ESSID ]]; then
			SSID=$ESSID
			data="connect
$SSID
$Key
CMD SSID PASSPHRASE"
		fi
	else
		if [[ $SSID ]]; then
			data=$( echo "connect
$( sed -n '/^SSID/,/Hidde/ p' /boot/wifi )
CMD SSID PASSPHRASE ADDRESS GATEWAY HIDDEN" \
	| sed 's/[^=]*=//' )
		fi
	fi
	[[ $data ]] && iwctlScan "$SSID" && $dirsettings/networks.sh "$data"
	[[ $SSID == $( iwgetid -r $( < $dirshm/wlan ) ) ]] && rm /boot/wifi || mv /boot/wifi{,X}
	;;
	
esac
