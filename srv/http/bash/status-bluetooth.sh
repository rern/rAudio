#!/bin/bash

# RPi as renderer - status.sh > this:
#    - retreive current status from dbus

. /srv/http/bash/common.sh

dest=$( < $dirshm/bluetoothdest )
data=$( dbus-send \
			--system \
			--type=method_call \
			--print-reply \
			--dest=org.bluez $dest \
			org.freedesktop.DBus.Properties.GetAll \
			string:org.bluez.MediaPlayer1 \
			| grep -E -A1 'string.*Status|string.*Title|string.*Album|string.*Artist|string.*Duration|string.*Position' \
			| sed -E 's/^\s*string "|^\s*variant\s*string "|^\s*variant\s*uint32 //; s/"$//' \
			| tr '\n' ^ \
			| sed 's/\^--\^/\n/g; s/\^$//' )
Artist=$( grep ^Artist <<< $data | cut -d^ -f2 )
Title=$( grep ^Title <<< $data | cut -d^ -f2 )
Album=$( grep ^Album <<< $data | cut -d^ -f2 )
Position=$( grep ^Position <<< $data | cut -d^ -f2 )
Duration=$( grep ^Duration <<< $data | cut -d^ -f2 )
Status=$( grep ^Status <<< $data | cut -d^ -f2 )
case $Status in
	paused )  state=pause;;
	playing ) state=play;;
	stopped ) state=stop;;
esac

name=$( alphaNumeric $Artist$Album )
onlinefile=$( ls $dirshm/online/$name.* 2> /dev/null ) # jpg / png
if [[ -e $onlinefile ]]; then
	coverart="${onlinefile:9}"
else
	$dirbash/status-coverartonline.sh "cmd
$Artist
$Album
CMD ARTIST ALBUM" &> /dev/null &
fi
[[ ! $Position ]] && elapsed=false || elapsed=$( calc 0 $Position/1000 )
[[ ! $Duration ]] && Time=false || Time=$( calc 0 $Duration/1000 )
timestamp=$( date +%s%3N )

data='
, "Artist"    : "'$Artist'"
, "Title"     : "'$Title'"
, "Album"     : "'$Album'"
, "coverart"  : "'$coverart'"
, "elapsed"   : '$elapsed'
, "sampling"  : "Bluetooth"
, "state"     : "'$state'"
, "Time"      : '$Time'
, "timestamp" : '$timestamp

echo "$data"
