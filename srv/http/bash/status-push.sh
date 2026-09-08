#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

coverart_scrobble() {
	local Album args Artist lines Title
	[[ $webradio && $state == stop ]] && return 1

	readarray -t lines < <( jq -r .Artist,.Title,.Album <<< $status )
	Artist=${lines[0]}
	[[ ! $Artist ]] && return 1
	
	Title=${lines[1]}
	[[ $scrobble && ! $Title ]] && return
	
	Album=${lines[2]}
	[[ ! $Album && ! $Title ]] && return

	args="cmd
$Album
$Artist
$Title
CMD ALBUM ARTIST TITLE"
	if [[ $scrobble ]]; then
		$dirbash/scrobble.sh "$args" &> /dev/null &
	else
		$dirbash/status-coverart.sh "$args" &> /dev/null &
	fi
}

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

player=$( < $dirshm/player )
# > status.json - for:
#	1. refresh page: radio, spotify
#	2. get: play, state
#	3. lcdchar.py
if [[ $1 ]]; then # from status-radio.sh, status-dab.sh, spotifyd.sh
	status=$1
	echo "$status" > $dirshm/status.json
else
	keys='{Album,Artist,coverart,elapsed,file,play,pllength,state,station,Time,timestamp,Title,webradio}'
	status=$( $dirbash/status -s \
				| jq $keys \
				| tee $dirshm/status.json )
fi
readarray -t lines < <( jq -r .coverart,.state,.webradio <<< $status )
coverart=${lines[0]}
state=${lines[1]}
[[ ${lines[2]} == true ]] && webradio=1
########
[[ -e $dirmpdconf/snapserver.conf ]] && p_b=-b || p_b=-p
$dirbash/status $p_b

[[ ! $coverart ]] && coverart_scrobble
[[ $state == play ]] && state_play=1
[[ $state_play ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ ! $state_play ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
if [[ -e $dirsystem/lcdchar ]]; then
	if [[ $webradio && $state == play && ! $( jq -r .Title <<< $status ) ]]; then
		file=$( jq -r .file <<< $status )
		[[ $file == *radioparadise* || $file == *radiofrance* ]] && exit # suppress before 1st radio push
# ------------------------------------------------------------------------------
	fi
	if (( $( jq .pllength <<< $status ) > 0 )); then 
		systemctl restart lcdchar
	else
		$dirbash/lcdchar.py logo
	fi
fi
if [[ -e $dirsystem/stoptimer ]]; then
	if [[ $state_play ]]; then
		[[ ! -e $dirshm/pidstoptimer ]] && $dirbash/stoptimer.sh &> /dev/null &
	elif [[ -e $dirshm/pidstoptimer ]]; then
		killProcess stoptimer
		if grep -q ^onplay=$ $dirsystem/stoptimer.conf; then
			rm $dirsystem/stoptimer
			pushData refresh '{ "page": "features", "stoptimer": false }'
		fi
	fi
fi
if systemctl -q is-active localbrowser && grep -q onwhileplay=true $dirsystem/localbrowser.conf; then
	export DISPLAY=:0
	if [[ $state_play ]]; then
		sudo xset dpms force on
		sudo xset -dpms
	else
		sudo xset +dpms
	fi
fi
[[ ! $webradio && -e $dirsystem/librandom ]] && $dirbash/cmd.sh pladdrandom &
[[ ! -e $dirsystem/scrobble || ! -e $dirshm/elapsed ]] && exit # track changed || prev/next/stop
# ------------------------------------------------------------------------------
[[ $state == stop || $webradio || ! $Artist || ! $Title || $Time -lt 30 ]] && exit
# ------------------------------------------------------------------------------
if [[ $player != mpd ]]; then
	! grep -q $player=true $dirsystem/scrobble.conf && exit
# ------------------------------------------------------------------------------
	if [[ $state_play || $state == pause ]]; then # renderers prev/next
		timestampnew=$( jq .timestamp $dirshm/status.json )
		elapsed=$(( ( timestampnew - timestamp ) / 1000 ))
		(( $elapsed < $Time )) && echo $elapsed > $dirshm/elapsed
	fi
fi
if [[ -e $dirshm/elapsed ]];then
	elapsed=$( < $dirshm/elapsed )
	rm $dirshm/elapsed
	(( $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
# ------------------------------------------------------------------------------
fi
scrobble=1
coverart_scrobble
