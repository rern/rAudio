#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

echo $$ > $dirshm/pidstoptimer

killProcess relays
rm -f $dirshm/relaystimer

sleep $(( min * 60 ))

$dirbash/cmd.sh volume # mute
[[ $( < $dirshm/player ) == mpd ]] && $dirbash/cmd.sh mpcplayback$'\n'stop || $dirbash/cmd.sh playerstop
$dirbash/cmd.sh volume # unmute

if [[ $poweroff ]]; then
	$dirbash/cmd.sh poweroff
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
