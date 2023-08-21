#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/rotaryencoder.conf

# play/pause
/opt/vc/bin/dtoverlay gpio-key gpio=$pins label=PLAYCD keycode=200
sleep 1
devinputbutton=$( realpath /dev/input/by-path/*button* )
evtest $devinputbutton | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && $dirbash/cmd.sh mpcplayback
done &

/opt/vc/bin/dtoverlay rotary-encoder pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step
sleep 1
devinputrotary=$( realpath /dev/input/by-path/*rotary* )
if [[ -e $dirsystem/camillavolume ]]; then
	vol_mute=$( volumeGet )
	volume=${vol_mute/ *}
	evtest $devinputrotary | while read line; do
		if [[ $line =~ 'value 1'$ ]]; then
			(( volume++ ))
			volumeUpDnCamilla $db
		elif [[ $line =~ 'value -1'$ ]]; then
			(( volume-- ))
			volumeUpDnCamilla $db
		fi
	done
elif [[ -e $dirshm/btreceiver ]]; then
	control=$( < $dirshm/btreceiver )
	evtest $devinputrotary | while read line; do
		if [[ $line =~ 'value 1'$ ]]; then
			volumeUpDnBt 1%+ "$control"
		elif [[ $line =~ 'value -1'$ ]]; then
			volumeUpDnBt 1%- "$control"
		fi
	done
elif [[ -e $dirshm/amixercontrol ]]; then
	card=$( < $dirsystem/asoundcard )
	control=$( < $dirshm/amixercontrol )
	evtest $devinputrotary | while read line; do
		if [[ $line =~ 'value 1'$ ]]; then
			volumeUpDn 1%+ "$control" $card
		elif [[ $line =~ 'value -1'$ ]]; then
			volumeUpDn 1%- "$control" $card
		fi
	done
else
	evtest $devinputrotary | while read line; do
		if [[ $line =~ 'value 1'$ ]]; then
			volumeUpDnMpc +1
		elif [[ $line =~ 'value -1'$ ]]; then
			volumeUpDnMpc -1
		fi
	done
fi
