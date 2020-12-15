#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

sed -i '/^#IgnorePkg/ a\IgnorePkg   = raspberrypi-firmware' /etc/pacman.conf
pacman -Sy cifs-utils

installstart "$1"

getinstallzip

installfinish
