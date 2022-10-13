#!/bin/bash

. /srv/http/bash/common.sh
timerfile=$dirshm/relaystimer

# convert each line to each args
readarray -t args <<< "$1"

cmd=${args[0]}

if [[ $cmd == relaysset ]]; then
	data=${args[1]}
	echo -e "$data" > $dirsystem/relays.conf
	touch $dirsystem/relays
	relays-data.sh pushrefresh
	pushstream display '{"submenu":"relays","value":true}'
	exit
fi

. $dirsystem/relays.conf

pushstreamRelays() {
	pushstream relays "$1"
}

if [[ $cmd == true ]]; then
	touch $dirshm/relayson
	pushstreamRelays '{"state": true, "order": '"$onorder"'}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstreamRelays '{"on": '$(( i + 1 ))'}'
		sleep ${ond[$i]} &> /dev/null
	done
	if [[ ! -e $dirshm/stoptimer && $timer > 0 ]]; then
		echo $timer > $timerfile
		relays-timer.sh &> /dev/null &
	fi
else
	rm -f $dirshm/relayson $timerfile
	killall relays-timer.sh &> /dev/null
	pushstreamRelays '{"state": false, "order": '"$offorder"'}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstreamRelays '{"off": '$(( i + 1 ))'}'
		sleep ${offd[$i]} &> /dev/null
	done
fi

alsactl store
sleep 1
status-push.sh
pushstreamRelays '{"done":1}'
