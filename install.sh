#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240510
file=/srv/http/data/mpdconf/conf/snapserver.conf
if grep -q snapcast $file; then
	[[ -e $dirsystem/snapclient ]] && restartmpd=1
	echo 'audio_output {
	name    "SnapServer"
	type    "fifo"
	path    "/tmp/snapfifo"
	format  "48000:16:2"
}' > $file
fi

# 20240315
! grep -q netdev /etc/group && groupadd -f netdev

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240510
if [[ $restartmpd ]]; then
	echo "$bar Restart MPD ..."
	$dirsettings/player-conf.sh
fi

installfinish
