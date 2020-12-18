#!/bin/bash

bluetoothctl --timeout=10 scan on &> /dev/null

lines=$( bluetoothctl devices | awk '{print $3"^" $2}' | sort -f )
[[ -z $lines ]] && echo [] && exit

readarray -t lines <<<"$lines"
for line in "${lines[@]}"; do
	name=${line/^*}
	dash=${name//[^-]}
	(( ${#dash} == 5 )) && continue # filter out unnamed devices
	mac=${line#*^}
	connected=$( bluetoothctl info $mac | grep -q 'Connected: yes' && echo true || echo false )
	data+='{"name":"'${name//\"/\\\"}'","mac":"'$mac'","connected":'$connected'}\n'
done
if [[ -n $data ]]; then
	data=$( echo -e "$data" | sort -f | awk NF | tr '\n' ',' )
	echo [${data:0:-1}]
else
	echo []
fi