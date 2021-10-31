#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirairplay=$dirshm/airplay

##### pause
if (( $# > 0 )); then
	systemctl stop shairport-meta
	$dirbash/cmd.sh scrobble stop
	echo pause > $dirairplay/state
	start=$( cat $dirairplay/start 2> /dev/null )
	timestamp=$( date +%s%3N )
	[[ -n $start ]] && printf '%.0f' $(( ( timestamp - start - 7000 ) / 1000 )) > $dirairplay/elapsed
	$dirbash/cmd-pushstatus.sh
	rm -f $dirairplay/start
##### start
else
	if [[ ! -e $dirshm/player-airplay ]] ;then
		mpc stop
		rm -f $dirshm/{player-*,scrobble} $dirairplay/start
		touch $dirshm/player-airplay
		systemctl stop snapclient
		systemctl try-restart bluezdbus mpd spotifyd upmpdcli &> /dev/null
		$dirbash/cmd.sh volume0db
		mkdir -p $dirairplay
	fi
	systemctl start shairport-meta
	echo play > $dirairplay/state
	$dirbash/cmd-pushstatus.sh
fi
