#!/bin/bash

# Pair: on connected - Trust > Pair > get device type > (pair audio devices - mixer not yet ready)
#                                                       - Audio: Disconnect > notify reconnect
#                                                       - Non-audio: notify
# Connect: Trust > connect > get device type > notify
# Disconnect / Remove: Disconnect > get device type > notify

. /srv/http/bash/common.sh

udev=$1
icon=bluetooth
udevservices='systemd-udevd systemd-udevd-kernel.socket systemd-udevd-control.socket'

pushstreamList() {
	$dirbash/settings/networks-data.sh btlistpush
}
bannerReconnect() {
	bluetoothctl disconnect $mac
	for i in {1..5}; do
		bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
	done
	pushstreamList
#-------------------------------------------------------------------------------
	pushstreamNotify "$name" "$1<br><wh>Power on > off / Reconnect again</wh>" $icon -1
	systemctl start $udevservices
}

if [[ $udev == btoff ]]; then
	pushstreamNotifyBlink Bluetooth 'Disconnect ...' bluetooth
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
	pushstreamList
	exit
fi

if [[ $udev == bton ]]; then
	pushstreamNotifyBlink Bluetooth 'Connect ...' bluetooth
	sleep 2
	mac=$( ls -1t /var/lib/bluetooth/*/ | grep -v 'cache\|settings' | head -1 )
	if bluetoothctl info $mac | grep -q 'Trusted: no'; then # paired by sender - not yet trusted
		action=pair
		bluetoothctl agent NoInputNoOutput
	else
		action=connect
	fi
else
	action=$1
	mac=$2
	name=$3
fi

if [[ $action == connect || $action == pair ]]; then
	bluetoothctl trust $mac
	if [[ $action == pair ]]; then
		systemctl stop $udevservices
		bluetoothctl pair $mac
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Paired: no' && sleep 1 || break
		done
		info=$( bluetoothctl info $mac )
		name=$( echo "$info" | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
		if echo "$info" | grep -q 'Paired: yes'; then
			bannerReconnect 'Paired successfully.'
		else
#-------------------------------------------------------------------------------
			pushstreamNotify "$name" 'Pair failed.' bluetooth
		fi
		exit
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
#-------------------------------------------------------------------------------
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
	[[ ! $btmixer ]] && bannerReconnect 'Mixer device not ready' && exit
	
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

pushstreamList
