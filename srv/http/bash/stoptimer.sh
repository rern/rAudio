#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
rm -f $dirshm/relaystimer

sleep $(( min * 60 ))

rm $dirshm/pidstoptimer
readarray -t vcc <<< $( volumeCardControl )
volume=${vcc[0]}
card=${vcc[1]}
control=${vcc[2]}

$dirbash/cmd.sh "volume
$volume
0
$control
$card"
playerActive mpd && $dirbash/cmd.sh mpcplayback$'\n'stop$'\nCMD ACTION' || $dirbash/cmd.sh playerstop
$dirbash/cmd.sh "volumesetat
0
$control
$card"

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
