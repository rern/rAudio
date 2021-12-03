#!/bin/bash

: >/dev/tcp/8.8.8.8/53 || exit # online check

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirshm=/srv/http/data/shm

readarray -t tmpradio < $dirshm/radio
file=${tmpradio[0]}
station=${tmpradio[1]}
station=${station//\"/\\\"}
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
[[ $id < 4 ]] && icon=radioparadise || icon=radiofrance

radioparadiseData() {
	readarray -t metadata <<< $( curl -sGk -m 5 \
		--data-urlencode "chan=$id" \
		https://api.radioparadise.com/api/now_playing \
		| jq -r .artist,.title,.album,.cover,.time \
		| sed 's/^null$//' )
}
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
metadataGet() {
	[[ $id < 4 ]] && radioparadiseData || radiofranceData
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

	if [[ $coverurl ]]; then
		name=$( echo $artist$title | tr -d ' \"`?/#&'"'" )
		coverfile=$dirshm/webradio/$name.jpg
		curl -s $coverurl -o $coverfile
		coverart=/data/shm/webradio/$name.jpg
	fi
	[[ -e $dirsystem/vumeter ]] && coverart=
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
	curl -s -X POST http://127.0.0.1/pub?id=mpdradio -d "$data"
	cat << EOF > $dirshm/status
Artist="$artist"
Title="$title"
Album="$album"
coverart="$coverart"
station="$station"
file="$file"
state="play"
Time=false
elapsed=$elapsed
timestamp=$( date +%s%3N )
webradio=true
player="mpd"
EOF
	$dirbash/status-push.sh statusradio # for: mpdoled, lcdchar, vumeter, snapclient
	$dirbash/cmd.sh coverfileslimit
	# next fetch
	sleep $(( countdown + 5 )) # add 5s delay
	metadataGet
}

metadataGet
