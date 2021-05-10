#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

[[ ! -e /usr/bin/cd-discid ]] && pacman -Sy --noconfirm cd-discid
mkdir -p /srv/http/data/audiocd

grep -q '"novu"' /srv/http/data/system/display || sed -i '/progressbar/ i\    "novu": false,' /srv/http/data/system/display

if [[ -e /usr/bin/spotifyd ]] && ! grep -q 'device = \"' /etc/spotifyd.conf; then
	if systemctl is-active spotifyd; then
		active=1
		systemctl disable --now spotifyd
	fi
	pacman -Sy --noconfirm spotifyd
	ln -sf /usr/lib/systemd/{user,system}/spotifyd.service
	dev=$( grep ^device /etc/spotifyd.conf | cut -d' ' -f3 )
	echo '[global]
device = "'$dev'"
bitrate = 320
on_song_change_hook = "/srv/http/bash/spotifyd.sh"' > /etc/spotifyd.conf
	[[ -n $active ]] && systemctl enable --now spotifyd
fi

file=/usr/lib/systemd/system/mpdscribble@.service
if grep -q User=mpdscribble $file; then
	sed -i 's/User=.*/User=mpd/' $file
fi

connected=$( netctl list | grep ^* | sed 's/^\* //' )
[[ -n $connected ]] && netctl enable "$connected" &> /dev/null

systemctl disable netctl-auto@wlan0

grep -q sources.sh /etc/conf.d/devmon && sed -i 's/sources.sh/system.sh/g' /etc/conf.d/devmon

file=/srv/http/data/system/display
grep -q conductor $file || sed -i '/composer/ a\\t"conductor": true,' $file

systemctl daemon-reload

installstart "$1"

getinstallzip

/srv/http/bash/mpd-conf.sh

installfinish
