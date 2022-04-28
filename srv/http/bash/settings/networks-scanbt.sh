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
[[ $paired ]] && devices=$( diff <( echo "$paired" ) <( echo "$devices" ) | grep '^>' | cut -c 3- )
readarray -t devices <<< $( echo "$devices" )
for dev in "${devices[@]}"; do
        name=${dev/^*}
        mac=${dev/*^}
        data+=',{
  "name"      : "'$name'"
, "mac"       : "'$mac'"
}'
done

data2json "$data"
