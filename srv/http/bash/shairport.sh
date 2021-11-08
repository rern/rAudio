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
	[[ ! -e $dirshm/player-airplay ]] && $dirbash/cmd.sh playerstart airplay
	systemctl start shairport-meta
	echo play > $dirairplay/state
	$dirbash/cmd-pushstatus.sh
fi
