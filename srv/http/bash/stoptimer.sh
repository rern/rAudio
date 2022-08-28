#!/bin/bash

. /srv/http/bash/common.sh

min=$1
poweroff=$2

rm -f $dirshm/relaystimer
kill -9 $( pgrep relaystimer ) &> /dev/null

sleep $(( min * 60 ))

rm -f $dirshm/stoptimer

ccv=$( $dirbash/cmd.sh volumecontrolget )
card=${ccv/^*}
control=$( echo $ccv | cut -d^ -f2 ) # keep trailing space if any
volume=${ccv/*^}
player=$( cat $dirshm/player )
if [[ $player == mpd ]]; then
	$dirbash/cmd.sh mpcplayback$'\n'stop
else
	$dirbash/cmd.sh playerstop
fi

sleep 2
$dirbash/cmd.sh "volume
$volume
0
$card
$control"

if [[ $poweroff ]]; then
	$dirbash/cmd.sh power$'\n'off
elif [[ -e $dirshm/relayson ]]; then
	$dirbash/settings/relays.sh off
fi
