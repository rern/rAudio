#!/bin/bash

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
timerfile=/srv/http/data/shm/relaystimer

# convert each line to each args
readarray -t args <<< "$1"

cmd=${args[0]}

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

if [[ $cmd == relaysset ]]; then
	data=${args[1]}
	echo -e "$data" > $dirsystem/relays.conf
	touch $dirsystem/relays
	data=$( $dirbash/relays-data.sh )
	pushstream refresh "$data"
	pushstream display '{"submenu":"relays","value":true}'
	exit
fi

. $dirsystem/relays.conf

pushstreamRelays() {
	pushstream relays "$1"
}

mpc -q stop
systemctl stop radio
rm -f $dirshm/status

if [[ $cmd == true ]]; then
	pushstreamRelays '{"state": true, "order": '"$onorder"'}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstreamRelays '{"on": '$(( i + 1 ))'}'
		sleep ${ond[$i]} &> /dev/null
	done
	touch $dirshm/relayson
	if [[ $timer > 0 ]]; then
		echo $timer > $timerfile
		$dirbash/relaystimer.sh &> /dev/null &
	fi
else
	if [[ -e $timerfile ]]; then
		rm $timerfile
		killall relaystimer.sh &> /dev/null &
	fi
	pushstreamRelays '{"state": false, "order": '"$offorder"'}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstreamRelays '{"off": '$(( i + 1 ))'}'
		sleep ${offd[$i]} &> /dev/null
	done
	rm -f $dirshm/relayson
fi

sleep 1
$dirbash/cmd-pushstatus.sh
pushstreamRelays '{"done":1}'
