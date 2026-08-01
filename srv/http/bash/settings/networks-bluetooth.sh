#!/bin/bash

. /srv/http/bash/common.sh

blueAlsaMixer() {
	rm -f $dirshm/btmixer
	[[ $ACTION != connect ]] && return
#...............................................................................
	for i in {1..5}; do
		sleep 1
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
		if [[ $btmixer ]]; then
			(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
			cut -d"'" -f2 <<< $btmixer > $dirshm/btmixer
			return
#...............................................................................
		fi
	done
	# some might be broken on 1st connect
	if [[ ! $retry ]]; then
		notify "$TYPE blink" "$NAME" 'Mixer setup ...'
		retry=1
		connected=
		touch $dirshm/btsetup
		( sleep 15; rm -f $dirshm/btsetup ) &
		btAction disconnect
		btConnect
	else
		notifyState 'Failed: Mixer'
		exit
# ------------------------------------------------------------------------------
	fi
}
btAction() {
	bluetoothctl $1 $MAC
}
btConnect() {
	btAction connect
	for i in {1..5}; do
		sleep 1
		btInfo Connected && connected=1 && break
	done
	[[ ! $connected ]] && notifyState 'Connect failed' && exit
# ------------------------------------------------------------------------------
	if [[ $TYPE == bluetooth ]]; then # non-audio
		notifyState Ready
		pushRefresh networks
		exit
# ------------------------------------------------------------------------------
	fi
	[[ $retry ]] && blueAlsaMixer || notifyState Connected
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
NAME_TYPE() {
	alias=$( btAction info | sed -n '/^\s*Alias:/ {s/^\s*Alias: //; p}' )
	[[ $alias ]] && NAME=$alias
	sink_source=$( btAction info | sed -E -n '/UUID: Audio/ {s/\s*UUID: Audio (.*) .*/\1/; p}' | xargs )
	[[ ! $sink_source ]] && return
	
	[[ $sink_source == Sink ]] && TYPE=btreceiver || TYPE=btsender
}
notifyACTION() {
	notify "$TYPE blink" "$NAME" "${ACTION^} ..."
}
notifyState() {
	notify $TYPE "$NAME" "$1"
}
refreshPages() {
	pushRefresh networks
	pushRefresh system
	btConnected > $dirshm/Connected
	[[ ! -e $dirsystem/camilladsp ]] && return
#...............................................................................
	[[ $ACTION == connect || $ACTION == pair ]] && $dirsettings/camilla-bluetooth.sh $TYPE $MAC && return
#...............................................................................
	file_default=/etc/default/camilladsp
	getVar CONFIG $file_default > $dircamilladsp/$MAC
	file_config=$( < $dircamilladsp/file_config )
	sed -i "s|^CONFIG.*|CONFIG=$file_config|" $file_default
}

args2var "$1"

TYPE=bluetooth
NAME=Bluetooth

if [[ $CMD != cmd ]]; then # paired device from bluetooth.rules - no actions, notify > setup
	[[ -e $dirshm/btsetup ]] && exit # debounce / suppress onboard toggle
# ------------------------------------------------------------------------------
	ACTION=$1 # for notify only
	notifyACTION
	prev=$( cat $dirshm/Connected 2> /dev/null )
	for i in {1..5}; do
		sleep 1
		Connected=$( btConnected )
		d=$( diff <( echo "$prev" ) <( echo "$Connected" ) | grep -E '^[<>]' )
		[[ $d ]] && break
	done
	if [[ $d ]]; then
		[[ $ACTION == connect ]] && connected=1
		MAC=$( cut -d' ' -f3 <<< $d ) # < Device 41:42:56:12:21:71 NAME
		NAME_TYPE
	fi
	notifyState "${ACTION^}ed"
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	NAME_TYPE
	if [[ $ACTION == pair ]]; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notifyACTION
		btAction pair
		for i in {1..5}; do
			sleep 1
			btInfo Paired && paired=1 && break
		done
		[[ ! $paired ]] && notifyState 'Failed: Pair' && exit
# ------------------------------------------------------------------------------
	fi
	! btInfo Trusted && btAction trust
	notifyACTION
	btConnect
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	NAME_TYPE
	notifyACTION
	btAction disconnect &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			! btInfo Connected && break
		done
		notifyState Disconnected
	else
		btAction remove &> /dev/null
		for i in {1..5}; do
			sleep 1
			! bluetoothctl devices | grep -q $MAC && break
		done
		notifyState Forgotten
	fi
fi
blueAlsaMixer
$dirbash/cmd.sh playerstop
$dirsettings/player-conf.sh
[[ $connected ]] && notifyState Ready
refreshPages
[[ $connected ]] && grep -qs bluetooth=true $dirsystem/autoplay.conf && mpcPlayback play
