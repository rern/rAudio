#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

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

# 20240612
file=/etc/systemd/system/websocket.service
if grep -q '-server' $file; then
	sed -i 's/-server//' $file
	systemctl daemon-reload
fi

# 20240601
file=/etc/pacman.conf
grep -q bootloader $file && sed -i 's/li.*bootloader/libunwind/' $file

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240615
systemctl restart websocket
systemctl try-restart rotaryencoder

# 20240601
for snap in $restart; do
	$dirsettings/features.sh $snap
	$dirsettings/features.sh "$snap
true
CMD ON"
done

installfinish
