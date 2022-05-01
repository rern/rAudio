#!/bin/bash

# Pair: on connected - Trust > Pair > get device type > (pair audio devices - mixer not yet ready)
#                                                       - Audio: Disconnect > notify reconnect
#                                                       - Non-audio: notify
# Connect: Trust > connect > get device type > notify
# Disconnect / Remove: Disconnect > get device type > notify

. /srv/http/bash/common.sh

udev=$1
icon=bluetooth

bannerReconnect() {
#-----
	pushstreamNotify "$name" "$1<br><wh>Power on > off / Reconnect again</wh>" $icon -1
	bluetoothctl disconnect $mac
	pushstreamList
}
disconnectRemove() {
	line=$1
	type=$( echo $line | cut -d' ' -f2 )
	name=$( echo $line | cut -d' ' -f3- )
	[[ $type == btsender ]] && icon=btsender
#-----
	pushstreamNotify "$name" Disconnected $icon
	if [[ $type == btsender ]]; then
		$dirbash/cmd.sh playerstop
	elif [[ $type == btreceiver ]]; then
		rm $dirshm/btreceiver
		pushstream btreceiver false
		$dirbash/cmd.sh mpcplayback$'\n'stop
		$dirbash/mpd-conf.sh
	fi
	sed -i "/^$mac/ d" $dirshm/btconnected
}
pushstreamList() {
	$dirbash/settings/networks-data.sh btlistpush
}

if [[ $udev == btoff ]]; then
#-----
	pushstreamNotify Bluetooth 'Disconnect ...' 'bluetooth blink'
	sleep 2
	readarray -t lines <<< $( cat $dirshm/btconnected )
	for line in "${lines[@]}"; do
		mac=${line/ *}
		bluetoothctl info $mac | grep -q 'Connected: no' && break
	done
	disconnectRemove "$line"
	pushstreamList
	exit
fi

if [[ $udev == bton ]]; then # connect from paired device / paired by sender > udev
#-----
	pushstreamNotifyBlink Bluetooth 'Connect ...' bluetooth
	sleep 2
	macs=$( bluetoothctl devices | cut -d' ' -f2 )
	for mac in ${macs[@]}; do
		if bluetoothctl info $mac | grep -q 'Connected: yes'; then
			! grep -q $mac $dirshm/btconnected &> /dev/null && break
		fi
	done
	if bluetoothctl info $mac | grep -q 'Paired: yes'; then
		action=connect
	else # paired by sender - not yet trusted
		sleep 2
		action=pair
		bluetoothctl agent NoInputNoOutput
	fi
else
	action=$1
	mac=$2
	name=$3
fi

if [[ $action == connect || $action == pair ]]; then
	bluetoothctl trust $mac
	bluetoothctl pair $mac
	for i in {1..5}; do
		bluetoothctl info $mac | grep -q 'Paired: no' && sleep 1 || break
	done
	info=$( bluetoothctl info $mac )
	name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
	[[ ! $name ]] && exit # power on unpaired receiver
	
#-----
	echo "$info" | grep -q 'Paired: no' && pushstreamNotify "$name" 'Pair failed.' bluetooth && exit
	
#-----
	[[ $action != connect ]] && bannerReconnect 'Paired successfully' && exit
	
	bluetoothctl info $mac | grep -q 'Connected: no' && bluetoothctl connect $mac
	if ! echo "$info" | grep -q 'UUID: Audio'; then
#-----
		pushstreamNotify "$name" Ready $icon
##### non-audio
		echo $mac btdevice $name >> $dirshm/btconnected
		exit
	fi
	
	echo "$info" | grep -q 'UUID: Audio Source' && icon=btsender && btsender=1
	for i in {1..5}; do
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ ! $btmixer ]] && sleep 1 || break
	done
	[[ ! $btmixer ]] && bannerReconnect 'Device not ready' && exit
	
#-----
	pushstreamNotify "$name" Ready $icon
	if [[ $btsender ]]; then
##### sender
		echo $mac btsender $name >> $dirshm/btconnected
	else
		btmixer=$( echo "$btmixer" | cut -d"'" -f2 )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		echo $mac btreceiver $name >> $dirshm/btconnected
		pushstream btreceiver true
		$dirbash/cmd.sh playerstop
		$dirbash/mpd-conf.sh
	fi
elif [[ $action == disconnect || $action == remove ]]; then
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
	disconnectRemove "$( grep ^$mac $dirshm/btconnected )"
fi

pushstreamList
