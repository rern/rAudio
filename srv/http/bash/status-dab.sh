#!/bin/bash

. /srv/http/bash/common.sh

. $dirshm/radio
album='DAB Radio'
artist=$( head -1 $file )
filelabel=$dirshm/webradio/DABlabel.txt
filecover=$dirshm/webradio/DABslide.jpg
filetitle=$dirshm/webradio/DABtitle

while true; do
	# title
	label=$( awk NF $filelabel )
	if [[ ! $label ]] || cmp -s $filelabel $filetitle; then
		[[ ! $label ]] && pushData mpdradio '{ "Title": "" }'
		sleep 10
		continue
	fi
	
	cp -f $filelabel $filetitle
	title=$( < $filetitle )
	elapsed=$( mpcElapsed )
	data='
  "Album"    : "'$album'"
, "Artist"   : "'$artist'"
, "elapsed"  : '$elapsed'
, "Title"    : "'$title'"'
	pushData mpdradio "{ $data }"
	# coverart
	coverart=
	if [[ $( awk NF $filecover ) ]]; then
		name=$( tr -d ' \"`?/#&'"'" < $filetitle )
		coverfile=/srv/http/data/shm/webradio/$name.jpg
		if ! cmp -s $filecover $coverfile; then # change later than title or multiple covers
			cp -f $filecover $coverfile
			coverart="${coverfile:9}"
			sed -i -E "s/^(coverart=).*/\1$coverart/" $dirshm/status
		fi
	fi
	pushDataCoverart "$coverart"
	radioStatusFile
	sleep 10
done
