#!/bin/bash

. /srv/http/bash/common.sh

listItem() { # $1-icon, $2-mountpoint, $3-source, $4-mounted
	local apm hdapm icon info list mounted mountpoint size usf
	icon=$1
	mountpoint=$2
	source=$3
	mounted=$4
	if [[ $mountpoint ]]; then
		if [[ $mounted == true ]]; then # timeout: limit if network shares offline
			size=$( timeout 1 df -H --output=used,size "$mountpoint" | awk '!/Used/ {print $1"B/"$2"B"}' )
		elif [[ $mountpoint ]]; then
			size=$( lsblk -no SIZE $source )B
		fi
		size+=" <c>$( blkid -o value -s TYPE $source )</c>"
	else
		[[ $source == $( getContent $dirshm/formatting ) ]] && icon+=' blink'
		blkid $source | grep -q PTUUID && size=(unpartitioned) || size=(unformatted)
	fi
	list='
  "icon"       : "'$icon'"
, "mountpoint" : "'$( quoteEscape $mountpoint )'"
, "mounted"    : '$mounted'
, "size"       : "'$size'"
, "source"     : "'$source'"'
	if systemctl -q is-active nfs-server; then
		[[ $mountpoint == "$dirnas/"* ]] && list+='
, "rserver"    : true'
	elif [[ $icon == networks && -L $dirmpd ]]; then
		if [[ $mountpoint == $dirnas || $mountpoint == $dirnas/data ]]; then
			shareddata=1
		elif [[ -e $dirnas/data/source ]]; then
			[[ $( awk '{print $2}' $dirnas/data/source | sed 's/\\040/ /g' ) == $mountpoint ]] && shareddata=1
		fi
		[[ $shareddata ]] && list+='
, "shareddata" : true'
	fi
	echo ", {
$list
}"
}
# sd
devmmc=/dev/mmcblk0p2
if [[ ! -e /mnt/SD && -e $devmmc ]]; then
	[[ -e $dirsd ]] && sd=$dirsd || sd=$dirnas/SD
	mount | grep -q -m1 ^$devmmc && list+=$( listItem microsd $sd $devmmc true )
fi
# usb
[[ ! -e /mnt/USB ]] && usb=$( ls /dev/sd* 2> /dev/null )
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
nas=$( grep -E /mnt/MPD/NAS /etc/fstab )
if [[ $nas ]]; then
	nas=$( awk '{print $2"^"$1}' <<< $nas | sed 's/\\040/ /g' | sort )
	while read line; do
		mountpoint=${line/^*}
		source=${line/*^}
		mountpoint -q "$mountpoint" && mounted=true || mounted=false
		list+=$( listItem networks "$mountpoint" "$source" $mounted )
	done <<< $nas
fi
# unpartitioned
blk=$( blkid | grep -v ' TYPE="' )
if [[ $blk ]]; then
	while read dev; do
		[[ ${dev:5:2} == sd ]] && icon=usbdrive || icon=nvme
		list+=$( listItem $icon '' $dev )
	done <<< ${blk/:*}
fi
echo "[ ${list:1} ]"
