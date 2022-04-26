#!/bin/bash

. /srv/http/bash/common.sh

udev=$1

if [[ $udev == btoff ]]; then
	[[ -e $dirshm/btclient ]] && mpdconf=1
	for type in btdevice btclient btsender; do
		file=$dirshm/$type
		[[ ! -e $file ]] && continue
		
		name=$( cat $file | sed 's/ - A2DP$//' )
		mac=$( bluetoothctl paired-devices | grep "$name" | cut -d' ' -f2 )
		echo $name $mac
		if bluetoothctl info $mac | grep -q 'Connected: no'; then
			[[ $type == btsender ]] && icon=btclient || icon=bluetooth
			pushstreamNotify "$name" Disconnected $icon
			rm $file
		fi
	done
	if [[ $mpdconf ]]; then
		pushstream btclient false
		$dirbash/cmd.sh mpcplayback$'\n'stop
		systemctl stop bluetoothbutton
		[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":false}'
		$dirbash/mpd-conf.sh
	fi
	$dirbash/settings/networks-data.sh btlistpush
	exit
fi

if [[ $udev == bton ]]; then
	info=$( bluetoothctl info )
	name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	[[ ! $name ]] && name=Bluetooth
	mac=$( echo "$info" | grep ^Device | cut -d' ' -f2 )
	if echo "$info" | grep -q 'Paired: no'; then
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
	info=$( bluetoothctl info )
	if [[ $action == pair ]]; then
		pair=1
		bluetoothctl trust $mac
		bluetoothctl pair $mac
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Paired: no' && sleep 1 || break
		done
	fi
	bluetoothctl info | grep -q 'Connected: no' && bluetoothctl connect $mac
	for i in {1..10}; do
		if bluetoothctl info $mac 2> /dev/null | grep -q 'UUID: '; then
			uuid=1
			break
		else
			sleep 1
		fi
	done
	if [[ $uuid ]]; then
		info=$( bluetoothctl info )
		echo "$info" | grep -q 'UUID: Audio' && audiodevice=1
		echo "$info" | grep -q 'UUID: Audio Source' && sender=1
		[[ $sender ]] && icon=btclient || icon=bluetooth
		if [[ $pair && $audiodevice ]]; then
			for i in {1..5}; do
				mixer=$( bluealsa-aplay -L )
				[[ ! $mixer ]] && sleep 1 || break
			done
			if [[ ! $mixer ]]; then
				[[ $sender ]] && msg='Disconnect > connect' || msg='Power off > on'
				pushstreamNotify "$name" "Paired successfully.<br>$msg - to start streaming." $icon -1
				$dirbash/settings/networks-data.sh btlistpush
				exit
			fi
		fi
		
		pushstreamNotify "$name" Ready $icon
##### non-audio
		[[ ! $audiodevice ]] && echo $name > $dirshm/btdevice && exit
		
		if [[ $sender ]]; then
##### sender
			echo $name > $dirshm/btsender
		else
			mpdconf=1
		fi
		$dirbash/settings/networks-data.sh btlistpush
	else
		pushstreamNotify "$name" 'Connect failed.' bluetooth
		exit
		
	fi
elif [[ $action == disconnect || $action == remove ]]; then
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

[[ ! $mpdconf ]] && exit

for i in {1..5}; do # wait for list available
	sleep 1
	btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
	[[ $btmixer ]] && break
done
if [[ ! $btmixer ]]; then
	pushstreamNotify "$name" 'No mixers found.' $icon
	exit
fi

btmixer=$( echo "$btmixer" \
			| grep ' - A2DP' \
			| cut -d"'" -f2 )
##### receiver
echo $btmixer > $dirshm/btclient
pushstream btclient true
$dirbash/cmd.sh playerstop
$dirbash/mpd-conf.sh
