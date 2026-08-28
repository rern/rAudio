#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/rotaryencoder.conf

declare -A dev
declare -A param=(
	[gpio-key]="gpio=$pins label=PLAYCD keycode=200" # play/pause
	[rotary-encoder]="pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step" # volume
)

for dt in gpio-key rotary-encoder; do # remove cannot combine with load
	dtoverlay -l | grep -q $dt && dtoverlay -r $dt &> /dev/null
done

for dt in gpio-key rotary-encoder; do
	dtoverlay $dt ${param[$dt]}
	[[ $dt == gpio-key ]] && d=button || d=rotary
	for i in {1..3};do
		sleep 1
		compgen -G /dev/input/by-path/*$d* > /dev/null && break
	done
	dev[$d]=$( realpath /dev/input/by-path/*$d* )
done

dn=-1
up=+1
fn_volume=$( volumeFunction )
if [[ -e $dirshm/btmixer ]]; then
	dn=1%-
	up=1%+
	mixer=$( < $dirshm/btmixer )
elif [[ -e $dirshm/amixercontrol ]]; then
	. $dirshm/output 
fi
# button -----------------------------------------------------------------------
evtest ${dev[button]} | while read line; do
	[[ $line =~ .*EV_KEY.*KEY_PLAYCD.*1 ]] && mpcPlayback
done &

# volume ----------------------------------------------------------------------
evtest ${dev[rotary]} | while read line; do
	case ${line: -2} in
		' 1' ) updn=$up;;
		'-1' ) updn=$dn;;
		* )    continue;;
	esac
	$fn_volume $updn "$mixer" $card
	volumeGet push
done
