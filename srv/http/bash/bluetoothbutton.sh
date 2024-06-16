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

volumeUpDown() {
	volumeBlueAlsa $1 "$control"
	volumeGet push
}

# line='Event: time 1678155098.191722, type 1 (EV_KEY), code 200 (KEY_XXXXXX), value 1'
evtest /dev/input/$event | while read line; do
	! grep -Eq '^E.*(CD\)|SONG\)|VOLUME).*1$' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG VOLUMEUP VOLUMEDOWN
	
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
		# for dedicated buttons
		stop )         $dirbash/cmd.sh mpcplayback$'\n'stop$'\nCMD ACTION';;
		volumedown )   volumeUpDown 1%-;; # normally up/down bt device volume (no events)
		volumeup )     volumeUpDown 1%+;;
	esac
done
