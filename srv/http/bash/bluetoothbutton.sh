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
	
	key=$( sed -E 's/.*KEY_|\).*//g; s/CD|SONG//' <<< $line )
	case $key in
		PLAY | PAUSE )
			mpcPlayback
			;;
		STOP )
			mpcPlayback stop
			;;
		NEXT | PREVIOUS )
			[[ $( < $dirshm/player ) != mpd ]] && continue
			
			read length songpos state< <( mpc status '%length% %songpos% %state%' )
			if [[ $key == NEXT ]]; then
				(( $pos == $length )) && pos=1 || pos=$(( songpos + 1 ))
			else
				(( $songpos == 1 )) && pos=$length || pos=$(( songpos - 1 ))
			fi
			[[ $state == stopped ]] && action=stop || action=play
			$dirbash/cmd.sh "mpcskip
$pos
$action
CMD POS ACTION"
			;;
	esac
done
