#!/bin/bash

# bluetooth.servicc      - bluez
# bluealsa.service       - alsa (sink and source)

# bluealsa-aplay.service - source stream
# bluealsa-dbus.service  - source state/track change (dbus bluetoothdest)

# camilladsp
#	sink   - bluealsa.service (no changes)
#	source - dbus stream (without bluealsa-aplay) + bluealsa-dbus
[[ -e /dev/shm/btdisconnect ]] && exit

. /srv/http/bash/common.sh

playerStop

ALIAS_TYPE() {
	ALIAS=$( bluetoothProperty Alias )
	TYPE=$( bluetoothSinkSource )
	
	rm -f $dirshm/{btmixer,btsource,bluetoothdest,bluetoothplay}
	pcms=$( bluealsa-cli list-pcms | grep -v ${MAC//:/_} )
	[[ ! $pcms ]] && return
#...............................................................................
	touch $dirshm/btdisconnect
	while read mac; do # disconnect others
		bluetoothctl disconnect ${mac//_/:}
	done < <( sed -E 's|.*/dev_([^/]*).*|\1|' <<< $pcms )
	( sleep 5 && rm -f $dirshm/btdisconnect ) &
}
bt.action() {
	bluetoothctl $1 $MAC &> /dev/null
}
bt.connect() {
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
	[[ ! $RETRIED ]] && notify.action || bt.pcm
}
bt.connected() {
	bluetoothctl devices Connected | sort
}
bt.pcm() {
	for i in {1..3}; do
		sleep 1
		pcm=$( bluealsa-cli list-pcms | grep ${MAC//:/_} )
		[[ $pcm ]] && break
	done
	if [[ ! $pcm ]]; then
		if [[ ! $RETRIED ]]; then # some not ready on 1st connect
			RETRIED=1
			CONNECTED=
			notify "$TYPE blink" "$ALIAS" 'Retry ...' -1
			bt.action disconnect
			bt.connect
		else
			notify.failed 'Mixer not available.' && exit
# ------------------------------------------------------------------------------
		fi
	fi
}
notify.action() {
	notify "$TYPE blink" "$ALIAS" "${ACTION^} ..." -1
}
notify.failed() {
	notify $TYPE "$ALIAS" "<i class='i-warning yl'></i> Failed: $1" 6000
}
notify.state() {
	notify $TYPE "$ALIAS" "$1"
}

args2var "$1"

ALIAS=Bluetooth
TYPE=bluetooth

if [[ $CMD != cmd ]]; then # (paired device) from bluetooth.rules - no connect/disconnect run, only notify > setup
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
			notify.action
		else
			notify.state Disconnected
		fi
	fi
elif [[ $ACTION == connect || $ACTION == pair ]]; then
	systemctl start bluealsa-dbus
	ALIAS_TYPE
	if [[ $ACTION == pair ]]; then
		bluetoothctl agent NoInputNoOutput # force no credential
		notify.action
		bt.action pair
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Paired ) == true ]] && PAIRED=1 && break
		done
		[[ ! $PAIRED ]] && notify.failed Pair && exit
# ------------------------------------------------------------------------------
		bt.action trust
	fi
	notify.action
	bt.connect
elif [[ $ACTION == disconnect || $ACTION == forget ]]; then
	ALIAS_TYPE
	notify.action
	bt.action disconnect
	if [[ $ACTION == disconnect ]]; then
		for i in {1..5}; do
			sleep 1
			[[ $( bluetoothProperty Connected ) == false ]] && break
		done
		notify.state Disconnected
	else
		bt.action remove
		for i in {1..5}; do
			sleep 1
			! bluetoothctl devices | grep -q $MAC && break
		done
		notify.state Forgotten
	fi
fi

if [[ $ACTION == connect ]]; then
	bt.pcm
	if [[ $TYPE == btsink ]]; then
		echo "$ALIAS A2DP" > $dirshm/btmixer
		systemctl stop bluealsa-aplay bluealsa-dbus
	else
		touch $dirshm/btsource
		systemctl start bluealsa-aplay bluealsa-dbus
		echo -e 'menu player\nlist' | bluetoothctl | awk '/^Player/ {print $2}' > $dirshm/bluetoothdest
	fi
fi

$dirsettings/player-conf.sh

bt.connected > $dirshm/Connected
if [[ $CONNECTED ]]; then
	notify.state Ready
	grep -q -m1 bluetooth=true $dirsystem/autoplay.conf && playback play
fi
pushRefresh networks system
