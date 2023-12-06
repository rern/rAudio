#!/bin/bash

. /srv/http/bash/common.sh

sleep 3 # wait for eventX added to /dev/input/

control=$( < $dirshm/btreceiver )
mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
event=$( sed -n "/Phys=${mac,,}/,/Handlers=/ {/Handlers=/ {s/^.*=//; p}}" /proc/bus/input/devices | awk '{print $NF}' ) # /proc/... contains trailing space

# line='Event: time 1678155098.191722, type 1 (EV_KEY), code 200 (KEY_XXXXXX), value 1'
evtest /dev/input/$event | while read line; do
	! grep -Eq '^E.*(CD\)|SONG\)|VOLUME).*1$' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG VOLUMEUP VOLUMEDOWN
	
	key=$( sed -E 's/.*KEY_(.*)\).*/\1/; s/CD|IOUSSONG|SONG//' <<< $line )
	key=${key,,}
	case $key in
		next|prev )
			[[ $( mpc status %state% ) == playing ]] && state=play
			current=$( mpc status %songpos% )
			length=$( mpc status %length% )
			if [[ $( mpc status %random% ) == on ]]; then
				pos=$( shuf -n 1 <( seq $length | grep -v $current ) )
				[[ $( mpc status %consume% ) == on ]] && consume=CONSUME
			else
				if [[ $key == next ]]; then
					(( $current != $length )) && pos=$(( current + 1 )) || pos=1
				else
					(( $current != 1 )) && pos=$(( current - 1 )) || pos=$length
				fi
			fi
			$dirbash/cmd.sh "mpcprevnext
$state
$pos
$current
CMD STATE POS $consume"
			;;
		play|pause ) $dirbash/cmd.sh mpcplayback;;
		stop )       $dirbash/cmd.sh mpcplayback$'\n'stop$'\nCMD ACTION';;
		volumedown ) volumeUpDnBt 1%- "$control";;
		volumeup )   volumeUpDnBt 1%+ "$control";;
	esac
done
