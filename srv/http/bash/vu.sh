#!/bin/bash

. /srv/http/bash/common.sh

pin_0=$( sed 's/$/=0/; s/ /=0\n/g' $dirsystem/vuled.conf )
gpioset -t0 -c0 $pin_0
[[ $1 == stop ]] && exit
# --------------------------------------------------------------------
[[ -e $dirsystem/vumeter ]] && vumeter=1 && j=0
if [[ -e $dirsystem/vuled ]]; then
	vuled=1
	pL=$( wc -l <<< $pin_0 )
	on=( "$pin_0" )
	for (( i=1; i < $pL + 1; i++ )); do
		on+=( "$( sed '1,'$i' s/0$/1/' <<< $pin_0 )" )
	done
fi
cava -p /etc/cava.conf | while read vu; do
	v=${vu:0:-1}
	if [[ $vuled ]]; then
		if (( v > 0 )); then
			ir=$(( pL - 1 )) # i - roundup
			vr=$(( v + ir )) # v - roundup
			v=$(( vr / pL ))
		fi
		gpioset -t0 -c0 ${on[v]} # p1=0 p2=1 ... : 0-off, 1-on
	fi
	if [[ $vumeter ]]; then
		(( j++ ))
		if (( $j == 10 )); then # framerate throttle - push @10 signal
			pushData vumeter '{"val":'$v'}'
			j=0
		fi
	fi
done
