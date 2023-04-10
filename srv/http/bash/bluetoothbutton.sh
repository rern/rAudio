#!/bin/bash

sleep 3 # wait for eventX added to /dev/input/

mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
event=$( sed -n "/Phys=${mac,,}/,/Handlers=/ {/Handlers=/ {s/^.*=//; p}}" /proc/bus/input/devices | awk '{print $NF}' ) # /proc/... contains trailing space
cmdsh=/srv/http/bash/cmd.sh
mixer=$( < /srv/http/data/shm/btreceiver )

# line='Event: time 1678155098.191722, type 1 (EV_KEY), code 200 (KEY_XXXXXX), value 1'
evtest /dev/input/$event | while read line; do
	! grep -Eq '^E.*(CD\)|SONG\)|VOLUME).*1$' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG VOLUMEUP VOLUMEDOWN
	
	key=$( sed -E 's/.*KEY_(.*)\).*/\1/; s/CD|IOUSSONG|SONG//' <<< $line )
	key=${key,,}
	case $key in
		play|pause ) $cmdsh mpcplayback;;
		stop )       $cmdsh mpcplayback$'\n'stop;;
		prev|next )  $cmdsh mpcprevnext$'\n'$key;;
		volumeup|volumedown ) 
			[[ $key == volumeup ]] && updn=+ || updn=-
			$cmdsh "volumeupdown
KEY updn card control
$updn

$mixer";;
	esac
done
