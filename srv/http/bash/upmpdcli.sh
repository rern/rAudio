#!/bin/bash

playerfile=/srv/http/data/shm/player

if [[ $1 == stop ]]; then
	mpc stop
	tracks=$( mpc -f %file%^%position% playlist | grep 'http://192' | cut -d^ -f2 )
	for i in $tracks; do
		mpc del $i
	done
	systemctl restart upmpdcli
	mv $playerfile-{*,mpd}
	/srv/http/bash/cmd-pushstatus.sh
else
	for pid in $( pgrep upmpdcli ); do
		ionice -c 0 -n 0 -p $pid &> /dev/null 
		renice -n -19 -p $pid &> /dev/null
	done
	mv $playerfile-{*,upnp}
	systemctl try-restart shairport-sync snapclient spotifyd &> /dev/null
fi
