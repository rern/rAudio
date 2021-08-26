#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=relays -d "$1"
}

cmd=${args[0]}

if [[ $cmd == relaysset ]]; then
	data=${args[1]}
	echo -e "$data" > $dirsystem/relayspin
	data=$( /srv/http/bash/relays-data.sh )
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d "$data"
fi

. $dirsystem/relayspin

relaysfile=$dirtmp/relaystimer

killall relaystimer.sh &> /dev/null &

mpc -q stop

if [[ $cmd == true ]]; then
	pushstream '{"state": true, "order": '"$onorder"'}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstream '{"on": '$(( i + 1 ))'}'
		sleep ${ond[$i]} &> /dev/null
	done
	if [[ $timer > 0 ]]; then
		echo $timer > $relaysfile
		/srv/http/bash/relaystimer.sh &> /dev/null &
	fi
else
	rm -f $relaysfile $dirsystem/volumemute
	pushstream '{"state": false, "order": '"$offorder"'}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstream '{"off": '$(( i + 1 ))'}'
		sleep ${offd[$i]} &> /dev/null
	done
fi

sleep 1
systemctl stop radio
rm -f $dirtmp/status
/srv/http/bash/cmd-pushstatus.sh
pushstream '{"done":1}'
