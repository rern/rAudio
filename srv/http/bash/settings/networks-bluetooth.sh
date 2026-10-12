#!/bin/bash

# bluetooth.servicc      - bluez
# bluealsa.service       - alsa (sink and source)

# bluealsa-aplay.service - source stream
# bluealsa-dbus.service  - source state/track change (dbus bluetoothdest)

# camilladsp
#	sink   - bluealsa.service (no changes)
#	source - dbus stream (without bluealsa-aplay) + bluealsa-dbus

. /srv/http/bash/common.sh

ALIAS_TYPE() {
	ALIAS=$( bluetoothProperty Alias )
	TYPE=$( bluetoothSinkSource )
}
bt.action() {
	bluetoothctl $1 $MAC
}
bt.connect() {
	bt.set
	bt.action connect
	for i in {1..5}; do
		sleep 1
		[[ $( bluetoothProperty Connected ) == true ]] && CONNECTED=1 && break
	done
	[[ ! $CONNECTED ]] && notify.state 'Connect failed' && exit
# ------------------------------------------------------------------------------
	if [[ $TYPE == bluetooth ]]; then # non-audio
		notify.state Ready
		pushRefresh networks
		exit
# ------------------------------------------------------------------------------
	fi
	[[ $RETRIED ]] && bt.ready || notify.state Connected
}
bt.connected() {
	bluetoothctl devices Connected | sort
}
bt.ready() {
	[[ $ACTION != connect ]] && return
#...............................................................................
	for i in {1..3}; do
		sleep 1
		pcms=$( bluealsa-cli list-pcms )
		[[ $pcms ]] && break
	done
	if [[ ! $pcms ]]; then
		if [[ ! $RETRIED ]]; then # some not ready on 1st connect
			notify "$TYPE blink" "$ALIAS" 'Retry ...' -1
			RETRIED=1
			CONNECTED=
			bt.action disconnect
			bt.connect
		else
			notify.state 'Failed: Mixer not available.'
			exit
# ------------------------------------------------------------------------------
		fi
	fi
}
bt.set() {
	rm -f $dirshm/{btmixer,btsource,bluetoothplay}
	if [[ $TYPE == btsink ]]; then
		echo "$ALIAS A2DP" > $dirshm/btmixer
		systemctl stop bluealsa-aplay bluealsa-dbus
	else
		touch $dirshm/btsource
		systemctl start bluealsa-aplay
	fi
}
notify.action() {
	notify "$TYPE blink" "$ALIAS" "${ACTION^} ..." -1
}
notify.state() {
	notify $TYPE "$ALIAS" "$1"
}

args2var "$1"

ALIAS=Bluetooth
TYPE=bluetooth

if [[ $CMD != cmd ]]; then # (paired device) from bluetooth.rules
	# - no connect/disconnect run, only notify > setup
	systemctl start bluealsa-dbus # must be started on source connect to get bluetoothdest (stop later if not source)
	ACTION=$1 # for notify only
	notify.action
	prev=$( cat $dirshm/Connected 2> /dev/null )
	for i in {1..5}; do
		sleep 1
		Connected=$( bt.connected )
		d=$( diff <( echo "$prev" ) <( echo "$Connected" ) | grep -E '^[<>]' )
		[[ $d ]] && break
	done
	if [[ $d ]]; then
		MAC=$( cut -d' ' -f3 <<< $d ) # < Device 41:42:56:12:21:71 NAME
		ALIAS_TYPE
		if [[ $ACTION == connect ]]; then
			CONNECTED=1
			bt.action trust
			bt.set
		fi
	fi
	notify.state "${ACTION^}ed"
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	ALIAS_TYPE
	if [[ $ACTION == pair ]]; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notify.action
		bt.action pair
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Paired ) == true ]] && PAIRED=1 && break
		done
		[[ ! $PAIRED ]] && notify.state 'Failed: Pair' && exit
# ------------------------------------------------------------------------------
		bt.action trust
	fi
	notify.action
	bt.connect
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	ALIAS_TYPE
	notify.action
	bt.action disconnect &> /dev/null
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Connected ) == false ]] && break
		done
		notify.state Disconnected
	else
		bt.action remove &> /dev/null
		for i in {1..5}; do
			sleep 1
			! bluetoothctl devices | grep -q $MAC && break
		done
		notify.state Forgotten
	fi
fi

bt.ready
[[ $ACTION == disconnect || $ACTION == forget ]] && rm -f $dirshm/{btmixer,btsource,bluetoothplay}
playerStop

$dirsettings/player-conf.sh
[[ $CONNECTED ]] && notify.state Ready
bt.connected > $dirshm/Connected
if [[ $CONNECTED ]]; then
	grep -q -m1 bluetooth=true $dirsystem/autoplay.conf && playback play
fi
pushRefresh networks system
