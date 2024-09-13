#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240913
if [[ $( bluealsa -V ) != v4.3.1 ]]; then
	pacman -Sy --noconfirm bluealsa
 	sed -i 's/bluealsa /bluealsad /' /etc/systemd/system/bluealsa.service.d/override.conf
 	systemctl daemon-reload
 	systemctl try-restart bluealsa
fi

file=$dirsystem/volumeboot
if [[ -e $file ]]; then
	echo "\
startup=$( cut -d= -f2 $file.conf )
max=100
" > $dirsystem/volumelimit.conf
	rm -f $file*
	touch $dirsystem/volumelimit
fi

# 20240906
revision=$( grep ^Revision /proc/cpuinfo )
BB=${revision: -3:2}
file=/etc/pacman.conf
if [[ $BB == 11 || $BB == 17 ]]; then
	grep -q wpa_supplicant $file && sed -i '/^IgnorePkg/ {s/ wpa_supplicant//; s/^/#/}' $file
elif [[ ! -e /boot/kernel.img ]] && ! grep -q libunwind $file; then
	sed -i -e '/^#*IgnorePkg/ d
' -e '/^#IgnoreGroup/ i\
IgnorePkg   = libunwind wpa_supplicant
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
