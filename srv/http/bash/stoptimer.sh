#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/stoptimer.conf

killProcess stoptimer
echo $$ > $dirshm/pidstoptimer

killProcess relaystimer
rm -f $dirshm/relaystimer

sleep $(( min * 60 ))

rm $dirshm/pidstoptimer
. <( grep -E '^card|^mixer' $dirshm/output )
volume=$( volumeGet )

$dirbash/cmd.sh "volume
$volume
0
$mixer
$card
CMD CURRENT TARGET CONTROL CARD"
$dirbash/cmd.sh playerstop
$dirbash/cmd.sh "volumesetat
0
$mixer
$card
CMD TARGET CONTROL CARD"

if [[ $poweroff ]]; then
	$dirbash/power.sh off
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/relays.sh off
fi
