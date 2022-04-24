#!/bin/bash

. /srv/http/bash/common.sh

action=$1 # connect, disconnect, pair, remove

if [[ $action == bton ]]; then
	info=$( bluetoothctl info )
	name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	[[ ! $name ]] && name=Bluetooth
	mac=$( echo "$info" | grep ^Device | cut -d' ' -f2 )
	sink=false
	if echo "$info" | grep -q 'Trusted: no'; then
		bluetoothctl agent NoInputNoOutput
		action=pair
	else
		action=connect
	fi
elif [[ $action == btoff ]]; then
	if [[ -e $dirshm/btdevice ]]; then
		pushstreamNotify "$( cat $dirshm/btdevice )" Disconnected bluetooth
		rm $dirshm/btdevice
		exit
	fi
	
	[[ ! -e $dirshm/btclient && ! -e $dirshm/btsender ]] && exit # debounce
	
	pushstream btclient false
	if [[ -e $dirshm/btsender ]]; then
		pushstreamNotify "$( cat $dirshm/btsender )" Disconnected btclient
		rm $dirshm/btsender
		exit
	else
		$dirbash/cmd.sh mpcplayback$'\n'stop
		mpdbt=off
		pushstreamNotify "$( cat $dirshm/btclient )" Disconnected bluetooth
		rm $dirshm/btclient
		systemctl stop bluetoothbutton
		[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":false}'
		$dirbash/mpd-conf.sh
	fi
else
	mac=$2
	sink=$3
	name=$4
	[[ ! $name ]] && name=Bluetooth
fi

[[ $sink == true ]] && icon=bluetooth || icon=btclient

if [[ $action == connect || $action == pair ]]; then # pair / connect
	info=$( bluetoothctl info )
	if [[ $action == pair ]]; then
		bluetoothctl trust $mac
		bluetoothctl pair $mac
	fi
	bluetoothctl info | grep -q 'Connected: no' && bluetoothctl connect $mac
	for i in {1..10}; do
		if bluetoothctl info 2> /dev/null | grep -q 'UUID: '; then
			uuid=1
			break
		else
			sleep 1
		fi
	done
	if [[ $uuid ]]; then
		pushstreamNotify "$name" Ready $icon
		info=$( bluetoothctl info )
		if ! echo "$info" | grep -q 'UUID: Audio'; then # non-audio
			echo $name > $dirshm/btdevice
			exit
		elif echo "$info" | grep -q 'UUID: Audio Source'; then # sender
			echo $name > $dirshm/btsender
		else # receiver
			pushstream btclient true
			mpdbt=on
		fi
		$dirbash/settings/networks-data.sh btclient
	else
		pushstream btclient false
		pushstreamNotify "$name" 'Connect failed.' $icon
		exit
		
	fi
elif [[ $action == disconnect || $action == remove ]]; then
	pushstream btclient false
	bluetoothctl disconnect &> /dev/null
	if [[ $action == disconnect ]]; then
		done=Disconnected
	else
		done=Removed
		bluetoothctl remove $mac &> /dev/null
	fi
	pushstreamNotify "$name" $done $icon
	$dirbash/settings/networks-data.sh btclient
fi

if [[ $action == bton ]]; then
	for i in {1..5}; do # wait for list available
		sleep 1
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
		[[ $btmixer ]] && break
	done
	if [[ $btmixer ]]; then
		btmixer=$( echo "$btmixer" \
					| grep ' - A2DP' \
					| cut -d"'" -f2 )
		echo $btmixer > $dirshm/btclient
		$dirbash/mpd-conf.sh
	fi
fi
