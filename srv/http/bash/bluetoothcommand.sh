#!/bin/bash

. /srv/http/bash/common.sh

if [[ -e $dirshm/pair ]]; then
	sleep 6
	rm -f $dirshm/pair
	exit
fi

udev=$1
icon=bluetooth

bluetoothList() {
	$dirbash/settings/networks-data.sh btlistpush
}
bluetoothReconnect() {
	(
		sleep 6
		[[ $2 ]] && msg='Connect' || msg='Power off > on'
		pushstreamNotify "$name" "$1<br><wh>$msg again</wh>" $icon -1
	) &> /dev/null &
	
	bluetoothctl disconnect $mac
	sleep 1
	bluetoothList
}

if [[ $udev == btoff ]]; then
	pushstreamNotify Bluetooth 'Disconnect ...' 'bluetooth blink'
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
	bluetoothList
	exit
fi

if [[ $udev == bton ]]; then
	pushstreamNotify Bluetooth 'Connect ...' 'bluetooth blink'
	sleep 2
	macs=$( bluetoothctl paired-devices | cut -d' ' -f2 )
	for mac in ${macs[@]}; do
		info=$( bluetoothctl info $mac )
		if echo "$info" | grep -q 'Connected: yes'; then
			if echo "$info" | grep -q 'UUID: Audio Sink'; then
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
		action=pair
		touch $dirshm/pair
		bluetoothctl agent NoInputNoOutput
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
		info=$( bluetoothctl info $mac )
		name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
		if echo "$info" | grep -q 'Paired: yes'; then
			if echo "$info" | grep -q 'UUID: Audio'; then
				echo "$info" | grep -q 'UUID: Audio Source' && icon=btsender && btsender=1
				bluetoothReconnect 'Paired successfully' $btsender
				exit
			fi
		else
			pushstreamNotify "$name" 'Pair failed.' bluetooth
			exit
		fi
	fi
	
	bluetoothctl info $mac | grep -q 'Connected: no' && bluetoothctl connect $mac
	for i in {1..5}; do
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
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ ! $btmixer ]] && sleep 1 || break
	done
	[[ ! $btmixer ]] && bluetoothReconnect 'Mixer device not ready' $btsender && exit
	
	pushstreamNotify "$name" Ready $icon
	if [[ $btsender ]]; then
##### sender
		echo $name > $dirshm/btsender
	else
		btmixer=$( echo "$btmixer" | cut -d"'" -f2 )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		pushstream btreceiver true
		$dirbash/cmd.sh playerstop
		$dirbash/mpd-conf.sh
	fi
elif [[ $action == disconnect || $action == remove ]]; then
	info=$( bluetoothctl info $mac )
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
		if ! echo "$info" | grep -q 'UUID: Audio'; then
			rm -f $dirshm/btdevice
		elif echo "$info" | grep -q 'UUID: Audio Source'; then
			icon=btsender
			rm -f $dirshm/btsender
		else
			rm -f $dirshm/btreceiver
		fi
	fi
	pushstreamNotify "$name" $msg $icon
fi

bluetoothList
