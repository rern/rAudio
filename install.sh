#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

if ! grep -q usbremove /etc/conf.d/devmon; then
	wget -q https://github.com/rern/rOS/raw/main/etc/conf.d/devmon -O /etc/conf.d/devmon
fi
if grep -q 'default_options_exfat.*umask=0077' /etc/udevil/udevil.conf; then
	wget -q https://github.com/rern/rOS/raw/main/etc/udevil/udevil.conf -O /etc/udevil/udevil.conf
fi

file=/etc/lcdchar.conf
if [[ -e $file ]]; then
	! grep -q backlight $file && echo backlight=False >> $file
fi

i=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
[[ -z $i ]] && echo "\
defaults.pcm.card 0
defaults.ctl.card 0" > /etc/asound.conf

if [[ -e /usr/lib/chromium && ! -e /usr/lib/libicudata.so.67 ]]; then
	echo -e "$bar Get missing libraries for Chromium ..."
	wget -qO - https://github.com/rern/rern.github.io/raw/master/archives/chromiumlib.tar.xz \
		| bsdtar xvf - -C /usr/lib
fi

installstart "$1"

getinstallzip

/srv/http/bash/mpd-conf.sh

if ! grep -q dtparam=krnbt=on /boot/config.txt && [[ -n $( /srv/http/bash/system.sh hwwireless ) ]]; then
	sed -i '$ a\dtparam=krnbt=on' /boot/config.txt
fi

if [[ $( /srv/http/bash/system.sh hwrevision ) == 11 ]]; then
	if [[ $( pacman -Q raspberrypi-bootloader | cut -d' ' -f2 ) > 20201208-1 ]]; then
		wget -q https://github.com/rern/rern.github.io/raw/master/archives/raspberrypi-bootloader-20201208-1-any.pkg.tar.xz
		wget -q https://github.com/rern/rern.github.io/raw/master/archives/raspberrypi-bootloader-x-20201208-1-any.pkg.tar.xz
		pacman -U --noconfirm raspberrypi-bootloader*
		rm raspberrypi-bootloader*
		sed -i '/^#IgnorePkg/ a\IgnorePkg   = raspberrypi-bootloader raspberrypi-bootloader-x' /etc/pacman.conf
		title "$info Reboot required."
	fi
fi

installfinish
