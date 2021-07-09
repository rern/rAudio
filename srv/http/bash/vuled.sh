#!/bin/bash

p=( $( cat /srv/http/data/system/vuled ) )
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

while read vu; do
	led=${vu:0:-1}
	for i in ${off[$led]}; do
		[[ -n $i ]] && echo 0 > /sys/class/gpio/gpio$i/value
	done
	for i in ${on[$led]}; do
		[[ -n $i ]] && echo 1 > /sys/class/gpio/gpio$i/value
	done
done
