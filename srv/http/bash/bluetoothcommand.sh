#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == btoff ]]; then # by udev rules
	[[ ! -e $dirshm/btclient && ! -e $dirshm/btsender && ! -e $dirshm/btdevice ]] && exit # debounce
	
	if [[ -e $dirshm/btdevice ]]; then
		pushstreamNotify "$( cat $dirshm/btdevice )" Disconnected bluetooth
		rm $dirshm/btdevice
		exit
	fi
	
	if [[ -e $dirshm/btsender ]]; then
		pushstreamNotify "$( cat $dirshm/btsender )" Disconnected btclient
		rm $dirshm/btsender
	elif [[ -e $dirshm/btclient ]]; then
		pushstream btclient false
		$dirbash/cmd.sh mpcplayback$'\n'stop
		pushstreamNotify "$( cat $dirshm/btclient | sed 's/ - A2DP$//' )" Disconnected bluetooth
		rm $dirshm/btclient
		systemctl stop bluetoothbutton
		[[ -e $dirshm/nosound ]] && pushstream display '{"volumenone":false}'
		$dirbash/mpd-conf.sh
	fi
	$dirbash/settings/networks-data.sh btlistpush
	exit
fi

if [[ $1 == bton ]]; then # by udev rules
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
else
	action=$1 # connect, disconnect, pair, remove
	mac=$2
	sink=$3
	name=$4
	[[ ! $name ]] && name=Bluetooth
fi

if [[ $action == connect || $action == pair ]]; then # pair / connect
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
				pushstreamNotify "$name" "Paired successfully.<br>$msg - to start streaming." $icon 10000
				$dirbash/settings/networks-data.sh btlistpush
				exit
			fi
		fi
		
		pushstreamNotify "$name" Ready $icon
		[[ ! $audiodevice ]] && echo $name > $dirshm/btdevice && exit
		
		macnew=$( bluetoothctl info | grep ^Device | cut -d' ' -f2 )
		readarray -t macs <<< $( bluetoothctl paired-devices | cut -d' ' -f2 | grep -v $macnew )
		if [[ $macs ]]; then
			for mac in "${macs[@]}"; do
				bluetoothctl info $mac | grep -q 'UUID: Audio' && bluetoothctl disconnect $mac &> /dev/null
			done
		fi
		rm -f $dirshm/{btclient,btsender}
		if [[ $sender ]]; then
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
echo $btmixer > $dirshm/btclient
pushstream btclient true
$dirbash/mpd-conf.sh
