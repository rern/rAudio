#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20241208
rm -f $dirshm/playlist*

dir=/srv/http/assets/img/guide
if [[ -e $dir/58.jpg ]]; then
	rm $dir/*
	curl -skL https://github.com/rern/_assets/raw/master/guide/guide.tar.xz | bsdtar xf - -C $dir
fi

file=/etc/pacman.conf
if ! grep -q linux-rpi $file; then
	[[ -e /boot/kernel7.img ]] && ignore='libunwind mesa'
	sed -i -e '/^#*IgnorePkg/ d' -e "/^#*IgnoreGroup/ i\IgnorePkg   = linux-rpi $ignore" $file
fi
if [[ -e /boot/kernel7.img ]] && ! grep -q mesa $file; then
	sed -i '/^IgnorePkg/ s/$/ mesa/' $file
fi

sed -i '/^brightness/ d' $dirsystem/localbrowser.conf

# 20241130
systemctl -q is-active mediamtx && touch $dirsystem/dabradio

# 20241110
if [[ ! -e /boot/kernel.img ]]; then
	revision=$( grep ^Revision /proc/cpuinfo )
	if [[ ${revision: -3:2} < 11 ]]; then
		file=/etc/modprobe.d/brcmfmac.conf
		[[ ! -e $file ]] && echo 'options brcmfmac feature_disable=0x82000' > $file
	fi
fi

# 20241108
[[ $( pacman -Q cava ) < 'cava 0.10.2-2' ]] && pacman -Sy --noconfirm cava

file=$dirsystem/lcdchar.conf
if [[ -e $file ]] && grep -q -m1 ^0= $file; then
	rm $dirsystem/lcdchar*
fi

# 20241111
if [[ ! -e /boot/kernel.img ]]; then
	revision=$( grep ^Revision /proc/cpuinfo )
	[[ ${revision: -3:2} < 11 ]] && echo 'options brcmfmac feature_disable=0x82000' > /etc/modprobe.d/brcmfmac.conf
fi

file=/etc/systemd/system/dab.service
if [[ -e $file ]] && grep -q Requires $file; then
	sed -i '/^Requires\|^After/ d' $file
	rm -rf /etc/systemd/system/mediamtx.service.d
	systemctl daemon-reload
	systemctl try-restart mediamtx
fi

# 20241108
[[ $( pacman -Q cava ) < 'cava 0.10.2-2' ]] && pacman -Sy --noconfirm cava

rm -f $dirsystem/lcdmodel

file=$dirsystem/lcdchar.conf
if [[ -e $file && $( sed -n -E '/^charmap/,/^p0/ p' $file | wc -l ) -gt 2 ]]; then
	. $file
	for k in inf cols charmap p0 pin_rs p1 pin_rw p2 pin_e p3 backlight; do
		conf+="$k=${!k}\n"
	done
	echo -e $conf > $file
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

# 20241130
[[ -e $dirsystem/camilladsp && ! -e $dirshm/hwparams ]] && $dirsettings/camilla-devices.sh
