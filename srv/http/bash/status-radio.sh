#!/bin/bash

. /srv/http/bash/common.sh

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=${tmpradio[1]//\"/\\\"}
id=${tmpradio[2]}
pos=$( mpc | grep '\[playing' | cut -d' ' -f2 | tr -d '#' )
sampling="$pos &bull; ${tmpradio[3]}"
song=$(( ${pos/\/*} - 1 ))

case $id in
	flac )   id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	world )  id=3;;
	fip )           id=7;;
	fipelectro )    id=74;;
	fipgroove )     id=66;;
	fipjazz )       id=65;;
	fipnouveautes ) id=70;;
	fippop )        id=78;;
	fipreggae )     id=71;;
	fiprock )       id=64;;
	fipworld )      id=69;;
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

radiofranceData() {
	readarray -t metadata <<< $( curl -sGk -m 5 \
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
		| sed 's/""/"/g; s/^null$//' ) # trim 2 x doublequotes and null(jq empty value)
}
radioparadiseData() {
	readarray -t metadata <<< $( curl -sGk -m 5 \
		--data-urlencode "chan=$id" \
		https://api.radioparadise.com/api/now_playing \
		| jq -r .artist,.title,.album,.cover,.time \
		| sed 's/^null$//' )
}
metadataGet() {
	if [[ $id < 4 ]]; then
		icon=radioparadise
		radioparadiseData
	else
		icon=radiofrance
		radiofranceData
	fi
	artist=${metadata[0]//\"/\\\"}
	title=${metadata[1]//\"/\\\"}
	album=${metadata[2]//\"/\\\"}
	coverurl=${metadata[3]}
	countdown=${metadata[4]} # countdown
	if [[ ! $album && ! $title ]]; then
		sleep 5
		metadataGet
		return
	fi
	
	if [[ ! $countdown ]]; then
		countdown=5
	elif [[ ${#metadata[@]} == 6 ]]; then
		countdown=$(( countdown - ${metadata[5]} )) # radiofrance
	fi
	if [[ ! -e $dirsystem/vumeter ]]; then
		name=$( echo $artist$title | tr -d ' \"`?/#&'"'" )
		if [[ $coverurl ]]; then
			coverart=/data/shm/webradio/$name.jpg
			curl -s $coverurl -o $dirshm/webradio/$name.jpg
		else
			coverart=$( ls $dirshm/webradio/$name* 2> /dev/null | sed 's|/srv/http||' )
			[[ ! $coverart ]] && $dirbash/status-coverartonline.sh "\
$artist
title
webradio" &> /dev/null &
		fi
	fi
	elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| grep ^elapsed \
				| cut -d' ' -f2 ) )
	data='{
  "Album"    : "'$album'"
, "Artist"   : "'$artist'"
, "coverart" : "'$coverart'"
, "elapsed"  : '$elapsed'
, "file"     : "'$file'"
, "icon"     : "'$icon'"
, "sampling" : "'$sampling'"
, "state"    : "play"
, "song"     : '$song'
, "station"  : "'$station'"
, "Time"     : false
, "Title"    : "'$title'"
}'
	$dirbash/status-push.sh statusradio "$data" & # for snapcast ssh - for: mpdoled, lcdchar, vumeter, snapclient(need to run in background)
	# next fetch
	sleep $(( countdown + 5 )) # add 5s delay
	metadataGet
}

metadataGet
