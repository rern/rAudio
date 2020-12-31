#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

if [[ -e /usr/lib/chromium && ! -e /usr/lib/libicudata.so.67 ]]; then
	echo -e "$bar Get missing libraries for Chromium ..."
	wget -qO - https://github.com/rern/rern.github.io/raw/master/archives/chromiumlib.tar.xz \
		| bsdtar xvf - -C /usr/lib
fi

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
