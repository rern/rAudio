#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=$( stringEscape ${tmpradio[1]} )
pos=$( mpc status %songpos% )
total=$( mpc status %length% )
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg
filetitle=$dirshm/webradio/DABtitle

while true; do
	# title
	[[ ! $( awk NF $filelabel ) ]] && sleep 10 && continue
	
	if ! cmp -s $filelabel $filetitle; then
		cp -f $filelabel $filetitle
		data='{
  "Album"    : "DAB Radio"
, "Artist"   : "'$station'"
, "coverart" : ""
, "elapsed"  : '$( mpcElapsed )'
, "file"     : "'$file'"
, "icon"     : "dabradio"
, "sampling" : "'$pos'/'$total' • 48 kHz 160 kbit/s • DAB"
, "state"    : "play"
, "song"     : '$(( $pos - 1 ))'
, "station"  : ""
, "stream"   : true
, "Time"     : false
, "Title"    : "'$( < $filetitle )'"
}'
		pushData mpdradio "$data"
		status=$( sed -e '/^{\|^}/ d' -e 's/^.."//; s/" *: /=/' <<< $data )
		status+='
timestamp='$( date +%s%3N )'
webradio=true
player="mpd"'
		echo "$status" > $dirshm/status
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
