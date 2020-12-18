#!/bin/bash

bluetoothctl --timeout=10 scan on &> /dev/null

readarray -t lines <<< $( bluetoothctl devices | cut -d' ' -f2,3- )
[[ -z $lines ]] && echo [] && exit

for line in "${lines[@]}"; do
	devices+="
${line#* }^${line/ *}"
done
readarray -t lines <<< "$( echo "$devices" | sort -f | grep . )"
for line in "${lines[@]}"; do
	name=${line/^*}
	dash=${name//[^-]}
	(( ${#dash} == 5 )) && continue # filter out unnamed devices
	mac=${line#*^}
	connected=$( bluetoothctl info $mac | grep -q 'Connected: yes' && echo true || echo false )
	paired=$( bluetoothctl info $mac | grep -q 'Paired: yes' && echo true || echo false )
	data+='{"name":"'${name//\"/\\\"}'","mac":"'$mac'","connected":'$connected',"paired":'$paired'}\n'
done
if [[ -n $data ]]; then
	data=$( echo -e "$data" | sort -f | awk NF | tr '\n' ',' )
	echo [${data:0:-1}]
else
	echo []
fi