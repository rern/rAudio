#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

sed -i 's/networks.sh .*/system.sh bluetooth/' /etc/systemd/system/bluetooth.service.d/override.conf

[[ ! -e /etc/asound.conf ]] && echo "\
defaults.pcm.card 0
defaults.ctl.card 0" > /etc/asound.conf

installstart "$1"

getinstallzip

installfinish
