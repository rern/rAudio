#!/bin/bash

# Radio France metadata
# status-radiofrance.sh FILENAME
dirtmp=/srv/http/data/shm/

name=$( basename "$1" )
name=${name/-*}
[[ $name != fip && $name != francemusique ]] && name=$( echo $name | sed 's/fip\|francemusique//' )
case ${name/-*} in
	fip )        id=7;;
	electro )    id=74;;
	groove )     id=66;;
	jazz )       id=65;;
	nouveautes ) id=70;;
	pop )        id=78;;
	reggae )     id=71;;
	rock )       id=64;;
	world )      id=69;;
	francemusique )       id=4;;
	baroque )             id=408;;
	classiqueplus )       id=402;;
	concertsradiofrance ) id=403;;
	easyclassique )       id=401;;
	labo )                id=407;;
	lacontemporaine )     id=406;;
	lajazz )              id=405;;
	ocoramonde )          id=404;;
	opera )               id=409;;
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
	title=${metadata[1]}
	album=${metadata[2]}
	url=${metadata[3]}
	endtime=${metadata[4]}
	servertime=${metadata[5]}
	[[ $endtime == null ]] && exit
	
	name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
	coverfile=$dirtmp/online-$name.jpg
	[[ ! -e $coverfile ]] && rm -f $dirtmp/online-*
	[[ -n $url ]] && curl -s $url -o $coverfile
	[[ -e $coverfile ]] && coverart=/data/shm/online-$name.$( date +%s ).jpg
	artist=$( echo $artist | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	title=$( echo $title | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	album=$( echo $album | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	data='{"Artist":"'$artist'", "Title":"'$title'", "Album": "'$album'", "coverart": "'$coverart'", "radio": 1}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	
	echo "\
$artist
$title
$album
$coverart
" > $dirtmp/radiometa
	localtime=$( date +%s )
	diff=$(( $localtime - $servertime )) # local time fetched after server time
	sec2change=$(( $endtime - $servertime - $diff + 10 )) # seconds with 10s delay
	(( $sec2change > 0 )) && sleep $sec2change
	metadataGet
}

metadataGet
