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

if ! grep -q dtparam=krnbt=on /boot/config.txt && [[ -n $( /srv/http/bash/system.sh hwwireless ) ]]; then
	sed -i '$ a\dtparam=krnbt=on' /boot/config.txt
fi

installfinish
