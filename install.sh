#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20251109
rm -f $dirshm/system

if [[ ! -e /boot/kernel.img && $( spotifyd -V ) != 'spotifyd 0.3.5' ]]; then
	pacman -R spotifyd
	pacman -Sy --noconfirm spotifyd	
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
