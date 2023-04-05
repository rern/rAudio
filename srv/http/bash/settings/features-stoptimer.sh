#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

rm -f $dirshm/relaystimer
killall relays-timer.sh &> /dev/null

sleep $(( min * 60 ))

$dirbash/cmd.sh volume # mute
[[ $( < $dirshm/player ) == mpd ]] && $dirbash/cmd.sh mpcplayback$'\n'stop || $dirbash/cmd.sh playerstop
$dirbash/cmd.sh volume # unmute

if [[ $poweroff ]]; then
	$dirbash/cmd.sh poweroff
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
