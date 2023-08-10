#!/bin/bash

. /srv/http/bash/common.sh

data=$( $dirsettings/camilla.py )

[[ $? != 0 ]] && echo notrunning && exit

aplay=$( aplay -l | grep ^card )
playback=$( grep -v Loopback <<< $aplay | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
playback+="
$( grep Loopback <<< $aplay | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
arecord=$( arecord -l | grep ^card )
capture=$( grep -v Loopback <<< $arecord | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
capture+="
$( grep Loopback <<< $arecord | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	if grep -q dbus_path "$configfile"; then
		capture+='
"Bluez"'
	else
		playback+='
"bluealsa"'
	fi
fi

data=${data:1:-1}
data+='
, "bluetooth" : '$bluetooth'
, "clipped"   : '$( cat $dirshm/clipped 2> /dev/null || echo 0 )'
, "devices"   : {
	  "capture"  : [ '$( echo $capture | tr ' ' , )' ]
	, "playback" : [ '$( echo $playback | tr ' ' , )' ]
}'

data2json "$data" $1
