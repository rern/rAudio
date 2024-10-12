#!/bin/bash

. /srv/http/bash/common.sh
dirgpio=/sys/class/gpio/gpio

[[ -e $dirsystem/vumeter ]] && vumeter=1
if [[ -e $dirsystem/vuled ]]; then
	vuled=1
	pins=$( cut -d= -f2 $dirsystem/vuled.conf )
	pin_0=$( sed 's/$/=0/' <<< $pins )
	p=( $pins )
	pL=$( wc -l <<< $pins )
	for (( i=0; i < $pL; i++ )); do
		on+=( "$( echo ${p[@]:0:$i} )" )
	done
	vuL=$i
fi

j=0
while read vu; do
	v=${vu:0:-1}
	if [[ $vuled ]]; then
		gpioset -t0 -c0 $pin_0 # all off
		l=$(( v / vuL ))
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
