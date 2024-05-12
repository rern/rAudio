#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240517
! grep -q cmdsh /srv/http/bash/websocket-server.py && restartws=1

file=/srv/http/data/mpdconf/conf/snapserver.conf
if grep -q snapcast $file; then
	[[ -e $dirsystem/snapclient ]] && restartmpd=1
	echo 'audio_output {
	name    "SnapServer"
	type    "fifo"
	path    "/tmp/snapfifo"
	format  "48000:16:2"
}' > $file
	systemctl -q is-active snapclient && restartsnapclient=1
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240517
[[ $restartws ]] && systemctl restart websocket
if [[ $restartmpd ]]; then
	echo "$bar Restart MPD ..."
	$dirsettings/player-conf.sh
fi
if [[ $restartsnapclient ]]; then
	$dirbash/snapclient.sh stop
	$dirbash/snapclient.sh
fi

installfinish
