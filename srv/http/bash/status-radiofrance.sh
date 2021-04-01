#!/bin/bash

# Radio France metadata
# status-radiofrance.sh FILENAME
dirtmp=/srv/http/data/shm/

name=$( basename "$1" )
case ${name/-*} in
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
		| jq -r \
 .data.now.playing_item.title\
,.data.now.playing_item.subtitle\
,.data.now.song.album\
,.data.now.playing_item.cover\
,.data.now.playing_item.end_time\
,.data.now.server_time )
	artist=${metadata[0]}
	[[ $artist == null ]] && exit
	
	title=${metadata[1]}
	album=${metadata[2]}
	url=${metadata[3]}
	name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
	coverfile=$dirtmp/online-$name.jpg
	if [[ ! -e $coverfile && -n $url ]]; then
		rm -f $dirtmp/online-*
		curl -s $url -o $coverfile
	fi
	if [[ ! -e $coverfile || -z $url ]]; then
		rm -f $dirtmp/online-*
	else
		coverart=/data/shm/online-$name.$( date +%s ).jpg
	fi
	artist=$( echo $artist | sed 's/"/\\"/g; s/null//' )
	title=$( echo $title | sed 's/"/\\"/g; s/null//' )
	album=$( echo $album | sed 's/"/\\"/g; s/null//' )
	data='{"Artist":"'$artist'", "Title":"'$title'", "Album": "'$album'", "coverart": "'$coverart'", "radio": 1}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	
	echo "\
$artist
$title
$album" > $dirtmp/radiometa
	endtime=${metadata[4]}
	servertime=${metadata[5]}
	localtime=$( date +%s )
	diff=$(( $localtime - $servertime )) # local time fetched after server time
	sec2change=$(( $endtime - $servertime - $diff + 10 )) # seconds with 10s delay
	(( $sec2change > 0 )) && sleep $sec2change
	metadataGet
}

metadataGet
