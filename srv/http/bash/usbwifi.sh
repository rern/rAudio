#!/bin/bash

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

if [[ $1 == add ]]; then
	wlandev=$( ip -br link \
					| grep ^w \
					| grep -v wlan \
					| cut -d' ' -f1 )
else
	wlandev=wlan0
fi
echo $wlandev > /dev/shm/wlan
iw $wlandev set power_save off &> /dev/null

[[ $wlandev == wlan0 ]] && state=Removed || state=Ready
data='{"title":"USB Wi-Fi","text":"'$state'","icon":"wifi"}'
pushstream notify "$data"

data=$( /srv/http/bash/networks-data.sh )
pushstream refresh "$data"
