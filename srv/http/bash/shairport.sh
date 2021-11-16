#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirairplay=$dirshm/airplay

##### pause
if (( $# > 0 )); then
	systemctl stop shairport-meta
	echo pause > $dirairplay/state
	start=$( cat $dirairplay/start 2> /dev/null )
	timestamp=$( date +%s%3N )
	echo $(( timestamp - start - 7500 )) > $dirairplay/elapsed # delayed 7s
	$dirbash/status-push.sh
##### start
else
	[[ $( cat $dirshm/player ) != airplay ]] && $dirbash/cmd.sh playerstart$'\n'airplay
	systemctl start shairport-meta
	echo play > $dirairplay/state
	$dirbash/status-push.sh
fi
