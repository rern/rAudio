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
	order="<wh>$orderon"
	color=wh
else
	killProcess relaystimer
	rm -f $dirshm/{relayson,relaystimer}
	action=OFF
	pins=$off
	onoff=0
	delay=( $offd )
	order="<gr>$orderoff"
	color=gr
fi
dL=${#delay[@]}
i=0
for pin in $pins; do
	gpio -1 mode $pin out
	gpio -1 write $pin $onoff
	line=$(( i + 1 ))
	message=$( sed "$line s|$|</$color>|" <<< $( echo -e $order ) ) # \n      > newline > sed appends color close tag
	message=$( sed -z 's/\n/\\n/g' <<< $message )                   # newline > \n for json
	message=$( stringEscape $message )                              # escape " `
	pushData relays '{ "state": "'$action'", "message": "'$message'" }'
	[[ $i < $dL ]] && sleep ${delay[i]}
	(( i++ ))
done
if [[ $action == ON && ! -e $dirshm/pidstoptimer && $timer > 0 ]]; then
	echo $timer > $timerfile
	$dirbash/relays-timer.sh &> /dev/null &
fi
alsactl store
$dirbash/status-push.sh
sleep 1
pushData relays '{ "done": 1 }'
