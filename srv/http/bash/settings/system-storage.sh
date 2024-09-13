#!/bin/bash

. /srv/http/bash/common.sh

listItem() { # $1-icon, $2-mountpoint, $3-source, $4-mounted
	local apm icon info mounted mountpoint size usf
	icon=$1
	mountpoint=$2
	source=$3
	mounted=$4
	[[ $icon == usbdrive ]] && apm=$( hdparm -B $source | awk '/APM/ {print $NF}' ) # N / not supported
	[[ ! $apm || $apm == supported ]] && apm=false || apm=true
	info=false
	[[ $icon != networks ]] && hdparm -I $source &> /dev/null && info=true
	if [[ $mounted == true ]]; then # timeout: limit if network shares offline
		size=$( timeout 1 df -H --output=used,size $mountpoint | awk '!/Used/ {print $1"B/"$2"B"}' )
		[[ ${source:0:4} == /dev ]] && size+=" <gr>$( blkid -o value -s TYPE $source )</gr>"
	fi
	echo ',{
  "apm"        : '$apm'
, "icon"       : "'$icon'"
, "info"       : '$info'
, "mountpoint" : "'$( quoteEscape $mountpoint )'"
, "size"       : "'$size'"
, "source"     : "'$source'"
}'
}
# sd
mount | grep -q -m1 'mmcblk0p2 on /' && list+=$( listItem microsd / /dev/mmcblk0p2 true )
# usb
usb=$( ls -1 /dev/sd* 2> /dev/null )
if [[ $usb ]]; then
	while read source; do
		type=$( blkid -o value -s TYPE $source )
		[[ ! $type ]] && continue
		
		mountpoint=$( df -l --output=target $source | tail -1 )
		if [[ $mountpoint != /dev ]]; then
			mounted=true
		else
			mounted=false
			mountpoint="$dirusb/$( lsblk -no label $source )"
		fi
		[[ $mountpoint == $mountpointprev ]] && continue
		
		mountpointprev=$mountpoint
		list+=$( listItem usbdrive "$mountpoint" "$source" $mounted )
	done <<< $usb
fi
# nas
nas=$( grep -E '/mnt/MPD/NAS|/srv/http/data' /etc/fstab )
if [[ $nas ]]; then
	nas=$( awk '{print $1"^"$2}' <<< $nas | sed 's/\\040/ /g' | sort )
	while read line; do
		source=${line/^*}
		mountpoint=${line/*^}
		mountpoint -q "$mountpoint" && mounted=true || mounted=false
		list+=$( listItem networks "$mountpoint" "$source" $mounted )
	done <<< $nas
fi
echo "[ ${list:1} ]"
