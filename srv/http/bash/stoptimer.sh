#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
rm -f $dirshm/relaystimer

sleep $(( min * 60 ))

$dirbash/cmd.sh volume # mute
[[ $( < $dirshm/player ) == mpd ]] && $dirbash/cmd.sh mpcplayback$'\n'stop$'\nCMD ACTION' || $dirbash/cmd.sh playerstop
$dirbash/cmd.sh volume # unmute

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
