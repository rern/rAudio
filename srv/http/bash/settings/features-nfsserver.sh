#!/bin/bash

usbRemount() { # udevil - devmon@http.service - /mnt/MPD/USB <> /mnt/MPD/NAS/USB
	local dir_media dir_source dir_target p part_usb
	if [[ $1 == rserver ]]; then
		dir_source=/mnt/MPD
		dir_target=$dirnas
		dir_media=$dirnas/USB
	else
		rm -rf $dirnas/data
		dir_source=$dirnas
		dir_target=/mnt/MPD
		dir_media=$dirusb
	fi
	part_usb=$( lsblk -no PATH | grep ^/dev/sd.[0-9] )
	for p in $part_usb; do # 1/3 unmount
		udevil umount -l "$d"
	done
	mv $dir_source/{NVME,SATA,SD,USB} $dir_target &> /dev/null # 2/3 move mountpoints
	sed -i -E "s|^(allowed_media_dirs = ).*|\1$dir_media|" /etc/udevil/udevil.conf
	systemctl restart devmon@http
	for p in $part_usb; do # 3/3 remount
		udevil mount $d
	done
}

dirshared=$dirdata/mpdshared
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
rm -f $dirmpd/{listing,updating}
$dirbash/cmd.sh mpcremove
systemctl stop mpd
if [[ $ON ]]; then
	usbRemount rserver
	ip=$( ipAddress )
	echo "$dirnas  ${ip%.*}.0/24(rw,sync,no_subtree_check,crossmnt)" > /etc/exports
	systemctl enable --now nfs-server
	mkdir -p $dirbackup $dirshareddata
	ipAddress > $filesharedip
	sharedDataCopy rserver
	chown -R http:http $dirshareddata
	chown -R mpd:audio $dirshareddata/{mpd,playlists}
	chmod -R 777 /mnt/MPD/NAS
	sharedDataLink rserver
	if [[ -e $dirshared ]]; then
		action=update
		cp -f $dirshared/* $dirmpd
		rm -rf $dirshared
	else
		action=rescan
	fi
	systemctl start mpd
	while read file; do
		sed -E -i '/^(NVME|SATA|SD|USB)/ s|^|NAS/|' "$file" # prepend path
	done < <( ls $dirbookmarks/* $dirplaylists/* )
	$dirbash/cmd.sh "mpcupdate
$action

CMD ACTION PATHMPD" &> /dev/null &
else
	mkdir -p $dirshared
	cp $dirmpd/* $dirshared
	systemctl disable --now nfs-server
	> /etc/exports
	usbRemount
	rm -f $filesharedip /mnt/MPD/.mpdignore
	sharedDataReset
	systemctl start mpd
fi
pushRefresh
pushData refresh '{ "page": "system", "nfsserver": '$TF' }'
pushDirCounts nas
