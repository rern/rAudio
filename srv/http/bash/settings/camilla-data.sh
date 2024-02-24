#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh

arecord=$( arecord -l | grep ^card )
capture=$( grep -v Loopback <<< $arecord | sed -E -n '/^card/ { s/^card (.): .*device (.): .*/"hw:\1,\2"/; p}' )
capture+="
$( grep 'Loopback.*device 0' <<< $arecord | sed -E -n '/^card/ { s/^.*device (.): .*/"hw:Loopback,\1"/; p}' )"
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	if grep -q dbus_path "$configfile"; then
		capture+='
"Bluez"'
	else
		playback+='
"bluealsa"'
	fi
fi
. $dirshm/output
[[ $mixer == false ]] && mixer=
. <( grep -E '^player|^state' $dirshm/status )
########
data='
, "bluetooth"  : '$bluetooth'
, "card"       : '$card'
, "cardname"   : "'$name'"
, "control"    : "'$mixer'"
, "devices"    : {
	  "capture"  : [ '$( echo $capture | tr ' ' , )' ]
	, "playback" : '$( < $dirshm/listdevice )'
}
, "listformat" : {
	  "capture"  : '$( < $dirshm/listformat-c )'
	, "playback" : '$( < $dirshm/listformat )'
}
, "player"     : "'$player'"
, "pllength"   : '$( mpc status %length% )'
, "state"      : "'$state'"
, "volume"     : '$( [[ $mixer ]] && volumeGet value )'
, "volumemute" : '$( getContent $dirsystem/volumemute 0 )
dirs=$( ls $dircamilladsp )
for dir in $dirs; do
########
	data+='
, "ls'$dir'" : [ '$( ls -1 $dircamilladsp/$dir | tr '\n' ^ | sed 's/\^$/"/; s/^/"/; s/\^/", "/g' )' ]'
done
data2json "$data" $1