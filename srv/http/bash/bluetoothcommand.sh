#!/bin/bash

. /srv/http/bash/common.sh

action=$1 # connect, disconnect, pair, remove
mac=$2
sink=$3
name=${@:4}
[[ ! $name ]] && name=Bluetooth
[[ $sink == true ]] && icon=btclient || icon=bluetooth
bluetoothctl disconnect &> /dev/null
if [[ $action == disconnect || $action == remove ]]; then
	[[ $action == remove ]] && bluetoothctl remove $mac &> /dev/null
	for i in {1..10}; do
		bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
	done
fi
if [[ $action == connect || $action == pair ]]; then # pair / connect
	if [[ $sink == true ]]; then
		systemctl stop bluezdbus
		systemctl start bluealsa
	else
		systemctl stop bluealsa
		systemctl start bluezdbus
	fi
	systemctl restart bluetooth
	sleep 2
	bluetoothctl trust $mac &> /dev/null
	bluetoothctl pair $mac &> /dev/null
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
	if [[ -e $dirshm/power ]]; then
		pushstreamNotify "$name" 'Disconnected' $icon
		systemctl stop bluealsa bluezdbus
	fi
fi
data=$( $dirbash/settings/networks-data.sh )
pushstream refresh "$data"
