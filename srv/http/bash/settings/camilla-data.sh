#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output

devicesC='"Loopback": "hw:Loopback,0"'
devicesP=$( tr -d {} < $dirshm/devices )
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	name=$( < $dirshm/btreceiver )
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	grep -q dbus_path "$configfile" && devicesC+=', "Bluez": "bluez"' && devicesP+=', "blueALSA": "bluealsa"'
fi
########
data='
, "bluetooth"  : '$bluetooth'
, "cardname"   : "'$name'"
, "channels"   : '$( < $dirshm/channels )'
, "control"    : "'$mixer'"
, "devices"    : {
	  "capture"  : { '$devicesC' }
	, "playback" : { '$devicesP' }
}
, "formats"    : '$( < $dirshm/formats )'
, "samplings"  : '$( < $dirshm/samplings )'
, "player"     : "'$( < $dirshm/player )'"
, "pllength"   : '$( mpc status %length% )'
, "state"      : "'$( stateMPD )'"
, "volume"     : '$( [[ $mixer ]] && volumeGet value )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for dir in $dirs; do
########
	data+='
, "ls'$dir'" : [ '$( ls -1 $dircamilladsp/$dir | tr '\n' ^ | sed 's/\^$/"/; s/^/"/; s/\^/", "/g' )' ]'
done
data2json "$data" $1