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
, "state"      : "'$( getVar state $dirshm/status )'"
, "volume"     : '$( [[ $mixer ]] && volumeGet )'
, "volumemax"  : '$( volumeMaxGet )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for d in $dirs; do
	[[ $bluetooth && $d == configs ]] && dir=configs-bt || dir=$d
	if [[ $dir == coeffs ]]; then
		dirs=$( ls $dircamilladsp/$dir | grep -v '\.wav$' )
		ls+=', "'$d'": '$( line2array "$dirs" )
		dirs=$( ls $dircamilladsp/$dir | grep '\.wav$' )
		ls+=', "coeffswav": '$( line2array "$dirs" )
	else
		dirs=$( ls $dircamilladsp/$dir )
		dirs=$( line2array "$dirs" )
		ls+=', "'$d'": '$dirs
		[[ $d == configs ]] && list=$dirs
	fi
done
########
	data+='
, "list"       : { "camilla": '$list' }
, "ls"         : { '${ls:1}' }'

data2json "$data" $1