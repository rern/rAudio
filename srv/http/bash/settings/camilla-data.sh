#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output

if [[ -e $dirshm/btmixer ]]; then
	bluetooth=true
	btmixer=$( sed 's/ *-* A2DP//' $dirshm/btmixer )
else
	bluetooth=false
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
file_config=$( getVar CONFIG /etc/default/camilladsp )
volumemax=$( volumeMaxGet )
##########
data='
, "bluetooth"   : '$bluetooth'
, "btmixer"     : "'$btmixer'"
, "configname"  : "'$( basename "$file_config" )'"
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
for d in coeffs configs raw; do
	if [[ $d == coeffs ]]; then
		dirs=$( ls $dircamilladsp/$d | grep -v '\.wav$' )
		ls+=', "'$d'": '$( line2array "$dirs" )
		dirs=$( ls $dircamilladsp/$d | grep '\.wav$' )
		ls+=', "coeffswav": '$( line2array "$dirs" )
	else
		[[ $d == configs ]] && dir=$( dirname "$file_config" ) || dir=$dircamilladsp/$d
		dirs=$( ls "$dir" )
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