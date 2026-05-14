#!/bin/bash

exec &> /dev/null # suppress stdout stderr

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
hostnamectl set-hostname $( < $dirsystem/hostname )
timedatectl set-timezone $( < $dirsystem/timezone )
mpc -q crossfade $( getContent $dirsystem/crossfade )
while read dir; do
	umount -l "$dir"
	rmdir "$dir"
done < <( ls -d $dirnas/*/ 2> /dev/null )
while read mountpoint; do
	mp=${mountpoint//\040/ }
	mkdir -p "$mp"
done < <( grep $dirnas /etc/fstab | awk '{print $2}' )
profile=$( getContent $dirsystem/netctlprofile )
[[ $profile ]] && netctl enable "$profile"
[[ -s $dirsystem/enable ]] && systemctl enable $( < $dirsystem/enable )
[[ -s $dirsystem/disable ]] && systemctl disable $( < $dirsystem/disable )
grep -q nfs-server $dirsystem/enable && $dirsettings/features.sh nfsserver
rm -rf $dir_config $dirsystem/{crossfade,enable,disable,hostname,netctlprofile,timezone}

$dirbash/power.sh reboot
