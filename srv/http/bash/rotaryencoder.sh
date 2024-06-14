#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/rotaryencoder.conf

# play/pause
dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
sleep 1
devinputbutton=$( realpath /dev/input/by-path/*button* )
evtest $devinputbutton | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && $dirbash/cmd.sh mpcplayback
done &

volumeFunctionSet

dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step
sleep 1
devinputrotary=$( realpath /dev/input/by-path/*rotary* )
evtest $devinputrotary | while read line; do
	case ${line: -2} in
		' 1' ) val=1%+;;
		'-1' ) val=1%-;;
		* )    continue
	esac
	$fn_volume $val "$mixer" $card
done
