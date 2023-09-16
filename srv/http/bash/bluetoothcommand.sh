#!/bin/bash

# Pair: trust > pair > get device type > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get device type
# Disconnect / Remove: disconnect

[[ -e /srv/http/data/shm/btflag ]] && exit # flag - suppress bluetooth.rules fires 2nd "connect" after paired / connect

. /srv/http/bash/common.sh

action=$1
mac=$2
[[ ! $mac ]] && udev=1
icon=bluetooth

disconnectRemove() {
	[[ ! $name ]] && name=$( bluetoothctl info $mac | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $type ]] && type=$( bluetoothctl info $mac | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	sed -i "/^$mac/ d" $dirshm/btconnected
	[[ ! $( awk NF $dirshm/btconnected ) ]] && rm $dirshm/btconnected
	$dirbash/cmd.sh playerstop
	if [[ $type == Source ]]; then
		icon=btsender
	elif [[ $type == Sink ]]; then
		rm $dirshm/btreceiver
		notify "$icon blink" "$name" "${action^} ..."
		pushstream btreceiver 1
		$dirsettings/player-conf.sh
	fi
	refreshPages
}
refreshPages() {
	$dirsettings/features-data.sh pushrefresh
	[[ $dirsystem/camilladsp ]] && $dirsettings/camilla-data.sh pushrefresh
	sleep 1
	$dirsettings/networks-data.sh pushbt
}
#-------------------------------------------------------------------------------------------
# from bluetooth.rules: disconnect from paired device
if [[ $udev && $action == disconnect ]]; then
	sleep 2
	readarray -t lines < $dirshm/btconnected
	for line in "${lines[@]}"; do
		mac=${line/ *}
		bluetoothctl info $mac | grep -q -m1 'Connected: yes' && mac= || break
	done
	grep -q configs-bt /etc/default/camilladsp && mv -f /etc/default/camilladsp{.backup,}
	if [[ $mac ]]; then
		type=$( cut -d' ' -f2 <<< $line )
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
		for mac in ${macs[@]}; do
			if bluetoothctl info $mac | grep -q -m1 'Connected: yes'; then
				grep -q -m1 $mac $dirshm/btconnected &> /dev/null && mac= || break
			fi
		done
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
	notify "$icon blink" "$name" "$msg"
	if (( $( bluetoothctl info $mac | grep -cE 'Paired: yes|Trusted: yes' ) == 2 )); then
		action=connect
	else
		sleep 2
		action=pair
		bluetoothctl agent NoInputNoOutput
	fi
fi
# flag - suppress bluetooth.rules fires 2nd "connect" after paired / connect
touch $dirshm/btflag
( sleep 5; rm $dirshm/btflag ) &> /dev/null &
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
		bluetoothctl info $mac | grep -q -m1 'Paired: no' && notify $icon "$name" 'Pair failed.' && exit
		
		bluetoothctl disconnect $mac
#-----
		notify $icon "$name" 'Paired successfully.'
		sleep 3
#-----
		notify "$icon blink" "$name" 'Connect ...'
	fi
	bluetoothctl info $mac | grep -q -m1 'Connected: no' && bluetoothctl connect $mac
	for i in {1..5}; do
		! bluetoothctl info $mac | grep -q -m1 'UUID:' && sleep 1 || break
	done
	type=$( bluetoothctl info $mac | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ ! $type ]]; then
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
		notify $icon "$name" "Mixer not ready.<br><wh>Power off > on / Reconnect again</wh>" 15000
		exit
		
	fi
	if [[ $type == Source ]]; then
##### sender
		icon=btsender
		[[ $mac && $name ]] && echo $mac Source $name >> $dirshm/btconnected
		[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh sender
	else
		(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
		btmixer=$( cut -d"'" -f2 <<< $btmixer )
##### receiver
		echo $btmixer > $dirshm/btreceiver
		[[ $mac && $name ]] && echo $mac Sink $name >> $dirshm/btconnected
		notify "$icon blink" "$name" 'Connect ...'
		pushstream btreceiver 1
		$dirbash/cmd.sh playerstop
		[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh receiver
		$dirsettings/player-conf.sh
	fi
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
