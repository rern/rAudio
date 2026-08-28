#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

argsSet() {
	[[ $webradio && $state == stop ]] && return 1

	lines=$( grep -E '^(Album|Artist|Title)' $dirshm/status )
	. <( echo "$lines" )
	[[ ! $Artist ]] && return 1

	if [[ $1 == scrobble ]]; then
		[[ ! $Title ]] && return 1
	else
		[[ ! $Album && ! $Title ]] && return 1
	fi

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
, "pause"     : false
, "play"      : true
, "pllength"  : '$pllength'
, "state"     : "play"
, "stop"      : false
, "Time"      : false
, "timestamp" : '$timestamp'
, "Title"     : "'$TITLE'"
, "webradio"  : true
}'
	json2var "$status" > $dirshm/status
	state=play
	webradio=true
else
	$dirbash/status -k > $dirshm/status
	. <( grep -E '^(coverart|state|webradio)' $dirshm/status )
	COVERART=$coverart
fi
########
[[ -e $dirmpdconf/snapserver.conf ]] && p_b=-b || p_b=-p
$dirbash/status $p_b

if [[ ! $COVERART ]]; then
	argsSet && $dirbash/status-coverart.sh "$args" &> /dev/null &
fi
[[ $state == play ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ $state != play ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
if [[ -e $dirsystem/lcdchar ]]; then
	[[ ! $status ]] && status=$( $dirbash/status )
	jq '{ Album, Artist, elapsed, file, state, station, Time, timestamp, Title, webradio }' <<< $status > $dirshm/status.json
	systemctl restart lcdchar
fi
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
if [[ -e $dirsystem/stoptimer ]]; then
	if [[ $state == play ]]; then
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
	if [[ $state == play ]]; then
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
	if [[ $state == play || $state == pause ]]; then # renderers prev/next
		timestampnew=$( getVar timestamp $dirshm/status )
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
