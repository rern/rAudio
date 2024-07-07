#!/bin/bash

. /srv/http/bash/common.sh

if [[ ! -e $filesharedip ]]; then
	if mount | grep -q -m1 'mmcblk0p2 on /'; then
		used_size=( $( df -lh --output=used,size,target | grep '/$' ) )
		list+=',{
  "icon"       : "microsd"
, "mountpoint" : "/<g>mnt/MPD/SD</g>"
, "mounted"    : true
, "source"     : "/dev/mmcblk0p2"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
}'
	fi
	usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
	if [[ $usb ]]; then
		while read source; do
			mountpoint=$( df -l --output=target,source | sed -n "\|$source| {s| *$source||; p}" )
			if [[ $mountpoint ]]; then
				used_size=( $( df -lh --output=used,size,source | grep "$source" ) )
				list+=',{
  "icon"       : "usbdrive"
, "mountpoint" : "'$( stringEscape $mountpoint )'"
, "mounted"    : true
, "source"     : "'$source'"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
}'
			else
				label=$( e2label $source )
				[[ ! $label ]] && label=?
				list+=',{"icon":"usbdrive","mountpoint":"'$dirusb/$label'","mounted":false,"source":"'$source'"}'
			fi
			[[ ! $hddapm ]] && hddapm=$( hdparm -B $source \
											| grep -m1 APM_level \
											| tr -d -c 0-9 )
		done <<< $usb
	fi
fi
nas=$( grep -E '/mnt/MPD/NAS|/srv/http/data' /etc/fstab )
if [[ $nas ]]; then
	nas=$( awk '{print $1"^"$2}' <<< $nas | sed 's/\\040/ /g' | sort )
	while read line; do
		source=${line/^*}
		mountpoint=${line/*^}
		mounted=$( grep -q " ${mountpoint// /\\\\040} " /proc/mounts && echo true || echo false )
		if [[ $mounted == true ]]; then
			mounted=true
			used_size=( $( timeout 1 df -h --output=used,size,source | grep "$source" ) )
			size=${used_size[0]}B/${used_size[1]}B
		else
			mounted=false
			size=
		fi
		list+=',{
  "icon"       : "networks"
, "mountpoint" : "'$( stringEscape $mountpoint )'"
, "mounted"    : '$mounted'
, "source"     : "'$source'"
, "size"       : "'${used_size[0]}'B/'${used_size[1]}'B"
}'
	done <<< $nas
fi
echo "[ ${list:1} ]"
