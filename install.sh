#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250718
file=/lib/systemd/system/mpd_oled.service
if [[ -e $file ]] && ! grep User $file; then
	rm -f /root/.config/cava
	ln -sf /etc/cava.conf /root/.config
	sed -i '/EnvironmentFile/ i\User=root' $file
	reload=1
fi

for file in /etc/fstab $dirnas/data/source; do
	if [[ -e $file ]] && grep -q 'username=guest' $file && ! grep -q 'username=guest,password=,' $file; then
		sed -i 's/username=guest/&,password=/' $file
		reload=1
	fi
done
[[ $reload ]] && systemctl daemon-reload

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

# 20250627
grep -q mpd $file && sed -i 's/ *mpd//' $file

if ! locale | grep -q ^LANG=.*UTF-8; then
	[[ -e /usr/share/i18n/locales/C ]] && loc=C || loc=en_US
	loc+=.UTF-8
	if ! grep -q ^$loc /etc/locale.gen; then
		echo "$loc UTF-8" >> /etc/locale.gen
		locale-gen
	fi
	localectl set-locale LANG=$loc
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
