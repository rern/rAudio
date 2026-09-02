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
	[[ ! -e $file_dn ]] && return
	
	rm -f $file_up $file_dn
	$1 $2 # mpcPlayback | mpcSkip [PREVIOUS]
}
# button -----------------------------------------------------------------------
evtest ${dev[button]} | while read line; do
	[[ $line != *EV_KEY*KEY_PLAYCD* ]] && continue
	# Event: time 1725184000.123456, type 1 (EV_KEY), code 164 (KEY_PLAYCD), value 0
	value=${line: -1}
	if [[ $value == 1 ]]; then
		[[ -e $file_up ]] && continue # 2nd dn
		
		touch $file_dn                # 1st dn
		( sleep 1 && action mpcSkip ) &           #1 1.0s - no cancel    - long press
	elif [[ $value == 0 ]]; then
		if [[ ! -e $file_up ]]; then  # 1st up
			touch $file_up
			( sleep 0.5 && action mpcPlayback ) & #2 0.5s - cancel #1    - double click
		else                          # 2nd up
			rm -f $file_up $file_dn
			mpcSkip PREVIOUS                      #3 0s   - cancel #1,#2 - click
		fi
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
