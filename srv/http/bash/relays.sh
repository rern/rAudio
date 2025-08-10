#!/bin/bash

. /srv/http/bash/common.sh
. $dirsystem/relays.conf

if [[ $1 == reset ]]; then
	$dirbash/relays-timer.sh &> /dev/null &
	pushData relays '{ "countdownreset": '$timer' }'
	exit
# --------------------------------------------------------------------
elif [[ $1 == off ]]; then
	killProcess relaystimer
	relayson=false
	pins=$off
	onoff=0
	delay=( $offd )
	color=gr
else
	relayson=true
	pins=$on
	onoff=1
	delay=( $ond )
	color=wh
fi
. <( json2var $dirsystem/relays.json | sed 's/^/p/' )
for pin in $pins; do
	ppin=p$pin
	order+=${!ppin}$'\n'
done
for pin in $pins; do
	gpioset -t0 -c0 $pin=$onoff
	line=$(( i + 1 ))
	sequence=$( sed "$line s|$|</$color>|" <<< "<$color>$order" )
	sequence=$( sed -z 's/\n/<br>/g; s/<br>$//' <<< $sequence )
	sequence=$( quoteEscape $sequence )
	[[ $relayson == false ]] && sequence="<wh>$sequence</wh>"
	pushData relays '{ "sequence": "'$sequence'" }'
	[[ ${delay[i]} ]] && sleep ${delay[i]}
	(( i++ ))
done
if [[ $relayson == true ]]; then
	touch $dirshm/relayson
	[[ $timeron ]] && $dirbash/relays-timer.sh &> /dev/null &
else
	rm -f $dirshm/relayson
fi
sleep 1
pushData relays '{ "sequencedone": '$relayson' }'
