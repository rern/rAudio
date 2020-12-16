#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

pacman -Sy --noconfirm cifs-utils

installstart "$1"

getinstallzip

installfinish
