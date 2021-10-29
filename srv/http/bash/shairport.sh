#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

playerfile=/srv/http/data/shm/player

if (( $# > 0 )); then # stop
	mv $playerfile-{*,mpd}
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	/srv/http/bash/cmd-pushstatus.sh
	systemctl stop shairport-meta
	systemctl restart shairport-sync
else
	mv $playerfile-{*,airplay}
	mpc stop
	systemctl stop snapclient 2> /dev/null
	systemctl try-restart snapclient spotifyd upmpdcli &> /dev/null
	systemctl start shairport-meta
	file=/srv/http/data/shm/airplay
	[[ ! -e $file ]] && echo '
  "Album"  : ""
, "Artist" : ""
, "Title"  : ""' > $file
	sleep 2
	/srv/http/bash/cmd-pushstatus.sh
fi
