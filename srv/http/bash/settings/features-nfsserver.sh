#!/bin/bash

writePermission() {
	local dir name p path
	[[ -e $dirsd ]] && path=/mnt/MPD || path=$dirnas
	while read dir; do
		name=${dir##*/}
		[[ ${!name} == true ]] && p=777 || p=755
		chmod -R $p $dir
	done < <( ls -d $path/* | grep -v /data$ )
}

dirshared=$dirdata/mpdshared
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
rm -f $dirmpd/{listing,updating}
$dirbash/cmd.sh mpcremove
systemctl stop mpd
if [[ $ON ]]; then
	if nfsServerActive; then
		writePermission
		pushData refresh '{ "page": "features" }'
		exit
# --------------------------------------------------------------------
	fi
	mv /mnt/MPD/{NVME,SATA,SD,USB} $dirnas &> /dev/null
	ip=$( ipAddress )
	echo "$dirnas  ${ip%.*}.0/24(rw,sync,no_subtree_check,crossmnt)" > /etc/exports
	systemctl enable --now nfs-server
	mkdir -p $dirbackup $dirshareddata
	ipAddress > $filesharedip
	sharedDataCopy rserver
	chown -R http:http $dirshareddata
	chown -R mpd:audio $dirshareddata/{mpd,playlists}
	chmod -R 777 $dirshareddata
	chmod 755 /mnt/MPD/NAS
	writePermission
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
	rm -rf $dirnas/data
	rm -f /mnt/MPD/.mpdignore
	mv $dirnas/{NVME,SATA,SD,USB} /mnt/MPD &> /dev/null
	sharedDataReset
	systemctl start mpd
fi
pushRefresh
pushData refresh '{ "page": "system", "nfsserver": '$TF' }'
pushDirCounts nas
