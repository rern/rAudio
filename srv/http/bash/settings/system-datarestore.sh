#!/bin/bash

. /srv/http/bash/common.sh

backupfile=$dirshm/backup.gz
! bsdtar tf "$backupfile" 2> /dev/null | grep -q -m1 ^data/system/display.json$ && exit -1

dirconfig=$dirdata/config
[[ $1 == true ]] && libraryonly=1

statePlay && $dirbash/cmd.sh playerstop
[[ -e $dirmpd/listing ]] && killall cmd-list.sh
mpc | grep -q ^Updating && systemctl restart mpd
rm -f $dirmpd/{listing,updating}

if [[ $libraryonly ]]; then
	bsdtar -xpf $backupfile -C /srv/http data/{mpd,playlists,webradio}
	systemctl restart mpd
	exit
fi

find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink

bsdtar xpf $backupfile -C /srv/http

dirPermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
uuid1=$( head -1 /etc/fstab | cut -d' ' -f1 )
uuid2=${uuid1:0:-1}2
sed -i "s/root=.* rw/root=$uuid2 rw/; s/elevator=noop //" $dirconfig/boot/cmdline.txt
sed -i "s/^PARTUUID=.*-01  /$uuid1  /; s/^PARTUUID=.*-02  /$uuid2  /" $dirconfig/etc/fstab

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
dirs=$( find $dirnas -mindepth 1 -maxdepth 1 -type d )
if [[ $dirs ]]; then
	while read dir; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done <<< $dirs
done
mountpoints=$( grep $dirnas /etc/fstab | awk '{print $2}' | sed 's/\\040/ /g' )
if [[ $mountpoints ]]; then
	while read mountpoint; do
		mkdir -p "$mountpoint"
	done <<< $mountpoints
fi
[[ -e /etc/modprobe.d/cirrus.conf ]] && touch /boot/cirrus

$dirbash/power.sh reboot
