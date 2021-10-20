#!/bin/bash

ifconfig wlan0 up

listProfile() {
	netctllist=$( netctl list | grep -v eth | sed 's/^\s*\**\s*//' )
	i=0
	if grep -q '^+' <<<"$netctllist"; then # leading '+' = connecting
		(( i++ ))
		(( i == 15 )) && exit -1
		
		sleep 2
		listProfile
	fi
}
listProfile

if [[ -n $netctllist ]]; then
	readarray -t netctllist_ar <<<"$netctllist"
	# pre-scan saved profile to force display hidden ssid
	for name in "${netctllist_ar[@]}"; do
		grep -q '^Hidden=yes' "/etc/netctl/$name" && iwlist wlan0 scan essid "$name" &> /dev/null
	done
fi

connectedssid=$( iwgetid wlan0 -r )

iwlistscan=$( iwlist wlan0 scan \
				| grep '^\s*Quality\|^\s*Encryption\|^\s*ESSID' \
				| sed 's/^\s*Quality.*level\| dBm *$\|^\s*Encryption.*:\|^\s*ESSID.*:\|\\x00//g' \
				| sed 's/^"\|"$//g' \
				| tr '\n' '^' \
				| sed 's/=/\n/g' \
				| sort -V )
readarray -t lines <<<"${iwlistscan:1}" # remove leading \n
for line in "${lines[@]}"; do
	line=$( echo $line | tr '^' '\n' )
	readarray -t val <<< "$line"
	ssid=${val[2]}
	[[ -z $ssid ]] && continue
	
	dbm=${val[0]}
	encrypt=${val[1]}
	
	list+=',{
  "dbm"       : "'$dbm'"
, "ssid"      : "'$ssid'"
, "encrypt"   : "'$encrypt'"
, "profile"   : '$( [[ -e "/etc/netctl/$ssid" ]] && echo true )'
, "connected" : '$( [[ $ssid == $connectedssid ]] && echo true )'
}'
done

echo [${list:1}] | sed 's/:\s*,/: false,/g; s/:\s*}/: false}/g' # sed - null > false
