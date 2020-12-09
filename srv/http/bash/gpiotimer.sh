#!/bin/bash

gpiofile=/srv/http/data/shm/gpiotimer
timer=$( cat $gpiofile )
i=$timer

while sleep 60; do
	[[ ! -e $gpiofile ]] && exit
	
	if grep -q RUNNING /proc/asound/card*/pcm*/sub*/status; then # state: RUNNING
		[[ $i != $timer ]] && echo $timer > $gpiofile
	else
		i=$( cat $gpiofile )
		(( $i == 1 )) && /srv/http/bash/gpio.py off && exit
		
		(( i-- ))
		echo $i > $gpiofile
		if (( $i < 6 && $i > 1 )); then
			curl -s -X POST http://127.0.0.1/pub?id=notify \
				-d '{ "title": "GPIO Idle Timer", "text": "'$i' minutes to OFF", "icon": "stopwatch" }'
		elif (( $i == 1 )); then
			curl -s -X POST http://127.0.0.1/pub?id=gpio \
				-d '{ "state": "IDLE", "delay": 60 }'
		fi
	fi
done
