#!/bin/bash

timerfile=/srv/http/data/shm/relaystimer
timer=$( cat $timerfile )
i=$timer
while sleep 60; do
	if grep -q RUNNING /proc/asound/card*/pcm*/sub*/status; then # state: RUNNING
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
