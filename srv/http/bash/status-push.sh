#!/bin/bash

[[ -e /dev/shm/usbdac_rules ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

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
readarray -t lines < <( jq -r .Artist,.Title,.Album,.coverart,.state,.webradio <<< ${status//\`/\'} )
Artist=${lines[0]}
Title=${lines[1]}
Album=${lines[2]}
coverart=${lines[3]}
state=${lines[4]}
[[ ${lines[5]} == true ]] && webradio=1
########
[[ -e $dirmpdconf/snapserver.conf ]] && $dirbash/status -b || $dirbash/status -p
# coverart #############################
if [[ ! $coverart && $Artist && ( $Album || $Title )]]; then
	$dirbash/status-coverart.sh "cmd
$Album
$Artist
$Title
CMD ALBUM ARTIST TITLE" &> /dev/null &
fi
[[ $state == play ]] && state_play=1
[[ $state_play ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ ! $state_play ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
player=$( < $dirshm/player )
[[ $player == mpd ]] && player_mpd=1
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
if [[ -e $dirsystem/lcdchar ]]; then
	if [[ $webradio && $state == play && ! $( jq -r .Title <<< $status ) ]]; then
		file=$( jq -r .file <<< $status )
		[[ $file == *radioparadise* || $file == *radiofrance* ]] && exit # suppress before 1st radio push
# ------------------------------------------------------------------------------
	fi
	if [[ $player_mpd && $( jq .pllength <<< $status ) == 0 ]]; then
		$dirbash/lcdchar.py logo
	else
		if [[ $player != airplay ]]; then
			systemctl restart lcdchar
		else
			if [[ ! -e $dirshm/lcdchar ]]; then
				touch $dirshm/lcdchar
				systemctl restart lcdchar
				( sleep 2 && rm -f $dirshm/lcdchar ) & # debounce multiple events
			fi
		fi
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
[[ ! -e $dirshm/scrobble ]] && exit
# ------------------------------------------------------------------------------
readarray -t data < $dirshm/scrobble
rm -f $dirshm/scrobble
Artist=${data[0]}
Title=${data[1]}
Time=${data[2]}
elapsed=${data[3]}
[[ ! $Artist || ! $Title ]] && exit
# ------------------------------------------------------------------------------
(( $Time < 30 || $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
# ------------------------------------------------------------------------------
$dirbash/scrobble.sh "cmd
$Artist
$Title
CMD ARTIST TITLE" &> /dev/null &
