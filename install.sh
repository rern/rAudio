#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

if ! grep -q 'device = \"' /etc/spotifyd.conf; then
	pacman -Sy spotifyd
	ln -sf /usr/lib/systemd/{user,system}/spotifyd.service
fi

file=/usr/lib/systemd/system/mpdscribble@.service
if grep -q User=mpdscribble $file; then
	sed -i 's/User=.*/User=mpd/' $file
	systemctl daemon-reload
fi

connected=$( netctl list | grep ^* | sed 's/^\* //' )
[[ -n $connected ]] && netctl enable "$connected" &> /dev/null

systemctl disable netctl-auto@wlan0

grep -q sources.sh /etc/conf.d/devmon && sed -i 's/sources.sh/system.sh/g' /etc/conf.d/devmon

file=/srv/http/data/system/display
grep -q conductor $file || sed -i '/composer/ a\\t"conductor": true,' $file

installstart "$1"

getinstallzip

/srv/http/bash/mpd-conf.sh

installfinish
