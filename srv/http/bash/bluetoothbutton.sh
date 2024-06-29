#!/bin/bash

. /srv/http/bash/common.sh

control=$( < $dirshm/btmixer )
mac=$( bluetoothctl show | sed -E -n '1 {s/.* (.*) .*/\L\1/; p}' )
for i in {0..5}; do
	grep -q $mac /proc/bus/input/devices && break || sleep 1
done
event=$( sed -E -n "/$mac/,/^H:/ {/^H:/ {s/.* (.*) /\1/; p}}" /proc/bus/input/devices ) # event - with trailing space

# line='Event: time nnnnnnnnnn.nnnnnn, type 1 (EV_KEY), code NNN (KEY_XXXXXX), value N'
evtest /dev/input/$event | while read line; do
	! grep -q 1$ <<< $line && continue                     # 1st of multiple 'value N'
	
	! grep -Eq 'KEY_.*CD|KEY_.*SONG' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG
	
	key=$( sed -E 's/.*KEY_|\).*//g; s/CD|SONG//; s/.*/\L&/' <<< $line )
	case $key in
		play | pause )
			mpcPlayback
			;;
		stop )
			mpcPlayback stop
			;;
		next | previous )
			. <( mpc status 'current=%songpos%; length=%length% random=%random%' )
			if [[ $key == next ]]; then
				(( $current == $length )) && pos=1 || pos=$(( current + 1 ))
			else
				(( $current == 1 )) && pos=$length || pos=$(( current - 1 ))
			fi
			$dirbash/cmd.sh mpcskip$'\n'$pos$'\nCMD POS'
			;;
	esac
done
