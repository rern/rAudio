#!/bin/bash

. /srv/http/bash/common.sh
timerfile=$dirshm/relaystimer

# convert each line to each args
readarray -t args <<< $1

cmd=${args[0]}

if [[ $cmd == save ]]; then
	printf "%s\n" "${args[@]:1}" > $dirsystem/relays.conf
	touch $dirsystem/relays
	$dirsettings/relays-data.sh pushrefresh
	pushstream display '{"submenu":"relays","value":true}'
	exit
fi

. $dirsystem/relays.conf

if [[ $cmd == true ]]; then
	touch $dirshm/relayson
	pushstream relays '{"state":true,"order":'$onorder'}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstream relays '{"on":'$(( i + 1 ))'}'
		sleep ${ond[$i]} &> /dev/null
	done
	if [[ ! -e $dirshm/stoptimer && $timer > 0 ]]; then
		echo $timer > $timerfile
		$dirsettings/relays-timer.sh &> /dev/null &
	fi
else
	rm -f $dirshm/relayson $timerfile
	killall relays-timer.sh &> /dev/null
	pushstream relays '{"state":false,"order":'$offorder'}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstream relays '{"off":'$(( i + 1 ))'}'
		sleep ${offd[$i]} &> /dev/null
	done
fi

alsactl store
sleep 1
$dirbash/status-push.sh
pushstream relays '{"done":1}'
