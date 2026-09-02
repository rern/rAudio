#!/bin/bash

. /srv/http/bash/common.sh

. $dirsystem/rotaryencoder.conf

declare -A dev
declare -A param=(
	[gpio-key]="gpio=$pins label=PLAYCD keycode=200" # play/pause
	[rotary-encoder]="pin_a=$pina pin_b=$pinb relative_axis=1 steps-per-period=$step" # volume
)

for dt in gpio-key rotary-encoder; do
	dtoverlay $dt ${param[$dt]} &> /dev/null
	[[ $dt == gpio-key ]] && d=button || d=rotary
	for i in {1..3};do
		sleep 1
		path=$( compgen -G /dev/input/by-path/*$d* )
		[[ $path ]] && dev[$d]=$( realpath $path ) && break
	done
done

fn_volume=$( volumeFunction )
if [[ $fn_volume == volumeMpd ]]; then
	dn=-$step
	up=+$step
else
	dn=$step%-
	up=$step%+
	if [[ $fn_volume == volumeAmixer ]]; then
		mixer=$( < $dirshm/amixercontrol )
	else
		mixer=$( < $dirshm/btmixer )
	fi
fi

file_dn=$dirshm/rotary_dn
file_up=$dirshm/rotary_up

action() {
	[[ ! -e $1 ]] && return
	
	rm $1
	$2 $3 # mpcPlayback | mpcSkip [PREVIOUS]
}
# button -----------------------------------------------------------------------
evtest ${dev[button]} | while read line; do
	[[ $line != *EV_KEY*KEY_PLAYCD* ]] && continue
	# Event: time 1725184000.123456, type 1 (EV_KEY), code 164 (KEY_PLAYCD), value 0
	value=${line: -1}
	if [[ $value == 1 ]]; then
		touch $file_dn
		( sleep 1 && action $file_dn mpcSkip ) &
	elif [[ $value == 0 ]]; then
		action $file_dn mpcPlayback
		action $file_up mpcSkip PREVIOUS
		touch $file_up
		( sleep 0.5 && action $file_up ) &
	fi
done &

# volume ----------------------------------------------------------------------
evtest ${dev[rotary]} | while read line; do
	case ${line: -2} in
		' 1' ) updn=$up;;
		'-1' ) updn=$dn;;
		* )    continue;;
	esac
	$fn_volume $updn "$mixer"
	pushVolume
done
