#!/bin/bash

. /srv/http/bash/common.sh

udev=$1
icon=bluetooth

if [[ $udev == btoff ]]; then
	pushstreamNotify Bluetooth Disconnected $icon
	sleep 2
	for type in btdevice btreceiver btsender; do
		file=$dirshm/$type
		[[ ! -e $file ]] && continue
		
		name=$( cat $file | sed 's/ - A2DP$//' )
		mac=$( bluetoothctl paired-devices | grep "$name" | cut -d' ' -f2 )
		if bluetoothctl info $mac | grep -q 'Connected: no'; then
			[[ $type == btreceiver ]] && mpdconf=1
			[[ $type == btsender ]] && icon=btsender && $dirbash/cmd.sh playerstop
			pushstreamNotify "$name" Disconnected $icon
			rm $file
			break
		fi
	done
	if [[ $mpdconf ]]; then
		pushstream btreceiver false
		$dirbash/cmd.sh mpcplayback$'\n'stop
		systemctl stop bluetoothbutton
		[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":false}'
		$dirbash/mpd-conf.sh
	fi
	$dirbash/settings/networks-data.sh btlistpush
	exit
fi

if [[ $udev == bton ]]; then
	pushstreamNotify Bluetooth Connected $icon
	sleep 2
	macs=$( bluetoothctl paired-devices | cut -d' ' -f2 )
	for mac in ${macs[@]}; do
		info=$( bluetoothctl info $mac )
		if echo "$info" | grep -q 'Connected: yes'; then
			if echo "$info" | grep -q 'UUID: Audio Sink'; then
				systemctl -q is-active startup && exit # suppress on startup
				
				type=btreceiver
			elif echo "$info" | grep -q 'UUID: Audio Source'; then
				type=btsender
			else
				type=btdevice
			fi
			[[ ! -e $dirshm/$type ]] && break
		fi
	done
	if bluetoothctl info $mac | grep -q 'Paired: no'; then
		bluetoothctl agent NoInputNoOutput
		action=pair
	else
		action=connect
	fi
else # still bugs: connect, disconnect
	action=$1
	mac=$2
	name=$3
	[[ ! $name ]] && name=Bluetooth
fi

if [[ $action == connect || $action == pair ]]; then
	bluetoothctl trust $mac
	if [[ $action == pair ]]; then
		bluetoothctl pair $mac
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Paired: no' && sleep 1 || break
		done
	fi
	bluetoothctl info $mac | grep -q 'Connected: no' && bluetoothctl connect $mac
	for i in {1..10}; do
		if bluetoothctl info $mac 2> /dev/null | grep -q 'UUID: '; then
			uuid=1
			break
		else
			sleep 1
		fi
	done
	[[ ! $uuid ]] && pushstreamNotify "$name" 'Connect failed.' bluetooth && exit
	
	info=$( bluetoothctl info $mac )
	name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	if ! echo "$info" | grep -q 'UUID: Audio'; then
		pushstreamNotify "$name" Ready $icon
##### non-audio
		echo $name > $dirshm/btdevice
		exit
	fi
	
	echo "$info" | grep -q 'UUID: Audio Source' && icon=btsender && btsender=1
	for i in {1..5}; do
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
		[[ ! $btmixer ]] && sleep 1 || break
	done
	if [[ ! $btmixer ]]; then # pair from rAudio as receiver - mixers not initialized
		[[ $action == pair ]] && msg1='Paired successfully.' || msg1='Mixer device not ready.'
		[[ $btsender ]] && msg2='Disconnect > connect' || msg2='Power off > on'
		pushstreamNotify "$name" "$msg1<br><wh>$msg2</wh> again." $icon 1000
		exit
	fi
	
	pushstreamNotify "$name" Ready $icon
	if [[ $btsender ]]; then
##### sender
		echo $name > $dirshm/btsender
	else
		btmixer=$( echo "$btmixer" \
					| grep "$name - A2DP" \
					| cut -d"'" -f2 )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		pushstream btreceiver true
		$dirbash/cmd.sh playerstop
		$dirbash/mpd-conf.sh
	fi
	$dirbash/settings/networks-data.sh btlistpush
elif [[ $action == disconnect || $action == remove ]]; then
	bluetoothctl info $mac | grep -q 'UUID: Audio Source' && icon=btsender
	bluetoothctl disconnect $mac &> /dev/null
	if [[ $action == disconnect ]]; then
		msg=Disconnected
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
		done
	else
		msg=Removed
		bluetoothctl remove $mac &> /dev/null
		for i in {1..5}; do
			bluetoothctl paired-devices 2> /dev/null | grep -q $mac && sleep 1 || break
		done
	fi
	pushstreamNotify "$name" $msg $icon
	$dirbash/settings/networks-data.sh btlistpush
fi
