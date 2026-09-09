#!/bin/bash

. /srv/http/bash/common.sh

album=$( < $dirshm/radio )
# output from dab-start.sh - dab-rtlsdr-3
file_label=$dirdabradio/DABlabel.txt
file_slide=$dirdabradio/DABslide.jpg
file_cover=$dirdabradio/cover.jpg

for i in {0..5}; do
	[[ -e $file_label ]] && break || sleep 10
done
while true; do
	lable=$( < $file_label )
	[[ $lable == $lable_prev ]] && continue
	
	lable_prev=$label
	if cmp -s $file_slide $file_cover; then
		coverart=
	else
		cp -f $file_slide $file_cover
		coverart=${file_cover:9}
	fi
	artist_title=$( sed -E 's/ - |: /^/' <<< $label )
	STATUS='{
  "Album"     : "'$album'"
, "Artist"    : "'$( quoteEscape ${artist_title/^*} )'"
, "coverart"  : "'$coverart'"
, "play"      : true
, "state"     : "play"
, "Time"      : 0
, "timestamp" : '$( date +%s%3N )'
, "Title"     : "'$( quoteEscape ${artist_title/*^} )'"
, "webradio"  : true
}'
	$dirbash/status-push.sh "$STATUS"
	sleep 10
done
