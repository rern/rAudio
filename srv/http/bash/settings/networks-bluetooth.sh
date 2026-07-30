#!/bin/bash

# Pair: trust > pair > get sink_source > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get sink_source
# Disconnect / Remove: disconnect
file_flag=/dev/shm/bluetooth_rules
trap "rm -f $file_flag" EXIT

[[ -e $file_flag || -e /dev/shm/btonoff ]] && exit # debounce bluetooth.rules
# ------------------------------------------------------------------------------
touch $file_flag
( sleep 5; rm -f $file_flag ) &

. /srv/http/bash/common.sh

btAction() {
	bluetoothctl $1 $MAC
}
btConnected() {
	bluetoothctl devices Connected | sort
}
btInfo() {
	local regex
	regex=$1:
	[[ ${1:0:1} != U ]] && regex+=' yes'
	btAction info | grep -q -m1 "$regex" && return 0
}
btMixer() {
	[[ $ACTION == disconnect || $ACTION == forget ]] && rm -f $dirshm/{btmixer,btname} && return
#...............................................................................
	for i in {1..5}; do
		sleep 1
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
		[[ $btmixer ]] && break
	done
	if [[ ! $btmixer ]]; then
		btAction disconnect
		notify $type "$name" "Mixer not ready.<br><wh>Power off > on / Reconnect again</wh>" 15000
		exit
# ------------------------------------------------------------------------------
	fi
	(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
	cut -d"'" -f2 <<< $btmixer > $dirshm/btmixer
	echo $name > $dirshm/btname
}
btName_Type() {
	name=$( btAction info | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	sink_source=$( btAction info | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ $sink_source ]]; then
		[[ $sink_source == Sink ]] && type=btreceiver || type=btsender
	else
		type=bluetooth
	fi
}
refreshPages() {
	pushRefresh networks
	pushRefresh system
	btConnected > $dirshm/Connected
	[[ ! -e $dirsystem/camilladsp ]] && return
#...............................................................................
	[[ $ACTION == connect || $ACTION == pair ]] && $dirsettings/camilla-bluetooth.sh $type $MAC && return
#...............................................................................
	file_default=/etc/default/camilladsp
	getVar CONFIG $file_default > $dircamilladsp/$MAC
	file_config=$( < $dircamilladsp/file_config )
	sed -i "s|^CONFIG.*|CONFIG=$file_config|" $file_default
}

args2var "$1"

if [[ $CMD != cmd ]]; then # from bluetooth.rules: paired device
	[[ $1 == add ]] && ACTION=connect || ACTION=disconnect
	Paired=$( bluetoothctl devices Paired )
	if (( $( wc -l <<< $Paired ) == 1 )); then
		MAC=$( cut -d' ' -f2 <<< $Paired )
		btName_Type
		notify "$type blink" "$name" "${ACTION^} ..."
	else
		notify 'bluetooth blink' Bluetooth "${ACTION^} ..."
		prev=$( cat $dirshm/Connected 2> /dev/null )
		for i in {1..5}; do
			sleep 1
			Connected=$( btConnected )
			d=$( diff <( echo "$prev" ) <( echo "$Connected" ) | grep -E '^[<>]' )
			[[ $d ]] && break
		done
		if [[ $d ]]; then
			MAC=$( cut -d' ' -f3 <<< $d ) # < Device 41:42:56:12:21:71 NAME
			btName_Type
		fi
	fi
	notify $type "$name" "${ACTION^}ed."
	btMixer
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	btName_Type
	if ! btInfo Paired; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notify "$type blink" "$name" 'Pair ...'
		btAction pair
		for i in {1..5}; do
			sleep 1
			btInfo Paired && paired=1 && break
		done
		[[ ! $paired ]] && notify $type "$name" 'Pair failed.' && exit
# ------------------------------------------------------------------------------
	fi
	! btInfo Trusted && btAction trust
	notify "$type blink" "$name" 'Connect ...'
	btAction connect
	for i in {1..5}; do
		sleep 1
		btInfo Connected && connected=1 && break
	done
	[[ ! $connected ]] && notify $type "$name" 'Connect failed.' && exit
# ------------------------------------------------------------------------------
	notify $type "$name" Connected.
	[[ $type == bluetooth ]] && refreshPages && exit # non-audio
# ------------------------------------------------------------------------------
	btMixer
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	btName_Type
	notify "$type blink" "$name" "${ACTION^} ..."
	btAction disconnect &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			! btInfo Connected && break
		done
		notify $type "$name" Disconnected.
	else
		btAction remove &> /dev/null
		for i in {1..5}; do
			sleep 1
			! bluetoothctl devices | grep -q $MAC && break
		done
		notify $type "$name" Forgotten.
	fi
	btMixer
fi
$dirbash/cmd.sh playerstop
$dirsettings/player-conf.sh
refreshPages
[[ $ACTION == disconnect || $ACTION == forget ]] && exit
# ------------------------------------------------------------------------------
grep -qs bluetooth=true $dirsystem/autoplay.conf && mpcPlayback play
