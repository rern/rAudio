#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirairplay=$dirshm/airplay

##### stop (no paused state)
if (( $# > 0 )); then
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	systemctl stop shairport-meta
	systemctl restart shairport-sync
	$dirbash/cmd.sh scrobble stop
	rm -f $dirshm/{player-*,scrobble} $dirairplay/start
	touch $dirshm/player-mpd
	$dirbash/cmd.sh volumereset
	sleep 2
	$dirbash/cmd-pushstatus.sh
##### start
else
	rm -f $dirshm/{player-*,scrobble} $dirairplay/start
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
