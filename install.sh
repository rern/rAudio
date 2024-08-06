#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240815
file=/etc/pacman.conf
! grep -q wpa_supplicant $file && sed -i '/^#*IgnorePkg/ {s/^#//; s/$/ wpa_supplicant/}' $file

# 20240719
rm -f $dirshm/system

lsblk -Sno path,vendor,model > $dirshm/lsblkusb

file=$dirsystem/lcdcharconf.py
if [[ -e $file ]]; then
	sed -i -E 's/False|"//g' $file
	mv $file $dirsystem/lcdchar.conf
fi
# 20240707
dir=/srv/http/assets/img/guide
if [[ -e $dir/59.jpg ]]; then
	rm -f $dir/*
	curl -skL https://github.com/rern/_assets/raw/master/guide/guide.tar.xz | bsdtar xf - -C $dir
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
