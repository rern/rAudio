#!/bin/bash

. /srv/http/bash/common.sh

. $dirshm/radio
pos=$( mpc status %songpos% )
total=$( mpc status %length% )
song=$(( $pos - 1 ))
grep -q radioelapsed.*true $dirsystem/display.json && radioelapsed=1
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg
filetitle=$dirshm/webradio/DABtitle

while true; do
	# title
	[[ ! $( awk NF $filelabel ) ]] && sleep 10 && continue
	
	if ! cmp -s $filelabel $filetitle; then
		cp -f $filelabel $filetitle
		[[ $radioelapsed ]] && elapsed=$( mpcElapsed ) || elapsed=false
		data='
  "Album"    : "DAB Radio"
, "Artist"   : "'$station'"
, "coverart" : ""
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "dabradio"
, "sampling" : "'$pos'/'$total' • 48 kHz 160 kbit/s • DAB"
, "state"    : "play"
, "song"     : '$song'
, "station"  : ""
, "Time"     : false
, "Title"    : "'$( < $filetitle )'"
, "webradio" : true'
		pushData mpdradio "{ $data }"
		data+='
, "webradio"  : true
, "player"    : "mpd"'
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
