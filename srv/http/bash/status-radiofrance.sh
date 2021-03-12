#!/bin/bash

# Radio France metadata
# status-radiofrance.sh FILENAME

name=$( echo $1 | sed 's|.*/\(.*\)\-.*|\1|' )
case $name in
	fip )           id=7;;
	fipelectro )    id=74;;
	fipgroove )     id=66;;
	fipjazz )       id=65;;
	fipnouveautes ) id=70;;
	fippop )        id=78;;
	fipreggae )     id=71;;
	fiprock )       id=64;;
	fipworld )      id=69;;
	francemusique )                    id=4;;
	francemusiquebaroque )             id=408;;
	francemusiqueclassiqueplus )       id=402;;
	francemusiqueconcertsradiofrance ) id=403;;
	francemusiqueeasyclassique )       id=401;;
	francemusiquelabo )                id=407;;
	francemusiquelacontemporaine )     id=406;;
	francemusiquelajazz )              id=405;;
	francemusiqueocoramonde )          id=404;;
	francemusiqueopera )               id=409;;
esac

metadataGet() {
	readarray -t metadata <<< $( curl -s -m 5 -G \
		--data-urlencode 'operationName=Now' \
		--data-urlencode 'variables={"bannerPreset":"600x600-noTransform","stationId":'$id',"previousTrackLimit":1}' \
		--data-urlencode 'extensions={"persistedQuery":{"version":1,"sha256Hash":"8a931c7d177ff69709a79f4c213bd2403f0c11836c560bc22da55628d8100df8"}}' \
		https://www.fip.fr/latest/api/graphql \
		| jq '.data.now.playing_item, .data.now.server_time' \
		| grep -v '{\|"__typename"\|"start_time"\|}' \
		| sed 's/^\s\+".*": "*//; s/"*,*$//; s/^null$//' )
	
	artist=${metadata[0]}
	title=${metadata[1]}
	url=${metadata[2]}
	name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
	coverfile=/srv/http/data/shm/online-$name.jpg
	if [[ ! -e $coverfile && -n $url ]]; then
		rm -f /srv/http/data/shm/online-*
		curl -s $url -o $coverfile
	fi
	[[ -e $coverfile ]] && coverart=/data/shm/online-$name.$( date +%s ).jpg
	data='{"Artist":"'$artist'", "Title":"'$title'", "coverart": "'$coverart'", "radiofrance": 1}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	
	endtime=${metadata[3]}
	servertime=${metadata[4]}
	localtime=$( date +%s )
	diff=$(( $localtime - $servertime )) # local time fetched after server time
	sec2change=$(( $endtime - $servertime - $diff )) # seconds
	sleep $(( sec2change + 10 )) # add some delay
	metadataGet
}

metadataGet
