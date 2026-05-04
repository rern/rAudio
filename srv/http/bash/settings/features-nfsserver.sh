#!/bin/bash

dirshared=$dirdata/mpdshared
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
rm -f $dirmpd/{listing,updating}
$dirbash/cmd.sh mpcremove
systemctl stop mpd
if [[ $ON ]]; then
	ip=$( ipAddress )
	echo "$dirnas  ${ip%.*}.0/24(rw,sync,no_subtree_check,crossmnt)" > /etc/exports
	for d in NVME SATA SD USB; do
		dir=/mnt/MPD/$d
		[[ -d $dir ]] && mv $dir $dirnas
	done
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
	$dirbash/cmd.sh "mpcupdate
$action

CMD ACTION PATHMPD"
	while read file; do
		sed -E -i '/^(NVME|SATA|SD|USB)/ s|^|NAS/|' "$file" # prepend path
	done < <( ls $dirbookmarks/* $dirplaylists/* )
else
	mkdir -p $dirshared
	cp $dirmpd/* $dirshared
	systemctl disable --now nfs-server
	> /etc/exports
	for d in NVME SATA SD USB; do
		dir=$dirnas/$d
		[[ -d $dir ]] && mv $dir /mnt/MPD
	done
	rm -rf /mnt/MPD/NAS/data
	rm -f $filesharedip /mnt/MPD/.mpdignore
	sharedDataReset
	systemctl start mpd
fi
pushRefresh
pushData refresh '{ "page": "system", "nfsserver": '$TF' }'
pushDirCounts nas
