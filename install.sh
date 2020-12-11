#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

mv /srv/http/data/system/relaysset /etc/relays.conf &> /dev/null

installfinish
