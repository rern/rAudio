#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/relays.conf

if [[ ! $1 ]]; then # no args = on
	touch $dirshm/relayson
	action=on
	pins=$on
	onoff=1
	delay=( $ond )
	color=wh
	done=true
else
	killProcess relaystimer
	rm -f $dirshm/{relayson,relaystimer}
	action=off
	pins=$off
	onoff=0
	delay=( $offd )
	color=gr
	done=false
fi
. <( sed -E -e '/^\{$|^\}$/d; s/^  "//; s/,$//; s/": /=/; s/^/p/' $dirsystem/relays.json ) # faster than jq
for pin in $pins; do
	ppin=p$pin
	order+=${!ppin}$'\n'
done
for pin in $pins; do
	gpioset -t0 -c0 $pin=$onoff
	line=$(( i + 1 ))
	message=$( sed "$line s|$|</$color>|" <<< "<$color>$order" )
	message=$( sed -z 's/\n/<br>/g' <<< $message )
	message=$( quoteEscape $message )
	pushData relays '{ "action": "'$action'", "message": "'$message'" }'
	[[ ${delay[i]} ]] && sleep ${delay[i]}
	(( i++ ))
done
if [[ $timer > 0 && $action == on && ! -e $dirshm/pidstoptimer ]]; then
	echo $timer > $dirshm/relaystimer
	$dirbash/relays-timer.sh &> /dev/null &
fi

sleep 1
pushData relays '{ "done": '$done' }'
