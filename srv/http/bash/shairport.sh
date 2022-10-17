#!/bin/bash

# shairport-sync.conf > this:
#    - start / stop

dirairplay=/srv/http/data/shm/airplay

##### pause
if (( $# > 0 )); then
	systemctl stop shairport-meta
	echo pause > $dirairplay/state
	[[ -e $dirairplay/start ]] && start=$( < $dirairplay/start ) || start=0
	timestamp=$( date +%s%3N )
	echo $(( timestamp - start - 7500 )) > $dirairplay/elapsed # delayed 7s
##### start
else
	[[ $( cat /srv/http/data/shm/player ) != airplay ]] && /srv/http/bash/cmd.sh playerstart$'\n'airplay
	systemctl start shairport-meta
	echo play > $dirairplay/state
fi
/srv/http/bash/status-push.sh
