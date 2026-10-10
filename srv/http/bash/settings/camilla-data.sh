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
dir_configs=$( dirname "$file_config" )
files=$( find $dir_configs -maxdepth 1 -type f -printf '%f\n' ) # .../configs/..., ../configs/XX:XX:XX...
ls+=', "configs": '$( line2array "$files" )
files=$( ls $dircamilladsp/coeffs | grep -v '\.wav$' )
ls+=', "coeffs": '$( line2array "$files" )
files=$( ls $dircamilladsp/coeffs | grep '\.wav$' )
ls+=', "coeffswav": '$( line2array "$files" )
files=$( ls $dircamilladsp/raw )
ls+=', "raw": '$( line2array "$files" )
volumemax=$( volumeMaxGet )
[[ $volumemax -lt 100 && -e $dirsystem/volumelimit ]] && volumelimit=true
##########
data='
, "bluetooth"   : '$bluetooth'
, "btmixer"     : "'$btmixer'"
, "configname"  : "'$( basename "$file_config" )'"
, "control"     : "'$mixer'"
, "ls"          : { '${ls:1}' }
, "mixer"       : "'$mixer'"
, "play"        : '$( jq .play $dirshm/status.json )'
, "player"      : "'$( < $dirshm/player )'"
, "pllength"    : '$( mpc status %length% )'
, "state"       : "'$( jq -r .state $dirshm/status.json )'"
, "volume"      : '$volume'
, "volumelimit" : '$volumelimit'
, "volumemax"   : '$volumemax'
, "volumemute"  : '$volumemute

data2json "$data" $1