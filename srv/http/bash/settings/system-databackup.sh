#!/bin/bash

. /srv/http/bash/common.sh

backupfile=$dirshm/backup.gz
dirconfig=$dirdata/config
rm -f $backupfile
alsactl store
files=(
	/boot/cmdline.txt
	/boot/config.txt
	/boot/shutdown.sh
	/boot/startup.sh
	/etc/exports
	/etc/fstab
	/etc/upmpdcli.conf
	/etc/conf.d/wireless-regdom
	/etc/default/snapclient
	/etc/modules-load.d/loopback.conf
	/etc/pacman.d/mirrorlist
	/etc/samba/smb.conf
	/etc/systemd/network/en.network
	/etc/systemd/network/eth.network
	/etc/systemd/timesyncd.conf
	/etc/X11/xorg.conf.d/99-calibration.conf
	/etc/X11/xorg.conf.d/99-raspi-rotate.conf
	/mnt/MPD/NAS/data
)
for file in ${files[@]}; do
	if [[ -e $file ]]; then
		mkdir -p $dirconfig/$( dirname $file )
		cp {,$dirconfig}$file
	fi
done
crossfade=$( mpc crossfade | cut -d' ' -f2 )
[[ $crossfade ]] && echo $crossfade > $dirsystem/crossfade
hostname > $dirsystem/hostname
timedatectl | awk '/zone:/ {print $3}' > $dirsystem/timezone
mkdir -p $dirconfig/var/lib
for dir in alsa bluetooth iwd; do
	cp -r /var/lib/$dir $dirconfig/var/lib &> /dev/null
done
xinitrcfiles=$( ls /etc/X11/xinit/xinitrc.d | grep -v 50-systemd-user.sh )
if [[ $xinitrcfiles ]]; then
	mkdir -p $dirconfig/etc/X11/xinit
	cp -r /etc/X11/xinit/xinitrc.d $dirconfig/etc/X11/xinit
fi

services='bluetooth camilladsp iwd localbrowser mediamtx nfs-server powerbutton shairport-sync smb snapclient spotifyd upmpdcli'
for service in $services; do
	systemctl -q is-active $service && enable+=" $service" || disable+=" $service"
done
[[ $enable ]] && echo $enable > $dirsystem/enable
[[ $disable ]] && echo $disable > $dirsystem/disable

bsdtar \
	--exclude './addons' \
	--exclude './embedded' \
	--exclude './shm' \
	-czf $backupfile \
	-C /srv/http \
	data \
	2> /dev/null && echo 1

rm -rf $dirconfig
rm -f $dirsystem/{crossfade,disable,enable,hostname,timezone}
