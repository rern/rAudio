#!/bin/bash

. /srv/http/bash/common.sh

control=$( < $dirshm/btmixer )
mac=$( bluetoothctl show \
		| head -1 \
		| cut -d' ' -f2 )
mac=${mac,,}
for i in {0..5}; do
	grep -q $mac /proc/bus/input/devices && break || sleep 1
done
event=$( sed -n "/$mac/,/^H:/ {/^H:/ p}" /proc/bus/input/devices | awk '{print $NF}' )

# line='Event: time nnnnnnnnnn.nnnnnn, type 1 (EV_KEY), code NNN (KEY_XXXXXX), value N'
evtest /dev/input/$event | while read line; do
	! grep -q 1$ <<< $line && continue # 1st of multiple 'value N'
	
	! grep -Eq 'KEY_.*CD|KEY_.*SONG' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG
	
	key=$( sed -E 's/.*KEY_|\).*//g; s/CD|SONG//; s/.*/\L&/' <<< $line )
	case $key in
		next | prev )
			. <( mpc status 'current=%songpos%; length=%length% random=%random%' )
			if [[ $key == next ]]; then
				(( $current == $length )) && pos=1 || pos=$(( current + 1 ))
			else
				(( $current == 1 )) && pos=$length || pos=$(( current - 1 ))
			fi
			$dirbash/cmd.sh mpcskip$'\n'$pos$'\nCMD POS'
			;;
		play | pause ) $dirbash/cmd.sh mpcplayback;;
		stop )         $dirbash/cmd.sh mpcplayback$'\n'stop$'\nCMD ACTION';;
	esac
done
