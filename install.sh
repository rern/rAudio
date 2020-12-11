#!/bin/bash

alias=r1

sed -i 's/raudio$/&ap/' /etc/hostapd/hostapd.conf
mv /srv/http/data/system/relaysset /etc/relays.conf &> /dev/null

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
