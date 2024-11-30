#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	name=$( < $dirshm/btname )
fi
data='
, "bluetooth"  : '$bluetooth'
, "btreceiver" : '$( exists $dirshm/btreceiver )'
, "card"       : '$card'
, "cardname"   : "'$name'"
, "configname" : "'$( sed -n '/^CONFIG/ {s|.*/||; p}' /etc/default/camilladsp )'"
, "control"    : "'$mixer'"
, "devices"    : '$( < $dirshm/hwparams )'
, "player"     : "'$( < $dirshm/player )'"
, "pllength"   : '$( mpc status %length% )'
, "state"      : "'$( mpcState )'"
, "volume"     : '$( [[ $mixer ]] && volumeGet )'
, "volumemax"  : '$( volumeMaxGet )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for d in $dirs; do
	[[ $bluetooth && $d == configs ]] && dir=configs-bt || dir=$d
	dirs=$( ls $dircamilladsp/$dir )
	ls+=', "'$d'": '$( line2array "$dirs" )
done
########
	data+='
, "ls"         : { '${ls:1}' }'

data2json "$data" $1