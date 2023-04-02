#!/bin/bash

. /srv/http/bash/common.sh
timerfile=$dirshm/relaystimer

. $dirsystem/relays.conf

if [[ $1 == true ]]; then
	touch $dirshm/relayson
	devices='<wh>'$( echo -e $orderon )
	i=0
	for pin in ${on[$i]}; do
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		message=$( sed "$(( i + 1 )) s|$|</wh>|" <<< $devices )
		pushstream relays '{ "state": "ON", "message": '$message' }'
		sleep ${ond[$i]}
		(( i++ ))
	done
	if [[ ! -e $dirshm/stoptimer && $timer > 0 ]]; then
		echo $timer > $timerfile
		$dirsettings/relays-timer.sh &> /dev/null &
	fi
else
	rm -f $dirshm/relayson $timerfile
	killall relays-timer.sh &> /dev/null
	devices='<gr>'$( echo -e $orderoff )
	i=0
	for pin in ${off[$i]}; do
		gpio -1 write $pin 0
		message=$( sed "$(( i + 1 )) s|$|</gr>|" <<< $devices )
		pushstream relays '{ "state": "OFF", "message": '$message' }'
		sleep ${offd[$i]}
		(( i++ ))
	done
fi

alsactl store
sleep 1
$dirbash/status-push.sh
pushstream relays '{ "state": "RESET" }'
