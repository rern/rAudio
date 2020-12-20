#!/bin/bash

# mounted partitions and remote shares
dftarget=$( df --output=target | grep '/mnt/MPD/\|^/$' )
if [[ -n $dftarget ]]; then
	readarray -t lines <<<"$dftarget"
	for line in "${lines[@]}"; do
		source=$( df --output=source "$line" | tail -1 )
		size=$( df -h --output=used,size "$line" | tail -1 | awk '{print $1"B/"$2"B"}' )
		
		case ${line:0:12} in
			/ )            icon=microsd;;
			/mnt/MPD/NAS ) icon=networks;;
			/mnt/MPD/USB ) icon=usbdrive;;
		esac
		list+=',{"icon":"'$icon'","mountpoint":"'${line//\"/\\\"}'","mounted":true,"source":"'${source//\"/\\\"}'","size":"'$size'"}'
	done
fi

# not mounted partitions
sources=$( fdisk -lo device | grep ^/dev/sd )
if [[ -n $sources ]]; then
	for source in $sources; do
		if ! df --output=source | grep -q $source; then
			label=$( udevil info $source | awk '/^  label/ {print $NF}' )
			mountpoint="/mnt/MPD/USB/$label"
			list+=',{"icon":"usbdrive","mountpoint":"'${mountpoint//\"/\\\"}'","mounted":false,"source":"'$source'"}'
		fi
	done
fi

# not mounted remote shares
targets=$( grep '/mnt/MPD/NAS/' /etc/fstab | awk '{print $2}' )
if [[ -n $targets ]]; then
	for target in $targets; do
		mountpoint=${target//\\040/ }  # \040 > space
		if ! df --output=target | grep -q "$mountpoint"; then
			source=$( grep "${mountpoint// /.040}" /etc/fstab | awk '{print $1}' | sed 's/\\040/ /g' )
			list+=',{"icon":"networks","mountpoint":"'${mountpoint//\"/\\\"}'","mounted":false,"source":"'${source//\"/\\\"}'"}'
		fi
	done
fi

data='
	  "list"       : ['${list:1}']
	, "autoupdate" : '$( grep -q "auto_update.*yes" /etc/mpd.conf && echo true || echo false )'
	, "reboot"     : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"'

echo {$data}
