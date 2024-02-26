#!/bin/bash

! systemctl -q is-active camilladsp && echo notrunning && exit

. /srv/http/bash/common.sh

devicesC='"Loopback": "hw:Loopback,0"'
devicesP=$( tr -d {} < $dirshm/listdevice )
if grep -q configs-bt /etc/default/camilladsp; then
	bluetooth=true
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	grep -q dbus_path "$configfile" && devicesC+=', "Bluez": "bluez"' && devicesP+=', "blueALSA": "bluealsa"'
fi
. $dirshm/output
[[ $mixer == false ]] && mixer=
. <( grep -E '^player|^state' $dirshm/status )
########
data='
, "bluetooth"  : '$bluetooth'
, "card"       : '$card'
, "cardname"   : "'$name'"
, "channels"   : '$( < $dirshm/channels )'
, "control"    : "'$mixer'"
, "devices"    : {
	  "capture"  : { '$devicesC' }
	, "playback" : { '$devicesP' }
}
, "formats"    : '$( < $dirshm/listformat )'
, "samples"    : '$( < $dirshm/listsample )'
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