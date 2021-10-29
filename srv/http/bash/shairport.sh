#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirairplay=$dirshm/airplay

##### stop
if (( $# > 0 )); then
	rm -f $dirshm/player-* $dirairplay/start
	touch $dirshm/player-mpd
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	$dirbash/cmd.sh volumereset
	$dirbash/cmd-pushstatus.sh
	systemctl restart shairport-sync
	systemctl stop shairport-meta
##### start
else
	rm -f $dirshm/player-*
	touch $dirshm/player-airplay
	mpc stop
	systemctl stop snapclient 2> /dev/null
	systemctl try-restart snapclient spotifyd upmpdcli &> /dev/null
	systemctl start shairport-meta
	$dirbash/cmd.sh volume0db
	mkdir -p $dirairplay
	sleep 2
	$dirbash/cmd-pushstatus.sh
fi
