#!/bin/bash

[[ -e /dev/shm/usbdac_rules || ! -e /dev/shm/startup ]] && exit # debounce usbdac.rules
# ------------------------------------------------------------------------------
. /srv/http/bash/common.sh

killProcess statuspush
echo $$ > $dirshm/pidstatuspush

if [[ -e $dirsystem/scrobble && ! -e $dirshm/skip ]]; then
	data_scrobble=$( jq -r .Artist,.Title,.Time,.elapsed,.webradio $dirshm/status.json 2> /dev/null )
fi
if [[ $1 ]]; then # from status-radio.sh, status-dab.sh, spotifyd.sh
	status=$1
else
	status=$( $dirbash/status -s | jq '{Album,Artist,coverart,elapsed,file,play,pllength,
										state,station,Time,timestamp,Title,webradio}' )
fi
echo "$status" > $dirshm/status.json

readarray -t lines < <( jq -r .Artist,.Title,.Album,.coverart,.state,.webradio <<< ${status//\`/\'} )
Artist=${lines[0]}
Title=${lines[1]}
Album=${lines[2]}
coverart=${lines[3]}
state=${lines[4]}
[[ ${lines[5]} == true ]] && WEBRADIO=1

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
[[ $state == play ]] && PLAY=1
[[ $PLAY ]] && start_stop=start || start_stop=stop
if [[ -e $dirsystem/vumeter ]]; then
	[[ ! $PLAY ]] && pushData vumeter '{ "val": 0 }'
	systemctl $start_stop cava
fi
[[ -e $dirshm/power ]] && exit
# ------------------------------------------------------------------------------
player=$( < $dirshm/player )
[[ -e $dirsystem/mpdoled ]] && systemctl $start_stop mpd_oled
if [[ -e $dirsystem/lcdchar ]]; then
	if [[ $player == mpd && $( jq .pllength <<< $status ) == 0 ]]; then
		$dirbash/lcdchar.py logo
	else
		if [[ $player != airplay ]]; then
			[[ ! $PLAY || ( $PLAY && $Album$Artist$Title ) ]] && systemctl restart lcdchar # on change to webradio
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

if [[ $PLAY && $data_scrobble ]]; then # on track changed (on stop - scrobbleOnStop)
	readarray -t data <<< $data_scrobble
	[[ ${data[0]} != $Artist || ${data[1]} != $Title ]] && scrobble $player "$data_scrobble"
fi
