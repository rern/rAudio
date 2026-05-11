#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

! ipOnline $IP && echo "<c>$IP</c> not reachable." && exit
# --------------------------------------------------------------------
opt_common='_netdev,nofail,noatime'
opt_nfs="defaults,bg,soft,timeo=10,$opt_common"
if [[ $PROTOCOL ]]; then
	if findmnt --fstab "$dirnas/$NAME" &> /dev/null; then
		echo "Name <c>$NAME</c> already exists" && exit
# --------------------------------------------------------------------
	fi
	share=$( sed 's|^[\\/]*||; s|\\|/|g' <<< $SHARE )
	if [[ $PROTOCOL == cifs ]]; then
		[[ ! $USR ]] && USR=quest
		source="//$IP/$share"
		options="username=$USR,password=$PASSWORD"
		options="${options// /\\040},uid=$( id -u mpd ),gid=$( id -g mpd ),$opt_common"
	else
		source="$IP:/$share"
		options=$opt_nfs
	fi
	[[ $OPTIONS ]] && options+=,$OPTIONS
	mountpoint="$dirnas/$NAME"
	fstabSet "$mountpoint" "${source// /\\040} ${mountpoint// /\\040} $PROTOCOL $options 0 0"
else # server rAudio client
	for i in {0..5}; do
		shares=$( timeout 1 showmount --no-headers -e $IP | awk '{print $1}' )
		if [[ $shares ]]; then
			grep -q ^$dirnas <<< $shares && nfsserver=1
			break
		fi
	done
	if [[ ! $nfsserver ]]; then
		echo '<i class="i-nfsserver"></i> <wh>Server rAudio</wh> not found.' && exit
# --------------------------------------------------------------------
	fi
	mv -f /mnt/MPD/{NVME,SATA,SD,USB} /mnt &> /dev/null
	fstabSet $dirnas "$IP:$dirnas  $dirnas  nfs  $opt_nfs  0  0"
	notify -ip $IP nfsserver 'Server rAudio' "Client connected: $( hostname ) @$( ipAddress )"
fi
if [[ $SHAREDDATA ]]; then
	[[ ! $nfsserver ]] && echo "$mountpoint" > $dirshareddata/source
	mpc -q clear
	systemctl stop mpd
	mkdir -p $dirbackup $dirshareddata
	if [[ ! -e $dirshareddata/mpd ]]; then
		rescan=1
		sharedDataCopy
	fi
	sharedDataLink
	appendSortUnique $filesharedip $( ipAddress )
	systemctl start mpd
	[[ $rescan ]] && $dirbash/cmd.sh "mpcupdate
rescan

CMD ACTION PATHMPD"
	pushData refresh '{ "page": "features", "shareddata": true }'
fi
pushRefresh system
pushDirCounts nas
