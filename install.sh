#!/bin/bash

alias=r1

if [[ -e /etc/systemd/system/smb.service.d ]]; then
	systemctl -q is-active smb && smb=1
	rm -rf /etc/systemd/system/smb.service.d
	sed -i '/Requires=smb\|nobody/ d' /etc/systemd/system/wsdd.service
	systemctl daemon-reload
	[[ -n $smb ]] && systemctl restart smb wsdd
fi

. /srv/http/bash/addons.sh

[[ -e /usr/lib/systemd/system/spotifyd.service ]] || ln -s /usr/lib/systemd/{user,system}/spotifyd.service

installstart "$1"

getinstallzip

/srv/http/bash/mpd-conf.sh

installfinish
