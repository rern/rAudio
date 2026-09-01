#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

argsSet() {
	[[ $webradio && $state == stop ]] && return 1

	readarray -t lines < <( jq -r .Artist,.Title,.Album $dirshm/status.json )
	Artist=${lines[0]}
	[[ ! $Artist ]] && return 1
	
	Title=${lines[1]}
	[[ $1 == scrobble && ! $Title ]] && return 1
	
	Album=${lines[2]}
	[[ ! $Album && ! $Title ]] && return 1

	args=$( sort <<< $lines \
		| sed '
			s/.*="*//
			s/ *"*$//
			s/[`’]/'"'"'/g
			1 i\cmd
			$ a\CMD ALBUM ARTIST TITLE' )
}

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 && $1 != playerstop ]]; then # from status-dab.sh, status-radio.sh
	args2var "$1"
	elapsed=$( mpcElapsed webradio )
	pllength=$( mpc status %length% )
	timestamp=$( date +%s%3N )
	status='{
  "Album"     : "'$ALBUM'"
, "Artist"    : "'$ARTIST'"
, "coverart"  : "'$COVERART'"
, "elapsed"   : '$elapsed'
, "file"      : "'$FILE'"
, "pllength"  : '$pllength'
, "state"     : "play"
, "station"   : "'$STATION'"
, "Time"      : false
, "timestamp" : '$timestamp'
, "Title"     : "'$TITLE'"
, "webradio"  : true
}'
	echo "$status" > $dirshm/status.json
	state=play
	webradio=1
else
	if [[ -e $dirshm/radio ]]; then
		status=$( < $dirshm/status.json )
		readarray -t lines < <( jq -r .coverart,.state,.webradio <<< $status )
	else
		status=$( $dirbash/status \
					| jq 'del(.counts, .display)' \
					| tee $dirshm/status.json )
		readarray -t lines < <( jq -r .coverart,.state,.webradio <<< $status )
	fi
	COVERART=${lines[0]}
	state=${lines[1]}
	[[ ${lines[2]} == true ]] && webradio=1
fi
########
[[ -e $dirmpdconf/snapserver.conf ]] && p_b=-b || p_b=-p
$dirbash/status $p_b

if [[ ! $COVERART ]]; then
	argsSet && $dirbash/status-coverart.sh "$args" &> /dev/null &
fi
[[ $state == play ]] && state_play=1
[[ $state_play ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ ! $state_play ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
[[ -e $dirsystem/lcdchar ]] && systemctl restart lcdchar
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
if [[ $( < $dirshm/player ) != mpd ]]; then
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
argsSet scrobble && $dirbash/scrobble.sh "$args" &> /dev/null &
