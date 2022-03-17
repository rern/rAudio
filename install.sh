#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
