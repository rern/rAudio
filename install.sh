#!/bin/bash

alias=r1

# 20220211
[[ -e /boot/kernel.img ]] && echo 'Server = http://alaa.ad24.cz/repos/2022/02/06/$arch/$repo' > /etc/pacman.d/mirrorlist
sed -i '/latency/ d' /srv/http/data/system/soundprofile.conf &> /dev/null

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
