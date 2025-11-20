#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

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
