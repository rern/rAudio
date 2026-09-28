#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh
. $dirshm/output
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	name=$( sed 's/ *-* A2DP//' $dirshm/btmixer )
fi
if [[ $mixer ]]; then
	volume=$( volumeGet )
	volumemute=$( getContent $dirsystem/volumemute 0 )
else
	db=$( websocat --text ws://127.0.0.1:1234 <<< '"GetVolume"' | jq .GetVolume.value )
	volume=$( echo $db | awk -v db="$db" -v min=-60 -v max=0 '
							BEGIN {
								min *= 100; max *= 100; db *= 100   # to centidB
								range = max - min
								if (range <= 2400) {                # <=24dB -> linear scale
									norm = (db - min) / range
								} else {
									norm = 10 ^ ((db - max) / 6000.0)
									min_norm = 10 ^ ((min - max) / 6000.0)
									norm = (norm - min_norm) / (1 - min_norm)
								}
								if (norm < 0) norm = 0
								if (norm > 1) norm = 1
								p = norm * 100
								printf "%d\n", (p + (p >= 0 ? 0.5 : -0.5))
							}' )
	mute=$( websocat --text ws://127.0.0.1:1234 <<< '"GetMute"' | jq .GetMute.value )
	if [[ $mute == true ]]; then
		volumemute=$volume
		volume=0
	else
		volumemute=0
	fi
fi
volumemax=$( volumeMaxGet )
##########
data='
, "bluetooth"   : '$bluetooth'
, "btreceiver"  : '$( exists $dirshm/btmixer )'
, "cardname"    : "'$name'"
, "configname"  : "'$( sed -n '/^CONFIG/ {s|.*/||; p}' /etc/default/camilladsp )'"
, "control"     : "'$mixer'"
, "devices"     : '$( < $dirshm/hwparams )'
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