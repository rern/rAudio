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
	if [[ $1 == click ]]; then
		mpcPlayback
	else
		mpcSkip
		( sleep 0.5 && rm -f $file_up ) & # long press run before 'touch $file_up'
	fi
}
# button -----------------------------------------------------------------------
evtest ${dev[button]} | while read line; do
	[[ $line != *value* ]] && continue
	
	# Event: time 1725184000.123456, type 1 (EV_KEY), code 164 (KEY_PLAYCD), value 0
	if [[ ${line: -1} == 1 ]]; then # ...value 1
		[[ -e $file_up ]] && continue   # 2nd dn - already set #1
		
		touch $file_dn                  # 1st dn
		( sleep 1 && action longpress) &    # -------- #1 1s   > long press   - cancel #2,#3
	else # ...value 0
		[[ ! -e $file_dn ]] && continue # already run #1
		
		if [[ ! -e $file_up ]]; then    # 1st up
			touch $file_up
			( sleep 0.5 && action click ) & # -------- #2 0.5s > click        - cancel #1
		else                            # 2nd up
			rm -f $file_up $file_dn         # -------- #3 0s   > double click - cancel #1,#2
			mpcSkip PREVIOUS
		fi
	fi
done &

# volume ----------------------------------------------------------------------
evtest ${dev[rotary]} | while read line; do
	[[ $line != *value* ]] && continue
	
	# Event: time 1788345418.446152, type 2 (EV_REL), code 0 (REL_X), value -1
	[[ ${line: -2} == -1 ]] && updn=$dn || updn=$up # ...value -1 / ...value 1
	$fn_volume $updn "$mixer"
	pushVolume
done
