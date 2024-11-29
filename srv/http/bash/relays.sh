#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/relays.conf

if [[ ! $1 ]]; then
	relayson=1
	pins=$on
	onoff=1
	delay=( $ond )
	color=wh
else
	killProcess relaystimer
	pins=$off
	onoff=0
	delay=( $offd )
	color=gr
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
	message=$( sed -z 's/\n/<br>/g; s/<br>$//' <<< $message )
	message=$( quoteEscape $message )
	[[ ! $relayson ]] && message="<wh>$message</wh>"
	notify 'relays blink' '' $message -1
	[[ ${delay[i]} ]] && sleep ${delay[i]}
	(( i++ ))
done
if [[ $relayson ]]; then
	done=true
	touch $dirshm/relayson
	[[ $timeron ]] && $dirbash/relays-timer.sh &> /dev/null &
else
	done=false
	killProcess relaystimer
	rm -f $dirshm/relayson
fi
sleep 1
pushData relays '{ "done": '$done' }'
