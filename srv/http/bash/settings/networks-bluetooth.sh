#!/bin/bash

# Pair: trust > pair > get sink_source > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get sink_source
# Disconnect / Remove: disconnect

[[ -e /dev/shm/bluetooth_rules ]] && exit # debounce bluetooth.rules
# --------------------------------------------------------------------
. /srv/http/bash/common.sh

touch $dirshm/bluetooth_rules
( sleep 5; rm -f $dirshm/bluetooth_rules ) &

args2var "$1"

if [[ $CMD != cmd ]]; then
	udev=1
	ACTION=$1
fi
type=btreceiver

disconnectRemove() {
	line=$( grep ^$MAC $dirshm/btconnected )
	type=$( cut -d' ' -f2 <<< $line )
	name=$( cut -d' ' -f3- <<< $line )
	sed -i "/^$MAC/ d" $dirshm/btconnected
	[[ ! $( awk NF $dirshm/btconnected ) ]] && rm $dirshm/btconnected
	rm -f $dirshm/$type
	[[ $type == btreceiver ]] && rm -f $dirshm/{btmixer,btname}
	filedefault=/etc/default/camilladsp
	getVar CONFIG $filedefault > $dircamilladsp/$MAC
	fileconfig=$( < $dircamilladsp/fileconfig )
	sed -i "s|^CONFIG.*|CONFIG=$fileconfig|" $filedefault
	notify "$type blink" "$name" "${ACTION^} ..."
	$dirbash/cmd.sh playerstop
	$dirsettings/player-conf.sh
	refreshPages
}
refreshPages() {
	pushRefresh features
	sleep 1
	pushRefresh networks
	[[ $dirsystem/camilladsp ]] && pushRefresh camilla
}
########################################################################################################
# from bluetooth.rules: disconnect from paired device - no MAC
if [[ $udev && $ACTION == disconnect ]]; then
	sleep 2
	lines=$( < $dirshm/btconnected )
	while read line; do
		MAC=${line/ *}
		bluetoothctl info $MAC | grep -q -m1 'Connected: yes' && MAC= || break
	done <<< $lines
	[[ $MAC ]] && disconnectRemove
	exit
# --------------------------------------------------------------------
fi
########################################################################################################
# from bluetooth.rules: 1. connect from paired device, 2. pair from sender
if [[ $udev && $ACTION == connect ]]; then
	sleep 2
	lines=$( bluetoothctl devices | cut -d' ' -f2 )
	if [[ $lines ]]; then
		while read MAC; do
			if bluetoothctl info $MAC | grep -q -m1 'Connected: yes'; then
				grep -qs -m1 ^$MAC $dirshm/btconnected && MAC= || break
			fi
		done <<< $lines
	fi
	[[ $MAC ]] && name=$( bluetoothctl info $MAC | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	msg='Connect ...'
	# fix: rAudio triggered to connect by unpaired sender on boot
	controller=$( bluetoothctl show | head -1 | cut -d' ' -f2 )
	if [[ ! -e /var/lib/bluetooth/$controller/$MAC ]]; then
		for i in {1..5}; do
			! bluetoothctl info $MAC | grep -q -m1 'UUID:' && sleep 1 || break
		done
		bluetoothctl info $MAC | grep -q -m1 'UUID: Audio Source' && msg='Pair ...' || exit
# --------------------------------------------------------------------
	fi
#-----
	notify "$type blink" "$name" "$msg"
	if (( $( bluetoothctl info $MAC | grep -cE 'Paired: yes|Trusted: yes' ) == 2 )); then
		ACTION=connect
	else
		sleep 2
		ACTION=pair
		bluetoothctl agent NoInputNoOutput
	fi
fi
########################################################################################################
# 1. continue from [[ $udev && $ACTION == connect ]], 2. from rAudio networks.js
if [[ $ACTION == connect || $ACTION == pair ]]; then
	bluetoothctl trust $MAC # always trusr + pair to ensure proper connecting process
	bluetoothctl pair $MAC
	name=$( bluetoothctl info $MAC | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	if [[ $ACTION == pair ]]; then
		for i in {1..5}; do
			bluetoothctl info $MAC | grep -q -m1 'Paired: no' && sleep 1 || break
		done
		bluetoothctl info $MAC | grep -q -m1 'Paired: no' && notify $type "$name" 'Pair failed.' && exit
# --------------------------------------------------------------------
		bluetoothctl disconnect $MAC
#-----
		notify $type "$name" 'Paired successfully.'
		sleep 3
#-----
		notify "$type blink" "$name" 'Connect ...'
	fi
	bluetoothctl info $MAC | grep -q -m1 'Connected: no' && bluetoothctl connect $MAC
	for i in {1..5}; do
		! bluetoothctl info $MAC | grep -q -m1 'UUID:' && sleep 1 || break
	done
	sink_source=$( bluetoothctl info $MAC | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ ! $sink_source ]]; then
##### non-audio
		echo $MAC bluetooth $name >> $dirshm/btconnected
		refreshPages
		exit
# --------------------------------------------------------------------
	fi
	for i in {1..5}; do
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ ! $btmixer ]] && sleep 1 || break
	done
	if [[ ! $btmixer && $ACTION == connect ]]; then
		bluetoothctl disconnect $MAC
		notify $type "$name" "Mixer not ready.<br><wh>Power off > on / Reconnect again</wh>" 15000
		exit
# --------------------------------------------------------------------
	fi
	[[ $sink_source == Source ]] && type=btsender
	echo $MAC > $dirshm/$type
	if [[ $type == btreceiver ]]; then
		sed 's/ *-* A2DP$//' <<< $name > $dirshm/btname
		(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
		btmixer=$( cut -d"'" -f2 <<< $btmixer )
		echo $btmixer > $dirshm/btmixer
		$dirbash/cmd.sh playerstop
		$dirsettings/player-conf.sh
		grep -qs bluetooth=true $dirsystem/autoplay.conf && mpcPlayback play
	fi
	echo $MAC $type $name >> $dirshm/btconnected
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh $type
#-----
	refreshPages
########################################################################################################
# from rAudio networks.js - with MAC
elif [[ $ACTION == disconnect || $ACTION == remove ]]; then
	bluetoothctl disconnect $MAC &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			bluetoothctl info $MAC | grep -q -m1 'Connected: yes' && sleep 1 || break
		done
	else
		bluetoothctl remove $MAC &> /dev/null
		for i in {1..5}; do
			controller=$( bluetoothctl show | head -1 | cut -d' ' -f2 )
			[[ -e /var/lib/bluetooth/$controller/$MAC ]] && sleep 1 || break
		done
	fi
	disconnectRemove
fi
