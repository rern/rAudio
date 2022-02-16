#!/bin/bash

alias=r1

# 20220211
[[ -e /boot/kernel.img ]] && echo 'Server = http://alaa.ad24.cz/repos/2022/02/06/$arch/$repo' > /etc/pacman.d/mirrorlist
sed -i '/latency/ d' /srv/http/data/system/soundprofile.conf &> /dev/null

# 20220204
if ! grep -q 'assets,bash' /srv/http/bash/addons.sh; then
	sed -i -e '/chown/ d
' -e '/chmod 755 .srv/ i\
	chown -R http:http /srv/http/{assets,bash,settings}
' /srv/http/bash/addons.sh
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
