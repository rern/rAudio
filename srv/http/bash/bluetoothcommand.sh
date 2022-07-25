#!/bin/bash

# Pair: on connected - Trust > Pair > get device type > Disconnect > notify reconnect
#   - pair audio devices - mixer not yet ready)
# Connect: Trust > connect > get device type > notify
# Disconnect / Remove: Disconnect > notify

. /srv/http/bash/common.sh

udev=$1
icon=bluetooth

bannerReconnect() {
	bluetoothctl disconnect $mac
	pushstreamList
	pushstreamNotify "$name" "$1<br><wh>Power it off > on / Reconnect again</wh>" $icon 15000
}
disconnectRemove() {
	sed -i "/^$mac/ d" $dirshm/btconnected
	[[ $1 ]] && msg=$1 || msg=Disconnected
	touch $dirshm/$type-$mac
	if [[ $type == Source ]]; then
		icon=btsender
		$dirbash/cmd.sh playerstop
	elif [[ $type == Sink ]]; then
		rm $dirshm/btreceiver
		pushstream btreceiver false
		$dirbash/cmd.sh mpcplayback$'\n'stop
		$dirbash/settings/player-conf.sh
	fi
	pushstreamNotify "$name" $msg $icon
	pushstreamList
}
pushstreamList() {
	$dirbash/settings/networks-data.sh btlistpush
	$dirbash/settings/features.sh pushrefresh
}
startupFinished() {
	(( $(( $( date +%s ) - $( uptime -s | date -f - +%s ) )) > 30 )) && return 0
}
#-------------------------------------------------------------------------------------------
if [[ $udev == Ready || $udev == Removed ]]; then # >>>> udev: usb
	startupFinished && pushstreamNotify 'USB Bluetooth' $udev bluetooth
	rfkill | grep -q bluetooth && systemctl start bluetooth || systemctl stop bluetooth
	pushstreamList
	exit
fi

#-------------------------------------------------------------------------------------------
if [[ $udev == btoff ]]; then # >>>> udev: 1. disconnect from paired device
	sleep 2
	readarray -t lines <<< $( cat $dirshm/btconnected )
	for line in "${lines[@]}"; do
		mac=${line/ *}
		bluetoothctl info $mac | grep -q 'Connected: yes' && mac= || break
	done
	if [[ $mac ]]; then
#-----
		pushstreamNotifyBlink Bluetooth 'Disconnect ...' bluetooth
		type=$( echo $line | cut -d' ' -f2 )
		name=$( echo $line | cut -d' ' -f3- )
		disconnectRemove
	fi
	exit
fi

if [[ $udev == bton ]]; then # >>>> udev: 1. pair from sender; 2. connect from paired device
	sleep 2
	msg='Connect ...'
	macs=$( bluetoothctl devices | cut -d' ' -f2 )
	for mac in ${macs[@]}; do
		if bluetoothctl info $mac | grep -q 'Connected: yes'; then
			grep -q $mac $dirshm/btconnected &> /dev/null && mac= || break
		fi
	done
	 # unpaired sender only - fix: rAudio triggered to connect by unpaired receivers when power on 
	if grep -q $mac <<< $( bluetoothctl paired-devices ); then
		if [[ -e $dirsystem/camilladsp ]] && bluetoothctl info $mac | grep -q 'UUID: Audio Sink'; then
			name=$( bluetoothctl info $mac | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
			bluetoothctl disconnect $mac
#-----X
			pushstreamNotify "$name" 'Disconnected<br><wh>DSP is currently enabled.</wh>' bluetooth 6000
			exit
		fi
	else
		for i in {1..5}; do
			! bluetoothctl info $mac | grep -q 'UUID:' && sleep 1 || break
		done
#-----X
		bluetoothctl info $mac | grep -q 'UUID: Audio Source' && msg='Pair ...' || exit
	fi
	
#-----
	pushstreamNotifyBlink Bluetooth "$msg" bluetooth
	if (( $( bluetoothctl info $mac | grep 'Paired: yes\|Trusted: yes' | wc -l ) == 2 )); then
		action=connect
	else
		sleep 2
		action=pair
		bluetoothctl agent NoInputNoOutput
	fi
else # >>>> rAudio: 1. pair to receiver; 2. remove paired device
	action=$1
	mac=$2
	type=$3
	name=$4
fi
#-------------------------------------------------------------------------------------------
if [[ $action == connect || $action == pair ]]; then
	bluetoothctl trust $mac
	bluetoothctl pair $mac
	for i in {1..5}; do
		bluetoothctl info $mac | grep -q 'Paired: no' && sleep 1 || break
	done
	name=$( bluetoothctl info $mac | grep '^\s*Alias:' | sed 's/^\s*Alias: //' )
#-----X
	bluetoothctl info $mac | grep -q 'Paired: no' && pushstreamNotify "$name" 'Pair failed.' bluetooth && exit
	
#-----X
	[[ $action == pair ]] && bannerReconnect 'Paired successfully' && exit
	
	bluetoothctl info $mac | grep -q 'Connected: no' && bluetoothctl connect $mac
	for i in {1..5}; do
		! bluetoothctl info $mac | grep -q 'UUID:' && sleep 1 || break
	done
	type=$( bluetoothctl info $mac | grep 'UUID: Audio' | sed 's/\s*UUID: Audio \(.*\) .*/\1/' | xargs )
	if [[ ! $type ]]; then
##### non-audio
		echo $mac Device $name >> $dirshm/btconnected
#-----X
		pushstreamNotify "$name" Ready $icon
		exit
	fi
	
	for i in {1..5}; do
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ ! $btmixer ]] && sleep 1 || break
	done
#-----X
	[[ $type == Source ]] && icon=btsender
	uptime -s | date -f - +%s > $dirshm/uptime
	date +%s >> $dirshm/uptime
	if [[ ! $btmixer ]]; then
		startupFinished && bannerReconnect 'Mixer not ready' # suppress on startup
		exit
	fi
	
#-----
	pushstreamNotify "$name" Ready $icon
	if [[ $type == Source ]]; then
##### sender
		echo $mac Source $name >> $dirshm/btconnected
	else
		btmixer=$( echo "$btmixer" | cut -d"'" -f2 )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		echo $mac Sink $name >> $dirshm/btconnected
		pushstream btreceiver true
		$dirbash/cmd.sh playerstop
		$dirbash/settings/player-conf.sh
	fi
	pushstreamList
elif [[ $action == disconnect || $action == remove ]]; then # from rAudio only
	bluetoothctl disconnect $mac &> /dev/null
	if [[ $action == disconnect ]]; then
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q 'Connected: yes' && sleep 1 || break
		done
		disconnectRemove
	else
		bluetoothctl remove $mac &> /dev/null
		for i in {1..5}; do
			bluetoothctl paired-devices 2> /dev/null | grep -q $mac && sleep 1 || break
		done
		disconnectRemove Removed
	fi
fi
