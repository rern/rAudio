#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

volumeToggle() {
	$dirbash/cmd.sh "volume
$1
$2
$mixer
$card
CMD CURRENT TARGET CONTROL CARD"
}

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
pushData mpdplayer '{ "stoptimer": true }'

sleep $(( min * 60 ))

rm $dirshm/pidstoptimer
. <( grep -E '^card|^mixer' $dirshm/output )
volume=$( volumeGet )

volumeToggle $volume 0
$dirbash/cmd.sh playerstop
sleep 1
volumeToggle 0 $volume

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
