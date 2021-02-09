#!/bin/bash

# prevent powerbutton wfi false rising/falling
systemctl -q is-active powerbutton && powerbuttonactive=1
[[ $1 == powerbutton ]] && powerbutton=1
if [[ -n $powerbuttonactive && -z $powerbutton ]]; then
	powerbuttonstart=1
	systemctl stop powerbutton
fi
	
. /srv/http/data/system/relays

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=relays -d "$1"
}

relaysfile='/srv/http/data/shm/relaystimer'

killall relaystimer.sh &> /dev/null &

if [[ $1 == true ]]; then
	pushstream '{"state": true, "order": '"$onorder"'}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstream '{"on": '$(( i + 1 ))'}'
		sleep ${ond[$i]} &> /dev/null
	done
	sleep 1
	pushstream '{"done": true}'
	
	if [[ $timer > 0 ]]; then
		echo $timer > $relaysfile
		/srv/http/bash/relaystimer.sh &> /dev/null &
	fi
else
	rm -f $relaysfile
	pushstream '{"state": false, "order": '"$offorder"'}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstream '{"off": '$(( i + 1 ))'}'
		sleep ${offd[$i]} &> /dev/null
	done
	sleep 1
	pushstream '{"done": false}'
fi

[[ -n $powerbuttonstart ]] &&  systemctl start powerbutton
