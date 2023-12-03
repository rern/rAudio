#!/bin/bash

. /srv/http/bash/common.sh

. $dirshm/radio
pos=$( mpc status %songpos% )
total=$( mpc status %length% )
sampling="$pos/$total • 48 kHz 160 kbit/s • DAB"
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg
filetitle=$dirshm/webradio/DABtitle

while true; do
	# title
	[[ ! $( awk NF $filelabel ) ]] && sleep 10 && continue
	
	if ! cmp -s $filelabel $filetitle; then
		cp -f $filelabel $filetitle
		elapsed=$( mpcElapsed )
		data='
  "Album"    : "DAB Radio"
, "Artist"   : "'$station'"
, "coverart" : ""
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "dabradio"
, "sampling" : "'$sampling'"
, "state"    : "play"
, "station"  : ""
, "Time"     : false
, "Title"    : "'$( < $filetitle )'"
, "webradio" : true'
		pushData mpdradio "{ $data }"
		sed 's/^.."//; s/" *: /=/' <<< $data > $dirshm/status
		$dirbash/status-push.sh statusradio &
	fi
	# coverart
	[[ ! $( awk NF $filecover ) ]] && sleep 10 && continue
	
	name=$( tr -d ' \"`?/#&'"'" < $filetitle )
	coverfile=/srv/http/data/shm/webradio/$name.jpg
	if ! cmp -s $filecover $coverfile; then # change later than title or multiple covers
		cp -f $filecover $coverfile
		coverart="${coverfile:9}"
		sed -i -e '/^coverart=/ d
' -e "$ a\
coverart=$coverart
" $dirshm/status
		pushData coverart '{ "url": "'$coverart'", "type": "coverart" }'
	fi
	sleep 10
done
