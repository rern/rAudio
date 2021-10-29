#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

rm -f $dirshm/player-*
##### stop
if (( $# > 0 )); then
	touch $dirshm/player-mpd
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	/srv/http/bash/cmd-pushstatus.sh
	systemctl stop shairport-meta
	systemctl restart shairport-sync
##### start
else
	touch $dirshm/player-airplay
	mpc stop
	systemctl stop snapclient 2> /dev/null
	systemctl try-restart snapclient spotifyd upmpdcli &> /dev/null
	systemctl start shairport-meta
	dirairplay=/srv/http/data/shm/airplay
	if [[ ! -e $dirairplay/status ]]; then
		mkdir -p $dirairplay
		echo '
  "Album"  : ""
, "Artist" : ""
, "Title"  : ""' > $dirairplay/status
	fi
	sleep 2
	/srv/http/bash/cmd-pushstatus.sh
fi
