#!/bin/bash

. /srv/http/bash/common.sh

# output from dab-start.sh - dab-rtlsdr-3
filelabel=$dirshm/dabradio/DABlabel.txt
filecover=$dirshm/dabradio/DABslide.jpg
for i in {0..5}; then
	[[ -e $filelabel ]] && break || sleep 10
done

while true; do
	readarray -t artist_title < <( sed 's/ - \|: /\n/' $filelabel )
	if (( ${#artist_title[@]} == 1 )); then
		title=${artist_title[0]}
	else
		artist=${artist_title[0]}
		title=${artist_title[1]}
	fi
	coverart=
	if [[ $( awk NF $filecover ) ]]; then
		name=$( alphaNumeric $title )
		coverfile=/srv/http/data/shm/dabradio/$name.jpg
		if ! cmp -s $filecover $coverfile; then # change later than title or multiple covers
			cp -f $filecover $coverfile
			coverart="${coverfile:9}"
		fi
	fi
	$dirbash/status-push.sh "cmd
$artist
$title
DAB Radio
$coverart
CMD ARTIST TITLE ALBUM COVERART"
	sleep 10
done
