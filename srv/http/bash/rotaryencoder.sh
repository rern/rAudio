#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/rotaryencoder.conf

# play/pause
dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
sleep 1
devinputbutton=$( realpath /dev/input/by-path/*button* )
evtest $devinputbutton | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && mpcPlayback
done &

dn=1%-
up=1%+
fn_volume=$( < $dirsystem/volumefunction )
if [[ -e $dirshm/btreceiver ]]; then
	mixer=$( < $dirshm/btmixer )
elif [[ -e $dirshm/amixercontrol ]]; then
	. $dirshm/output 
else # volumeMpd
	dn=-1
	up=+1
fi
dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step
sleep 1
devinputrotary=$( realpath /dev/input/by-path/*rotary* )
evtest $devinputrotary | while read line; do
	case ${line: -2} in
		' 1' ) updn=$up;;
		'-1' ) updn=$dn;;
		* )    continue;;
	esac
	$fn_volume $updn "$mixer" $card
	volumeGet push
done
