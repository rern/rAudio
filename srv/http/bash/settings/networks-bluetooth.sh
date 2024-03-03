#!/bin/bash

# Pair: trust > pair > get sink_source > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get sink_source
# Disconnect / Remove: disconnect
[[ -e /srv/http/data/shm/btflag ]] && exit # flag - suppress bluetooth.rules fires 2nd "connect" after paired / connect

. /srv/http/bash/common.sh

# flag - suppress bluetooth.rules fires 2nd "connect" after paired / connect
touch $dirshm/btflag
( sleep 5; rm $dirshm/btflag ) &> /dev/null &

action=$1
mac=$2
[[ ! $mac ]] && udev=1
type=btreceiver

disconnectRemove() {
	line=$( grep ^$mac $dirshm/btconnected )
	type=$( cut -d' ' -f2 <<< $line )
	name=$( cut -d' ' -f3- <<< $line )
	sed -i "/^$mac/ d" $dirshm/btconnected
	[[ ! $( awk NF $dirshm/btconnected ) ]] && rm $dirshm/btconnected
	rm -f $dirshm/$type
	[[ $type == btreceiver ]] && rm -f $dirshm/{btmixer,btname}
	filedefault=/etc/default/camilladsp
	getVar CONFIG $filedefault > $dircamilladsp/$mac
	fileconfig=$( < $dircamilladsp/fileconfig )
	sed -i "s|^CONFIG.*|CONFIG=$fileconfig|" $filedefault
	notify "$type blink" "$name" "${action^} ..."
	$dirbash/cmd.sh playerstop
	$dirsettings/player-conf.sh
	refreshPages
}
refreshPages() {
	pushRefresh features
	sleep 1
	pushRefresh networks pushbt
	[[ $dirsystem/camilladsp ]] && pushRefresh camilla
}
#-------------------------------------------------------------------------------------------
# from bluetooth.rules: disconnect from paired device - no mac
if [[ $udev && $action == disconnect ]]; then
	sleep 2
	lines=$( < $dirshm/btconnected )
	while read line; do
		mac=${line/ *}
		bluetoothctl info $mac | grep -q -m1 'Connected: yes' && mac= || break
	done <<< $lines
	grep -q configs-bt /etc/default/camilladsp && mv -f /etc/default/camilladsp{.backup,}
	[[ $mac ]] && disconnectRemove
	exit
fi

#-------------------------------------------------------------------------------------------
# from bluetooth.rules: 1. connect from paired device, 2. pair from sender
if [[ $udev && $action == connect ]]; then
	sleep 2
	macs=$( bluetoothctl devices | cut -d' ' -f2 )
	if [[ $macs ]]; then
		while read mac; do
			if bluetoothctl info $mac | grep -q -m1 'Connected: yes'; then
				grep -qs -m1 ^$mac $dirshm/btconnected && mac= || break
			fi
		done <<< $macs
	fi
	[[ $mac ]] && name=$( bluetoothctl info $mac | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	msg='Connect ...'
	# fix: rAudio triggered to connect by unpaired sender on boot
	controller=$( bluetoothctl show | head -1 | cut -d' ' -f2 )
	if [[ ! -e /var/lib/bluetooth/$controller/$mac ]]; then
		for i in {1..5}; do
			! bluetoothctl info $mac | grep -q -m1 'UUID:' && sleep 1 || break
		done
		bluetoothctl info $mac | grep -q -m1 'UUID: Audio Source' && msg='Pair ...' || exit
		
	fi
#-----
	notify "$type blink" "$name" "$msg"
	if (( $( bluetoothctl info $mac | grep -cE 'Paired: yes|Trusted: yes' ) == 2 )); then
		action=connect
	else
		sleep 2
		action=pair
		bluetoothctl agent NoInputNoOutput
	fi
fi
#-------------------------------------------------------------------------------------------
# 1. continue from [[ $udev && $action == connect ]], 2. from rAudio networks.js
if [[ $action == connect || $action == pair ]]; then
	bluetoothctl trust $mac # always trusr + pair to ensure proper connecting process
	bluetoothctl pair $mac
	name=$( bluetoothctl info $mac | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	if [[ $action == pair ]]; then
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q -m1 'Paired: no' && sleep 1 || break
		done
#-----X
		bluetoothctl info $mac | grep -q -m1 'Paired: no' && notify $type "$name" 'Pair failed.' && exit
		
		bluetoothctl disconnect $mac
#-----
		notify $type "$name" 'Paired successfully.'
		sleep 3
#-----
		notify "$type blink" "$name" 'Connect ...'
	fi
	bluetoothctl info $mac | grep -q -m1 'Connected: no' && bluetoothctl connect $mac
	for i in {1..5}; do
		! bluetoothctl info $mac | grep -q -m1 'UUID:' && sleep 1 || break
	done
	sink_source=$( bluetoothctl info $mac | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ ! $sink_source ]]; then
##### non-audio
		echo $mac bluetooth $name >> $dirshm/btconnected
#-----X
		refreshPages
		exit
	fi
	
	for i in {1..5}; do
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ ! $btmixer ]] && sleep 1 || break
	done
#-----X
	if [[ ! $btmixer && $action == connect ]]; then
		bluetoothctl disconnect $mac
		notify $type "$name" "Mixer not ready.<br><wh>Power off > on / Reconnect again</wh>" 15000
		exit
	fi
	
	[[ $sink_source == Source ]] && type=btsender
	echo $mac > $dirshm/$type
	if [[ $type == btreceiver ]]; then
		sed 's/ *-* A2DP$//' <<< $name > $dirshm/btname
		(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
		btmixer=$( cut -d"'" -f2 <<< $btmixer )
		echo $btmixer > $dirshm/btmixer
		$dirbash/cmd.sh playerstop
		$dirsettings/player-conf.sh
	fi
	echo $mac $type $name >> $dirshm/btconnected
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh $type
#-----
	refreshPages
#-------------------------------------------------------------------------------------------
# from rAudio networks.js - with mac
elif [[ $action == disconnect || $action == remove ]]; then
	bluetoothctl disconnect $mac &> /dev/null
	if [[ $action == disconnect ]]; then
		for i in {1..5}; do
			bluetoothctl info $mac | grep -q -m1 'Connected: yes' && sleep 1 || break
		done
	else
		bluetoothctl remove $mac &> /dev/null
		for i in {1..5}; do
			controller=$( bluetoothctl show | head -1 | cut -d' ' -f2 )
			[[ -e /var/lib/bluetooth/$controller/$mac ]] && sleep 1 || break
		done
	fi
	disconnectRemove
fi
