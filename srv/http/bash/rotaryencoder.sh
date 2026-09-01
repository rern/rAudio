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

file=$dirshm/button
action() {
	if [[ -e $file ]]; then
		rm $file
		if [[ $1 == playback ]]; then # toggle play
			mpcPlayback
		else                          # toggle mute
			if [[ -e $dirsystem/volumemute ]]; then
				current=0
				target=$( getContent $dirsystem/volumemute )
				type=unmute
			else
				current=$( volumeGet )
				target=0
				type=mute
			fi
			$dirbash/cmd.sh "volume
$current
$target
$mixer
$type
CMD CURRENT TARGET CONTROL TYPE"
		fi
	fi
}
# button -----------------------------------------------------------------------
evtest ${dev[button]} | while read line; do
	[[ $line != *EV_KEY*KEY_PLAYCD* ]] && continue
	# Event: time 1725184000.123456, type 1 (EV_KEY), code 164 (KEY_PLAYCD), value 0
	value=${line: -1}
	if [[ $value == 1 ]]; then # button down
		touch $file
		( sleep 1 && action ) &
	elif [[ $value == 0 ]]; then # button up
		action playback
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
