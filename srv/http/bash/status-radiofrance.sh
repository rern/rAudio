#!/bin/bash

# Radio France metadata
dirtmp=/srv/http/data/shm
file=$( cat /srv/http/data/shm/radiofrance )
name=$( basename "$file" )
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
	
	if [[ ! -e /srv/http/data/system/vumeter ]]; then
		name=$( echo $artist$title | tr -d ' "`?/#&'"'" )
		coverfile=$dirtmp/webradio-$name.jpg
		[[ -n $url ]] && curl -s $url -o $coverfile
		[[ -e $coverfile ]] && coverart=/data/shm/webradio-$name.$( date +%s ).jpg
	fi
	data="$artist $title $album"
	dataprev=$( cat $dirtmp/webradiodata 2> /dev/null | head -3 )
	[[ ${data// } == ${dataprev// } ]] && exit
	
	echo "\
$artist
$title
$album
$coverart
" > $dirtmp/webradiodata
	artist=$( echo $artist | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	title=$( echo $title | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	album=$( echo $album | sed 's/""/"/g; s/"/\\"/g; s/null//' )
	station=$( cat /srv/http/data/webradios/${file//\//|} | head -1 )
	station=${station/* - }
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
		[[ -z $artist ]] && artist=false
		[[ -z $title ]] && title=false
		[[ -z $album ]] && album=false
		elapsed=$( { echo clearerror; echo status; sleep 0.05; } \
					| telnet 127.0.0.1 6600 2> /dev/null \
					| grep elapsed )
		data=( "$artist" "$title" "$album" "play" false "${elapsed/* }" $( date +%s%3N ) "$station" "$file" true )
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
