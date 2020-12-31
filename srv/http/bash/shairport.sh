#!/bin/bash

statusLcdChar() {
	if [[ -n /srv/http/data/system/lcdchar ]]; then
		readarray -t data <<< "$( echo $1 | jq -r '.Artist, .Title, .Album, .elapsed, .Time, .state' )"
		/srv/http/bash/lcdchar.py "${data[@]}" &> /dev/null &
	fi
}

playerfile=/srv/http/data/shm/player

if (( $# > 0 )); then # stop
	mv $playerfile-{*,mpd}
	curl -s -X POST http://127.0.0.1/pub?id=notify -d '{"title":"AirPlay","text":"Stop ...","icon":"airplay blink","delay":-1}'
	status=$( /srv/http/bash/status.sh )
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"
	statusLcdChar "$status"
	
	systemctl stop shairport-meta
	systemctl restart shairport-sync
else
	mv $playerfile-{*,airplay}
	mpc stop
	systemctl stop snapclient 2> /dev/null
	systemctl try-restart snapclient spotifyd upmpdcli &> /dev/null
	systemctl start shairport-meta
	sleep 2
	status=$( /srv/http/bash/status.sh )
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$status"
	statusLcdChar "$status"
fi

