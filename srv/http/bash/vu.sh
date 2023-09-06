#!/bin/bash

dirsystem=/srv/http/data/system

[[ -e $dirsystem/vumeter ]] && vumeter=1
if [[ -e $dirsystem/vuled ]]; then
	vuled=1
	p=( $( < $dirsystem/vuled.conf ) )
	for i in ${p[@]}; do
		gpio export $i out
	done
	for i in {0..7}; do
		off+=( "$( echo ${p[@]:$i} )" )
		on+=( "$( echo ${p[@]:0:$i} )" )
	done
fi

j=0
while read vu; do
	v=${vu:0:-1}
	if [[ $vuled ]]; then
		l=$(( v / 6 ))
		if (( $l < 7 )); then
			for i in ${off[$l]}; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
		if (( $l > 0 )); then
			for i in ${on[$l]}; do
				echo 1 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
	if [[ $vumeter ]]; then
		(( j++ ))
		if (( $j == 10 )); then # framerate throttle - 60 to 6
			pushstream vumeter '{"val":'$v'}'
			j=0
		fi
	fi
done
