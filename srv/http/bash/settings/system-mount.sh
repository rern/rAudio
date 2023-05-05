#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

mountpoint="$dirnas/$NAME"

! ipOnline $IP && echo "IP address not found: <wh>$IP</wh>" && exit

[[ $( ls "$mountpoint" ) ]] && echo "Mount name <code>$mountpoint</code> not empty." && exit

umount -ql "$mountpoint"
mkdir -p "$mountpoint"
chown mpd:audio "$mountpoint"
if [[ $PROTOCOL == cifs ]]; then
	source="//$IP/$SHARE"
	options=noauto
	if [[ ! $USER ]]; then
		options+=,username=guest
	else
		options+=",username=$USER,password=$PASSWORD"
	fi
	options+=,uid=$( id -u mpd ),gid=$( id -g mpd ),iocharset=utf8
else
	source="$IP:$SHARE"
	options=defaults,noauto,bg,soft,timeo=5
fi
[[ $OPTIONS ]] && options+=,$OPTIONS
fstab="\
$( < /etc/fstab )
$( space2ascii $source )  $( space2ascii $mountpoint )  $PROTOCOL  $( space2ascii $options )  0  0"
mv /etc/fstab{,.backup}
column -t <<< $fstab > /etc/fstab
systemctl daemon-reload
std=$( mount "$mountpoint" 2>&1 )
if [[ $? != 0 ]]; then
	mv -f /etc/fstab{.backup,}
	rmdir "$mountpoint"
	systemctl daemon-reload
	echo "\
Mount failed:
<br><code>$source</code>
<br>$( sed -n '1 {s/.*: //; p}' <<< $std )"
	exit
	
else
	rm /etc/fstab.backup
fi

if [[ $update == true ]]; then
	echo ${mountpoint:9} > $dirmpd/updating # /mnt/MPD/NAS/... > NAS/...
	$dirbash/cmd.sh mpcupdate
fi
for i in {1..5}; do
	sleep 1
	mount | grep -q -m1 "$mountpoint" && break
done
[[ $SHAREDDATA ]] && $dirsettings/system.sh shareddataset || pushRefresh
