#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240315
[[ -e /usr/bin/iwctl ]] && groupadd -f netdev

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

# 20240315
echo "$bar Restart MPD ..."
$dirsettings/player-conf.sh

installfinish
