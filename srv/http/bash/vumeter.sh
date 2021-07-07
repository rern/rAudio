#!/bin/bash
if [[ ! -e /srv/http/data/system/vuled ]]; then
	while read vu; do
		curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":'${vu:0:-1}'}'
	done
else
	p=( $( cat /srv/http/data/system/vuled ) )
	for i in ${p[@]}; do
		gpio -1 mode $i out
	done
	readarray -t off <<< "\
${p[@]}
${p[@]:1}
${p[@]:2}
${p[@]:3}
${p[@]:4}
${p[@]:5}
${p[@]:6}
"
	readarray -t on <<< "\

${p[@]:0:1}
${p[@]:0:2}
${p[@]:0:3}
${p[@]:0:4}
${p[@]:0:5}
${p[@]:0:6}
${p[@]}"
	while read vu; do
		v=${vu:0:-1}
		curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":'$v'}'
		led=$(( v / 6 ))
		for i in ${off[$led]}; do
			[[ -n $i ]] && gpio -1 write $i 0
		done
		for i in ${on[$led]}; do
			[[ -n $i ]] && gpio -1 write $i 1
		done
	done
fi
