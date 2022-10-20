#!/bin/bash

. /srv/http/bash/common.sh
timerfile=$dirshm/relaystimer

# convert each line to each args
readarray -t args <<< "$1"

cmd=${args[0]}

if [[ $cmd == save ]]; then
	data=${args[1]}
	echo -e "$data" > $dirsystem/relays.conf
	touch $dirsystem/relays
	$dirsettings/relays-data.sh pushrefresh
	data='{"submenu":"relays","value":true}'
	pushstream display "$data"
	exit
fi

. $dirsystem/relays.conf

if [[ $cmd == true ]]; then
	touch $dirshm/relayson
	data='{"state":true,"order":'$onorder'}'
	pushstream relays "$data"
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		if (( $i > 0 )); then
			data='{"on":'$(( i + 1 ))'}'
			pushstream relays "$data"
		fi
		sleep ${ond[$i]} &> /dev/null
	done
	if [[ ! -e $dirshm/stoptimer && $timer > 0 ]]; then
		echo $timer > $timerfile
		$dirsettings/relays-timer.sh &> /dev/null &
	fi
else
	rm -f $dirshm/relayson $timerfile
	killall relays-timer.sh &> /dev/null
	data='{"state":false,"order":'$offorder'}'
	pushstream relays "$data"
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		if (( $i > 0 )); then
			data='{"off":'$(( i + 1 ))'}'
			pushstream relays "$data"
		fi
		sleep ${offd[$i]} &> /dev/null
	done
fi

alsactl store
sleep 1
$dirbash/status-push.sh
data='{"done":1}'
pushstream relays "$data"
