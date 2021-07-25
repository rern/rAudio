#!/bin/bash

# Radio France metadata
dirtmp=/srv/http/data/shm
readarray -t stationdata < $dirtmp/radiofrance
file=${stationdata[0]}
station=${stationdata[1]}
id=${stationdata[2]}
case $id in
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
,.data.now.server_time \
		| sed 's/^null$//' )
	artist=${metadata[0]}
	title=${metadata[1]}
	album=${metadata[2]}
	[[ -z $artist && -z $title && -z $album ]] && exit
	
	coverurl=${metadata[3]}
	endtime=${metadata[4]}
	servertime=${metadata[5]}
	[[ -z $endtime ]] && exit
	
	if [[ -n $coverurl && ! -e /srv/http/data/system/vumeter ]]; then
		name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
		coverfile=$dirtmp/webradio-$name.jpg
		curl -s $coverurl -o $coverfile
		[[ -e $coverfile ]] && coverart=/data/shm/webradio-$name.$( date +%s ).jpg
	fi
	
	echo "\
$artist
$title
$album
play
false
false
true
$station
$file
$coverart" > $dirtmp/status

	artist=${artist//\"/\\\"}
	title=${title//\"/\\\"}
	album=${album//\"/\\\"}
	station=${station//\"/\\\"}
	data='{
  "Artist"   : "'$artist'"
, "Title"    : "'$title'"
, "Album"    : "'$album'"
, "coverart" : "'$coverart'"
, "station"  : "'$station'"
, "radio"    : 1
}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	if [[ -e /srv/http/data/system/lcdchar ]]; then
		elapsed=$( { echo clearerror; echo status; sleep 0.05; } \
					| telnet 127.0.0.1 6600 2> /dev/null \
					| awk '/elapsed/ {print $NF}' )
		data=( "$artist" "$title" "$album" play false "$elapsed" $( date +%s%3N ) true "$station" "$file" )
		killall lcdchar.py &> /dev/null
		/srv/http/bash/lcdchar.py "${data[@]}" &
	fi
	/srv/http/bash/cmd.sh onlinefileslimit
	localtime=$( date +%s )
	diff=$(( $localtime - $servertime )) # local time fetched after server time
	sec2change=$(( $endtime - $servertime - $diff + 10 )) # seconds with 10s delay
	(( $sec2change > 0 )) && sleep $sec2change
	metadataGet
}

metadataGet
