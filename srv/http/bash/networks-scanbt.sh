#!/bin/bash

. /srv/http/bash/common.sh

bluetoothctl --timeout=10 scan on &> /dev/null

readarray -t lines <<< $( bluetoothctl devices | cut -d' ' -f2,3- )
[[ -z $lines ]] && exit

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
	connected=$( bluetoothctl info $mac | grep -q 'Connected: yes' && echo true )
	paired=$( bluetoothctl info $mac | grep -q 'Paired: yes' && echo true )
	data+=',{
  "name"      : "'${name//\"/\\\"}'"
, "mac"       : "'$mac'"
, "connected" : '$connected'
, "paired"    : '$paired'
}'
done

data2json "$data"
