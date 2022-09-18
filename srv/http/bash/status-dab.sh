#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=${tmpradio[1]//\"/\\\"}
pos=$( mpc | grep '\[playing' | cut -d' ' -f2 | tr -d '#' )
song=$(( ${pos/\/*} - 1 ))
filelabel=$dirshm/webradio/DABlabel.txt
touch $filelabel

while read line; do
	title=$( cat $filelabel | tr -d ' \"`?/#&'"'" )
	coverart=/data/shm/webradio/$title.jpg
	mv $dirshm/webradio/DABslide{,$title}.jpg &> /dev/null
	elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| grep ^elapsed \
				| cut -d' ' -f2 ) )
	data='{
  "Album"    : "DAB Radio"
, "Artist"   : "'$station'"
, "coverart" : "'$coverart'"
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "dabradio"
, "sampling" : "$pos &bull; 48 kHz 160 kbit/s"
, "state"    : "play"
, "song"     : '$song'
, "station"  : ""
, "Time"     : false
, "Title"    : "'$title'"
}'
	$dirbash/status-push.sh statusradio "$data" &
done < <( inotifywait -mq -e close_write $filelabel )
