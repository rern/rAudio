#!/bin/bash

dirbash=/srv/http/bash
dirbin=/opt/vc/bin
dirshm=/srv/http/data/shm

. /srv/http/data/system/rotaryencoder.conf

control=$( $dirbash/cmd.sh volumecontrolget | cut -d^ -f1 )
volume() {
	$dirbash/cmd.sh "volumeupdown
$1
$control"
}

lastevent=$( ls -1 /dev/input/event* 2> /dev/null | tail -c -2 )
[[ ! $lastevent ]] && lastevent=-1
# play/pause
$dirbin/dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
devinput=/dev/input/event$(( lastevent + 1 ))
for (( i=0; i < 3; i++ )); do
	sleep 1
	[[ -e $devinput ]] && break
done

evtest $devinput | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && $dirbash/cmd.sh mpcplayback
done &

$dirbin/dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step
devinput=/dev/input/event$(( lastevent + 2 ))
for (( i=0; i < 3; i++ )); do
	sleep 1
	[[ -e $devinput ]] && break
done

evtest $devinput | while read line; do
	if [[ $line =~ 'value 1'$ ]]; then
		volume +
	elif [[ $line =~ 'value -1'$ ]]; then
		volume -
	fi
done
