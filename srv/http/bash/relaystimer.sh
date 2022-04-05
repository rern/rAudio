#!/bin/bash

dirshm=/srv/http/data/shm
timerfile=$dirshm/relaystimer
timer=$( cat $timerfile )
i=$timer
while sleep 60; do
	playing=
	if [[ -e $dirshm/camilladsp ]]; then
		grep -q 'state="playing"' $dirshm/status && playing=1
	elif grep -q RUNNING /proc/asound/card*/pcm*p/sub*/status; then # state: RUNNING
		playing=1
	fi
	if [[ $playing ]]; then
		[[ $i != $timer ]] && echo $timer > $timerfile
	else
		i=$( cat $timerfile )
		(( $i == 1 )) && /srv/http/bash/relays.sh && exit
		
		(( i-- ))
		echo $i > $timerfile
		(( $i > 1 )) && continue
		
		curl -s -X POST http://127.0.0.1/pub?id=relays -d '{ "state": "IDLE", "timer": '$timer' }'
	fi
done
