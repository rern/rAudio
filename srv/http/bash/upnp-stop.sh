#!/bin/bash

playerfile=/srv/http/data/shm/player
if [[ -e $playerfile-upnp ]]; then
	systemctl restart upmpdcli
	mv $playerfile-{*,mpd}
	mpc del 1
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$( /srv/http/bash/status.sh )"
fi
