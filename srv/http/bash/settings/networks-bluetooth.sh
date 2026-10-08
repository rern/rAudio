#!/bin/bash

. /srv/http/bash/common.sh

blueAlsaMixer() {
	[[ $ACTION != connect ]] && return
#...............................................................................
	for i in {1..3}; do
		sleep 1
		btmixer=$( amixer -D bluealsa scontrols 2> /dev/null )
		[[ $btmixer ]] && break
	done
	if [[ ! $btmixer ]]; then
		if [[ ! $retry ]]; then # some might be broken on 1st connect
			notify "$TYPE blink" "$NAME" 'Mixer ...'
			retry=1
			connected=
			touch $dirshm/btretry
			btAction disconnect
			btConnect
		else
			notifyState 'Failed: Mixer'
			exit
# ------------------------------------------------------------------------------
		fi
	fi
	if [[ $TYPE == btsink ]]; then
		(( $( grep -c . <<< $btmixer ) > 1 )) && btmixer=$( grep A2DP <<< $btmixer )
		cut -d"'" -f2 <<< $btmixer > $dirshm/btmixer
	else
		touch $dirshm/btsource
	fi
}
btAction() {
	bluetoothctl $1 $MAC
}
btConnect() {
	btAction connect
	for i in {1..5}; do
		sleep 1
		[[ $( bluetoothProperty Connected $MAC ) == true ]] && connected=1 && break
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
dbusDisconnect() {
	dbuspath=$( bluealsa-cli list-pcms )
	for path in $dbuspath; do
		busctl --system call org.bluez ${path%/*/*} org.bluez.Device1 Disconnect
	done
	rm -f $dirshm/{btmixer,btsource}
}
NAME_TYPE() {
	NAME=$( bluetoothProperty Alias $MAC )
	TYPE=$( bluetoothSinkSource $MAC )
}
notifyACTION() {
	notify "$TYPE blink" "$NAME" "${ACTION^} ..."
}
notifyState() {
	notify $TYPE "$NAME" "$1"
}

args2var "$1"

NAME=Bluetooth
TYPE=bluetooth

if [[ $CMD != cmd ]]; then # (paired device) from bluetooth.rules - no actions, notify > setup
	if [[ -e $dirshm/btretry || -e $dirshm/btonboard ]]; then
		[[ -e $dirshm/btretry && $1 == connect ]] && rm -f $dirshm/btretry
		exit
# ------------------------------------------------------------------------------
	fi
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
	[[ $ACTION == disconnect ]] && dbusDisconnect
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	NAME_TYPE
	if [[ $ACTION == pair ]]; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notifyACTION
		btAction pair
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Paired $MAC ) == true ]] && paired=1 && break
		done
		[[ ! $paired ]] && notifyState 'Failed: Pair' && exit
# ------------------------------------------------------------------------------
	fi
	btAction trust
	notifyACTION
	btConnect
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	NAME_TYPE
	notifyACTION
	btAction disconnect &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Connected $MAC ) == false ]] && break
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
	[[ -e $dirsystem/camilladsp ]] && getVar CONFIG /etc/default/camilladsp > $dircamilladsp/$MAC
	dbusDisconnect
fi
blueAlsaMixer
playerStop
$dirsettings/player-conf.sh
[[ $connected ]] && notifyState Ready
btConnected > $dirshm/Connected
if [[ $connected ]]; then
	grep -q -m1 bluetooth=true $dirsystem/autoplay.conf && playback play
fi
for page in camilla networks system; do
	pushRefresh $page
done
