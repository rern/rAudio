#!/bin/bash

: << EOF
properties list:
	busctl \
		--system \
		introspect \
		org.gnome.ShairportSync \
		/org/gnome/ShairportSync
monitor:
	dbus-monitor \
		--system \
		"type=signal,
		interface=org.freedesktop.DBus.Properties,
		member=PropertiesChanged,
		path=/org/gnome/ShairportSync"
EOF

dbusMeta() {
	busctl \
		--system \
		--json=short \
		get-property org.gnome.ShairportSync \
		/org/mpris/MediaPlayer2 \
		org.mpris.MediaPlayer2.Player \
		$1
}
dbusStatus() {
	[[ $1 == OutputFormat ]] && RemoteControl= || RemoteControl=.RemoteControl
	busctl \
		--system \
		--json=short \
		get-property org.gnome.ShairportSync \
		/org/gnome/ShairportSync \
		org.gnome.ShairportSync$RemoteControl \
		$1
}

PlayerState=$( dbusStatus PlayerState | jq -r .data )
[[ $PlayerState == 'Not Available' ]] && exit
#-------------------------------------------------------------------------------
pause=false
play=false
stop=false
case $PlayerState in
	Paused )  state=pause; pause=true;;
	Playing ) state=play;  play=true;;
	Stopped ) state=stop;  stop=true;;
esac
# start/current/end - emits on start play or change track
#	- random start number @sampling / seconds
#	- not update during play
#	- elapsed = current + now - timestamp when emits (must be explicitly set)
ProgressString=$( dbusStatus ProgressString | jq -r .data )
start=${ProgressString/\/*}
current=$( cut -d/ -f2 <<< $ProgressString )
format=$( dbusStatus OutputFormat | jq -r .data ) # 48000/S16_LE/2
[[ $format ]] && sampling=$( cut -d/ -f1 <<< $format ) || sampling=48000 
sampling=$( dbusStatus OutputFormat | jq -r .data | cut -d/ -f1 ) # 48000/S16_LE/2
[[ ! $sampling ]] && sampling=48000 
elapsed=$(( ( current - start ) / sampling ))

readarray -t metadata < <( dbusMeta Metadata \
								| jq -r '.data["xesam:artist"].data[0],
										.data["xesam:title"].data,
										.data["xesam:album"].data,
										.data["mpris:length"].data,
										.data["mpris:artUrl"].data' )
Artist=${metadata[0]}
Title=${metadata[1]}
Album=${metadata[2]}
Time=$(( ( ${metadata[3]} + 500000 ) / 1000000 ))
#elapsed=$(( ( $( dbusMeta Position ) + 500000 ) / 1000000 )) # next version
file_cover=${metadata[4]:7} # file:///tmp/shairport-sync/.cache/coverart/cover-....jpg

echo '{
  "Artist": "'$Artist'"
, "Title": "'$Title'"
, "Album": "'$Album'"
, "elapsed": '$elapsed'
, "Time": '$Time'
, "state": "'$state'"
, "coverart": "'$file_cover'"
, "ProgressString": "'$ProgressString'"
}' | jq