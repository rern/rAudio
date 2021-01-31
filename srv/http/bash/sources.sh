#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"


pushRefresh() {
	pushstream refresh '{ "page": "sources" }'
}
pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
update() { # for /etc/conf.d/devmon - devmon@http.service
	echo USB $dirsystem/updating
	if mpc | grep -q '^Updating'; then
		touch $dirsystem/updatingusb
	else
		mpc update USB
	fi
	sleep 1
	pushRefresh
	pushstream mpdupdate 1
}

case ${args[0]} in

mount )
	data=${args[1]}
	protocol=$( jq -r .protocol <<< $data )
	ip=$( jq -r .ip <<< $data )
	directory=$( jq -r .directory <<< $data )
	mountpoint="/mnt/MPD/NAS/$( jq -r .mountpoint <<< $data )"
	options=$( jq -r .options <<< $data )

	! ping -c 1 -w 1 $ip &> /dev/null && echo 'IP not found.' && exit

	if [[ -e $mountpoint ]]; then
		find "$mountpoint" -mindepth 1 | read && echo "Mount name <code>$mountpoint</code> not empty." && exit
	else
		mkdir "$mountpoint"
	fi
	chown mpd:audio "$mountpoint"
	[[ $protocol == cifs ]] && source="//$ip/$directory" || source="$ip:$directory"
	mount -t $protocol "$source" "$mountpoint" -o $options
	if ! mountpoint -q "$mountpoint"; then
		echo 'Mount failed.'
		rmdir "$mountpoint"
		exit
	fi

	source=${source// /\\040} # escape spaces in fstab
	name=$( basename "$mountpoint" )
	mountpoint=${mountpoint// /\\040}
	echo "$source  $mountpoint  $protocol  $options  0  0" >> /etc/fstab && echo 0
	/srv/http/bash/sources-update.sh "$mountpoint"
	[[ $( jq -r .update <<< $data ) == true ]] && mpc update NAS
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
usbconnect )
	# for /etc/conf.d/devmon - devmon@http.service
	pushstream notify '{"title":"USB Drive","text":"Connected.","icon":"usbdrive"}'
	update
	;;
usbremove )
	# for /etc/conf.d/devmon - devmon@http.service
	pushstream notify '{"title":"USB Drive","text":"Removed.","icon":"usbdrive"}'
	update
	;;
	
esac
