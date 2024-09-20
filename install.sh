#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240920
file=$dirsystem/relays.conf
if ! grep -q timeron $file; then
	! grep -q timer=0 $file && on=true
	sed -i "/^timer=/ i\timeron=$on" $file
fi

[[ -e $dirmpd/latest && ! -e $dirmpd/latestbyartist ]] && rm -f $dirmpd/latest

# 20240914
file=$dirsystem/volumeboot
if [[ -e $file ]]; then
	echo "\
startup=$( cut -d= -f2 $file.conf )
max=100
" > $dirsystem/volumelimit.conf
	rm -f $file*
	touch $dirsystem/volumelimit
fi

file=/etc/pacman.conf
sed -i 's/wpa_supplicant//' $file

if [[ -e /boot/kernel7.img ]]; then
	! grep -q libunwind $file && sed -i -e '/^#*IgnorePkg/ d
' -e '/^#IgnoreGroup/ i\
IgnorePkg   = libunwind
' $file
fi

# 20240818
file=$dirmpd/albumbyartist
[[ -e $file && $( grep -m1 . $file | cut -c 2 ) != ^ ]] && php /srv/http/cmd.php sort albumbyartist

lsblk -no path,vendor,model | grep -v ' $' > $dirshm/lsblkusb

if [[ -e /boot/kernel.img ]]; then
	file=/usr/bin/mount.ntfs3
	if [[ ! -e $file ]]; then
		ln -s /usr/bin/ntfs-3g $file
		sed -i '/^allowed_types/ s/$/, ntfs3/' /etc/udevil/udevil.conf
	fi
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20240913
$dirsettings/player-conf.sh
