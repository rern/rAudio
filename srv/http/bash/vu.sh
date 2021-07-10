#!/bin/bash

[[ -e /srv/http/data/system/vumeter ]] && vumeter=1
if [[ -e /srv/http/data/system/vuled ]]; then
	vuled=1
	p=( $( cat /srv/http/data/system/vuledpins ) )
	for i in ${p[@]}; do
		gpio export $i out
	done
	readarray -t off <<< "\
${p[@]}
${p[@]:1}
${p[@]:2}
${p[@]:3}
${p[@]:4}
${p[@]:5}

"
		readarray -t on <<< "\

${p[@]:0:1}
${p[@]:0:2}
${p[@]:0:3}
${p[@]:0:4}
${p[@]:0:5}
${p[@]}"
fi

j=0
while read vu; do
	v=${vu:0:-1}
	if [[ -n $vuled ]]; then
		l=$(( v / 6 ))
		for i in ${off[$l]}; do
			[[ -n $i ]] && echo 0 > /sys/class/gpio/gpio$i/value
		done
		for i in ${on[$l]}; do
			[[ -n $i ]] && echo 1 > /sys/class/gpio/gpio$i/value
		done
	fi
	if [[ -n $vumeter ]]; then
		(( j++ ))
		if (( $j == 10 )); then # framerate throttle - 60 to 6
			curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":'$v'}'
			j=0
		fi
	fi
done
