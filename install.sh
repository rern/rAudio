#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250704
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
