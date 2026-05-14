#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 == true ]] && libraryonly=1

file_backup=$dirshm/backup.gz
! bsdtar tf $file_backup 2> /dev/null | grep -q -m1 ^data/system/display.json$ && exit -1
# --------------------------------------------------------------------
dir_config=$dirdata/config

[[ $( mpcState ) == play ]] && $dirbash/cmd.sh playerstop
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
mpc | grep -q ^Updating && systemctl restart mpd
rm -rf $dirdata/{mpd,playlists,webradio}
if [[ $libraryonly ]]; then
	bsdtar xpf $file_backup -C /srv/http data/{mpd,playlists,webradio}
	systemctl restart mpd
	exit
# --------------------------------------------------------------------
fi
find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink
bsdtar xpf $file_backup -C /srv/http
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
partuuid=$( grep -m1 ^PARTUUID /etc/fstab | cut -d- -f1 )
for file in boot/cmdline.txt etc/fstab; do
	sed -i "s/PARTUUID=.*-/$partuuid-/" $dir_config/$file
done
cp -rf $dir_config/* /
[[ -e $dirsystem/enable ]] && systemctl -q enable $( < $dirsystem/enable ) &> /dev/null
[[ -e $dirsystem/disable ]] && systemctl -q disable $( < $dirsystem/disable ) &> /dev/null
grep -q nfs-server $dirsystem/enable && $dirsettings/features.sh nfsserver
hostnamectl set-hostname $( < $dirsystem/hostname )
timedatectl set-timezone $( < $dirsystem/timezone )
if [[ -e $dirsystem/netctlprofile ]]; then
	profile=$( < $dirsystem/netctlprofile )
	[[ $( netctl is-enabled "$profile" ) != enabled ]] && netctl enable "$profile"
fi
[[ -e $dirsystem/crossfade ]] && mpc -q crossfade $( < $dirsystem/crossfade )
rm -rf $dir_config $dirsystem/{crossfade,enable,disable,hostname,netctlprofile,timezone}
dirs=$( ls -d $dirnas/*/ 2> /dev/null )
if [[ $dirs ]]; then
	while read dir; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done <<< $dirs
fi
mountpoints=$( grep $dirnas /etc/fstab | awk '{print $2}' )
if [[ $mountpoints ]]; then
	while read mountpoint; do
		mp=${mountpoint//\040/ }
		mkdir -p "$mp"
		chown mpd:audio "$mp"
	done <<< $mountpoints
fi
[[ -e /etc/modprobe.d/cirrus.conf ]] && touch /boot/cirrus

$dirbash/power.sh reboot
