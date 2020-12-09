#!/bin/bash

relaysfile=/srv/http/data/shm/relaystimer
timer=$( cat $relaysfile )
i=$timer

while sleep 60; do
	[[ ! -e $relaysfile ]] && exit
	
	if grep -q RUNNING /proc/asound/card*/pcm*/sub*/status; then # state: RUNNING
		[[ $i != $timer ]] && echo $timer > $relaysfile
	else
		i=$( cat $relaysfile )
		(( $i == 1 )) && /srv/http/bash/relays.py off && exit
		
		(( i-- ))
		echo $i > $relaysfile
		if (( $i < 6 && $i > 1 )); then
			curl -s -X POST http://127.0.0.1/pub?id=notify \
				-d '{ "title": "GPIO Relays Idle", "text": "'$i' minutes to OFF", "icon": "stopwatch" }'
		elif (( $i == 1 )); then
			curl -s -X POST http://127.0.0.1/pub?id=relays \
				-d '{ "state": "IDLE", "delay": 60 }'
		fi
	fi
done
