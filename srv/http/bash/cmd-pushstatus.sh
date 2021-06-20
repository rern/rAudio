#!/bin/bash

status=$( /srv/http/bash/status.sh )

curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"

if [[ -e $dirsystem/lcdchar ]]; then
	killall lcdchar.py &> /dev/null
	readarray -t data <<< $( echo $status \
								| jq -r '.Artist, .Title, .Album, .state, .Time, .elapsed, .timestamp' \
								| sed 's/^$\|null/false/' )
	/srv/http/bash/lcdchar.py "${data[@]}" &
	exit
fi
if [[ -e /srv/http/data/shm/snapclientip ]]; then
	status=$( echo $status | sed 's/"player" :.*"single" : false , //' )
	readarray -t clientip < /srv/http/data/shm/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi
[[ -e /srv/http/data/system/librandom ]] && /srv/http/bash/cmd-librandom.sh
