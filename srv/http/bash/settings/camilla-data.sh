#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output

if [[ -e $file_volumemute ]]; then
	volume=0
	volumemute=$( < $file_volumemute )
else
	volume=$( volume.Camilla )
	volumemute=0
fi
file_config=$( getVar CONFIG /etc/default/camilladsp )
dir_configs=$( dirname "$file_config" )
files=$( find $dir_configs -maxdepth 1 -type f -name *.yml -printf '%f\n' ) # .../configs/..., ../configs/XX:XX:XX...
ls+=', "configs": '$( line2array "$files" )
files=$( ls $dircamilladsp/coeffs | grep -v '\.wav$' )
ls+=', "coeffs": '$( line2array "$files" )
files=$( ls $dircamilladsp/coeffs | grep '\.wav$' )
ls+=', "coeffswav": '$( line2array "$files" )
files=$( ls $dircamilladsp/raw )
ls+=', "raw": '$( line2array "$files" )
##########
data='
, "bluetooth"  : '$( exists $dirshm/sink )'
, "configname" : "'$( basename "$file_config" )'"
, "control"    : "'$mixer'"
, "fileconfig" : "'$file_config'"
, "ls"         : { '${ls:1}' }
, "mixer"      : "'$( getVar mixer $dirshm/output )'"
, "play"       : '$( jq .play $dirshm/status.json )'
, "player"     : "'$( < $dirshm/player )'"
, "pllength"   : '$( mpc status %length% )'
, "state"      : "'$( jq -r .state $dirshm/status.json )'"
, "volume"     : '$volume'
, "volumemute" : '$volumemute
##########
data+=$( dataPlayback )

data2json "$data" $1