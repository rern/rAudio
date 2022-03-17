#!/bin/bash

alias=r1

# 20220312
file=/srv/http/data/system/display
if ! grep -q latest $file; then
	sed -i '/playlists/ a\
  "latest": true,
' $file
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

systemctl restart mpd

installfinish
