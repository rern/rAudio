#!/bin/bash

sleep 3 # wait for eventX added to /dev/input/

mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
event=$( sed -n "/Phys=${mac,,}/,/Handlers=/ {/Handlers=/ {s/^.*=//; p}}" /proc/bus/input/devices | awk '{print $NF}' ) # /proc/... contains trailing space
mixer=$( < /srv/http/data/shm/btreceiver )

playback() {
	[[ $1 == prev || $1 == next ]] && cmd=mpcprevnext || cmd=mpcplayback
	/srv/http/bash/cmd.sh "$cmd
$1"
}
volume() {
	/srv/http/bash/cmd.sh "volumeupdown
$1

$mixer"
}

evtest /dev/input/$event | while read line; do
	if   [[ $line =~ .*KEY_PLAY.*1 ]]; then
		playback
	elif [[ $line =~ .*KEY_STOP.*1 ]]; then
		playback stop
	elif [[ $line =~ .*KEY_PAUSE.*1 ]]; then
		playback pause
	elif [[ $line =~ .*KEY_NEXT.*1 ]]; then
		playback next
	elif [[ $line =~ .*KEY_PREVIOUS.*1 ]]; then
		playback prev
	elif [[ $line =~ .*KEY_VOLUMEUP.*1 ]]; then
		volume +
	elif [[ $line =~ .*KEY_VOLUMEDOWN.*1 ]]; then
		volume -
	fi
done
