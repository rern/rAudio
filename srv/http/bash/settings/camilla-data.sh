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
, "card"       : '$card'
, "cardname"   : "'$name'"
, "configname" : "'$( basename $configfile )'"
, "control"    : "'$mixer'"
, "devices"    : {
	  "capture"  : { '$devicesC' }
	, "playback" : { '$devicesP' }
}
, "player"     : "'$( < $dirshm/player )'"
, "pllength"   : '$( mpc status %length% )'
, "state"      : "'$( mpcState )'"
, "volume"     : '$( [[ $mixer ]] && volumeGet )'
, "volumemax"  : '$( volumeMaxGet )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for d in $dirs; do
	[[ $bluetooth && $d == configs ]] && dir=configs-bt || dir=$d
	dirs=$( ls -1 $dircamilladsp/$dir )
	ls+=', "'$d'": '$( line2array "$dirs" )
done
########
	data+='
, "ls"         : { '${ls:1}' }'

data2json "$data" $1