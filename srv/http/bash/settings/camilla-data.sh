#!/bin/bash

. /srv/http/bash/common.sh

data=$( $dirsettings/camilla.py )

[[ ! $data ]] && echo notrunning && exit

aplay=$( aplay -l | grep ^card )
playback=$( grep -v Loopback <<< $aplay | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
playback+="
$( grep 'Loopback.*device 1' <<< $aplay | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
arecord=$( arecord -l | grep ^card )
capture=$( grep -v Loopback <<< $arecord | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
capture+="
$( grep 'Loopback.*device 0' <<< $arecord | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
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
readarray -t vcc <<< $( volumeCardControl )
volume=${vcc[0]}
card=${vcc[1]}
control=${vcc[2]}
[[ -e $dirsystem/volumemute ]] && volumemute=$( < $dirsystem/volumemute ) || volumemute=0
	
data=${data:1:-1}
data+='
, "bluetooth" : '$bluetooth'
, "card"      : '$card'
, "clipped"   : '$( cat $dirshm/clipped 2> /dev/null || echo 0 )'
, "control"   : "'$control'"
, "devices"   : {
	  "capture"  : [ '$( echo $capture | tr ' ' , )' ]
	, "playback" : [ '$( echo $playback | tr ' ' , )' ]
}
, "player"    : "'$( < $dirshm/player )'"
, "range"     : '$( conf2json camilla.conf )'
, "state"     : "'$( getVar state $dirshm/status )'"
, "volume"    : '$volume'
, "volumemute"   : '$volumemute

data2json "$data" $1
