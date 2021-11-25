#!/bin/bash

dirbash=/srv/http/bash

min=$1
poweroff=$2

sleep $(( min * 60 ))

control_volume=( $( $dirbash/cmd.sh volumecontrolget | tr ^ ' ' ) )
volume=${control_volume[1]}
control=${control_volume[0]}

$dirbash/cmd.sh "volume
$volume
0
$control"

player=$( cat /srv/http/data/shm/player )
if [[ $player == mpd ]]; then
	$dirbash/cmd.sh mpcplayback$'\n'stop
else
	$dirbash/cmd.sh playerstop$'\n'$player
fi

$dirbash/cmd.sh "volume
0
0
$control"

[[ -n $poweroff ]] && $dirbash/cmd.sh power
