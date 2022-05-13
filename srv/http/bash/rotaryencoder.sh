#!/bin/bash

dirbash=/srv/http/bash
diroptbin=/opt/vc/bin
dirshm=/srv/http/data/shm

. /srv/http/data/system/rotaryencoder.conf

card=$( cat $dirsystem/asoundcard )
control=$( cat $dirshm/amixercontrol )
volume() {
	$dirbash/cmd.sh "volumeupdown
$1
$card
$control"
}

# play/pause
$diroptbin/dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
sleep 1
devinputbutton=$( realpath /dev/input/by-path/*button* )
evtest $devinputbutton | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && $dirbash/cmd.sh mpcplayback
done &

$diroptbin/dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step
sleep 1
devinputrotary=$( realpath /dev/input/by-path/*rotary* )
evtest $devinputrotary | while read line; do
	if [[ $line =~ 'value 1'$ ]]; then
		volume +
	elif [[ $line =~ 'value -1'$ ]]; then
		volume -
	fi
done
