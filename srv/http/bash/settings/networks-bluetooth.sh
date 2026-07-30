#!/bin/bash

# Pair: trust > pair > get sink_source > disconnect > delay > connect
#   (delay - connect right after paired > mixer not yet ready)
# Connect: trust > connect > get sink_source
# Disconnect / Remove: disconnect
file_flag=/dev/shm/bluetooth_rules
trap "rm -f $file_flag" EXIT

[[ -e $file_flag || -e /dev/shm/btonoff ]] && exit # debounce bluetooth.rules
# --------------------------------------------------------------------
touch $file_flag
( sleep 5; rm -f $file_flag ) &


. /srv/http/bash/common.sh

btInfo() {
	local regex
	regex=$1:
	[[ ${1:0:1} != U ]] && regex+=' yes'
	bluetoothctl info $MAC | grep -q -m1 "$regex" && return 0
}
btName_Type() {
	name=$( bluetoothctl info $MAC | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ ! $name ]] && name=Bluetooth
	sink_source=$( bluetoothctl info $MAC | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	if [[ $sink_source ]]; then
		[[ $sink_source == Sink ]] && type=btreceiver || type=btsender
	else
		type=bluetooth
	fi
}
refreshPages() {
	pushRefresh networks
	pushRefresh system
	[[ ! -e $dirsystem/camilladsp ]] && return
	
	[[ $ACTION == connect || $ACTION == pair ]] && $dirsettings/camilla-bluetooth.sh $type $MAC && return
	
	file_default=/etc/default/camilladsp
	getVar CONFIG $file_default > $dircamilladsp/$MAC
	file_config=$( < $dircamilladsp/file_config )
	sed -i "s|^CONFIG.*|CONFIG=$file_config|" $file_default
}
setMPD() {
	bluetoothctl devices Connected | sort > $dirshm/Connected
	[[ $type != btreceiver ]] && return
	
	echo $name > $dirshm/btname
	(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
	btmixer=$( cut -d"'" -f2 <<< $btmixer )
	echo $btmixer > $dirshm/btmixer
}
unsetMPD() {
	bluetoothctl devices Connected | sort > $dirshm/Connected
	[[ $type != btreceiver ]] && return
	
	rm -f $dirshm/{btmixer,btname}
}

args2var "$1"

if [[ $CMD != cmd ]]; then # from bluetooth.rules: paired device
	prev=$( cat $dirshm/Connected 2> /dev/null )
	[[ $1 == add ]] && ACTION=connect || ACTION=disconnect
	notify 'bluetooth blink' Bluetooth "${ACTION^} ..."
	for i in {1..5}; do
		sleep 1
		Connected=$( bluetoothctl devices Connected | sort )
		d=$( diff <( echo "$prev" ) <( echo "$Connected" ) | grep -E '^[<>]' ) # < Device 41:42:56:12:21:71 NAME
		[[ $d ]] && break
	done
	if [[ $d ]]; then
		MAC=$( cut -d' ' -f3 <<< $d )
		btName_Type
		[[ $1 == add ]] && setMPD || unsetMPD
	fi
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	btName_Type
	if ! btInfo Paired; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notify "$type blink" "$name" 'Pair ...'
		bluetoothctl pair $MAC
		for i in {1..5}; do
			sleep 1
			btInfo Paired && paired=1 && break
		done
		[[ ! $paired ]] && notify $type "$name" 'Pair failed.' && exit
# --------------------------------------------------------------------
	fi
	! btInfo Trusted && bluetoothctl trust $MAC
	notify "$type blink" "$name" 'Connect ...'
	bluetoothctl connect $MAC
	for i in {1..5}; do
		sleep 1
		btInfo Connected && connected=1 && break
	done
	[[ ! $connected ]] && notify $type "$name" 'Connect failed.' && exit
# --------------------------------------------------------------------
	[[ $type == bluetooth ]] && refreshPages && exit # non-audio
# --------------------------------------------------------------------
	for i in {1..5}; do
		sleep 1
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null | grep "$name" )
		[[ $btmixer ]] && break
	done
	if [[ ! $btmixer && $ACTION == connect ]]; then
		bluetoothctl disconnect $MAC
		notify $type "$name" "Mixer not ready.<br><wh>Power off > on / Reconnect again</wh>" 15000
		exit
# --------------------------------------------------------------------
	fi
	setMPD
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	btName_Type
	notify "$type blink" "$name" "${ACTION^} ..."
	bluetoothctl disconnect $MAC &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			! btInfo Connected && break
		done
		! btInfo Paired && bluetoothctl remove $MAC &> /dev/null
	else
		bluetoothctl remove $MAC &> /dev/null
		for i in {1..5}; do
			sleep 1
			! bluetoothctl devices | grep -q $MAC && break
		done
	fi
	unsetMPD
fi
$dirbash/cmd.sh playerstop
$dirsettings/player-conf.sh
refreshPages
[[ $ACTION == disconnect || $ACTION == forget ]] && exit
# --------------------------------------------------------------------
grep -qs bluetooth=true $dirsystem/autoplay.conf && mpcPlayback play 