#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 == true ]] && libraryonly=1

backupfile=$dirshm/backup.gz
! bsdtar tf "$backupfile" 2> /dev/null | grep -q -m1 ^data/system/display.json$ && exit -1
# --------------------------------------------------------------------
dirconfig=$dirdata/config

statePlay && $dirbash/cmd.sh playerstop
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
mpc | grep -q ^Updating && systemctl restart mpd
rm -f $dirmpd/{listing,updating}

if [[ $libraryonly ]]; then
	rm -rf $dirdata/{mpd,playlists,webradio}
	bsdtar xpf $backupfile -C /srv/http data/{mpd,playlists,webradio}
	systemctl restart mpd
	exit
# --------------------------------------------------------------------
fi
find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink


bsdtar xpf $backupfile -C /srv/http

dirPermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
partuuid=$( grep -m1 ^PARTUUID /etc/fstab | cut -d- -f1 )
for file in boot/cmdline.txt etc/fstab; do
	sed -i "s/PARTUUID=.*-/$partuuid-/" $dirconfig/$file
done
cp -rf $dirconfig/* /
[[ -e $dirsystem/enable ]] && systemctl -q enable $( < $dirsystem/enable )
[[ -e $dirsystem/disable ]] && systemctl -q disable $( < $dirsystem/disable )
grep -q nfs-server $dirsystem/enable && $dirsettings/features.sh nfsserver
$dirsettings/system.sh "hostname
$( < $dirsystem/hostname )
CMD NAME"
[[ -e $dirsystem/netctlprofile ]] && netctl enable "$( < $dirsystem/netctlprofile )"
timedatectl set-timezone $( < $dirsystem/timezone )
[[ -e $dirsystem/crossfade ]] && mpc -q crossfade $( < $dirsystem/crossfade )
rm -rf $backupfile $dirconfig $dirsystem/{crossfade,enable,disable,hostname,netctlprofile,timezone}

dirs=$( ls -1d $dirnas/*/ 2> /dev/null )
if [[ $dirs ]]; then
	while read dir; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done <<< $dirs
done
mountpoints=$( grep $dirnas /etc/fstab | awk '{print $2}' )
if [[ $mountpoints ]]; then
	while read mountpoint; do
		mkdir -p "${mountpoint//\040/ }"
	done <<< $mountpoints
fi
[[ -e /etc/modprobe.d/cirrus.conf ]] && touch /boot/cirrus

$dirbash/power.sh reboot
