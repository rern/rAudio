#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240612
file=/etc/systemd/system/websocket.service
if grep -q '-server' $file; then
	sed -i 's/-server//' $file
	systemctl daemon-reload
fi

# 20240601
file=/etc/pacman.conf
grep -q bootloader $file && sed -i 's/li.*bootloader/libunwind/' $file

# 20240519
file=/srv/http/data/mpdconf/conf/snapserver.conf
if grep -q snapcast $file; then
	echo 'audio_output {
	name    "SnapServer"
	type    "fifo"
	path    "/tmp/snapfifo"
	format  "48000:16:2"
}' > $file
	[[ -e $dirmpdconf/snapserver.conf ]] && restart=snapserver
	[[ -e $dirsystem/snapclient ]] && restart+=' snapclient'
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240615
systemctl restart websocket

# 20240601
for snap in $restart; do
	$dirsettings/features.sh $snap
	$dirsettings/features.sh "$snap
true
CMD ON"
done

installfinish
