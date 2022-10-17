#!/bin/bash

. /srv/http/bash/common.sh

timerfile=$dirshm/relaystimer
timer=$( < $timerfile )
i=$timer
while sleep 60; do
	playing=
	if  aplay -l | grep -q Loopback; then
		grep -q '^state=.play' $dirshm/status && playing=1
	elif grep -q RUNNING /proc/asound/card*/pcm*p/sub*/status; then # state: RUNNING
		playing=1
	fi
	if [[ $playing ]]; then
		[[ $i != $timer ]] && echo $timer > $timerfile
	else
		i=$( < $timerfile )
		(( $i == 1 )) && $dirsettings/relays.sh && exit
		
		(( i-- ))
		echo $i > $timerfile
		(( $i > 1 )) && continue
		
		data='{"state":"IDLE","timer":'$timer'}'
		pushstream relays "$data"
	fi
done
