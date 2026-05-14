#!/bin/bash

. /srv/http/bash/common.sh

file_backup=$dirshm/backup.gz
dir_config=$dirdata/config
hostname > $dirsystem/hostname
alsactl store
files=$( cat << EOF
/boot/cmdline.txt
/boot/config.txt
/boot/shutdown.sh
/boot/startup.sh
/etc/exports
/etc/fstab
/etc/netctl/*
/etc/shairport-sync.conf*
/etc/snapserver.conf
/etc/spotifyd.conf*
/etc/upmpdcli.conf
/etc/conf.d/wireless-regdom
/etc/default/snapclient
/etc/modprobe.d/cirrus.conf
/etc/modules-load.d/loopback.conf
/etc/pacman.d/mirrorlist
/etc/samba/smb.conf
/etc/systemd/network/*
/etc/systemd/timesyncd.conf
/etc/X11/xorg.conf.d/*
/var/lib/alsa/asound.state
/var/lib/bluetooth/*
/var/lib/iwd/ap/*
/var/lib/snapserver/server.json
/etc/X11/xinit/xinitrc.d/*
EOF
)
while read file; do
	[[ ! -e $file && ! -e ${file/\*} ]] && continue
	
	dir_target=$dir_config/$( dirname $file | head -1 )
	mkdir -p $dir_target
	cp $file $dir_target &> /dev/null # suppress not include dirs
done  <<< $files
[[ -e /etc/modprobe.d/cirrus.conf ]] && touch $dir_config/boot/cirrus
mpc crossfade | cut -d' ' -f2 > $dirsystem/crossfade
netctl list | sed '/^\*/ s/^\* //' > $dirsystem/netctlprofile
timedatectl | awk '/zone:/ {print $3}' > $dirsystem/timezone
nfsServerActive && cp -r $dirshareddata $dir_config
services='bluetooth camilladsp iwd localbrowser mediamtx nfs-server powerbutton shairport-sync smb snapserver spotifyd upmpdcli'
for service in $services; do
	systemctl -q is-active $service && enable+=" $service" || disable+=" $service"
done
echo $enable > $dirsystem/enable
echo $disable > $dirsystem/disable

bsdtar \
	--exclude './addons' \
	--exclude './embedded' \
	--exclude './shm' \
	-czf $file_backup \
	-C /srv/http \
	data \
	2> /dev/null && echo 1

rm -rf $dir_config
rm -f $dirsystem/{crossfade,disable,enable,hostname,timezone}
