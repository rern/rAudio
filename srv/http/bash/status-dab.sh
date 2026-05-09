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
	coverart=
	if [[ $( awk NF $filecover ) ]]; then
		name=$( alphaNumeric $title )
		coverfile=/srv/http/data/shm/webradio/$name.jpg
		if ! cmp -s $filecover $coverfile; then # change later than title or multiple covers
			cp -f $filecover $coverfile
			coverart="${coverfile:9}"
		fi
	fi
	$dirbash/status-push.sh "cmd
$album
$artist
$coverart
$title
CMD ALBUM ARTIST COVERART TITLE"
	sleep 10
done
