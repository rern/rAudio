#!/bin/bash

. /srv/http/bash/common.sh

action=$1 # connect, disconnect, pair, remove
if [[ $action != reconnect ]]; then
	mac=$2
	sink=$3
	name=${@:4}
else
	bluetoothctl --timeout=10 &> /dev/null
	mac=$( cat $dirsystem/btreconnect )
	name=$( bluetoothctl info $mac | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	bluetoothctl info $mac | grep -q 'UUID: Audio Sink' && sink=true
	[[ ! $sink ]] && systemctl start bluezdbus
fi
[[ ! $name ]] && name=Bluetooth
[[ $sink == true ]] && icon=btclient || icon=bluetooth
bluetoothctl disconnect &> /dev/null
if [[ $action == pair ]]; then
	bluetoothctl trust $mac &> /dev/null
	bluetoothctl pair $mac &> /dev/null
elif [[ $action == disconnect || $action == remove ]]; then
	[[ $action == remove ]] && bluetoothctl remove $mac &> /dev/null
	for i in {1..10}; do
		bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
	done
fi
if [[ $action == connect || $action == pair || $action == reconnect ]]; then # pair / connect / reconnect
	if [[ $action == reconnect ]]; then
		pushstreamNotify "$name" 'Connect ...' $icon
	elif [[ $sink == true ]]; then
		systemctl stop bluezdbus
		systemctl restart bluetooth bluealsa
	else
		systemctl stop bluealsa
		systemctl start bluezdbus
	fi
	bluetoothctl connect $mac &> /dev/null
	for i in {1..10}; do
		if bluetoothctl info $mac | grep -q 'Connected: no'; then
			sleep 1
		else
			connected=1
			break
		fi
	done
	if [[ $connected ]]; then
		pushstream btclient true
	else
		pushstreamNotify "$name" 'Not found.' $icon
		systemctl stop bluealsa bluezdbus
		exit
		
	fi
elif [[ $action == disconnect ]]; then
	pushstream btclient false
	pushstreamNotify "$name" 'Disconnected' $icon
	systemctl stop bluealsa bluezdbus
fi
sleep 2
data=$( $dirbash/settings/networks-data.sh )
pushstream refresh "$data"
