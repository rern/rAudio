#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/stoptimer.conf

volumeToggle() {
	$dirbash/cmd.sh "volume
$1
$2
CMD CURRENT TARGET"
}

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
pushData mpdplayer '{ "stoptimer": true }'

sleep $(( min * 60 ))

notify stoptimer 'Stop Timer' 'Stop ...'
rm $dirshm/pidstoptimer
[[ ! $onplay ]] && rm $dirsystem/stoptimer
volume=$( volumeGet )
volumeToggle $volume 0
playerStop
sleep 1
volumeToggle 0 $volume

if [[ $poweroff ]]; then
	$dirbash/power.sh
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
