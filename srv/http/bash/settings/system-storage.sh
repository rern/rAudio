#!/bin/bash

. /srv/http/bash/common.sh

listItem() { # $1-icon, $2-mountpoint, $3-source, $4-mounted
	local used_size                # timeout: limit if network shares offline
	[[ $4 == true ]] && used_size=$( timeout 1 df -H --output=used,size $2 | awk '!/Used/ {print $1"B/"$2"B"}' )
	echo ',{
  "icon"       : "'$1'"
, "mountpoint" : "'$( stringEscape $2 )'"
, "size"       : "'$used_size'"
, "source"     : "'$3'"
}'
}
# sd
mount | grep -q -m1 'mmcblk0p2 on /' && list+=$( listItem microsd / /dev/mmcblk0p2 true )
# usb
usb=$( mount | grep ^/dev/sd | cut -d' ' -f1 )
if [[ $usb ]]; then
	while read source; do
		mountpoint=$( df -l --output=target $source | tail -1 )
		[[ $mountpoint ]] && mounted=true || mounted=false
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
