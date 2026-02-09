#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260212
file=/etc/conf.d/devmon
if grep -q remove $file; then
	sed -i "s|usbconnect.*usbremove|usbmount|" $file
	systemctl restart devmon@http
fi

file=/etc/udev/rules.d/usbstorage.rules
if [[ ! $file ]]; then
	echo 'KERNEL=="sd[a-z]" \
ACTION=="add", \
RUN+="/srv/http/bash/settings/system.sh usbadd"

KERNEL=="sd[a-z]" \
ACTION=="remove", \
RUN+="/srv/http/bash/settings/system.sh usbremove"' > $file
	sed -i -e 's/usbconnect/usbmount/
' -e '/^ACTION=="remove"/,$ d
' /etc/udev/rules.d/ntfs.rules
	udevadm control --reload-rules
	udevadm trigger
fi

file=/etc/modprobe.d/blacklist.conf
if [[ ! -e $file ]]; then
	echo "\
blacklist bluetooth
blacklist bnep
blacklist btbcm
blacklist hci_uart" > $file
fi

file=/boot/config.txt
if grep -q -m1 disable-bt $file; then
	sed -i '/disable-bt/ d' /boot/config.txt
	touch $dirsystem/btdisable
fi

[[ ! -e /usr/bin/dtoverlay ]] && pacman -Sy --noconfirm raspberrypi-utils

if [[ ! -e /boot/kernel.img && $( spotifyd -V ) < 'spotifyd 0.4.2' ]]; then
	sed -i 's/ipv6.disable=1 //' /boot/cmdline.txt
	pacman -Sy --needed --noconfirm spotifyd
	file=/etc/spotifyd.conf
	! grep -q '^mixer = "hw"' $file && sed -i -E 's/^(mixer = ).*/\1"hw"/' $file
	echo ', "spotifyd": "Spotify"' >> $dirshm/reboot

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
