#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh

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
########
data='
, "bluetooth"  : '$bluetooth'
, "card"       : '$card'
, "clipped"    : '$( cat $dirshm/clipped 2> /dev/null || echo 0 )'
, "config"     : '$( $dirsettings/camilla.py getconfig )'
, "control"    : "'$control'"
, "devices"    : {
	  "capture"  : [ '$( echo $capture | tr ' ' , )' ]
	, "playback" : [ '$( echo $playback | tr ' ' , )' ]
}
, "player"     : "'$( < $dirshm/player )'"
, "pllength"   : '$( mpc status %length% )'
, "range"      : '$( conf2json camilla.conf )'
, "state"      : "'$( getVar state $dirshm/status )'"
, "volume"     : '$volume'
, "volumemute" : '$volumemute

for dir in coeffs configs configs-bt; do
########
	data+='
, "ls'$dir'" : [ '$( ls -1 $dircamilladsp/$dir | tr '\n' ^ | sed 's/\^$/"/; s/^/"/; s/\^/", "/g' )' ]'
done

data2json "$data" $1
