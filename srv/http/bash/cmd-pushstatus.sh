#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

status=$( /srv/http/bash/status.sh )
statusdata=$( echo $status \
	| jq -r '.Artist, .Title, .Album, .state, .Time, .elapsed, .timestamp, .station, .file, .webradio' \
	| sed 's/null//' )
readarray -t data <<< "$statusdata"
if [[ -e $dirtmp/status ]]; then
	dataprev=$( cat $dirtmp/status )
	if [[ ${data[ 7 ]} == false ]]; then # not webradio
		datanew=${data[@]:0:6}
		dataprev=$( head -6 <<< $dataprev | tr -d '\n ' )
		[[ ${datanew// } == $dataprev ]] && exit
	else
		datanew=${data[@]:0:3}
		dataprev=$( head -3 <<< $dataprev | tr -d '\n ' )
		[[ ${data[3]} == play && ${datanew// } == $dataprev ]] && exit
	fi
fi

curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"

echo "$statusdata" > $dirtmp/status

if [[ -e $dirsystem/lcdchar ]]; then
	killall lcdchar.py &> /dev/null
	readarray -t data <<< "${statusdata//\"/\\\"}"
	/srv/http/bash/lcdchar.py "${data[@]}" &
fi
if [[ -e $dirtmp/snapclientip ]]; then
	status=$( echo $status | jq . | sed '/"player":/,/"single":/ d' )
	readarray -t clientip < $dirtmp/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi
[[ -e $dirsystem/librandom ]] && /srv/http/bash/cmd-librandom.sh
