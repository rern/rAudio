#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output
if grep -q configs-bt /etc/default/camilladsp; then
	btmixer=$( sed 's/ *-* A2DP//' $dirshm/btmixer )
else
	mixer=$( getVar mixer $dirshm/output )
fi
file_volumemute=$dirsystem/volumemute
if [[ -e $file_volumemute ]]; then
	volume=0
	volumemute=$( < $file_volumemute )
else
	volume=$( volumeGetCamilla )
	volumemute=0
fi
volumemax=$( volumeMaxGet )
##########
data='
, "btmixer"     : "'$btmixer'"
, "configname"  : "'$( sed -n '/^CONFIG/ {s|.*/||; p}' /etc/default/camilladsp )'"
, "control"     : "'$mixer'"
, "devices"     : '$( < $dirshm/hwparams )'
, "mixer"       : "'$mixer'"
, "play"        : '$( jq .play $dirshm/status.json )'
, "player"      : "'$( < $dirshm/player )'"
, "pllength"    : '$( mpc status %length% )'
, "state"       : "'$( jq -r .state $dirshm/status.json )'"
, "volume"      : '$volume'
, "volumelimit" : '$( [[ $volumemax -lt 100 && -e $dirsystem/volumelimit ]] && echo true )'
, "volumemax"   : '$volumemax'
, "volumemute"  : '$volumemute
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