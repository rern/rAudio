#!/bin/bash

conf=$( cat /etc/relays.conf )

data() {
	grep "$1" <<< "$conf" | awk '{print $NF}' | tr -d ,
}
pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=relays -d "$1"
}

on=( $( data '"on."' ) )
ond=( $( data '"ond."' ) )
off=( $( data '"off."' ) )
offd=( $( data '"offd."' ) )
timer=$( grep '"timer"' <<< "$conf" | awk '{print $NF}' )
relaysfile='/srv/http/data/shm/relaystimer'

name=$( grep -A4 '"name"' <<< "$conf" | tail -4 )
readarray -t pins <<< $( echo "$name" | cut -d'"' -f2 )
readarray -t names <<< $( echo "$name" | cut -d'"' -f4 )
declare -A pinname
for i in 0 1 2 3; do
	pinname+=( [${pins[$i]}]=${names[$i]} )
done
for i in 0 1 2 3; do
	oni=${on[$i]}
	offi=${off[$i]}
	[[ $oni != 0 ]] && onorder+=,'"'${pinname[$oni]}'"'
	[[ $offi != 0 ]] && offorder+=,'"'${pinname[$offi]}'"'
done

killall relaystimer.sh &> /dev/null &
if [[ $1 == true ]]; then
	pushstream '{"state": true, "order": ['${onorder:1}']}'
	for i in 0 1 2 3; do
		pin=${on[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 mode $pin out
		gpio -1 write $pin 1
		(( $i > 0 )) && pushstream '{"on": '$(( i + 1 ))'}'
		sleep ${ond[$i]}
	done
	sleep 1
	pushstream '{"done": true}'
	
	if [[ $timer > 0 ]]; then
		echo $timer > $relaysfile
		/srv/http/bash/relaystimer.sh &> /dev/null &
	fi
else
	rm -f $relaysfile
	pushstream '{"state": false, "order": ['${offorder:1}']}'
	for i in 0 1 2 3; do
		pin=${off[$i]}
		(( $pin == 0 )) && break
		
		gpio -1 write $pin 0
		(( $i > 0 )) && pushstream '{"off": '$(( i + 1 ))'}'
		sleep ${offd[$i]}
	done
	sleep 1
	pushstream '{"done": false}'
fi
