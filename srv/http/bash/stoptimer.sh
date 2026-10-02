#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/stoptimer.conf

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
pushData mpdplayer '{ "stoptimer": true }'

sleep $(( min * 60 ))

notify stoptimer 'Stop Timer' 'Stop ...'
rm $dirshm/pidstoptimer
[[ ! $onplay ]] && rm $dirsystem/stoptimer
CURRENT=$( volumeGet )
TARGET=0
volume
playerStop
sleep 1
TARGET=$CURRENT
CURRENT=0
volume

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
