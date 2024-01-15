#!/bin/bash

. /srv/http/bash/common.sh
dirgpio=/sys/class/gpio/gpio

[[ -e $dirsystem/vumeter ]] && vumeter=1
if [[ -e $dirsystem/vuled ]]; then
	vuled=1
	pin_0=$( sed 's/^.*=//; s/$/=0/' $dirsystem/vuled.conf )
	pins=$( cut -d= -f2 $dirsystem/vuled.conf )
	p=( $pins )
	for i in {0..7}; do
		on+=( "$( echo ${p[@]:0:$i} )" )
	done
fi

j=0
while read vu; do
	v=${vu:0:-1}
	if [[ $vuled ]]; then
		gpioset -t0 -c0 $pin_0 # all off
		l=$(( v / 6 ))
		if (( $l > 0 )); then
			for i in ${on[$l]}; do
				gpioset -t0 -c0 $i=1
			done
		fi
	fi
	if [[ $vumeter ]]; then
		(( j++ ))
		if (( $j == 10 )); then # framerate throttle - 60 to 6
			pushData vumeter '{"val":'$v'}'
			j=0
		fi
	fi
done
