#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output

default=$( < /etc/default/camilladsp )
configfile=$( sed -n '/^CONFIG/ {s/.*=//; p}' <<< $default )
if grep -q -m1 configs-bt <<< $default; then
	bluetooth=true
	name=$( < $dirshm/btname )
	grep -q dbus_path "$configfile" && devicesC+=', "Bluez": "bluez"' && devicesP+=', "blueALSA": "bluealsa"'
else
	devicesC='"Loopback": "hw:Loopback,0"'
	devicesP=$( tr -d {} < $dirshm/devices )
fi

########
data='
, "bluetooth"  : '$bluetooth'
, "btreceiver" : '$( exists $dirshm/btreceiver )'
, "buffer"     : '$( sed -n '/chunksize/ {s/.* //; p}' $configfile )'
, "card"       : '$card'
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
, "state"      : "'$( mpcState )'"
, "volume"     : '$( [[ $mixer ]] && volumeGet )'
, "volumemax"  : '$( volumeMaxGet )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for dir in $dirs; do
########
	data+='
, "ls'$dir'" : [ '$( ls -1 $dircamilladsp/$dir | tr '\n' ^ | sed 's/\^$/"/; s/^/"/; s/\^/", "/g' )' ]'
done
data2json "$data" $1