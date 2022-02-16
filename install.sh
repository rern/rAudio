#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

# 20220211
[[ -e /boot/kernel.img ]] && echo 'Server = http://alaa.ad24.cz/repos/2022/02/06/$arch/$repo' > /etc/pacman.d/mirrorlist
sed -i '/latency/ d' $dirsystem/soundprofile.conf &> /dev/null

# 20220204
if ! grep -q 'assets,bash' $dirbash/addons.sh; then
	sed -i -e '/chown/ d
' -e '/chmod 755 .srv/ i\
	chown -R http:http /srv/http/{assets,bash,settings}
' $dirbash/addons.sh
fi

. $dirbash/addons.sh

installstart "$1"

getinstallzip

installfinish
