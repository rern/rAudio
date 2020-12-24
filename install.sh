#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

chown http:http /etc/relays.conf

installstart "$1"

getinstallzip

installfinish
