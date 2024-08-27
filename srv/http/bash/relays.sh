#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/relays.conf

timerfile=$dirshm/relaystimer

if [[ ! $1 ]]; then # no args = ON
	touch $dirshm/relayson
	action=ON
	pins=$on
	onoff=1
	delay=( $ond )
	color=wh
	done=true
else
	killProcess relaystimer
	rm -f $dirshm/{relayson,relaystimer}
	action=OFF
	pins=$off
	onoff=0
	delay=( $offd )
	color=gr
	done=false
fi
json=$( jq < $dirsystem/relays.json )
for p in $pins; do
	order+=$( jq -r '.["'$p'"]' <<< $json )$'\n'
done
dL=${#delay[@]}
i=0
for pin in $pins; do
	gpioset -t0 -c0 $pin=$onoff
	line=$(( i + 1 ))
	message=$( sed "$line s|$|</$color>|" <<< $order )
	message=$( sed -z 's/\n/<br>/g' <<< $message )
	message="<$color>$( stringEscape ${message:0:-4} )"
	pushData relays '{ "state": "'$action'", "message": "'$message'" }'
	[[ $i < $dL ]] && sleep ${delay[i]}
	(( i++ ))
done
if [[ $action == ON && ! -e $dirshm/pidstoptimer && $timer > 0 ]]; then
	echo $timer > $timerfile
	$dirbash/relays-timer.sh &> /dev/null &
fi

$dirbash/status-push.sh
sleep 1
pushData relays '{ "done": '$done' }'
