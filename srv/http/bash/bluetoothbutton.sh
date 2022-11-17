#!/bin/bash

sleep 3 # wait for eventX added to /dev/input/

mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
event=$( sed -n "/Phys=${mac,,}/,/Handlers=/ {/Handlers=/ {s/^.*=//; p}}" /proc/bus/input/devices | awk '{print $NF}' ) # /proc/... contains trailing space

evtest /dev/input/$event | while read line; do
	if [[ $line =~ .*EV_KEY.*KEY_NEXT.*1 ]]; then
		/srv/http/bash/cmd.sh mpcprevnext$'\n'next
	elif [[ $line =~ .*EV_KEY.*KEY_PREVIOUS.*1 ]]; then
		/srv/http/bash/cmd.sh mpcprevnext$'\n'prev
	elif [[ $line =~ .*EV_KEY.*KEY_STOP.*1 ]]; then
		/srv/http/bash/cmd.sh mpcplayback$'\n'stop
	elif [[ $line =~ .*EV_KEY.*KEY_PLAY.*1 || $line =~ .*EV_KEY.*KEY_PAUSE.*1 ]]; then
		/srv/http/bash/cmd.sh mpcplayback
	fi
done
