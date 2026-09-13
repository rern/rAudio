#!/bin/bash

. /srv/http/bash/common.sh

file_label=$dirdabradio/DABlabel.txt # output from dab-start.sh - dab-rtlsdr-3
file_slide=$dirdabradio/DABslide.jpg # ^^
station=$( < $dirshm/radio )

for i in {0..9}; do
	[[ -e $file_label ]] && break
	
	sleep 5
done

while true; do
	label=$( < $file_label )
	[[ $label == $label_prev ]] && continue
	
	label_prev=$label
	artist_title=$( sed -E 's/ - |: /^/' <<< $label )
	if [[ $artist_title == *^* ]]; then
		artist=${artist_title/^*}
		title=${artist_title/*^}
	else
		title=$artist_title
	fi
	coverart=$dirdata/online/$( alphaNumeric $label ).jpg
	cp -f $file_slide $coverart
	STATUS='{
  "Album"     : ""
, "Artist"    : "'$( quoteEscape $artist )'"
, "coverart"  : "'$coverart'"
, "play"      : true
, "state"     : "play"
, "station"   : "'$station'"
, "Time"      : 0
, "timestamp" : '$( date +%s%3N )'
, "Title"     : "'$( quoteEscape $title )'"
, "webradio"  : true
}'
	$dirbash/status-push.sh "$STATUS"
	coverFileLimit
	sleep 10
done
