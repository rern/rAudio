#!/bin/bash

. /srv/http/bash/common.sh

killProcess relaystimer
echo $$ > $dirshm/pidrelaystimer

timer=$1
timerfile=$dirshm/relayson
echo $timer > $timerfile
i=$timer
while sleep 60; do
	if grep -q -m1 '^state.*play' $dirshm/status || grep -q -m1 RUNNING /proc/asound/card*/pcm*p/sub*/status; then
		(( $i != $timer )) && echo $timer > $timerfile
	else
		i=$( < $timerfile )
		(( $i == 1 )) && $dirbash/relays.sh off && exit
# --------------------------------------------------------------------
		(( i-- ))
		echo $i > $timerfile
		(( $i == 1 )) && pushData relays '{ "timer": '$timer' }'
	fi
done
