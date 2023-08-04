#!/bin/bash

data=$( /srv/http/bash/settings/camilla.py )

[[ $? != 0 ]] && echo notrunning && exit

aplay=$( aplay -l | grep ^card )
cards=$( grep -v Loopback <<< $aplay | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
cards+="
$( grep Loopback <<< $aplay | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"

data=${data:0:-1}
data+='
, "device"  : [ '$( echo $cards | tr ' ' , )' ]
, "display" : { "device" : true }
}'

echo $data
