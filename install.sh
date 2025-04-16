#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250418
file=/etc/systemd/system/cava.service
if ! grep -q ^User $file; then
	sed -i '/^ExecStart/ i\User=root' $file
	ln -s /etc/cava.conf /root/.config/cava
	systemctl daemon-reload
	[[ -e $dirsystem/vuled ]] && systemctl start cava
fi

# 20250404
file=/etc/systemd/system/localbrowser.service
if grep -q startx$ $file; then
	sed -i -E 's|^(ExecStart=).*|\1/usr/bin/startx /srv/http/bash/startx.sh|' $file
	systemctl daemon-reload
	rm /etc/X11/xinit/xinitrc
fi

if [[ $( pacman -Q snapcast ) != 'snapcast 0.31.0-3' ]]; then
	pacman -Sy --noconfirm snapcast
	sed -i -e '/^bind_to_address/ d' -e '/^#bind_to_address/ a\bind_to_address = 0.0.0.0' /etc/snapserver.conf
fi

# 20250322
if [[ ! -e /lib/systemd/user/spotifyd.service ]]; then
	mv /lib/systemd/{system,user}/spotifyd.service
	ln -s /lib/systemd/{user,system}/spotifyd.service
fi

# 20250228
file=/etc/pacman.conf
if grep -q 'linux-rpi' $file; then
	if [[ -e /boot/kernel8.img ]]; then
		sed -i 's/^IgnorePkg.*/#IgnorePkg   =/' $file
	elif [[ -e /boot/kernel7.img ]]; then
		sed -i 's/ linux-rpi//' $file
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
