#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm
if [[ ! -e $dirtmp/radio ]]; then
	sleep 5
	$dirsystem/status-radio.sh
	exit
fi

readarray -t tmpradio < $dirtmp/radio
file=${tmpradio[0]}
station=${tmpradio[1]}
id=${tmpradio[2]}
pos=$( mpc | grep '\[playing' | cut -d' ' -f2 | tr -d '#' )
sampling="$pos &bull; ${tmpradio[3]}"
song=$(( ${pos/\/*} - 1 ))
case $id in
	flac )   id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	world )  id=3;;
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

radioparadiseData() {
	readarray -t metadata <<< $( curl -s -m 5 -G \
		--data-urlencode "chan=$id" \
		https://api.radioparadise.com/api/now_playing \
		| jq -r .artist,.title,.album,.cover,.time \
		| sed 's/^null$//' )
}
radiofranceData() {
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
}
metadataGet() {
	[[ $id < 4 ]] && radioparadiseData || radiofranceData
	artist=${metadata[0]}
	title=${metadata[1]}
	album=${metadata[2]}
	coverurl=${metadata[3]}
	countdown=${metadata[4]} # countdown
	[[ -z $countdown ]] && countdown=0
	[[ ${#metadata[@]} == 6 && $countdown > 0 ]] && countdown=$(( countdown - ${metadata[5]} )) # radiofrance

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
	elapsed=$( { echo clearerror; echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| awk '/elapsed/ {print $NF}' )
	[[ -z $elapsed ]] && elapsed=0
	data='{
"Artist"   : "'$artist'"
, "Title"    : "'$title'"
, "Album"    : "'$album'"
, "coverart" : "'$coverart'"
, "station"  : "'$station'"
, "file"     : "'$file'"
, "elapsed"  : '$elapsed'
, "sampling" : "'$sampling'"
, "song"     : '$song'
, "rprf"     : 1
, "webradio" : true
}'
	curl -s -X POST http://127.0.0.1/pub?id=mpdplayer -d "$data"
	if [[ -e $dirsystem/lcdchar ]]; then
		status=( "$artist" "$title" "$album" play false "$elapsed" $( date +%s%3N ) true "$station" "$file" )
		killall lcdchar.py &> /dev/null
		/srv/http/bash/lcdchar.py "${status[@]}" &
	fi
	if [[ -e $dirtmp/snapclientip ]]; then
		readarray -t clientip < $dirtmp/snapclientip
		for ip in "${clientip[@]}"; do
			[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$data"
		done
	fi
	/srv/http/bash/cmd.sh onlinefileslimit
	# next fetch
	sleep $(( countdown + 5 )) # add 5s delay
	metadataGet
}

metadataGet
