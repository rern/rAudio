#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250422
if [[ -e $dirmpd/album && $( uniq -d $dirmpd/album ) ]]; then
	for t in album latest; do
		sort -o $dirmpd/$t{,}
		sort -o $dirmpd/$t'byartist'{,}
	done
fi

if ! locale | grep -qi ^LANG=.*utf-*8; then
	! locale -a | grep -q ^C.utf8 && locale-gen C.utf8
	localectl set-locale LANG=C.utf8
fi

file=/etc/systemd/system/cava.service
if ! grep -q ^User $file; then
	sed -i -e '/^ExecStart/ i\User=root' -e 's/cava/vu/' $file
	ln -s /etc/cava.conf /root/.config/cava
	systemctl daemon-reload
	file=$dirsystem/vuled.conf
	if [[ -e $file ]] && grep -q = $file; then
		conf=$( sed 's/.*=//' $file )
		echo $conf > $file 
	fi
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

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
