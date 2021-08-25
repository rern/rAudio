#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=relays -d "$1"
}
relaysOrder() {
	conf=$( cat /etc/relays.conf )
	name=$( jq .name <<< $conf )
	ons=( $( jq -r .on[] <<< $conf ) )
	offs=( $( jq -r .off[] <<< $conf ) )
	for i in 0 2 4 6; do
		oni=${ons[$i]}
		offi=${offs[$i]}
		on+=( $oni )
		off+=( $offi )
		[[ $oni != 0 ]] && onorder+=,$( jq '."'$oni'"' <<< $name )
		[[ $offi != 0 ]] && offorder+=,$( jq '."'$offi'"' <<< $name )
	done
	for i in 1 3 5; do
		ond+=( ${ons[$i]} )
		offd+=( ${offs[$i]} )
	done
	timer=$( jq -r .timer <<< $conf )
	echo -n "\
onorder=[ ${onorder:1} ]
on=( ${on[@]} )
ond=( ${ond[@]} )
offorder=[ ${offorder:1} ]
off=( ${off[@]} )
offd=( ${offd[@]} )
timer=$timer" > $dirsystem/relays
}

cmd=${args[0]}

if [[ $cmd == relaysset ]]; then
	data=$( echo ${args[1]} | jq . )
	echo "$data" > /etc/relays.conf
	data=$( echo "$data" | sed '1 a\"page":"relays",' )
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d "$data"
fi
if [[ ${cmd:0:6} == relays ]]; then
	relaysOrder
	exit
fi

. $dirsystem/relays

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
