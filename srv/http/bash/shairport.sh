#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirairplay=$dirshm/airplay

##### pause
if (( $# > 0 )); then
	systemctl stop shairport-meta
	$dirbash/cmd.sh scrobble stop
	echo pause > $dirairplay/state
	start=$( cat $dirairplay/start 2> /dev/null )
	timestamp=$( date +%s%3N )
	echo $(( timestamp - start - 7500 )) > $dirairplay/elapsed # delayed 7s
	$dirbash/cmd-pushstatus.sh
##### start
else
	if [[ ! -e $dirshm/player-airplay ]] ;then
		mpc stop
		rm -f $dirshm/{player-*,scrobble}
		touch $dirshm/player-airplay
		systemctl stop snapclient
		systemctl try-restart bluezdbus mpd spotifyd upmpdcli &> /dev/null
		$dirbash/cmd.sh volume0db
	fi
	systemctl start shairport-meta
	echo play > $dirairplay/state
	$dirbash/cmd-pushstatus.sh
fi
