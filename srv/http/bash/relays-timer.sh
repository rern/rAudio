#!/bin/bash

. /srv/http/bash/common.sh

killProcess relaystimer
echo $$ > $dirshm/pidrelaystimer

timer=$( getVar timer $dirsystem/relays.conf )
i=$timer
while sleep 60; do
	if [[ -e $dirsystem/camilladsp ]]; then
		running=
	else
		grep -q -m1 RUNNING /proc/asound/card*/pcm*p/sub*/status && running=1 || running=
	fi
	if grep -q -m1 '^state.*play' $dirshm/status || $running; then
		i=$timer
	else
		(( i-- ))
		case $i in
			1 ) pushData relays '{ "countdown": true }';;
			0 ) $dirbash/relays.sh off && break;;
		esac
	fi
done
