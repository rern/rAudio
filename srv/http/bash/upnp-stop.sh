#!/bin/bash

playerfile=/srv/http/data/shm/player
if [[ -e $playerfile-upnp ]]; then
	systemctl restart upmpdcli
	mv $playerfile-{*,mpd}
	mpc del 1
	/srv/http/bash/cmd.sh volumereset
	/srv/http/bash/cmd-pushstatus.sh
fi
