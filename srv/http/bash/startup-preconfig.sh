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
	bootwifi=$( ls -1 /boot/*.{psk,open} 2> /dev/null | head -1 )
	filename=${bootwifi/*\/}
	ssid=${filename%.*}
	. <( grep -v '^\[' "$bootwifi" )
	if [[ ${ssid:0:1} == = ]]; then
		ssid=${ssid:1}
		while (( ${#ssid} > 0 )); do
			hex+="\x${ssid:0:2}"
			ssid=${ssid:2}
		done
		ssid=$( echo -e $hex )
	fi
	if [[ $Address ]]; then
		$dirsettings/networks.sh "connectstatic
$ssid
$Passphrase
$Address
$Gateway
$Hidden
CMD SSID PASSPHRASE ADDRESS GATEWAY HIDDEN"
	else
		$dirsettings/networks.sh "connect
$ssid
$Passphrase
$Hidden
CMD SSID PASSPHRASE HIDDEN"
	fi
	;;
	
esac
