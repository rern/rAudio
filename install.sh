#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

[[ ! -e /etc/asound.conf ]] && echo "\
defaults.pcm.card 0
defaults.ctl.card 0" > /etc/asound.conf

installstart "$1"

getinstallzip

installfinish
