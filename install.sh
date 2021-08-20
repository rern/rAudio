#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

file=/etc/powerbutton.conf
[[ -e $file ]] && ! grep -q reserved $file && echo reserved=5 >> $file

file=/etc/lcdchar.conf
[[ -e $file ]] && sed -i '/backlight=/ {s/T/t/; s/F/f/}' $file

rm -f /srv/http/data/shm/status

if [[ -e '/srv/http/data/webradios/https:||stream.radioparadise.com|flacm' ]]; then
	rm -f "/srv/http/data/webradios/http:||stream.radioparadise.com"*
	rm -f "/srv/http/data/webradiosimg/http:||stream.radioparadise.com"*
	curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xvf - -C /
fi

file=/srv/http/data/system/display
! grep -q vumeter $file && sed -i '/novu/ i\    "vumeter": false,' $file

installstart "$1"

getinstallzip

systemctl daemon-reload

[[ -e /srv/http/data/system/custom ]] && sed -i '/#custom$/ d' /etc/mpd.conf
/srv/http/bash/mpd-conf.sh

installfinish
