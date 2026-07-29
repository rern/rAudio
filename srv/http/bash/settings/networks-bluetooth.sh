#!/bin/bash

# Pair: trust > pair > get sink_source > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get sink_source
# Disconnect / Remove: disconnect

[[ -e /dev/shm/bluetooth_rules || -e $dirshm/btonoff ]] && exit # debounce bluetooth.rules
# --------------------------------------------------------------------

btInfo() {
	local regex
	regex=$1:
	[[ ${1:0:1} != U ]] && regex+=' yes'
	bluetoothctl info $MAC | grep -q -m1 "$regex" && return 0
}

. /srv/http/bash/common.sh

touch $dirshm/bluetooth_rules
( sleep 5; rm -f $dirshm/bluetooth_rules ) &

args2var "$1"

[[ $CMD != cmd ]] && ACTION=$1
type=btreceiver

disconnectRemove() {
	local file_config file_default line type name
	line=$( grep ^$MAC $dirshm/btconnected )
	type=$( cut -d' ' -f2 <<< $line )
	name=$( cut -d' ' -f3- <<< $line )
	sed -i "/^$MAC/ d" $dirshm/btconnected
	[[ ! $( awk NF $dirshm/btconnected ) ]] && rm $dirshm/btconnected
	rm -f $dirshm/$type
	[[ $type == btreceiver ]] && rm -f $dirshm/{btmixer,btname}
	file_default=/etc/default/camilladsp
	getVar CONFIG $file_default > $dircamilladsp/$MAC
	file_config=$( < $dircamilladsp/file_config )
	sed -i "s|^CONFIG.*|CONFIG=$file_config|" $file_default
	notify "$type blink" "$name" "${ACTION^} ..."
	$dirbash/cmd.sh playerstop
	$dirsettings/player-conf.sh
	refreshPages
}
refreshPages() {
	sleep 2
	pushRefresh networks
	[[ $dirsystem/camilladsp ]] && pushRefresh camilla
	pushRefresh system
}
########################################################################################################
# from bluetooth.rules: disconnect from paired device
if [[ $ACTION == remove ]]; then
	sleep 2
	while read MAC; do
		btInfo Connected && MAC= || break
	done < $dirshm/btconnected
	[[ $MAC ]] && ACTION=disconnect && disconnectRemove
	exit
# --------------------------------------------------------------------
fi
########################################################################################################
# from bluetooth.rules: 1. connect from paired device, 2. pair from sender
if [[ $ACTION == add ]]; then
	sleep 2
	while read MAC; do
		if btInfo Connected; then
			grep -qs -m1 ^$MAC $dirshm/btconnected && MAC= || break
		fi
	done < <( bluetoothctl devices | cut -d' ' -f2 )
	btInfo Paired && ACTION=connect || ACTION=pair
fi
########################################################################################################
# 1. continue from [[ $ACTION == add ]], 2. from rAudio networks.js
if [[ $ACTION == connect || $ACTION == pair ]]; then
	name=$( bluetoothctl info $MAC | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	if ! btInfo Paired || ! btInfo Trusted; then
		bluetoothctl agent NoInputNoOutput # no device to input credential
		if ! btInfo Paired; then
			bluetoothctl pair $MAC
			for i in {1..5}; do
				btInfo Paired && paired=1 && break
				
				sleep 1
			done
			[[ ! $paired ]] && notify $type "$name" 'Pair failed.' && exit
# --------------------------------------------------------------------
			notify $type "$name" 'Paired successfully.'
		fi
		if ! btInfo Trusted; then
			bluetoothctl trust $MAC
			for i in {1..5}; do
				btInfo Trusted && break || sleep 1
			done
		fi
		notify "$type blink" "$name" 'Connect ...'
		bluetoothctl connect $MAC
	else # Paired and Trusted - auto reconnect
		notify "$type blink" "$name" 'Connect ...'
	fi
	for i in {1..5}; do
		btInfo UUID && connected=1 && break
		
		sleep 1
	done
	[[ ! $connected ]] && notify $type "$name" 'Connect failed.' && exit
# --------------------------------------------------------------------
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
	appendSortUnique $dirshm/btconnected $MAC $type $name
	[[ -e $dirsystem/camilladsp ]] && $dirsettings/camilla-bluetooth.sh $type
#-----
	refreshPages
########################################################################################################
# from rAudio networks.js - with MAC
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	bluetoothctl disconnect $MAC &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			btInfo Connected && sleep 1 || break
		done
	else
		bluetoothctl untrust $MAC &> /dev/null
		bluetoothctl remove $MAC &> /dev/null
		for i in {1..5}; do
			controller=$( bluetoothctl show | head -1 | cut -d' ' -f2 )
			[[ -e /var/lib/bluetooth/$controller/$MAC ]] && sleep 1 || break
		done
	fi
	disconnectRemove
fi
