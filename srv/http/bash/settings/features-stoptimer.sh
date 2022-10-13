#!/bin/bash

. /srv/http/bash/common.sh

min=$1
poweroff=$2

rm -f $dirshm/relaystimer
killall relays-timer.sh &> /dev/null

sleep $(( min * 60 ))

rm -f $dirshm/stoptimer

cmd.sh volume # mute
[[ $( cat $dirshm/player ) == mpd ]] && cmd.sh mpcplayback$'\n'stop || cmd.sh playerstop
cmd.sh volume # unmute

if [[ $poweroff ]]; then
	cmd.sh power$'\n'off
elif [[ -e $dirshm/relayson ]]; then
	relays.sh off
fi
