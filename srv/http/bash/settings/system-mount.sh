#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

! ipOnline $IP && echo "<c>$IP</c> not reachable." && exit
# --------------------------------------------------------------------
opt_nfs="defaults,bg,soft,timeo=10,_netdev,nofail"
if [[ $PROTOCOL ]]; then
	mountpoint="$dirnas/$NAME"
	if grep -q "^${mountpoint// /\\\\040}$" < <( awk '{print $2}' /etc/fstab ); then
		echo "Name <c>$NAME</c> already exists"
		exit
# --------------------------------------------------------------------
	fi
else # server rAudio client
	for i in {0..5}; do
		shares=$( timeout 1 showmount --no-headers -e $IP | awk '{print $1}' )
		if [[ $shares ]]; then
			grep -q ^$dirnas <<< $shares && rserver=rserver
			break
		fi
	done
	[[ ! $rserver ]] && echo '<i class="i-networks"></i> <wh>Server rAudio</wh> not found.' && exit
# --------------------------------------------------------------------
	mv /mnt/MPD/{NVME,SATA,SD,USB} /mnt &> /dev/null
	fstab="\
$( < /etc/fstab )
$IP:$dirnas  $dirnas  nfs  $opt_nfs  0  0"
	fstabColumnReload "$fstab"
	notify -ip $IP nfsserver 'Server rAudio' "Client connected: $( ipAddress )"
fi
if [[ ! $rserver ]]; then
	share=$( sed 's|^[\\/]*||; s|\\|/|g' <<< $SHARE )
	if [[ $PROTOCOL == cifs ]]; then
		[[ ! $USR ]] && USR=quest
		source="//$IP/$share"
		options="username=$USR,password=$PASSWORD"
		options="${options// /\\040},uid=$( id -u mpd ),gid=$( id -g mpd ),_netdev,nofail"
	else
		source="$IP:/$share"
		options=$opt_nfs
	fi
	[[ $OPTIONS ]] && options+=,$OPTIONS
	fstabSet "$mountpoint" "${source// /\\040} ${mountpoint// /\\040} $PROTOCOL $options 0 0"
fi
if [[ $SHAREDDATA ]]; then
	mpc -q clear
	systemctl stop mpd
	mkdir -p $dirbackup $dirshareddata
	if [[ ! -e $dirshareddata/mpd ]]; then
		rescan=1
		sharedDataCopy $rserver
	fi
	sharedDataLink $rserver
	appendSortUnique $filesharedip $( ipAddress )
	systemctl start mpd
	[[ $rescan ]] && $dirbash/cmd.sh "mpcupdate
rescan

CMD ACTION PATHMPD"
	pushData refresh '{ "page": "features", "shareddata": true }'
fi
pushRefresh system
pushDirCounts nas
