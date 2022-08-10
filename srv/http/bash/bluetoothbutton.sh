#!/bin/bash

sleep 3 # wait for eventX added to /dev/input/
dirbash=/srv/http/bash

mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
event=$( sed -n "/Phys=${mac,,}/,/Handlers=/ p" /proc/bus/input/devices \
			| tail -1 \
			| awk '{print $NF}' )

evtest /dev/input/$event | while read line; do
	if [[ $line =~ .*EV_KEY.*KEY_NEXT.*1 ]]; then
		$dirbash/cmd.sh mpcprevnext$'\n'next
	elif [[ $line =~ .*EV_KEY.*KEY_PREVIOUS.*1 ]]; then
		$dirbash/cmd.sh mpcprevnext$'\n'prev
	elif [[ $line =~ .*EV_KEY.*KEY_STOP.*1 ]]; then
		$dirbash/cmd.sh mpcplayback$'\n'stop
	elif [[ $line =~ .*EV_KEY.*KEY_PLAY.*1 || $line =~ .*EV_KEY.*KEY_PAUSE.*1 ]]; then
		$dirbash/cmd.sh mpcplayback
	fi
done
