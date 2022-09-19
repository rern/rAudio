#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=${tmpradio[1]//\"/\\\"}
pos=$( mpc | grep '\[playing' | cut -d' ' -f2 | tr -d '#' )
song=$(( ${pos/\/*} - 1 ))
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg

while true; do
	title=$( cat $filelabel 2> /dev/null )
	[[ ! $title ]] && sleep 10 && continue
	
	name=$( echo $title | tr -d ' \"`?/#&'"'" )
	coverart=/data/shm/webradio/$name.$( date +%s ).jpg
	coverfile=/srv/http/data/shm/webradio/$name.jpg
	[[ -e $coverfile ]] && changedtitle= || changedtitle=1
	if ! cmp -s $filecover $coverfile; then # change later than title or multiple
		changedcover=1
		cp $filecover $coverfile &> /dev/null
		sed -i -E 's|^(coverart=").*|\1'$coverart'"|' $dirshm/status
	else
		changedcover=
	fi
	if [[ $changedtitle ]]; then
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
, "sampling" : "'$pos' &bull; 48 kHz 160 kbit/s"
, "state"    : "play"
, "song"     : '$song'
, "station"  : ""
, "Time"     : false
, "Title"    : "'$title'"
}'
		$dirbash/status-push.sh statusradio "$data" &
	elif [[ $changedcover ]]; then
		pushstream coverart '{"type":"coverartplayback","url":"'$coverart'"}'
	fi
	sleep 10
done
