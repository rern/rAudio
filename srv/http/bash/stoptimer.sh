#!/bin/bash

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm

min=$1
poweroff=$2

sleep $(( min * 60 ))

rm -f $dirshm/stoptimer

control_volume=( $( $dirbash/cmd.sh volumecontrolget | tr ^ ' ' ) )
volume=${control_volume[1]}
control=${control_volume[0]}

$dirbash/cmd.sh "volume
$volume
0
$control"

player=$( cat $dirshm/player )
if [[ $player == mpd ]]; then
	$dirbash/cmd.sh mpcplayback$'\n'stop
else
	$dirbash/cmd.sh playerstop$'\n'$player
fi

sleep 2
$dirbash/cmd.sh "volume
0
0
$control"

[[ -n $poweroff ]] && $dirbash/cmd.sh power
