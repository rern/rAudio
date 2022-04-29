#!/bin/bash

. /srv/http/bash/common.sh

udev=$1

if [[ $udev == btoff ]]; then
	sleep 2
	for type in btdevice btreceiver btsender; do
		file=$dirshm/$type
		[[ ! -e $file ]] && continue
		
		name=$( cat $file | sed 's/ - A2DP$//' )
		mac=$( bluetoothctl paired-devices | grep "$name" | cut -d' ' -f2 )
		if bluetoothctl info $mac | grep -q 'Connected: no'; then
			[[ $type == btreceiver ]] && mpdconf=1
			[[ $type == btsender ]] && icon=btsender || icon=bluetooth
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
			#! grep -q "$name" $dirshm/$type &> /dev/null && break
		fi
	done
	if bluetoothctl info $mac | grep -q 'Paired: no'; then
		bluetoothctl agent NoInputNoOutput
		action=pair
	else
		action=connect
	fi
else
	action=$1 # pair, remove (bugs: connect, disconnect)
	mac=$2
	name=$3
	[[ ! $name ]] && name=Bluetooth
fi

if [[ $action == connect || $action == pair ]]; then
	info=$( bluetoothctl info $mac )
	if [[ $action == pair ]]; then
		pair=1
		bluetoothctl trust $mac
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
	echo "$info" | grep -q 'UUID: Audio' && audiodevice=1
	echo "$info" | grep -q 'UUID: Audio Source' && sender=1
	name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	[[ $sender ]] && icon=btsender || icon=bluetooth
	if [[ $audiodevice ]]; then
		for i in {1..5}; do
			mixer=$( bluealsa-aplay -L )
			[[ ! $mixer ]] && sleep 1 || break
		done
		if [[ ! $mixer ]]; then # pair from rAudio as receiver - mixers not initialized
			[[ $sender ]] && msg='Disconnect > connect' || msg='Power off > on'
			pushstreamNotify "$name" "Paired successfully.<br><wh>$msg</wh> again." $icon -1
			exit
		fi
	fi
	
	pushstreamNotify "$name" Ready $icon
	if [[ ! $audiodevice ]]; then
##### non-audio
		echo $name > $dirshm/btdevice
	elif [[ $sender ]]; then
##### sender
		echo $name > $dirshm/btsender
	else
		for i in {1..5}; do # wait for list available
			sleep 1
			btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
			[[ $btmixer ]] && break
		done
		if [[ ! $btmixer ]]; then
			pushstreamNotify "$name" 'Mixers not ready. Try <wh>power off > on</wh> again.' $icon
			exit
		fi

		btmixer=$( echo "$btmixer" \
					| grep ' - A2DP' \
					| grep "$name" \
					| cut -d"'" -f2 )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		pushstream btreceiver true
		$dirbash/cmd.sh playerstop
		$dirbash/mpd-conf.sh
	fi
	$dirbash/settings/networks-data.sh btlistpush
elif [[ $action == disconnect || $action == remove ]]; then
	bluetoothctl info $mac | grep -q 'UUID: Audio Source' && icon=btsender || icon=bluetooth
	bluetoothctl disconnect &> /dev/null
	if [[ $action == disconnect ]]; then
		done=Disconnected
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
		done
	else
		done=Removed
		bluetoothctl remove $mac &> /dev/null
		for i in {1..5}; do
			bluetoothctl paired-devices 2> /dev/null | grep -q $mac && sleep 1 || break
		done
	fi
	pushstreamNotify "$name" $done $icon
	$dirbash/settings/networks-data.sh btlistpush
fi
