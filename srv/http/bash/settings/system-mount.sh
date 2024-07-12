#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

if [[ $PROTOCOL ]]; then
	mountpoint="$dirnas/$NAME"
else # server rAudio client
	path=$( timeout 3 showmount --no-headers -e $IP 2> /dev/null )
	! grep -q $dirnas <<< $path && echo '<i class="i-networks"></i> <wh>Server rAudio</wh> not found.' && exit
# --------------------------------------------------------------------
	rserver=rserver
	mountpoint=$dirnas
	PROTOCOL=nfs
	SHARE=$dirnas
fi
share=$( sed 's|^[\\/]*||; s|\\|/|g' <<< $SHARE )
if [[ $PROTOCOL == cifs ]]; then
	source="//$IP/$share"
	options=noauto
	if [[ ! $USR ]]; then
		options+=,username=guest
	else
		options+=",username=$USR,password=$PASSWORD"
	fi
	options+=,uid=$( id -u mpd ),gid=$( id -g mpd ),iocharset=utf8
else
	source="$IP:/$share"
	options=defaults,noauto,bg,soft,timeo=5
fi
[[ $OPTIONS ]] && options+=,$OPTIONS
mountpointSet "$mountpoint" "${source// /\\040} ${mountpoint// /\\040} $PROTOCOL ${options// /\\040} 0 0"

if [[ $SHAREDDATA ]]; then
	mv /mnt/MPD/{SD,USB} /mnt
	sed -i 's|/mnt/MPD/USB|/mnt/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
	mkdir -p $dirbackup $dirshareddata
	if [[ ! -e $dirshareddata/mpd ]]; then
		rescan=1
		sharedDataCopy $rserver
	fi
	sharedDataLink $rserver
	appendSortUnique $( ipAddress ) $filesharedip
	mpc -q clear
	systemctl restart mpd
	[[ $rescan ]] && $dirbash/cmd.sh "mpcupdate
rescan

CMD ACTION PATHMPD"
	pushData refresh '{ "page": "features", "shareddata": true }'
fi
pushRefresh system
pushDirCounts nas
