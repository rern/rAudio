#!/bin/bash

. /srv/http/bash/common.sh

size() { # timeout: limit if network shares offline
	timeout 1 df -H --output=used,size $1 | awk '!/Used/ {print $1"B/"$2"B"}'
}

if mount | grep -q -m1 'mmcblk0p2 on /'; then
	list+=',{
  "icon"       : "microsd"
, "mountpoint" : "/<g>mnt/MPD/SD</g>"
, "mounted"    : true
, "source"     : "/dev/mmcblk0p2"
, "size"       : "'$( size / )'"
}'
fi
usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
if [[ $usb ]]; then
	while read source; do
		mountpoint=$( df -l --output=target $source | tail -1 )
		if [[ $mountpoint ]]; then
			mountpoint=$( stringEscape $mountpoint )
			mounted=true
			size=$( size "$source" )
		else
			mounted=false
			size=
		fi
			list+=',{
  "icon"       : "usbdrive"
, "mountpoint" : "'$mountpoint'"
, "mounted"    : '$mounted'
, "source"     : "'$source'"
, "size"       : "'$size'"
}'
		[[ ! $hddapm ]] && hddapm=$( hdparm -B $source \
										| grep -m1 APM_level \
										| tr -d -c 0-9 )
	done <<< $usb
fi

nas=$( grep -E '/mnt/MPD/NAS|/srv/http/data' /etc/fstab )
if [[ $nas ]]; then
	nas=$( awk '{print $1"^"$2}' <<< $nas | sed 's/\\040/ /g' | sort )
	while read line; do
		source=${line/^*}
		mountpoint=${line/*^}
		mountpoint -q "$mountpoint" && mounted=true || mounted=false
		list+=',{
  "icon"       : "networks"
, "mountpoint" : "'$( stringEscape $mountpoint )'"
, "mounted"    : '$mounted'
, "source"     : "'$source'"
, "size"       : "'$( [[ $mounted == true ]] && size "$mountpoint" )'"
}'
	done <<< $nas
fi
echo "[ ${list:1} ]"
