#!/bin/bash

[[ -e /dev/shm/usbdac_rules || ! -e /dev/shm/startup ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ $1 ]]; then # from status-radio.sh, status-dab.sh, spotifyd.sh
	status=$1
else
	status=$( $dirbash/status -s | jq '{Album,Artist,coverart,elapsed,file,play,pllength,
										state,station,Time,timestamp,Title,webradio}' )
fi
readarray -t lines < <( jq -r .Artist,.Title,.Album,.coverart,.state,.webradio <<< ${status//\`/\'} )
Artist=${lines[0]}
Title=${lines[1]}
Album=${lines[2]}
coverart=${lines[3]}
state=${lines[4]}
[[ $state == play ]] && PLAY=1
[[ ${lines[5]} == true ]] && WEBRADIO=1
player=$( < $dirshm/player )
[[ $player == mpd ]] && MPD=1

if [[ ! $PLAY || $Album$Artist$Title ]]; then # no data on init change to webradio
	NEW_STATUS=1
	if [[ -e $dirsystem/scrobble && ! -e $dirshm/skip ]]; then
		if [[ $MPD ]] || grep -q $player=true $dirsystem/scrobble.conf; then
			data_scrobble=$( jq -r .Artist,.Title,.Time,.elapsed,.webradio $dirshm/status.json )
		fi
	fi
	echo "$status" > $dirshm/status.json
fi
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
[[ $PLAY ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ ! $PLAY ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
if [[ -e $dirsystem/lcdchar ]]; then
	if [[ $MPD && $( jq .pllength <<< $status ) == 0 ]]; then
		$dirbash/lcdchar.py logo
	else
		if [[ $player != airplay ]]; then
			[[ $NEW_STATUS ]] && systemctl restart lcdchar
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
	if [[ $PLAY ]]; then
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
	if [[ $PLAY ]]; then
		sudo xset dpms force on
		sudo xset -dpms
	else
		sudo xset +dpms
	fi
fi
[[ ! $WEBRADIO && -e $dirsystem/librandom ]] && $dirbash/cmd.sh pladdrandom &

[[ $PLAY && $data_scrobble ]] && scrobble $player "$data_scrobble" # play only (stop: scrobbleOnStop)
