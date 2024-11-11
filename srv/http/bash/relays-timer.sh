#!/bin/bash

. /srv/http/bash/common.sh

killProcess relaystimer
echo $$ > $dirshm/pidrelaystimer

timerfile=$dirshm/relayson
timer=$( getVar timer $dirsystem/relays.conf | tee > $timerfile )
i=$timer
while sleep 60; do
	if grep -q -m1 '^state.*play' $dirshm/status || grep -q -m1 RUNNING /proc/asound/card*/pcm*p/sub*/status; then
		(( $i != $timer )) && echo $timer > $timerfile
	else
		[[ $off ]] && $dirbash/relays.sh off && exit
# --------------------------------------------------------------------
		i=$(( $( getContent $timerfile 1 ) - 1 ))
		if (( $i > 1 )); then
			echo $i > $timerfile
		else
			off=1
			pushData relays '{ "timer": '$timer' }'
		fi
	fi
done
