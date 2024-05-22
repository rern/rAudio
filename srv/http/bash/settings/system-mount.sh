#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

! ipOnline $IP && echo "IP address not found: <wh>$IP</wh>" && exit
# --------------------------------------------------------------------
if [[ $PROTOCOL ]]; then
	mountpoint="$dirnas/$NAME"
else # server rAudio client
	path=$( timeout 3 showmount --no-headers -e $IP 2> /dev/null )
	! grep -q $dirnas <<< $path && echo '<i class="i-networks"></i> <wh>Server rAudio</wh> not found.' && exit
# --------------------------------------------------------------------
	PROTOCOL=nfs
	mountpoint=$dirnas
	SHARE=$dirnas
fi
umount -ql "$mountpoint"
mkdir -p "$mountpoint"
chown mpd:audio "$mountpoint"
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
fstab="\
$( < /etc/fstab )
${source// /\\040}  ${mountpoint// /\\040}  $PROTOCOL  ${options// /\\040}  0  0"
mv /etc/fstab{,.backup}
column -t <<< $fstab > /etc/fstab
systemctl daemon-reload
std=$( mount "$mountpoint" 2>&1 )
if [[ $? != 0 ]]; then
	mv -f /etc/fstab{.backup,}
	rmdir "$mountpoint"
	systemctl daemon-reload
	sed -n '1 {s/.*: //; p}' <<< $std
	exit
# --------------------------------------------------------------------
else
	rm /etc/fstab.backup
fi

for i in {1..5}; do
	sleep 1
	mount | grep -q -m1 "$mountpoint" && break
done

if [[ $SHAREDDATA ]]; then
	$dirsettings/system.sh shareddataset
else
	pushRefresh system
fi

pushDirCounts nas
