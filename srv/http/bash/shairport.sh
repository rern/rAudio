#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirairplay=$dirshm/airplay

##### pause
if (( $# > 0 )); then
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	systemctl pause shairport-meta
	$dirbash/cmd.sh scrobble stop
	echo stop > $dirairplay/state
	start=$( cat $dirairplay/start 2> /dev/null )
	timestamp=$( date +%s%3N )
	[[ -n $start ]] && printf '%.0f' $(( ( timestamp - start + 500 ) / 1000 )) > $dirairplay/elapsed
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
	echo play > $dirairplay/state
	$dirbash/cmd-pushstatus.sh
fi
