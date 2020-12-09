#!/bin/bash

playerfile=/srv/http/data/shm/player

if (( $# > 0 )); then # stop
	mv $playerfile-{*,mpd}
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$( /srv/http/bash/status.sh )"
	
	systemctl stop shairport-meta
	systemctl restart shairport-sync
else
	mv $playerfile-{*,airplay}
	mpc stop
	systemctl stop snapclient 2> /dev/null
	systemctl try-restart snapclient spotifyd upmpdcli &> /dev/null
	systemctl start shairport-meta
	sleep 2
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$( /srv/http/bash/status.sh )"
fi

