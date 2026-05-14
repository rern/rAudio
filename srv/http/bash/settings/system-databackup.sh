#!/bin/bash

. /srv/http/bash/common.sh

file_backup=$dirshm/backup.gz
dir_config=$dirdata/config
name_host=$( hostname | tee $dirsystem/hostname )
alsactl store
files="\
/boot/cmdline.txt
/boot/config.txt
/boot/shutdown.sh
/boot/startup.sh
/etc/exports
/etc/fstab
/etc/shairport-sync.conf
/etc/shairport-sync.conf.default
/etc/snapserver.conf
/etc/spotifyd.conf
/etc/spotifyd.conf.default
/etc/upmpdcli.conf
/etc/conf.d/wireless-regdom
/etc/default/snapclient
/etc/modprobe.d/cirrus.conf
/etc/modules-load.d/loopback.conf
/etc/pacman.d/mirrorlist
/etc/samba/smb.conf
/etc/systemd/network/en.network
/etc/systemd/network/eth.network
/etc/systemd/timesyncd.conf
/etc/X11/xorg.conf.d/99-calibration.conf
/etc/X11/xorg.conf.d/99-raspi-rotate.conf
/var/lib/alsa/asound.state
/var/lib/iwd/ap/$name_host.ap
/var/lib/snapserver/server.json"
while read file; do
	if [[ -e $file ]]; then
		mkdir -p $dir_config/$( dirname $file )
		cp {,$dir_config}$file
	fi
done  <<< $files
crossfade=$( mpc crossfade | cut -d' ' -f2 )
[[ $crossfade ]] && echo $crossfade > $dirsystem/crossfade
timedatectl | awk '/zone:/ {print $3}' > $dirsystem/timezone
file_profile=$( ls -p /etc/netctl | grep -v / )
if [[ $file_profile ]]; then
	cp -r /etc/netctl $dir_config/etc
	while read profile; do
		if [[ $( netctl is-enabled "$profile" ) == enabled ]]; then
			echo $profile > $dirsystem/netctlprofile
			break
		fi
	done <<< $file_profile
fi
mkdir -p $dir_config/var/lib
cp -r /var/lib/bluetooth $dir_config/var/lib &> /dev/null
file_xinitrc=$( ls /etc/X11/xinit/xinitrc.d | grep -v 50-systemd-user.sh )
if [[ $file_xinitrc ]]; then
	mkdir -p $dir_config/etc/X11/xinit
	cp -r /etc/X11/xinit/xinitrc.d $dir_config/etc/X11/xinit
fi
if [[ -e $dirshareddata ]]; then
	nfsServerActive && cp -rL $dirshareddata $dir_config
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
	-czf $file_backup \
	-C /srv/http \
	data \
	2> /dev/null && echo 1

rm -rf $dir_config
rm -f $dirsystem/{crossfade,disable,enable,hostname,timezone}
