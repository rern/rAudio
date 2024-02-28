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
	sed -i "/^$mac/ d" $dirshm/btconnected
	[[ ! $( awk NF $dirshm/btconnected ) ]] && rm $dirshm/btconnected
	[[ ! $name ]] && name=$( bluetoothctl info $mac | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $sink_source ]] && sink_source=$( bluetoothctl info $mac | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ $sink_source == Source ]]; then
		type=btsender
		rm $dirshm/btsender
	else
		rm $dirshm/{btreceiver,btmixer}
	fi
	if [[ -e $dirsystem/camilladsp ]]; then
		getVar CONFIG /etc/default/camilladsp > "$dircamilladsp/$( < $dirshm/$type )"
		mv -f /etc/default/camilladsp{.backup,}
	fi
	notify "$type blink" "$name" "${action^} ..."
	$dirbash/cmd.sh playerstop
	$dirsettings/player-conf.sh
	refreshPages
}
refreshPages() {
	pushRefresh features
	[[ $dirsystem/camilladsp ]] && pushRefresh camilla
	sleep 1
	pushRefresh networks pushbt
}
#-------------------------------------------------------------------------------------------
# from bluetooth.rules: disconnect from paired device
if [[ $udev && $action == disconnect ]]; then
	sleep 2
	lines=$( < $dirshm/btconnected )
	while read line; do
		mac=${line/ *}
		bluetoothctl info $mac | grep -q -m1 'Connected: yes' && mac= || break
	done <<< $lines
	grep -q configs-bt /etc/default/camilladsp && mv -f /etc/default/camilladsp{.backup,}
	if [[ $mac ]]; then
		sink_source=$( cut -d' ' -f2 <<< $line )
		name=$( cut -d' ' -f3- <<< $line )
#-----
		disconnectRemove
	fi
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
				grep -q -m1 ^$mac $dirshm/btconnected &> /dev/null && mac= || break
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
		[[ $mac && $name ]] && echo $mac Device $name >> $dirshm/btconnected
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
	if [[ $sink_source == Source ]]; then
##### sender
		type=btsender
		echo $name > $dirshm/btsender
	else
		echo $name > $dirshm/btreceiver
		(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
		btmixer=$( cut -d"'" -f2 <<< $btmixer )
##### receiver
		echo $btmixer > $dirshm/btmixer
		notify "$type blink" "$name" 'Connect ...'
		$dirbash/cmd.sh playerstop
		$dirsettings/player-conf.sh
	fi
	[[ $mac && $name ]] && echo $mac $sink_source $name >> $dirshm/btconnected
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh $type
#-----
	msg=Ready
	refreshPages
#-------------------------------------------------------------------------------------------
# from rAudio networks.js
elif [[ $action == disconnect || $action == remove ]]; then
	name=$( bluetoothctl info $mac | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
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
