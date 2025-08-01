#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
pushData mpdplayer '{ "stoptimer": true }'

sleep $(( min * 60 ))

rm $dirshm/pidstoptimer
volume=$( volumeGet )
. <( grep -E '^card|^mixer' $dirshm/output )

$dirbash/cmd.sh "volume
$volume
0
$mixer
$card
CMD CURRENT TARGET CONTROL CARD"

$dirbash/cmd.sh playerstop

sleep 1
fn_volume=$( < $dirshm/volumefunction )
$fn_volume $volume% "$mixer" $card

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
