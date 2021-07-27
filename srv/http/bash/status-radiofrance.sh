#!/bin/bash

# Radio France metadata
dirsystem=/srv/http/data/system
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

metadataGet() { # run on each 'endtime'
	readarray -t metadata <<< $( curl -s -m 5 -G \
		--data-urlencode "operationName=Now" \
		--data-urlencode 'variables={"bannerPreset":"600x600-noTransform","stationId":'$id',"previousTrackLimit":1}' \
		--data-urlencode 'extensions={"persistedQuery":{"version":1,"sha256Hash":"8a931c7d177ff69709a79f4c213bd2403f0c11836c560bc22da55628d8100df8"}}' \
		--data-urlencode "v=$( date +%s )" \
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
	coverurl=${metadata[3]}
	endtime=${metadata[4]}
	servertime=${metadata[5]}
	if [[ -n $coverurl && ! -e $dirsystem/vumeter ]]; then
		name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
		coverfile=$dirtmp/webradio-$name.jpg
		curl -s $coverurl -o $coverfile
		coverart=/data/shm/webradio-$name.$( date +%s ).jpg
	fi
	echo "\
$artist
$title
$album
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
, "file"     : "'$file'"
, "rprf"     : 1
, "webradio" : true
}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	if [[ -e $dirtmp/snapclientip ]]; then
		readarray -t clientip < $dirtmp/snapclientip
		for ip in "${clientip[@]}"; do
			[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$data"
		done
	fi
	if [[ -e $dirsystem/lcdchar ]]; then
		elapsed=$( { echo clearerror; echo status; sleep 0.05; } \
					| telnet 127.0.0.1 6600 2> /dev/null \
					| awk '/elapsed/ {print $NF}' )
		status=( "$artist" "$title" "$album" play false "$elapsed" $( date +%s%3N ) true "$station" "$file" )
		killall lcdchar.py &> /dev/null
		/srv/http/bash/lcdchar.py "${status[@]}" &
	fi
	/srv/http/bash/cmd.sh onlinefileslimit
	# next fetch (sometime endtime = 0)
	[[ -z $endtime || $endtime == 0 ]] && sec=5 || sec=$(( endtime - servertime + 10 )) # add 10s delay
	sleep $sec
	metadataGet
}

metadataGet
