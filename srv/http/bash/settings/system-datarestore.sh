#!/bin/bash

. /srv/http/bash/common.sh

backupfile=$dirshm/backup.gz
dirconfig=$dirdata/config

grep -q '^status=.*play' $dirshm/status && $dirbash/cmd.sh playerstop
				# features        mpd                                      updating_db      system
rm -f $dirsystem/{autoplay,color,hddsleep,listing,login*,crossfade*,custom*,dop*,mixertype*,relays,soundprofile,soxr*,updating}
find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink

bsdtar -xpf $backupfile -C /srv/http
$dirsettings/system-datareset.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
uuid1=$( head -1 /etc/fstab | cut -d' ' -f1 )
uuid2=${uuid1:0:-1}2
sed -i "s/root=.* rw/root=$uuid2 rw/; s/elevator=noop //" $dirconfig/boot/cmdline.txt
sed -i "s/^PARTUUID=.*-01  /$uuid1  /; s/^PARTUUID=.*-02  /$uuid2  /" $dirconfig/etc/fstab

cp -rf $dirconfig/* /
[[ -e $dirsystem/enable ]] && systemctl -q enable $( < $dirsystem/enable )
[[ -e $dirsystem/disable ]] && systemctl -q disable $( < $dirsystem/disable )
$dirsettings/system.sh hostname$'\n'$( < $dirsystem/hostname )
[[ -e $dirsystem/netctlprofile ]] && netctl enable "$( < $dirsystem/netctlprofile )"
timedatectl set-timezone $( < $dirsystem/timezone )
rm -rf $backupfile $dirconfig $dirsystem/{enable,disable,hostname,netctlprofile,timezone}
[[ -e $dirsystem/crossfade ]] && mpc crossfade $( < $dirsystem/crossfade.conf )
readarray -t dirs <<< $( find $dirnas -mindepth 1 -maxdepth 1 -type d )
for dir in "${dirs[@]}"; do
	umount -l "$dir" &> /dev/null
	rmdir "$dir" &> /dev/null
done
ipserver=$( grep $dirshareddata /etc/fstab | cut -d: -f1 )
if [[ $ipserver ]]; then
	fstab=$( sed "/^$ipserver/ d" /etc/fstab )
	column -t <<< $fstab > /etc/fstab
fi
readarray -t mountpoints <<< $( grep $dirnas /etc/fstab | awk '{print $2}' | sed 's/\\040/ /g' )
if [[ $mountpoints ]]; then
	for mountpoint in $mountpoints; do
		mkdir -p "$mountpoint"
	done
fi
grep -q -m1 $dirsd /etc/exports && $dirsettings/features.sh nfsserver$'\n'true
$dirbash/cmd.sh reboot
