#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

! ipOnline $IP && echo "<c>$IP</c> not reachable." && exit
# --------------------------------------------------------------------
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
			grep -q ^/mnt/MPD/ <<< $shares && rserver=rserver
			break
		fi
		sleep 1
	done
	[[ ! $rserver ]] && echo '<i class="i-networks"></i> <wh>Server rAudio</wh> not found.' && exit
# --------------------------------------------------------------------
	fstab=$( < /etc/fstab )
	while read share; do
		[[ ${share: -4} == data ]] && mountpoint=$share || mountpoint=${share/MPD/MPD\/NAS}
		mkdir -p $mountpoint
		fstab+="
$IP:$share  $mountpoint  nfs  defaults,bg,soft,timeo=5  0  0"
	done <<< $shares
	fstabColumnReload "$fstab"
	mount -a &> /dev/null
fi
share=$( sed 's|^[\\/]*||; s|\\|/|g' <<< $SHARE )
if [[ $PROTOCOL == cifs ]]; then
	[[ ! $USR ]] && USR=quest
	source="//$IP/$share"
	options="username=$USR,password=$PASSWORD,uid=$( id -u mpd ),gid=$( id -g mpd ),iocharset=utf8"
else
	source="$IP:/$share"
	options=defaults,bg,soft,timeo=5
fi
[[ $OPTIONS ]] && options+=,$OPTIONS
[[ ! $fstab ]] && fstabSet "$mountpoint" "${source// /\\040} ${mountpoint// /\\040} $PROTOCOL ${options// /\\040} 0 0"

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
