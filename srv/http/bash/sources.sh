#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "sources" }'
}

case ${args[0]} in

mount )
	mountpoint=/mnt/MPD/NAS/${args[1]}
	ip=${args[2]}
	source=${args[3]}
	cifsnfs=${args[4]}
	options=${args[5]}
	update=${args[6]}

	! ping -c 1 -w 1 $ip &> /dev/null && echo 'IP not found.' && exit

	if [[ -e $mountpoint ]]; then
		find "$mountpoint" -mindepth 1 | read && echo "Mount name <code>$mountpoint</code> not empty." && exit
	else
		mkdir "$mountpoint"
	fi
	chown mpd:audio "$mountpoint"
	[[ -n $options ]] && optmount="-o $options"
	mount -t $cifsnfs "$source" "$mountpoint" $optmount
	if ! mountpoint -q "$mountpoint"; then
		echo 'Mount failed.'
		rmdir "$mountpoint"
		exit
	fi

	source=${source// /\\040} # escape spaces in fstab
	name=$( basename "$mountpoint" )
	mountpoint=${mountpoint// /\\040}
	echo "$source  $mountpoint  $cifsnfs  $options  0  0" >> /etc/fstab && echo 0
	/srv/http/bash/sources-update.sh "$mountpoint"
	[[ $update == true ]] && mpc update NAS
	pushRefresh
	;;
remount )
	mountpoint=${args[1]}
	source=${args[2]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		mount "$mountpoint"
	else
		udevil mount "$source"
	fi
	pushRefresh
	;;
remove )
	mountpoint=${args[1]}
	umount -l "$mountpoint"
	sed -i "\|${mountpoint// /.040}| d" /etc/fstab
	rmdir "$mountpoint" &> /dev/null
	rm -f "$dirsystem/fstab-${mountpoint/*\/}"
	pushRefresh
	;;
unmount )
	mountpoint=${args[1]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		umount -l "$mountpoint"
	else
		udevil umount -l "$mountpoint"
	fi
	pushRefresh
	;;
	
esac
