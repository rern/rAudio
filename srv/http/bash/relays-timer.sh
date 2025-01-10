#!/bin/bash

. /srv/http/bash/common.sh

killProcess relaystimer
echo $$ > $dirshm/pidrelaystimer

timer=$( getVar timer $dirsystem/relays.conf )
i=$timer
while sleep 60; do
	grep -q -m1 '^state.*play' $dirshm/status && i=$timer && continue
	
	(( i-- ))
	case $i in
		1 ) pushData relays '{ "countdown": true }';;
		0 ) $dirbash/relays.sh off && break;;
	esac
done
