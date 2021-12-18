#!/bin/bash

dirbash=/srv/http/bash
dirbin=/opt/vc/bin
$dirbin/dtoverlay -r gpio-key &> /dev/null
$dirbin/dtoverlay -r rotary-encoder &> /dev/null

. /srv/http/data/system/rotaryencoder.conf

# play/pause
$dirbin/dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
sleep 3
devinput=$( ls -1 /dev/input/event* | tail -1 )
evtest $devinput | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && $dirbash/cmd.sh mpcplayback
done &

# volume
$dirbin/dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=4
sleep 3
control_volume=$( $dirbash/cmd.sh volumecontrolget )
control=${control_volume/^*}
devinput=$( ls -1 /dev/input/event* | tail -1 )

evtest $devinput | while read line; do
	if [[ $line =~ '.*value 1' ]]; then
		updn=+
	elif [[ $line =~ '.*value -1' ]]; then
		updn=-
	fi
	$dirbash/cmd.sh "volumeupdown
$updn
$control"
done
