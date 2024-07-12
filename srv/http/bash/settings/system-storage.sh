#!/bin/bash

. /srv/http/bash/common.sh

size() {
	path=$1
	[[ $path == / ]] && target_source=target || target_source=source
	# timeout for network shares
	timeout 1 df -H --output=used,size,$target_source \
		| grep "$path$" \
		| awk '{print $1"B/"$2"B"}'
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
		mountpoint=$( df -l --output=target,source | sed -n "\|$source| {s| *$source||; p}" )
		if [[ $mountpoint ]]; then
			list+=',{
"icon"       : "usbdrive"
, "mountpoint" : "'$( stringEscape $mountpoint )'"
, "mounted"    : true
, "source"     : "'$source'"
, "size"       : "'$( size "$source" )'"
}'
		else
			label=$( e2label $source )
			[[ ! $label ]] && label=?
			list+=',{
"icon"      : "usbdrive"
,"mountpoint" : "'$dirusb/$label'"
,"mounted"    : false
,"source"     : "'$source'"
}'
		fi
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
, "size"       : "'$( [[ $mounted == true ]] && size "$source" )'"
}'
	done <<< $nas
fi
echo "[ ${list:1} ]"
