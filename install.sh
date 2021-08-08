#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

rm -f /srv/http/data/shm/status

if [[ ! -e '/srv/http/data/webradios/https:||stream.radioparadise.com|flac' ]]; then
	rm -f "/srv/http/data/webradios/http:||stream.radioparadise.com"*
	rm -f "/srv/http/data/webradiosimg/http:||stream.radioparadise.com"*
	curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xvf - -C /
fi

file=/srv/http/data/system/display
! grep -q vumeter $file && sed -i '/novu/ i\    "vumeter": false,' $file

installstart "$1"

getinstallzip

systemctl daemon-reload
systemctl restart mpd
nginx -s reload &> /dev/null

installfinish
