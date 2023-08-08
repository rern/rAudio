#!/bin/bash

data=$( /srv/http/bash/settings/camilla.py )

[[ $? != 0 ]] && echo notrunning && exit

aplay=$( aplay -l | grep ^card )
playback=$( grep -v Loopback <<< $aplay | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
playback+="
$( grep Loopback <<< $aplay | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
arecord=$( arecord -l | grep ^card )
capture=$( grep -v Loopback <<< $arecord | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
capture+="
$( grep Loopback <<< $arecord | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"

data=${data:0:-1}
data+='
, "clipped" : '$( cat /dev/shm/clipped 2> /dev/null || echo 0 )'
, "devices" : {
	  "capture"  : [ '$( echo $capture | tr ' ' , )' ]
	, "playback" : [ '$( echo $playback | tr ' ' , )' ]
}

}'

echo $data
