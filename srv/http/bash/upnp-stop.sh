#!/bin/bash

playerfile=/srv/http/data/shm/player
if [[ -e $playerfile-upnp ]]; then
	mpc stop
	tracks=$( mpc -f %file%^%position% playlist | grep 'http://192' | cut -d^ -f2 )
	for i in $tracks; do
		mpc del $i
	done
	systemctl restart upmpdcli
	mv $playerfile-{*,mpd}
	/srv/http/bash/cmd.sh volumereset
	/srv/http/bash/cmd-pushstatus.sh
fi
