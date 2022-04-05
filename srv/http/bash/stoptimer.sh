#!/bin/bash

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm

min=$1
poweroff=$2

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
	$dirbash/cmd.sh playerstop$'\n'$player
fi

sleep 2
$dirbash/cmd.sh "volume
$volume
0
$card
$control"

[[ $poweroff ]] && $dirbash/cmd.sh power$'\n'off
