#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20251128
if [[ ! -e /boot/kernel.img ]]; then
	file=/boot/cmdline.txt
	grep -q ipv6.disable $file && sed -i 's/ipv6.disable=1 //' $file
	file=/etc/spotifyd.conf
	! grep -q 'mixer = "hw"' $file && sed -i 's/mixer = "hw"/mixer = "hw"/' $file
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
