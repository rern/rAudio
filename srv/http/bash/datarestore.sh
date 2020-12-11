#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
dirsystem=$dirdata/system

# clear default enabled features and updating flags
rm -f $dirsystem/{localbrowser,onboard-audio,onboard-wlan,updating,listing,wav}

mv $dirdata/addons $dirdata/shm

systemctl stop mpd

backupfile=$dirdata/tmp/backup.gz
bsdtar -xpf $backupfile -C /srv/http

mv $dirdata/shm/addons $dirdata
cp -rf $dirdata/config/* /
[[ -e $dirsystem/enable ]] && systemctl -q enable $( cat $dirsystem/enable )

rm -rf $backupfile $dirdata/config $dirsystem/enable

chown -R http:http /srv/http
chown mpd:audio $dirdata/mpd/mpd* &> /dev/null
chmod 755 /srv/http/* $dirbash/* /srv/http/settings/*

# color
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
# hostname
hostname=$( cat $dirsystem/hostname )
[[ $hostname != rAudio ]] && $dirbash/system.sh hostname$'\n'$hostname
# splash
rotate=$( grep rotate /etc/localbrowser.conf 2> /dev/null | cut -d'"' -f2 )
[[ -z $rotate ]] && rotate=NORMAL
ln -sf /srv/http/assets/img/{$rotate,splash}.png
# timezone
[[ -e $dirsystem/timezone ]] && timedatectl set-timezone $( cat $dirsystem/timezone )

# netctl
netctl=$( ls -p /etc/netctl | grep -v / | head -1 )
[[ -n $netctl ]] && cp "$netctl" /boot/wifi
# fstab
readarray -t mountpoints <<< $( awk '/\/mnt\/MPD\/NAS/ {print $2}' /etc/fstab | sed 's/\\040/ /g' )
if [[ -n $mountpoints ]]; then
	for mountpoint in $mountpoints; do
		mkdir -p "$mountpoint"
	done
fi

echo 'Restore database and settings' > /srv/http/data/shm/reboot

curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "all" }'
