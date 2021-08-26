#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

if [[ -e /srv/http/data/system/relays && -e /etc/relays.conf ]]; then
	data=$( grep -A4 '"name":' /etc/relays.conf | tail -4 )
	echo "
name='{"$data"}'" >> /srv/http/data/system/relays
	mv /srv/http/data/system/relays{,pin}
	touch /srv/http/data/system/relays
	rm /etc/relays.conf
fi

file=/etc/powerbutton.conf
[[ -e $file ]] && ! grep -q reserved $file && echo reserved=5 >> $file

file=/etc/lcdchar.conf
[[ -e $file ]] && sed -i '/backlight=/ {s/T/t/; s/F/f/}' $file

[[ -e /srv/http/data/system/custom ]] && sed -i '/#custom$/ d' /etc/mpd.conf

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

/srv/http/bash/mpd-conf.sh

nginx -s reload &> /dev/null

installfinish
