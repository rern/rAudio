#!/bin/bash

. /srv/http/bash/common.sh

listItem() { # $1-icon, $2-mountpoint, $3-source, $4-mounted
	local apm info ust                # timeout: limit if network shares offline
	[[ $1 == usbdrive ]] && apm=$( hdparm -B $3 | awk '/APM/ {print $NF}' ) # N / not supported
	[[ ! $apm || $apm == supported ]] && apm=false
	info=false
	[[ $1 != networks ]] && hdparm -I $3 &> /dev/null && info=true
	[[ $4 == true ]] && size=$( timeout 1 df -H --output=used,size,fstype $2 | awk '!/Used/ {print $1"B/"$2"B <gr>"$3"</gr>"}' )
	echo ',{
  "apm"        : '$apm'
, "icon"       : "'$1'"
, "info"       : '$info'
, "mountpoint" : "'$( stringEscape $2 )'"
, "size"       : "'$size'"
, "source"     : "'$3'"
}'
}
# sd
mount | grep -q -m1 'mmcblk0p2 on /' && list+=$( listItem microsd / /dev/mmcblk0p2 true )
# usb
usb=$( ls -1 /dev/sd* 2> /dev/null )
if [[ $usb ]]; then
	while read source; do
		# iso mounted by /dev/sda not /dev/sda1
		[[ ${source: -1} != [0-9] && $( lsblk -ndo FSTYPE $source ) != iso9660 ]] && continue
		
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
