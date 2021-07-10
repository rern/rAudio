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

while read vu; do
	v=${vu:0:-1}
	[[ -n $vumeter ]] && curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":'$v'}'
	if [[ -n $vuled ]]; then
		for i in ${off[$v]}; do
			[[ -n $i ]] && echo 0 > /sys/class/gpio/gpio$i/value
		done
		for i in ${on[$v]}; do
			[[ -n $i ]] && echo 1 > /sys/class/gpio/gpio$i/value
		done
	fi
done
