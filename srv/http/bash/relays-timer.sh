#!/bin/bash

. /srv/http/bash/common.sh

killProcess relaystimer
echo $$ > $dirshm/pidrelaystimer

timer=$1
timerfile=$dirshm/relayson
echo $timer > $timerfile
i=$timer
while sleep 60; do
	playing=
	if  aplay -l | grep -q -m1 Loopback; then
		grep -q -m1 '^state.*play' $dirshm/status && playing=1
	elif grep -q -m1 RUNNING /proc/asound/card*/pcm*p/sub*/status; then # state: RUNNING
		playing=1
	fi
	if [[ $playing ]]; then
		(( $i != $timer )) && i=$timer
	else
		(( $i == 1 )) && $dirbash/relays.sh off && exit
# --------------------------------------------------------------------
		(( i-- ))
		(( $i == 1 )) && pushData relays '{ "timer": '$timer' }'
	fi
done
