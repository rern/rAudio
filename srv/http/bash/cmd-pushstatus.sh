#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

status=$( $dirbash/status.sh )
statusdata=$( echo $status \
	| jq -r '.Artist, .Title, .Album, .station, .file, .state, .Time, .elapsed, .timestamp, .webradio' \
	| sed 's/null//' )
readarray -t data <<< "$statusdata"
state=${data[5]}
webradio=${data[9]}

if [[ -e $dirtmp/status ]]; then
	dataprev=$( cat $dirtmp/status )
	if [[ $webradio == false ]]; then
		datanew=${data[@]:0:8}
		dataprev=$( head -8 <<< $dataprev | tr -d '\n ' )
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
	$dirbash/lcdchar.py "${data[@]}" &
fi
if [[ -e $dirsystem/vumeter || -e $dirsystem/vuled ]]; then
	if [[ $state == play ]]; then
		if ! pgrep cava &> /dev/null; then
			cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		fi
	else
		killall cava &> /dev/null
		curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":0}'
		if [[ -e $dirsystem/vuled ]]; then
			p=$( cat $dirsystem/vuled.conf )
			for i in $p; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
fi
if [[ -e $dirtmp/snapclientip ]]; then
	status=$( echo $status | jq . | sed '/"player":/,/"single":/ d' )
	readarray -t clientip < $dirtmp/snapclientip
	for ip in "${clientip[@]}"; do
		[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
	done
fi
[[ -e $dirsystem/librandom ]] && $dirbash/cmd-librandom.sh
