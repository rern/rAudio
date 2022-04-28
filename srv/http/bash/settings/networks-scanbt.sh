#!/bin/bash

. /srv/http/bash/common.sh

listBt() {
	bluetoothctl $1 \
		| grep -v ' ..-..-..-..-..-..$' \
		| sed 's/Device \(..:..:..:..:..:..\) \(.*\)/\2^\1/' \
		| sort -f
}

bluetoothctl --timeout=10 scan on &> /dev/null

devices=$( listBt devices )
[[ ! $devices ]] && exit

paired=$( listBt paired-devices )
[[ $paired ]] && lines=$( diff <( echo "$paired" ) <( echo "$devices" ) | grep '^>' | cut -c 3- )
[[ ! $lines ]] && exit

readarray -t lines <<< $( echo "$lines" )
for line in "${lines[@]}"; do
	name=${line/^*}
	mac=${line#*^}
	data+=',{
  "name"      : "'${name//\"/\\\"}'"
, "mac"       : "'$mac'"
}'
done

data2json "$data"
