#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260101
if [[ -e /boot/kernel8.img ]]; then
	file=/etc/pacman.conf
	! grep -q linux-rpi $file && sed -i -E 's/.*(IgnorePkg   =)/\1 linux-rpi/' $file
fi

[[ ! -e /usr/bin/dtoverlay ]] && pacman -Sy --noconfirm raspberrypi-utils

file=/boot/cmdline.txt
if [[ ! -e /boot/kernel.img ]] && grep -q ipv6.disable $file; then
	sed -i 's/ipv6.disable=1 //' $file
	pacman -Sy --needed --noconfirm spotifyd
	file=/etc/spotifyd.conf
	! grep -q '^mixer = "hw"' $file && sed -i -E 's/^(mixer = ).*/\1"hw"/' $file
	echo ', "spotifyd": "Spotify"' >> $dirshm/reboot
fi

# 20251109
rm -f $dirshm/system

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
