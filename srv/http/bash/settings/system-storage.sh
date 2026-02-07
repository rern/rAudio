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
			gib=$( lsblk -no SIZE $source )
			[[ $gib ]] && size=$( calc 0 ${gib:0:-1}*1.07374182 )${gib: -1}B # xxG > xx > XXGB
		fi
		[[ $size ]] && size+=" <c>$( blkid -o value -s TYPE $source )</c>" # fstype
	else
		blkid $source | grep -q PTUUID && size=unpartitioned || size=unformatted
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
[[ ! -e /mnt/USB ]] && lines=$( ls /dev/sd* 2> /dev/null | grep [0-9]$ )
if [[ $lines ]]; then
	while read source; do
		grep -q ^$source /etc/fstab && continue # no fstab
		[[ ! $( blkid -o value -s TYPE $source ) ]] && continue # no fs - unformatted
		
		mountpoint=$( df -l --output=target $source | tail -1 )
		if [[ $mountpoint != /dev ]]; then
			mounted=true
		else
			mounted=false
			mountpoint="$dirusb/$( lsblk -no label $source )"
		fi
		[[ $mountpoint == $mountpointprev ]] && continue
		
		mountpointprev=$mountpoint
		list+=$( listItem usb "$mountpoint" "$source" $mounted )
	done <<< $lines
fi
# fstab - nas nvme sata
lines=$( grep -v ^PARTUUID /etc/fstab )
if [[ $lines ]]; then
	lines=$( awk '{print $2"^"$1}' <<< $lines | sed 's/\\040/ /g' | sort -r )
	while read line; do
		mountpoint=${line/^*}
		source=${line/*^}
		[[ ${source:0:4} == /dev ]] && icon=${mountpoint:9:4} || icon=networks
		mountpoint -q "$mountpoint" && mounted=true || mounted=false
		list+=$( listItem ${icon,,} "$mountpoint" "$source" $mounted )
	done <<< $lines
fi
# unformatted / unpartitioned
blk=$( blkid | grep -v ' TYPE="' )
if [[ $blk ]]; then
	while read dev; do
		[[ ${dev:5:2} == sd ]] && disk=${dev:0:-1} || disk=${dev:0:-2} # /dev/sda1 > /dev/sda ; /dev/nvme0n1p1 > /dev/nvme0n1
		icon=$( lsblk -no TRAN $disk ) # nvme sata usb
		list+=$( listItem $icon '' $dev )
	done <<< ${blk/:*}
fi
echo "[ ${list:1} ]"
