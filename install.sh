#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20251109
rm -f $dirshm/system

if [[ ! -e /boot/kernel.img && $( spotifyd -V ) != 'spotifyd 0.3.5' ]]; then
	pacman -R spotifyd
	pacman -Sy --noconfirm spotifyd	
fi

# 20250809
grep -q dirshm/listing $dirbash/mpdidle.sh && restartmpd=1

file=/etc/exports
if grep -q "^$dirnas" $file && ! grep -q "^$dirnas .*crossmnt" $file; then
	sed -i "\|^$dirnas | s/)/,crossmnt)/" $file
	systemctl -q is-enabled nfs-server && systemctl restart nfs-server
fi

file=/lib/systemd/system/mpd_oled.service
if [[ -e $file ]] && ! grep -q User $file; then
	rm -f /root/.config/cava
	ln -sf /etc/cava.conf /root/.config
	sed -i '/EnvironmentFile/ i\User=root' $file
	systemctl daemon-reload
fi

file=$dirmpdconf/conf/httpd.conf
grep -q quality $file && sed -i '/quality/ d' $file

file=$dirmpdconf/mpd.conf
if [[ $( pacman -Q mpd | cut -c 5-8 ) == 0.24 ]] && ! grep -q ^metadata_to_use $file; then
	sed -i '/^db_file/ a\
metadata_to_use     "album,albumartist,artist,composer,conductor,date,genre,title,track"
' $file
fi

file=/etc/pacman.conf
if [[ -e /boot/kernel7.img ]]; then
	grep -q libunwind $file && sed -i 's/ *libunwind//' $file
	[[ $( pacman -Q libunwind ) < 'libunwind 1.8.2-1' ]] && pacman -Sy --needed --noconfirm libunwind
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20250809
[[ $restartmpd ]] && systemctl restart mpd

TEMP_fstab

installfinish
