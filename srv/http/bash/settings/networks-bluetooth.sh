#!/bin/bash

# bluetooth.servicc (Bluez)
# bluealsa.service
#
# sink   :
	# (nothing more)
# source :
	# bluez-dbus.service  - changes for push
	# bluealsa-aplay.service
		# normal  - dbus path Player ( busctl --list tree org.bluez | grep -E '/player[0-9]+$' )
		# camilla - dbus_path pcm    ( bluealsa-cli list-pcms )

[[ -e /dev/shm/bt ]] && exit
# ------------------------------------------------------------------------------
trap 'sleep 3; rm -f /dev/shm/bt' EXIT
touch /dev/shm/bt

. /srv/http/bash/common.sh

rm -f $dirshm/{btmixer,btmixer_source,btsource}
playerStop

ALIAS_TYPE() {
	ALIAS=$( bluetoothProperty Alias )
	TYPE=$( bluetoothSinkSource )
	[[ $ACTION != connect ]] && return
#...............................................................................
	connected=$( getContent $dirshm/Connected | grep -v $MAC )
	[[ ! $connected ]] && return
#...............................................................................
	while read mac; do # disconnect others
		type=$( bluetoothSinkSource $mac )
		if [[ $type != bluetooth ]]; then
			bluetoothctl disconnect $mac &> /dev/null
			sed -i "/$mac/ d" $dirshm/Connected
			notify $type "$( bluetoothProperty Alias $mac )" Disconnected
			sleep 3
		fi
	done < <( cut -d' ' -f2 <<< $connected )
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
			notify "$TYPE blink" "$ALIAS" 'Retry ...' 6000
			bt.action disconnect
			bt.connect
		else
			notify.failed 'BlueALSA mixer not found.' && exit
# ------------------------------------------------------------------------------
		fi
	fi
}
notify.action() {
	notify "$TYPE blink" "$ALIAS" "${ACTION^} ..." 6000
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
	prev=$( getContent $dirshm/Connected )
	for i in {1..5}; do
		sleep 1
	d=$( diff <( echo "$prev" ) <( bt.connected ) | grep -E '^[<>]' )
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
	DISCONNECT_FORGET=1
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
	mixer="$ALIAS A2DP"
	if [[ $TYPE == btsink ]]; then
		echo $mixer > $dirshm/btmixer
	else
		echo $mixer > $dirshm/btmixer_source
		echo bluetooth > $dirshm/player
		busctl --list tree org.bluez | grep -E '/player[0-9]+$' > $dirshm/btsource
		mixer.0dB
	fi
elif [[ $DISCONNECT_FORGET ]]; then
	volumeMpdRestore
fi

[[ ! -e $dirsystem/camilladsp ]] && bluealsaServices # camilla: run by camilla-conf.sh

bt.connected > $dirshm/Connected

$dirsettings/player-conf.sh

if [[ $CONNECTED ]]; then
	notify.state Ready
	grep -q -m1 bluetooth=true $dirsystem/autoplay.conf && playback play
fi
systemctl try-restart rotaryencoder
pushRefresh networks system
