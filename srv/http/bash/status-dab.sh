#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=${tmpradio[1]//\"/\\\"}
pos=$( mpc | grep '\[playing' | cut -d' ' -f2 | tr -d '#' )
song=$(( ${pos/\/*} - 1 ))
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg
filetitle=$dirshm/webradio/DABtitle

while true; do
	# title
	[[ ! $( awk NF $filelabel ) ]] && sleep 10 && continue
	
	if ! cmp -s $filelabel $filetitle; then
		cp -f $filelabel $filetitle
		elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
					| telnet 127.0.0.1 6600 2> /dev/null \
					| grep ^elapsed \
					| cut -d' ' -f2 ) )
		data='{
  "Album"    : "DAB Radio"
, "Artist"   : "'$station'"
, "coverart" : ""
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "dabradio"
, "sampling" : "'$pos' • 48 kHz 160 kbit/s • DAB"
, "state"    : "play"
, "song"     : '$song'
, "station"  : ""
, "Time"     : false
, "Title"    : "'$( < $filetitle )'"
}'
		$dirbash/status-push.sh statusradio "$data" &
	fi
	# coverart
	[[ ! $( awk NF $filecover ) ]] && sleep 10 && continue
	
	name=$( tr -d ' \"`?/#&'"'" < $filetitle )
	coverfile=/srv/http/data/shm/webradio/$name.jpg
	if ! cmp -s $filecover $coverfile; then # change later than title or multiple covers
		cp -f $filecover $coverfile
		coverart=/data/shm/webradio/$name.jpg
		sed -i -e '/^coverart=/ d
' -e "$ a\
coverart=$coverart
" $dirshm/status
		pushstream coverart '{"type":"coverartplayback","url":"'$coverart?v=$( date +%s )'"}'
	fi
	sleep 10
done
