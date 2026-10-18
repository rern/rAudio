#!/bin/bash

. /srv/http/bash/common.sh

control=$( < $dirshm/btmixer )
mac=$( bluetoothctl show | sed -E -n '1 {s/.* (.*) .*/\L\1/; p}' )
for i in {0..3}; do
	grep -q $mac /proc/bus/input/devices && break || sleep 1
done
event=$( sed -E -n "/$mac/,/^H:/ {/^H:/ {s/.*(event[0-9]+).*/\1/; p}}" /proc/bus/input/devices )
[[ ! $event ]] && systemctl --no-block stop bluetooth-button && exit 0
#-------------------------------------------------------------------------------
# line='Event: time nnnnnnnnnn.nnnnnn, type 1 (EV_KEY), code NNN (KEY_XXXXXX), value N'
evtest /dev/input/$event | while read line; do
	! grep -q 1$ <<< $line && continue                     # 1st of multiple 'value N'
	
	! grep -Eq 'KEY_.*CD|KEY_.*SONG' <<< $line && continue # PLAYCD PAUSECD STOPCD NEXTSONG PREVIOUSSONG
	
	key=$( sed -E 's/.*KEY_|\).*//g; s/CD|SONG//' <<< $line )
	case $key in
		PLAY | PAUSE )
			playback
			;;
		STOP )
			playback stop
			;;
		NEXT | PREVIOUS )
			skip $key
			;;
	esac
done
