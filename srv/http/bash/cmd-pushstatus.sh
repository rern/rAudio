#!/bin/bash

status=$( /srv/http/bash/status.sh )

statusdata=$( echo $status \
	| jq -r '.Artist, .Title, .Album, .state, .Time, .elapsed, .timestamp, .station, .file, .webradio' \
	| sed 's/^$\|null/false/' )
readarray -t data <<< "$statusdata"
readarray -t dataprev <<< $( cat /srv/http/data/shm/status )
if [[ ${data[ 9 ]} == false ]]; then
	[[ $( echo ${data[@]:0:6} ) == $( echo ${dataprev[@]:0:6} ) ]] && exit
else # webradio
	[[ $( echo ${data[@]:0:3} ) == $( echo ${dataprev[@]:0:3} ) ]] && exit
fi

curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"

if [[ -e /srv/http/data/system/lcdchar ]]; then
	killall lcdchar.py &> /dev/null
	/srv/http/bash/lcdchar.py "${data[@]}" &
fi

if [[ -e /srv/http/data/shm/snapclientip ]]; then
	status=$( echo $status | jq . | sed '/"player":/,/"single":/ d' )
	readarray -t clientip < /srv/http/data/shm/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi
[[ -e /srv/http/data/system/librandom ]] && /srv/http/bash/cmd-librandom.sh

echo "$statusdata" > /srv/http/data/shm/status
